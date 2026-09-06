import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  getSession,
  unauthorized,
  badRequest,
  serverError,
  normalize,
  isValidPincode,
  cleanText
} from '@/lib/api-auth'

/**
 * Orders API.
 *
 * Replaces the previous model where the browser wrote to and read from the orders
 * table directly with the publishable key. Under that model every customer's name,
 * phone and delivery address was readable by anyone, and any caller could write
 * arbitrary orders.
 *
 * Access rules:
 *   * buyer            -> only their own orders
 *   * warehouse/admin  -> all orders (they fulfil them)
 * The identity always comes from the verified session, never from the request.
 */

export const dynamic = 'force-dynamic'

const MAX_ITEMS_PER_ORDER = 100

function canSeeAllOrders(role: string): boolean {
  return role === 'warehouse' || role === 'admin' || role === 'super_admin'
}

export async function GET(request: Request) {
  try {
    const session = getSession(request)
    if (!session) return unauthorized()

    let query = supabaseAdmin.from('orders').select('*')

    // IDOR guard: a buyer's query is constrained to their own phone server-side.
    // Doing this here rather than trusting a client-supplied filter is the whole point.
    if (!canSeeAllOrders(session.role)) {
      query = query.eq('phone', normalize(session.phone))
    }

    const { data, error } = await query
    if (error) {
      console.error('[orders] read failed:', error.message)
      return serverError('Could not load orders.')
    }

    return NextResponse.json({ success: true, orders: data || [] })
  } catch (error) {
    console.error('[orders] unexpected error:', error)
    return serverError('Could not load orders.')
  }
}

const VALID_STATUSES = ['placed', 'accepted', 'dispatched', 'delivered', 'cancelled']

const STATUS_LABELS: Record<string, string> = {
  placed: 'Order Placed',
  accepted: 'Accepted by Warehouse',
  dispatched: 'Dispatched from Warehouse',
  delivered: 'Delivered',
  cancelled: 'Cancelled'
}

/**
 * Order status updates (accept / dispatch / deliver / cancel).
 *
 * Only warehouse/admin/super_admin may move an order forward — a buyer has no
 * legitimate reason to change their own order's status, and orders now has
 * `force row level security` with no anon policy at all, so this was the one
 * write path still going straight to Supabase with the browser's anon key. It
 * would fail outright once RLS locked down, which is exactly what happened.
 */
export async function PATCH(request: Request) {
  try {
    const session = getSession(request)
    if (!session) return unauthorized()

    const body = await request.json().catch(() => ({}))
    const orderId = cleanText(body?.orderId, 64)
    const status = cleanText(body?.status, 20)
    const note = body?.note ? cleanText(body.note, 300) : undefined

    if (!orderId) return badRequest('orderId is required.')
    if (!VALID_STATUSES.includes(status)) {
      return badRequest(`status must be one of: ${VALID_STATUSES.join(', ')}`)
    }

    // Buyers may only cancel their own orders (not advance them through the pipeline).
    // Warehouse/admin/super_admin may set any status on any order.
    const isBuyer = !canSeeAllOrders(session.role)

    if (isBuyer && status !== 'cancelled') {
      return NextResponse.json(
        { success: false, error: 'You can only cancel your own orders.' },
        { status: 403 }
      )
    }

    const { data: existing, error: readError } = await supabaseAdmin
      .from('orders')
      .select('timeline, phone')
      .eq('id', orderId)
      .maybeSingle()

    if (readError) {
      console.error('[orders] status read failed:', readError.message)
      return serverError('Could not update the order.')
    }
    if (!existing) return badRequest('Order not found.')

    // Buyers: verify they own the order (IDOR guard — same pattern as GET)
    if (isBuyer && normalize((existing as any).phone) !== normalize(session.phone)) {
      return NextResponse.json(
        { success: false, error: 'You can only cancel your own orders.' },
        { status: 403 }
      )
    }

    const newTimeline = [
      ...(Array.isArray((existing as any).timeline) ? (existing as any).timeline : []),
      {
        stage: status,
        label: STATUS_LABELS[status] || `Order ${status}`,
        timestamp: new Date().toLocaleString(),
        note
      }
    ]

    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ status, timeline: newTimeline })
      .eq('id', orderId)

    if (updateError) {
      console.error('[orders] status update failed:', updateError.message)
      return serverError('Could not update the order.')
    }

    return NextResponse.json({ success: true, status, timeline: newTimeline })
  } catch (error) {
    console.error('[orders] unexpected error:', error)
    return serverError('Could not update the order.')
  }
}

export async function POST(request: Request) {
  try {
    const session = getSession(request)
    if (!session) return unauthorized()

    const body = await request.json().catch(() => ({}))

    const items = Array.isArray(body?.items) ? body.items : []
    if (items.length === 0) return badRequest('An order must contain at least one item.')
    if (items.length > MAX_ITEMS_PER_ORDER) return badRequest('Too many items in one order.')

    const address = cleanText(body?.address, 500)
    const city = cleanText(body?.city, 120)
    const pincode = cleanText(body?.pincode, 10)

    // Server-side validation. The client checks these too, but a client check is a
    // convenience, not a control.
    if (!address) return badRequest('Delivery address is required.')
    if (!city) return badRequest('City is required.')
    if (!isValidPincode(pincode)) return badRequest('Enter a valid 6-digit pincode.')

    // Price is recalculated from the catalog rather than trusted from the client,
    // so a tampered request cannot set its own totals.
    const productIds = items.map((i: any) => String(i?.productId || '')).filter(Boolean)
    const { data: products, error: productError } = await supabaseAdmin
      .from('products')
      .select('id, name, price, image, main_category, moq')
      .in('id', productIds)

    if (productError) {
      console.error('[orders] product lookup failed:', productError.message)
      return serverError('Could not create the order.')
    }

    const { data: activeOffers } = await supabaseAdmin
      .from('offers')
      .select('discount_percentage, product_ids')
      .eq('active', true)

    const priceFor = (productId: string, listPrice: number): number => {
      const offer = (activeOffers || []).find((o: any) =>
        Array.isArray(o.product_ids) ? o.product_ids.includes(productId) : false
      )
      if (!offer) return listPrice
      const pct = Number(offer.discount_percentage || 0)
      return Math.round(listPrice * (1 - pct / 100))
    }

    const resolvedItems: any[] = []
    for (const item of items) {
      const product = (products || []).find((p: any) => p.id === item?.productId)
      if (!product) return badRequest(`Unknown product in order: ${String(item?.productId)}`)

      const qty = Math.floor(Number(item?.qty ?? 0))
      if (!Number.isFinite(qty) || qty < 1) return badRequest(`Invalid quantity for ${product.name}.`)

      // MVP V1: minimum order quantity is 1 unit for every product (no bulk MOQ).

      resolvedItems.push({
        productId: product.id,
        name: product.name,
        qty,
        price: priceFor(product.id, Number(product.price || 0)),
        image: product.image
      })
    }

    const total = resolvedItems.reduce((sum, i) => sum + i.price * i.qty, 0)

    const orderId = `ORD-${Date.now().toString().slice(-6)}`
    const nowIso = new Date().toISOString()

    // Look up the buyer's stored name; do not accept it from the request.
    const { data: account } = await supabaseAdmin
      .from('user_accounts')
      .select('*')
      .eq('phone', normalize(session.phone))
      .maybeSingle()

    const { error: insertError } = await supabaseAdmin.from('orders').insert({
      id: orderId,
      date: nowIso.slice(0, 10),
      buyer_id: `user-${normalize(session.phone)}`,
      buyer_name: (account as any)?.name || 'Buyer',
      buyer_email: (account as any)?.email || null,
      phone: normalize(session.phone),
      address,
      city,
      state: cleanText(body?.state, 40) || 'AP',
      pincode,
      warehouse_id: cleanText(body?.warehouseId, 60) || 'wh-taloja',
      items: resolvedItems,
      subtotal: total,
      total,
      payment_method: cleanText(body?.paymentMethod, 60) || 'Advance UPI/QR',
      status: 'placed',
      timeline: [{ stage: 'placed', label: 'Order Placed', timestamp: new Date().toLocaleString() }]
    })

    if (insertError) {
      console.error('[orders] insert failed:', insertError.message)
      return serverError('Could not create the order.')
    }

    // First order doubles as address capture: save it as the default if the user has
    // none yet, so future checkouts are pre-filled instead of asking again.
    const { data: existingAddresses } = await supabaseAdmin
      .from('user_addresses')
      .select('id')
      .eq('phone', normalize(session.phone))
      .limit(1)

    if (!existingAddresses || existingAddresses.length === 0) {
      const { error: addrError } = await supabaseAdmin.from('user_addresses').insert({
        phone: normalize(session.phone),
        line1: address,
        city,
        pincode,
        state: cleanText(body?.state, 40) || 'AP',
        is_default: true
      })
      if (addrError) {
        // Non-fatal: the order succeeded, which is what the user asked for.
        console.warn('[orders] could not save default address:', addrError.message)
      }
    }

    return NextResponse.json({ success: true, orderId, total })
  } catch (error) {
    console.error('[orders] unexpected error:', error)
    return serverError('Could not create the order.')
  }
}
