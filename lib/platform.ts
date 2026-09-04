import { Capacitor } from '@capacitor/core'

/**
 * True when running inside the Android/iOS shell rather than a browser.
 *
 * This matters because the web build uses `output: 'export'`, so the /api routes
 * are not deployed as functions. In the native app there is no server to talk to
 * at all, and requests must go straight to Supabase / MSG91 over native HTTP.
 */
export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}
