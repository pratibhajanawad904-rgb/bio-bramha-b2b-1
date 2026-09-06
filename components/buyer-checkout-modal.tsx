'use client'

import React, { useState } from 'react'
import { useApp } from '@/lib/app-context'
import { X, Truck, CheckCircle2, ShieldCheck, MapPin, Phone, Building, AlertCircle, Plus, Star, Loader2, Package, Edit3, Check, Trash2 } from 'lucide-react'
import { isValidPhoneNumber, isValidPincode } from '@/lib/security'
import { fetchAppSettings } from '@/lib/settings-client'
import { api } from '@/lib/api-client'
import { DEFAULT_WAREHOUSE_LOCATION, STATE_OPTIONS, normalizeStateCode, stateName } from '@/lib/data'

interface CheckoutModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface SavedAddress {
  id: string
  line1: string
  city: string
  pincode: string
  state: string
  isDefault: boolean
}

export const BuyerCheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { cart, products, currentUser, getProductOfferInfo, createOrder } = useApp()

  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [pincode, setPincode] = useState('')
  const [addrState, setAddrState] = useState('MH')
  const [phone, setPhone] = useState(currentUser.phone || '')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [paymentSettings, setPaymentSettings] = useState<{ qrCodeImage: string | null; upiId: string; accountDetails: string } | null>(null)

  const [paymentTerms, setPaymentTerms] = useState<'Advance UPI/QR' | 'NEFT/RTGS Bank Transfer'>('Advance UPI/QR')

  // Saved-address selection state
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string>('new')
  const [saveForFuture, setSaveForFuture] = useState(true)
  const [loadingAddresses, setLoadingAddresses] = useState(false)
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null)
  const [savingAddr, setSavingAddr] = useState(false)

  // Submission / success state
  const [isPlacing, setIsPlacing] = useState(false)
  const [placedOrder, setPlacedOrder] = useState<{ id: string; total: number } | null>(null)

  // MVP V1: a single fixed warehouse (Taloja, Mumbai, Maharashtra). No selection shown.
  const warehouseId = 'wh-taloja'

  // Load saved addresses + payment settings on open.
  React.useEffect(() => {
    if (!isOpen) return

    // Reset transient state each time the modal opens.
    setValidationError(null)
    setPlacedOrder(null)
    setIsPlacing(false)
    setEditingAddressId(null)
    setPhone(currentUser.phone || '')

    fetchAppSettings()
      .then((settings) => {
        if (settings?.paymentSettings) setPaymentSettings(settings.paymentSettings)
      })
      .catch(() => {})

    setLoadingAddresses(true)
    api.getAddresses()
      .then((res) => {
        if (res.success && Array.isArray(res.addresses) && res.addresses.length > 0) {
          const list = res.addresses as SavedAddress[]
          setSavedAddresses(list)
          const def = list.find((a) => a.isDefault) || list[0]
          applyAddress(def)
        } else {
          setSavedAddresses([])
          setSelectedAddressId('new')
          setAddress(''); setCity(''); setPincode('')
        }
      })
      .catch(() => {})
      .finally(() => setLoadingAddresses(false))
  }, [isOpen])

  function applyAddress(a: SavedAddress) {
    setSelectedAddressId(a.id)
    setAddress(a.line1)
    setCity(a.city)
    setPincode(a.pincode)
    setAddrState(normalizeStateCode(a.state))
  }

  function chooseNewAddress() {
    setSelectedAddressId('new')
    setEditingAddressId(null)
    setAddress(''); setCity(''); setPincode('')
    setSaveForFuture(true)
  }

  function startEditAddress(a: SavedAddress) {
    setEditingAddressId(a.id)
    setSelectedAddressId(a.id)
    setAddress(a.line1)
    setCity(a.city)
    setPincode(a.pincode)
    setAddrState(normalizeStateCode(a.state))
    setValidationError(null)
  }

  function cancelEditAddress() {
    setEditingAddressId(null)
    const current = savedAddresses.find((a) => a.id === selectedAddressId)
    if (current) applyAddress(current)
    setValidationError(null)
  }

  async function handleUpdateAddress() {
    const id = editingAddressId
    if (!id) return
    setValidationError(null)
    if (!address || !city || !pincode) {
      setValidationError('Please fill in all address fields.')
      return
    }
    if (!isValidPincode(pincode)) {
      setValidationError('Please enter a valid 6-digit pincode.')
      return
    }
    setSavingAddr(true)
    try {
      const res = await api.updateAddress(id, { line1: address, city, pincode, state: addrState })
      if (!res.success) {
        setValidationError(res.error || 'Could not update the address.')
        return
      }
      const r = await api.getAddresses()
      if (r.success && Array.isArray(r.addresses)) {
        const list = r.addresses as SavedAddress[]
        setSavedAddresses(list)
        const upd = list.find((a) => a.id === id)
        if (upd) applyAddress(upd)
      }
      setEditingAddressId(null)
    } catch {
      setValidationError('Could not update the address. Please try again.')
    } finally {
      setSavingAddr(false)
    }
  }

  if (!isOpen) return null

  // Resolve each cart line to its product, applying any active offer discount.
  const orderLineItems = cart.map((item) => {
    const product = products.find((p) => p.id === item.productId)
    const offerInfo = getProductOfferInfo(item.productId)
    const unitPrice = offerInfo.hasOffer ? offerInfo.finalPrice : product?.price ?? 0

    return {
      productId: item.productId,
      name: product?.name || 'Unknown Product',
      qty: item.quantity,
      price: unitPrice,
      image: product?.image
    }
  })

  const orderTotal = orderLineItems.reduce((sum, line) => sum + line.price * line.qty, 0)

  const getButtonText = () => 'Place Order'

  async function handleDeleteAddress(a: SavedAddress) {
    if (!confirm('Remove this saved address?')) return
    setSavingAddr(true)
    try {
      const res = await api.deleteAddress(a.id)
      if (!res.success) {
        setValidationError(res.error || 'Could not remove the address.')
        return
      }
      const r = await api.getAddresses()
      const list = r.success && Array.isArray(r.addresses) ? (r.addresses as SavedAddress[]) : []
      setSavedAddresses(list)
      if (selectedAddressId === a.id) {
        const def = list.find((x) => x.isDefault) || list[0]
        if (def) applyAddress(def)
        else chooseNewAddress()
      }
    } catch {
      setValidationError('Could not remove the address. Please try again.')
    } finally {
      setSavingAddr(false)
    }
  }

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    if (isPlacing) return // guard against duplicate submissions

    if (!address || !city || !pincode || !phone) {
      setValidationError('Please fill in all required delivery fields.')
      return
    }
    if (cart.length === 0) {
      setValidationError('Your cart is empty. Add products before placing an order.')
      return
    }
    if (!isValidPincode(pincode)) {
      setValidationError('Please enter a valid 6-digit Indian Pincode (e.g. 400001).')
      return
    }
    if (!isValidPhoneNumber(phone)) {
      setValidationError('Please enter a valid mobile phone number.')
      return
    }

    setIsPlacing(true)

    try {
      // Persist a freshly-typed address so it can be reused on future orders.
      if (selectedAddressId === 'new' && saveForFuture) {
        try {
          await api.addAddress({ line1: address, city, pincode, state: addrState })
        } catch {
          // Non-fatal: continue with the order even if saving the address fails.
        }
      }

      const order = await createOrder({
        address,
        city,
        pincode,
        phone,
        state: addrState,
        warehouseId,
        paymentMethod: paymentTerms,
        buyerName: currentUser.name || 'Buyer',
        buyerEmail: currentUser.email,
        items: orderLineItems,
        subtotal: orderTotal,
        total: orderTotal
      })

      if (order) {
        setPlacedOrder({ id: order.id, total: order.total || orderTotal })
      }
    } catch (err: any) {
      setValidationError(err?.message || 'Could not place your order. Please try again.')
    } finally {
      setIsPlacing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 pt-[max(1rem,env(safe-area-inset-top,1rem))] pb-[max(1.5rem,calc(env(safe-area-inset-bottom,0px)+1.5rem))] overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[88vh] overflow-y-auto shadow-2xl border border-slate-200 relative my-auto" data-testid="checkout-modal">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md px-4 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <Truck className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              {placedOrder ? 'Order Confirmed' : 'Dealer Order Checkout'}
            </h3>
          </div>

          <button
            onClick={onClose}
            data-testid="checkout-close-btn"
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
            aria-label="Close checkout"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* SUCCESS CONFIRMATION */}
        {placedOrder ? (
          <div className="p-6 sm:p-8 text-center space-y-5" data-testid="order-success-panel">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-9 h-9 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">Order Placed Successfully!</h3>
              <p className="text-sm text-slate-500 mt-1">Thank you. Your order has been received and sent to our warehouse.</p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 font-semibold">Order ID</span>
                <span className="font-mono font-black text-slate-900" data-testid="success-order-id">{placedOrder.id}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 font-semibold">Total Payable</span>
                <span className="font-black text-emerald-700">₹{placedOrder.total.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 font-semibold">Payment Term</span>
                <span className="font-semibold text-slate-800">{paymentTerms}</span>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              Our team will call you shortly to confirm payment and share dispatch details.
            </p>

            <button
              onClick={() => { onSuccess(); onClose() }}
              data-testid="view-my-orders-btn"
              className="w-full min-h-[48px] py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Package className="w-5 h-5" />
              <span>View My Orders</span>
            </button>
          </div>
        ) : (
          /* CHECKOUT FORM */
          <form onSubmit={handlePlaceOrder} className="p-4 sm:p-6 space-y-5 sm:space-y-6">
            {validationError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2" data-testid="checkout-error">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Order Items Summary — unit price × qty = total */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-emerald-600" />
                Order Summary
              </h4>
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                {orderLineItems.map((line) => (
                  <div key={line.productId} className="flex items-center justify-between gap-3 p-3 text-xs sm:text-sm" data-testid={`checkout-line-${line.productId}`}>
                    <div className="min-w-0">
                      <span className="font-semibold text-slate-800 block truncate">{line.name}</span>
                      <span className="text-[11px] text-slate-500">₹{line.price} / unit · Qty {line.qty}</span>
                    </div>
                    <span className="font-bold text-slate-900 whitespace-nowrap shrink-0">₹{(line.price * line.qty).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Saved Address Selection */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                Delivery Address
              </h4>

              {loadingAddresses ? (
                <div className="text-xs text-slate-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading your saved addresses…</div>
              ) : (
                savedAddresses.length > 0 && (
                  <div className="space-y-2" data-testid="saved-addresses-list">
                    {savedAddresses.map((a) => (
                      <div
                        key={a.id}
                        data-testid={`saved-address-${a.id}`}
                        className={`flex items-start gap-2 p-3 rounded-xl border transition-all ${
                          selectedAddressId === a.id && !editingAddressId
                            ? 'border-emerald-600 bg-emerald-50/70'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <label className="flex items-start gap-3 cursor-pointer flex-1 min-w-0">
                          <input
                            type="radio"
                            name="savedAddress"
                            checked={selectedAddressId === a.id && !editingAddressId}
                            onChange={() => { setEditingAddressId(null); applyAddress(a) }}
                            className="accent-emerald-600 w-4 h-4 mt-0.5 shrink-0"
                          />
                          <div className="text-xs text-slate-700 min-w-0">
                            <p className="font-semibold text-slate-900 break-words">{a.line1}</p>
                            <p>{a.city}, {stateName(a.state)} - {a.pincode}</p>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {a.isDefault && (
                                <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded" data-testid={`default-badge-${a.id}`}>
                                  <Star className="w-3 h-3" /> Default
                                </span>
                              )}
                              {selectedAddressId === a.id && !editingAddressId && (
                                <span className="inline-flex items-center gap-1 text-white font-bold bg-emerald-600 px-1.5 py-0.5 rounded" data-testid={`selected-badge-${a.id}`}>
                                  <Check className="w-3 h-3" /> Delivering here
                                </span>
                              )}
                            </div>
                          </div>
                        </label>
                        <div className="flex flex-col gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => startEditAddress(a)}
                            data-testid={`edit-address-${a.id}`}
                            className="w-10 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
                            aria-label="Edit address"
                            title="Edit address"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {!a.isDefault && (
                            <button
                              type="button"
                              onClick={async () => {
                                const res = await api.updateAddress(a.id, { setDefault: true })
                                if (res.success) {
                                  const r = await api.getAddresses()
                                  if (r.success && Array.isArray(r.addresses)) {
                                    const list = r.addresses as SavedAddress[]
                                    setSavedAddresses(list)
                                    const def = list.find((x) => x.isDefault)
                                    if (def) applyAddress(def)
                                  }
                                }
                              }}
                              data-testid={`set-default-address-${a.id}`}
                              className="w-10 h-10 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center cursor-pointer"
                              aria-label="Set as default"
                              title="Set as default"
                            >
                              <Star className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteAddress(a)}
                            disabled={savingAddr}
                            data-testid={`delete-address-${a.id}`}
                            className="w-10 h-10 rounded-lg bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-600 flex items-center justify-center cursor-pointer"
                            aria-label="Remove address"
                            title="Remove address"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={chooseNewAddress}
                      data-testid="add-new-address-btn"
                      className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed text-xs font-bold transition-all cursor-pointer ${
                        selectedAddressId === 'new'
                          ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                          : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Plus className="w-4 h-4" /> Add New Address
                    </button>
                  </div>
                )
              )}

              {/* Address form (new address, editing a saved one, or none saved yet) */}
              {(selectedAddressId === 'new' || savedAddresses.length === 0 || editingAddressId) && (
                <div className="space-y-3" data-testid="address-form">
                  {editingAddressId && (
                    <p className="text-xs font-bold text-emerald-700">Editing saved address</p>
                  )}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Full Street Address</label>
                    <input
                      type="text"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="House No, Village / Street name"
                      data-testid="checkout-address-input"
                      className="w-full min-w-0 px-3.5 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Town / City</label>
                      <input
                        type="text"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="City / Town / District"
                        data-testid="checkout-city-input"
                        className="w-full min-w-0 px-3.5 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">State</label>
                      <select
                        value={addrState}
                        onChange={(e) => setAddrState(e.target.value)}
                        data-testid="checkout-state-select"
                        className="w-full min-w-0 px-3.5 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900"
                      >
                        {STATE_OPTIONS.map((s) => (
                          <option key={s.code} value={s.code}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Pincode</label>
                      <input
                        type="text"
                        required
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="6-digit pincode"
                        data-testid="checkout-pincode-input"
                        className="w-full min-w-0 px-3.5 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900 font-mono"
                      />
                    </div>
                  </div>

                  {editingAddressId ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleUpdateAddress}
                        disabled={savingAddr}
                        data-testid="update-address-btn"
                        className="flex-1 min-h-[42px] py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {savingAddr ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Update Address
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditAddress}
                        data-testid="cancel-edit-address-btn"
                        className="min-h-[42px] px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={saveForFuture}
                        onChange={(e) => setSaveForFuture(e.target.checked)}
                        data-testid="save-address-checkbox"
                        className="accent-emerald-600 w-4 h-4"
                      />
                      Save this address for future orders
                    </label>
                  )}
                </div>
              )}

              {/* Phone (always) */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Phone Number for Delivery</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    data-testid="checkout-phone-input"
                    className="w-full min-w-0 pl-10 pr-3.5 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900 font-mono font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Payment Terms Section */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Payment Terms
              </label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { value: 'Advance UPI/QR' as const, label: 'Advance payment via UPI / QR Code' },
                  { value: 'NEFT/RTGS Bank Transfer' as const, label: 'Bank Transfer (NEFT / RTGS)' },
                ].map((term) => (
                  <label
                    key={term.value}
                    className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                      paymentTerms === term.value
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 font-bold'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentTerms"
                      checked={paymentTerms === term.value}
                      onChange={() => setPaymentTerms(term.value)}
                      className="accent-emerald-600 w-4 h-4"
                    />
                    <span className="text-xs">{term.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Payment Details Section */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 sm:p-5 space-y-4">
              <h4 className="text-sm font-bold text-blue-900 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                Payment Details
              </h4>

              {paymentSettings && (paymentSettings.qrCodeImage || paymentSettings.upiId || paymentSettings.accountDetails) ? (
                <>
                  {paymentSettings.qrCodeImage && (
                    <div className="w-full max-w-[280px] mx-auto bg-white border-4 border-blue-200 rounded-2xl p-4 shadow-lg">
                      <img
                        src={paymentSettings.qrCodeImage}
                        alt="Payment QR Code"
                        className="w-full h-auto aspect-square object-contain"
                      />
                    </div>
                  )}

                  {paymentSettings.upiId && (
                    <div className="bg-white border border-blue-200 rounded-xl p-3 flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-600">UPI ID:</span>
                      <span className="text-sm font-mono font-bold text-slate-900">{paymentSettings.upiId}</span>
                    </div>
                  )}

                  {paymentSettings.accountDetails && (
                    <div className="bg-white border border-blue-200 rounded-xl p-4 space-y-1.5">
                      <div className="text-xs font-bold text-blue-900 mb-2">Bank Account Details:</div>
                      <pre className="text-xs text-slate-800 whitespace-pre-wrap font-sans leading-relaxed">
                        {paymentSettings.accountDetails}
                      </pre>
                    </div>
                  )}

                  <div className="bg-white border border-blue-200 rounded-xl p-3.5 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      Please complete your payment using the details above for the total shown below. Our team will call you to confirm your order and share dispatch and delivery timelines.
                    </p>
                  </div>
                </>
              ) : (
                <div className="bg-white border border-blue-200 rounded-xl p-4 flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  <p className="text-sm text-slate-700 font-medium">
                    Our team will share payment details with you right after your order is confirmed.
                  </p>
                </div>
              )}
            </div>

            {/* Shipment & Logistics Cost Disclosure */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <Truck className="w-4 h-4 text-emerald-600" />
                <span>Shipment / Logistics Cost:</span>
                <span className="text-emerald-700 font-extrabold">Actual & Paid by Customer</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Freight charges are calculated on actual dispatch distance and collected separately or on delivery.
              </p>
            </div>

            {/* Dispatch Warehouse (fixed to Taloja, Mumbai) */}
            <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-100 flex items-center gap-3" data-testid="warehouse-info">
              <Building className="w-5 h-5 text-emerald-700 shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-slate-800 block">Dispatch Warehouse</span>
                <span className="text-emerald-800 font-semibold">{DEFAULT_WAREHOUSE_LOCATION}</span>
              </div>
            </div>

            {/* Total Breakdown & Action Button */}
            <div className="pt-2 space-y-3">
              <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                <span>Total Payable</span>
                <span className="text-emerald-700 text-lg" data-testid="checkout-total">₹{orderTotal.toLocaleString('en-IN')}</span>
              </div>
              <p className="text-[11px] text-slate-500 text-right -mt-1">Freight / logistics charged at actual, extra.</p>

              <button
                type="submit"
                disabled={isPlacing || !!editingAddressId}
                data-testid="place-order-btn"
                className="w-full min-h-[50px] py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isPlacing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Placing your order…</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>{getButtonText()}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
