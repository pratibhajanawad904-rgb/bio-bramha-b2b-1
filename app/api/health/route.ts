import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Deployment self-check (no secrets returned). Hit /api/health after deploying to
// confirm the server can actually reach Supabase with the configured env vars.
export async function GET() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
  const host = url ? url.replace(/^https?:\/\//, '').split('/')[0] : ''
  const configured = {
    supabaseUrl: Boolean(url),
    supabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    supabaseServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    msg91AuthKey: Boolean(process.env.MSG91_AUTH_KEY),
    msg91TemplateId: Boolean(process.env.MSG91_TEMPLATE_ID),
    sessionSecret: Boolean(process.env.SESSION_SECRET)
  }

  let database: 'ok' | 'unreachable' | 'unauthorized' | 'not-configured' = 'not-configured'
  let detail = ''
  if (url && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const res = await fetch(`${url.replace(/\/+$/, '')}/rest/v1/products?select=id&limit=1`, {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        signal: AbortSignal.timeout(8000)
      })
      database = res.ok ? 'ok' : 'unauthorized'
      if (!res.ok) detail = `Supabase responded ${res.status}`
    } catch (e: any) {
      database = 'unreachable'
      detail = `Could not connect to ${host}. Check NEXT_PUBLIC_SUPABASE_URL for typos.`
    }
  }

  const ok = database === 'ok' && Object.values(configured).every(Boolean)
  return NextResponse.json({ ok, supabaseHost: host, database, detail, configured }, { status: ok ? 200 : 503 })
}
