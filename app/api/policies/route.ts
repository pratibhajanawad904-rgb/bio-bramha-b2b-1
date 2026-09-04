import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { serverError } from '@/lib/api-auth'

/**
 * Public endpoint describing the app's legal documents.
 *
 * Deliberately never fails hard. If no privacy policy has been uploaded, this
 * returns `privacyPolicy: null` and the client hides the consent step rather than
 * showing a broken link or blocking signup. The same applies to the refund policy,
 * the data-usage notice, and the grievance contact.
 *
 * PDFs live in a private Storage bucket, so a short-lived signed URL is minted per
 * request instead of exposing a permanent public path.
 */

export const dynamic = 'force-dynamic'

const BUCKET = 'legal-documents'
const SIGNED_URL_TTL_SECONDS = 60 * 10

async function signedUrlFor(path: string | null | undefined): Promise<string | null> {
  if (!path) return null
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)

  if (error) {
    // A missing file must not take the whole endpoint down.
    console.warn(`[policies] could not sign ${path}: ${error.message}`)
    return null
  }
  return data?.signedUrl ?? null
}

export async function GET() {
  try {
    const [policyRes, refundRes, noticeRes, grievanceRes] = await Promise.all([
      supabaseAdmin
        .from('privacy_policy_versions')
        .select('*')
        .eq('is_current', true)
        .maybeSingle(),
      supabaseAdmin.from('refund_policy').select('*').eq('id', 'global').maybeSingle(),
      supabaseAdmin.from('data_usage_notice_items').select('*').order('sort_order', { ascending: true }),
      supabaseAdmin.from('grievance_contact').select('*').eq('id', 'global').maybeSingle()
    ])

    // Log failures but keep responding: a partially configured system should still
    // render whatever it does have.
    for (const [label, res] of [
      ['privacy_policy_versions', policyRes],
      ['refund_policy', refundRes],
      ['data_usage_notice_items', noticeRes],
      ['grievance_contact', grievanceRes]
    ] as const) {
      if (res.error) console.warn(`[policies] ${label} read failed: ${res.error.message}`)
    }

    const policyRow: any = policyRes.data
    const refundRow: any = refundRes.data

    const privacyPolicy = policyRow
      ? {
          version: policyRow.version,
          effectiveDate: policyRow.effective_date,
          url: await signedUrlFor(policyRow.pdf_path)
        }
      : null

    let refundPolicy: { mode: 'link' | 'pdf'; url: string | null } | null = null
    if (refundRow) {
      refundPolicy =
        refundRow.mode === 'link'
          ? { mode: 'link', url: refundRow.url ?? null }
          : { mode: 'pdf', url: await signedUrlFor(refundRow.pdf_path) }
    }

    const grievanceRow: any = grievanceRes.data

    return NextResponse.json({
      success: true,
      // null means "not published yet" — the client hides the section entirely.
      privacyPolicy,
      refundPolicy,
      dataUsageNotice: (noticeRes.data || []).map((item: any) => ({
        category: item.category,
        purpose: item.purpose,
        sharedWith: item.shared_with,
        retention: item.retention
      })),
      grievanceContact: grievanceRow
        ? { name: grievanceRow.name, email: grievanceRow.email, phone: grievanceRow.phone }
        : null
    })
  } catch (error) {
    console.error('[policies] unexpected error:', error)
    return serverError('Could not load policy information.')
  }
}
