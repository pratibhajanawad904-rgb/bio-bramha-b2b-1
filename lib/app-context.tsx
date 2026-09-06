'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import {
  UserAccount,
  Product,
  Offer,
  Order,
  Warehouse,
  CartItem,
  DeliveryStage,
  Complaint,
  ComplaintIssueType,
  ComplaintStatus,
  USERS,
  PRODUCTS,
  INITIAL_OFFERS,
  WAREHOUSES,
  INITIAL_ORDERS,
  INITIAL_COMPLAINTS,
  DEFAULT_HELPLINE_NUMBER,
  DEFAULT_HELPLINE_EMAIL,
  Role,
  MainCategory,
  SecondaryCategory,
  IndianState
} from './data'
import { generateSecureId, sanitizeInput } from './security'
import { supabase } from './supabase'
import { loginViaServer, completeSignupViaServer } from './auth-client'
import { api } from './api-client'
import { listElevatedAccounts } from './accounts-client'
import { fetchAppSettings } from './settings-client'

export interface ProductOfferInfo {
  hasOffer: boolean
  offerTitle?: string
  discountPercentage: number
  originalPrice: number
  finalPrice: number
}

interface AppContextType {
  currentUser: UserAccount
  users: UserAccount[]
  products: Product[]
  secondaryCategories: SecondaryCategory[]
  offers: Offer[]
  orders: Order[]
  warehouses: Warehouse[]
  helplineNumber: string
  helplineEmail: string
  selectedProduct: Product | null
  isGoogleLoggedIn: boolean
  
  // Auth & Roles
  loginWithPhoneUser: (phone: string, otp: string) => Promise<{ success: boolean; isNewUser?: boolean; error?: string }>
  completeRegistration: (phone: string, name: string, email?: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  assignRoleToPhone: (targetPhone: string, newRole: Role, targetName?: string, targetWarehouseId?: string) => Promise<{ success: boolean; error?: string }>
  transferSuperAdmin: (targetPhone: string, targetName?: string) => Promise<{ success: boolean; error?: string }>
  fetchUserAccounts: () => Promise<UserAccount[]>
  
  // Navigation & Product
  setSelectedProduct: (product: Product | null) => void
  getProductOfferInfo: (productId: string) => ProductOfferInfo
  addSecondaryCategory: (name: string) => Promise<SecondaryCategory | null>
  addNewProduct: (productData: Omit<Product, 'id'>) => Promise<Product | null>
  updateProduct: (productId: string, productData: Omit<Product, 'id'>) => Promise<Product | null>
  deleteProduct: (productId: string) => Promise<boolean>
  
  // Support Contact Actions
  updateHelplineNumber: (number: string) => void
  updateHelplineEmail: (email: string) => void
  updateSupportContact: (number: string, email: string) => void
  
  // Offer Actions
  createOffer: (offerData: Omit<Offer, 'id'>) => Promise<void>
  toggleOfferActive: (offerId: string) => Promise<void>
  deleteOffer: (offerId: string) => Promise<void>
  
  // Shopping Cart & Order Flow
  cart: CartItem[]
  addToCart: (productId: string, quantity: number) => void
  removeFromCart: (productId: string) => void
  updateCartItemQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  createOrder: (orderData: {
    items: { productId: string; name: string; qty: number; price: number; image?: string }[]
    subtotal: number
    total: number
    paymentMethod: string
    address: string
    city: string
    pincode: string
    phone: string
    state: string
    warehouseId: string
    buyerName: string
    buyerEmail?: string
  }) => Promise<Order>
  updateOrderStatus: (orderId: string, status: DeliveryStage, note?: string) => Promise<void>
  acceptOrder: (orderId: string) => Promise<void>
  refreshOrders: () => Promise<void>
  refreshCatalog: () => Promise<void>
  refreshMyRole: () => Promise<void>
  
  // Complaints Support Module
  complaints: Complaint[]
  createComplaint: (complaintData: Omit<Complaint, 'id' | 'createdAt' | 'status' | 'messages'>) => void
  updateComplaintStatus: (complaintId: string, status: ComplaintStatus, responseText?: string, isWarehouse?: boolean) => void
  sendComplaintMessage: (complaintId: string, message: string) => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoaded, setIsLoaded] = useState(false)

  // System Core States
  const [currentUser, setCurrentUser] = useState<UserAccount>(USERS[0])
  const [isGoogleLoggedIn, setIsGoogleLoggedIn] = useState(false)
  const [users, setUsers] = useState<UserAccount[]>(USERS)
  const [products, setProducts] = useState<Product[]>(PRODUCTS)
  const [secondaryCategories, setSecondaryCategories] = useState<SecondaryCategory[]>([])
  const [offers, setOffers] = useState<Offer[]>(INITIAL_OFFERS)
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS)
  const [warehouses, setWarehouses] = useState<Warehouse[]>(WAREHOUSES)
  const [complaints, setComplaints] = useState<Complaint[]>(INITIAL_COMPLAINTS)
  
  const [helplineNumber, setHelplineNumber] = useState<string>(DEFAULT_HELPLINE_NUMBER)
  const [helplineEmail, setHelplineEmail] = useState<string>(DEFAULT_HELPLINE_EMAIL)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])

  // Load Initial Data from localStorage & Supabase
  useEffect(() => {
    try {
      const savedUserToken = localStorage.getItem('biobramha_session_token')
      const savedUserObj = localStorage.getItem('biobramha_logged_user')
      const savedOffers = localStorage.getItem('bb_offers')
      const savedOrders = localStorage.getItem('bb_orders')
      const savedHelpline = localStorage.getItem('bb_helpline_num')
      const savedHelplineEmail = localStorage.getItem('bb_helpline_email')
      const savedCart = localStorage.getItem('bb_cart')

      if (savedUserToken && savedUserObj) {
        try {
          const parsedUser = JSON.parse(savedUserObj)

          // FORCE CORRECT ROLES FOR PRE-PROVISIONED ACCOUNTS (override everything including localStorage)
          const cleanPhone = parsedUser.phone?.replace(/\D/g, '').slice(-10)
          const FORCE_ROLES: Record<string, { role: Role; name: string; warehouse?: string }> = {
            '8050946969': { role: 'super_admin', name: 'Super Admin' },
            '7975158924': { role: 'warehouse', name: 'Warehouse Manager', warehouse: 'wh-taloja' }
          }

          if (cleanPhone && FORCE_ROLES[cleanPhone]) {
            // Override with correct role - ALWAYS use hardcoded value
            parsedUser.role = FORCE_ROLES[cleanPhone].role
            parsedUser.name = FORCE_ROLES[cleanPhone].name
            if (FORCE_ROLES[cleanPhone].warehouse) {
              parsedUser.assignedWarehouseId = FORCE_ROLES[cleanPhone].warehouse
            }
            
            // Fix localStorage immediately
            localStorage.setItem('biobramha_logged_user', JSON.stringify(parsedUser))
            
            // Remove from bb_assigned_roles to prevent conflicts
            const localAssigned = JSON.parse(localStorage.getItem('bb_assigned_roles') || '{}')
            if (localAssigned[cleanPhone]) {
              delete localAssigned[cleanPhone]
              localStorage.setItem('bb_assigned_roles', JSON.stringify(localAssigned))
            }
          } else {
            // For non-preprovisioned accounts: Check database first, then localStorage
            // This ensures role changes by super_admin take effect immediately
            const localAssigned = JSON.parse(localStorage.getItem('bb_assigned_roles') || '{}')
            const assigned = localAssigned[parsedUser.phone]
            if (assigned?.role) {
              parsedUser.role = assigned.role
              if (assigned.name) parsedUser.name = assigned.name
            }
          }

          setCurrentUser(parsedUser)
          setIsGoogleLoggedIn(true)
        } catch (e) {}
      } else {
        const localAssigned = JSON.parse(localStorage.getItem('bb_assigned_roles') || '{}')
        const activeSuperPhone = Object.keys(localAssigned).find(p => localAssigned[p]?.role === 'super_admin')
        if (activeSuperPhone && localAssigned[activeSuperPhone]) {
          const item = localAssigned[activeSuperPhone]
          setCurrentUser({
            id: `user-${activeSuperPhone}`,
            name: item.name || 'Super Admin',
            phone: activeSuperPhone,
            role: 'super_admin',
            joinedDate: 'Active',
            state: 'AP'
          })
        }
      }

      if (savedOffers) {
        try {
          const parsed = JSON.parse(savedOffers)
          if (Array.isArray(parsed)) setOffers(parsed)
        } catch (e) {}
      }
      if (savedOrders) setOrders(JSON.parse(savedOrders))
      if (savedHelpline) setHelplineNumber(savedHelpline)
      if (savedHelplineEmail) setHelplineEmail(savedHelplineEmail)
      if (savedCart) setCart(JSON.parse(savedCart))

    } catch (e) {
      console.error('Failed to load local storage', e)
    } finally {
      setIsLoaded(true)
    }
  }, [])

  // Sync Secondary Categories & Products from Supabase.
  // This is shared catalog data, so it's re-fetched on an interval (like orders)
  // so a product/category added in one session shows up in every other open session.
  const refreshCatalog = async (): Promise<void> => {
    try {
      // Fetch Secondary Categories
      const { data: catData } = await supabase
        .from('secondary_categories')
        .select('*')
        .order('name', { ascending: true })

      if (Array.isArray(catData)) {
        const mappedCats: SecondaryCategory[] = catData.map((c: any) => ({
          id: c.id,
          name: c.name,
          createdAt: c.created_at
        }))
        setSecondaryCategories(mappedCats)
      }

      // Fetch Products
      const { data: prodData } = await supabase.from('products').select('*')
      if (Array.isArray(prodData) && prodData.length > 0) {
        const mappedProds: Product[] = prodData.map((p: any) => ({
          id: p.id,
          name: p.name,
          strain: p.strain || '',
          category: p.category || 'Bio-Fertilizer',
          main_category: (p.main_category || 'non_bulk') as MainCategory,
          secondary_category_ids: Array.isArray(p.secondary_category_ids)
            ? p.secondary_category_ids
            : (p.secondary_category_id ? [p.secondary_category_id] : []),
          moq: p.moq || 1,
          crops: p.crops || [],
          benefit: p.benefit || '',
          price: Number(p.price || 0),
          packSize: p.pack_size || p.packSize || '1 Litre',
          image: p.image || '/products/azospirillum.png',
          images: p.images || [p.image || '/products/azospirillum.png'],
          stock: Number(p.stock || 100),
          badge: p.badge || undefined,
          details: p.details || {
            description: p.benefit || '',
            howToUse: ['Mix with water and apply to soil or foliage.'],
            dosage: '1-2 Litres / Acre',
            targetCrops: p.crops || ['All crops'],
            shelfLife: '12 Months',
            certification: ['Organic Input'],
            composition: p.strain || 'Active Bio-Culture'
          }
        }))

        setProducts(mappedProds)
      }

      // Fetch Offers so a discount created by an admin reaches every buyer.
      const { data: offerData, error: offerError } = await supabase.from('offers').select('*')
      if (!offerError && Array.isArray(offerData)) {
        const mappedOffers: Offer[] = offerData.map((o: any) => ({
          id: o.id,
          title: o.title || 'Special Offer',
          discountPercentage: Number(o.discount_percentage || 0),
          active: Boolean(o.active),
          productIds: Array.isArray(o.product_ids) ? o.product_ids : []
        }))
        setOffers(mappedOffers)
        localStorage.setItem('bb_offers', JSON.stringify(mappedOffers))
      } else if (offerError) {
        console.warn('Offer sync failed (using local cache):', offerError.message)
      }
    } catch (e) {
      console.warn('Catalog sync failed (using local cache):', e)
    }
  }

  useEffect(() => {
    if (!isLoaded) return

    refreshCatalog()

    // Poll so a product/category added in one browser shows up in others without a manual reload
    const interval = setInterval(refreshCatalog, 15000)
    return () => clearInterval(interval)
  }, [isLoaded])

  // Pull shared support-contact settings so every device shows the same helpline.
  useEffect(() => {
    if (!isLoaded) return

    fetchAppSettings()
      .then((settings) => {
        if (!settings) return
        setHelplineNumber(settings.helplineNumber)
        setHelplineEmail(settings.helplineEmail)
        localStorage.setItem('bb_helpline_num', settings.helplineNumber)
        localStorage.setItem('bb_helpline_email', settings.helplineEmail)
      })
      .catch(() => {})
  }, [isLoaded])

  // Sync Orders from the server (which applies RLS: buyers see own, warehouse sees all)
  const refreshOrders = async (): Promise<void> => {
    try {
      const response = await api.getOrders()
      if (!response.success || !Array.isArray(response.orders)) return

      const mapped: Order[] = response.orders.map((o: any) => ({
        id: o.id,
        date: o.date,
        items: Array.isArray(o.items) ? o.items : [],
        subtotal: Number(o.subtotal || 0),
        total: Number(o.total || 0),
        paymentMethod: o.payment_method || 'Advance UPI/QR',
        status: (o.status || 'placed') as DeliveryStage,
        address: o.address || '',
        city: o.city || '',
        pincode: o.pincode || '',
        phone: o.phone || '',
        state: (o.state || 'AP') as IndianState,
        warehouseId: o.warehouse_id || 'wh-taloja',
        warehouseName: 'Bio-Bramha Taloja Warehouse Hub',
        buyerId: o.buyer_id || '',
        buyerName: o.buyer_name || 'Buyer',
        buyerEmail: o.buyer_email || undefined,
        timeline: Array.isArray(o.timeline) ? o.timeline : []
      }))

      setOrders(mapped)
      localStorage.setItem('bb_orders', JSON.stringify(mapped))
    } catch (e) {
      console.warn('Order sync failed (using local cache):', e)
    }
  }

  useEffect(() => {
    if (!isLoaded) return

    refreshOrders()

    // Poll so a warehouse account picks up new buyer orders without a manual reload
    const interval = setInterval(refreshOrders, 15000)
    return () => clearInterval(interval)
  }, [isLoaded])

  // Keep the signed-in user's role in step with the server so an admin granting or
  // revoking privileges takes effect in the affected session without a re-login.
  useEffect(() => {
    if (!isLoaded || !isGoogleLoggedIn) return

    refreshMyRole()

    const interval = setInterval(refreshMyRole, 10000)
    const onFocus = () => refreshMyRole()
    window.addEventListener('focus', onFocus)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [isLoaded, isGoogleLoggedIn, currentUser.phone, currentUser.role, currentUser.assignedWarehouseId])

  // Save Cart to Local Storage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('bb_cart', JSON.stringify(cart))
    }
  }, [cart, isLoaded])

  // Helper to add new Secondary Category.
  // Goes through the server (service_role) rather than direct Supabase, because the
  // RLS lockdown revokes anon write access to secondary_categories entirely.
  const addSecondaryCategory = async (name: string): Promise<SecondaryCategory | null> => {
    const cleanName = sanitizeInput(name.trim())
    if (!cleanName) return null

    // Local case-insensitive check
    const existing = secondaryCategories.find(c => c.name.toLowerCase() === cleanName.toLowerCase())
    if (existing) {
      throw new Error(`Category "${cleanName}" already exists. Please choose a unique name.`)
    }

    const newId = `cat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    const res = await api.adminCreateCategory(newId, cleanName)

    if (!res.success) {
      throw new Error(res.error || `Could not save category "${cleanName}" to the shared catalog.`)
    }

    const newCat: SecondaryCategory = {
      id: newId,
      name: cleanName,
      createdAt: new Date().toISOString()
    }

    setSecondaryCategories(prev => [...prev, newCat])
    return newCat
  }

  // Helper to add new Product. Server-side (service_role): products is now
  // write-locked to anon under RLS, admin/super_admin/warehouse only.
  const addNewProduct = async (productData: Omit<Product, 'id'>): Promise<Product | null> => {
    const newId = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    const newProd: Product = {
      ...productData,
      id: newId
    }

    const res = await api.adminCreateProduct({
      id: newId,
      name: newProd.name,
      strain: newProd.strain,
      category: newProd.category,
      mainCategory: newProd.main_category,
      secondaryCategoryIds: newProd.secondary_category_ids || [],
      moq: newProd.main_category === 'bulk' ? (newProd.moq || 1) : null,
      crops: newProd.crops,
      benefit: newProd.benefit,
      price: newProd.price,
      packSize: newProd.packSize,
      image: newProd.image,
      images: newProd.images,
      stock: newProd.stock,
      badge: newProd.badge || null,
      details: newProd.details
    })

    if (!res.success) {
      console.error('Failed to save product — it will NOT appear in other sessions:', res.error)
      throw new Error(res.error || 'Could not save product to the shared catalog.')
    }

    setProducts(prev => [newProd, ...prev])
    return newProd
  }

  // Helper to update existing Product. Server-side for the same RLS reason as above.
  const updateProduct = async (productId: string, productData: Omit<Product, 'id'>): Promise<Product | null> => {
    const updatedProd: Product = {
      ...productData,
      id: productId
    }

    const res = await api.adminUpdateProduct(productId, {
      name: updatedProd.name,
      strain: updatedProd.strain,
      category: updatedProd.category,
      mainCategory: updatedProd.main_category,
      secondaryCategoryIds: updatedProd.secondary_category_ids || [],
      moq: updatedProd.main_category === 'bulk' ? (updatedProd.moq || 1) : null,
      crops: updatedProd.crops,
      benefit: updatedProd.benefit,
      price: updatedProd.price,
      packSize: updatedProd.packSize,
      image: updatedProd.image,
      images: updatedProd.images,
      stock: updatedProd.stock,
      badge: updatedProd.badge || null,
      details: updatedProd.details
    })

    if (!res.success) {
      console.error('Failed to update product — change will NOT appear in other sessions:', res.error)
      throw new Error(res.error || 'Could not save changes to the shared catalog.')
    }

    setProducts(prev => prev.map(p => p.id === productId ? updatedProd : p))
    return updatedProd
  }

  // Helper to delete Product. Server-side for the same RLS reason as above.
  const deleteProduct = async (productId: string): Promise<boolean> => {
    const res = await api.adminDeleteProduct(productId)
    if (!res.success) {
      console.error('Failed to delete product:', res.error)
      throw new Error(res.error || 'Could not delete the product from the shared catalog.')
    }
    setProducts(prev => prev.filter(p => p.id !== productId))
    return true
  }

  // Auth Functions.
  // Both web and native now go through the server: loginViaServer/completeSignupViaServer
  // use plain fetch on web (relative URL, same origin) and CapacitorHttp on native
  // (absolute URL against the deployed backend, not subject to CORS). This replaced a
  // native-only path that wrote to Supabase directly with the anon key — that stopped
  // working outright once the RLS lockdown revoked anon access to user_accounts.
  const loginWithPhoneUser = async (phone: string, otp: string) => {
    try {
      const serverLogin = await loginViaServer(phone, otp)

      if (!serverLogin.success) {
        return { success: false, error: serverLogin.error || 'Invalid or expired OTP.' }
      }

      if (serverLogin.isNewUser) {
        return { success: true, isNewUser: true }
      }

      const u = serverLogin.user!
      const loggedUser: UserAccount = {
        id: `user-${u.phone}`,
        name: u.name,
        phone: u.phone,
        email: u.email || '',
        role: u.role,
        assignedWarehouseId: u.assignedWarehouseId || undefined,
        joinedDate: 'Today',
        state: 'AP'
      }

      localStorage.setItem('biobramha_session_token', serverLogin.token!)
      localStorage.setItem('biobramha_logged_user', JSON.stringify(loggedUser))
      setCurrentUser(loggedUser)
      setIsGoogleLoggedIn(true)

      return { success: true, isNewUser: false }
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error verifying OTP' }
    }
  }

  const completeRegistration = async (phone: string, name: string, email?: string) => {
    try {
      const cleanName = sanitizeInput(String(name || '').trim())
      if (!cleanName) {
        return { success: false, error: 'Please enter your name.' }
      }

      const result = await completeSignupViaServer(phone, cleanName, email)

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Could not create your account. Please try again.'
        }
      }

      const u = result.user!
      const loggedUser: UserAccount = {
        id: `user-${u.phone}`,
        name: u.name,
        phone: u.phone,
        email: u.email || '',
        role: u.role,
        assignedWarehouseId: u.assignedWarehouseId || undefined,
        joinedDate: 'Today',
        state: 'AP'
      }

      localStorage.setItem('biobramha_session_token', result.token!)
      localStorage.setItem('biobramha_logged_user', JSON.stringify(loggedUser))
      setCurrentUser(loggedUser)
      setIsGoogleLoggedIn(true)

      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message || 'Error completing registration' }
    }
  }

  const logout = () => {
    localStorage.removeItem('biobramha_session_token')
    localStorage.removeItem('biobramha_logged_user')
    localStorage.removeItem('bb_consent_given')
    localStorage.removeItem('bb_assigned_roles')
    setIsGoogleLoggedIn(false)
    setCurrentUser(USERS[0]) // Reset to default guest state
    
    // Force page reload to clear all state and redirect to login
    window.location.href = '/'
  }

  const assignRoleToPhone = async (targetPhone: string, newRole: Role, targetName?: string, targetWarehouseId?: string) => {
    try {
      const cleanPhone = String(targetPhone).replace(/\D/g, '').slice(-10)

      // Optimistic local override so the UI reflects the change immediately; rolled
      // back below if the durable write fails.
      const storedAssigned = JSON.parse(localStorage.getItem('bb_assigned_roles') || '{}')
      storedAssigned[cleanPhone] = { role: newRole, name: targetName, warehouseId: targetWarehouseId }
      localStorage.setItem('bb_assigned_roles', JSON.stringify(storedAssigned))

      // If assigning role to the currently logged in user, update currentUser immediately AND localStorage
      const currentPhone = currentUser.phone?.replace(/\D/g, '').slice(-10)
      if (cleanPhone === currentPhone) {
        const updatedUser = { ...currentUser, role: newRole }
        setCurrentUser(updatedUser)
        localStorage.setItem('biobramha_logged_user', JSON.stringify(updatedUser))
      }

      // Durable write to the shared account store, through the server (service_role)
      // since user_accounts has no anon write policy under the RLS lockdown. No
      // account is exempt here — a super_admin may reassign any phone, including the
      // bootstrap owner/warehouse seed numbers (see lib/roles.ts).
      const res = await api.adminAssignRole(cleanPhone, newRole, targetName, targetWarehouseId)

      if (!res.success) {
        // Roll the optimistic local override back so the UI stops showing a role that was never saved.
        const rollback = JSON.parse(localStorage.getItem('bb_assigned_roles') || '{}')
        delete rollback[cleanPhone]
        localStorage.setItem('bb_assigned_roles', JSON.stringify(rollback))

        console.error('Failed to save role to shared account store:', res.error)
        return { success: false, error: res.error || 'Could not save the new role. Please try again.' }
      }

      return { success: true }
    } catch (err: any) {
      console.error('assignRoleToPhone threw:', err)
      return { success: false, error: err?.message || 'Failed to save the new role. Please try again.' }
    }
  }

  /**
   * Pull the caller's own authoritative role from the server and apply it.
   * Without this, a role granted by an admin would sit unseen in the database until
   * the affected user manually logged out and back in.
   *
   * Uses the authenticated /api/account route (which reads via service_role, so it's
   * not blocked by the RLS lockdown that denies anon SELECT on user_accounts).
   */
  const refreshMyRole = async (): Promise<void> => {
    const cleanPhone = String(currentUser.phone || '').replace(/\D/g, '').slice(-10)
    if (!cleanPhone) return

    try {
      const res = await api.getAccount()

      // If the call fails (e.g. expired token, network issue), keep the cached role
      // rather than wrongly downgrading a logged-in admin to buyer.
      if (!res.success || !res.profile) return

      const serverRole = res.profile.role
      const serverWarehouse = res.profile.assignedWarehouseId

      if (serverRole === currentUser.role && serverWarehouse === currentUser.assignedWarehouseId) {
        return
      }

      const updated: UserAccount = {
        ...currentUser,
        role: serverRole,
        name: res.profile.name || currentUser.name,
        assignedWarehouseId: serverWarehouse
      }

      setCurrentUser(updated)
      localStorage.setItem('biobramha_logged_user', JSON.stringify(updated))

      // Drop any stale local override so it cannot fight the server value.
      const localAssigned = JSON.parse(localStorage.getItem('bb_assigned_roles') || '{}')
      if (localAssigned[cleanPhone]) {
        delete localAssigned[cleanPhone]
        localStorage.setItem('bb_assigned_roles', JSON.stringify(localAssigned))
      }
    } catch (e) {
      // Keep the cached role on unexpected failure.
    }
  }

  const transferSuperAdmin = async (targetPhone: string, targetName?: string) => {
    try {
      const cleanPhone = String(targetPhone).replace(/\D/g, '').slice(-10)
      const currentPhone = currentUser.phone?.replace(/\D/g, '').slice(-10) || '8050946969'

      // Optimistic local override so the UI reflects the change immediately; rolled
      // back below if the durable write fails.
      const storedAssigned = JSON.parse(localStorage.getItem('bb_assigned_roles') || '{}')

      Object.keys(storedAssigned).forEach(p => {
        if (storedAssigned[p]?.role === 'super_admin') {
          storedAssigned[p].role = 'admin'
        }
      })

      if (currentPhone !== cleanPhone) {
        storedAssigned[currentPhone] = { role: 'admin', name: currentUser.name }
      }

      storedAssigned[cleanPhone] = { role: 'super_admin', name: targetName }
      localStorage.setItem('bb_assigned_roles', JSON.stringify(storedAssigned))

      // Persist the transfer through the server (service_role), since user_accounts
      // has no anon write policy under the RLS lockdown.
      const result = await api.adminTransferSuperAdmin(cleanPhone, targetName)

      if (!result.success) {
        // Undo the optimistic local override so the UI does not show a transfer that never happened.
        const rollback = JSON.parse(localStorage.getItem('bb_assigned_roles') || '{}')
        delete rollback[cleanPhone]
        localStorage.setItem('bb_assigned_roles', JSON.stringify(rollback))
        return { success: false, error: result.error || 'Could not transfer super admin.' }
      }

      // Step down to regular admin locally.
      const updatedUserObj: UserAccount = { ...currentUser, role: 'admin' }
      setCurrentUser(updatedUserObj)
      localStorage.setItem('biobramha_logged_user', JSON.stringify(updatedUserObj))

      return { success: true }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Could not transfer super admin.' }
    }
  }

  const fetchUserAccounts = async (): Promise<UserAccount[]> => {
    try {
      const accounts = await listElevatedAccounts()
      return accounts.map((a) => ({
        id: `user-${a.phone}`,
        phone: a.phone,
        name: a.name,
        email: a.email || '',
        role: a.role,
        assignedWarehouseId: a.assignedWarehouseId,
        joinedDate: 'Registered',
        state: 'AP' as const
      }))
    } catch (e) {
      console.warn('Error fetching accounts:', e)
      return []
    }
  }

  // Offer Actions.
  // Offers are shared catalog data, written through the server (service_role) since
  // the RLS lockdown revokes anon write access to the offers table.
  const createOffer = async (offerData: Omit<Offer, 'id'>) => {
    const newOffer: Offer = { ...offerData, id: `offer-${Date.now()}` }

    const res = await api.adminCreateOffer({
      id: newOffer.id,
      title: newOffer.title,
      discountPercentage: newOffer.discountPercentage,
      active: newOffer.active,
      productIds: newOffer.productIds
    })

    if (!res.success) {
      console.error('Failed to save offer to shared catalog:', res.error)
      throw new Error(res.error || 'Could not save the offer.')
    }

    const updated = [...offers, newOffer]
    setOffers(updated)
    localStorage.setItem('bb_offers', JSON.stringify(updated))
  }

  const toggleOfferActive = async (offerId: string) => {
    const target = offers.find(o => o.id === offerId)
    if (!target) return

    const nextActive = !target.active

    const res = await api.adminUpdateOffer(offerId, { active: nextActive })

    if (!res.success) {
      console.error('Failed to toggle offer in shared catalog:', res.error)
      throw new Error(res.error || 'Could not update the offer.')
    }

    const updated = offers.map(o => (o.id === offerId ? { ...o, active: nextActive } : o))
    setOffers(updated)
    localStorage.setItem('bb_offers', JSON.stringify(updated))
  }

  const deleteOffer = async (offerId: string) => {
    const res = await api.adminDeleteOffer(offerId)

    if (!res.success) {
      console.error('Failed to delete offer from shared catalog:', res.error)
      throw new Error(res.error || 'Could not delete the offer.')
    }

    const updated = offers.filter(o => o.id !== offerId)
    setOffers(updated)
    localStorage.setItem('bb_offers', JSON.stringify(updated))
  }

  // Cart Functions (with MOQ Stepper Validation for Bulk Products)
  const addToCart = (productId: string, quantity: number) => {
    const product = products.find(p => p.id === productId)
    if (!product) return

    // MVP V1: minimum order quantity is 1 unit for every product.
    const minMoq = 1
    const validQty = Math.max(minMoq, quantity)

    setCart(prev => {
      const existing = prev.find(item => item.productId === productId)
      if (existing) {
        return prev.map(item =>
          item.productId === productId
            ? { ...item, quantity: item.quantity + validQty }
            : item
        )
      }
      return [...prev, { productId, quantity: validQty }]
    })
  }

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId))
  }

  const updateCartItemQuantity = (productId: string, quantity: number) => {
    // MVP V1: minimum order quantity is 1 unit for every product.
    const minMoq = 1

    if (quantity < minMoq) {
      removeFromCart(productId)
      return
    }

    setCart(prev =>
      prev.map(item =>
        item.productId === productId ? { ...item, quantity } : item
      )
    )
  }

  const clearCart = () => setCart([])

  // Order Functions
  const createOrder = async (orderData: {
    items: { productId: string; name: string; qty: number; price: number; image?: string }[]
    subtotal: number
    total: number
    paymentMethod: string
    address: string
    city: string
    pincode: string
    phone: string
    state: string
    warehouseId: string
    buyerName: string
    buyerEmail?: string
  }): Promise<Order> => {
    const newOrder: Order = {
      id: `ORD-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString().slice(0, 10),
      items: orderData.items,
      subtotal: orderData.subtotal,
      total: orderData.total,
      paymentMethod: orderData.paymentMethod,
      status: 'placed',
      address: orderData.address,
      city: orderData.city,
      pincode: orderData.pincode,
      phone: orderData.phone,
      state: orderData.state as any,
      warehouseId: orderData.warehouseId,
      warehouseName: 'Bio-Bramha Taloja Warehouse Hub',
      buyerId: currentUser.id,
      buyerName: orderData.buyerName,
      buyerEmail: orderData.buyerEmail,
      timeline: [
        {
          stage: 'placed',
          label: 'Order Placed',
          timestamp: new Date().toLocaleString()
        }
      ]
    }

    try {
      // Call the server-side route which verifies the session, recalculates the
      // price from the catalog, validates MOQ, applies active offers, and auto-saves
      // the first address. The client-supplied total is ignored.
      const response = await api.createOrder({
        items: orderData.items.map((item) => ({
          productId: item.productId,
          qty: item.qty
        })),
        address: orderData.address,
        city: orderData.city,
        pincode: orderData.pincode,
        state: orderData.state,
        warehouseId: orderData.warehouseId,
        paymentMethod: orderData.paymentMethod
      })

      if (!response.success) {
        console.error('Order creation failed:', response.error)
        throw new Error(response.error || 'Could not create the order.')
      }

      // The server returns the order id and the recalculated total. Update the local
      // state with the server's values.
      newOrder.id = response.orderId
      newOrder.total = response.total
      newOrder.subtotal = response.total
    } catch (e) {
      console.error('Order creation threw:', e)
      throw e
    }

    const updatedOrders = [newOrder, ...orders]
    setOrders(updatedOrders)
    localStorage.setItem('bb_orders', JSON.stringify(updatedOrders))
    clearCart()
    return newOrder
  }

  const updateOrderStatus = async (orderId: string, status: DeliveryStage, note?: string) => {
    // Persist first: orders now has no anon write policy at all, so this must go
    // through the server (which checks the caller is warehouse/admin/super_admin)
    // rather than optimistically updating local state and syncing after the fact.
    const res = await api.updateOrderStatus(orderId, status, note)

    if (!res.success) {
      console.error('Failed to sync order status to cloud:', res.error)
      throw new Error(res.error || 'Could not update the order status.')
    }

    const newTimeline = res.timeline || []
    const updated = orders.map(o => (o.id === orderId ? { ...o, status, timeline: newTimeline } : o))
    setOrders(updated)
    localStorage.setItem('bb_orders', JSON.stringify(updated))
  }

  const acceptOrder = async (orderId: string) => {
    await updateOrderStatus(orderId, 'accepted', `Accepted by ${currentUser.name}`)
  }

  const getProductOfferInfo = (productId: string): ProductOfferInfo => {
    const product = products.find(p => p.id === productId)
    if (!product) return { hasOffer: false, discountPercentage: 0, originalPrice: 0, finalPrice: 0 }

    const activeOffer = offers.find(o => o.active && o.productIds.includes(productId))
    if (!activeOffer) {
      return { hasOffer: false, discountPercentage: 0, originalPrice: product.price, finalPrice: product.price }
    }

    const finalPrice = Math.round(product.price * (1 - activeOffer.discountPercentage / 100))
    return {
      hasOffer: true,
      offerTitle: activeOffer.title,
      discountPercentage: activeOffer.discountPercentage,
      originalPrice: product.price,
      finalPrice
    }
  }

  // Support Contacts. app_settings has no anon write policy under the RLS lockdown,
  // so this goes through the server (service_role) instead of the direct upsert
  // that lib/settings-client.ts used to do.
  const updateHelplineNumber = (num: string) => {
    setHelplineNumber(num)
    localStorage.setItem('bb_helpline_num', num)
    // Persist globally so buyers on other devices see the same number.
    api.adminUpdateSettings({ helplineNumber: num }).then((res) => {
      if (!res.success) console.warn('Could not sync helpline number:', res.error)
    })
  }

  const updateHelplineEmail = (email: string) => {
    setHelplineEmail(email)
    localStorage.setItem('bb_helpline_email', email)
    api.adminUpdateSettings({ helplineEmail: email }).then((res) => {
      if (!res.success) console.warn('Could not sync helpline email:', res.error)
    })
  }

  // Update both support contact fields in one call
  const updateSupportContact = (num: string, email: string) => {
    updateHelplineNumber(num)
    updateHelplineEmail(email)
  }

  // Complaints
  const createComplaint = (cData: Omit<Complaint, 'id' | 'createdAt' | 'status' | 'messages'>) => {
    const newC: Complaint = {
      ...cData,
      id: `CMP-${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toLocaleString(),
      status: 'open',
      messages: [
        {
          id: `msg-${Date.now()}`,
          senderRole: currentUser.role,
          senderName: currentUser.name,
          message: cData.description,
          timestamp: new Date().toLocaleString()
        }
      ]
    }

    setComplaints(prev => [newC, ...prev])
  }

  const updateComplaintStatus = (complaintId: string, status: ComplaintStatus, responseText?: string, isWarehouse?: boolean) => {
    setComplaints(prev =>
      prev.map(c => {
        if (c.id === complaintId) {
          const updated = { ...c, status }
          if (responseText) {
            if (isWarehouse) updated.warehouseResponse = responseText
            else updated.adminResponse = responseText
          }
          if (status === 'resolved' || status === 'closed') {
            updated.resolvedAt = new Date().toLocaleString()
          }
          return updated
        }
        return c
      })
    )
  }

  const sendComplaintMessage = (complaintId: string, message: string) => {
    setComplaints(prev =>
      prev.map(c => {
        if (c.id === complaintId) {
          const newMsg = {
            id: `msg-${Date.now()}`,
            senderRole: currentUser.role,
            senderName: currentUser.name,
            message,
            timestamp: new Date().toLocaleString()
          }
          return {
            ...c,
            messages: [...(c.messages || []), newMsg]
          }
        }
        return c
      })
    )
  }

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        products,
        secondaryCategories,
        offers,
        orders,
        warehouses,
        helplineNumber,
        helplineEmail,
        selectedProduct,
        isGoogleLoggedIn,
        loginWithPhoneUser,
        completeRegistration,
        logout,
        assignRoleToPhone,
        transferSuperAdmin,
        fetchUserAccounts,
        setSelectedProduct,
        getProductOfferInfo,
        addSecondaryCategory,
        addNewProduct,
        updateProduct,
        deleteProduct,
        updateHelplineNumber,
        updateHelplineEmail,
        updateSupportContact,
        createOffer,
        toggleOfferActive,
        deleteOffer,
        cart,
        addToCart,
        removeFromCart,
        updateCartItemQuantity,
        clearCart,
        createOrder,
        updateOrderStatus,
        acceptOrder,
        refreshOrders,
        refreshCatalog,
        refreshMyRole,
        complaints,
        createComplaint,
        updateComplaintStatus,
        sendComplaintMessage
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}
