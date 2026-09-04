'use client'

import React, { useState, useEffect } from 'react'
import { useApp } from '@/lib/app-context'
import {
  ShieldCheck,
  Tag,
  Users,
  Plus,
  Trash2,
  CheckCircle2,
  Warehouse,
  User,
  Sparkles,
  Percent,
  CheckSquare,
  Square,
  Package,
  PlusCircle,
  Image as ImageIcon,
  Upload,
  PhoneCall,
  AlertCircle,
  MessageSquareCheck,
  Send,
  Save,
  X,
  Mail,
  Crown,
  ArrowRight,
  Eye
} from 'lucide-react'
import { MainCategory, Role, UserAccount } from '@/lib/data'
import { RoleChangeConfirmationModal, RoleChangeRequest } from './role-change-confirmation-modal'
import { fetchAppSettings, saveAppSettings } from '@/lib/settings-client'
import { AdminCompliancePanel } from './admin-compliance-panel'
import { Shield } from 'lucide-react'

export const AdminDashboard: React.FC = () => {
  const {
    offers,
    products,
    secondaryCategories,
    currentUser,
    warehouses,
    helplineNumber,
    helplineEmail,
    updateHelplineNumber,
    updateHelplineEmail,
    createOffer,
    toggleOfferActive,
    deleteOffer,
    addSecondaryCategory,
    addNewProduct,
    assignRoleToPhone,
    transferSuperAdmin,
    fetchUserAccounts
  } = useApp()

  const [activeAdminTab, setActiveAdminTab] = useState<'offers' | 'users' | 'add-product' | 'support' | 'payment' | 'compliance'>('offers')

  // User Accounts State
  const [adminUserAccounts, setAdminUserAccounts] = useState<UserAccount[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(true)
  const [assignPhoneInput, setAssignPhoneInput] = useState('')
  const [assignNameInput, setAssignNameInput] = useState('')
  const [assignRoleInput, setAssignRoleInput] = useState<Role>('admin')
  const [assignWhInput, setAssignWhInput] = useState<string>(warehouses[0]?.id || 'wh-central')
  const [roleFormNotice, setRoleFormNotice] = useState<string | null>(null)
  const [roleFormError, setRoleFormError] = useState<string | null>(null)

  // Role Change Confirmation State
  const [pendingRoleChange, setPendingRoleChange] = useState<RoleChangeRequest | null>(null)
  const [isApplyingRoleChange, setIsApplyingRoleChange] = useState(false)

  // Super Admin Transfer Modal State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
  const [transferTargetPhone, setTransferTargetPhone] = useState('')
  const [transferTargetName, setTransferTargetName] = useState('')
  const [transferConfirmText, setTransferConfirmText] = useState('')
  const [transferError, setTransferError] = useState<string | null>(null)

  // Support Contact Settings State
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false)
  const [editingPhone, setEditingPhone] = useState(helplineNumber)
  const [editingEmail, setEditingEmail] = useState(helplineEmail)
  const [supportErrorMsg, setSupportErrorMsg] = useState<string | null>(null)
  const [isHelplineUpdatedNotice, setIsHelplineUpdatedNotice] = useState(false)

  // New Direct Offer Form State
  const [offerTitle, setOfferTitle] = useState('')
  const [discountPercent, setDiscountPercent] = useState<number | ''>('')
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [isOfferAddedNotice, setIsOfferAddedNotice] = useState(false)
  const [offerError, setOfferError] = useState<string | null>(null)

  // New Product Form State
  const [newProdName, setNewProdName] = useState('')
  const [mainCategory, setMainCategory] = useState<MainCategory>('bulk')
  const [secondaryCategoryIds, setSecondaryCategoryIds] = useState<string[]>([])
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [moqInput, setMoqInput] = useState<number | ''>(20)
  const [newProdCategory, setNewProdCategory] = useState<'Bio-Fertilizer' | 'Biopesticide' | 'Growth Promoter'>('Bio-Fertilizer')
  const [newProdPrice, setNewProdPrice] = useState<number>(500)
  const [newProdPackSize, setNewProdPackSize] = useState('1 Litre Bottle')
  const [newProdStrain, setNewProdStrain] = useState('')
  const [newProdBenefit, setNewProdBenefit] = useState('')
  const [newProdMainImage, setNewProdMainImage] = useState('/products/azospirillum.png')
  const [newProdFieldImage, setNewProdFieldImage] = useState('/products/azospirillum-field.png')
  const [newProdDescription, setNewProdDescription] = useState('')
  const [isProductAddedNotice, setIsProductAddedNotice] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Payment Settings State
  const [paymentQrImage, setPaymentQrImage] = useState<string | null>(null)
  const [paymentUpiId, setPaymentUpiId] = useState('')
  const [paymentAccountDetails, setPaymentAccountDetails] = useState('')
  const [isPaymentSaving, setIsPaymentSaving] = useState(false)
  const [paymentSaveNotice, setPaymentSaveNotice] = useState<string | null>(null)

  // Load User Accounts list from API
  const reloadUserAccounts = async () => {
    setIsLoadingUsers(true)
    const list = await fetchUserAccounts()
    setAdminUserAccounts(list)
    setIsLoadingUsers(false)
  }

  useEffect(() => {
    reloadUserAccounts()
    
    // Load payment settings when switching to payment tab
    if (activeAdminTab === 'payment') {
      fetchAppSettings()
        .then((settings) => {
          if (settings?.paymentSettings) {
            setPaymentQrImage(settings.paymentSettings.qrCodeImage || null)
            setPaymentUpiId(settings.paymentSettings.upiId || '')
            setPaymentAccountDetails(settings.paymentSettings.accountDetails || '')
          }
        })
        .catch(err => console.error('Failed to load payment settings:', err))
    }
  }, [activeAdminTab])

  // Handle Inline Secondary Category Addition
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

  // Apply the role change the admin confirmed in the modal.
  const handleConfirmRoleChange = async () => {
    if (!pendingRoleChange) return

    setIsApplyingRoleChange(true)
    setRoleFormError(null)
    setRoleFormNotice(null)

    const { phone, name, toRole } = pendingRoleChange
    const res = await assignRoleToPhone(phone, toRole, name)

    setIsApplyingRoleChange(false)
    setPendingRoleChange(null)

    if (res.success) {
      setRoleFormNotice(`${name} (+91 ${phone}) is now ${toRole.replace('_', ' ')}.`)
      setTimeout(() => setRoleFormNotice(null), 4000)
      reloadUserAccounts()
    } else {
      setRoleFormError(res.error || 'Failed to change the role. Please try again.')
    }
  }

  // Handle Assigning Role
  const handleAssignRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setRoleFormNotice(null)
    setRoleFormError(null)

    const cleanedPhone = assignPhoneInput.replace(/[^0-9]/g, '').slice(-10)
    if (cleanedPhone.length !== 10) {
      setRoleFormError('Please enter a valid 10-digit phone number.')
      return
    }

    // Get current user's phone number
    const currentUserPhone = currentUser.phone?.replace(/[^0-9]/g, '').slice(-10)

    // SECURITY: Admin cannot assign warehouse role to themselves
    if (currentUser.role === 'admin' && cleanedPhone === currentUserPhone && assignRoleInput === 'warehouse') {
      setRoleFormError('⚠️ Security Restriction: You cannot assign warehouse role to yourself. Only Super Admin can change your role.')
      return
    }

    // SECURITY: Regular admin cannot assign super_admin role to anyone
    if (currentUser.role === 'admin' && assignRoleInput === 'super_admin') {
      setRoleFormError('⚠️ Access Denied: Only Super Admin can assign super_admin role. Use the "Transfer Super Admin" feature instead.')
      return
    }

    const res = await assignRoleToPhone(cleanedPhone, assignRoleInput, assignNameInput || undefined, assignWhInput)
    if (res.success) {
      setRoleFormNotice(`Successfully assigned ${assignRoleInput} role to +91 ${cleanedPhone}`)
      setAssignPhoneInput('')
      setAssignNameInput('')
      reloadUserAccounts()
    } else {
      setRoleFormError(res.error || 'Failed to assign role.')
    }
  }

  // Handle Super Admin Transfer Submit
  const handleTransferSuperAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTransferError(null)

    const cleanedPhone = transferTargetPhone.replace(/[^0-9]/g, '').slice(-10)
    if (cleanedPhone.length !== 10) {
      setTransferError('Please enter a valid 10-digit phone number.')
      return
    }

    if (transferConfirmText.trim().toUpperCase() !== 'CONFIRM') {
      setTransferError('Please type CONFIRM in the text box to verify this transfer.')
      return
    }

    const res = await transferSuperAdmin(cleanedPhone, transferTargetName || undefined)
    if (res.success) {
      setIsTransferModalOpen(false)
      setTransferTargetPhone('')
      setTransferTargetName('')
      setTransferConfirmText('')
      reloadUserAccounts()
    } else {
      setTransferError(res.error || 'Failed to transfer Super Admin role.')
    }
  }

  // Support Contact Save Handler
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

    updateHelplineNumber(cleanPhone)
    updateHelplineEmail(cleanEmail)
    setIsSupportModalOpen(false)
    setIsHelplineUpdatedNotice(true)
    setTimeout(() => setIsHelplineUpdatedNotice(false), 3000)
  }

  const handleToggleProductSelection = (prodId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(prodId) ? prev.filter((id) => id !== prodId) : [...prev, prodId]
    )
  }

  const handleSelectAllProducts = () => {
    if (selectedProductIds.length === products.length) {
      setSelectedProductIds([])
    } else {
      setSelectedProductIds(products.map((p) => p.id))
    }
  }

  const handleCreateOfferSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setOfferError(null)
    if (!offerTitle || !discountPercent || selectedProductIds.length === 0) return

    try {
      await createOffer({
        title: offerTitle,
        discountPercentage: Number(discountPercent),
        active: true,
        productIds: selectedProductIds
      })

      setOfferTitle('')
      setDiscountPercent('')
      setSelectedProductIds([])
      setIsOfferAddedNotice(true)
      setTimeout(() => setIsOfferAddedNotice(false), 4000)
    } catch (err: any) {
      setOfferError(err?.message || 'Could not save the offer. Please try again.')
    }
  }

  const handleMainImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setNewProdMainImage(reader.result)
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
          setNewProdFieldImage(reader.result)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCreateProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!newProdName.trim()) {
      setFormError('Product Name is required.')
      return
    }

    if (mainCategory === 'bulk' && (!moqInput || Number(moqInput) < 1)) {
      setFormError('Minimum Order Quantity (MOQ) must be at least 1 unit for Bulk products.')
      return
    }

    try {
      const created = await addNewProduct({
        name: newProdName,
        category: newProdCategory,
        main_category: mainCategory,
        secondary_category_ids: secondaryCategoryIds,
        moq: mainCategory === 'bulk' ? Number(moqInput) : undefined,
        strain: newProdStrain || 'Standard High-Efficiency Strain',
        crops: newProdBenefit ? [newProdBenefit] : ['Paddy', 'Sugarcane', 'Cotton'],
        benefit: newProdBenefit || 'Enhances crop yield and plant immunity.',
        price: Number(newProdPrice),
        packSize: newProdPackSize,
        image: newProdMainImage,
        images: [newProdMainImage, newProdFieldImage],
        stock: 100,
        badge: mainCategory === 'bulk' ? 'Bulk Pack' : 'Standard',
        details: {
          description: newProdDescription || 'High potency agricultural formulation.',
          howToUse: ['Mix with water and apply as directed.'],
          dosage: '1 Litre / Acre',
          targetCrops: ['All Crops'],
          shelfLife: '12 Months',
          certification: ['Organic Input'],
          composition: newProdStrain || 'Active Formulation'
        }
      })

      if (created) {
        setNewProdName('')
        setNewProdStrain('')
        setNewProdBenefit('')
        setNewProdDescription('')
        setNewProdMainImage('/products/azospirillum.png')
        setNewProdFieldImage('/products/azospirillum-field.png')
        setSecondaryCategoryIds([])
        setIsProductAddedNotice(true)
        setTimeout(() => setIsProductAddedNotice(false), 4000)
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to save product. Please try again.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-indigo-900/50">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider border border-indigo-500/30 flex items-center gap-1">
              {currentUser.role === 'super_admin' ? (
                <>
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  Super Admin Controls
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Admin Controls
                </>
              )}
            </span>
          </div>
          <h1 className="text-2xl font-black mt-2">Bio-Bramha Administration</h1>
          <p className="text-xs text-slate-300 mt-1">
            Manage product catalog, MOQ pricing, direct discounts, helpline settings, and user role privileges.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingPhone(helplineNumber)
            setEditingEmail(helplineEmail)
            setSupportErrorMsg(null)
            setIsSupportModalOpen(true)
          }}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
        >
          <PhoneCall className="w-4 h-4" />
          <span>Support Contact Settings</span>
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveAdminTab('offers')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeAdminTab === 'offers'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Direct Offers & Discounts ({offers.length})</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('add-product')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeAdminTab === 'add-product'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          <span>Upload & Edit Product</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('users')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeAdminTab === 'users'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Role Management & Privileges</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('payment')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeAdminTab === 'payment'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Payment Settings</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('compliance')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeAdminTab === 'compliance'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Legal & Compliance</span>
        </button>
      </div>

      {/* TAB: LEGAL & COMPLIANCE (policy uploads, data notice, grievance contact) */}
      {activeAdminTab === 'compliance' && <AdminCompliancePanel />}

      {/* TAB 1: ADD PRODUCT FORM (Category & MOQ Support) */}
      {activeAdminTab === 'add-product' && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Upload & Edit Product</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Add new agricultural products with Category and Bulk MOQ controls.
            </p>
          </div>

          {formError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {isProductAddedNotice && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Product successfully uploaded to catalog!</span>
            </div>
          )}

          <form onSubmit={handleCreateProductSubmit} className="space-y-6">
            {/* Category Section */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">1. Category & Sales Segment</h3>
              
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
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">2. Pricing & Minimum Order Quantity</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Per-Unit Price (₹) *</label>
                  <input
                    type="number"
                    min={1}
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(Number(e.target.value))}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Price for 1 individual unit entered by admin.</p>
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
                    <p className="text-[11px] text-slate-500 mt-1">Required for Bulk products. Minimum order quantity threshold.</p>
                  </div>
                )}
              </div>

              {/* Price Preview */}
              <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700">
                <span className="font-bold">Price Display Preview: </span>
                {mainCategory === 'bulk' ? (
                  <span className="font-semibold text-emerald-800">
                    ₹{newProdPrice}/unit — ₹{newProdPrice * (Number(moqInput) || 20)} for MOQ of {Number(moqInput) || 20} units
                  </span>
                ) : (
                  <span className="font-semibold text-emerald-800">₹{newProdPrice}</span>
                )}
              </div>
            </div>

            {/* Product Details Section */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">3. General Details</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Product Name *</label>
                  <input
                    type="text"
                    value={newProdName}
                    onChange={(e) => setNewProdName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Pack Size *</label>
                  <input
                    type="text"
                    value={newProdPackSize}
                    onChange={(e) => setNewProdPackSize(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Active Strain / Composition</label>
                  <input
                    type="text"
                    value={newProdStrain}
                    onChange={(e) => setNewProdStrain(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Primary Benefit</label>
                  <input
                    type="text"
                    value={newProdBenefit}
                    onChange={(e) => setNewProdBenefit(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Detailed Description</label>
                <textarea
                  rows={3}
                  value={newProdDescription}
                  onChange={(e) => setNewProdDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>
            </div>

            {/* Product Photos & Media Section */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">4. Product Photos & Media</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Main Product Image */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-700 block">Primary Product Photo *</label>
                  
                  <div className="flex items-start gap-4 p-3 bg-white rounded-xl border border-slate-200">
                    <div className="w-20 h-20 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center relative">
                      {newProdMainImage ? (
                        <img src={newProdMainImage} alt="Main Preview" className="w-full h-full object-contain" />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-slate-400" />
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <div>
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200 cursor-pointer transition-colors">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload Local Photo</span>
                          <input type="file" accept="image/*" onChange={handleMainImageFileUpload} className="hidden" />
                        </label>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-500 font-semibold block mb-1">Or enter image URL:</label>
                        <input
                          type="text"
                          placeholder="https://example.com/photo.png"
                          value={newProdMainImage}
                          onChange={(e) => setNewProdMainImage(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50"
                        />
                      </div>
                    </div>
                  </div>

                </div>

                {/* Secondary / Field Image */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-700 block">Field / Application Photo</label>
                  
                  <div className="flex items-start gap-4 p-3 bg-white rounded-xl border border-slate-200">
                    <div className="w-20 h-20 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center relative">
                      {newProdFieldImage ? (
                        <img src={newProdFieldImage} alt="Field Preview" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-slate-400" />
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <div>
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200 cursor-pointer transition-colors">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload Field Photo</span>
                          <input type="file" accept="image/*" onChange={handleFieldImageFileUpload} className="hidden" />
                        </label>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-500 font-semibold block mb-1">Or enter image URL:</label>
                        <input
                          type="text"
                          placeholder="https://example.com/field-photo.png"
                          value={newProdFieldImage}
                          onChange={(e) => setNewProdFieldImage(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50"
                        />
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            <button
              type="submit"
              className="py-3 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Save & Publish Product</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 2: ROLE MANAGEMENT & PRIVILEGES */}
      {activeAdminTab === 'users' && (
        <div className="space-y-6">
          {/* Assign Role Form */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
            <h2 className="text-base font-bold text-slate-900">Assign Role & Pre-Provision Privileges</h2>
            <p className="text-xs text-slate-500">
              Enter any 10-digit mobile number to grant Admin or Warehouse privileges (works even before user signs up).
            </p>

            {roleFormNotice && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{roleFormNotice}</span>
              </div>
            )}

            {roleFormError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{roleFormError}</span>
              </div>
            )}

            <form onSubmit={handleAssignRoleSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Mobile Phone Number *</label>
                <div className="flex items-center gap-1.5">
                  <span className="px-2.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-slate-100 text-slate-700">
                    +91
                  </span>
                  <input
                    type="tel"
                    placeholder=""
                    value={assignPhoneInput}
                    onChange={(e) => setAssignPhoneInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                    required
                    maxLength={10}
                    className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">User Name (Optional)</label>
                <input
                  type="text"
                  placeholder=""
                  value={assignNameInput}
                  onChange={(e) => setAssignNameInput(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Assigned Role *</label>
                <select
                  value={assignRoleInput}
                  onChange={(e) => setAssignRoleInput(e.target.value as Role)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
                >
                  <option value="buyer">Buyer (Regular User)</option>
                  <option value="admin">Admin</option>
                  {currentUser.role === 'super_admin' && (
                    <option value="warehouse">Warehouse Manager</option>
                  )}
                  {currentUser.role === 'admin' && (
                    <option value="warehouse" disabled title="Only Super Admin can assign Warehouse role to others. You cannot assign this to yourself.">
                      Warehouse Manager (Super Admin Only)
                    </option>
                  )}
                </select>
                {currentUser.role === 'admin' && assignRoleInput === 'warehouse' && (
                  <p className="text-[10px] text-amber-700 mt-1 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Only Super Admin can assign warehouse role
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer h-[42px]"
              >
                <Plus className="w-4 h-4" />
                <span>Assign Role</span>
              </button>
            </form>
          </div>

          {/* Accounts List */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
            <h2 className="text-base font-bold text-slate-900">Admin & Warehouse Accounts</h2>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
              {isLoadingUsers ? (
                <div className="p-8 text-center text-xs text-slate-500">Loading user accounts list...</div>
              ) : adminUserAccounts.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">No user accounts found.</div>
              ) : (
                adminUserAccounts.map((acc) => (
                  <div key={acc.phone} className="p-4 flex items-center justify-between gap-4 bg-white hover:bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm ${
                        acc.role === 'super_admin' ? 'bg-amber-100 text-amber-800' : acc.role === 'admin' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {acc.role === 'super_admin' ? <Crown className="w-5 h-5" /> : acc.role === 'admin' ? <ShieldCheck className="w-5 h-5" /> : <Warehouse className="w-5 h-5" />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{acc.name}</span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            acc.role === 'super_admin' ? 'bg-amber-100 text-amber-900 border border-amber-300' : acc.role === 'admin' ? 'bg-indigo-100 text-indigo-900' : 'bg-emerald-100 text-emerald-900'
                          }`}>
                            {acc.role}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-slate-500">+91 {acc.phone}</span>
                      </div>
                    </div>

                    {/* Actions for non-super_admin accounts */}
                    {acc.role !== 'super_admin' && (
                      <div className="flex items-center gap-2">
                        {/* Prevent admin from switching their own account to warehouse */}
                        {acc.role === 'admin' && acc.phone !== currentUser.phone && (
                          <button
                            onClick={() =>
                              setPendingRoleChange({
                                phone: acc.phone,
                                name: acc.name,
                                fromRole: acc.role,
                                toRole: 'warehouse'
                              })
                            }
                            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-bold border border-amber-200 cursor-pointer"
                          >
                            Switch to Warehouse
                          </button>
                        )}
                        
                        {/* Show locked indicator if admin is trying to modify their own account */}
                        {acc.role === 'admin' && acc.phone === currentUser.phone && currentUser.role === 'admin' && (
                          <div className="px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-xs font-bold border border-slate-200 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Your Account (Protected)</span>
                          </div>
                        )}
                        
                        {acc.role === 'warehouse' && (
                          <button
                            onClick={() =>
                              setPendingRoleChange({
                                phone: acc.phone,
                                name: acc.name,
                                fromRole: acc.role,
                                toRole: 'admin'
                              })
                            }
                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-lg text-xs font-bold border border-indigo-200 cursor-pointer"
                          >
                            Switch to Admin
                          </button>
                        )}
                        <button
                          onClick={() =>
                            setPendingRoleChange({
                              phone: acc.phone,
                              name: acc.name,
                              fromRole: acc.role,
                              toRole: 'buyer'
                            })
                          }
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold border border-rose-200 cursor-pointer"
                        >
                          Demote to Buyer
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Super Admin Transfer Section (Only visible to current super_admin) */}
          {currentUser.role === 'super_admin' && (
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent rounded-3xl p-6 border border-amber-200/80 space-y-4">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-600" />
                <h2 className="text-base font-bold text-amber-950">Transfer Super Admin Role</h2>
              </div>
              <p className="text-xs text-amber-900 leading-relaxed">
                As the active Super Admin, you can transfer your Super Admin role to another mobile number. 
                This operation is <strong>atomic</strong> — your account will automatically become a regular Admin.
              </p>

              <button
                onClick={() => {
                  setTransferError(null)
                  setTransferConfirmText('')
                  setIsTransferModalOpen(true)
                }}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Crown className="w-4 h-4" />
                <span>Initiate Super Admin Role Transfer</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DIRECT OFFERS & DISCOUNTS */}
      {activeAdminTab === 'offers' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
            <h2 className="text-base font-bold text-slate-900">Create Direct Product Discount</h2>

            {isOfferAddedNotice && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Direct discount offer activated successfully!</span>
              </div>
            )}

            {offerError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{offerError}</span>
              </div>
            )}

            <form onSubmit={handleCreateOfferSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Offer Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. Kharif Special 15% OFF"
                    value={offerTitle}
                    onChange={(e) => setOfferTitle(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Discount Percentage (%) *</label>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    placeholder="e.g. 15"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(e.target.value === '' ? '' : Number(e.target.value))}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700">Apply Offer to Products *</label>
                  <button
                    type="button"
                    onClick={handleSelectAllProducts}
                    className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
                  >
                    {selectedProductIds.length === products.length ? 'Deselect All' : 'Select All Products'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  {products.map((p) => (
                    <label
                      key={p.id}
                      className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                        selectedProductIds.includes(p.id)
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                          : 'bg-white border-slate-200 text-slate-700 font-medium'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedProductIds.includes(p.id)}
                        onChange={() => handleToggleProductSelection(p.id)}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-xs truncate">{p.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={!offerTitle || !discountPercent || selectedProductIds.length === 0}
                className="py-3 px-5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Tag className="w-4 h-4" />
                <span>Publish Offer</span>
              </button>
            </form>
          </div>

          {/* Active Offers List */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
            <h2 className="text-base font-bold text-slate-900">Active Direct Offers</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {offers.length === 0 ? (
                <div className="col-span-full p-8 text-center text-xs text-slate-400">No active offers created yet.</div>
              ) : (
                offers.map((off) => (
                  <div key={off.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{off.title}</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          {off.discountPercentage}% OFF
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Applies to {off.productIds.length} product(s)</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => {
                          setOfferError(null)
                          try {
                            await toggleOfferActive(off.id)
                          } catch (err: any) {
                            setOfferError(err?.message || 'Could not update the offer.')
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                          off.active ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {off.active ? 'Active' : 'Paused'}
                      </button>
                      <button
                        onClick={async () => {
                          setOfferError(null)
                          try {
                            await deleteOffer(off.id)
                          } catch (err: any) {
                            setOfferError(err?.message || 'Could not delete the offer.')
                          }
                        }}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete offer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUPER ADMIN TRANSFER CONFIRMATION MODAL */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-600">
                <Crown className="w-6 h-6" />
                <h3 className="text-lg font-bold text-slate-900">Transfer Super Admin</h3>
              </div>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This action will transfer the <strong>Super Admin</strong> role to the specified phone number.
              Your account will automatically revert to regular Admin.
            </p>

            {transferError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{transferError}</span>
              </div>
            )}

            <form onSubmit={handleTransferSuperAdminSubmit} className="space-y-3 text-left">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Target Phone Number *</label>
                <div className="flex items-center gap-1.5">
                  <span className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-slate-100 text-slate-700">
                    +91
                  </span>
                  <input
                    type="tel"
                    placeholder=""
                    value={transferTargetPhone}
                    onChange={(e) => setTransferTargetPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                    required
                    maxLength={10}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Target User Name (Optional)</label>
                <input
                  type="text"
                  placeholder=""
                  value={transferTargetName}
                  onChange={(e) => setTransferTargetName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-amber-900 block mb-1">Type CONFIRM to authorize *</label>
                <input
                  type="text"
                  placeholder="CONFIRM"
                  value={transferConfirmText}
                  onChange={(e) => setTransferConfirmText(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-amber-300 text-xs font-mono font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-500 bg-amber-50"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferConfirmText.trim().toUpperCase() !== 'CONFIRM'}
                  className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  Execute Role Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* SUCCESS TOAST FOR HELPLINE UPDATE */}
      {isHelplineUpdatedNotice && (
        <div className="fixed bottom-4 right-4 z-[9999] p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Support settings updated successfully!</span>
        </div>
      )}

      {/* SUPPORT CONTACT SETTINGS MODAL */}
      {isSupportModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-600">
                <PhoneCall className="w-6 h-6" />
                <h3 className="text-lg font-bold text-slate-900">Support Settings</h3>
              </div>
              <button
                onClick={() => setIsSupportModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Update the helpline phone number and support email address shown to buyers in their app.
            </p>

            {supportErrorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{supportErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveSupportModal} className="space-y-3 text-left">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Helpline Phone Number *</label>
                <div className="flex items-center gap-1.5">
                  <span className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-slate-100 text-slate-700">
                    +91
                  </span>
                  <input
                    type="tel"
                    placeholder="Enter 10-digit number"
                    value={editingPhone}
                    onChange={(e) => setEditingPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                    required
                    maxLength={10}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Support Email *</label>
                <div className="flex items-center gap-1.5">
                  <span className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-slate-100 text-slate-700">
                    <Mail className="w-4 h-4 text-slate-500" />
                  </span>
                  <input
                    type="email"
                    placeholder="support@bio-bramha.com"
                    value={editingEmail}
                    onChange={(e) => setEditingEmail(e.target.value)}
                    required
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSupportModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: PAYMENT SETTINGS */}
      {activeAdminTab === 'payment' && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Payment Settings Configuration</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure QR code, UPI ID, and bank account details shown to customers during checkout.
            </p>
          </div>

          {paymentSaveNotice && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{paymentSaveNotice}</span>
            </div>
          )}

          <form onSubmit={async (e) => {
            e.preventDefault()
            setIsPaymentSaving(true)
            setPaymentSaveNotice(null)

            try {
              const result = await saveAppSettings({
                paymentSettings: {
                  qrCodeImage: paymentQrImage,
                  upiId: paymentUpiId,
                  accountDetails: paymentAccountDetails
                }
              })

              if (result.success) {
                setPaymentSaveNotice('Payment settings saved successfully!')
                setTimeout(() => setPaymentSaveNotice(null), 3000)
              } else {
                setPaymentSaveNotice(null)
                alert('Failed to save: ' + (result.error || 'Unknown error'))
              }
            } catch (error: any) {
              alert('Error: ' + error.message)
            } finally {
              setIsPaymentSaving(false)
            }
          }} className="space-y-6">
            {/* QR Code Image Upload */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">QR Code for Payments</h3>
              
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">Payment QR Code Image</label>
                {paymentQrImage && (
                  <div className="mb-3 w-48 h-48 mx-auto bg-white border-4 border-blue-200 rounded-2xl p-3 shadow-lg">
                    <img src={paymentQrImage} alt="QR Code" className="w-full h-full object-contain" />
                  </div>
                )}
                <label className="w-full py-3 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 border-2 border-blue-200 rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center gap-2 transition-colors">
                  <Upload className="w-4 h-4" />
                  <span>{paymentQrImage ? 'Replace QR Code Image' : 'Upload QR Code Image'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const reader = new FileReader()
                        reader.onloadend = () => {
                          if (typeof reader.result === 'string') {
                            setPaymentQrImage(reader.result)
                          }
                        }
                        reader.readAsDataURL(file)
                      }
                    }}
                    className="hidden"
                  />
                </label>
                <p className="text-[11px] text-slate-500 mt-1">Upload a QR code image that customers can scan to make payments (PNG, JPG, max 2MB).</p>
              </div>
            </div>

            {/* UPI ID */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">UPI Payment Details</h3>
              
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">UPI ID</label>
                <input
                  type="text"
                  value={paymentUpiId}
                  onChange={(e) => setPaymentUpiId(e.target.value)}
                  placeholder="yourname@paytm or yourname@upi"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
                <p className="text-[11px] text-slate-500 mt-1">Enter your UPI ID for customers to make direct UPI payments.</p>
              </div>
            </div>

            {/* Bank Account Details */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Bank Account Details</h3>
              
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Bank Account Information</label>
                <textarea
                  value={paymentAccountDetails}
                  onChange={(e) => setPaymentAccountDetails(e.target.value)}
                  rows={6}
                  placeholder={`Bank: HDFC Bank\nAccount Number: 12345678901234\nIFSC Code: HDFC0001234\nAccount Holder: Bio Bramha Pvt Ltd`}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-mono text-xs"
                />
                <p className="text-[11px] text-slate-500 mt-1">Enter bank account details in any format. This text will be displayed exactly as entered to customers.</p>
              </div>
            </div>

            {/* Customer Preview */}
            {(paymentQrImage || paymentUpiId || paymentAccountDetails) && (
              <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Customer View Preview
                </h3>
                
                <div className="bg-white rounded-xl p-4 space-y-3 border border-blue-200">
                  {paymentQrImage && (
                    <div className="w-full max-w-[240px] mx-auto bg-white border-4 border-blue-200 rounded-2xl p-3 shadow-lg">
                      <img src={paymentQrImage} alt="Payment QR Code" className="w-full h-auto aspect-square object-contain" />
                    </div>
                  )}

                  {paymentUpiId && (
                    <div className="bg-slate-50 border border-blue-200 rounded-xl p-3 flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-600">UPI ID:</span>
                      <span className="text-sm font-mono font-bold text-slate-900">{paymentUpiId}</span>
                    </div>
                  )}

                  {paymentAccountDetails && (
                    <div className="bg-slate-50 border border-blue-200 rounded-xl p-4 space-y-1.5">
                      <div className="text-xs font-bold text-blue-900 mb-2">Bank Account Details:</div>
                      <pre className="text-xs text-slate-800 whitespace-pre-wrap font-sans leading-relaxed">
                        {paymentAccountDetails}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="pt-2 border-t border-slate-200">
              <button
                type="submit"
                disabled={isPaymentSaving}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                <span>{isPaymentSaving ? 'Saving...' : 'Save Payment Settings'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Role Change Confirmation */}
      <RoleChangeConfirmationModal
        request={pendingRoleChange}
        isSubmitting={isApplyingRoleChange}
        onConfirm={handleConfirmRoleChange}
        onCancel={() => setPendingRoleChange(null)}
      />
    </div>
  )
}
