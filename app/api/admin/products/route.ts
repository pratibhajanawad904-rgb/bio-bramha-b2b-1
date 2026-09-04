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
 * Product catalog management.
 *
 * Admin and super_admin only. Buyers and warehouse staff do not create or edit
 * products, so there is no reason for those roles to access this endpoint.
 */

export const dynamic = 'force-dynamic'

const ADMIN_ROLES: SessionRole[] = ['admin', 'super_admin']

export async function GET(request: Request) {
  try {
    const check = getSessionWithRole(request, ADMIN_ROLES)
    if (!check.ok) return check.reason === 'unauthenticated' ? unauthorized() : forbidden()

    const { data, error } = await supabaseAdmin.from('products').select('*').order('name')

    if (error) {
      console.error('[admin/products] read failed:', error.message)
      return serverError('Could not load products.')
    }

    return NextResponse.json({ success: true, products: data || [] })
  } catch (error) {
    console.error('[admin/products] unexpected error:', error)
    return serverError('Could not load products.')
  }
}

export async function POST(request: Request) {
  try {
    const check = getSessionWithRole(request, ADMIN_ROLES)
    if (!check.ok) return check.reason === 'unauthenticated' ? unauthorized() : forbidden()

    const body = await request.json().catch(() => ({}))

    const id = cleanText(body?.id, 64)
    const name = cleanText(body?.name, 200)
    const category = cleanText(body?.category, 100)

    if (!id || !name || !category) {
      return badRequest('Product id, name and category are required.')
    }

    const price = Number(body?.price ?? 0)
    if (!Number.isFinite(price) || price < 0) {
      return badRequest('Price must be a non-negative number.')
    }

    const stock = Math.floor(Number(body?.stock ?? 0))
    if (!Number.isFinite(stock) || stock < 0) {
      return badRequest('Stock must be a non-negative integer.')
    }

    const mainCategory = cleanText(body?.mainCategory, 40) || 'non_bulk'
    if (!['bulk', 'non_bulk'].includes(mainCategory)) {
      return badRequest('mainCategory must be "bulk" or "non_bulk".')
    }

    const moq = body?.moq ? Math.floor(Number(body.moq)) : null
    if (moq !== null && (!Number.isFinite(moq) || moq < 1)) {
      return badRequest('MOQ must be a positive integer.')
    }

    const product = {
      id,
      name,
      strain: cleanText(body?.strain, 300) || null,
      category,
      crops: Array.isArray(body?.crops) ? body.crops.map((c: any) => cleanText(c, 100)) : [],
      benefit: cleanText(body?.benefit, 500) || null,
      price,
      pack_size: cleanText(body?.packSize, 100) || null,
      image: cleanText(body?.image, 2_000_000) || null,
      images: Array.isArray(body?.images) ? body.images.map((i: any) => cleanText(i, 2_000_000)) : [],
      stock,
      badge: cleanText(body?.badge, 60) || null,
      details: body?.details || null,
      main_category: mainCategory,
      secondary_category_ids: Array.isArray(body?.secondaryCategoryIds)
        ? body.secondaryCategoryIds.map((c: any) => cleanText(c, 64))
        : [],
      moq
    }

    const { error } = await supabaseAdmin.from('products').insert(product)

    if (error) {
      if (error.code === '23505') return badRequest('A product with that id already exists.')
      console.error('[admin/products] insert failed:', error.message)
      return serverError('Could not create the product.')
    }

    return NextResponse.json({ success: true, productId: id })
  } catch (error) {
    console.error('[admin/products] unexpected error:', error)
    return serverError('Could not create the product.')
  }
}

export async function PATCH(request: Request) {
  try {
    const check = getSessionWithRole(request, ADMIN_ROLES)
    if (!check.ok) return check.reason === 'unauthenticated' ? unauthorized() : forbidden()

    const body = await request.json().catch(() => ({}))
    const id = cleanText(body?.id, 64)
    if (!id) return badRequest('Product id is required.')

    const updates: Record<string, any> = {}

    if (body?.name !== undefined) {
      const name = cleanText(body.name, 200)
      if (!name) return badRequest('Name cannot be empty.')
      updates.name = name
    }

    if (body?.price !== undefined) {
      const price = Number(body.price)
      if (!Number.isFinite(price) || price < 0) return badRequest('Price must be non-negative.')
      updates.price = price
    }

    if (body?.stock !== undefined) {
      const stock = Math.floor(Number(body.stock))
      if (!Number.isFinite(stock) || stock < 0) return badRequest('Stock must be non-negative.')
      updates.stock = stock
    }

    if (body?.category !== undefined) updates.category = cleanText(body.category, 100)
    if (body?.strain !== undefined) updates.strain = cleanText(body.strain, 300) || null
    if (body?.benefit !== undefined) updates.benefit = cleanText(body.benefit, 500) || null
    if (body?.packSize !== undefined) updates.pack_size = cleanText(body.packSize, 100) || null
    if (body?.image !== undefined) updates.image = cleanText(body.image, 2_000_000) || null
    if (body?.badge !== undefined) updates.badge = cleanText(body.badge, 60) || null
    if (body?.details !== undefined) updates.details = body.details || null
    if (body?.mainCategory !== undefined) {
      const mc = cleanText(body.mainCategory, 40)
      if (!['bulk', 'non_bulk'].includes(mc)) return badRequest('Invalid mainCategory.')
      updates.main_category = mc
    }
    if (body?.moq !== undefined) {
      const moq = body.moq ? Math.floor(Number(body.moq)) : null
      if (moq !== null && (!Number.isFinite(moq) || moq < 1)) {
        return badRequest('MOQ must be positive.')
      }
      updates.moq = moq
    }

    if (Array.isArray(body?.crops)) {
      updates.crops = body.crops.map((c: any) => cleanText(c, 100))
    }
    if (Array.isArray(body?.images)) {
      updates.images = body.images.map((i: any) => cleanText(i, 2_000_000))
    }
    if (Array.isArray(body?.secondaryCategoryIds)) {
      updates.secondary_category_ids = body.secondaryCategoryIds.map((c: any) => cleanText(c, 64))
    }

    if (Object.keys(updates).length === 0) return badRequest('Nothing to update.')

    const { data, error } = await supabaseAdmin
      .from('products')
      .update(updates)
      .eq('id', id)
      .select('id')

    if (error) {
      console.error('[admin/products] update failed:', error.message)
      return serverError('Could not update the product.')
    }
    if (!data || data.length === 0) {
      return NextResponse.json({ success: false, error: 'Product not found.' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[admin/products] unexpected error:', error)
    return serverError('Could not update the product.')
  }
}

export async function DELETE(request: Request) {
  try {
    const check = getSessionWithRole(request, ADMIN_ROLES)
    if (!check.ok) return check.reason === 'unauthenticated' ? unauthorized() : forbidden()

    const id = cleanText(new URL(request.url).searchParams.get('id'), 64)
    if (!id) return badRequest('Product id is required.')

    const { data, error } = await supabaseAdmin.from('products').delete().eq('id', id).select('id')

    if (error) {
      console.error('[admin/products] delete failed:', error.message)
      return serverError('Could not delete the product.')
    }
    if (!data || data.length === 0) {
      return NextResponse.json({ success: false, error: 'Product not found.' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[admin/products] unexpected error:', error)
    return serverError('Could not delete the product.')
  }
}
