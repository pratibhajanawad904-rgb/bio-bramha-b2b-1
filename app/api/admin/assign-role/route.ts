// The Android app writes roles client-side against Supabase (see lib/app-context.tsx)
// because it has no server. This route is the equivalent path for the web deployment.
import { NextResponse } from 'next/server'
import { verifySessionToken } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { assignServerRole } from '@/lib/server-store'
import { normalizePhone } from '@/lib/roles'

export async function POST(request: Request) {
  try {
    const session = verifySessionToken(request)
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Invalid or missing session token.' }, { status: 401 })
    }

    if (session.role !== 'admin' && session.role !== 'super_admin') {
      return NextResponse.json({ success: false, error: 'Forbidden. Admin privileges required.' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const { targetPhone, newRole, targetName, targetWarehouseId } = body

    if (!targetPhone || !newRole) {
      return NextResponse.json({ success: false, error: 'Target phone number and new role are required.' }, { status: 400 })
    }

    const cleanedTargetPhone = normalizePhone(targetPhone)
    if (cleanedTargetPhone.length !== 10) {
      return NextResponse.json({ success: false, error: 'Invalid target phone number.' }, { status: 400 })
    }

    const validRoles = ['super_admin', 'admin', 'warehouse', 'buyer']
    if (!validRoles.includes(newRole)) {
      return NextResponse.json({ success: false, error: `Invalid role "${newRole}".` }, { status: 400 })
    }

    // Only a super_admin may mint another super_admin.
    if (newRole === 'super_admin' && session.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Only a Super Admin can assign the super_admin role.' },
        { status: 403 }
      )
    }

    // The two seed phones (owner + warehouse manager) are a bootstrap default, not a
    // permanent reservation — a super_admin can reassign either of them like any
    // other account. See the comment on PREPROVISIONED_ACCOUNTS in lib/roles.ts.

    // Keep the in-memory store in step for the current server process.
    const serverResult = assignServerRole(cleanedTargetPhone, newRole, targetName, targetWarehouseId)

    // Durable write. This is what lets another already-logged-in device pick the change up.
    const { data, error } = await supabaseAdmin
      .from('user_accounts')
      .upsert(
        {
          phone: cleanedTargetPhone,
          name: targetName || serverResult.name || `User ${cleanedTargetPhone}`,
          role: newRole,
          assigned_warehouse_id: newRole === 'warehouse' ? targetWarehouseId || 'wh-taloja' : null,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'phone' }
      )
      .select()
      .single()

    if (error) {
      console.error('[assign-role] durable write failed:', error)
      return NextResponse.json(
        {
          success: false,
          error: `Role could not be saved to the shared account store: ${error.message}`,
          details: error
        },
        { status: 500 }
      )
    }

    // Demote any other super_admin so only one ever exists.
    if (newRole === 'super_admin') {
      const { error: demoteError } = await supabaseAdmin
        .from('user_accounts')
        .update({ role: 'admin', updated_at: new Date().toISOString() })
        .eq('role', 'super_admin')
        .neq('phone', cleanedTargetPhone)

      if (demoteError) {
        console.warn('[assign-role] failed to demote previous super_admin(s):', demoteError.message)
      }
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('[assign-role] unexpected error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Failed to assign role' }, { status: 500 })
  }
}
