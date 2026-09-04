'use client'

import React, { useState, useEffect } from 'react'
import { useApp } from '@/lib/app-context'
import { sendMSG91OTP } from '@/lib/msg91'
import { ShieldCheck, Phone, Lock, ArrowRight, RefreshCw, CheckCircle2, AlertCircle, UserPlus, Leaf } from 'lucide-react'
import { ConsentSection } from './consent-section'
import { api } from '@/lib/api-client'

type AuthStep = 'PHONE' | 'OTP' | 'NEW_USER_NAME'

export const LoginGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isGoogleLoggedIn, loginWithPhoneUser, completeRegistration } = useApp()
  const [mounted, setMounted] = useState(false)

  // Form State
  const [step, setStep] = useState<AuthStep>('PHONE')
  const [phoneInput, setPhoneInput] = useState('')
  const [otpInput, setOtpInput] = useState('')
  const [fullNameInput, setFullNameInput] = useState('')
  const [emailInput, setEmailInput] = useState('')

  // UI Status
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [resendTimer, setResendTimer] = useState(30)

  // Consent (only required for new users during registration)
  const [consented, setConsented] = useState(false)
  const [policyVersion, setPolicyVersion] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    let interval: any
    if (step === 'OTP' && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [step, resendTimer])

  // Don't render SSR mismatch - show branded loader
  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 animate-pulse">
            <Leaf className="w-8 h-8" />
          </div>
          <p className="text-xs text-emerald-400 font-semibold tracking-wider">Loading Dealer Mitra...</p>
        </div>
      </div>
    )
  }

  // If user is authenticated, check if they need to give consent before accessing the app
  if (isGoogleLoggedIn && currentUser) {
    return <ConsentGateWrapper>{children}</ConsentGateWrapper>
  }

  // Handle Send OTP
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    const cleaned = phoneInput.replace(/[^0-9]/g, '').slice(-10)
    if (cleaned.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number')
      return
    }

    // Prevent double-submission
    if (isLoading) return

    setIsLoading(true)

    try {
      const result = await sendMSG91OTP(cleaned)
      if (result.success) {
        setSuccessMsg(result.message || `OTP sent to +91 ${cleaned}`)
        setStep('OTP')
        setResendTimer(30)
      } else {
        setErrorMsg(result.error || 'Failed to send OTP. Please try again.')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error sending OTP.')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle Verify OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    const cleanedPhone = phoneInput.replace(/[^0-9]/g, '').slice(-10)
    const cleanedOtp = otpInput.trim()

    if (cleanedOtp.length < 4 || cleanedOtp.length > 6) {
      setErrorMsg('Please enter a valid 6-digit OTP')
      return
    }

    setIsLoading(true)

    try {
      const result = await loginWithPhoneUser(cleanedPhone, cleanedOtp)

      if (result.success) {
        if (result.isNewUser) {
          setStep('NEW_USER_NAME')
        }
      } else {
        setErrorMsg(result.error || 'Invalid or expired OTP. Please try again.')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error verifying OTP.')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle Complete Signup
  const handleCompleteRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    const name = fullNameInput.trim()
    if (!name) {
      setErrorMsg('Full Name is required.')
      return
    }

    // If a policy is published, consent must be given
    if (policyVersion && !consented) {
      setErrorMsg('Please accept the data usage notice to create your account.')
      return
    }

    setIsLoading(true)
    const cleanedPhone = phoneInput.replace(/[^0-9]/g, '').slice(-10)

    try {
      const res = await completeRegistration(cleanedPhone, name, emailInput.trim() || undefined)
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to complete registration.')
        return
      }

      // Record consent server-side (timestamp is generated by the server, not the client)
      if (policyVersion && consented) {
        api.recordConsent(policyVersion).catch((err) => {
          console.warn('[consent] failed to record:', err)
        })
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error completing registration.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-3 sm:p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,calc(env(safe-area-inset-bottom)+1rem))]">
      <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-8 shadow-2xl border border-slate-200 text-center space-y-5 sm:space-y-6">
        
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30">
            <Leaf className="w-9 h-9" />
          </div>
        </div>

        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Bio-Bramha Dealer Mitra</h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">B2B Agri Dealer & Distribution Portal</p>
        </div>

        <div className="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-100 text-center">
          <h2 className="text-base font-bold text-slate-800">
            {step === 'NEW_USER_NAME' ? 'Complete Profile' : 'Dealer Sign In'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {step === 'PHONE' && 'Enter your registered 10-digit mobile number to proceed'}
            {step === 'OTP' && `Enter the 6-digit OTP code sent to +91 ${phoneInput.replace(/[^0-9]/g, '').slice(-10)}`}
            {step === 'NEW_USER_NAME' && 'Enter your details to create your account'}
          </p>
        </div>

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 text-left animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 text-left">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* STEP 1: PHONE */}
        {step === 'PHONE' && (
          <form onSubmit={handleSendOTP} className="space-y-4 text-left">
            <div className="w-full">
              <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Mobile Phone Number</span>
              </label>
              <div className="flex items-center gap-2 w-full">
                <span className="shrink-0 px-3.5 py-3 rounded-xl border border-slate-200 text-sm font-bold bg-slate-100 text-slate-700 font-mono">
                  +91
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                  required
                  maxLength={10}
                  className="flex-1 min-w-0 w-full px-3.5 py-3 rounded-xl border border-slate-200 text-base font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 text-slate-900 font-mono tracking-wider"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || phoneInput.length < 10}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Send SMS OTP</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: OTP */}
        {step === 'OTP' && (
          <form onSubmit={handleVerifyOTP} className="space-y-4 text-left">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">Enter 6-Digit OTP</label>
                <button
                  type="button"
                  onClick={() => {
                    setStep('PHONE')
                    setOtpInput('')
                    setErrorMsg(null)
                  }}
                  className="text-[11px] font-bold text-emerald-600 hover:underline cursor-pointer"
                >
                  Change Number
                </button>
              </div>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="••••••"
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                required
                maxLength={6}
                autoFocus
                className="w-full min-w-0 px-4 py-3.5 rounded-xl border border-slate-200 text-center text-2xl font-black focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 text-slate-900 tracking-[0.35em] font-mono placeholder:tracking-widest placeholder:text-slate-300"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || otpInput.length < 4}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Verify OTP & Access Portal</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => {
                  setStep('PHONE')
                  setErrorMsg(null)
                  setSuccessMsg(null)
                }}
                className="text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
              >
                ← Change Number
              </button>

              <button
                type="button"
                disabled={resendTimer > 0 || isLoading}
                onClick={handleSendOTP}
                className="text-emerald-700 hover:underline font-bold disabled:text-slate-400 cursor-pointer"
              >
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: NEW USER REGISTRATION */}
        {step === 'NEW_USER_NAME' && (
          <form onSubmit={handleCompleteRegistrationSubmit} className="space-y-4 text-left">
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100 text-xs text-emerald-900 leading-relaxed font-medium flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Mobile verified! Please enter your name to complete account creation.</span>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Full Name</label>
              <input
                type="text"
                placeholder="Enter your full name"
                value={fullNameInput}
                onChange={(e) => setFullNameInput(e.target.value)}
                required
                className="w-full min-w-0 px-3.5 py-3 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 text-slate-900"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Email (Optional)</label>
              <input
                type="email"
                placeholder="email@example.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full min-w-0 px-3.5 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 text-slate-900"
              />
            </div>

            {/* Consent: unchecked by default, blocks signup until ticked, hides if no policy */}
            <ConsentSection
              consented={consented}
              onConsentChange={setConsented}
              onPolicyVersionLoaded={setPolicyVersion}
            />

            <button
              type="submit"
              disabled={isLoading || (policyVersion !== null && !consented)}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  <span>Create Account & Sign In</span>
                </>
              )}
            </button>

            {policyVersion !== null && !consented && (
              <p className="text-xs text-center text-slate-500">
                Please read and accept the data usage notice to continue.
              </p>
            )}
          </form>
        )}

        <div className="pt-2 text-[11px] text-slate-400">
          Bio-Bramha Agri Solutions &copy; {new Date().getFullYear()} &mdash; Secure B2B Portal
        </div>
      </div>
    </div>
  )
}


/**
 * Consent gate for already-authenticated users.
 *
 * After login, checks if the user has given consent. If not (and policies/notice
 * items exist), shows a consent form before rendering the app. This handles:
 *   - Existing users who were created before the consent feature
 *   - Re-consent required after a policy update (new version != last consented version)
 *   - Deleted-then-re-registered accounts that somehow bypassed the registration consent
 */
const ConsentGateWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [checking, setChecking] = useState(true)
  const [needsConsent, setNeedsConsent] = useState(false)
  const [consented, setConsented] = useState(false)
  const [policyVersion, setPolicyVersion] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function check() {
      try {
        // Fast path: if we already recorded consent in this browser, skip the
        // server round-trip entirely. This prevents the gate from flashing on
        // every page load / navigation.
        const cached = localStorage.getItem('bb_consent_given')
        if (cached) {
          setChecking(false)
          return
        }

        // Check if policies exist and if user has already consented
        const [policiesRes, consentRes] = await Promise.all([
          api.getPolicies(),
          api.getConsentHistory()
        ])

        const hasContent = policiesRes.privacyPolicy?.version || (policiesRes.dataUsageNotice?.length > 0)
        if (!hasContent) {
          // No policies published — no consent needed
          localStorage.setItem('bb_consent_given', 'no-policy')
          setChecking(false)
          return
        }

        const currentVersion = policiesRes.privacyPolicy?.version || 'notice-only'
        const latestConsent = consentRes.consents?.[0]

        // User has already consented to this version (or any version if notice-only)
        if (latestConsent) {
          localStorage.setItem('bb_consent_given', latestConsent.policyVersion || 'yes')
          setChecking(false)
          return
        }

        // User needs to give consent
        setPolicyVersion(currentVersion)
        setNeedsConsent(true)
      } catch {
        // On error, don't block — let them in
      }
      setChecking(false)
    }
    check()
  }, [])

  async function handleAccept() {
    if (!consented || !policyVersion) return
    setSaving(true)
    await api.recordConsent(policyVersion).catch(() => {})
    localStorage.setItem('bb_consent_given', policyVersion)
    setNeedsConsent(false)
    setSaving(false)
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-2 text-slate-400 text-xs">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
          <span>Loading session...</span>
        </div>
      </div>
    )
  }

  if (!needsConsent) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-3 sm:p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,calc(env(safe-area-inset-bottom)+1rem))]">
      <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-8 shadow-2xl border border-slate-200 space-y-6">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Privacy & Data Usage Agreement</h2>
          <p className="text-xs text-slate-500 mt-1">
            Please review and accept our data usage policy to continue using the app.
          </p>
        </div>

        <ConsentSection
          consented={consented}
          onConsentChange={setConsented}
          onPolicyVersionLoaded={() => {}}
        />

        <button
          onClick={handleAccept}
          disabled={!consented || saving}
          className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
        >
          {saving ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              <span>I Accept & Continue</span>
            </>
          )}
        </button>

        {!consented && (
          <p className="text-xs text-center text-slate-500">
            You must accept the data usage policy to continue.
          </p>
        )}
      </div>
    </div>
  )
}
