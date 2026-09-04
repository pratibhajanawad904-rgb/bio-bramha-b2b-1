'use client'

import React, { useEffect, useState } from 'react'
import {
  Shield, Upload, FileText, Link2, Plus, Trash2, Save,
  RefreshCw, CheckCircle2, AlertCircle, User, Mail, Phone
} from 'lucide-react'
import { api } from '@/lib/api-client'

/**
 * Admin compliance panel for managing:
 *   - Privacy policy PDF uploads (versioned)
 *   - Refund/payment policy (link or PDF)
 *   - Data-usage notice items (editable list)
 *   - Grievance officer contact
 *
 * Sits as a tab in the admin dashboard alongside product/offer/role management.
 */

export const AdminCompliancePanel: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'privacy' | 'refund' | 'notice' | 'grievance'>('privacy')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Current policy data
  const [currentPolicy, setCurrentPolicy] = useState<any>(null)
  const [noticeItems, setNoticeItems] = useState<any[]>([])
  const [grievance, setGrievance] = useState({ name: '', email: '', phone: '' })

  // Privacy policy form
  const [ppVersion, setPpVersion] = useState('')
  const [ppEffective, setPpEffective] = useState('')
  const [ppFile, setPpFile] = useState<File | null>(null)

  // Refund policy form
  const [refundMode, setRefundMode] = useState<'link' | 'pdf'>('link')
  const [refundUrl, setRefundUrl] = useState('')
  const [refundFile, setRefundFile] = useState<File | null>(null)

  useEffect(() => { loadPolicies() }, [])

  async function loadPolicies() {
    setLoading(true)
    try {
      const res = await api.getPolicies()
      if (res.success) {
        setCurrentPolicy(res)
        setNoticeItems(
          (res.dataUsageNotice || []).map((item: any, i: number) => ({
            ...item,
            id: `item-${i}`
          }))
        )
        if (res.grievanceContact) {
          setGrievance({
            name: res.grievanceContact.name || '',
            email: res.grievanceContact.email || '',
            phone: res.grievanceContact.phone || ''
          })
        }
      }
    } catch {}
    setLoading(false)
  }

  function flash(type: 'success' | 'error', text: string) {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }

  async function handlePrivacyUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!ppFile || !ppVersion || !ppEffective) {
      flash('error', 'All fields are required.')
      return
    }

    setSaving(true)
    const form = new FormData()
    form.append('action', 'upload-privacy-policy')
    form.append('file', ppFile)
    form.append('version', ppVersion)
    form.append('effectiveDate', ppEffective)

    const token = localStorage.getItem('biobramha_session_token')
    try {
      const res = await fetch('/api/admin/policies', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form
      })
      const data = await res.json()
      if (data.success) {
        flash('success', `Privacy policy v${ppVersion} uploaded successfully.`)
        setPpFile(null); setPpVersion(''); setPpEffective('')
        loadPolicies()
      } else {
        flash('error', data.error || 'Upload failed.')
      }
    } catch {
      flash('error', 'Could not reach server.')
    }
    setSaving(false)
  }

  async function handleRefundSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const form = new FormData()
    form.append('action', 'set-refund-policy')
    form.append('mode', refundMode)
    if (refundMode === 'link') {
      form.append('url', refundUrl)
    } else if (refundFile) {
      form.append('file', refundFile)
    }

    const token = localStorage.getItem('biobramha_session_token')
    try {
      const res = await fetch('/api/admin/policies', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form
      })
      const data = await res.json()
      if (data.success) {
        flash('success', 'Refund policy saved.')
        loadPolicies()
      } else {
        flash('error', data.error || 'Save failed.')
      }
    } catch {
      flash('error', 'Could not reach server.')
    }
    setSaving(false)
  }

  async function handleGrievanceSave(e: React.FormEvent) {
    e.preventDefault()
    if (!grievance.name || !grievance.email) {
      flash('error', 'Name and email are required.')
      return
    }

    setSaving(true)
    const form = new FormData()
    form.append('action', 'update-grievance-contact')
    form.append('name', grievance.name)
    form.append('email', grievance.email)
    form.append('phone', grievance.phone)

    const token = localStorage.getItem('biobramha_session_token')
    try {
      const res = await fetch('/api/admin/policies', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form
      })
      const data = await res.json()
      if (data.success) {
        flash('success', 'Grievance contact updated.')
        loadPolicies()
      } else {
        flash('error', data.error || 'Save failed.')
      }
    } catch {
      flash('error', 'Could not reach server.')
    }
    setSaving(false)
  }

  async function handleNoticeSave() {
    if (noticeItems.length === 0) {
      flash('error', 'At least one item is required.')
      return
    }

    setSaving(true)
    const form = new FormData()
    form.append('action', 'update-notice-items')
    form.append('items', JSON.stringify(noticeItems.map((item) => ({
      category: item.category,
      purpose: item.purpose,
      sharedWith: item.sharedWith,
      retention: item.retention
    }))))

    const token = localStorage.getItem('biobramha_session_token')
    try {
      const res = await fetch('/api/admin/policies', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form
      })
      const data = await res.json()
      if (data.success) {
        flash('success', `${data.count} notice items saved.`)
        loadPolicies()
      } else {
        flash('error', data.error || 'Save failed.')
      }
    } catch {
      flash('error', 'Could not reach server.')
    }
    setSaving(false)
  }

  function addNoticeItem() {
    setNoticeItems(prev => [...prev, { id: `new-${Date.now()}`, category: '', purpose: '', sharedWith: '', retention: '' }])
  }

  function removeNoticeItem(id: string) {
    setNoticeItems(prev => prev.filter(item => item.id !== id))
  }

  function updateNoticeItem(id: string, field: string, value: string) {
    setNoticeItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item))
  }

  if (loading) {
    return <div className="py-8 text-center text-slate-400 text-sm"><RefreshCw className="w-5 h-5 animate-spin mx-auto" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-5 h-5 text-emerald-600" />
        <h2 className="text-lg font-bold text-slate-900">Legal & Compliance</h2>
      </div>

      {msg && (
        <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
          msg.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {msg.text}
        </div>
      )}

      {/* Section tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['privacy', 'refund', 'notice', 'grievance'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setActiveSection(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeSection === s ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {s === 'privacy' ? 'Privacy Policy' : s === 'refund' ? 'Refund Policy' : s === 'notice' ? 'Data Notice' : 'Grievance Contact'}
          </button>
        ))}
      </div>

      {/* Privacy Policy Upload */}
      {activeSection === 'privacy' && (
        <form onSubmit={handlePrivacyUpload} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-800">Upload New Privacy Policy Version</h3>

          {currentPolicy?.privacyPolicy && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-xs text-emerald-800">
              Current: v{currentPolicy.privacyPolicy.version} (effective {currentPolicy.privacyPolicy.effectiveDate})
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Version</label>
              <input
                type="text"
                placeholder="e.g. 1.0"
                value={ppVersion}
                onChange={(e) => setPpVersion(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Effective Date</label>
              <input
                type="date"
                value={ppEffective}
                onChange={(e) => setPpEffective(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">PDF File (max 10MB)</label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setPpFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
            />
          </div>

          <button
            type="submit"
            disabled={saving || !ppFile || !ppVersion || !ppEffective}
            className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            Upload & Publish
          </button>
        </form>
      )}

      {/* Refund Policy */}
      {activeSection === 'refund' && (
        <form onSubmit={handleRefundSave} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-800">Refund / Payment Policy</h3>

          <div className="flex gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={refundMode === 'link'} onChange={() => setRefundMode('link')} className="text-emerald-600" />
              <span className="text-xs font-semibold flex items-center gap-1"><Link2 className="w-3.5 h-3.5" /> External Link</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={refundMode === 'pdf'} onChange={() => setRefundMode('pdf')} className="text-emerald-600" />
              <span className="text-xs font-semibold flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Upload PDF</span>
            </label>
          </div>

          {refundMode === 'link' ? (
            <input
              type="url"
              placeholder="https://..."
              value={refundUrl}
              onChange={(e) => setRefundUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          ) : (
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setRefundFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          )}

          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Refund Policy
          </button>
        </form>
      )}

      {/* Data Usage Notice Editor */}
      {activeSection === 'notice' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Data Usage Notice Items</h3>
            <button
              onClick={addNoticeItem}
              className="text-xs font-bold text-emerald-600 flex items-center gap-1 cursor-pointer hover:text-emerald-700"
            >
              <Plus className="w-3.5 h-3.5" /> Add Item
            </button>
          </div>

          <p className="text-xs text-slate-500">
            These items are shown to new users during signup. They describe what data is collected, why, who it is shared with, and how long it is kept.
          </p>

          <div className="space-y-3">
            {noticeItems.map((item, idx) => (
              <div key={item.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Item {idx + 1}</span>
                  <button onClick={() => removeNoticeItem(item.id)} className="text-slate-400 hover:text-red-500 cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Category (e.g. 'Name and phone number')"
                  value={item.category}
                  onChange={(e) => updateNoticeItem(item.id, 'category', e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Purpose (why it's collected)"
                  value={item.purpose}
                  onChange={(e) => updateNoticeItem(item.id, 'purpose', e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Shared with (optional)"
                    value={item.sharedWith || ''}
                    onChange={(e) => updateNoticeItem(item.id, 'sharedWith', e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Retention (optional)"
                    value={item.retention || ''}
                    onChange={(e) => updateNoticeItem(item.id, 'retention', e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleNoticeSave}
            disabled={saving}
            className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save All Notice Items
          </button>
        </div>
      )}

      {/* Grievance Contact */}
      {activeSection === 'grievance' && (
        <form onSubmit={handleGrievanceSave} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-800">Grievance Officer Contact</h3>
          <p className="text-xs text-slate-500">Displayed on the privacy policy page and at signup.</p>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1"><User className="w-3 h-3" /> Name</label>
            <input
              type="text"
              value={grievance.name}
              onChange={(e) => setGrievance(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1"><Mail className="w-3 h-3" /> Email</label>
            <input
              type="email"
              value={grievance.email}
              onChange={(e) => setGrievance(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1"><Phone className="w-3 h-3" /> Phone (optional)</label>
            <input
              type="tel"
              value={grievance.phone}
              onChange={(e) => setGrievance(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Grievance Contact
          </button>
        </form>
      )}
    </div>
  )
}
