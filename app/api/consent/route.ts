import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  getSession,
  unauthorized,
  badRequest,
  serverError,
  normalize,
  clientIp,
  userAgent,
  cleanText
} from '@/lib/api-auth'

/**
 * Records that a user accepted a specific version of the privacy policy.
 *
 * Append-only: re-consent after a policy update inserts a new row rather than
 * updating the old one, so the full history of what was agreed and when survives.
 * That history is the evidence if consent is ever disputed.
 *
 * The timestamp comes from the database default (now()), never from the client, and
 * the phone comes from the verified session, never from the request body — so a
 * caller cannot record consent on someone else's behalf or backdate it.
 */

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const session = getSession(request)
    if (!session) return unauthorized()

    const body = await request.json().catch(() => ({}))
    const policyVersion = cleanText(body?.policyVersion, 64)

    if (!policyVersion) {
      return badRequest('policyVersion is required.')
    }

    // 'notice-only' is a valid pseudo-version representing acceptance of the
    // data-usage notice when no formal PDF privacy policy has been uploaded yet.
    // Any other version must exist in the privacy_policy_versions table.
    if (policyVersion !== 'notice-only') {
      const { data: policy, error: policyError } = await supabaseAdmin
        .from('privacy_policy_versions')
        .select('version')
        .eq('version', policyVersion)
        .maybeSingle()

      if (policyError) {
        console.error('[consent] policy lookup failed:', policyError.message)
        return serverError('Could not record consent.')
      }

      if (!policy) {
        return badRequest('Unknown policy version.')
      }
    }

    const { error } = await supabaseAdmin.from('user_consents').insert({
      phone: normalize(session.phone),
      policy_version: policyVersion,
      ip: clientIp(request),
      user_agent: userAgent(request)
      // consented_at intentionally omitted: the column default is now(), which is
      // server time. The client clock is not trusted for a legal record.
    })

    if (error) {
      console.error('[consent] insert failed:', error.message)
      return serverError('Could not record consent.')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[consent] unexpected error:', error)
    return serverError('Could not record consent.')
  }
}

/** Returns the caller's consent history, newest first. Used by the profile page. */
export async function GET(request: Request) {
  try {
    const session = getSession(request)
    if (!session) return unauthorized()

    const { data, error } = await supabaseAdmin
      .from('user_consents')
      .select('policy_version, consented_at')
      .eq('phone', normalize(session.phone))
      .order('consented_at', { ascending: false })

    if (error) {
      console.error('[consent] history read failed:', error.message)
      return serverError('Could not load consent history.')
    }

    return NextResponse.json({
      success: true,
      consents: (data || []).map((row: any) => ({
        policyVersion: row.policy_version,
        consentedAt: row.consented_at
      }))
    })
  } catch (error) {
    console.error('[consent] unexpected error:', error)
    return serverError('Could not load consent history.')
  }
}
