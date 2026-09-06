'use client'

import React, { useState, useEffect } from 'react'
import { useApp } from '@/lib/app-context'
import { getSupportPhone } from '@/lib/data'
import {
  Warehouse,
  CheckCircle2,
  Truck,
  Package,
  Clock,
  MapPin,
  PhoneCall,
  Mail,
  Save,
  Check,
  Headphones,
  X,
  AlertCircle,
  Search
} from 'lucide-react'

export const WarehouseDashboard: React.FC = () => {
  const {
    orders,
    currentUser,
    warehouses,
    helplineNumber,
    helplineEmail,
    updateSupportContact,
    acceptOrder,
    updateOrderStatus,
    refreshOrders
  } = useApp()

  const [activeTab, setActiveTab] = useState<'orders' | 'support'>('orders')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  // Support Contact Settings Form State
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false)
  const [editingPhone, setEditingPhone] = useState(helplineNumber)
  const [editingEmail, setEditingEmail] = useState(helplineEmail)
  const [supportErrorMsg, setSupportErrorMsg] = useState<string | null>(null)
  const [isSavedNotice, setIsSavedNotice] = useState(false)

  const handleOpenSupportModal = () => {
    setEditingPhone(helplineNumber)
    setEditingEmail(helplineEmail)
    setSupportErrorMsg(null)
    setIsSupportModalOpen(true)
  }

  const handleSaveSupportModal = (e: React.FormEvent) => {
    e.preventDefault()
    setSupportErrorMsg(null)

    const cleanPhone = editingPhone.trim()
    const cleanEmail = editingEmail.trim()

    if (!cleanPhone || cleanPhone.length < 5) {
      setSupportErrorMsg('Please enter a valid support phone number.')
      return
    }

    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setSupportErrorMsg('Please enter a valid support email address.')
      return
    }

    updateSupportContact(cleanPhone, cleanEmail)
    setIsSupportModalOpen(false)
    setIsSavedNotice(true)
    setTimeout(() => setIsSavedNotice(false), 3000)
  }

  // There is a single physical warehouse. Multiple warehouse accounts may exist,
  // but they all manage the same hub, so every order is visible to all of them.
  const myWarehouse = warehouses[0]

  const mappedOrders = orders.filter((o) => {
    // Search by order ID
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      if (!o.id.toLowerCase().includes(query)) return false
    }

    // Status filter
    if (filterStatus === 'all') return true
    return o.status === filterStatus
  })

  const pendingAcceptanceCount = mappedOrders.filter((o) => o.status === 'placed').length
  const selectedOrder = orders.find((o) => o.id === selectedOrderId) || null

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'placed':
        return (
          <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 shrink-0">
            <Clock className="w-3 h-3 text-amber-700" />
            New
          </span>
        )
      case 'accepted':
        return (
          <span className="bg-indigo-100 text-indigo-900 border border-indigo-300 px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 shrink-0">
            <CheckCircle2 className="w-3 h-3 text-indigo-600" />
            Accepted
          </span>
        )
      case 'dispatched':
        return (
          <span className="bg-blue-100 text-blue-900 border border-blue-300 px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 shrink-0">
            <Truck className="w-3 h-3 text-blue-600" />
            Dispatched
          </span>
        )
      case 'delivered':
        return (
          <span className="bg-emerald-800 text-white px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 shrink-0">
            <CheckCircle2 className="w-3 h-3 text-emerald-300" />
            Delivered
          </span>
        )
      default:
        return (
          <span className="bg-slate-100 text-slate-700 border border-slate-300 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase shrink-0">
            {status}
          </span>
        )
    }
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Warehouse Header Banner */}
      <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-amber-950 text-white rounded-3xl p-6 shadow-xl border border-amber-700/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-amber-300 shrink-0 border border-white/20">
            <Warehouse className="w-8 h-8" />
          </div>
          <div>
            <span className="bg-amber-400 text-amber-950 font-bold text-xs px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Warehouse Fulfillment Hub
            </span>
            <h2 className="text-2xl font-black text-white mt-1">{myWarehouse.name}</h2>
            <p className="text-xs text-amber-200 mt-0.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span>{myWarehouse.address}</span>
            </p>
          </div>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex flex-wrap items-center gap-2 bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/20">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-amber-100 hover:text-white hover:bg-white/10'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Fulfillment Orders ({mappedOrders.length})</span>
            {pendingAcceptanceCount > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {pendingAcceptanceCount} NEW
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('support')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'support'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-amber-100 hover:text-white hover:bg-white/10'
            }`}
          >
            <Headphones className="w-4 h-4" />
            <span>Support Settings</span>
          </button>
        </div>
      </div>

      {/* TAB 1: WAREHOUSE FULFILLMENT ORDERS */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {/* Toolbar: Search + Stage Filter + Refresh */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <label htmlFor="wh-order-search" className="sr-only">
                  Search orders by order ID
                </label>
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="wh-order-search"
                  type="text"
                  placeholder="Search by Order ID"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50 font-mono"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear order search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={async () => {
                  setIsRefreshing(true)
                  await refreshOrders()
                  setIsRefreshing(false)
                }}
                disabled={isRefreshing}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
              >
                <Package className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-100">
              {[
                { key: 'all', label: 'All' },
                { key: 'placed', label: 'New', count: orders.filter((o) => o.status === 'placed').length },
                { key: 'accepted', label: 'Accepted', count: orders.filter((o) => o.status === 'accepted').length },
                { key: 'dispatched', label: 'Dispatched', count: orders.filter((o) => o.status === 'dispatched').length },
                { key: 'delivered', label: 'Delivered', count: orders.filter((o) => o.status === 'delivered').length }
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilterStatus(f.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filterStatus === f.key
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label} {f.count !== undefined && `(${f.count})`}
                </button>
              ))}
            </div>
          </div>

          {/* Orders List */}
          {mappedOrders.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs space-y-3">
              <Package className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-lg font-bold text-slate-700">No Orders Found</h3>
              <p className="text-xs text-slate-500">Orders placed by buyers will show up here automatically.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {mappedOrders.map((ord) => {
                const firstItem = ord.items && ord.items.length > 0 ? ord.items[0] : null
                const extraItemsCount = ord.items && ord.items.length > 1 ? ord.items.length - 1 : 0

                return (
                  <div
                    key={ord.id}
                    className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-3"
                  >
                    {/* Compact Top Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 text-sm">{ord.id}</span>
                        <span className="text-xs text-slate-400 font-medium">({ord.date})</span>
                      </div>
                      {getStatusBadge(ord.status)}
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
                          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-100 font-bold text-xs">
                            BIO
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 text-sm truncate">
                            {ord.buyerName || 'Dealer Account'}
                          </h4>
                          <p className="text-xs text-slate-500 font-medium truncate">
                            {firstItem?.name || 'Bio-Fertilizer Item'} · Qty: {firstItem?.qty || 1}
                            {extraItemsCount > 0 && <span className="text-amber-700 font-bold"> (+{extraItemsCount} more)</span>}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs text-slate-400 block font-medium">Total</span>
                        <span className="text-lg font-black text-slate-900">₹{ord.total}</span>
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => setSelectedOrderId(ord.id)}
                        className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>View Details →</span>
                      </button>

                      {ord.status === 'placed' && (
                        <button
                          onClick={() => acceptOrder(ord.id)}
                          className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Accept Order</span>
                        </button>
                      )}

                      {ord.status === 'accepted' && (
                        <button
                          onClick={() => updateOrderStatus(ord.id, 'dispatched', `Dispatched via Hub Transport by ${currentUser.name}`)}
                          className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Mark Dispatched</span>
                        </button>
                      )}

                      {(ord.status === 'placed' || ord.status === 'accepted') && (
                        <button
                          onClick={() => updateOrderStatus(ord.id, 'cancelled', `Cancelled by ${currentUser.name}`)}
                          className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Cancel</span>
                        </button>
                      )}

                      {ord.status === 'dispatched' && (
                        <button
                          onClick={() => updateOrderStatus(ord.id, 'delivered', `Delivered & Verified by ${currentUser.name}`)}
                          className="py-2 px-4 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Confirm Delivery</span>
                        </button>
                      )}

                      {ord.status === 'delivered' && (
                        <span className="py-2 px-4 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200">
                          Payment Settled
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SUPPORT HELPLINE & EMAIL CONTACT SETTINGS */}
      {activeTab === 'support' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold shrink-0">
                <Headphones className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-xl">Customer Support Contact Settings</h3>
                <p className="text-xs text-slate-500">
                  View and update official Customer Support Helpline Number & Email displayed to all buyers and farmers.
                </p>
              </div>
            </div>

            <button
              onClick={handleOpenSupportModal}
              className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Update Contact Info</span>
            </button>
          </div>

          {isSavedNotice && (
            <div className="bg-emerald-900 text-white px-5 py-3.5 rounded-2xl shadow-md flex items-center gap-2 border border-emerald-700">
              <Check className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="text-sm font-semibold">Support contact details updated & synced live across Bio-Bramha!</span>
            </div>
          )}

          {/* Live Contact Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 text-white p-6 rounded-2xl space-y-3 border border-slate-800 shadow-sm relative overflow-hidden">
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">Official Helpline Phone Number</span>
              <h4 className="text-xl font-bold text-amber-400 font-mono">{getSupportPhone(helplineNumber) || <span className="text-sm text-slate-400 font-sans">Not configured — set it from Admin › Support Contact Settings</span>}</h4>
              <p className="text-xs text-slate-300">Displayed on buyer orders for one-touch direct phone calling.</p>
            </div>

            <div className="bg-amber-950 text-white p-6 rounded-2xl space-y-3 border border-amber-900 shadow-sm relative overflow-hidden">
              <span className="text-[11px] text-amber-300/80 font-bold uppercase tracking-wider block">Official Customer Support Email</span>
              <h4 className="text-lg font-bold text-white font-mono">{helplineEmail}</h4>
              <p className="text-xs text-amber-100/90">Displayed on buyer support section for direct email communication.</p>
            </div>
          </div>
        </div>
      )}

      {/* ORDER DETAILS MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl space-y-6 relative border border-slate-200 my-auto">
            <button
              onClick={() => setSelectedOrderId(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors z-10 cursor-pointer"
              title="Close Order Details"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-mono font-bold text-slate-900 text-xl">{selectedOrder.id}</h3>
                  {getStatusBadge(selectedOrder.status)}
                </div>
                <p className="text-xs text-slate-500 font-medium">Placed on: {selectedOrder.date}</p>
              </div>
            </div>

            {/* Buyer & Delivery Details */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-semibold">Buyer Name</span>
                <span className="font-bold text-slate-900">{selectedOrder.buyerName || 'Dealer Account'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-semibold">Contact Phone</span>
                <a href={`tel:${selectedOrder.phone}`} className="font-mono font-bold text-amber-700">{selectedOrder.phone}</a>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block mb-0.5">Delivery Address</span>
                <p className="font-medium text-slate-800">{selectedOrder.address}, {selectedOrder.city} - {selectedOrder.pincode}</p>
              </div>
            </div>

            {/* Items List Breakdown */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ordered Products</h4>
              <div className="space-y-2">
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <div className="flex items-center gap-3">
                      {item.image && <img src={item.image} alt={item.name} className="w-9 h-9 object-contain bg-white rounded-lg p-0.5 border border-slate-200" />}
                      <div>
                        <span className="font-bold text-slate-900 block">{item.name}</span>
                        <span className="text-slate-500">Qty: {item.qty} x ₹{item.price}</span>
                      </div>
                    </div>
                    <span className="font-bold text-slate-900">₹{item.qty * item.price}</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-sm">
                <span className="text-slate-500 font-semibold">Total Invoice Payable</span>
                <span className="text-lg font-black text-slate-900">₹{selectedOrder.total}</span>
              </div>
            </div>

            {/* Payment Terms */}
            <div className="flex items-center justify-between text-xs bg-amber-50 p-3 rounded-xl border border-amber-100">
              <span className="text-slate-500 font-semibold">Payment Terms</span>
              <span className="font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">{selectedOrder.paymentMethod}</span>
            </div>

            {/* Action Footer */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-3">
              {selectedOrder.status === 'placed' && (
                <button
                  onClick={() => { acceptOrder(selectedOrder.id); setSelectedOrderId(null) }}
                  className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Accept Order</span>
                </button>
              )}
              {selectedOrder.status === 'accepted' && (
                <button
                  onClick={() => { updateOrderStatus(selectedOrder.id, 'dispatched', `Dispatched via Hub Transport by ${currentUser.name}`); setSelectedOrderId(null) }}
                  className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Truck className="w-4 h-4" />
                  <span>Mark Dispatched</span>
                </button>
              )}
              {selectedOrder.status === 'dispatched' && (
                <button
                  onClick={() => { updateOrderStatus(selectedOrder.id, 'delivered', `Delivered & Verified by ${currentUser.name}`); setSelectedOrderId(null) }}
                  className="py-2.5 px-5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Delivery</span>
                </button>
              )}

              <button
                onClick={() => setSelectedOrderId(null)}
                className="py-2.5 px-5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPDATE SUPPORT CONTACT MODAL */}
      {isSupportModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 relative my-auto text-left">
            <button
              onClick={() => setIsSupportModalOpen(false)}
              className="absolute right-4 top-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors"
              title="Cancel & Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold shrink-0">
                <Headphones className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Update Support Contact Details</h3>
                <p className="text-xs text-slate-500">Enter new phone and email. Changes will apply live only upon clicking "Save & Update Details".</p>
              </div>
            </div>

            {supportErrorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{supportErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveSupportModal} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  Support Helpline Phone Number *
                </label>
                <div className="relative">
                  <PhoneCall className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={editingPhone}
                    onChange={(e) => setEditingPhone(e.target.value)}
                    placeholder="Support phone number"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  Support Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={editingEmail}
                    onChange={(e) => setEditingEmail(e.target.value)}
                    placeholder="e.g. support@biobramha.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 bg-slate-50"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsSupportModalOpen(false)}
                  className="px-5 py-3 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Save & Update Details</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
