'use client'

import React, { useState } from 'react'
import { useApp } from '@/lib/app-context'
import { BuyerCheckoutModal } from './buyer-checkout-modal'
import { X, ShoppingBag, Trash2, Plus, Minus, ArrowRight, ShieldCheck, Tag } from 'lucide-react'

interface CartDrawerProps {
  isOpen: boolean
  onClose: () => void
  onOrderSuccess: () => void
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose, onOrderSuccess }) => {
  const { cart, products, updateCartItemQuantity, removeFromCart, getProductOfferInfo } = useApp()
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)

  if (!isOpen) return null

  const cartDetails = cart.map((item) => {
    const product = products.find((p) => p.id === item.productId)
    const offerInfo = getProductOfferInfo(item.productId)
    return {
      ...item,
      product,
      offerInfo
    }
  })

  const subtotal = cartDetails.reduce((sum, item) => {
    return sum + (item.offerInfo ? item.offerInfo.finalPrice * item.quantity : 0)
  }, 0)

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex justify-end animate-fade-in pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]">
        <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-slide-in-right">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-emerald-700" />
              <h3 className="font-bold text-slate-900 text-base">Your Shopping Cart</h3>
              <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded-full">
                {cart.reduce((s, i) => s + i.quantity, 0)} items
              </span>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="p-6 flex-1 overflow-y-auto space-y-4">
            {cart.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <p className="text-slate-600 font-semibold">Your cart is currently empty</p>
                <p className="text-slate-400 text-xs">Browse the catalogue to add organic bio-fertilizers.</p>
              </div>
            ) : (
              cartDetails.map(({ productId, quantity, product, offerInfo }) => {
                if (!product) return null
                const isBulk = product.main_category === 'bulk'
                const moqStep = isBulk ? (product.moq || 20) : 1

                return (
                  <div
                    key={productId}
                    className="flex items-center gap-3.5 p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white transition-colors"
                  >
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-16 h-16 object-contain rounded-xl bg-white p-1 border border-slate-200"
                    />

                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-900 text-sm truncate">{product.name}</h4>
                      {isBulk && (
                        <span className="text-[10px] font-bold uppercase text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 inline-block mb-1">
                          MOQ Stepper: {moqStep} units
                        </span>
                      )}
                      {offerInfo.hasOffer ? (
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="font-mono font-bold text-emerald-700">₹{offerInfo.finalPrice}/unit</span>
                          <span className="line-through text-slate-400 text-[11px]">₹{offerInfo.originalPrice}</span>
                          <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.5 rounded">
                            {offerInfo.discountPercentage}% OFF
                          </span>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 font-mono">₹{product.price} / unit</p>
                      )}

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => updateCartItemQuantity(productId, Math.max(0, quantity - moqStep))}
                          className="w-6 h-6 rounded-md bg-white border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-100 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold w-8 text-center">{quantity}</span>
                        <button
                          onClick={() => updateCartItemQuantity(productId, quantity + moqStep)}
                          className="w-6 h-6 rounded-md bg-white border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-100 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-slate-900 text-sm block">₹{offerInfo.finalPrice * quantity}</span>
                      <button
                        onClick={() => removeFromCart(productId)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1 mt-1 inline-block cursor-pointer"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer & Checkout Trigger */}
          {cart.length > 0 && (
            <div className="p-4 sm:p-6 border-t border-slate-200 bg-white space-y-3 sm:space-y-4 pb-[max(1.5rem,calc(env(safe-area-inset-bottom,0px)+1.5rem))]">
              <div className="flex items-center justify-between text-slate-900">
                <span className="text-sm font-semibold">Subtotal</span>
                <span className="text-xl font-extrabold text-emerald-700">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>

              <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-100 text-xs text-emerald-800 flex items-center gap-2 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>UPI & Bank Transfer payment options available</span>
              </div>

              <button
                onClick={() => setIsCheckoutOpen(true)}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Checkout Modal */}
      <BuyerCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onSuccess={() => {
          setIsCheckoutOpen(false)
          onClose()
          onOrderSuccess()
        }}
      />
    </>
  )
}
