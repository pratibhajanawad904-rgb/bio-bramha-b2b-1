/**
 * In-process rate limiter for abuse-sensitive endpoints (OTP send/verify).
 *
 * Scope: this is per server instance. On a single VM it is effective. On serverless
 * with many concurrent instances each keeps its own counters, so the practical limit
 * is looser than configured. It still blocks the common cases — SMS bombing a number
 * and brute-forcing a 6-digit OTP from one client — and it costs nothing to run.
 * A shared Redis/Upstash store is the correct upgrade if you scale out.
 */

interface Bucket {
  hits: number[]
  blockedUntil?: number
}

const buckets = new Map<string, Bucket>()

// Stop the map growing without bound on a long-lived server.
const MAX_TRACKED_KEYS = 10_000

export interface RateLimitRule {
  /** Sliding window length. */
  windowMs: number
  /** Allowed hits within the window. */
  max: number
  /** How long to lock out once the limit is exceeded. */
  blockMs: number
}

export const OTP_SEND_LIMIT: RateLimitRule = {
  windowMs: 15 * 60 * 1000,
  max: 5,
  blockMs: 30 * 60 * 1000
}

export const OTP_VERIFY_LIMIT: RateLimitRule = {
  windowMs: 10 * 60 * 1000,
  max: 8,
  blockMs: 30 * 60 * 1000
}

export interface RateLimitResult {
  allowed: boolean
  retryAfterSeconds: number
}

export function checkRateLimit(key: string, rule: RateLimitRule): RateLimitResult {
  const now = Date.now()

  if (buckets.size > MAX_TRACKED_KEYS) {
    for (const [k, b] of buckets) {
      const stale = (b.blockedUntil ?? 0) < now && !b.hits.some((t) => now - t < rule.windowMs)
      if (stale) buckets.delete(k)
    }
  }

  const bucket = buckets.get(key) || { hits: [] }

  if (bucket.blockedUntil && bucket.blockedUntil > now) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.blockedUntil - now) / 1000) }
  }

  bucket.hits = bucket.hits.filter((t) => now - t < rule.windowMs)

  if (bucket.hits.length >= rule.max) {
    bucket.blockedUntil = now + rule.blockMs
    buckets.set(key, bucket)
    return { allowed: false, retryAfterSeconds: Math.ceil(rule.blockMs / 1000) }
  }

  bucket.hits.push(now)
  buckets.set(key, bucket)
  return { allowed: true, retryAfterSeconds: 0 }
}

/** Clears a bucket, e.g. after a successful verification. */
export function resetRateLimit(key: string): void {
  buckets.delete(key)
}

/**
 * Best-effort client IP. Values are attacker-controlled unless your proxy
 * overwrites them, so IP limits complement per-identifier limits rather than
 * replacing them.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') || 'unknown'
}

/** Redacts a phone number for logs: 9876543210 -> 98****3210 */
export function maskPhone(phone: string): string {
  const d = String(phone || '').replace(/\D/g, '')
  if (d.length < 6) return '****'
  return `${d.slice(0, 2)}****${d.slice(-4)}`
}
