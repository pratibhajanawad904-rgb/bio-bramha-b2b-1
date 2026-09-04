'use client'

import React from 'react'
import { AlertTriangle, ShieldCheck, Warehouse, User, X, ArrowRight } from 'lucide-react'
import { Role } from '@/lib/data'

export interface RoleChangeRequest {
  phone: string
  name: string
  fromRole: Role
  toRole: Role
}

interface RoleChangeConfirmationModalProps {
  request: RoleChangeRequest | null
  isSubmitting?: boolean
  onConfirm: () => void
  onCancel: () => void
}

const ROLE_META: Record<Role, { label: string; icon: React.ElementType; chip: string }> = {
  super_admin: {
    label: 'Super Admin',
    icon: ShieldCheck,
    chip: 'bg-amber-100 text-amber-900 border-amber-300'
  },
  admin: {
    label: 'Admin',
    icon: ShieldCheck,
    chip: 'bg-indigo-100 text-indigo-900 border-indigo-300'
  },
  warehouse: {
    label: 'Warehouse',
    icon: Warehouse,
    chip: 'bg-emerald-100 text-emerald-900 border-emerald-300'
  },
  buyer: {
    label: 'Buyer',
    icon: User,
    chip: 'bg-slate-100 text-slate-700 border-slate-300'
  }
}

/** A demotion strips privileges, so it gets the destructive red treatment. */
const PRIVILEGE_RANK: Record<Role, number> = {
  buyer: 0,
  warehouse: 1,
  admin: 2,
  super_admin: 3
}

export const RoleChangeConfirmationModal: React.FC<RoleChangeConfirmationModalProps> = ({
  request,
  isSubmitting = false,
  onConfirm,
  onCancel
}) => {
  if (!request) return null

  const { phone, name, fromRole, toRole } = request
  const from = ROLE_META[fromRole]
  const to = ROLE_META[toRole]
  const ToIcon = to.icon

  const isDemotion = PRIVILEGE_RANK[toRole] < PRIVILEGE_RANK[fromRole]

  const accent = isDemotion
    ? {
        header: 'from-red-600 to-red-700',
        confirmBtn:
          'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 active:from-red-800 active:to-red-900 border-red-800',
        noticeBox: 'bg-red-50 border-red-200',
        noticeTitle: 'text-red-900',
        noticeBody: 'text-red-800',
        noticeIcon: 'text-red-600'
      }
    : {
        header: 'from-emerald-600 to-emerald-700',
        confirmBtn:
          'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 active:from-emerald-800 active:to-emerald-900 border-emerald-800',
        noticeBox: 'bg-amber-50 border-amber-200',
        noticeTitle: 'text-amber-900',
        noticeBody: 'text-amber-800',
        noticeIcon: 'text-amber-600'
      }

  const noticeCopy = isDemotion
    ? `${name} will immediately lose ${from.label} access, including any dashboard and management screens.`
    : `${name} will immediately gain ${to.label} access. This takes effect in their app within a few seconds, even if they are already signed in.`

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="role-change-title"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />

      {/* Sheet on mobile, centered dialog from sm upward */}
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92dvh] overflow-y-auto">
        {/* Header */}
        <div className={`bg-gradient-to-r ${accent.header} px-4 sm:px-6 py-4 flex items-center justify-between gap-3`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <h2 id="role-change-title" className="text-base sm:text-lg font-bold text-white truncate">
              {isDemotion ? 'Confirm Role Removal' : 'Confirm Role Change'}
            </h2>
          </div>
          <button
            onClick={onCancel}
            aria-label="Cancel role change"
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          {/* Target account */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Account</p>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white font-bold text-lg shadow-md shrink-0">
                {name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-slate-900 truncate">{name}</p>
                <p className="text-sm text-slate-600 font-mono">+91 {phone}</p>
              </div>
            </div>
          </div>

          {/* Role transition — wraps instead of overflowing on narrow screens */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 py-1">
            <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${from.chip}`}>{from.label}</span>
            <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
            <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${to.chip}`}>{to.label}</span>
          </div>

          {/* Consequence notice */}
          <div className={`${accent.noticeBox} border rounded-2xl p-4 flex gap-3`}>
            <AlertTriangle className={`w-5 h-5 ${accent.noticeIcon} shrink-0 mt-0.5`} />
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${accent.noticeTitle} mb-1`}>
                {isDemotion ? 'Privileges will be revoked' : 'Privileges will be granted'}
              </p>
              <p className={`text-xs ${accent.noticeBody} leading-relaxed`}>{noticeCopy}</p>
            </div>
          </div>
        </div>

        {/* Actions — stacked on mobile so both stay full-width and thumb-reachable */}
        <div className="px-4 sm:px-6 pb-5 sm:pb-6 pt-1 flex flex-col-reverse sm:flex-row gap-3">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="w-full sm:flex-1 py-3.5 px-4 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-50 text-slate-700 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 border-2 border-slate-200 active:scale-95 cursor-pointer"
          >
            <X className="w-5 h-5" />
            <span>Cancel</span>
          </button>

          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className={`w-full sm:flex-1 py-3.5 px-4 ${accent.confirmBtn} disabled:opacity-60 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 border-2 shadow-lg active:scale-95 cursor-pointer`}
          >
            <ToIcon className="w-5 h-5" />
            <span>{isSubmitting ? 'Saving...' : `Make ${to.label}`}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
