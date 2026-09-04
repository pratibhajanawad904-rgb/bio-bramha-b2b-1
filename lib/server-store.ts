// Global Server-Side Shared Account Roles Store
// Persists role assignments, transfers, and account personas globally across all browsers, sessions, and devices.

export interface ServerUserRole {
  phone: string
  role: 'super_admin' | 'admin' | 'warehouse' | 'buyer'
  name?: string
  warehouseId?: string
  updatedAt: string
}

// Initialized global server memory state
const globalRolesMap = new Map<string, ServerUserRole>([
  [
    '8050946969',
    {
      phone: '8050946969',
      role: 'super_admin',
      name: 'Super Admin',
      updatedAt: new Date().toISOString()
    }
  ],
  [
    '7975158924',
    {
      phone: '7975158924',
      role: 'warehouse',
      name: 'Warehouse Manager',
      warehouseId: 'wh-central',
      updatedAt: new Date().toISOString()
    }
  ]
])

export function getServerUserAccounts(): ServerUserRole[] {
  return Array.from(globalRolesMap.values())
}

export function assignServerRole(
  phone: string,
  role: 'super_admin' | 'admin' | 'warehouse' | 'buyer',
  name?: string,
  warehouseId?: string
): ServerUserRole {
  const cleanPhone = String(phone).replace(/\D/g, '').slice(-10)
  
  if (role === 'super_admin') {
    // Single Super Admin invariant: Demote any other super_admin to regular admin
    globalRolesMap.forEach((acc, p) => {
      if (acc.role === 'super_admin' && p !== cleanPhone) {
        globalRolesMap.set(p, { ...acc, role: 'admin', updatedAt: new Date().toISOString() })
      }
    })
  }

  const existing = globalRolesMap.get(cleanPhone)
  const updatedRecord: ServerUserRole = {
    phone: cleanPhone,
    role: role,
    name: name || existing?.name || `User ${cleanPhone}`,
    warehouseId: warehouseId || existing?.warehouseId || 'wh-central',
    updatedAt: new Date().toISOString()
  }

  globalRolesMap.set(cleanPhone, updatedRecord)
  return updatedRecord
}

export function transferServerSuperAdmin(targetPhone: string, targetName?: string): { success: boolean; accounts: ServerUserRole[] } {
  const cleanTargetPhone = String(targetPhone).replace(/\D/g, '').slice(-10)

  // Demote all existing super_admins to regular admin
  globalRolesMap.forEach((acc, p) => {
    if (acc.role === 'super_admin') {
      globalRolesMap.set(p, { ...acc, role: 'admin', updatedAt: new Date().toISOString() })
    }
  })

  // Assign targetPhone as the single Super Admin
  const existing = globalRolesMap.get(cleanTargetPhone)
  globalRolesMap.set(cleanTargetPhone, {
    phone: cleanTargetPhone,
    role: 'super_admin',
    name: targetName || existing?.name || `Super Admin`,
    warehouseId: existing?.warehouseId || 'wh-central',
    updatedAt: new Date().toISOString()
  })

  return {
    success: true,
    accounts: Array.from(globalRolesMap.values())
  }
}
