'use client'

import React, { useState } from 'react'
import { useApp } from '@/lib/app-context'
import { getSupportPhone, telHref } from '@/lib/data'
import {
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  X,
  Phone,
  Mail,
  PhoneCall,
  Headphones,
  RotateCcw,
  AlertCircle,
  Loader2
} from 'lucide-react'

type ReorderResult = { tone: 'success' | 'warn' | 'error'; text: string }

export const BuyerOrdersView: React.FC<{ onOpenCart?: () => void }> = ({ onOpenCart }) => {
  const { orders, currentUser, helplineNumber, helplineEmail, updateOrderStatus, addToCart, products, refreshCatalog } = useApp()
  const [reorderMsg, setReorderMsg] = useState<ReorderResult | null>(null)
  const [reorderingId, setReorderingId] = useState<string | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [selectedDetailOrderId, setSelectedDetailOrderId] = useState<string | null>(null)
  const [activeBuyerSubTab, setActiveBuyerSubTab] = useState<'orders' | 'support'>('orders')

  const supportPhone = getSupportPhone(helplineNumber)

  // Server already scopes orders to the signed-in dealer; this is a defensive client filter.
  const myOrders = orders.filter((o) => o.buyerId === currentUser.id)

  const showReorderMsg = (msg: ReorderResult, ms = 3500) => {
    setReorderMsg(msg)
    setTimeout(() => setReorderMsg(null), ms)
  }

  // Reorder: re-check availability + stock against the CURRENT catalog, add to cart at
  // current price (cart always prices from live catalog), never auto-place the order.
  const handleReorder = (order: { id: string; items: { productId: string; name: string; qty: number }[] }) => {
    setReorderingId(order.id)
    // Catalog is re-synced every 15s; kick a background refresh so the next action is fresher too.
    refreshCatalog().catch(() => {})

    const added: string[] = []
    const unavailable: string[] = []
    const capped: string[] = []

    for (const it of order.items || []) {
      const product = products.find((p) => p.id === it.productId)
      if (!product || product.stock <= 0) {
        unavailable.push(it.name || 'Unknown product')
        continue
      }
      const wanted = Math.max(1, it.qty || 1)
      const qty = Math.min(wanted, product.stock)
      if (qty < wanted) capped.push(`${product.name} (only ${product.stock} in stock)`)
      addToCart(product.id, qty)
      added.push(product.name)
    }

    setReorderingId(null)

    if (added.length === 0) {
      showReorderMsg({ tone: 'error', text: `Unavailable right now: ${unavailable.join(', ')}. Nothing was added to your cart.` }, 5000)
      return
    }

    const notes: string[] = []
    if (unavailable.length) notes.push(`Unavailable (not added): ${unavailable.join(', ')}`)
    if (capped.length) notes.push(`Quantity reduced: ${capped.join(', ')}`)

    showReorderMsg(
      {
        tone: notes.length ? 'warn' : 'success',
        text: `${added.length} item${added.length > 1 ? 's' : ''} added to your cart at current prices.${notes.length ? ' ' + notes.join('. ') : ''}`
      },
      notes.length ? 6000 : 2500
    )
    if (onOpenCart) onOpenCart()
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'placed':
        return (
          <span className="bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-700" />
            Placed (Awaiting Acceptance)
          </span>
        )
      case 'accepted':
        return (
          <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Accepted by Warehouse
          </span>
        )
      case 'dispatched':
        return (
          <span className="bg-blue-100 text-blue-900 border border-blue-300 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-blue-600" />
            Dispatched
          </span>
        )
      case 'delivered':
        return (
          <span className="bg-emerald-800 text-white border border-emerald-900 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
            Delivered
          </span>
        )
      case 'cancelled':
        return (
          <span className="bg-rose-100 text-rose-800 border border-rose-300 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Cancelled
          </span>
        )
      default:
        return (
          <span className="bg-slate-100 text-slate-700 border border-slate-300 px-3 py-1 rounded-full text-xs font-bold uppercase">
            {status}
          </span>
        )
    }
  }

  const selectedOrder = orders.find((o) => o.id === selectedDetailOrderId)

  const SupportLinks: React.FC<{ compact?: boolean }> = ({ compact }) => (
    <>
      {supportPhone && (
        <a
          href={telHref(supportPhone)}
          data-testid="support-call-link"
          className={`${compact ? 'py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700' : 'py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white'} min-h-[40px] font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer`}
        >
          <PhoneCall className={`w-4 h-4 ${compact ? 'text-emerald-600' : ''}`} />
          <span>{compact ? 'Helpline' : 'Call Support'}</span>
        </a>
      )}
      {!compact && (
        <a
          href={`mailto:${helplineEmail}`}
          data-testid="support-email-link"
          className="min-h-[40px] py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-200"
        >
          <Mail className="w-4 h-4 text-emerald-600" />
          <span>Email Support</span>
        </a>
      )}
    </>
  )

  return (
    <div className="space-y-6 pb-12" data-testid="buyer-orders-view">
      {reorderMsg && (
        <div
          className={`fixed bottom-24 md:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-[120] text-white px-4 py-3 rounded-xl shadow-2xl flex items-start gap-2 border ${
            reorderMsg.tone === 'success'
              ? 'bg-emerald-900 border-emerald-700'
              : reorderMsg.tone === 'warn'
              ? 'bg-amber-700 border-amber-500'
              : 'bg-rose-800 border-rose-600'
          }`}
          data-testid="reorder-toast"
        >
          {reorderMsg.tone === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-300" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span className="text-sm font-semibold break-words">{reorderMsg.text}</span>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-xs flex items-center gap-2">
        <button
          onClick={() => setActiveBuyerSubTab('orders')}
          data-testid="orders-subtab"
          className={`flex-1 min-h-[44px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeBuyerSubTab === 'orders' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Package className="w-4 h-4 shrink-0" />
          <span className="truncate">My Orders ({myOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveBuyerSubTab('support')}
          data-testid="support-subtab"
          className={`flex-1 min-h-[44px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeBuyerSubTab === 'support' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Headphones className={`w-4 h-4 shrink-0 ${activeBuyerSubTab === 'support' ? '' : 'text-emerald-500'}`} />
          <span className="truncate">Support</span>
        </button>
      </div>

      {activeBuyerSubTab === 'orders' && (
        <>
          {myOrders.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-slate-200 shadow-sm space-y-4" data-testid="no-orders">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <Package className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">No Orders Placed Yet</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
                  Browse the catalogue, add products to your cart, and place your first order. Minimum order is just 1 unit.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {myOrders.map((order) => {
                const firstItem = order.items && order.items.length > 0 ? order.items[0] : null
                const extraItemsCount = order.items && order.items.length > 1 ? order.items.length - 1 : 0

                return (
                  <div
                    key={order.id}
                    data-testid={`order-card-${order.id}`}
                    className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono font-black text-slate-900 text-sm">{order.id}</span>
                        <span className="text-xs text-slate-400 font-medium">({order.date})</span>
                      </div>
                      {getStatusBadge(order.status)}
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        {firstItem?.image ? (
                          <img
                            src={firstItem.image}
                            alt={firstItem.name}
                            className="w-12 h-12 object-contain bg-slate-50 rounded-xl p-1 border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100 font-black text-xs">
                            BIO
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 text-sm truncate">{firstItem?.name || 'Bio-Fertilizer Item'}</h4>
                          <p className="text-xs text-slate-500 font-medium">
                            Qty: {firstItem?.qty || 1}
                            {extraItemsCount > 0 && <span className="text-emerald-700 font-bold"> (+{extraItemsCount} more)</span>}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs text-slate-400 block font-medium">Total</span>
                        <span className="text-lg font-black text-slate-900">₹{order.total.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => setSelectedDetailOrderId(order.id)}
                        data-testid={`view-order-${order.id}`}
                        className="min-h-[40px] py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>View Details</span>
                      </button>

                      <button
                        onClick={() => handleReorder(order)}
                        disabled={reorderingId === order.id}
                        data-testid={`reorder-btn-${order.id}`}
                        className="min-h-[40px] py-2 px-3.5 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-60 text-emerald-800 font-bold text-xs rounded-xl border-2 border-emerald-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        {reorderingId === order.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                        <span>Reorder</span>
                      </button>

                      {(order.status === 'placed' || order.status === 'accepted') && (
                        <button
                          onClick={async () => {
                            if (!confirm('Cancel this order?')) return
                            setCancellingId(order.id)
                            try {
                              await updateOrderStatus(order.id, 'cancelled', 'Cancelled by buyer')
                            } catch {}
                            setCancellingId(null)
                          }}
                          disabled={cancellingId === order.id}
                          data-testid={`cancel-order-${order.id}`}
                          className="min-h-[40px] py-2 px-3 bg-rose-50 hover:bg-rose-100 disabled:opacity-60 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>Cancel</span>
                        </button>
                      )}

                      <div className="ml-auto flex items-center gap-2">
                        <SupportLinks compact />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {activeBuyerSubTab === 'support' && (
        <div className="bg-white rounded-3xl p-5 sm:p-8 border border-slate-200 shadow-md space-y-6" data-testid="support-panel">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <Headphones className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 text-lg sm:text-xl">Customer Support</h3>
              <p className="text-xs text-slate-500">Reach our support team for order tracking, delivery updates, or billing help.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="bg-slate-900 text-white p-5 sm:p-6 rounded-2xl space-y-4 border border-slate-800 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                  <Phone className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">Phone Support</span>
                  {supportPhone ? (
                    <h4 className="text-lg sm:text-xl font-black text-emerald-400 font-mono mt-0.5 break-all" data-testid="support-phone-number">{supportPhone}</h4>
                  ) : (
                    <h4 className="text-sm font-bold text-slate-300 mt-0.5" data-testid="support-phone-unavailable">Phone support number not yet published</h4>
                  )}
                </div>
              </div>
              {supportPhone ? (
                <a
                  href={telHref(supportPhone)}
                  data-testid="support-call-now-btn"
                  className="w-full min-h-[48px] py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>Tap to Call Support</span>
                </a>
              ) : (
                <p className="text-xs text-slate-400">Please use email support below. A phone helpline will appear here once it is configured.</p>
              )}
            </div>

            <div className="bg-emerald-950 text-white p-5 sm:p-6 rounded-2xl space-y-4 border border-emerald-900 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/15 text-emerald-300 flex items-center justify-center shrink-0 border border-white/20">
                  <Mail className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] text-emerald-300/80 font-bold uppercase tracking-wider block">Email Support</span>
                  <h4 className="text-base sm:text-lg font-black text-white font-mono mt-0.5 break-all" data-testid="support-email">{helplineEmail}</h4>
                </div>
              </div>
              <a
                href={`mailto:${helplineEmail}`}
                data-testid="support-email-btn"
                className="w-full min-h-[48px] py-3 bg-white hover:bg-emerald-50 text-emerald-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4 text-emerald-900" />
                <span>Send Email</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[88vh] overflow-y-auto p-5 sm:p-6 shadow-2xl space-y-5 relative border border-slate-200 animate-scale-up my-auto" data-testid="order-detail-modal">
            <button
              onClick={() => setSelectedDetailOrderId(null)}
              data-testid="order-detail-close"
              className="absolute top-4 right-4 w-10 h-10 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors z-10 cursor-pointer"
              aria-label="Close order details"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pr-10">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Package className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-mono font-black text-slate-900 text-lg sm:text-xl">{selectedOrder.id}</h3>
                  {getStatusBadge(selectedOrder.status)}
                </div>
                <p className="text-xs text-slate-500 font-medium">Placed on: {selectedOrder.date}</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Order Timeline</h4>
              <div className="relative pl-6 space-y-3.5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {(selectedOrder.timeline || []).map((evt, idx) => (
                  <div key={idx} className="relative flex items-start justify-between gap-2 text-xs">
                    <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center ring-4 ring-slate-50 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-slate-900 block">{evt.label}</span>
                      {evt.note && <span className="text-slate-500 block mt-0.5 break-words">{evt.note}</span>}
                    </div>
                    <span className="text-slate-400 font-mono text-[11px] shrink-0">{evt.timestamp}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Items</h4>
              <div className="space-y-2">
                {(selectedOrder.items || []).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {item.image && <img src={item.image} alt={item.name} className="w-9 h-9 object-contain bg-white rounded-lg p-0.5 border border-slate-200 shrink-0" />}
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 block truncate">{item.name}</span>
                        <span className="text-slate-500">₹{item.price} / unit × {item.qty}</span>
                      </div>
                    </div>
                    <span className="font-extrabold text-slate-900 shrink-0">₹{(item.qty * item.price).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-emerald-50/40 p-4 rounded-2xl border border-emerald-100 space-y-3 text-xs">
              <div className="flex items-center justify-between gap-2 border-b border-emerald-100 pb-2">
                <span className="text-slate-500 font-semibold">Payment Terms</span>
                <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-right">{selectedOrder.paymentMethod}</span>
              </div>
              <div className="flex items-center justify-between gap-2 border-b border-emerald-100 pb-2">
                <span className="text-slate-500 font-semibold">Dispatch Warehouse</span>
                <span className="font-bold text-slate-900 text-right">Taloja, Mumbai, Maharashtra</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block mb-1">Delivery Address</span>
                <p className="font-semibold text-slate-900 break-words">{selectedOrder.address}, {selectedOrder.city} - {selectedOrder.pincode}</p>
                <p className="text-slate-500 mt-0.5">Contact: {selectedOrder.phone}</p>
              </div>
              <div className="pt-2 border-t border-emerald-200/80 flex justify-between items-center text-sm font-black">
                <span>Total Payable</span>
                <span className="text-emerald-700 text-base">₹{selectedOrder.total.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-end gap-2">
              <button
                onClick={() => { setSelectedDetailOrderId(null); handleReorder(selectedOrder) }}
                data-testid="order-detail-reorder-btn"
                className="min-h-[40px] py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border-2 border-emerald-300 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reorder</span>
              </button>
              <SupportLinks />
              <button
                onClick={() => setSelectedDetailOrderId(null)}
                className="min-h-[40px] py-2.5 px-5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
