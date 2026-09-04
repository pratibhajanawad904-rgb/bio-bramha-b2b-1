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

    const { data, error } = await supabaseAdmin.from('offers').select('*').order('title')

    if (error) {
      console.error('[admin/offers] read failed:', error.message)
      return serverError('Could not load offers.')
    }

    return NextResponse.json({ success: true, offers: data || [] })
  } catch (error) {
    console.error('[admin/offers] unexpected error:', error)
    return serverError('Could not load offers.')
  }
}

export async function POST(request: Request) {
  try {
    const check = getSessionWithRole(request, ADMIN_ROLES)
    if (!check.ok) return check.reason === 'unauthenticated' ? unauthorized() : forbidden()

    const body = await request.json().catch(() => ({}))

    const id = cleanText(body?.id, 64)
    const title = cleanText(body?.title, 200)

    if (!id || !title) return badRequest('Offer id and title are required.')

    const discount = Number(body?.discountPercentage ?? 0)
    if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
      return badRequest('Discount percentage must be between 0 and 100.')
    }

    const offer = {
      id,
      title,
      discount_percentage: discount,
      active: body?.active === true,
      product_ids: Array.isArray(body?.productIds)
        ? body.productIds.map((p: any) => cleanText(p, 64))
        : []
    }

    const { error } = await supabaseAdmin.from('offers').insert(offer)

    if (error) {
      if (error.code === '23505') return badRequest('An offer with that id already exists.')
      console.error('[admin/offers] insert failed:', error.message)
      return serverError('Could not create the offer.')
    }

    return NextResponse.json({ success: true, offerId: id })
  } catch (error) {
    console.error('[admin/offers] unexpected error:', error)
    return serverError('Could not create the offer.')
  }
}

export async function PATCH(request: Request) {
  try {
    const check = getSessionWithRole(request, ADMIN_ROLES)
    if (!check.ok) return check.reason === 'unauthenticated' ? unauthorized() : forbidden()

    const body = await request.json().catch(() => ({}))
    const id = cleanText(body?.id, 64)
    if (!id) return badRequest('Offer id is required.')

    const updates: Record<string, any> = {}

    if (body?.title !== undefined) {
      const title = cleanText(body.title, 200)
      if (!title) return badRequest('Title cannot be empty.')
      updates.title = title
    }

    if (body?.discountPercentage !== undefined) {
      const disc = Number(body.discountPercentage)
      if (!Number.isFinite(disc) || disc < 0 || disc > 100) {
        return badRequest('Discount percentage must be 0-100.')
      }
      updates.discount_percentage = disc
    }

    if (body?.active !== undefined) updates.active = body.active === true

    if (Array.isArray(body?.productIds)) {
      updates.product_ids = body.productIds.map((p: any) => cleanText(p, 64))
    }

    if (Object.keys(updates).length === 0) return badRequest('Nothing to update.')

    const { data, error } = await supabaseAdmin.from('offers').update(updates).eq('id', id).select('id')

    if (error) {
      console.error('[admin/offers] update failed:', error.message)
      return serverError('Could not update the offer.')
    }
    if (!data || data.length === 0) {
      return NextResponse.json({ success: false, error: 'Offer not found.' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[admin/offers] unexpected error:', error)
    return serverError('Could not update the offer.')
  }
}

export async function DELETE(request: Request) {
  try {
    const check = getSessionWithRole(request, ADMIN_ROLES)
    if (!check.ok) return check.reason === 'unauthenticated' ? unauthorized() : forbidden()

    const id = cleanText(new URL(request.url).searchParams.get('id'), 64)
    if (!id) return badRequest('Offer id is required.')

    const { data, error } = await supabaseAdmin.from('offers').delete().eq('id', id).select('id')

    if (error) {
      console.error('[admin/offers] delete failed:', error.message)
      return serverError('Could not delete the offer.')
    }
    if (!data || data.length === 0) {
      return NextResponse.json({ success: false, error: 'Offer not found.' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[admin/offers] unexpected error:', error)
    return serverError('Could not delete the offer.')
  }
}
