import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { phone } = body

    if (!phone) {
      return NextResponse.json({ success: false, error: 'Phone number required' }, { status: 400 })
    }

    const cleanPhone = String(phone).replace(/\D/g, '').slice(-10)

    // Define correct roles
    const CORRECT_ROLES: Record<string, { role: string; name: string; warehouse?: string }> = {
      '8050946969': { role: 'super_admin', name: 'Super Admin' },
      '7975158924': { role: 'warehouse', name: 'Warehouse Manager', warehouse: 'wh-taloja' }
    }

    const correct = CORRECT_ROLES[cleanPhone]
    if (!correct) {
      return NextResponse.json({ 
        success: false, 
        error: 'This phone number is not in the pre-provisioned list' 
      }, { status: 400 })
    }

    // Force update in database
    const { data, error } = await supabaseServer
      .from('user_accounts')
      .upsert({
        phone: cleanPhone,
        name: correct.name,
        role: correct.role,
        assigned_warehouse_id: correct.warehouse || null
      }, { 
        onConflict: 'phone',
        ignoreDuplicates: false 
      })
      .select()

    if (error) {
      console.error('Database update error:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 })
    }

    // Verify the update
    const { data: verified } = await supabaseServer
      .from('user_accounts')
      .select('phone, name, role, assigned_warehouse_id')
      .eq('phone', cleanPhone)
      .single()

    return NextResponse.json({ 
      success: true, 
      message: `Role fixed in database. Logout and login again.`,
      before: { phone: cleanPhone },
      after: verified,
      instructions: [
        '1. Click "Logout & Switch Account"',
        '2. Login again with your phone number',
        '3. Enter OTP',
        `4. You should now see: ${correct.role.toUpperCase()}`
      ]
    })
  } catch (error: any) {
    console.error('Fix role error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}
