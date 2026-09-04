'use client'

import React, { useState, useEffect } from 'react'
import { useApp } from '@/lib/app-context'
import { Product } from '@/lib/data'
import { ShoppingCart, Eye, Plus, Check, Tag, Trash2, Search, Package, ShieldCheck, Warehouse, Minus } from 'lucide-react'
import { ProductEditModal } from './product-edit-modal'

// Helper component for loading external images
function ImageWithLoader({ src, alt, className }: { src: string; alt: string; className: string }) {
  const [hasError, setHasError] = useState(false)

  if (hasError) {
    return (
      <div className={`${className} bg-slate-100 flex flex-col items-center justify-center p-4 text-center rounded-xl`}>
        <Package className="w-10 h-10 text-slate-400 mb-1" />
        <span className="text-xs font-bold text-slate-500">{alt}</span>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
    />
  )
}

export const ProductCatalog: React.FC = () => {
  const { products, currentUser, offers, setSelectedProduct, addToCart, cart, updateCartItemQuantity, getProductOfferInfo, updateProduct, secondaryCategories } = useApp()
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [selectedSegment, setSelectedSegment] = useState<'all' | 'bulk' | 'non-bulk'>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [addedNotice, setAddedNotice] = useState<string | null>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  // A tag/secondary-category pill is only shown if at least one product currently carries it.
  // Products can carry multiple tags, so pills map to "any product has this tag in its list".
  const visibleSecondaryCategories = secondaryCategories.filter((cat) =>
    products.some((p) => p.secondary_category_ids?.includes(cat.id))
  )

  // If the selected pill's tag no longer has any matching products (last product
  // untagged/deleted), fall back to "All" instead of showing an empty grid with no active pill.
  useEffect(() => {
    if (selectedCategory !== 'All' && !visibleSecondaryCategories.some((c) => c.id === selectedCategory)) {
      setSelectedCategory('All')
    }
  }, [selectedCategory, visibleSecondaryCategories])

  // Filter products by secondary category tag, search query & main_category.
  // "All" plus every tag that has at least one product shows up as a pill —
  // adding a new secondary category in the admin dashboard adds a pill here automatically
  // once a product is tagged with it, and the pill disappears again if no product uses it.
  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'All' || p.secondary_category_ids?.includes(selectedCategory)
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.benefit.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.crops.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesSegment =
      selectedSegment === 'all' ||
      (selectedSegment === 'bulk' && p.main_category === 'bulk') ||
      (selectedSegment === 'non-bulk' && p.main_category === 'non_bulk')

    return matchesCategory && matchesSearch && matchesSegment
  })

  // Filter Bulk vs Non-Bulk Products for display grouping
  const bulkProducts = filteredProducts.filter((p) => p.main_category === 'bulk')
  const nonBulkProducts = filteredProducts.filter((p) => p.main_category === 'non_bulk')

  // Active Direct Offers List
  const activeOffers = offers.filter((o) => o.active)

  const handleQuickAdd = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation()
    const addQty = product.main_category === 'bulk' ? (product.moq || 20) : 1
    addToCart(product.id, addQty)
    setAddedNotice(product.name)
    setTimeout(() => setAddedNotice(null), 2000)
  }

  const updateCartQty = (productId: string, newQty: number, e: React.MouseEvent) => {
    e.stopPropagation()
    updateCartItemQuantity(productId, newQty)
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Role Notice Banner */}
      {currentUser.role !== 'buyer' && (
        <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-md flex items-center justify-between border border-slate-800">
          <div className="flex items-center gap-3">
            {currentUser.role === 'warehouse' ? (
              <Warehouse className="w-5 h-5 text-amber-400" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
            )}
            <div>
              <span className="font-bold text-sm block">
                {currentUser.role === 'warehouse' ? 'Warehouse Mode' : 'Admin Mode'}: Product Inspection
              </span>
              <span className="text-xs text-slate-400">
                Viewing live catalog prices, MOQ limits, and active offers.
              </span>
            </div>
          </div>
          <span className="text-xs font-mono font-bold bg-white/10 px-3 py-1 rounded-full uppercase">
            {currentUser.role} view
          </span>
        </div>
      )}

      {/* Active Admin Direct Offers Banner */}
      {activeOffers.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white rounded-2xl p-5 shadow-xl border border-emerald-600/30 relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-amber-300 shrink-0 border border-white/20">
                <Tag className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-amber-400 text-emerald-950 font-black text-xs px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Direct Special Offers Active
                  </span>
                </div>
                <h3 className="text-lg font-bold mt-1 text-white flex items-center gap-2">
                  Instant Discounts Applied Directly in Catalogue!
                </h3>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Catalog Search & Category Filters */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 no-scrollbar">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 'All'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 scale-102'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
            }`}
          >
            All
          </button>
          {visibleSecondaryCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 scale-102'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search bio-fertilizers, crops..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Notice Toast */}
      {addedNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-emerald-700 animate-slide-in-up">
          <Check className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-semibold">{addedNotice} added to cart!</span>
        </div>
      )}

      {/* Segment Filter Tabs (BULK / Non-BULK) */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
          <Package className="w-3.5 h-3.5" />
          Category:
        </span>
        {[
          { key: 'all' as const, label: 'All Products' },
          { key: 'bulk' as const, label: 'BULK Products' },
          { key: 'non-bulk' as const, label: 'Non-BULK / Retail' },
        ].map((seg) => (
          <button
            key={seg.key}
            onClick={() => setSelectedSegment(seg.key)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedSegment === seg.key
                ? seg.key === 'bulk'
                  ? 'bg-amber-600 text-white shadow-md'
                  : seg.key === 'non-bulk'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {seg.label}
          </button>
        ))}
      </div>

      {/* Products Grid — Grouped by Main Category */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <p className="text-slate-500 font-medium">No bio-products found matching your search.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {(selectedSegment === 'all' || selectedSegment === 'bulk') && bulkProducts.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2 border-b border-amber-200 pb-2">
                <span className="text-xl font-extrabold text-amber-900 flex items-center gap-2">
                  📦 BULK Products
                </span>
                <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  Minimum Order Quantities Apply
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bulkProducts.map((p) => (
                  <ProductCard
                    key={p.id}
                    p={p}
                    offerInfo={getProductOfferInfo(p.id)}
                    currentUser={currentUser}
                    setSelectedProduct={setSelectedProduct}
                    handleQuickAdd={handleQuickAdd}
                    cart={cart}
                    updateCartQty={updateCartQty}
                    setEditingProduct={setEditingProduct}
                  />
                ))}
              </div>
            </section>
          )}

          {(selectedSegment === 'all' || selectedSegment === 'non-bulk') && nonBulkProducts.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2 border-b border-blue-200 pb-2">
                <span className="text-xl font-extrabold text-blue-900 flex items-center gap-2">
                  🏷️ Non-BULK Products
                </span>
                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  Retail & Specialty Formulations
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {nonBulkProducts.map((p) => (
                  <ProductCard
                    key={p.id}
                    p={p}
                    offerInfo={getProductOfferInfo(p.id)}
                    currentUser={currentUser}
                    setSelectedProduct={setSelectedProduct}
                    handleQuickAdd={handleQuickAdd}
                    cart={cart}
                    updateCartQty={updateCartQty}
                    setEditingProduct={setEditingProduct}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Product Edit Modal */}
      <ProductEditModal
        product={editingProduct}
        isOpen={!!editingProduct}
        onClose={() => setEditingProduct(null)}
        onSuccess={() => {
          setAddedNotice(`${editingProduct?.name} updated successfully!`)
          setTimeout(() => setAddedNotice(null), 2000)
        }}
      />
    </div>
  )
}

/* Reusable Product Card Renderer */
function ProductCard({ p, offerInfo, currentUser, setSelectedProduct, handleQuickAdd, cart, updateCartQty, setEditingProduct }: any) {
  const { deleteProduct } = useApp()
  const cartItem = cart.find((item: any) => item.productId === p.id)
  const qtyInCart = cartItem ? cartItem.quantity : 0
  const isBulk = p.main_category === 'bulk'
  const moqVal = isBulk ? (p.moq || 20) : 1

  // Check if user is warehouse role
  const isWarehouse = currentUser.role === 'warehouse'
  const canEditProduct = isWarehouse || currentUser.role === 'admin' || currentUser.role === 'super_admin'
  const canDeleteProduct = currentUser.role === 'admin' || currentUser.role === 'super_admin'

  return (
    <div
      key={p.id}
      className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-emerald-300 transition-all duration-300 flex flex-col justify-between overflow-hidden group"
    >
      <div>
        {/* Image Container with Badges */}
        <div
          onClick={() => setSelectedProduct(p)}
          className="relative aspect-4/3 bg-slate-50 overflow-hidden cursor-pointer p-4 flex items-center justify-center group-hover:bg-emerald-50/30 transition-colors"
        >
          {/* Main Category Badge */}
          <span className={`absolute bottom-3 left-3 text-[10px] font-black uppercase px-2 py-0.5 rounded-md z-10 ${
            isBulk ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-blue-100 text-blue-900 border border-blue-300'
          }`}>
            {isBulk ? `📦 BULK (MOQ: ${moqVal})` : '🏷️ Non-BULK'}
          </span>

          {/* Direct Offer Badge */}
          {offerInfo.hasOffer && (
            <span className="absolute top-3 left-3 bg-amber-500 text-slate-950 text-xs font-black px-3 py-1 rounded-full shadow-md z-10 flex items-center gap-1">
              <Tag className="w-3 h-3" />
              {offerInfo.discountPercentage}% OFF
            </span>
          )}

          <span className="absolute top-3 right-3 bg-white/80 backdrop-blur-md text-slate-700 text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Eye className="w-3.5 h-3.5 text-emerald-600" />
            View Details
          </span>

          <ImageWithLoader
            src={p.image}
            alt={p.name}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
          />
        </div>

        {/* Info Content */}
        <div className="p-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 mb-1">
            <span>{p.category}</span>
            <span>•</span>
            <span className="text-slate-500 font-normal">{p.packSize}</span>
          </div>

          <h3
            onClick={() => setSelectedProduct(p)}
            className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors cursor-pointer line-clamp-2"
          >
            {p.name}
          </h3>

          {offerInfo.hasOffer && (
            <div className="mt-2 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg inline-block">
              Direct Offer: {offerInfo.offerTitle}
            </div>
          )}
        </div>
      </div>

      {/* Price & Action Stepper */}
      <div className="p-5 pt-0 border-t border-slate-100 mt-4 flex items-center justify-between gap-3">
        <div>
          <span className="text-xs text-slate-400 block font-medium">Price</span>
          {offerInfo.hasOffer ? (
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-black text-emerald-700">₹{offerInfo.finalPrice}/unit</span>
                <span className="text-xs text-slate-400 line-through">₹{offerInfo.originalPrice}</span>
              </div>
              {isBulk && (
                <span className="text-[11px] font-bold text-amber-800 block">
                  (₹{(offerInfo.finalPrice * moqVal).toLocaleString('en-IN')} for MOQ of {moqVal} units)
                </span>
              )}
            </div>
          ) : (
            <div>
              <span className="text-lg font-black text-slate-900">₹{p.price}/unit</span>
              {isBulk && (
                <span className="text-[11px] font-bold text-amber-800 block">
                  (₹{(p.price * moqVal).toLocaleString('en-IN')} for MOQ of {moqVal} units)
                </span>
              )}
            </div>
          )}
        </div>

        {/* Add / Stepper OR Edit/Delete (for Warehouse/Admin) */}
        {canEditProduct && isWarehouse ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setEditingProduct(p)
            }}
            className="py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
            title="Edit product details"
          >
            <Eye className="w-4 h-4 text-blue-600" />
            <span>Edit Product</span>
          </button>
        ) : canDeleteProduct ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (confirm(`Are you sure you want to delete "${p.name}" from the catalogue?`)) {
                deleteProduct(p.id)
              }
            }}
            className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
            title="Delete product from catalogue"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span>Delete</span>
          </button>
        ) : qtyInCart === 0 ? (
          <button
            onClick={(e) => handleQuickAdd(p, e)}
            className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Add {isBulk ? `(${moqVal} MOQ)` : ''}</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-xl p-1 shrink-0">
            <button
              onClick={(e) => updateCartQty(p.id, Math.max(0, qtyInCart - moqVal), e)}
              className="w-7 h-7 bg-white rounded-lg flex items-center justify-center text-emerald-700 font-bold hover:bg-emerald-100 transition-colors shadow-xs cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            <span className="text-xs font-black text-emerald-950 px-2 min-w-[24px] text-center">
              {qtyInCart}
            </span>

            <button
              onClick={(e) => updateCartQty(p.id, qtyInCart + moqVal, e)}
              className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
