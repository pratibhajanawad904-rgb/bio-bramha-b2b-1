import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { phone } = body

    // This endpoint just confirms the backend role
    // The actual cache clearing happens on the client side
    
    const ROLES: Record<string, string> = {
      '8050946969': 'super_admin',
      '7975158924': 'warehouse'
    }

    const role = ROLES[phone] || 'buyer'

    return NextResponse.json({
      success: true,
      message: 'Backend role confirmed. Please clear localStorage on client.',
      backendRole: role,
      phone: phone,
      instructions: [
        'Open browser console (F12)',
        'Run: localStorage.clear()',
        'Run: location.reload()',
        'Login again with OTP'
      ]
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
