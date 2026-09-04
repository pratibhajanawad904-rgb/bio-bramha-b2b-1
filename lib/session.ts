import jwt from 'jsonwebtoken'

/**
 * Server-side session verification.
 *
 * SECURITY: every failure here must return null. An earlier version returned
 * `{ phone: '...', role: 'super_admin' }` whenever verification failed —
 * including when the Authorization header was absent entirely — which meant any
 * unauthenticated request was treated as the owner on every admin endpoint.
 */

const IS_PRODUCTION = process.env.NODE_ENV === 'production'

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET

  if (!secret) {
    if (IS_PRODUCTION) {
      // Fail closed. A hardcoded fallback would let anyone who has read the source
      // mint valid sessions, and would silently survive a secret rotation.
      throw new Error('SESSION_SECRET is not configured. Refusing to verify sessions.')
    }
    return 'dev-only-insecure-secret-do-not-use-in-production'
  }

  if (IS_PRODUCTION && secret.length < 32) {
    throw new Error('SESSION_SECRET is too short. Use at least 32 random characters.')
  }

  return secret
}

export type SessionRole = 'super_admin' | 'admin' | 'warehouse' | 'buyer'

export interface SessionPayload {
  phone: string
  role: SessionRole
  iat?: number
  exp?: number
}

const VALID_ROLES: SessionRole[] = ['super_admin', 'admin', 'warehouse', 'buyer']

/** Sessions are short-lived; the client refreshes by re-reading its role. */
export const SESSION_TTL_SECONDS = 60 * 60 * 12 // 12 hours

export function issueSessionToken(phone: string, role: SessionRole): string {
  const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10)
  if (cleanPhone.length !== 10) {
    throw new Error('Cannot issue a session for an invalid phone number.')
  }
  if (!VALID_ROLES.includes(role)) {
    throw new Error(`Cannot issue a session for unknown role "${role}".`)
  }

  return jwt.sign({ phone: cleanPhone, role }, getSessionSecret(), {
    expiresIn: SESSION_TTL_SECONDS,
    algorithm: 'HS256'
  })
}

/**
 * Returns the verified session, or null if the caller is not authenticated.
 * Callers must treat null as "reject the request".
 */
export function verifySessionToken(request: Request): SessionPayload | null {
  const authHeader = request.headers.get('Authorization') || request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null

  const token = authHeader.substring(7).trim()
  if (!token) return null

  let secret: string
  try {
    secret = getSessionSecret()
  } catch (e) {
    // Misconfigured server: deny rather than fall back to a known secret.
    console.error('[session] configuration error:', (e as Error).message)
    return null
  }

  try {
    // Pinning the algorithm prevents an attacker supplying alg:none or switching
    // to an asymmetric algorithm to bypass signature checks.
    //
    // clockTolerance allows a small amount of clock drift between the serverless
    // instance that issued the token and the one verifying it. Without this, a
    // token can be rejected with "jwt issued at future" purely from a few seconds
    // of skew between machines, which has nothing to do with the token being
    // invalid. 10 seconds is generous enough to absorb that drift while still
    // catching a token whose iat has been tampered with by any meaningful amount.
    const decoded = jwt.verify(token, secret, {
      algorithms: ['HS256'],
      clockTolerance: 10
    }) as SessionPayload

    const phone = String(decoded?.phone || '').replace(/\D/g, '').slice(-10)
    if (phone.length !== 10) return null
    if (!decoded?.role || !VALID_ROLES.includes(decoded.role)) return null

    return { phone, role: decoded.role, iat: decoded.iat, exp: decoded.exp }
  } catch {
    // Expired, tampered, malformed, or wrong signature. No fallback.
    return null
  }
}

/** Convenience guard for admin-only endpoints. */
export function requireAdmin(request: Request): SessionPayload | null {
  const session = verifySessionToken(request)
  if (!session) return null
  if (session.role !== 'admin' && session.role !== 'super_admin') return null
  return session
}

/** Convenience guard for super-admin-only endpoints. */
export function requireSuperAdmin(request: Request): SessionPayload | null {
  const session = verifySessionToken(request)
  if (!session) return null
  if (session.role !== 'super_admin') return null
  return session
}
