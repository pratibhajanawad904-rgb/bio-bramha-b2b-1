'use client'

import React, { useState } from 'react'
import { useApp } from '@/lib/app-context'
import {
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  ShoppingCart,
  Award,
  Tag
} from 'lucide-react'

export const ProductDetailModal: React.FC = () => {
  const { selectedProduct, setSelectedProduct, addToCart, getProductOfferInfo, currentUser } = useApp()
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)

  if (!selectedProduct) return null

  const offerInfo = getProductOfferInfo(selectedProduct.id)
  const images = selectedProduct.images && selectedProduct.images.length > 0
    ? selectedProduct.images
    : [selectedProduct.image]

  const handlePrevImage = () => {
    setActiveImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }

  const handleNextImage = () => {
    setActiveImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }

  const handleAddToCart = () => {
    addToCart(selectedProduct.id, quantity)
    setAdded(true)
    setTimeout(() => {
      setAdded(false)
      setSelectedProduct(null)
    }, 1200)
  }

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 pt-16 pb-12 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[85vh] overflow-y-auto shadow-2xl border border-slate-200/80 relative flex flex-col my-auto">
        {/* Header Bar */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-slate-100 flex items-center justify-between z-20">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
              {selectedProduct.category}
            </span>
            <span className="text-xs text-slate-500 font-medium">{selectedProduct.packSize}</span>
          </div>

          <button
            onClick={() => setSelectedProduct(null)}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Left Column: Interactive Multi-Image Slider */}
          <div className="space-y-4">
            {/* Main Active Image Display */}
            <div className="relative aspect-4/3 sm:aspect-square bg-slate-50 rounded-2xl border border-slate-200/80 p-6 flex items-center justify-center overflow-hidden group">
              <img
                src={images[activeImageIndex]}
                alt={`${selectedProduct.name} View ${activeImageIndex + 1}`}
                className="w-full h-full object-contain transition-all duration-300 transform group-hover:scale-105"
              />

              {/* Slider Arrows */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={handlePrevImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow-md text-slate-800 hover:bg-white flex items-center justify-center transition-all hover:scale-110"
                    title="Previous Image"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>

                  <button
                    onClick={handleNextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow-md text-slate-800 hover:bg-white flex items-center justify-center transition-all hover:scale-110"
                    title="Next Image"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>

                  <span className="absolute bottom-3 right-3 bg-slate-900/70 backdrop-blur-md text-white text-xs font-semibold px-2.5 py-1 rounded-md">
                    {activeImageIndex + 1} / {images.length}
                  </span>
                </>
              )}
            </div>

            {/* Clickable Image Thumbnails Carousel */}
            {images.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-1">
                {images.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 bg-slate-50 p-1.5 ${
                      activeImageIndex === idx
                        ? 'border-emerald-600 ring-2 ring-emerald-600/20 scale-105'
                        : 'border-slate-200 opacity-70 hover:opacity-100 hover:border-slate-400'
                    }`}
                  >
                    <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            )}

            {/* Quality & Certification Badges */}
            <div className="bg-emerald-50/60 rounded-xl p-3.5 border border-emerald-100 flex flex-wrap items-center gap-3 text-xs text-emerald-900">
              <div className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>NPOP Organic Certified</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <Award className="w-4 h-4 text-emerald-600" />
                <span>Government FCO Approved</span>
              </div>
            </div>
          </div>

          {/* Right Column: Detailed Product Information & Purchase */}
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-slate-900">{selectedProduct.name}</h2>
            </div>


            {/* Price & Payment Tag */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 block uppercase font-medium">Unit Price</span>
                {offerInfo.hasOffer ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-emerald-700">₹{offerInfo.finalPrice}</span>
                    <span className="text-sm text-slate-400 line-through">₹{offerInfo.originalPrice}</span>
                    <span className="bg-amber-100 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Tag className="w-3 h-3 text-amber-700" />
                      {offerInfo.discountPercentage}% OFF
                    </span>
                  </div>
                ) : (
                  <span className="text-3xl font-extrabold text-slate-900">₹{selectedProduct.price}</span>
                )}
              </div>

              <div className="text-right">
                <span className="bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full inline-block">
                  Advance UPI / Transfer
                </span>
                <span className="text-xs text-slate-500 block mt-1">Direct Warehouse Dispatch</span>
              </div>
            </div>

            {/* Shelf Life Info */}
            <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100 flex items-center justify-between text-xs">
              <span className="text-emerald-800 font-bold uppercase">Product Shelf Life</span>
              <span className="font-semibold text-slate-900">{selectedProduct.details.shelfLife || '12 Months'}</span>
            </div>


            {/* How to Use Steps */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Application Method</h4>
              <ul className="space-y-1.5 text-xs text-slate-700">
                {selectedProduct.details.howToUse.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Quantity Selector & Add to Cart Button (Only for Buyer Role) */}
            {currentUser.role === 'buyer' ? (
              <div className="pt-4 border-t border-slate-100 flex items-center gap-4">
                <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-8 h-8 rounded-lg bg-white shadow-xs text-slate-700 font-bold flex items-center justify-center hover:bg-slate-100"
                  >
                    -
                  </button>
                  <span className="w-10 text-center font-bold text-sm text-slate-900">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-8 h-8 rounded-lg bg-white shadow-xs text-slate-700 font-bold flex items-center justify-center hover:bg-slate-100"
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={handleAddToCart}
                  disabled={added}
                  className={`flex-1 py-3.5 px-6 rounded-xl font-bold text-sm text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
                    added
                      ? 'bg-emerald-800'
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30 active:scale-98'
                  }`}
                >
                  {added ? (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Added to Cart!</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5" />
                      <span>Add to Cart (Total: ₹{(offerInfo.hasOffer ? offerInfo.finalPrice : selectedProduct.price) * quantity})</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="pt-4 border-t border-slate-100">
                <div className="bg-slate-100 text-slate-700 p-3.5 rounded-xl text-xs font-semibold text-center border border-slate-200">
                  Catalogue Preview — Purchasing is reserved for Buyer Accounts.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
