'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useApp } from '@/lib/app-context'
import { sendMSG91OTP } from '@/lib/msg91'
import { LogIn, LogOut, X, ShieldCheck, Phone, Lock, ArrowRight, RefreshCw, CheckCircle2, AlertCircle, UserPlus } from 'lucide-react'
import { LogoutConfirmationModal } from './logout-confirmation-modal'
import { ConsentSection } from './consent-section'
import { api } from '@/lib/api-client'

type AuthStep = 'PHONE' | 'OTP' | 'NEW_USER_NAME'

export const GoogleAuthButton: React.FC = () => {
  const { currentUser, isGoogleLoggedIn, loginWithPhoneUser, completeRegistration, logout } = useApp()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)

  // Auth Steps State
  const [step, setStep] = useState<AuthStep>('PHONE')
  const [phoneInput, setPhoneInput] = useState('')
  const [otpInput, setOtpInput] = useState('')
  const [fullNameInput, setFullNameInput] = useState('')
  const [emailInput, setEmailInput] = useState('')

  // UI Statuses
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [resendTimer, setResendTimer] = useState(30)

  // Consent
  const [consented, setConsented] = useState(false)
  const [policyVersion, setPolicyVersion] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Resend Timer Countdown
  useEffect(() => {
    let interval: any
    if (step === 'OTP' && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [step, resendTimer])

  // Reset Modal state on close
  const closeModal = () => {
    setIsModalOpen(false)
    setStep('PHONE')
    setPhoneInput('')
    setOtpInput('')
    setFullNameInput('')
    setEmailInput('')
    setErrorMsg(null)
    setSuccessMsg(null)
    setIsLoading(false)
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
          // Mandatory signup form for brand-new users
          setStep('NEW_USER_NAME')
        } else {
          // Existing user logged in successfully!
          closeModal()
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

  // Handle New User Registration Submission
  const handleCompleteRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    const name = fullNameInput.trim()
    if (!name) {
      setErrorMsg('Full Name is required.')
      return
    }

    if (policyVersion && !consented) {
      setErrorMsg('Please accept the data usage notice to create your account.')
      return
    }

    setIsLoading(true)
    const cleanedPhone = phoneInput.replace(/[^0-9]/g, '').slice(-10)

    try {
      const res = await completeRegistration(cleanedPhone, name, emailInput.trim() || undefined)
      if (res.success) {
        if (policyVersion && consented) {
          api.recordConsent(policyVersion).catch((err) => {
            console.warn('[consent] failed to record:', err)
          })
        }
        closeModal()
      } else {
        setErrorMsg(res.error || 'Failed to complete registration.')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error completing registration.')
    } finally {
      setIsLoading(false)
    }
  }

  const modalContent = isModalOpen ? (
    <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 pt-12 pb-12 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl max-w-sm w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 relative text-center space-y-4 my-auto">
        <button
          onClick={closeModal}
          className="absolute right-4 top-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors z-10"
          title="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
          <ShieldCheck className="w-6 h-6" />
        </div>

        <div>
          <h3 className="text-lg font-bold text-slate-900">
            {step === 'NEW_USER_NAME' ? 'Complete Profile' : 'Sign in to Bio-Bramha'}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {step === 'PHONE' && 'Enter your mobile number to receive a 6-digit OTP'}
            {step === 'OTP' && `OTP sent to +91 ${phoneInput.replace(/[^0-9]/g, '').slice(-10)}`}
            {step === 'NEW_USER_NAME' && 'Tell us your name to create your account'}
          </p>
        </div>

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 text-left animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 text-left">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* STEP 1: PHONE NUMBER INPUT */}
        {step === 'PHONE' && (
          <form onSubmit={handleSendOTP} className="space-y-4 text-left">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                Mobile Phone Number
              </label>
              <div className="flex items-center gap-2">
                <span className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-bold bg-slate-100 text-slate-700">
                  +91
                </span>
                <input
                  type="tel"
                  placeholder=""
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                  required
                  maxLength={10}
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 text-slate-900 tracking-wider"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || phoneInput.length < 10}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Send SMS OTP</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: 6-DIGIT OTP VERIFICATION */}
        {step === 'OTP' && (
          <form onSubmit={handleVerifyOTP} className="space-y-4 text-left">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                Enter 6-Digit OTP
              </label>
              <input
                type="text"
                placeholder=""
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                required
                maxLength={6}
                className="w-full text-center px-4 py-3 rounded-xl border border-slate-300 text-lg font-mono font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || otpInput.length < 4}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verify OTP & Sign In</span>
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
              <span>Mobile verified! Please enter your details to complete setup.</span>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Full Name</label>
              <input
                type="text"
                placeholder=""
                value={fullNameInput}
                onChange={(e) => setFullNameInput(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 text-slate-900"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Email (Optional)</label>
              <input
                type="email"
                placeholder=""
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 text-slate-900"
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
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Complete Registration</span>
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

      </div>
    </div>
  ) : null

  return (
    <>
      <div className="w-full">
        {isGoogleLoggedIn ? (
          <button
            onClick={() => setIsLogoutModalOpen(true)}
            className="w-full py-2.5 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs border border-red-200 transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            title="Log Out of Session"
          >
            <LogOut className="w-4 h-4 text-red-600" />
            <span>Sign Out ({currentUser.name.split(' ')[0]})</span>
          </button>
        ) : (
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In with OTP</span>
          </button>
        )}
      </div>

      {mounted && modalContent && createPortal(modalContent, document.body)}
      {mounted && isLogoutModalOpen && createPortal(
        <LogoutConfirmationModal
          isOpen={isLogoutModalOpen}
          onConfirm={() => {
            setIsLogoutModalOpen(false)
            logout()
          }}
          onCancel={() => setIsLogoutModalOpen(false)}
          userName={currentUser.name}
          userPhone={currentUser.phone}
        />,
        document.body
      )}
    </>
  )
}
