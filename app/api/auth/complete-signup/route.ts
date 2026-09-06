import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { issueSessionToken } from '@/lib/session'

// Bootstrap seed only — see the comment on PREPROVISIONED_ACCOUNTS in lib/roles.ts.
// This route only ever runs for a phone with no existing row (verify-otp already
// routes existing accounts straight to login), so the seed applies at most once.
const PREPROVISIONED_ACCOUNTS: Record<string, { name: string; role: 'super_admin' | 'warehouse'; assignedWarehouseId?: string }> = {
  '8050946969': { name: 'Super Admin', role: 'super_admin' },
  '7975158924': { name: 'Warehouse Manager', role: 'warehouse', assignedWarehouseId: 'wh-taloja' }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { phone, name, email } = body

    if (!phone || !name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Phone number and Full Name are required.' }, { status: 400 })
    }

    const cleanedPhone = String(phone).replace(/\D/g, '').slice(-10)
    const cleanedName = String(name).trim()
    const cleanedEmail = email && String(email).trim() ? String(email).trim() : null

    if (cleanedPhone.length !== 10) {
      return NextResponse.json({ success: false, error: 'Invalid phone number.' }, { status: 400 })
    }

    const preprovisioned = PREPROVISIONED_ACCOUNTS[cleanedPhone]

    // Check if pre-provisioned user row exists
    let userRow: any = null
    try {
      const { data: existing } = await supabaseServer
        .from('user_accounts')
        .select('*')
        .eq('phone', cleanedPhone)
        .maybeSingle()
      userRow = existing
    } catch (e) {}

    // Stored row wins if one somehow already exists; the seed is only a fallback.
    // EXCEPT: a deleted row means the user is re-registering — they start fresh as buyer.
    const isReRegistration = userRow?.is_deleted === true
    let assignedRole = isReRegistration ? 'buyer' : (userRow?.role || preprovisioned?.role || 'buyer')

    // Upsert user account in Supabase user_accounts table.
    // Clears is_deleted/deleted_at so a re-registration after deletion produces a
    // genuinely fresh account as documented in the deletion flow.
    const { data: savedData, error: saveErr } = await supabaseServer
      .from('user_accounts')
      .upsert({
        phone: cleanedPhone,
        name: cleanedName,
        email: cleanedEmail,
        role: assignedRole,
        is_deleted: false,
        deleted_at: null,
        assigned_warehouse_id: preprovisioned?.assignedWarehouseId || (isReRegistration ? null : userRow?.assigned_warehouse_id) || (assignedRole === 'warehouse' ? 'wh-taloja' : null),
        updated_at: new Date().toISOString()
      }, { onConflict: 'phone' })
      .select('*')
      .single()

    if (saveErr) {
      console.error('Failed to complete signup in user_accounts:', saveErr)
    }

    const VALID_ROLES = ['super_admin', 'admin', 'warehouse', 'buyer']
    const rawRole = savedData?.role || assignedRole
    const finalRole = VALID_ROLES.includes(rawRole) ? rawRole : 'buyer'
    const finalName = savedData?.name || cleanedName
    const finalEmail = savedData?.email || cleanedEmail

    const token = issueSessionToken(cleanedPhone, finalRole)

    return NextResponse.json({
      success: true,
      token,
      user: {
        phone: cleanedPhone,
        name: finalName,
        email: finalEmail,
        role: finalRole,
        assignedWarehouseId: savedData?.assigned_warehouse_id || null
      }
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to complete registration' }, { status: 500 })
  }
}
