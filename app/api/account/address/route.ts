import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  getSession,
  unauthorized,
  badRequest,
  notFound,
  serverError,
  normalize,
  isValidPincode,
  cleanText
} from '@/lib/api-auth'

/**
 * Saved delivery addresses for the calling user.
 *
 * Every query is filtered by the phone from the verified session. Mutations match
 * on `id` AND `phone` together, so passing another user's address id cannot affect
 * their data — the update simply matches zero rows.
 */

export const dynamic = 'force-dynamic'

const MAX_ADDRESSES = 10

interface AddressInput {
  line1: string
  city: string
  pincode: string
  state: string
}

function parseAddress(body: any): AddressInput | string {
  const line1 = cleanText(body?.line1, 500)
  const city = cleanText(body?.city, 120)
  const pincode = cleanText(body?.pincode, 10)
  const state = cleanText(body?.state, 40) || 'AP'

  if (!line1) return 'House no., street and area are required.'
  if (!city) return 'City is required.'
  if (!isValidPincode(pincode)) return 'Enter a valid 6-digit pincode.'

  return { line1, city, pincode, state }
}

export async function GET(request: Request) {
  try {
    const session = getSession(request)
    if (!session) return unauthorized()

    const { data, error } = await supabaseAdmin
      .from('user_addresses')
      .select('*')
      .eq('phone', normalize(session.phone))
      .order('is_default', { ascending: false })

    if (error) {
      console.error('[address] read failed:', error.message)
      return serverError('Could not load your addresses.')
    }

    return NextResponse.json({
      success: true,
      addresses: (data || []).map((a: any) => ({
        id: a.id,
        line1: a.line1,
        city: a.city,
        pincode: a.pincode,
        state: a.state,
        isDefault: a.is_default
      }))
    })
  } catch (error) {
    console.error('[address] unexpected error:', error)
    return serverError('Could not load your addresses.')
  }
}

export async function POST(request: Request) {
  try {
    const session = getSession(request)
    if (!session) return unauthorized()

    const phone = normalize(session.phone)
    const parsed = parseAddress(await request.json().catch(() => ({})))
    if (typeof parsed === 'string') return badRequest(parsed)

    const { data: existing } = await supabaseAdmin
      .from('user_addresses')
      .select('id')
      .eq('phone', phone)

    if ((existing?.length || 0) >= MAX_ADDRESSES) {
      return badRequest(`You can save at most ${MAX_ADDRESSES} addresses.`)
    }

    // First address becomes the default automatically.
    const isFirst = (existing?.length || 0) === 0

    const { data, error } = await supabaseAdmin
      .from('user_addresses')
      .insert({ phone, ...parsed, is_default: isFirst })
      .select('id')
      .single()

    if (error) {
      console.error('[address] insert failed:', error.message)
      return serverError('Could not save the address.')
    }

    return NextResponse.json({ success: true, id: (data as any).id })
  } catch (error) {
    console.error('[address] unexpected error:', error)
    return serverError('Could not save the address.')
  }
}

export async function PATCH(request: Request) {
  try {
    const session = getSession(request)
    if (!session) return unauthorized()

    const phone = normalize(session.phone)
    const body = await request.json().catch(() => ({}))
    const id = cleanText(body?.id, 64)
    if (!id) return badRequest('Address id is required.')

    // Setting a default is a distinct operation from editing the fields.
    if (body?.setDefault === true) {
      // Clear the existing default first: a partial unique index permits only one.
      const { error: clearError } = await supabaseAdmin
        .from('user_addresses')
        .update({ is_default: false })
        .eq('phone', phone)
        .eq('is_default', true)

      if (clearError) {
        console.error('[address] clearing default failed:', clearError.message)
        return serverError('Could not update the address.')
      }

      const { data, error } = await supabaseAdmin
        .from('user_addresses')
        .update({ is_default: true, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('phone', phone) // ownership enforced in the predicate
        .select('id')

      if (error) {
        console.error('[address] set default failed:', error.message)
        return serverError('Could not update the address.')
      }
      if (!data || data.length === 0) return notFound('Address not found.')

      return NextResponse.json({ success: true })
    }

    const parsed = parseAddress(body)
    if (typeof parsed === 'string') return badRequest(parsed)

    const { data, error } = await supabaseAdmin
      .from('user_addresses')
      .update({ ...parsed, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('phone', phone)
      .select('id')

    if (error) {
      console.error('[address] update failed:', error.message)
      return serverError('Could not update the address.')
    }
    if (!data || data.length === 0) return notFound('Address not found.')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[address] unexpected error:', error)
    return serverError('Could not update the address.')
  }
}

export async function DELETE(request: Request) {
  try {
    const session = getSession(request)
    if (!session) return unauthorized()

    const phone = normalize(session.phone)
    const id = cleanText(new URL(request.url).searchParams.get('id'), 64)
    if (!id) return badRequest('Address id is required.')

    const { data, error } = await supabaseAdmin
      .from('user_addresses')
      .delete()
      .eq('id', id)
      .eq('phone', phone)
      .select('id, is_default')

    if (error) {
      console.error('[address] delete failed:', error.message)
      return serverError('Could not delete the address.')
    }
    if (!data || data.length === 0) return notFound('Address not found.')

    // If the default was removed, promote another address so the user still has one.
    if ((data[0] as any).is_default) {
      const { data: remaining } = await supabaseAdmin
        .from('user_addresses')
        .select('id')
        .eq('phone', phone)
        .limit(1)

      if (remaining && remaining.length > 0) {
        await supabaseAdmin
          .from('user_addresses')
          .update({ is_default: true })
          .eq('id', (remaining[0] as any).id)
          .eq('phone', phone)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[address] unexpected error:', error)
    return serverError('Could not delete the address.')
  }
}
