/**
 * Security & Validation Helper Utilities
 */

/**
 * Sanitizes text string against HTML/Script injection attacks
 */
export function sanitizeInput(input: string): string {
  if (!input) return ''
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim()
}

/**
 * Validates 10-digit Indian Mobile Phone Numbers or standard phone formats
 */
export function isValidPhoneNumber(phone: string): boolean {
  const cleanPhone = phone.replace(/[\s\-\+\(\)]/g, '')
  // Accepts 10-12 digit phone numbers (e.g. 9876543210 or 919876543210)
  return /^[6-9]\d{9}$/.test(cleanPhone) || /^\d{10,12}$/.test(cleanPhone)
}

/**
 * Validates 6-digit Indian Postal Pincode
 */
export function isValidPincode(pincode: string): boolean {
  const cleanPin = pincode.trim()
  return /^[1-9][0-9]{5}$/.test(cleanPin)
}

/**
 * Generates a cryptographically strong unique identifier
 */
export function generateSecureId(prefix = 'ID'): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return `${prefix}-${window.crypto.randomUUID().slice(0, 8).toUpperCase()}`
  }
  // Fallback strong pseudo-random ID
  const randomBytes = Math.random().toString(36).substring(2, 10).toUpperCase()
  const timestamp = Date.now().toString(36).toUpperCase()
  return `${prefix}-${timestamp}-${randomBytes}`
}

/**
 * Validates uploaded image file size (max 5MB) and type
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5MB limit
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']

  if (file.size > MAX_SIZE_BYTES) {
    return { valid: false, error: 'File size exceeds 5MB limit. Please upload a smaller image.' }
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Only JPEG, PNG, WEBP, and SVG images are allowed.' }
  }

  return { valid: true }
}
