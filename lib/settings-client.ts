import { supabase } from './supabase'

/**
 * Global app settings (support contact + payment details).
 *
 * These used to live in lib/settings.json, written with the fs module by an API
 * route. That cannot work in the packaged app, which has no server and no writable
 * project directory, so they are stored in a single Supabase row instead.
 */

export interface PaymentSettings {
  qrCodeImage: string | null
  upiId: string
  accountDetails: string
}

export interface AppSettings {
  helplineNumber: string
  helplineEmail: string
  paymentSettings: PaymentSettings
}

const SETTINGS_ROW_ID = 'global'

export const DEFAULT_SETTINGS: AppSettings = {
  helplineNumber: '',
  helplineEmail: 'support@biobramha.com',
  paymentSettings: {
    qrCodeImage: null,
    upiId: '',
    accountDetails: ''
  }
}

/** Returns null when the store is unreachable so callers can keep what they have. */
export async function fetchAppSettings(): Promise<AppSettings | null> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('helpline_number, helpline_email, payment_settings')
    .eq('id', SETTINGS_ROW_ID)
    .maybeSingle()

  if (error) {
    console.warn('[settings] fetch failed:', error.message)
    return null
  }

  if (!data) return DEFAULT_SETTINGS

  return {
    helplineNumber: data.helpline_number || DEFAULT_SETTINGS.helplineNumber,
    helplineEmail: data.helpline_email || DEFAULT_SETTINGS.helplineEmail,
    paymentSettings: {
      qrCodeImage: data.payment_settings?.qrCodeImage ?? null,
      upiId: data.payment_settings?.upiId ?? '',
      accountDetails: data.payment_settings?.accountDetails ?? ''
    }
  }
}

/**
 * Writes go through the server (service_role), not straight to Supabase: the RLS
 * lockdown revokes insert/update/delete on app_settings for anon entirely, so the
 * previous direct `.upsert()` here would fail under the current schema.
 */
export async function saveAppSettings(
  patch: Partial<AppSettings>
): Promise<{ success: boolean; error?: string }> {
  // Import lazily to avoid a circular dependency (api-client has no need to import
  // this module, but keeping the import local here keeps this file's public surface
  // — fetchAppSettings/saveAppSettings — unchanged for existing callers).
  const { api } = await import('./api-client')

  const res = await api.adminUpdateSettings({
    helplineNumber: patch.helplineNumber?.trim() || undefined,
    helplineEmail: patch.helplineEmail?.trim() || undefined,
    paymentSettings: patch.paymentSettings || undefined
  })

  if (!res.success) {
    console.error('[settings] save failed:', res.error)
    return { success: false, error: res.error }
  }

  return { success: true }
}
