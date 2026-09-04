'use client'

import React, { useEffect, useState } from 'react'
import { CreditCard, ArrowLeft, FileText, ExternalLink } from 'lucide-react'
import { api } from '@/lib/api-client'
import Link from 'next/link'

export default function RefundPolicyPage() {
  const [policy, setPolicy] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getPolicies().then((res) => {
      if (res.success) setPolicy(res)
    }).finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to App
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Refund & Payment Policy</h1>
              <p className="text-xs text-slate-500">Bio-Bramha Agri Solutions</p>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading...</div>
          ) : policy?.refundPolicy ? (
            <div className="space-y-4">
              {policy.refundPolicy.mode === 'link' && policy.refundPolicy.url ? (
                <a
                  href={policy.refundPolicy.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Refund Policy
                </a>
              ) : policy.refundPolicy.mode === 'pdf' && policy.refundPolicy.url ? (
                <a
                  href={policy.refundPolicy.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  View Refund Policy PDF
                </a>
              ) : (
                <div className="py-8 text-center text-slate-500 text-sm">
                  <p>The refund policy document is being prepared.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-500 text-sm">
              <p>The refund policy has not been published yet.</p>
              <p className="text-xs mt-2 text-slate-400">Please check back later.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
