import { NextResponse } from 'next/server'
import { verifySessionToken } from '@/lib/session'
import { supabaseServer } from '@/lib/supabase-server'
import { getServerUserAccounts } from '@/lib/server-store'

export async function GET(request: Request) {
  try {
    const session = verifySessionToken(request)
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Invalid or missing session token.' }, { status: 401 })
    }

    if (session.role !== 'admin' && session.role !== 'super_admin') {
      return NextResponse.json({ success: false, error: 'Forbidden. Admin privileges required.' }, { status: 403 })
    }

    let accounts: any[] = []

    try {
      const { data, error } = await supabaseServer
        .from('user_accounts')
        .select('*')
        .neq('role', 'buyer')
        .order('created_at', { ascending: false })

      if (!error && Array.isArray(data)) {
        accounts = data
      }
    } catch (e) {}

    // Merge with global server-side role store to guarantee 100% sync across all browsers & devices
    const serverAccounts = getServerUserAccounts()
    const mergedMap = new Map<string, any>()

    serverAccounts.forEach(acc => {
      mergedMap.set(acc.phone, {
        phone: acc.phone,
        name: acc.name,
        role: acc.role,
        assigned_warehouse_id: acc.warehouseId || null
      })
    })

    accounts.forEach(acc => {
      mergedMap.set(acc.phone, acc)
    })

    return NextResponse.json({ success: true, accounts: Array.from(mergedMap.values()) })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch user accounts' }, { status: 500 })
  }
}
