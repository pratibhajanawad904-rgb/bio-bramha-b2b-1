import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  getSessionWithRole,
  unauthorized,
  forbidden,
  badRequest,
  serverError,
  normalize,
  cleanText
} from '@/lib/api-auth'

import { PREPROVISIONED_ACCOUNTS } from '@/lib/roles'

/**
 * Role management.
 * GET: super_admin and admin can view elevated accounts.
 * PATCH: super_admin only can assign roles.
 *
 * Any account, including the bootstrap seed phones, can be reassigned to any
 * role.
 */

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const check = getSessionWithRole(request, ['super_admin', 'admin'])
    if (!check.ok) return check.reason === 'unauthenticated' ? unauthorized() : forbidden()

    const { data, error } = await supabaseAdmin
      .from('user_accounts')
      .select('phone, name, role, assigned_warehouse_id, updated_at, is_deleted')
      .neq('role', 'buyer')

    const accountsMap = new Map<string, any>()

    // 1. Seed with preprovisioned bootstrap accounts
    for (const [phone, meta] of Object.entries(PREPROVISIONED_ACCOUNTS)) {
      accountsMap.set(phone, {
        phone,
        name: meta.name,
        role: meta.role,
        assignedWarehouseId: meta.assignedWarehouseId,
        updatedAt: new Date().toISOString()
      })
    }

    // 2. Merge database accounts
    if (!error && Array.isArray(data)) {
      data.forEach((a: any) => {
        if (a.is_deleted === true) {
          accountsMap.delete(a.phone)
          return
        }
        if (a.role && a.role !== 'buyer') {
          accountsMap.set(a.phone, {
            phone: a.phone,
            name: a.name || 'User',
            role: a.role,
            assignedWarehouseId: a.assigned_warehouse_id,
            updatedAt: a.updated_at
          })
        }
      })
    }

    return NextResponse.json({
      success: true,
      accounts: Array.from(accountsMap.values())
    })
  } catch (error) {
    console.error('[admin/roles] unexpected error:', error)
    return serverError('Could not load user accounts.')
  }
}

export async function PATCH(request: Request) {
  try {
    const check = getSessionWithRole(request, ['super_admin'])
    if (!check.ok) return check.reason === 'unauthenticated' ? unauthorized() : forbidden()

    const body = await request.json().catch(() => ({}))

    const phone = normalize(cleanText(body?.phone, 20))
    if (!phone) return badRequest('Phone number is required.')

    const role = cleanText(body?.role, 20)
    if (!['buyer', 'warehouse', 'admin', 'super_admin'].includes(role)) {
      return badRequest('Role must be buyer, warehouse, admin, or super_admin.')
    }

    const updates: Record<string, any> = { role, updated_at: new Date().toISOString() }

    if (body?.assignedWarehouseId !== undefined) {
      updates.assigned_warehouse_id = cleanText(body.assignedWarehouseId, 60) || null
    }

    const { data, error } = await supabaseAdmin
      .from('user_accounts')
      .update(updates)
      .eq('phone', phone)
      .select('phone')

    if (error) {
      console.error('[admin/roles] update failed:', error.message)
      return serverError('Could not update the role.')
    }
    if (!data || data.length === 0) {
      return NextResponse.json({ success: false, error: 'Account not found.' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[admin/roles] unexpected error:', error)
    return serverError('Could not update the role.')
  }
}
