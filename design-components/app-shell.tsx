'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Header } from './header'
import { ProductCatalog } from './product-catalog'
import { ProductDetailModal } from './product-detail-modal'
import { BuyerOrdersView } from './buyer-orders-view'
import { WarehouseDashboard } from './warehouse-dashboard'
import { AdminDashboard } from './admin-dashboard'
import { ProfilePage } from './profile-page'
import { CartDrawer } from './cart-drawer'
import { useApp } from '@/lib/app-context'
import { isNativeApp } from '@/lib/platform'
import { App as CapApp } from '@capacitor/app'
import { Sprout, Phone, Mail, ShieldCheck, Heart, Warehouse } from 'lucide-react'

export const AppShell: React.FC = () => {
  const { currentUser, selectedProduct, setSelectedProduct } = useApp()
  const [activeTab, setActiveTab] = useState<string>('catalog')
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false)
  const [tabHistory, setTabHistory] = useState<string[]>(['catalog'])

  const activeTabRef = useRef(activeTab)
  const isCartOpenRef = useRef(isCartOpen)
  const selectedProductRef = useRef(selectedProduct)
  const tabHistoryRef = useRef(tabHistory)

  useEffect(() => {
    activeTabRef.current = activeTab
  }, [activeTab])

  useEffect(() => {
    isCartOpenRef.current = isCartOpen
  }, [isCartOpen])

  useEffect(() => {
    selectedProductRef.current = selectedProduct
  }, [selectedProduct])

  useEffect(() => {
    tabHistoryRef.current = tabHistory
  }, [tabHistory])

  const navigateToTab = (newTab: string) => {
    if (newTab === activeTab) return
    setTabHistory(prev => [...prev, newTab])
    setActiveTab(newTab)
  }

  // Handle Native Android Hardware / Gesture Back Button
  useEffect(() => {
    if (!isNativeApp()) return

    let isListenerActive = true

    const setupBackButton = async () => {
      try {
        const listener = await CapApp.addListener('backButton', () => {
          // 1. If product detail modal is open, close it
          if (selectedProductRef.current) {
            setSelectedProduct(null)
            return
          }

          // 2. If cart drawer is open, close it
          if (isCartOpenRef.current) {
            setIsCartOpen(false)
            return
          }

          // 3. If there is tab history, go back to previous tab
          if (tabHistoryRef.current.length > 1) {
            const nextHistory = [...tabHistoryRef.current]
            nextHistory.pop() // remove current tab
            const previousTab = nextHistory[nextHistory.length - 1] || 'catalog'
            tabHistoryRef.current = nextHistory
            setTabHistory(nextHistory)
            setActiveTab(previousTab)
            return
          }

          // 4. If on a sub-page but history is empty, go to catalog
          if (activeTabRef.current !== 'catalog') {
            tabHistoryRef.current = ['catalog']
            setTabHistory(['catalog'])
            setActiveTab('catalog')
            return
          }

          // 5. If already on root catalog with no modals open, exit app
          CapApp.exitApp()
        })

        if (!isListenerActive) {
          listener.remove()
        }
      } catch (e) {
        console.warn('Capacitor backButton listener error:', e)
      }
    }

    setupBackButton()

    return () => {
      isListenerActive = false
    }
  }, [setSelectedProduct])

  // Set initial tab on role switch if invalid for role
  React.useEffect(() => {
    if (activeTab === 'warehouse' && currentUser.role !== 'warehouse') {
      setActiveTab('catalog')
    } else if (activeTab === 'admin' && currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
      setActiveTab('catalog')
    }
  }, [currentUser.role])

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 selection:bg-emerald-500 selection:text-white overflow-x-hidden">
      {/* Top Main Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={navigateToTab}
        setIsCartOpen={setIsCartOpen}
      />

      {/* Main Page Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 pt-4 sm:pt-6 pb-28 md:pb-12">
        {activeTab === 'catalog' && <ProductCatalog />}
        {activeTab === 'my-orders' && <BuyerOrdersView />}
        {activeTab === 'warehouse' && <WarehouseDashboard />}
        {activeTab === 'admin' && <AdminDashboard />}
        {activeTab === 'profile' && <ProfilePage />}
      </main>

      {/* Product Detail Interactive Multi-Image Slider Modal */}
      <ProductDetailModal />

      {/* Slide-out Shopping Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onOrderSuccess={() => navigateToTab('my-orders')}
      />

      {/* Mobile App Native Bottom Navigation Bar (Visible on mobile/tablet screens) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg py-1.5 pb-[max(0.625rem,calc(env(safe-area-inset-bottom,0px)+0.25rem))] px-3 flex items-center justify-around">
        <button
          onClick={() => navigateToTab('catalog')}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'catalog'
              ? 'text-emerald-700 font-bold bg-emerald-50'
              : 'text-slate-500 font-medium'
          }`}
        >
          <Sprout className="w-5 h-5" />
          <span className="text-[10px]">Catalogue</span>
        </button>

        {currentUser.role === 'buyer' && (
          <button
            onClick={() => navigateToTab('my-orders')}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all relative ${
              activeTab === 'my-orders'
                ? 'text-emerald-700 font-bold bg-emerald-50'
                : 'text-slate-500 font-medium'
            }`}
          >
            <Phone className="w-5 h-5" />
            <span className="text-[10px]">My Orders</span>
          </button>
        )}

        {currentUser.role === 'warehouse' && (
          <button
            onClick={() => navigateToTab('warehouse')}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all relative ${
              activeTab === 'warehouse'
                ? 'text-amber-800 font-bold bg-amber-50'
                : 'text-slate-500 font-medium'
            }`}
          >
            <Warehouse className="w-5 h-5" />
            <span className="text-[10px]">Dispatch</span>
          </button>
        )}

        {(currentUser.role === 'admin' || currentUser.role === 'super_admin') && (
          <button
            onClick={() => navigateToTab('admin')}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all relative ${
              activeTab === 'admin'
                ? 'text-indigo-700 font-bold bg-indigo-50'
                : 'text-slate-500 font-medium'
            }`}
          >
            <ShieldCheck className="w-5 h-5" />
            <span className="text-[10px]">Admin</span>
          </button>
        )}

        {currentUser.role === 'buyer' && (
          <button
            onClick={() => navigateToTab('profile')}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${
              activeTab === 'profile'
                ? 'text-emerald-700 font-bold bg-emerald-50'
                : 'text-slate-500 font-medium'
            }`}
          >
            <Heart className="w-5 h-5" />
            <span className="text-[10px]">Profile</span>
          </button>
        )}
      </nav>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 text-xs py-6 mb-14 md:mb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold">
              <Sprout className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-slate-200 text-sm">Bio-Bramha Dealer Mitra</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-slate-400 text-[11px] sm:text-xs">
            <span>Advance UPI & Bank Transfer</span>
            <span>•</span>
            <span>Multi-Warehouse Realtime Sync</span>
            <span>•</span>
            <span>Organic Certified</span>
          </div>

          <p className="text-slate-500 text-[11px]">© 2026 Bio-Bramha Dealer Mitra B2B Platform</p>
        </div>
      </footer>
    </div>
  )
}
