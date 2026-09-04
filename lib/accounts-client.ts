import { supabase } from './supabase'
import { AppRole, PREPROVISIONED_ACCOUNTS, normalizePhone } from './roles'

/**
 * Account records live in the shared Supabase `user_accounts` table and are read and
 * written directly from the client, the same way orders and the catalog already are.
 * This is what allows the packaged app to work without any server.
 */

export interface AccountRecord {
  phone: string
  name: string
  email?: string
  role: AppRole
  assignedWarehouseId?: string
}

function mapRow(row: any): AccountRecord {
  return {
    phone: row.phone,
    name: row.name || `User ${String(row.phone).slice(-4)}`,
    email: row.email || undefined,
    role: (row.role || 'buyer') as AppRole,
    assignedWarehouseId: row.assigned_warehouse_id || undefined
  }
}

/**
 * Look up an account. Returns:
 *   - AccountRecord when the phone is already registered
 *   - null when it is reachable but unregistered (a genuine new user)
 *   - 'unavailable' when the store could not be reached, so callers avoid
 *     wrongly treating an existing user as new and re-running signup.
 */
export async function findAccount(rawPhone: string): Promise<AccountRecord | null | 'unavailable'> {
  const phone = normalizePhone(rawPhone)
  if (!phone) return null

  // Reserved accounts resolve without touching the database, so the owner and
  // warehouse logins keep working even if the shared store is down or drifted.
  const preprovisioned = PREPROVISIONED_ACCOUNTS[phone]
  if (preprovisioned) {
    return {
      phone,
      name: preprovisioned.name,
      role: preprovisioned.role,
      assignedWarehouseId: preprovisioned.assignedWarehouseId
    }
  }

  // select('*') rather than naming columns: this table has been migrated by hand and
  // naming a column that does not exist fails the whole query and blocks login.
  const { data, error } = await supabase
    .from('user_accounts')
    .select('*')
    .eq('phone', phone)
    .maybeSingle()

  if (error) {
    console.error('[accounts] lookup failed:', error.message)
    return 'unavailable'
  }

  if (!data) return null

  return mapRow(data)
}

/** Create or update an account row. Used by signup and by reserved-account self-heal. */
export async function upsertAccount(record: AccountRecord): Promise<{ success: boolean; error?: string }> {
  const phone = normalizePhone(record.phone)
  if (!phone) return { success: false, error: 'Invalid phone number.' }

  const base: Record<string, any> = {
    phone,
    name: record.name,
    role: record.role,
    assigned_warehouse_id: record.assignedWarehouseId || null,
    updated_at: new Date().toISOString()
  }

  const { error } = await supabase
    .from('user_accounts')
    .upsert({ ...base, email: record.email || null }, { onConflict: 'phone' })

  if (!error) return { success: true }

  // The email column is optional and missing on some existing installs. Retry without
  // it rather than failing a signup over a column that carries no access meaning.
  if (error.code === 'PGRST204' || /email/i.test(error.message)) {
    const retry = await supabase.from('user_accounts').upsert(base, { onConflict: 'phone' })
    if (!retry.error) return { success: true }
    console.error('[accounts] upsert failed:', retry.error.message)
    return { success: false, error: retry.error.message }
  }

  console.error('[accounts] upsert failed:', error.message)
  return { success: false, error: error.message }
}

/** Every elevated account, for the admin roster. Uses direct Supabase querying with PREPROVISIONED_ACCOUNTS and server sync. */
export async function listElevatedAccounts(): Promise<AccountRecord[]> {
  const accountMap = new Map<string, AccountRecord>()

  // 1. Seed with preprovisioned bootstrap accounts
  for (const [phone, meta] of Object.entries(PREPROVISIONED_ACCOUNTS)) {
    accountMap.set(phone, {
      phone,
      name: meta.name,
      role: meta.role,
      assignedWarehouseId: meta.assignedWarehouseId
    })
  }

  // 2. Query Supabase directly (same as APK module)
  try {
    const { data, error } = await supabase
      .from('user_accounts')
      .select('*')
      .neq('role', 'buyer')

    if (!error && Array.isArray(data)) {
      data.forEach((row) => {
        if (row.is_deleted === true) {
          accountMap.delete(row.phone)
          return
        }
        const mapped = mapRow(row)
        if (mapped.role !== 'buyer') {
          accountMap.set(mapped.phone, mapped)
        }
      })
    } else if (error) {
      console.warn('[accounts] Direct Supabase read returned error:', error.message)
    }
  } catch (err) {
    console.warn('[accounts] Direct Supabase read failed:', err)
  }

  // 3. Try server API endpoint if available for extra server-side service_role sync
  try {
    const { api } = await import('./api-client')
    const response = await api.adminGetAccounts()
    if (response?.success && Array.isArray(response.accounts)) {
      response.accounts.forEach((a: any) => {
        if (a.role && a.role !== 'buyer') {
          accountMap.set(a.phone, {
            phone: a.phone,
            name: a.name || `User ${String(a.phone).slice(-4)}`,
            role: a.role as AppRole,
            assignedWarehouseId: a.assignedWarehouseId
          })
        }
      })
    }
  } catch (err) {
    // Graceful fallback to Supabase & preprovisioned
  }

  // 4. Merge any local admin role assignments from localStorage (instant UI sync)
  try {
    if (typeof localStorage !== 'undefined') {
      const localAssigned = JSON.parse(localStorage.getItem('bb_assigned_roles') || '{}')
      for (const [phone, meta] of Object.entries(localAssigned as Record<string, any>)) {
        if (meta?.role && meta.role !== 'buyer') {
          const existing = accountMap.get(phone)
          accountMap.set(phone, {
            phone,
            name: meta.name || existing?.name || `User ${phone.slice(-4)}`,
            role: meta.role as AppRole,
            assignedWarehouseId: meta.warehouseId || existing?.assignedWarehouseId
          })
        }
      }
    }
  } catch (e) {}

  return Array.from(accountMap.values())
}

/** Move super_admin to a new phone, demoting the previous holder. */
export async function transferSuperAdminAccount(
  rawTargetPhone: string,
  targetName?: string
): Promise<{ success: boolean; error?: string }> {
  const phone = normalizePhone(rawTargetPhone)
  if (!phone) return { success: false, error: 'Invalid phone number.' }

  if (PREPROVISIONED_ACCOUNTS[phone]) {
    return {
      success: false,
      error: `+91 ${phone} is a reserved account and cannot receive a transfer.`
    }
  }

  const promote = await upsertAccount({
    phone,
    name: targetName || `User ${phone.slice(-4)}`,
    role: 'super_admin'
  })
  if (!promote.success) return promote

  const { error } = await supabase
    .from('user_accounts')
    .update({ role: 'admin', updated_at: new Date().toISOString() })
    .eq('role', 'super_admin')
    .neq('phone', phone)

  if (error) {
    console.warn('[accounts] could not demote previous super admin:', error.message)
  }

  return { success: true }
}
