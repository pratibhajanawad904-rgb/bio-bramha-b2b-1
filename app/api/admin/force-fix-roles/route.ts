import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST() {
  try {
    console.log('🔧 Force fixing roles in database...')

    // Delete ALL existing records for these phones first
    await supabaseServer
      .from('user_accounts')
      .delete()
      .in('phone', ['8050946969', '7975158924'])

    // Insert correct roles
    const { data, error } = await supabaseServer
      .from('user_accounts')
      .insert([
        {
          phone: '8050946969',
          name: 'Super Admin',
          role: 'super_admin',
          assigned_warehouse_id: null
        },
        {
          phone: '7975158924',
          name: 'Warehouse Manager',
          role: 'warehouse',
          assigned_warehouse_id: 'wh-taloja'
        }
      ])
      .select()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 })
    }

    // Verify
    const { data: verified } = await supabaseServer
      .from('user_accounts')
      .select('phone, name, role, assigned_warehouse_id')
      .in('phone', ['8050946969', '7975158924'])

    return NextResponse.json({ 
      success: true, 
      message: 'Roles fixed in database',
      accounts: verified,
      instructions: [
        '1. Clear localStorage in both browsers',
        '2. Logout from both accounts',
        '3. Login again',
        '4. Roles should now be correct'
      ]
    })
  } catch (error: any) {
    console.error('Force fix error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}
