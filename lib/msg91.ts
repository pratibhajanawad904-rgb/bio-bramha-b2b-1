// Client helper for MSG91 OTP authentication.
//
// The transport lives in lib/auth-client.ts: native HTTP inside the packaged app
// (which has no server and cannot use /api routes), and the dev API route on web.
// This module stays as the entry point used by the login components.

import { sendOtp, verifyOtp, normalizePhone as normalize } from './auth-client'

export function normalizePhone(raw: string): string | null {
  return normalize(raw)
}

export async function sendMSG91OTP(
  rawPhone: string
): Promise<{ success: boolean; message: string; error?: string }> {
  const result = await sendOtp(rawPhone)

  if (result.success) {
    const phone = normalize(rawPhone)
    return { success: true, message: result.message || `OTP sent successfully to +91 ${phone}` }
  }

  return { success: false, message: '', error: result.error || 'Failed to send OTP. Please try again.' }
}

export async function verifyMSG91OTP(
  rawPhone: string,
  otpCode: string
): Promise<{ success: boolean; verified: boolean; error?: string }> {
  const result = await verifyOtp(rawPhone, otpCode)

  if (result.success) {
    return { success: true, verified: true }
  }

  return { success: false, verified: false, error: result.error || 'Invalid OTP code.' }
}
