'use client'

import React, { useState, useEffect } from 'react'
import { useApp } from '@/lib/app-context'
import { Product, MainCategory } from '@/lib/data'
import { X, Save, Upload, AlertCircle, CheckCircle2, Package } from 'lucide-react'

interface ProductEditModalProps {
  product: Product | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export const ProductEditModal: React.FC<ProductEditModalProps> = ({ product, isOpen, onClose, onSuccess }) => {
  const { updateProduct, secondaryCategories, addSecondaryCategory } = useApp()

  const [prodName, setProdName] = useState('')
  const [mainCategory, setMainCategory] = useState<MainCategory>('bulk')
  const [secondaryCategoryIds, setSecondaryCategoryIds] = useState<string[]>([])
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [moqInput, setMoqInput] = useState<number | ''>(20)
  const [prodCategory, setProdCategory] = useState<'Bio-Fertilizer' | 'Biopesticide' | 'Growth Promoter'>('Bio-Fertilizer')
  const [prodPrice, setProdPrice] = useState<number>(500)
  const [prodPackSize, setProdPackSize] = useState('1 Litre Bottle')
  const [prodStrain, setProdStrain] = useState('')
  const [prodBenefit, setProdBenefit] = useState('')
  const [prodMainImage, setProdMainImage] = useState('/products/azospirillum.png')
  const [prodFieldImage, setProdFieldImage] = useState('/products/azospirillum-field.png')
  const [prodDescription, setProdDescription] = useState('')
  const [prodStock, setProdStock] = useState<number>(100)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Load product data when modal opens
  useEffect(() => {
    if (isOpen && product) {
      setProdName(product.name)
      setMainCategory(product.main_category)
      setSecondaryCategoryIds(product.secondary_category_ids || [])
      setMoqInput(product.moq || '')
      setProdCategory(product.category)
      setProdPrice(product.price)
      setProdPackSize(product.packSize)
      setProdStrain(product.strain)
      setProdBenefit(product.benefit)
      setProdMainImage(product.image)
      setProdFieldImage(product.images[1] || product.image)
      setProdDescription(product.details?.description || '')
      setProdStock(product.stock)
    }
  }, [isOpen, product])

  if (!isOpen || !product) return null

  const handleAddNewCategoryInline = async () => {
    const cleanName = newCategoryName.trim()
    if (!cleanName) return
    setFormError(null)

    try {
      const created = await addSecondaryCategory(cleanName)
      if (created) {
        setSecondaryCategoryIds((prev) => (prev.includes(created.id) ? prev : [...prev, created.id]))
      }
      setNewCategoryName('')
      setIsAddingNewCategory(false)
    } catch (err: any) {
      setFormError(err.message || `Category "${cleanName}" already exists or could not be added.`)
    }
  }

  const toggleSecondaryCategoryTag = (id: string) => {
    setSecondaryCategoryIds((prev) => (prev.includes(id) ? prev.filter((existing) => existing !== id) : [...prev, id]))
  }

  const handleMainImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setProdMainImage(reader.result)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleFieldImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setProdFieldImage(reader.result)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!prodName.trim()) {
      setFormError('Product Name is required.')
      return
    }

    if (mainCategory === 'bulk' && (!moqInput || Number(moqInput) < 1)) {
      setFormError('Minimum Order Quantity (MOQ) must be at least 1 unit for Bulk products.')
      return
    }

    setIsSaving(true)

    try {
      const updated = await updateProduct(product.id, {
        name: prodName,
        category: prodCategory,
        main_category: mainCategory,
        secondary_category_ids: secondaryCategoryIds,
        moq: mainCategory === 'bulk' ? Number(moqInput) : undefined,
        strain: prodStrain || 'Standard High-Efficiency Strain',
        crops: prodBenefit ? [prodBenefit] : product.crops,
        benefit: prodBenefit || 'Enhances crop yield and plant immunity.',
        price: Number(prodPrice),
        packSize: prodPackSize,
        image: prodMainImage,
        images: [prodMainImage, prodFieldImage],
        stock: prodStock,
        badge: mainCategory === 'bulk' ? 'Bulk Pack' : 'Standard',
        details: {
          description: prodDescription || 'High potency agricultural formulation.',
          howToUse: product.details?.howToUse || ['Mix with water and apply as directed.'],
          dosage: product.details?.dosage || '1 Litre / Acre',
          targetCrops: product.details?.targetCrops || ['All Crops'],
          shelfLife: product.details?.shelfLife || '12 Months',
          certification: product.details?.certification || ['Organic Input'],
          composition: prodStrain || 'Active Formulation'
        }
      })

      if (updated) {
        onSuccess()
        onClose()
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to save changes. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 relative my-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-slate-100 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
              <Package className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Edit Product Details</h3>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSaveProduct} className="p-6 space-y-6">
          {formError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Category Section */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Category & Sales Segment</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Main Category */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Main Category *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMainCategory('bulk')}
                    className={`py-3 px-4 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                      mainCategory === 'bulk'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    Bulk Sale
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMainCategory('non_bulk')
                      setMoqInput('')
                    }}
                    className={`py-3 px-4 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                      mainCategory === 'non_bulk'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    Non-Bulk / Retail
                  </button>
                </div>
              </div>

              {/* Secondary Category Tags (multi-select) */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Secondary Category Tags <span className="text-slate-400 font-normal">(select any number)</span>
                </label>
                <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl border border-slate-200 bg-white min-h-[44px]">
                  {secondaryCategories.length === 0 && !isAddingNewCategory && (
                    <span className="text-xs text-slate-400 py-1">No tags yet — add one below.</span>
                  )}
                  {secondaryCategories.map((sc) => {
                    const isSelected = secondaryCategoryIds.includes(sc.id)
                    return (
                      <button
                        key={sc.id}
                        type="button"
                        onClick={() => toggleSecondaryCategoryTag(sc.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {isSelected && '✓ '}{sc.name}
                      </button>
                    )
                  })}
                  <button
                    type="button"
                    onClick={() => setIsAddingNewCategory(true)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold border border-dashed border-emerald-300 text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                  >
                    + New Tag
                  </button>
                </div>

                {isAddingNewCategory && (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="text"
                      placeholder="Enter tag name"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddNewCategoryInline}
                      className="px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 cursor-pointer"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingNewCategory(false)}
                      className="px-2 py-2 text-slate-500 text-xs hover:text-slate-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pricing & MOQ Section */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Pricing & MOQ</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Per-Unit Price (₹) *</label>
                <input
                  type="number"
                  min={1}
                  value={prodPrice}
                  onChange={(e) => setProdPrice(Number(e.target.value))}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>

              {mainCategory === 'bulk' && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Minimum Order Quantity (units) *</label>
                  <input
                    type="number"
                    min={1}
                    value={moqInput}
                    onChange={(e) => setMoqInput(e.target.value === '' ? '' : Number(e.target.value))}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Stock Quantity</label>
                <input
                  type="number"
                  min={0}
                  value={prodStock}
                  onChange={(e) => setProdStock(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Product Details */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Product Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Product Name *</label>
                <input
                  type="text"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Product Category *</label>
                <select
                  value={prodCategory}
                  onChange={(e) => setProdCategory(e.target.value as any)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="Bio-Fertilizer">Bio-Fertilizer</option>
                  <option value="Biopesticide">Biopesticide</option>
                  <option value="Growth Promoter">Growth Promoter</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Pack Size</label>
                <input
                  type="text"
                  value={prodPackSize}
                  onChange={(e) => setProdPackSize(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Strain/Composition</label>
                <input
                  type="text"
                  value={prodStrain}
                  onChange={(e) => setProdStrain(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Benefit / Key Feature</label>
              <input
                type="text"
                value={prodBenefit}
                onChange={(e) => setProdBenefit(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Description</label>
              <textarea
                value={prodDescription}
                onChange={(e) => setProdDescription(e.target.value)}
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>
          </div>

          {/* Images */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Product Images</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Main Product Image</label>
                <div className="flex items-center gap-3">
                  <img src={prodMainImage} alt="Main" className="w-16 h-16 rounded-xl object-cover border border-slate-200" />
                  <label className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer flex items-center justify-center gap-2 border border-slate-200 transition-colors">
                    <Upload className="w-4 h-4" />
                    <span>Upload New</span>
                    <input type="file" accept="image/*" onChange={handleMainImageFileUpload} className="hidden" />
                  </label>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Field/Application Image</label>
                <div className="flex items-center gap-3">
                  <img src={prodFieldImage} alt="Field" className="w-16 h-16 rounded-xl object-cover border border-slate-200" />
                  <label className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer flex items-center justify-center gap-2 border border-slate-200 transition-colors">
                    <Upload className="w-4 h-4" />
                    <span>Upload New</span>
                    <input type="file" accept="image/*" onChange={handleFieldImageFileUpload} className="hidden" />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-2 border-t border-slate-200">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
