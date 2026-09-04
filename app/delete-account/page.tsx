'use client'

import React, { useState } from 'react'
import { Trash2, ArrowLeft, Phone, Lock, AlertTriangle, RefreshCw, CheckCircle2, ShieldAlert } from 'lucide-react'
import { api } from '@/lib/api-client'
import Link from 'next/link'

/**
 * Public account deletion page.
 *
 * Google Play Store requires that account deletion is accessible from outside the app.
 * This page meets that requirement without needing a full login — the user just enters
 * their phone, receives an OTP, verifies it, and deletion proceeds.
 *
 * The actual deletion logic lives in /api/account/delete (POST sends OTP, DELETE confirms).
 */
export default function DeleteAccountPage() {
  const [step, setStep] = useState<'info' | 'phone' | 'otp' | 'done'>('info')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<any>(null)

  const handleRequestOTP = async () => {
    setError('')
    const clean = phone.replace(/\D/g, '').slice(-10)
    if (clean.length !== 10) {
      setError('Enter a valid 10-digit mobile number.')
      return
    }

    setLoading(true)
    try {
      // This needs a session token, so the user must login first.
      // For the public page, we'll use send-otp + verify-otp to authenticate,
      // then call the delete endpoint.
      const res = await api.sendOtp(clean)
      if (res.success) {
        setStep('otp')
      } else {
        setError(res.error || 'Could not send OTP. Please try again.')
      }
    } catch {
      setError('Could not reach the server.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyAndDelete = async () => {
    setError('')
    const clean = phone.replace(/\D/g, '').slice(-10)
    const cleanOtp = otp.trim()

    if (cleanOtp.length < 4) {
      setError('Enter the 6-digit OTP sent to your phone.')
      return
    }

    setLoading(true)
    try {
      // First verify OTP to get a session
      const verifyRes = await api.verifyOtp(clean, cleanOtp)
      if (!verifyRes.success) {
        setError(verifyRes.error || 'Invalid or expired OTP.')
        return
      }

      // Store the token temporarily
      if (verifyRes.token) {
        localStorage.setItem('biobramha_session_token', verifyRes.token)
      }

      // Now request deletion (sends another OTP for re-verification)
      const delReq = await api.requestDeletion()
      if (!delReq.success) {
        setError(delReq.error || 'Could not initiate deletion.')
        return
      }

      // Confirm deletion with the same OTP (MSG91 keeps it valid for 10 min)
      const delConfirm = await api.confirmDeletion(cleanOtp)
      if (delConfirm.success) {
        setResult(delConfirm)
        setStep('done')
        localStorage.removeItem('biobramha_session_token')
        localStorage.removeItem('biobramha_logged_user')
      } else {
        setError(delConfirm.error || 'Could not complete deletion.')
      }
    } catch {
      setError('Could not reach the server.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-lg mx-auto px-4 py-8">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to App
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Delete Your Account</h1>
              <p className="text-xs text-slate-500">Bio-Bramha Agri Solutions</p>
            </div>
          </div>

          {step === 'info' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 space-y-2">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  What happens when you delete your account:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Your profile and personal data will be permanently removed</li>
                  <li>Your saved addresses will be deleted</li>
                  <li>Past order records will be anonymised (financial records retained as required by tax law)</li>
                  <li>You will need to create a new account if you wish to use the app again</li>
                </ul>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-2">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-slate-500" />
                  Before proceeding:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>All pending orders must be delivered or cancelled first</li>
                  <li>You will need to verify your phone number via OTP</li>
                  <li>This action cannot be undone</li>
                </ul>
              </div>

              <button
                onClick={() => setStep('phone')}
                className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-colors cursor-pointer"
              >
                I understand, proceed with deletion
              </button>
            </div>
          )}

          {step === 'phone' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  Your registered phone number
                </label>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-bold bg-slate-100 text-slate-700">
                    +91
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    maxLength={10}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-red-500 bg-slate-50"
                    placeholder="10-digit number"
                  />
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-600 font-semibold">{error}</p>
              )}

              <button
                onClick={handleRequestOTP}
                disabled={loading || phone.length < 10}
                className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Send Verification OTP'}
              </button>
            </div>
          )}

          {step === 'otp' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  Enter the 6-digit OTP sent to +91 {phone}
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="w-full text-center px-4 py-3 rounded-xl border border-slate-300 text-lg font-mono font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-red-500 bg-slate-50"
                />
              </div>

              {error && (
                <p className="text-xs text-red-600 font-semibold">{error}</p>
              )}

              <button
                onClick={handleVerifyAndDelete}
                disabled={loading || otp.length < 4}
                className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Verify & Delete My Account'}
              </button>
            </div>
          )}

          {step === 'done' && (
            <div className="text-center py-6 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h2 className="text-lg font-bold text-slate-900">Account Deleted</h2>
              <p className="text-sm text-slate-600">
                Your account has been successfully deleted.
                {result?.ordersAnonymised > 0 && (
                  <> {result.ordersAnonymised} past order(s) have been anonymised and retained for tax compliance.</>
                )}
              </p>
              <p className="text-xs text-slate-500">
                You can close this page now. If you wish to use Bio-Bramha again, you may create a new account.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
