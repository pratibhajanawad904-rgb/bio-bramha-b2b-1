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
import { Sprout, Package, ShieldCheck, ShoppingBag, Warehouse, User } from 'lucide-react'

export const AppShell: React.FC = () => {
  const { currentUser, selectedProduct, setSelectedProduct } = useApp()
  const [activeTab, setActiveTab] = useState<string>('catalog')
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false)
  const [tabHistory, setTabHistory] = useState<string[]>(['catalog'])

  const activeTabRef = useRef(activeTab)
  const isCartOpenRef = useRef(isCartOpen)
  const selectedProductRef = useRef(selectedProduct)
  const tabHistoryRef = useRef(tabHistory)

  useEffect(() => { activeTabRef.current = activeTab }, [activeTab])
  useEffect(() => { isCartOpenRef.current = isCartOpen }, [isCartOpen])
  useEffect(() => { selectedProductRef.current = selectedProduct }, [selectedProduct])
  useEffect(() => { tabHistoryRef.current = tabHistory }, [tabHistory])

  const navigateToTab = (newTab: string) => {
    if (newTab === activeTab) return
    setTabHistory(prev => [...prev, newTab])
    setActiveTab(newTab)
  }

  // Set initial tab on role switch if invalid for role
  useEffect(() => {
    if (activeTab === 'warehouse' && currentUser.role !== 'warehouse') {
      setActiveTab('catalog')
    } else if (activeTab === 'admin' && currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
      setActiveTab('catalog')
    }
  }, [currentUser.role])

  // Android hardware / gesture back button (Capacitor only)
  useEffect(() => {
    if (!isNativeApp()) return

    let isListenerActive = true

    const setupBackButton = async () => {
      try {
        const listener = await CapApp.addListener('backButton', () => {
          if (selectedProductRef.current) {
            setSelectedProduct(null)
            return
          }
          if (isCartOpenRef.current) {
            setIsCartOpen(false)
            return
          }
          if (tabHistoryRef.current.length > 1) {
            const nextHistory = [...tabHistoryRef.current]
            nextHistory.pop()
            const previousTab = nextHistory[nextHistory.length - 1] || 'catalog'
            tabHistoryRef.current = nextHistory
            setTabHistory(nextHistory)
            setActiveTab(previousTab)
            return
          }
          if (activeTabRef.current !== 'catalog') {
            tabHistoryRef.current = ['catalog']
            setTabHistory(['catalog'])
            setActiveTab('catalog')
            return
          }
          CapApp.exitApp()
        })

        if (!isListenerActive) listener.remove()
      } catch (e) {
        console.warn('Capacitor backButton listener error:', e)
      }
    }

    setupBackButton()

    return () => {
      isListenerActive = false
    }
  }, [setSelectedProduct])

  const navBtn = (tab: string, active: string, inactive = 'text-slate-500 font-medium') =>
    `flex flex-col items-center justify-center gap-0.5 min-h-[48px] min-w-[56px] py-1 px-2 rounded-xl transition-all relative ${
      activeTab === tab ? active : inactive
    }`

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col font-sans text-slate-800 selection:bg-emerald-500 selection:text-white overflow-x-hidden">
      <Header
        activeTab={activeTab}
        setActiveTab={navigateToTab}
        setIsCartOpen={setIsCartOpen}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 pt-4 sm:pt-6 pb-28 md:pb-12">
        {activeTab === 'catalog' && <ProductCatalog />}
        {activeTab === 'my-orders' && <BuyerOrdersView onOpenCart={() => setIsCartOpen(true)} />}
        {activeTab === 'warehouse' && <WarehouseDashboard />}
        {activeTab === 'admin' && <AdminDashboard />}
        {activeTab === 'profile' && <ProfilePage />}
      </main>

      <ProductDetailModal />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onOrderSuccess={() => navigateToTab('my-orders')}
      />

      {/* Mobile bottom navigation */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] px-2 flex items-center justify-around"
        data-testid="mobile-bottom-nav"
      >
        <button onClick={() => navigateToTab('catalog')} data-testid="nav-catalog" className={navBtn('catalog', 'text-emerald-700 font-bold bg-emerald-50')}>
          <Sprout className="w-5 h-5" />
          <span className="text-[10px]">Catalogue</span>
        </button>

        {currentUser.role === 'buyer' && (
          <button onClick={() => navigateToTab('my-orders')} data-testid="nav-my-orders" className={navBtn('my-orders', 'text-emerald-700 font-bold bg-emerald-50')}>
            <Package className="w-5 h-5" />
            <span className="text-[10px]">My Orders</span>
          </button>
        )}

        {currentUser.role === 'warehouse' && (
          <button onClick={() => navigateToTab('warehouse')} data-testid="nav-warehouse" className={navBtn('warehouse', 'text-amber-800 font-bold bg-amber-50')}>
            <Warehouse className="w-5 h-5" />
            <span className="text-[10px]">Warehouse</span>
          </button>
        )}

        {(currentUser.role === 'admin' || currentUser.role === 'super_admin') && (
          <button onClick={() => navigateToTab('admin')} data-testid="nav-admin" className={navBtn('admin', 'text-indigo-700 font-bold bg-indigo-50')}>
            <ShieldCheck className="w-5 h-5" />
            <span className="text-[10px]">Admin</span>
          </button>
        )}

        {currentUser.role === 'buyer' && (
          <button onClick={() => setIsCartOpen(true)} data-testid="nav-cart" className={navBtn('__cart__', '')}>
            <ShoppingBag className="w-5 h-5 text-emerald-600" />
            <span className="text-[10px]">Cart</span>
          </button>
        )}

        <button onClick={() => navigateToTab('profile')} data-testid="nav-profile" className={navBtn('profile', 'text-emerald-700 font-bold bg-emerald-50')}>
          <User className="w-5 h-5" />
          <span className="text-[10px]">Profile</span>
        </button>
      </nav>

      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 text-xs py-6 mb-16 md:mb-0">
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
            <span>Dispatch from Taloja, Mumbai</span>
            <span>•</span>
            <span>Organic Certified</span>
          </div>

          <p className="text-slate-500 text-[11px]">© 2026 Bio-Bramha Dealer Mitra B2B Platform</p>
        </div>
      </footer>
    </div>
  )
}
