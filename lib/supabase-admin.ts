import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * Privileged Supabase client. SERVER ONLY.
 *
 * Uses the service_role key, which bypasses Row Level Security. Once
 * supabase/migrations/0001_lock_down_rls.sql is applied, this is the only way to
 * read PII or write to any table, and every call must sit behind a route that has
 * already verified the caller's session and role.
 *
 * Initialisation is lazy and happens on first property access. Validating at import
 * time instead would abort `next build`, because Next.js evaluates route modules
 * while collecting page data — so a machine without production secrets could not
 * build at all. Deferring the check keeps the guarantee (nothing reaches the
 * database without a valid service_role key) without coupling it to the build.
 *
 * Never import this from a component or from any module the client bundles.
 */

let cached: SupabaseClient | null = null

function createAdminClient(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error(
      'lib/supabase-admin.ts was used in the browser. This module holds the ' +
        'service_role key and must only be used in server code (app/api/**).'
    )
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured.')
  }

  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not configured. Get it from Supabase Dashboard -> ' +
        'Project Settings -> API -> service_role. It must never be exposed to the client.'
    )
  }

  // A publishable/anon key here would leave every query subject to RLS, making
  // privileged routes look broken rather than insecure. Catch that specifically.
  if (serviceRoleKey.startsWith('sb_publishable_') || serviceRoleKey.includes('anon')) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY appears to hold a publishable/anon key. ' +
        'Server-side operations require the service_role key.'
    )
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      // No session persistence or token refresh on a server.
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

function getAdminClient(): SupabaseClient {
  if (!cached) cached = createAdminClient()
  return cached
}

/**
 * Behaves like a SupabaseClient. The underlying client is built on first use, so
 * importing this module is always safe; misconfiguration surfaces at call time as a
 * 500 from the route rather than a silent downgrade to anon privileges.
 */
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getAdminClient()
    const value = Reflect.get(client as object, prop, receiver)
    return typeof value === 'function' ? value.bind(client) : value
  }
})
