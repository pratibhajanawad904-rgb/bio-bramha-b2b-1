import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  getSessionWithRole,
  unauthorized,
  forbidden,
  badRequest,
  serverError,
  cleanText
} from '@/lib/api-auth'
import type { SessionRole } from '@/lib/session'

/**
 * Admin management of legal documents: privacy policy versions, refund policy,
 * data-usage notice items, and grievance contact.
 *
 * PDF upload goes through Supabase Storage (private bucket), then this route
 * records the version metadata. The public /api/policies endpoint reads it back
 * and mints short-lived signed URLs for the PDFs.
 */

export const dynamic = 'force-dynamic'

const ADMIN_ROLES: SessionRole[] = ['admin', 'super_admin']
const BUCKET = 'legal-documents'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(request: Request) {
  try {
    const check = getSessionWithRole(request, ADMIN_ROLES)
    if (!check.ok) return check.reason === 'unauthenticated' ? unauthorized() : forbidden()

    const formData = await request.formData()
    const action = formData.get('action') as string

    if (action === 'upload-privacy-policy') {
      return handlePrivacyPolicyUpload(formData)
    } else if (action === 'set-refund-policy') {
      return handleRefundPolicy(formData)
    } else if (action === 'update-grievance-contact') {
      return handleGrievanceContact(formData)
    } else if (action === 'update-notice-items') {
      return handleNoticeItems(formData)
    }

    return badRequest('Unknown action.')
  } catch (error) {
    console.error('[admin/policies] unexpected error:', error)
    return serverError('Could not process the request.')
  }
}

async function handlePrivacyPolicyUpload(formData: FormData) {
  const file = formData.get('file') as File | null
  const version = cleanText(formData.get('version'), 64)
  const effectiveDate = cleanText(formData.get('effectiveDate'), 20)

  if (!file || !version || !effectiveDate) {
    return badRequest('File, version, and effective date are required.')
  }

  if (file.size > MAX_FILE_SIZE) {
    return badRequest('File must be under 10MB.')
  }

  // Validate PDF magic bytes
  const buffer = Buffer.from(await file.arrayBuffer())
  if (!buffer.subarray(0, 5).toString().startsWith('%PDF-')) {
    return badRequest('File does not appear to be a valid PDF.')
  }

  // Randomised filename to prevent path traversal
  const storagePath = `privacy/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.pdf`

  // Ensure bucket exists (create if needed - will 409 if already exists, that's fine)
  await supabaseAdmin.storage.createBucket(BUCKET, { public: false }).catch(() => {})

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType: 'application/pdf', upsert: false })

  if (uploadError) {
    console.error('[admin/policies] upload failed:', uploadError.message)
    return serverError('Could not upload the file.')
  }

  // Mark previous versions as not current
  await supabaseAdmin
    .from('privacy_policy_versions')
    .update({ is_current: false })
    .eq('is_current', true)

  // Insert new version
  const { error: insertError } = await supabaseAdmin
    .from('privacy_policy_versions')
    .insert({
      version,
      pdf_path: storagePath,
      effective_date: effectiveDate,
      is_current: true
    })

  if (insertError) {
    console.error('[admin/policies] version insert failed:', insertError.message)
    // A duplicate version number is a genuine 400 (bad input from the admin), not a
    // server fault — surfacing the real reason here is what turns a dead-end
    // "Could not save the policy version." into something the admin can act on.
    if (insertError.code === '23505') {
      return badRequest(`Version "${version}" has already been uploaded. Use a different version number.`)
    }
    return serverError('Could not save the policy version.')
  }

  return NextResponse.json({ success: true, version, storagePath })
}

async function handleRefundPolicy(formData: FormData) {
  const mode = cleanText(formData.get('mode'), 10) as 'link' | 'pdf'

  if (mode === 'link') {
    const url = cleanText(formData.get('url'), 2000)
    if (!url || !url.startsWith('https://')) {
      return badRequest('A valid HTTPS URL is required for link mode.')
    }

    const { error } = await supabaseAdmin
      .from('refund_policy')
      .upsert({ id: 'global', mode: 'link', url, pdf_path: null, updated_at: new Date().toISOString() }, { onConflict: 'id' })

    if (error) {
      console.error('[admin/policies] refund upsert failed:', error.message)
      return serverError('Could not save the refund policy.')
    }

    return NextResponse.json({ success: true })
  }

  if (mode === 'pdf') {
    const file = formData.get('file') as File | null
    if (!file) return badRequest('PDF file is required.')
    if (file.size > MAX_FILE_SIZE) return badRequest('File must be under 10MB.')

    const buffer = Buffer.from(await file.arrayBuffer())
    if (!buffer.subarray(0, 5).toString().startsWith('%PDF-')) {
      return badRequest('File does not appear to be a valid PDF.')
    }

    const storagePath = `refund/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.pdf`

    await supabaseAdmin.storage.createBucket(BUCKET, { public: false }).catch(() => {})

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: 'application/pdf', upsert: false })

    if (uploadError) {
      console.error('[admin/policies] refund upload failed:', uploadError.message)
      return serverError('Could not upload the file.')
    }

    const { error } = await supabaseAdmin
      .from('refund_policy')
      .upsert({ id: 'global', mode: 'pdf', url: null, pdf_path: storagePath, updated_at: new Date().toISOString() }, { onConflict: 'id' })

    if (error) {
      console.error('[admin/policies] refund upsert failed:', error.message)
      return serverError('Could not save the refund policy.')
    }

    return NextResponse.json({ success: true })
  }

  return badRequest('Mode must be "link" or "pdf".')
}

async function handleGrievanceContact(formData: FormData) {
  const name = cleanText(formData.get('name'), 120)
  const email = cleanText(formData.get('email'), 254)
  const phone = cleanText(formData.get('phone'), 30)

  if (!name || !email) {
    return badRequest('Name and email are required.')
  }

  const { error } = await supabaseAdmin
    .from('grievance_contact')
    .upsert({ id: 'global', name, email, phone: phone || null, updated_at: new Date().toISOString() }, { onConflict: 'id' })

  if (error) {
    console.error('[admin/policies] grievance upsert failed:', error.message)
    return serverError('Could not save the grievance contact.')
  }

  return NextResponse.json({ success: true })
}

async function handleNoticeItems(formData: FormData) {
  const itemsJson = formData.get('items') as string
  if (!itemsJson) return badRequest('Items data is required.')

  let items: any[]
  try {
    items = JSON.parse(itemsJson)
  } catch {
    return badRequest('Invalid items JSON.')
  }

  if (!Array.isArray(items) || items.length === 0) {
    return badRequest('At least one notice item is required.')
  }

  if (items.length > 20) {
    return badRequest('Maximum 20 notice items allowed.')
  }

  // Replace all items atomically: delete existing, insert new
  const { error: deleteError } = await supabaseAdmin
    .from('data_usage_notice_items')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // delete all

  if (deleteError) {
    console.error('[admin/policies] notice delete failed:', deleteError.message)
    return serverError('Could not update notice items.')
  }

  const rows = items.map((item: any, i: number) => ({
    category: cleanText(item.category, 200),
    purpose: cleanText(item.purpose, 500),
    shared_with: cleanText(item.sharedWith, 300) || null,
    retention: cleanText(item.retention, 300) || null,
    sort_order: i + 1,
    updated_at: new Date().toISOString()
  }))

  const { error: insertError } = await supabaseAdmin
    .from('data_usage_notice_items')
    .insert(rows)

  if (insertError) {
    console.error('[admin/policies] notice insert failed:', insertError.message)
    return serverError('Could not save notice items.')
  }

  return NextResponse.json({ success: true, count: rows.length })
}
