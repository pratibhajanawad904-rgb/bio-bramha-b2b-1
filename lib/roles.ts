import { supabase } from './supabase'

export type AppRole = 'super_admin' | 'admin' | 'warehouse' | 'buyer'

export interface ResolvedRole {
  phone: string
  role: AppRole
  name?: string
  assignedWarehouseId?: string
}

/**
 * Default seed roles for a brand-new database.
 *
 * These are ONLY used as a bootstrap fallback when a phone has no row at all yet
 * in `user_accounts` — they exist so a freshly created install always has an owner
 * to log in as. Once a row exists for a phone (even the seeded owner's own row),
 * the database is authoritative and these values are never consulted again.
 *
 * No account is permanently reserved: a super_admin can reassign any phone,
 * including these two, to any role through the normal role-management flow.
 */
export const PREPROVISIONED_ACCOUNTS: Record<string, { name: string; role: AppRole; assignedWarehouseId?: string }> = {
  '8050946969': { name: 'Super Admin', role: 'super_admin' },
  '7975158924': { name: 'Warehouse Manager', role: 'warehouse', assignedWarehouseId: 'wh-central' }
}

export function normalizePhone(phone: string): string {
  return String(phone || '').replace(/\D/g, '').slice(-10)
}

/**
 * Resolve the authoritative role for a phone number, reading the shared
 * user_accounts table straight from the browser.
 *
 * The app builds with `output: 'export'`, so there is no server at runtime — every
 * cross-device sync in this codebase (orders, catalog) talks to Supabase directly,
 * and role sync follows the same pattern.
 *
 * Returns null when the shared store cannot be reached, so callers can keep the
 * cached role instead of wrongly downgrading someone to buyer.
 */
export async function resolveRoleForPhone(phone: string): Promise<ResolvedRole | null> {
  const cleanPhone = normalizePhone(phone)
  if (!cleanPhone) return null

  // The database is authoritative once a row exists. Checking it first (instead of
  // the seed map) is what lets a super_admin actually reassign the seeded owner or
  // warehouse phone to a different role — previously the seed map was checked first
  // and unconditionally won, so a role change to either of those two phones was
  // saved but then immediately overridden back on every read.
  const { data, error } = await supabase
    .from('user_accounts')
    .select('phone, name, role, assigned_warehouse_id')
    .eq('phone', cleanPhone)
    .maybeSingle()

  if (error) {
    console.warn(`[roles] Could not read shared role for ${cleanPhone}:`, error.message)
    return null
  }

  if (data?.role) {
    return {
      phone: cleanPhone,
      role: data.role as AppRole,
      name: data.name || undefined,
      assignedWarehouseId: data.assigned_warehouse_id || undefined
    }
  }

  // No row yet: fall back to the bootstrap seed so a brand-new database still has
  // an owner to log in as, then plain buyer for everyone else.
  const preprovisioned = PREPROVISIONED_ACCOUNTS[cleanPhone]
  if (preprovisioned) {
    return {
      phone: cleanPhone,
      role: preprovisioned.role,
      name: preprovisioned.name,
      assignedWarehouseId: preprovisioned.assignedWarehouseId
    }
  }

  return { phone: cleanPhone, role: 'buyer' }
}
