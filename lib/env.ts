/**
 * Server-side configuration access.
 *
 * Secrets must never have hardcoded fallbacks. The previous code defaulted the MSG91
 * auth key and SESSION_SECRET to literals committed in the source, which meant the
 * app kept working after a "rotation" using the leaked values, and anyone reading the
 * repo held production credentials.
 *
 * In production a missing secret throws. In development it throws too, but with a
 * message telling you which .env.local key is missing.
 */

const IS_PRODUCTION = process.env.NODE_ENV === 'production'

function required(name: string): string {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(
      IS_PRODUCTION
        ? `Missing required environment variable: ${name}`
        : `Missing ${name}. Add it to .env.local (and to your Vercel project settings before deploying).`
    )
  }

  return value
}

function optional(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback
}

export const serverConfig = {
  get msg91AuthKey() {
    return required('MSG91_AUTH_KEY')
  },
  get msg91TemplateId() {
    return required('MSG91_TEMPLATE_ID')
  },
  get msg91SenderId() {
    return optional('MSG91_SENDER_ID', 'DMTRA')
  },
  get sessionSecret() {
    return required('SESSION_SECRET')
  }
}

/**
 * Returns a message safe to send to a client.
 *
 * Raw error messages can carry stack traces, file paths, SQL fragments, or upstream
 * provider detail. Those are logged server-side instead.
 */
export function safeErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (!IS_PRODUCTION && error instanceof Error) {
    return error.message
  }
  return fallback
}
