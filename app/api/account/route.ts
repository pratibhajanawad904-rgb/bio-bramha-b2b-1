import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  getSession,
  unauthorized,
  badRequest,
  serverError,
  normalize,
  isValidEmail,
  cleanText,
  maskValue,
  clientIp
} from '@/lib/api-auth'

/**
 * The caller's own profile.
 *
 * Scoped entirely to the phone in the verified session, so there is no parameter a
 * caller could change to read or edit someone else's profile.
 *
 * Edits to sensitive fields are written to profile_change_log with masked values —
 * enough to prove what changed and when, without the log becoming a second copy of
 * the personal data.
 */

export const dynamic = 'force-dynamic'

const SENSITIVE_FIELDS = ['email', 'name'] as const

export async function GET(request: Request) {
  try {
    const session = getSession(request)
    if (!session) return unauthorized()

    const phone = normalize(session.phone)

    const [accountRes, addressRes, consentRes] = await Promise.all([
      supabaseAdmin.from('user_accounts').select('*').eq('phone', phone).maybeSingle(),
      supabaseAdmin
        .from('user_addresses')
        .select('*')
        .eq('phone', phone)
        .order('is_default', { ascending: false }),
      supabaseAdmin
        .from('user_consents')
        .select('policy_version, consented_at')
        .eq('phone', phone)
        .order('consented_at', { ascending: false })
        .limit(1)
    ])

    if (accountRes.error) {
      console.error('[account] read failed:', accountRes.error.message)
      return serverError('Could not load your profile.')
    }

    const account: any = accountRes.data
    if (!account) {
      return NextResponse.json({ success: false, error: 'Account not found.' }, { status: 404 })
    }

    const latestConsent: any = (consentRes.data || [])[0]

    return NextResponse.json({
      success: true,
      profile: {
        phone: account.phone,
        name: account.name || '',
        email: account.email || '',
        role: account.role,
        assignedWarehouseId: account.assigned_warehouse_id || null
      },
      addresses: (addressRes.data || []).map((a: any) => ({
        id: a.id,
        line1: a.line1,
        city: a.city,
        pincode: a.pincode,
        state: a.state,
        isDefault: a.is_default
      })),
      consent: latestConsent
        ? { policyVersion: latestConsent.policy_version, consentedAt: latestConsent.consented_at }
        : null
    })
  } catch (error) {
    console.error('[account] unexpected error:', error)
    return serverError('Could not load your profile.')
  }
}

export async function PATCH(request: Request) {
  try {
    const session = getSession(request)
    if (!session) return unauthorized()

    const phone = normalize(session.phone)
    const body = await request.json().catch(() => ({}))

    // Validate the payload before touching the database. Input validity does not
    // depend on account state, and a malformed request should say so rather than
    // returning 404 and implying the account is the problem.
    const updates: Record<string, any> = {}

    if (body?.name !== undefined) {
      const name = cleanText(body.name, 120)
      if (!name) return badRequest('Name cannot be empty.')
      updates.name = name
    }

    if (body?.email !== undefined) {
      const email = cleanText(body.email, 254)
      // Empty is allowed: email is optional. A present value must be well-formed.
      if (email && !isValidEmail(email)) return badRequest('Enter a valid email address.')
      updates.email = email || null
    }

    // Role and phone are deliberately not editable here. Role changes go through the
    // admin endpoint; changing the phone would change identity and is not supported.
    if (Object.keys(updates).length === 0) {
      return badRequest('Nothing to update.')
    }

    const { data: current, error: readError } = await supabaseAdmin
      .from('user_accounts')
      .select('*')
      .eq('phone', phone)
      .maybeSingle()

    if (readError) {
      console.error('[account] read-before-update failed:', readError.message)
      return serverError('Could not update your profile.')
    }
    if (!current) {
      return NextResponse.json({ success: false, error: 'Account not found.' }, { status: 404 })
    }

    updates.updated_at = new Date().toISOString()

    const { error: updateError } = await supabaseAdmin
      .from('user_accounts')
      .update(updates)
      .eq('phone', phone)

    if (updateError) {
      console.error('[account] update failed:', updateError.message)
      return serverError('Could not update your profile.')
    }

    // Accountability trail for sensitive changes.
    const logRows = SENSITIVE_FIELDS.filter((f) => updates[f] !== undefined)
      .filter((f) => (current as any)[f] !== updates[f])
      .map((field) => ({
        phone,
        field,
        old_masked: maskValue((current as any)[field]),
        new_masked: maskValue(updates[field]),
        ip: clientIp(request)
      }))

    if (logRows.length > 0) {
      const { error: logError } = await supabaseAdmin.from('profile_change_log').insert(logRows)
      if (logError) console.warn('[account] change log write failed:', logError.message)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[account] unexpected error:', error)
    return serverError('Could not update your profile.')
  }
}
