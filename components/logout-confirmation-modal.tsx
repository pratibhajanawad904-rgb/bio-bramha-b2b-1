'use client'

import React from 'react'
import { AlertTriangle, LogOut, X } from 'lucide-react'

interface LogoutConfirmationModalProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
  userName: string
  userPhone: string
}

export const LogoutConfirmationModal: React.FC<LogoutConfirmationModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  userName,
  userPhone
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header with dark red gradient */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-lg font-bold text-white">Logout Confirmation</h2>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Current User Info */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Currently logged in as:
            </p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                {userName.charAt(0)}
              </div>
              <div>
                <p className="font-bold text-slate-900">{userName}</p>
                <p className="text-sm text-slate-600 font-mono">+91 {userPhone}</p>
              </div>
            </div>
          </div>

          {/* Warning Message */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900 mb-1">
                You will need to sign in again
              </p>
              <p className="text-xs text-amber-800 leading-relaxed">
                After logout, you must enter your phone number and verify OTP to access your account.
              </p>
            </div>
          </div>

          {/* Question */}
          <p className="text-center text-base font-semibold text-slate-900 pt-2">
            Do you want to logout?
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3.5 px-4 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 border-2 border-slate-200 active:scale-95"
          >
            <X className="w-5 h-5" />
            <span>Cancel</span>
          </button>
          
          <button
            onClick={onConfirm}
            className="flex-1 py-3.5 px-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 active:from-red-800 active:to-red-900 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 border-2 border-red-800 shadow-lg active:scale-95"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  )
}
