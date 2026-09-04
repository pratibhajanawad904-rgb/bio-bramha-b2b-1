'use client'

import React from 'react'
import { RefreshCcw } from 'lucide-react'

export const ClearCacheButton: React.FC = () => {
  const handleClearCache = () => {
    if (confirm('This will clear all local data and reload the page. You will need to login again. Continue?')) {
      localStorage.clear()
      sessionStorage.clear()
      window.location.href = '/'
    }
  }

  return (
    <button
      onClick={handleClearCache}
      className="fixed bottom-4 right-4 z-50 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 cursor-pointer"
      title="Clear cache and force re-login"
    >
      <RefreshCcw className="w-4 h-4" />
      <span>Clear Cache</span>
    </button>
  )
}
