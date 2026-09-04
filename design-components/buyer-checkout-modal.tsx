'use client'

import React, { useState } from 'react'
import { useApp } from '@/lib/app-context'
import { X, Truck, CheckCircle2, ShieldCheck, MapPin, Phone, Building, AlertCircle } from 'lucide-react'
import { isValidPhoneNumber, isValidPincode } from '@/lib/security'
import { fetchAppSettings } from '@/lib/settings-client'

interface CheckoutModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export const BuyerCheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { cart, products, warehouses, currentUser, getProductOfferInfo, createOrder } = useApp()

  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [pincode, setPincode] = useState('')
  const [phone, setPhone] = useState(currentUser.phone || '')
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(warehouses[0]?.id || 'wh-central')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [paymentSettings, setPaymentSettings] = useState<{ qrCodeImage: string | null; upiId: string; accountDetails: string } | null>(null)

  const [paymentTerms, setPaymentTerms] = useState<'Advance UPI/QR' | 'NEFT/RTGS Bank Transfer'>('Advance UPI/QR')

  // Ensure we have a valid warehouse ID
  React.useEffect(() => {
    if (warehouses.length > 0 && !warehouses.find(w => w.id === selectedWarehouseId)) {
      setSelectedWarehouseId(warehouses[0].id)
    }
  }, [warehouses, selectedWarehouseId])

  // Fetch payment settings on mount from the shared settings store.
  React.useEffect(() => {
    if (isOpen) {
      fetchAppSettings()
        .then((settings) => {
          if (settings?.paymentSettings) {
            setPaymentSettings(settings.paymentSettings)
          }
        })
        .catch(() => {})
    }
  }, [isOpen])

  if (!isOpen) return null

  // Direct offer price calculation
  const total = cart.reduce((sum, item) => {
    const offerInfo = getProductOfferInfo(item.productId)
    return sum + offerInfo.finalPrice * item.quantity
  }, 0)

  // Get dynamic button text based on payment method
  const getButtonText = () => {
    switch (paymentTerms) {
      case 'Advance UPI/QR':
        return 'Confirm Order & Pay via UPI/QR'
      case 'NEFT/RTGS Bank Transfer':
        return 'Confirm Order & Pay via Bank Transfer'
      default:
        return 'Confirm Order'
    }
  }

  // Resolve each cart line to its product, applying any active offer discount.
  // getProductOfferInfo takes a product ID, not a product object.
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

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    if (!address || !city || !pincode || !phone) {
      setValidationError('Please fill in all required shipping fields.')
      return
    }

    if (cart.length === 0) {
      setValidationError('Your cart is empty. Add products before placing an order.')
      return
    }

    if (!isValidPincode(pincode)) {
      setValidationError('Please enter a valid 6-digit Indian Pincode (e.g. 522001).')
      return
    }

    if (!isValidPhoneNumber(phone)) {
      setValidationError('Please enter a valid mobile phone number.')
      return
    }

    const order = await createOrder({
      address,
      city,
      pincode,
      phone,
      state: 'Andhra Pradesh', // Default state
      warehouseId: selectedWarehouseId,
      paymentMethod: paymentTerms,
      buyerName: currentUser.name || 'Buyer',
      buyerEmail: currentUser.email,
      items: orderLineItems,
      subtotal: orderTotal,
      total: orderTotal
    })

    if (order) {
      onSuccess()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 pt-[max(1rem,env(safe-area-inset-top,1rem))] pb-[max(1.5rem,calc(env(safe-area-inset-bottom,0px)+1.5rem))] overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[85vh] overflow-y-auto shadow-2xl border border-slate-200 relative my-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md px-4 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <Truck className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">B2B Dealer Order Checkout</h3>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handlePlaceOrder} className="p-4 sm:p-6 space-y-5 sm:space-y-6">
          {validationError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Shipping Address Inputs */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              Delivery Address
            </h4>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Full Street Address</label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="House No, Village / Street name"
                className="w-full min-w-0 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900"
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
                  className="w-full min-w-0 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900"
                />
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
                  className="w-full min-w-0 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900 font-mono"
                />
              </div>
            </div>

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
                  className="w-full min-w-0 pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-slate-900 font-mono font-bold"
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
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-bold text-blue-900 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Payment Details
            </h4>

            {paymentSettings && (paymentSettings.qrCodeImage || paymentSettings.upiId || paymentSettings.accountDetails) ? (
              <>
                {/* QR Code Image */}
                {paymentSettings.qrCodeImage && (
                  <div className="w-full max-w-[280px] mx-auto bg-white border-4 border-blue-200 rounded-2xl p-4 shadow-lg">
                    <img
                      src={paymentSettings.qrCodeImage}
                      alt="Payment QR Code"
                      className="w-full h-auto aspect-square object-contain"
                    />
                  </div>
                )}

                {/* UPI ID */}
                {paymentSettings.upiId && (
                  <div className="bg-white border border-blue-200 rounded-xl p-3 flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600">UPI ID:</span>
                    <span className="text-sm font-mono font-bold text-slate-900">{paymentSettings.upiId}</span>
                  </div>
                )}

                {/* Bank Account Details */}
                {paymentSettings.accountDetails && (
                  <div className="bg-white border border-blue-200 rounded-xl p-4 space-y-1.5">
                    <div className="text-xs font-bold text-blue-900 mb-2">Bank Account Details:</div>
                    <pre className="text-xs text-slate-800 whitespace-pre-wrap font-sans leading-relaxed">
                      {paymentSettings.accountDetails}
                    </pre>
                  </div>
                )}

                {/* Payment Instruction Message */}
                <div className="bg-red-900 border border-red-800 rounded-xl p-3.5 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-200 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-50 leading-relaxed font-semibold">
                    Please complete your payment using the details above for the total amount shown below. Once we receive your payment, one of our executives will call you shortly to confirm your order and walk you through the shipping and delivery timeline.
                  </p>
                </div>
              </>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-700 shrink-0" />
                <p className="text-sm text-amber-900 font-medium">
                  Payment details will be shared with you shortly by our team after order confirmation.
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
              Freight charges will be calculated on actual dispatch distance and collected separately or on delivery.
            </p>
          </div>

          {/* Warehouse Selection Mapping */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-emerald-600" />
              Assigned Warehouse Hub
            </label>
            <select
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.city}, {w.state})
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500">Your order will be routed to this warehouse for instant acceptance.</p>
          </div>

          {/* Payment Method Notice */}
          <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0" />
            <div className="text-xs text-amber-900">
              <span className="font-bold block">Selected Payment Term: {paymentTerms}</span>
              Total Items Value: ₹{total} (Freight/Logistics actual extra)
            </div>
          </div>

          {/* Total Breakdown & Action Button */}
          <div className="pt-2 space-y-3">
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                <span>Total Payable</span>
                <span className="text-emerald-700 text-lg">₹{total}</span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>{getButtonText()}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
