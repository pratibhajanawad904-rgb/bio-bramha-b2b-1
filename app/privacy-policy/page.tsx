'use client'

import React, { useEffect, useState } from 'react'
import { Shield, ArrowLeft, FileText, Mail, Phone } from 'lucide-react'
import { api } from '@/lib/api-client'
import Link from 'next/link'

export default function PrivacyPolicyPage() {
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
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Shield className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Privacy Policy</h1>
              <p className="text-xs text-slate-500">Bio-Bramha Agri Solutions</p>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading...</div>
          ) : policy?.privacyPolicy?.url ? (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800">
                <p className="font-semibold">Version {policy.privacyPolicy.version}</p>
                <p className="text-xs mt-1">Effective from {policy.privacyPolicy.effectiveDate}</p>
              </div>
              <a
                href={policy.privacyPolicy.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors"
              >
                <FileText className="w-4 h-4" />
                View Privacy Policy PDF
              </a>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-500 text-sm">
              <p>The privacy policy has not been published yet.</p>
              <p className="text-xs mt-2 text-slate-400">Please check back later.</p>
            </div>
          )}

          {/* Data Usage Notice */}
          {policy?.dataUsageNotice?.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-slate-800">How We Use Your Data</h2>
              {policy.dataUsageNotice.map((item: any, i: number) => (
                <div key={i} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <p className="text-xs font-bold text-slate-700">{item.category}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{item.purpose}</p>
                  {item.sharedWith && <p className="text-xs text-slate-500 mt-0.5">Shared with: {item.sharedWith}</p>}
                  {item.retention && <p className="text-xs text-slate-500">Retention: {item.retention}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Grievance Contact */}
          {policy?.grievanceContact && (
            <div className="border-t border-slate-200 pt-4">
              <h2 className="text-sm font-bold text-slate-800 mb-2">Grievance Officer</h2>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 space-y-1">
                <p className="text-xs font-semibold text-slate-700">{policy.grievanceContact.name}</p>
                <p className="text-xs text-slate-600 flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {policy.grievanceContact.email}
                </p>
                {policy.grievanceContact.phone && (
                  <p className="text-xs text-slate-600 flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {policy.grievanceContact.phone}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
