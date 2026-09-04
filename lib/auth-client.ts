import { CapacitorHttp } from '@capacitor/core'
import { isNativeApp } from './platform'

/**
 * OTP send/verify that works in the packaged Android app.
 *
 * The web build is a static export, so /api routes only exist under `next dev`.
 * In the native shell we therefore call MSG91 directly. MSG91 sends no
 * Access-Control-Allow-Origin header, so a browser fetch would be blocked by CORS —
 * we use Capacitor's native HTTP client, which is not subject to CORS.
 *
 * We deliberately do NOT enable the global CapacitorHttp fetch patch, because that
 * would also intercept the Supabase client's requests.
 */

const MSG91_AUTH_KEY = process.env.NEXT_PUBLIC_MSG91_AUTH_KEY || '549591AtzGH4cg6a5a01e6P1'
const MSG91_TEMPLATE_ID = process.env.NEXT_PUBLIC_MSG91_TEMPLATE_ID || '6a59ce32c9fa66b2d5069333'
const MSG91_SENDER_ID = process.env.NEXT_PUBLIC_MSG91_SENDER_ID || 'DMTRA'

/** The UI prompts for a 6-digit code, so both transports must request exactly that. */
export const OTP_LENGTH = 6
const OTP_EXPIRY_MINUTES = 10

export interface OtpResult {
  success: boolean
  error?: string
  message?: string
}

export interface ServerLoginResult {
  success: boolean
  error?: string
  /** True when the phone verified but has no account yet. */
  isNewUser?: boolean
  /** Signed JWT issued by the server. Absent on the native path. */
  token?: string
  user?: {
    phone: string
    name: string
    email: string | null
    role: 'super_admin' | 'admin' | 'warehouse' | 'buyer'
    assignedWarehouseId: string | null
  }
}

/**
 * Base URL for reaching the server's /api routes.
 *
 * On web this is empty (same-origin relative paths). In the packaged app there is
 * no server bundled with the static export, so this must point at the deployed
 * Vercel backend, configured at build time via NEXT_PUBLIC_API_BASE_URL
 * (see .env.production.apk and scripts/build-apk.mjs).
 */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || ''

/**
 * POSTs JSON to a server /api route, using CapacitorHttp inside the packaged app
 * (which is not subject to CORS, unlike a browser fetch) and plain fetch on web.
 */
async function postJson(path: string, body: unknown): Promise<{ ok: boolean; status: number; data: any }> {
  const url = `${API_BASE}${path}`

  if (isNativeApp()) {
    const res = await CapacitorHttp.post({
      url,
      headers: { 'Content-Type': 'application/json' },
      data: body
    })
    const data = typeof res.data === 'string' ? safeJson(res.data) : res.data
    return { ok: res.status >= 200 && res.status < 300, status: res.status, data }
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}

/**
 * Verifies the OTP against the server, which returns a signed session token.
 *
 * Used on both web (relative URL, plain fetch) and native (absolute URL against the
 * deployed backend, CapacitorHttp). This is what lets the packaged app hold a real
 * signed session that the /api routes accept, instead of the previous native-only
 * path that wrote to Supabase directly with the anon key and stopped working once
 * the RLS lockdown revoked anon access to user_accounts entirely.
 */
export async function loginViaServer(rawPhone: string, otp: string): Promise<ServerLoginResult> {
  const phone = normalizePhone(rawPhone)
  const cleanOtp = String(otp || '').trim()

  if (!phone) return { success: false, error: 'Please enter a valid 10-digit mobile number.' }
  if (!/^\d{4,6}$/.test(cleanOtp)) return { success: false, error: 'Please enter a valid OTP.' }

  try {
    const { ok, data } = await postJson('/api/auth/verify-otp', { phone, otp: cleanOtp })

    if (!ok || !data?.verified) {
      return { success: false, error: data?.error || 'Invalid or expired OTP.' }
    }

    if (data.isNewUser) {
      return { success: true, isNewUser: true }
    }

    return { success: true, isNewUser: false, token: data.token, user: data.user }
  } catch (e: any) {
    return { success: false, error: e?.message || 'Could not reach the server.' }
  }
}

export interface ServerSignupResult {
  success: boolean
  error?: string
  token?: string
  user?: ServerLoginResult['user']
}

/**
 * Completes signup against the server, which upserts the account and returns a
 * signed session token. Used on both web and native for the same reason as
 * loginViaServer above.
 */
export async function completeSignupViaServer(
  rawPhone: string,
  name: string,
  email?: string
): Promise<ServerSignupResult> {
  const phone = normalizePhone(rawPhone)
  if (!phone) return { success: false, error: 'Please enter a valid 10-digit mobile number.' }

  const cleanName = String(name || '').trim()
  if (!cleanName) return { success: false, error: 'Please enter your name.' }

  try {
    const { ok, data } = await postJson('/api/auth/complete-signup', { phone, name: cleanName, email })

    if (!ok || !data?.success) {
      return { success: false, error: data?.error || 'Could not complete registration.' }
    }

    return { success: true, token: data.token, user: data.user }
  } catch (e: any) {
    return { success: false, error: e?.message || 'Could not reach the server.' }
  }
}

export function normalizePhone(raw: string): string | null {
  let d = String(raw || '').replace(/\D/g, '')
  if (d.startsWith('91') && d.length === 12) d = d.slice(2)
  if (d.startsWith('0') && d.length === 11) d = d.slice(1)
  return /^\d{10}$/.test(d) ? d : null
}

/** MSG91 generates and stores the OTP itself when we omit one, so we don't hold state. */
async function sendOtpNative(phone: string): Promise<OtpResult> {
  const res = await CapacitorHttp.post({
    url: 'https://control.msg91.com/api/v5/otp',
    headers: {
      authkey: MSG91_AUTH_KEY,
      'Content-Type': 'application/json'
    },
    data: {
      template_id: MSG91_TEMPLATE_ID,
      mobile: `91${phone}`,
      sender: MSG91_SENDER_ID,
      // Pinned explicitly: without this MSG91 falls back to the template's own
      // length (4), which would not match the 6 digits the UI asks the user for.
      otp_length: OTP_LENGTH,
      otp_expiry: OTP_EXPIRY_MINUTES
    }
  })

  const body = typeof res.data === 'string' ? safeJson(res.data) : res.data

  if (res.status >= 200 && res.status < 300 && body?.type === 'success') {
    return { success: true, message: body?.message || `OTP sent to +91 ${phone}` }
  }

  return {
    success: false,
    error: body?.message || `Could not send OTP (status ${res.status}).`
  }
}

async function verifyOtpNative(phone: string, otp: string): Promise<OtpResult> {
  const url = `https://control.msg91.com/api/v5/otp/verify?otp=${encodeURIComponent(
    otp
  )}&mobile=${encodeURIComponent(`91${phone}`)}`

  const res = await CapacitorHttp.get({
    url,
    headers: { authkey: MSG91_AUTH_KEY }
  })

  const body = typeof res.data === 'string' ? safeJson(res.data) : res.data
  const message = String(body?.message || '').toLowerCase()

  const verified =
    body?.type === 'success' || message.includes('success') || message.includes('already verified')

  if (verified) return { success: true }

  return { success: false, error: body?.message || 'Invalid or expired OTP.' }
}

function safeJson(text: string): any {
  try {
    return JSON.parse(text)
  } catch {
    return {}
  }
}

/** Sends an OTP. Uses the dev API route on web, native HTTP in the app. */
export async function sendOtp(rawPhone: string): Promise<OtpResult> {
  const phone = normalizePhone(rawPhone)
  if (!phone) {
    return { success: false, error: 'Please enter a valid 10-digit mobile number.' }
  }

  try {
    if (isNativeApp()) {
      return await sendOtpNative(phone)
    }

    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Could not send OTP.' }
    }
    return { success: true, message: data.message }
  } catch (e: any) {
    return { success: false, error: e?.message || 'Could not reach the OTP service.' }
  }
}

/** Verifies an OTP. Uses the dev API route on web, native HTTP in the app. */
export async function verifyOtp(rawPhone: string, otp: string): Promise<OtpResult> {
  const phone = normalizePhone(rawPhone)
  const cleanOtp = String(otp || '').trim()

  if (!phone) return { success: false, error: 'Please enter a valid 10-digit mobile number.' }
  if (!/^\d{4,6}$/.test(cleanOtp)) {
    return { success: false, error: 'Please enter a valid 4-6 digit OTP.' }
  }

  try {
    if (isNativeApp()) {
      return await verifyOtpNative(phone, cleanOtp)
    }

    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp: cleanOtp })
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.verified) {
      return { success: false, error: data.error || 'Invalid or expired OTP.' }
    }
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e?.message || 'Could not reach the OTP service.' }
  }
}
