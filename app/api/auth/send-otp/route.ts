import { NextResponse } from 'next/server'
import { serverConfig, safeErrorMessage } from '@/lib/env'
import { checkRateLimit, getClientIp, maskPhone, OTP_SEND_LIMIT } from '@/lib/rate-limit'

function normalizePhone(raw: string): string | null {
  let d = String(raw || '').replace(/\D/g, '')
  if (d.startsWith('91') && d.length === 12) d = d.slice(2)
  if (d.startsWith('0') && d.length === 11) d = d.slice(1)
  return /^\d{10}$/.test(d) ? d : null
}

/** Must match OTP_LENGTH in lib/auth-client.ts so web and app behave identically. */
const OTP_LENGTH = 6
const OTP_EXPIRY_MINUTES = 10

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const phone = normalizePhone(body?.phone)

    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'Invalid phone number. Please enter a 10-digit mobile number.' },
        { status: 400 }
      )
    }

    // Rate limit per phone and per IP. Without this, one caller can bill you for
    // unlimited SMS and harass an arbitrary number.
    const ip = getClientIp(request)
    for (const key of [`otp-send:phone:${phone}`, `otp-send:ip:${ip}`]) {
      const limit = checkRateLimit(key, OTP_SEND_LIMIT)
      if (!limit.allowed) {
        console.warn(`[send-otp] rate limited ${maskPhone(phone)} from ${ip}`)
        return NextResponse.json(
          {
            success: false,
            error: 'Too many OTP requests. Please wait a while before trying again.'
          },
          { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
        )
      }
    }

    const payload: Record<string, string | number> = {
      template_id: serverConfig.msg91TemplateId,
      mobile: `91${phone}`,
      otp_length: OTP_LENGTH,
      otp_expiry: OTP_EXPIRY_MINUTES,
      sender: serverConfig.msg91SenderId
    }

    const smsRes = await fetch('https://control.msg91.com/api/v5/otp', {
      method: 'POST',
      headers: {
        authkey: serverConfig.msg91AuthKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const smsText = await smsRes.text()
    let smsJson: { type?: string; message?: string; request_id?: string } = {}
    try {
      smsJson = JSON.parse(smsText)
    } catch {}

    if (!smsRes.ok || smsJson.type !== 'success') {
      // Log the provider detail; don't hand it to the client.
      console.error(`[send-otp] MSG91 rejected send for ${maskPhone(phone)}:`, smsJson.message || smsText)
      return NextResponse.json(
        { success: false, error: 'Could not send the OTP right now. Please try again shortly.' },
        { status: 502 }
      )
    }

    console.log(`[send-otp] OTP dispatched to ${maskPhone(phone)}`)

    return NextResponse.json({
      success: true,
      message: `OTP sent successfully to +91 ${phone}`
    })
  } catch (error) {
    console.error('[send-otp] unexpected error:', error)
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error, 'Could not send the OTP. Please try again.') },
      { status: 500 }
    )
  }
}
