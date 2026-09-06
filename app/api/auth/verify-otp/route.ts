import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { issueSessionToken } from '@/lib/session'
import { serverConfig, safeErrorMessage } from '@/lib/env'
import {
  checkRateLimit,
  resetRateLimit,
  getClientIp,
  maskPhone,
  OTP_VERIFY_LIMIT
} from '@/lib/rate-limit'

const PREPROVISIONED_ACCOUNTS: Record<
  string,
  { name: string; role: 'super_admin' | 'warehouse'; assignedWarehouseId?: string }
> = {
  '8050946969': { name: 'Super Admin', role: 'super_admin' },
  '7975158924': { name: 'Warehouse Manager', role: 'warehouse', assignedWarehouseId: 'wh-taloja' }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const cleanedPhone = String(body?.phone || '').replace(/\D/g, '').slice(-10)
    const cleanedOtp = String(body?.otp || '').trim()

    if (cleanedPhone.length !== 10) {
      return NextResponse.json(
        { success: false, verified: false, error: 'Invalid phone number. Provide 10 digits.' },
        { status: 400 }
      )
    }

    if (!/^\d{4,6}$/.test(cleanedOtp)) {
      return NextResponse.json(
        { success: false, verified: false, error: 'Please enter a valid OTP code.' },
        { status: 400 }
      )
    }

    // Brute-forcing a 6-digit code takes a million tries; without a limit that is
    // entirely feasible. Lock out per phone and per IP.
    const ip = getClientIp(request)
    const phoneKey = `otp-verify:phone:${cleanedPhone}`
    for (const key of [phoneKey, `otp-verify:ip:${ip}`]) {
      const limit = checkRateLimit(key, OTP_VERIFY_LIMIT)
      if (!limit.allowed) {
        console.warn(`[verify-otp] rate limited ${maskPhone(cleanedPhone)} from ${ip}`)
        return NextResponse.json(
          { success: false, verified: false, error: 'Too many incorrect attempts. Please try again later.' },
          { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
        )
      }
    }

    // SECURITY: verification must fail closed. The previous implementation caught
    // network errors from MSG91 and then accepted the literals '123456' / '999999',
    // which was a login bypass for any account whenever the provider call threw.
    let isVerified = false
    try {
      const verifyUrl =
        `https://control.msg91.com/api/v5/otp/verify` +
        `?otp=${encodeURIComponent(cleanedOtp)}&mobile=${encodeURIComponent(`91${cleanedPhone}`)}`

      const response = await fetch(verifyUrl, {
        method: 'GET',
        headers: { authkey: serverConfig.msg91AuthKey }
      })

      const resText = await response.text()
      let data: { type?: string; message?: string } = {}
      try {
        data = JSON.parse(resText)
      } catch {}

      const msg = String(data.message || '').toLowerCase()
      isVerified = data.type === 'success' || msg.includes('success') || msg.includes('already verified')

      if (!isVerified) {
        console.warn(`[verify-otp] rejected for ${maskPhone(cleanedPhone)}: ${data.message || 'unknown reason'}`)
      }
    } catch (e) {
      console.error(`[verify-otp] MSG91 unreachable for ${maskPhone(cleanedPhone)}:`, e)
      return NextResponse.json(
        { success: false, verified: false, error: 'Could not verify the OTP right now. Please try again.' },
        { status: 502 }
      )
    }

    if (!isVerified) {
      return NextResponse.json(
        { success: false, verified: false, error: 'Invalid or expired OTP.' },
        { status: 400 }
      )
    }

    // Correct code: clear the attempt counter for this phone.
    resetRateLimit(phoneKey)

    let existingUserRow: any = null
    const { data, error } = await supabaseServer
      .from('user_accounts')
      .select('*')
      .eq('phone', cleanedPhone)
      .maybeSingle()

    if (error) {
      console.error('[verify-otp] user_accounts lookup failed:', error.message)
    } else {
      // A deleted account is treated as non-existent: re-signup creates a fresh
      // account (as documented in the deletion flow). The row is kept only as an
      // audit anchor; it must not grant access or skip the registration step.
      existingUserRow = data?.is_deleted ? null : data
    }

    const preprovisioned = PREPROVISIONED_ACCOUNTS[cleanedPhone]

    // The stored row wins once it exists — a super_admin can reassign either seed
    // phone to any role, and that change must stick on every subsequent login. The
    // seed only fills in a role for the very first login ever, before any row exists.
    const resolvedRole = existingUserRow?.role || preprovisioned?.role || 'buyer'
    const resolvedName = existingUserRow?.name || preprovisioned?.name
    const resolvedWhId = existingUserRow?.assigned_warehouse_id || preprovisioned?.assignedWarehouseId

    if (preprovisioned && !existingUserRow) {
      const { error: syncError } = await supabaseServer.from('user_accounts').upsert(
        {
          phone: cleanedPhone,
          name: preprovisioned.name,
          role: preprovisioned.role,
          assigned_warehouse_id: preprovisioned.assignedWarehouseId || null
        },
        { onConflict: 'phone', ignoreDuplicates: false }
      )
      if (syncError) {
        console.error('[verify-otp] could not seed bootstrap account:', syncError.message)
      }
    }

    if (!existingUserRow && !preprovisioned) {
      return NextResponse.json({
        success: true,
        verified: true,
        isNewUser: true,
        phone: cleanedPhone,
        message: 'OTP verified. Please complete signup.'
      })
    }

    // Short-lived signed session. Previously 30 days, which meant a stolen token
    // stayed valid for a month with no way to revoke it.
    const token = issueSessionToken(cleanedPhone, resolvedRole)

    console.log(`[verify-otp] session issued for ${maskPhone(cleanedPhone)} as ${resolvedRole}`)

    return NextResponse.json({
      success: true,
      verified: true,
      isNewUser: false,
      token,
      user: {
        phone: cleanedPhone,
        name: resolvedName || `User ${cleanedPhone.slice(-4)}`,
        email: existingUserRow?.email || null,
        role: resolvedRole,
        assignedWarehouseId: resolvedWhId || null
      }
    })
  } catch (error) {
    console.error('[verify-otp] unexpected error:', error)
    return NextResponse.json(
      { success: false, verified: false, error: safeErrorMessage(error, 'Failed to verify OTP.') },
      { status: 500 }
    )
  }
}
