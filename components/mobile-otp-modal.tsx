"use client"

import React, { useState, useEffect } from 'react'
import { Phone, ShieldCheck, X, CheckCircle2, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react'
import { useApp } from '@/lib/app-context'
import { sendMSG91OTP, verifyMSG91OTP } from '@/lib/msg91'

interface MobileOTPModalProps {
  isOpen: boolean
  onClose: () => void
}

export const MobileOTPModal: React.FC<MobileOTPModalProps> = ({ isOpen, onClose }) => {
  const { loginWithPhoneUser } = useApp()
  const [step, setStep] = useState<1 | 2>(1)
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setPhone('')
      setOtp('')
      setError('')
      setSuccessMessage('')
      setIsSuccess(false)
      setIsLoading(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSendOtp = async () => {
    setError('')
    setSuccessMessage('')

    const cleanedPhone = phone.replace(/\D/g, '').slice(-10)
    if (cleanedPhone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number')
      return
    }

    // Prevent double-submission
    if (isLoading) return

    setIsLoading(true)

    try {
      const result = await sendMSG91OTP(cleanedPhone)
      if (result.success) {
        setStep(2)
        setSuccessMessage(result.message || `OTP sent to +91 ${cleanedPhone}`)
      } else {
        setError(result.error || 'Failed to send OTP. Please try again.')
      }
    } catch (err: any) {
      setError(err.message || 'Error sending OTP.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    setError('')
    setSuccessMessage('')

    const cleanedPhone = phone.replace(/\D/g, '').slice(-10)
    const cleanedOtp = otp.trim()

    if (cleanedOtp.length < 4 || cleanedOtp.length > 6) {
      setError('Please enter a valid OTP code')
      return
    }

    setIsLoading(true)

    try {
      const login = await loginWithPhoneUser(cleanedPhone, cleanedOtp)
      if (login.success) {
        setIsSuccess(true)
        setTimeout(() => {
          onClose()
        }, 1500)
      } else {
        setError(login.error || 'Invalid or expired OTP. Please try again.')
      }
    } catch (err: any) {
      setError(err.message || 'Error verifying OTP.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendOtp = async () => {
    setError('')
    setSuccessMessage('')
    const cleanedPhone = phone.replace(/\D/g, '').slice(-10)
    if (cleanedPhone.length !== 10) return

    // Prevent double-submission
    if (isLoading) return

    setIsLoading(true)
    try {
      const result = await sendMSG91OTP(cleanedPhone)
      if (result.success) {
        setSuccessMessage(result.message || `OTP resent to +91 ${cleanedPhone}`)
      } else {
        setError(result.error || 'Failed to resend OTP.')
      }
    } catch (err: any) {
      setError(err.message || 'Error resending OTP.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div 
        className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-6 pb-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            Login with Mobile OTP
          </h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isSuccess ? (
            <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in zoom-in duration-300">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Verified Successfully!</h3>
              <p className="text-slate-600">Setting up your dealer account...</p>
            </div>
          ) : step === 1 ? (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Enter Mobile Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-slate-500 font-medium">+91</span>
                  </div>
                  <input
                    type="tel"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 10 digit number"
                    className="block w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-900 font-mono font-bold"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-slate-400" />
                  </div>
                </div>
                {error && (
                  <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>{error}</span>
                  </div>
                )}
              </div>

              <button
                onClick={handleSendOtp}
                disabled={isLoading || phone.length !== 10}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-medium py-3 px-4 rounded-xl transition-all cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Sending SMS...</span>
                  </>
                ) : (
                  <>
                    <span>Send OTP</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="mb-6">
                <p className="text-sm text-slate-600 mb-4 text-center">
                  OTP sent to +91 {phone}
                  <button 
                    onClick={() => setStep(1)}
                    className="ml-2 text-emerald-600 font-medium hover:underline cursor-pointer"
                  >
                    Change
                  </button>
                </p>

                {successMessage && (
                  <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>{successMessage}</span>
                  </div>
                )}
                
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Enter 6-digit OTP
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="• • • • • •"
                  className="block w-full px-4 py-3 text-center tracking-[1em] text-lg font-bold border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-900 font-mono"
                />
                
                {error && (
                  <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>{error}</span>
                  </div>
                )}
              </div>

              <button
                onClick={handleVerifyOtp}
                disabled={isLoading || otp.length < 4}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-medium py-3 px-4 rounded-xl transition-all mb-4 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <span>Verify & Login</span>
                )}
              </button>

              <div className="text-center">
                <button
                  onClick={handleResendOtp}
                  disabled={isLoading}
                  className="text-sm text-slate-500 hover:text-emerald-600 font-medium transition-colors cursor-pointer disabled:opacity-50"
                >
                  Didn't receive code? Resend OTP
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
          <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
            Secured by <span className="font-semibold text-slate-600">MSG91 Gateway</span>
          </p>
        </div>
      </div>
    </div>
  )
}
