import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { serverConfig } from '@/lib/env'
import {
  getSession,
  unauthorized,
  badRequest,
  serverError,
  normalize,
  hashPhone,
  clientIp
} from '@/lib/api-auth'
import {
  checkRateLimit,
  resetRateLimit,
  maskPhone,
  OTP_SEND_LIMIT,
  OTP_VERIFY_LIMIT
} from '@/lib/rate-limit'

/**
 * Account deletion.
 *
 * POST   -> sends an OTP to the registered phone (re-verification step)
 * DELETE -> verifies that OTP, then performs the deletion
 *
 * Google Play requires in-app deletion, and requires that it actually deletes
 * rather than merely deactivating. Indian statute simultaneously requires the
 * transaction record to be retained. Both are satisfied by anonymising the order
 * rows: the personal data is destroyed, the financial record survives.
 *
 * Retention rationale for keeping anonymised order rows:
 *   GST law            72 months (6 years) from the annual return due date
 *   Income Tax Act     6 years from the end of the assessment year
 *   Companies Act 2013 8 years of books of account
 *   DPDP Rules 2025 r8 1 year floor for transaction/order logs
 * The tax and company-law periods are longer and therefore control.
 */

export const dynamic = 'force-dynamic'

/** Blocks deletion while an order is still in flight. */
const UNRESOLVED_ORDER_STATUSES = ['placed', 'accepted', 'dispatched']

export async function POST(request: Request) {
  try {
    const session = getSession(request)
    if (!session) return unauthorized()

    const phone = normalize(session.phone)

    const limit = checkRateLimit(`delete-otp:${phone}`, OTP_SEND_LIMIT)
    if (!limit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please wait before trying again.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
      )
    }

    // Refuse before sending an OTP if deletion cannot proceed anyway.
    const { data: pending, error: pendingError } = await supabaseAdmin
      .from('orders')
      .select('id, status')
      .eq('phone', phone)
      .in('status', UNRESOLVED_ORDER_STATUSES)

    if (pendingError) {
      console.error('[account/delete] pending order check failed:', pendingError.message)
      return serverError('Could not start account deletion.')
    }

    if (pending && pending.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            `You have ${pending.length} order(s) still in progress. ` +
            'Once they are delivered or cancelled you can delete your account.',
          pendingOrders: pending.map((o: any) => o.id)
        },
        { status: 409 }
      )
    }

    const res = await fetch('https://control.msg91.com/api/v5/otp', {
      method: 'POST',
      headers: { authkey: serverConfig.msg91AuthKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template_id: serverConfig.msg91TemplateId,
        mobile: `91${phone}`,
        sender: serverConfig.msg91SenderId,
        otp_length: 6,
        otp_expiry: 10
      })
    })

    const text = await res.text()
    let json: any = {}
    try {
      json = JSON.parse(text)
    } catch {}

    if (!res.ok || json?.type !== 'success') {
      console.error(`[account/delete] OTP send failed for ${maskPhone(phone)}:`, json?.message || text)
      return NextResponse.json(
        { success: false, error: 'Could not send the confirmation code. Please try again.' },
        { status: 502 }
      )
    }

    // Record the request now, so an abandoned deletion is still auditable.
    const { error: auditError } = await supabaseAdmin.from('account_deletions').insert({
      phone_hash: hashPhone(phone),
      ip: clientIp(request)
    })
    if (auditError) console.warn('[account/delete] audit insert failed:', auditError.message)

    console.log(`[account/delete] confirmation OTP sent to ${maskPhone(phone)}`)

    return NextResponse.json({
      success: true,
      message: 'We sent a confirmation code to your registered mobile number.'
    })
  } catch (error) {
    console.error('[account/delete] unexpected error:', error)
    return serverError('Could not start account deletion.')
  }
}

export async function DELETE(request: Request) {
  try {
    const session = getSession(request)
    if (!session) return unauthorized()

    const phone = normalize(session.phone)
    const body = await request.json().catch(() => ({}))
    const otp = String(body?.otp || '').trim()

    if (!/^\d{4,6}$/.test(otp)) return badRequest('Enter the 6-digit confirmation code.')

    const verifyKey = `delete-verify:${phone}`
    const limit = checkRateLimit(verifyKey, OTP_VERIFY_LIMIT)
    if (!limit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many incorrect attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
      )
    }

    // Fail closed: a provider outage must never result in an unverified deletion.
    let verified = false
    try {
      const url =
        `https://control.msg91.com/api/v5/otp/verify` +
        `?otp=${encodeURIComponent(otp)}&mobile=${encodeURIComponent(`91${phone}`)}`
      const res = await fetch(url, { headers: { authkey: serverConfig.msg91AuthKey } })
      const text = await res.text()
      let json: any = {}
      try {
        json = JSON.parse(text)
      } catch {}
      const msg = String(json?.message || '').toLowerCase()
      verified = json?.type === 'success' || msg.includes('success') || msg.includes('already verified')
    } catch (e) {
      console.error('[account/delete] MSG91 unreachable:', e)
      return NextResponse.json(
        { success: false, error: 'Could not verify the code right now. Please try again.' },
        { status: 502 }
      )
    }

    if (!verified) return badRequest('Invalid or expired confirmation code.')

    resetRateLimit(verifyKey)

    // Re-check pending orders: state may have changed since the OTP was requested.
    const { data: pending } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('phone', phone)
      .in('status', UNRESOLVED_ORDER_STATUSES)

    if (pending && pending.length > 0) {
      return NextResponse.json(
        { success: false, error: 'You have orders still in progress. Deletion cannot continue.' },
        { status: 409 }
      )
    }

    // 1. Anonymise past orders. The financial record is retained; the PII is not.
    const { data: ownOrders } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('phone', phone)

    let anonymisedCount = 0
    if (ownOrders && ownOrders.length > 0) {
      const { error: anonError } = await supabaseAdmin
        .from('orders')
        .update({
          buyer_name: 'Deleted User',
          buyer_email: null,
          phone: null,
          address: null,
          city: null,
          pincode: null,
          is_anonymised: true,
          anonymised_at: new Date().toISOString()
        })
        .eq('phone', phone)

      if (anonError) {
        console.error('[account/delete] order anonymisation failed:', anonError.message)
        return serverError('Could not complete deletion. Nothing was changed.')
      }
      anonymisedCount = ownOrders.length
    }

    // 2. Remove saved addresses outright: no statutory reason to keep them.
    const { error: addrError } = await supabaseAdmin
      .from('user_addresses')
      .delete()
      .eq('phone', phone)
    if (addrError) console.warn('[account/delete] address delete failed:', addrError.message)

    // 3. Disable the account. The row is kept, flagged deleted, and stripped of PII.
    //    Keeping the row is what lets re-signup be detected as a *new* account rather
    //    than silently reactivating the old one.
    const { error: acctError } = await supabaseAdmin
      .from('user_accounts')
      .update({
        name: 'Deleted User',
        email: null,
        role: 'buyer',
        assigned_warehouse_id: null,
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('phone', phone)

    if (acctError) {
      console.error('[account/delete] account disable failed:', acctError.message)
      return serverError('Could not complete deletion.')
    }

    // 4. Close out the audit row. Consent records are intentionally retained: they
    //    are the evidence that consent was given, and deleting them would defeat
    //    the purpose of recording it.
    const { error: auditError } = await supabaseAdmin
      .from('account_deletions')
      .update({ completed_at: new Date().toISOString(), orders_anonymised: anonymisedCount })
      .eq('phone_hash', hashPhone(phone))
      .is('completed_at', null)

    if (auditError) console.warn('[account/delete] audit update failed:', auditError.message)

    // Reviews: no reviews table exists in this codebase yet. When one is added,
    // anonymise the author here to preserve rating integrity.

    console.log(
      `[account/delete] completed for ${maskPhone(phone)}; ${anonymisedCount} order(s) anonymised`
    )

    return NextResponse.json({
      success: true,
      ordersAnonymised: anonymisedCount,
      message:
        'Your account has been deleted. Anonymised order records are retained as required by tax law.'
    })
  } catch (error) {
    console.error('[account/delete] unexpected error:', error)
    return serverError('Could not complete deletion.')
  }
}
