'use client'

import React, { useEffect, useState } from 'react'
import {
  User, Mail, Phone, MapPin, Plus, Trash2, Star, Shield,
  AlertTriangle, RefreshCw, CheckCircle2, Edit3, X, ExternalLink
} from 'lucide-react'
import { api } from '@/lib/api-client'
import { useApp } from '@/lib/app-context'
import { STATE_OPTIONS, stateName } from '@/lib/data'

interface Address {
  id: string
  line1: string
  city: string
  pincode: string
  state: string
  isDefault: boolean
}

interface ConsentRecord {
  policyVersion: string
  consentedAt: string
}

export const ProfilePage: React.FC = () => {
  const { currentUser, logout } = useApp()
  const [profile, setProfile] = useState<any>(null)
  const [addresses, setAddresses] = useState<Address[]>([])
  const [consent, setConsent] = useState<ConsentRecord | null>(null)
  const [loading, setLoading] = useState(true)

  // Edit states
  const [editingName, setEditingName] = useState(false)
  const [editingEmail, setEditingEmail] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [emailInput, setEmailInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  // Add address
  const [showAddAddress, setShowAddAddress] = useState(false)
  const [addrLine, setAddrLine] = useState('')
  const [addrCity, setAddrCity] = useState('')
  const [addrPincode, setAddrPincode] = useState('')
  const [addrState, setAddrState] = useState('MH')
  const [addrError, setAddrError] = useState('')

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteStep, setDeleteStep] = useState<'warn' | 'otp' | 'done'>('warn')
  const [deleteOtp, setDeleteOtp] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteMsg, setDeleteMsg] = useState('')

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    setLoading(true)
    try {
      const res = await api.getAccount()
      if (res.success) {
        setProfile(res.profile)
        setAddresses(res.addresses || [])
        setConsent(res.consent || null)
        setNameInput(res.profile?.name || '')
        setEmailInput(res.profile?.email || '')
      }
    } catch {}
    setLoading(false)
  }

  async function handleSaveName() {
    if (!nameInput.trim()) return
    setSaving(true)
    setSaveMsg('')
    const res = await api.updateAccount({ name: nameInput.trim() })
    if (res.success) {
      setSaveMsg('Name updated.')
      setEditingName(false)
      loadProfile()
    } else {
      setSaveMsg(res.error || 'Could not update.')
    }
    setSaving(false)
  }

  async function handleSaveEmail() {
    setSaving(true)
    setSaveMsg('')
    const res = await api.updateAccount({ email: emailInput.trim() })
    if (res.success) {
      setSaveMsg('Email updated.')
      setEditingEmail(false)
      loadProfile()
    } else {
      setSaveMsg(res.error || 'Could not update.')
    }
    setSaving(false)
  }

  async function handleAddAddress() {
    setAddrError('')
    if (!addrLine.trim()) { setAddrError('Address is required.'); return }
    if (!addrCity.trim()) { setAddrError('City is required.'); return }
    if (!/^[1-9]\d{5}$/.test(addrPincode)) { setAddrError('Enter a valid 6-digit pincode.'); return }

    setSaving(true)
    const res = await api.addAddress({ line1: addrLine, city: addrCity, pincode: addrPincode, state: addrState })
    if (res.success) {
      setShowAddAddress(false)
      setAddrLine(''); setAddrCity(''); setAddrPincode(''); setAddrState('AP')
      loadProfile()
    } else {
      setAddrError(res.error || 'Could not save address.')
    }
    setSaving(false)
  }

  async function handleDeleteAddress(id: string) {
    const res = await api.deleteAddress(id)
    if (res.success) loadProfile()
  }

  async function handleSetDefault(id: string) {
    const res = await api.updateAddress(id, { setDefault: true })
    if (res.success) loadProfile()
  }

  async function handleRequestDeletion() {
    setDeleteLoading(true)
    setDeleteMsg('')
    const res = await api.requestDeletion()
    if (res.success) {
      setDeleteStep('otp')
      setDeleteMsg('Enter the 6-digit OTP sent to your registered phone.')
    } else {
      setDeleteMsg(res.error || 'Could not initiate deletion.')
    }
    setDeleteLoading(false)
  }

  async function handleConfirmDeletion() {
    if (deleteOtp.length < 4) {
      setDeleteMsg('Please enter the 6-digit OTP.')
      return
    }
    setDeleteLoading(true)
    setDeleteMsg('')
    const res = await api.confirmDeletion(deleteOtp)
    if (res.success) {
      setDeleteStep('done')
      setDeleteMsg(`Account deleted. ${res.ordersAnonymised || 0} order(s) anonymised.`)
      // Clear session after a brief delay so the user sees the message
      setTimeout(() => {
        localStorage.removeItem('biobramha_session_token')
        localStorage.removeItem('biobramha_logged_user')
        window.location.href = '/'
      }, 3000)
    } else {
      setDeleteMsg(res.error || 'Could not complete deletion.')
    }
    setDeleteLoading(false)
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-slate-400 text-sm">
        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
        Loading profile...
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-slate-900">My Profile</h1>

      {saveMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {saveMsg}
        </div>
      )}

      {/* Personal Info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <User className="w-4 h-4 text-emerald-600" />
          Personal Information
        </h2>

        {/* Phone (read-only) */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Phone className="w-4 h-4 text-slate-400" />
            <span className="text-slate-600">+91 {profile?.phone || currentUser.phone}</span>
          </div>
          <span className="text-xs text-slate-400">Cannot be changed</span>
        </div>

        {/* Name */}
        <div className="flex items-center justify-between">
          {editingName ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <button onClick={handleSaveName} disabled={saving} className="text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer">Save</button>
              <button onClick={() => setEditingName(false)} className="text-xs text-slate-400 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-slate-400" />
                <span className="text-slate-800 font-medium">{profile?.name || 'Not set'}</span>
              </div>
              <button onClick={() => setEditingName(true)} className="text-xs text-emerald-600 font-semibold flex items-center gap-1 cursor-pointer">
                <Edit3 className="w-3 h-3" /> Edit
              </button>
            </>
          )}
        </div>

        {/* Email */}
        <div className="flex items-center justify-between">
          {editingEmail ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="email@example.com"
                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <button onClick={handleSaveEmail} disabled={saving} className="text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer">Save</button>
              <button onClick={() => setEditingEmail(false)} className="text-xs text-slate-400 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-slate-400" />
                <span className="text-slate-800 font-medium">{profile?.email || 'Not set (optional)'}</span>
              </div>
              <button onClick={() => setEditingEmail(true)} className="text-xs text-emerald-600 font-semibold flex items-center gap-1 cursor-pointer">
                <Edit3 className="w-3 h-3" /> Edit
              </button>
            </>
          )}
        </div>
      </div>

      {/* Addresses */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600" />
            Saved Addresses
          </h2>
          <button
            onClick={() => setShowAddAddress(true)}
            data-testid="profile-add-address-btn"
            className="min-h-[36px] px-2 text-xs font-bold text-emerald-600 flex items-center gap-1 cursor-pointer hover:text-emerald-700"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>

        {addresses.length === 0 ? (
          <p className="text-xs text-slate-500">No saved addresses. Your first order address will be saved here automatically.</p>
        ) : (
          <div className="space-y-2">
            {addresses.map((addr) => (
              <div key={addr.id} data-testid={`profile-address-${addr.id}`} className="flex items-start justify-between gap-2 bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div className="text-xs text-slate-700 space-y-0.5 min-w-0">
                  <p className="font-medium text-slate-900 break-words">{addr.line1}</p>
                  <p className="text-slate-600">
                    {addr.city}, {stateName(addr.state)} &bull; <span className="font-bold text-slate-800">PIN: {addr.pincode}</span>
                  </p>
                  {addr.isDefault && (
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-bold mt-1">
                      <Star className="w-3 h-3" /> Default Address
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!addr.isDefault && (
                    <button
                      onClick={() => handleSetDefault(addr.id)}
                      data-testid={`profile-set-default-${addr.id}`}
                      className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                      title="Set as default"
                      aria-label="Set as default"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteAddress(addr.id)}
                    data-testid={`profile-delete-address-${addr.id}`}
                    className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-rose-50 cursor-pointer"
                    title="Delete"
                    aria-label="Delete address"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add address form */}
        {showAddAddress && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3" data-testid="profile-add-address-form">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Street Address</label>
              <input
                type="text"
                placeholder="House no., street, area"
                value={addrLine}
                onChange={(e) => setAddrLine(e.target.value)}
                data-testid="profile-address-line-input"
                className="w-full min-w-0 px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white text-slate-900"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">City / Town</label>
                <input
                  type="text"
                  placeholder="City / Town"
                  value={addrCity}
                  onChange={(e) => setAddrCity(e.target.value)}
                  data-testid="profile-address-city-input"
                  className="w-full min-w-0 px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white text-slate-900"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">State</label>
                <select
                  value={addrState}
                  onChange={(e) => setAddrState(e.target.value)}
                  data-testid="profile-address-state-select"
                  className="w-full min-w-0 px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white text-slate-900"
                >
                  {STATE_OPTIONS.map((s) => (
                    <option key={s.code} value={s.code}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Pincode (6 digits)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="6-digit Pincode"
                  value={addrPincode}
                  onChange={(e) => setAddrPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  data-testid="profile-address-pincode-input"
                  className="w-full min-w-0 px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white text-slate-900 font-mono"
                />
              </div>
            </div>
            {addrError && <p className="text-xs text-red-600 font-semibold">{addrError}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleAddAddress}
                disabled={saving}
                data-testid="profile-save-address-btn"
                className="min-h-[40px] px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Address'}
              </button>
              <button
                onClick={() => setShowAddAddress(false)}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-300 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Consent History */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-600" />
          Privacy & Consent
        </h2>

        {consent ? (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-800">
            <p className="font-semibold">Consent given</p>
            <p>Policy version: {consent.policyVersion}</p>
            <p>Date: {new Date(consent.consentedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        ) : (
          <p className="text-xs text-slate-500">No consent records found.</p>
        )}

        <a
          href="/privacy-policy"
          target="_blank"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          View Privacy Policy
        </a>
      </div>

      {/* Delete Account */}
      <div className="bg-white rounded-2xl border border-red-200 p-5 space-y-3">
        <h2 className="text-sm font-bold text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Delete Account
        </h2>
        <p className="text-xs text-slate-600">
          Permanently delete your account and personal data. Past orders will be anonymised but retained for tax compliance.
        </p>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-bold hover:bg-red-100 cursor-pointer"
          >
            Request Account Deletion
          </button>
        ) : deleteStep === 'done' ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-800">
            <p className="font-bold">Account deleted.</p>
            <p>{deleteMsg}</p>
            <p className="mt-2 text-slate-500">Redirecting to login...</p>
          </div>
        ) : deleteStep === 'otp' ? (
          <div className="space-y-3">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
              <p className="font-bold">Verification required.</p>
              <p>Enter the 6-digit OTP sent to your registered phone to confirm permanent deletion.</p>
            </div>
            <input
              type="text"
              value={deleteOtp}
              onChange={(e) => setDeleteOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              placeholder="Enter 6-digit OTP"
              className="w-full text-center px-4 py-3 rounded-xl border border-red-300 text-lg font-mono font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-red-500 bg-slate-50"
            />
            {deleteMsg && (
              <p className="text-xs font-semibold text-red-600">{deleteMsg}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleConfirmDeletion}
                disabled={deleteLoading || deleteOtp.length < 4}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 cursor-pointer disabled:opacity-50 flex items-center gap-1"
              >
                {deleteLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                Delete My Account
              </button>
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteMsg(''); setDeleteStep('warn'); setDeleteOtp('') }}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-300 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800">
              <p className="font-bold">This cannot be undone.</p>
              <p>An OTP will be sent to your registered phone for verification.</p>
            </div>
            {deleteMsg && (
              <p className="text-xs font-semibold text-red-600">{deleteMsg}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleRequestDeletion}
                disabled={deleteLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 cursor-pointer disabled:opacity-50 flex items-center gap-1"
              >
                {deleteLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                Confirm & Send OTP
              </button>
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteMsg('') }}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-300 cursor-pointer"
              >
                Cancel
              </button>
            </div>
            <a
              href="/delete-account"
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
            >
              <ExternalLink className="w-3 h-3" />
              Or use the web deletion page
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
