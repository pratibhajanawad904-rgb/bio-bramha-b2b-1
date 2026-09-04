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
      .from('secondary_categories')
      .select('*')
      .order('name')

    if (error) {
      console.error('[admin/categories] read failed:', error.message)
      return serverError('Could not load categories.')
    }

    return NextResponse.json({ success: true, categories: data || [] })
  } catch (error) {
    console.error('[admin/categories] unexpected error:', error)
    return serverError('Could not load categories.')
  }
}

export async function POST(request: Request) {
  try {
    const check = getSessionWithRole(request, ADMIN_ROLES)
    if (!check.ok) return check.reason === 'unauthenticated' ? unauthorized() : forbidden()

    const body = await request.json().catch(() => ({}))

    const id = cleanText(body?.id, 64)
    const name = cleanText(body?.name, 100)

    if (!id || !name) return badRequest('Category id and name are required.')

    const { error } = await supabaseAdmin.from('secondary_categories').insert({ id, name })

    if (error) {
      if (error.code === '23505') return badRequest('A category with that id or name already exists.')
      console.error('[admin/categories] insert failed:', error.message)
      return serverError('Could not create the category.')
    }

    return NextResponse.json({ success: true, categoryId: id })
  } catch (error) {
    console.error('[admin/categories] unexpected error:', error)
    return serverError('Could not create the category.')
  }
}

export async function PATCH(request: Request) {
  try {
    const check = getSessionWithRole(request, ADMIN_ROLES)
    if (!check.ok) return check.reason === 'unauthenticated' ? unauthorized() : forbidden()

    const body = await request.json().catch(() => ({}))
    const id = cleanText(body?.id, 64)
    if (!id) return badRequest('Category id is required.')

    const name = cleanText(body?.name, 100)
    if (!name) return badRequest('Name cannot be empty.')

    const { data, error } = await supabaseAdmin
      .from('secondary_categories')
      .update({ name })
      .eq('id', id)
      .select('id')

    if (error) {
      if (error.code === '23505') return badRequest('A category with that name already exists.')
      console.error('[admin/categories] update failed:', error.message)
      return serverError('Could not update the category.')
    }
    if (!data || data.length === 0) {
      return NextResponse.json({ success: false, error: 'Category not found.' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[admin/categories] unexpected error:', error)
    return serverError('Could not update the category.')
  }
}

export async function DELETE(request: Request) {
  try {
    const check = getSessionWithRole(request, ADMIN_ROLES)
    if (!check.ok) return check.reason === 'unauthenticated' ? unauthorized() : forbidden()

    const id = cleanText(new URL(request.url).searchParams.get('id'), 64)
    if (!id) return badRequest('Category id is required.')

    const { data, error } = await supabaseAdmin
      .from('secondary_categories')
      .delete()
      .eq('id', id)
      .select('id')

    if (error) {
      console.error('[admin/categories] delete failed:', error.message)
      return serverError('Could not delete the category.')
    }
    if (!data || data.length === 0) {
      return NextResponse.json({ success: false, error: 'Category not found.' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[admin/categories] unexpected error:', error)
    return serverError('Could not delete the category.')
  }
}
