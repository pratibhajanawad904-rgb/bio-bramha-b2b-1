'use client'

import React, { useState } from 'react'
import { useApp } from '@/lib/app-context'
import { Wrench, CheckCircle2, AlertCircle } from 'lucide-react'

export const FixMyRoleButton: React.FC = () => {
  const { currentUser, logout } = useApp()
  const [isFixing, setIsFixing] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleFix = async () => {
    if (!confirm('This will fix your role in the database. Continue?')) return

    setIsFixing(true)
    setResult(null)

    try {
      const res = await fetch('/api/admin/fix-my-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: currentUser.phone })
      })

      const data = await res.json()
      setResult(data)

      if (data.success) {
        setTimeout(() => {
          alert('Role fixed! Logging out now...')
          logout()
        }, 2000)
      }
    } catch (error: any) {
      setResult({ success: false, error: error.message })
    } finally {
      setIsFixing(false)
    }
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 space-y-2 max-w-sm">
      <button
        onClick={handleFix}
        disabled={isFixing}
        className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-400 text-white rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 cursor-pointer"
      >
        <Wrench className="w-4 h-4" />
        <span>{isFixing ? 'Fixing...' : 'Fix My Role in Database'}</span>
      </button>

      {result && (
        <div className={`p-3 rounded-xl text-xs font-semibold ${
          result.success 
            ? 'bg-emerald-50 border-2 border-emerald-500 text-emerald-900' 
            : 'bg-rose-50 border-2 border-rose-500 text-rose-900'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {result.success ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span className="font-bold">{result.message || result.error}</span>
          </div>
          {result.after && (
            <div className="text-[10px] mt-1 font-mono">
              Role: {result.after.role}
            </div>
          )}
          {result.instructions && (
            <ol className="text-[10px] mt-2 space-y-0.5 list-decimal list-inside">
              {result.instructions.map((i: string, idx: number) => (
                <li key={idx}>{i}</li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  )
}
