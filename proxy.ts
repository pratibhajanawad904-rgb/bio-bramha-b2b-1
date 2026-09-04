import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Edge proxy (Next.js 16).
 *
 * Renamed from middleware.ts, which is deprecated. Runs once per request at the
 * network edge before the application code. Defense-in-depth layer: auth checks
 * remain in every route, because Next.js docs warn that a refactor or matcher
 * change can silently remove proxy coverage.
 *
 * Roles:
 *   * Rate limiting (brute-force, API abuse)
 *   * Security headers (applied at the edge, already set in next.config.mjs)
 *
 * NOT responsible for:
 *   * Authentication — verified in every handler using lib/session.ts
 *   * Authorization — role/ownership checks live in the route handlers
 *
 * Platform notes:
 *   * Proxy is Node.js runtime by default in Next.js 16+
 *   * Proxy does NOT run in static export, so this never executes in the APK
 *   * Runtime config is not allowed; setting `runtime` in proxy.ts throws
 */

// Exclude static assets, images, icons, and Next.js internals from proxy overhead.
// Also exclude `/api/auth/send-otp` and `/api/auth/verify-otp`, which have their
// own specialized rate limiting in their route handlers. Running both would be
// redundant and may cause false-positive lockouts.
export const config = {
  matcher: [
    '/((?!api/auth/send-otp|api/auth/verify-otp|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$|.*\\.webp$|.*\\.ico$).*)'
  ]
}

// Simple in-memory rate limiter. This state is process-local, so horizontal
// scaling dilutes the limits rather than aggregating them. Real edge rate limiting
// (e.g., Vercel Firewall) aggregates globally; this is a local floor.
const hits = new Map<string, { count: number; resetAt: number }>()

const WINDOW_MS = 60 * 1000
const MAX_REQUESTS_PER_WINDOW = 120 // 2 per second sustained

function rateLimit(clientIp: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now()
  const existing = hits.get(clientIp)

  if (!existing || now > existing.resetAt) {
    hits.set(clientIp, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true, retryAfter: 0 }
  }

  existing.count++
  if (existing.count > MAX_REQUESTS_PER_WINDOW) {
    const retryAfter = Math.ceil((existing.resetAt - now) / 1000)
    return { allowed: false, retryAfter }
  }

  return { allowed: true, retryAfter: 0 }
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

export function proxy(request: NextRequest) {
  const clientIp = getClientIp(request)
  const limit = rateLimit(clientIp)

  if (!limit.allowed) {
    console.warn(`[proxy] rate limit exceeded for ${clientIp} on ${request.nextUrl.pathname}`)
    return NextResponse.json(
      { success: false, error: 'Too many requests. Please slow down.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    )
  }

  return NextResponse.next()
}
