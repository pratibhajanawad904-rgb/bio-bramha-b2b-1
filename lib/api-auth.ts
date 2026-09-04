import { NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { verifySessionToken, SessionPayload, SessionRole } from './session'
import { getClientIp } from './rate-limit'

/**
 * Shared guards for route handlers.
 *
 * Next.js 16 docs are explicit that authorization must be checked inside each
 * handler rather than relying on proxy.ts, because a matcher change or a moved
 * route can silently remove proxy coverage. These helpers keep that per-route
 * check short enough that there is no excuse to skip it.
 */

export const unauthorized = () =>
  NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 })

export const forbidden = () =>
  NextResponse.json({ success: false, error: 'You do not have permission to do that.' }, { status: 403 })

export const badRequest = (error: string) =>
  NextResponse.json({ success: false, error }, { status: 400 })

export const notFound = (error = 'Not found.') =>
  NextResponse.json({ success: false, error }, { status: 404 })

export const serverError = (error = 'Something went wrong. Please try again.') =>
  NextResponse.json({ success: false, error }, { status: 500 })

/** Authenticated caller, or null. */
export function getSession(request: Request): SessionPayload | null {
  return verifySessionToken(request)
}

/** Authenticated caller holding one of the given roles, or null. */
/**
 * Result of a role-gated auth check.
 *
 * 'unauthenticated' and 'forbidden' are distinct outcomes (401 vs 403) and must not
 * collapse to the same null value, or a route cannot tell "not logged in" apart from
 * "logged in, wrong role" and ends up reporting 401 for both.
 */
export type RoleCheckResult =
  | { ok: true; session: SessionPayload }
  | { ok: false; reason: 'unauthenticated' | 'forbidden' }

export function getSessionWithRole(request: Request, roles: SessionRole[]): RoleCheckResult {
  const session = verifySessionToken(request)
  if (!session) return { ok: false, reason: 'unauthenticated' }
  if (!roles.includes(session.role)) return { ok: false, reason: 'forbidden' }
  return { ok: true, session }
}

/**
 * Guards a resource that belongs to a specific phone number.
 *
 * This is the check that closes IDOR: a caller may only act on their own rows,
 * unless they are an admin. The comparison uses the phone from the *verified
 * session*, never a phone supplied in the request body or query string.
 */
export function ownsResource(session: SessionPayload, resourcePhone: string): boolean {
  const own = normalize(session.phone)
  const target = normalize(resourcePhone)
  if (own && own === target) return true
  return session.role === 'admin' || session.role === 'super_admin'
}

export function normalize(phone: string): string {
  return String(phone || '').replace(/\D/g, '').slice(-10)
}

/**
 * Stable one-way hash of a phone number, for audit rows that must outlive the
 * deletion of the personal data they refer to.
 */
export function hashPhone(phone: string): string {
  return createHash('sha256').update(normalize(phone)).digest('hex')
}

/** Masks a value for the change log, so the log is not a second copy of the PII. */
export function maskValue(value: string | null | undefined): string | null {
  if (!value) return null
  const s = String(value)
  if (s.includes('@')) {
    const [user, domain] = s.split('@')
    const head = user.slice(0, 1)
    return `${head}${'*'.repeat(Math.max(1, user.length - 1))}@${domain}`
  }
  if (s.length <= 4) return '*'.repeat(s.length)
  return `${'*'.repeat(s.length - 4)}${s.slice(-4)}`
}

export function clientIp(request: Request): string {
  return getClientIp(request)
}

export function userAgent(request: Request): string {
  return request.headers.get('user-agent')?.slice(0, 300) || 'unknown'
}

/** Indian pincode: six digits, cannot start with zero. */
export function isValidPincode(pincode: string): boolean {
  return /^[1-9][0-9]{5}$/.test(String(pincode || '').trim())
}

export function isValidEmail(email: string): boolean {
  const s = String(email || '').trim()
  return s.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)
}

/** Trims and caps a free-text field so a client cannot store unbounded data. */
export function cleanText(value: unknown, maxLength: number): string {
  return String(value ?? '').trim().slice(0, maxLength)
}
