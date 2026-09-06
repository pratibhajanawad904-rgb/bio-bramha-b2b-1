'use client'

import React, { useState } from 'react'
import { useApp } from '@/lib/app-context'
import {
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  MapPin,
  Building,
  PhoneCall,
  X,
  Phone,
  Mail,
  HelpCircle,
  Headphones,
  RotateCcw
} from 'lucide-react'

export const BuyerOrdersView: React.FC<{ onOpenCart?: () => void }> = ({ onOpenCart }) => {
  const { orders, currentUser, helplineNumber, helplineEmail, updateOrderStatus, addToCart, clearCart, products } = useApp()
  const [reorderMsg, setReorderMsg] = useState<string | null>(null)

  const handleReorder = (order: any) => {
    const available = (order.items || []).filter((it: any) => products.some((p) => p.id === it.productId))
    if (available.length === 0) {
      setReorderMsg('These products are no longer available in the catalogue.')
      setTimeout(() => setReorderMsg(null), 2500)
      return
    }
    clearCart()
    available.forEach((it: any) => addToCart(it.productId, it.qty || 1))
    setReorderMsg('Items added to your cart!')
    setTimeout(() => setReorderMsg(null), 2000)
    if (onOpenCart) onOpenCart()
  }

  // Order Detail Modal State
  const [selectedDetailOrderId, setSelectedDetailOrderId] = useState<string | null>(null)

  // Filter orders placed by this buyer (or Ramesh for demo)
  const myOrders = orders.filter(
    (o) => o.buyerId === currentUser.id || (o.buyerName && o.buyerName.toLowerCase().includes('ramesh')) || o.buyerEmail === currentUser.email
  )

  const [activeBuyerSubTab, setActiveBuyerSubTab] = useState<'orders' | 'support'>('orders')

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'placed':
        return (
          <span className="bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 animate-pulse">
            <Clock className="w-3.5 h-3.5 text-amber-700" />
            Placed (Waiting for Warehouse Acceptance)
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
            Dispatched in Transit
          </span>
        )
      case 'delivered':
        return (
          <span className="bg-emerald-800 text-white border border-emerald-900 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
            Delivered & Verified
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

  return (
    <div className="space-y-6 pb-12">
      {reorderMsg && (
        <div className="fixed bottom-24 md:bottom-6 right-4 sm:right-6 z-[60] bg-emerald-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-emerald-700" data-testid="reorder-toast">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-semibold">{reorderMsg}</span>
        </div>
      )}
      {/* Top Navigation Sub-Tabs */}
      <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-xs flex items-center gap-2">
        <button
          onClick={() => setActiveBuyerSubTab('orders')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeBuyerSubTab === 'orders'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>My Placed Orders ({myOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveBuyerSubTab('support')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeBuyerSubTab === 'support'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Headphones className="w-4 h-4 text-emerald-500" />
          <span>Helpline & Support Contact</span>
        </button>
      </div>

      {/* TAB 1: MY ORDERS LIST */}
      {activeBuyerSubTab === 'orders' && (
        <>
          {myOrders.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <Package className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">No Orders Placed Yet</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
                  Browse our bio-fertilizer catalogue, add products to your cart, and place orders directly with fast warehouse dispatch.
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
                    className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-3"
                  >
                    {/* Compact Top Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-slate-900 text-sm">{order.id}</span>
                        <span className="text-xs text-slate-400 font-medium">({order.date})</span>
                      </div>
                      {getStatusBadge(order.status)}
                    </div>

                    {/* Compact Product Summary */}
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
                          <h4 className="font-bold text-slate-900 text-sm truncate">
                            {firstItem?.name || 'Bio-Fertilizer Item'}
                          </h4>
                          <p className="text-xs text-slate-500 font-medium">
                            Qty: {firstItem?.qty || 1} {extraItemsCount > 0 && <span className="text-emerald-700 font-bold">(+{extraItemsCount} more items)</span>}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs text-slate-400 block font-medium">Total Price</span>
                        <span className="text-lg font-black text-slate-900">₹{order.total}</span>
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => setSelectedDetailOrderId(order.id)}
                        className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>View Details →</span>
                      </button>

                        <button
                          onClick={() => handleReorder(order)}
                          data-testid={`reorder-btn-${order.id}`}
                          className="py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reorder</span>
                        </button>

                        {(order.status === 'placed' || order.status === 'accepted') && (
                          <button
                            onClick={async () => {
                              if (confirm('Are you sure you want to cancel this order?')) {
                                try {
                                  await updateOrderStatus(order.id, 'cancelled', 'Cancelled by buyer')
                                } catch {}
                              }
                            }}
                            className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>Cancel</span>
                          </button>
                        )}

                      <a
                        href={`tel:${helplineNumber.split('/')[0].trim()}`}
                        className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer ml-auto"
                      >
                        <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Helpline</span>
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* TAB 2: HELPLINE & SUPPORT CONTACT */}
      {activeBuyerSubTab === 'support' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                <PhoneCall className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-xl">Customer Care Helpline & Contact Support</h3>
                <p className="text-xs text-slate-500">Reach out directly to our dedicated support team and warehouse managers for any assistance.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Phone Support Card */}
            <div className="bg-slate-900 text-white p-6 rounded-2xl space-y-4 border border-slate-800 shadow-md relative overflow-hidden">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">Toll-Free & Direct Phone Support</span>
                  <h4 className="text-xl font-black text-emerald-400 font-mono mt-0.5">{helplineNumber}</h4>
                </div>
              </div>
              <p className="text-xs text-slate-300">
                Call our support team directly for order tracking, delivery status updates, product usage guidance, or billing inquiries.
              </p>
              <a
                href={`tel:${helplineNumber.split('/')[0].trim()}`}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Call Phone Support Now</span>
              </a>
            </div>

            {/* Email Support Card */}
            <div className="bg-emerald-950 text-white p-6 rounded-2xl space-y-4 border border-emerald-900 shadow-md relative overflow-hidden">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/15 text-emerald-300 flex items-center justify-center shrink-0 border border-white/20">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] text-emerald-300/80 font-bold uppercase tracking-wider block">Official Customer Support Email</span>
                  <h4 className="text-lg font-black text-white font-mono mt-0.5">{helplineEmail}</h4>
                </div>
              </div>
              <p className="text-xs text-emerald-100/90">
                Send an email with your Order ID, questions, or feedback. Our support desk responds to all emails within 24 hours.
              </p>
              <a
                href={`mailto:${helplineEmail}`}
                className="w-full py-3 bg-white hover:bg-emerald-50 text-emerald-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4 text-emerald-900" />
                <span>Send Support Email</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* FULL ORDER DETAILS MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[88vh] overflow-y-auto p-5 sm:p-6 shadow-2xl space-y-5 relative border border-slate-200 animate-scale-up my-auto">
            <button
              onClick={() => setSelectedDetailOrderId(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors z-10"
              title="Close Order Details"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Title */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-mono font-black text-slate-900 text-xl">{selectedOrder.id}</h3>
                  {getStatusBadge(selectedOrder.status)}
                </div>
                <p className="text-xs text-slate-500 font-medium">Placed on: {selectedOrder.date}</p>
              </div>
            </div>

            {/* Live Progress Timeline */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Live Order Status Timeline</h4>
              <div className="relative pl-6 space-y-3.5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {selectedOrder.timeline.map((evt, idx) => (
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

            {/* Items List Breakdown */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ordered Bio-Products</h4>
              <div className="space-y-2">
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {item.image && <img src={item.image} alt={item.name} className="w-9 h-9 object-contain bg-white rounded-lg p-0.5 border border-slate-200 shrink-0" />}
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 block truncate">{item.name}</span>
                        <span className="text-slate-500">Qty: {item.qty} x ₹{item.price}</span>
                      </div>
                    </div>
                    <span className="font-extrabold text-slate-900 shrink-0">₹{item.qty * item.price}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment & Destination Details */}
            <div className="bg-emerald-50/40 p-4 rounded-2xl border border-emerald-100 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                <span className="text-slate-500 font-semibold">Payment Terms</span>
                <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">{selectedOrder.paymentMethod}</span>
              </div>
              <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                <span className="text-slate-500 font-semibold">Assigned Warehouse</span>
                <span className="font-bold text-slate-900">{selectedOrder.warehouseName}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block mb-1">Delivery Destination Address</span>
                <p className="font-semibold text-slate-900">{selectedOrder.address}, {selectedOrder.city} - {selectedOrder.pincode}</p>
                <p className="text-slate-500 mt-0.5">Contact Phone: {selectedOrder.phone}</p>
              </div>
              <div className="pt-2 border-t border-emerald-200/80 flex justify-between items-center text-sm font-black">
                <span>Total Payable Amount:</span>
                <span className="text-emerald-700 text-base">₹{selectedOrder.total}</span>
              </div>
            </div>

            {/* Support Contact Actions */}
            <div className="pt-2 flex flex-wrap items-center justify-end gap-2">
              <a
                href={`tel:${helplineNumber.split('/')[0].trim()}`}
                className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Call Support</span>
              </a>

              <a
                href={`mailto:${helplineEmail}`}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-200"
              >
                <Mail className="w-4 h-4 text-emerald-600" />
                <span>Email Support</span>
              </a>

              <button
                onClick={() => setSelectedDetailOrderId(null)}
                className="py-2.5 px-5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
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
