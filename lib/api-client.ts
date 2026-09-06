/**
 * Client-side API wrapper.
 *
 * Calls the server-side routes (app/api/**) which verify sessions, enforce RLS,
 * and validate/recalculate everything.
 *
 * In web mode: routes are same-origin, plain fetch works.
 * In APK mode: the frontend is a static bundle inside the Capacitor webview. The
 * webview origin (capacitor://localhost or https://localhost) differs from the server
 * (bio-bramha.vercel.app), so a plain browser fetch would be blocked by CORS. We use
 * Capacitor's native HTTP plugin instead, which bypasses CORS entirely since it
 * operates at the native networking layer, not the WebView's fetch API.
 */

import { CapacitorHttp } from '@capacitor/core'
import { isNativeApp } from './platform'

const API_BASE =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE_URL
    ? process.env.NEXT_PUBLIC_API_BASE_URL
    : typeof window !== 'undefined' && (window as any).NEXT_PUBLIC_API_BASE_URL
    ? (window as any).NEXT_PUBLIC_API_BASE_URL
    : ''

function getSessionToken(): string | null {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem('biobramha_session_token')
}

export interface ApiResponse<T = any> {
  success: boolean
  error?: string
  [key: string]: any
}

async function apiCall<T = any>(
  method: string,
  path: string,
  body?: any
): Promise<ApiResponse<T>> {
  const url = API_BASE ? `${API_BASE}${path}` : path
  const token = getSessionToken()

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  const hasBody = body && (method === 'POST' || method === 'PATCH' || method === 'PUT' || method === 'DELETE')

  try {
    // Native: use CapacitorHttp to bypass CORS (the Capacitor webview's origin
    // differs from the Vercel deployment, so browser fetch would be blocked).
    if (isNativeApp()) {
      if (!API_BASE || /localhost|127\.0\.0\.1/.test(API_BASE)) {
        console.error('[api] NEXT_PUBLIC_API_BASE_URL is missing or points to localhost; the Android build must use the live server URL.')
        return { success: false, error: 'App is not connected to the live server. Please update the app.' } as ApiResponse<T>
      }
      const res = await CapacitorHttp.request({
        url,
        method,
        headers,
        data: hasBody ? body : undefined
      })
      const data = typeof res.data === 'string' ? safeJsonParse(res.data) : (res.data || {})
      return data
    }

    // Web: plain fetch (same-origin, no CORS issue)
    const options: RequestInit = { method, headers }
    if (hasBody) options.body = JSON.stringify(body)

    const res = await fetch(url, options)
    const json = await res.json().catch(() => ({ success: false, error: 'Invalid server response' }))
    return json
  } catch (err) {
    console.error(`[api-client] ${method} ${path} failed:`, err)
    return {
      success: false,
      error: 'Could not reach the server. Check your connection.'
    }
  }
}

function safeJsonParse(text: string): any {
  try { return JSON.parse(text) } catch { return {} }
}

export const api = {
  // Auth (public, no token needed for send-otp)
  sendOtp: (phone: string) => apiCall('POST', '/api/auth/send-otp', { phone }),
  verifyOtp: (phone: string, otp: string) =>
    apiCall<{ token?: string; isNewUser?: boolean }>('POST', '/api/auth/verify-otp', {
      phone,
      otp
    }),
  completeSignup: (phone: string, name: string, email?: string) =>
    apiCall('POST', '/api/auth/complete-signup', { phone, name, email }),

  // Orders
  getOrders: () => apiCall<{ orders: any[] }>('GET', '/api/orders'),
  createOrder: (orderData: {
    items: { productId: string; qty: number }[]
    address: string
    city: string
    pincode: string
    state?: string
    warehouseId?: string
    paymentMethod?: string
  }) => apiCall<{ orderId: string; total: number }>('POST', '/api/orders', orderData),
  updateOrderStatus: (orderId: string, status: string, note?: string) =>
    apiCall<{ status: string; timeline: any[] }>('PATCH', '/api/orders', { orderId, status, note }),

  // Account
  getAccount: () =>
    apiCall<{ profile: any; addresses: any[]; consent: any | null }>('GET', '/api/account'),
  updateAccount: (updates: { name?: string; email?: string }) =>
    apiCall('PATCH', '/api/account', updates),

  // Addresses
  getAddresses: () => apiCall<{ addresses: any[] }>('GET', '/api/account/address'),
  addAddress: (address: { line1: string; city: string; pincode: string; state?: string }) =>
    apiCall<{ id: string }>('POST', '/api/account/address', address),
  updateAddress: (
    id: string,
    updates: { line1?: string; city?: string; pincode?: string; state?: string; setDefault?: boolean }
  ) => apiCall('PATCH', '/api/account/address', { id, ...updates }),
  deleteAddress: (id: string) => apiCall('DELETE', `/api/account/address?id=${id}`),

  // Policies (public)
  getPolicies: () =>
    apiCall<{
      privacyPolicy: any | null
      refundPolicy: any | null
      dataUsageNotice: any[]
      grievanceContact: any | null
    }>('GET', '/api/policies'),

  // Consent
  recordConsent: (policyVersion: string) =>
    apiCall('POST', '/api/consent', { policyVersion }),
  getConsentHistory: () => apiCall<{ consents: any[] }>('GET', '/api/consent'),

  // Account Deletion
  requestDeletion: () => apiCall('POST', '/api/account/delete'),
  confirmDeletion: (otp: string) =>
    apiCall<{ ordersAnonymised: number }>('DELETE', '/api/account/delete', { otp }),

  // Admin: Products
  adminGetProducts: () => apiCall<{ products: any[] }>('GET', '/api/admin/products'),
  adminCreateProduct: (productData: any) => apiCall('POST', '/api/admin/products', productData),
  adminUpdateProduct: (id: string, updates: any) =>
    apiCall('PATCH', '/api/admin/products', { id, ...updates }),
  adminDeleteProduct: (id: string) => apiCall('DELETE', `/api/admin/products?id=${id}`),

  // Admin: Offers
  adminGetOffers: () => apiCall<{ offers: any[] }>('GET', '/api/admin/offers'),
  adminCreateOffer: (offerData: any) => apiCall('POST', '/api/admin/offers', offerData),
  adminUpdateOffer: (id: string, updates: any) =>
    apiCall('PATCH', '/api/admin/offers', { id, ...updates }),
  adminDeleteOffer: (id: string) => apiCall('DELETE', `/api/admin/offers?id=${id}`),

  // Admin: Categories
  adminGetCategories: () => apiCall<{ categories: any[] }>('GET', '/api/admin/categories'),
  adminCreateCategory: (id: string, name: string) =>
    apiCall('POST', '/api/admin/categories', { id, name }),
  adminUpdateCategory: (id: string, name: string) =>
    apiCall('PATCH', '/api/admin/categories', { id, name }),
  adminDeleteCategory: (id: string) => apiCall('DELETE', `/api/admin/categories?id=${id}`),

  // Admin: Settings
  adminGetSettings: () => apiCall<{ settings: any }>('GET', '/api/admin/settings'),
  adminUpdateSettings: (updates: {
    helplineNumber?: string
    helplineEmail?: string
    paymentSettings?: any
  }) => apiCall('PATCH', '/api/admin/settings', updates),

  // Admin: Roles
  adminGetAccounts: () => apiCall<{ accounts: any[] }>('GET', '/api/admin/roles'),
  adminUpdateRole: (phone: string, role: string, assignedWarehouseId?: string) =>
    apiCall('PATCH', '/api/admin/roles', { phone, role, assignedWarehouseId }),

  // Admin: Assign role (broader than /api/admin/roles — usable by plain admins too,
  // not just super_admin, matching what the Role Management tab actually offers)
  adminAssignRole: (targetPhone: string, newRole: string, targetName?: string, targetWarehouseId?: string) =>
    apiCall('POST', '/api/admin/assign-role', { targetPhone, newRole, targetName, targetWarehouseId }),

  // Admin: Transfer super_admin (super_admin only)
  adminTransferSuperAdmin: (targetPhone: string, targetName?: string) =>
    apiCall('POST', '/api/admin/transfer-super-admin', { targetPhone, targetName })
}
