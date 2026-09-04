'use client'

import React, { useEffect, useState } from 'react'
import { Shield, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import { api } from '@/lib/api-client'

interface PolicyData {
  privacyPolicy: { version: string; effectiveDate: string; url: string | null } | null
  dataUsageNotice: { category: string; purpose: string; sharedWith: string | null; retention: string | null }[]
  grievanceContact: { name: string; email: string; phone: string | null } | null
}

interface ConsentSectionProps {
  /** Whether the user has checked the consent box */
  consented: boolean
  /** Callback when the user toggles the checkbox */
  onConsentChange: (checked: boolean) => void
  /** The policy version they're consenting to (set when policies load) */
  onPolicyVersionLoaded: (version: string | null) => void
}

/**
 * Consent section shown during new-user registration.
 *
 * Requirements (from the compliance plan):
 *   - Checkbox is UNCHECKED by default, never pre-ticked
 *   - Signup CANNOT proceed until explicitly ticked (button disabled externally)
 *   - Policy shown as a mandatory view step, not a small skippable link
 *   - When no policy is uploaded: section hides entirely, consent not required
 *   - Graceful: never blocks signup with a blank screen or error
 */
export const ConsentSection: React.FC<ConsentSectionProps> = ({
  consented,
  onConsentChange,
  onPolicyVersionLoaded
}) => {
  const [policy, setPolicy] = useState<PolicyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [noticeExpanded, setNoticeExpanded] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadPolicies() {
      try {
        const res = await api.getPolicies()
        if (cancelled) return

        if (res.success) {
          setPolicy({
            privacyPolicy: res.privacyPolicy,
            dataUsageNotice: res.dataUsageNotice || [],
            grievanceContact: res.grievanceContact
          })
          // Signal that consent is required if there's any policy content to agree to
          // (either a privacy policy PDF version, or data-usage notice items, or both).
          // The parent uses a non-null value here to gate the submit button.
          const hasContent = res.privacyPolicy?.version || (res.dataUsageNotice?.length > 0)
          onPolicyVersionLoaded(hasContent ? (res.privacyPolicy?.version || 'notice-only') : null)
        }
      } catch {
        // Graceful: if policies can't load, consent is not required
        onPolicyVersionLoaded(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadPolicies()
    return () => { cancelled = true }
  }, [])

  // If loading or no policy published: don't show consent section at all.
  // Signup proceeds without consent requirement in this case.
  if (loading) return null
  if (!policy || (!policy.privacyPolicy && policy.dataUsageNotice.length === 0)) {
    return null
  }

  const { privacyPolicy, dataUsageNotice, grievanceContact } = policy

  return (
    <div className="space-y-3">
      {/* Data Usage Notice — itemised, not just a link */}
      {dataUsageNotice.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
          <button
            type="button"
            onClick={() => setNoticeExpanded(!noticeExpanded)}
            className="flex items-center justify-between w-full text-left cursor-pointer"
          >
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              How we use your data
            </span>
            {noticeExpanded ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {noticeExpanded && (
            <div className="mt-2 space-y-2">
              {dataUsageNotice.map((item, i) => (
                <div key={i} className="text-xs text-slate-600 border-l-2 border-emerald-200 pl-2">
                  <p className="font-semibold text-slate-700">{item.category}</p>
                  <p>{item.purpose}</p>
                  {item.sharedWith && (
                    <p className="text-slate-500">Shared with: {item.sharedWith}</p>
                  )}
                  {item.retention && (
                    <p className="text-slate-500">Kept: {item.retention}</p>
                  )}
                </div>
              ))}

              {grievanceContact && (
                <div className="mt-2 pt-2 border-t border-slate-200 text-xs text-slate-500">
                  <p className="font-semibold">Grievance Officer</p>
                  <p>{grievanceContact.name} — {grievanceContact.email}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Privacy Policy link — points to the uploaded PDF if available, otherwise to the
          public /privacy-policy page which always shows the data-usage notice */}
      <a
        href={privacyPolicy?.url || '/privacy-policy'}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        {privacyPolicy?.url
          ? `Read our Privacy Policy (v${privacyPolicy.version})`
          : 'View our Privacy & Data Usage Policy'}
      </a>

      {/* Consent checkbox — UNCHECKED by default, never pre-ticked */}
      <label className="flex items-start gap-2.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={consented}
          onChange={(e) => onConsentChange(e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
        />
        <span className="text-xs text-slate-600 leading-relaxed">
          I have read how my data is used and I consent to Bio-Bramha collecting and processing
          my personal information as described above
          {privacyPolicy ? ` and in the Privacy Policy (v${privacyPolicy.version})` : ''}.
        </span>
      </label>
    </div>
  )
}
