import { NextResponse } from 'next/server'
import { verifySessionToken } from '@/lib/session'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    const session = verifySessionToken(request)
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Invalid or missing session token.' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { name, email } = body

    const updates: any = {}
    if (name !== undefined && String(name).trim() !== '') updates.name = String(name).trim()
    if (email !== undefined) updates.email = email && String(email).trim() ? String(email).trim() : null

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: 'No profile updates provided.' }, { status: 400 })
    }

    const { data, error } = await supabaseServer
      .from('user_accounts')
      .update(updates)
      .eq('phone', session.phone)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, user: data })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to update profile' }, { status: 500 })
  }
}
