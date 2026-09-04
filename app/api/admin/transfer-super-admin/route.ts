import { NextResponse } from 'next/server'
import { verifySessionToken } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { transferServerSuperAdmin } from '@/lib/server-store'
import { normalizePhone } from '@/lib/roles'

export async function POST(request: Request) {
  try {
    const session = verifySessionToken(request)
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Invalid or missing session token.' }, { status: 401 })
    }

    if (session.role !== 'super_admin') {
      return NextResponse.json({ success: false, error: 'Forbidden. Only the active Super Admin can perform this action.' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const { targetPhone, targetName } = body

    if (!targetPhone) {
      return NextResponse.json({ success: false, error: 'Target phone number is required.' }, { status: 400 })
    }

    const cleanedTargetPhone = normalizePhone(targetPhone)
    if (cleanedTargetPhone.length !== 10) {
      return NextResponse.json({ success: false, error: 'Invalid target phone number.' }, { status: 400 })
    }

    // Keep the in-memory store in step for the current server process.
    const serverResult = transferServerSuperAdmin(cleanedTargetPhone, targetName)

    // Durable write: promote the target, using the service_role client so this
    // survives the RLS lockdown. This is the write that was previously attempted
    // via an RPC (`transfer_super_admin`) that does not exist in this schema, so
    // the transfer silently never reached the database.
    const { data: existingTarget } = await supabaseAdmin
      .from('user_accounts')
      .select('name')
      .eq('phone', cleanedTargetPhone)
      .maybeSingle()

    const { error: promoteError } = await supabaseAdmin.from('user_accounts').upsert(
      {
        phone: cleanedTargetPhone,
        name: targetName || (existingTarget as any)?.name || `User ${cleanedTargetPhone.slice(-4)}`,
        role: 'super_admin',
        assigned_warehouse_id: null,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'phone' }
    )

    if (promoteError) {
      console.error('[transfer-super-admin] promote failed:', promoteError.message)
      return NextResponse.json(
        { success: false, error: `Could not promote the target account: ${promoteError.message}` },
        { status: 500 }
      )
    }

    // Demote every other super_admin, including the caller, so exactly one remains.
    const { error: demoteError } = await supabaseAdmin
      .from('user_accounts')
      .update({ role: 'admin', updated_at: new Date().toISOString() })
      .eq('role', 'super_admin')
      .neq('phone', cleanedTargetPhone)

    if (demoteError) {
      console.warn('[transfer-super-admin] could not demote previous super_admin(s):', demoteError.message)
    }

    return NextResponse.json({ success: true, data: serverResult })
  } catch (error: any) {
    console.error('[transfer-super-admin] unexpected error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Failed to transfer Super Admin role' }, { status: 500 })
  }
}
