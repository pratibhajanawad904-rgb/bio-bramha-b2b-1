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

export const dynamic = 'force-dynamic'

const ADMIN_ROLES: SessionRole[] = ['admin', 'super_admin']

export async function GET(request: Request) {
  try {
    const check = getSessionWithRole(request, ADMIN_ROLES)
    if (!check.ok) return check.reason === 'unauthenticated' ? unauthorized() : forbidden()

    const { data, error } = await supabaseAdmin
      .from('app_settings')
      .select('*')
      .eq('id', 'global')
      .maybeSingle()

    if (error) {
      console.error('[admin/settings] read failed:', error.message)
      return serverError('Could not load settings.')
    }

    return NextResponse.json({ success: true, settings: data || {} })
  } catch (error) {
    console.error('[admin/settings] unexpected error:', error)
    return serverError('Could not load settings.')
  }
}

export async function PATCH(request: Request) {
  try {
    const check = getSessionWithRole(request, ADMIN_ROLES)
    if (!check.ok) return check.reason === 'unauthenticated' ? unauthorized() : forbidden()

    const body = await request.json().catch(() => ({}))
    const updates: Record<string, any> = { updated_at: new Date().toISOString() }

    if (body?.helplineNumber !== undefined) {
      updates.helpline_number = cleanText(body.helplineNumber, 100) || null
    }
    if (body?.helplineEmail !== undefined) {
      updates.helpline_email = cleanText(body.helplineEmail, 254) || null
    }
    if (body?.paymentSettings !== undefined) {
      updates.payment_settings = body.paymentSettings || {}
    }

    if (Object.keys(updates).length === 1) return badRequest('Nothing to update.')

    const { data: existing } = await supabaseAdmin
      .from('app_settings')
      .select('id')
      .eq('id', 'global')
      .maybeSingle()

    if (!existing) {
      const { error } = await supabaseAdmin
        .from('app_settings')
        .insert({ id: 'global', ...updates })
      if (error) {
        console.error('[admin/settings] insert failed:', error.message)
        return serverError('Could not save settings.')
      }
    } else {
      const { error } = await supabaseAdmin
        .from('app_settings')
        .update(updates)
        .eq('id', 'global')
      if (error) {
        console.error('[admin/settings] update failed:', error.message)
        return serverError('Could not save settings.')
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[admin/settings] unexpected error:', error)
    return serverError('Could not save settings.')
  }
}
