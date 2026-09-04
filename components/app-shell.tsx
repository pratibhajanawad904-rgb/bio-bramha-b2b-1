'use client'

import React, { useState } from 'react'
import { Header } from './header'
import { ProductCatalog } from './product-catalog'
import { ProductDetailModal } from './product-detail-modal'
import { BuyerOrdersView } from './buyer-orders-view'
import { WarehouseDashboard } from './warehouse-dashboard'
import { AdminDashboard } from './admin-dashboard'
import { ProfilePage } from './profile-page'
import { CartDrawer } from './cart-drawer'
import { useApp } from '@/lib/app-context'
import { Sprout, Phone, Mail, ShieldCheck, Heart, Warehouse } from 'lucide-react'

export const AppShell: React.FC = () => {
  const { currentUser } = useApp()
  const [activeTab, setActiveTab] = useState<string>('catalog')
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false)

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
        setActiveTab={setActiveTab}
        setIsCartOpen={setIsCartOpen}
      />

      {/* Main Page Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 pt-4 sm:pt-6 pb-24 md:pb-12">
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
        onOrderSuccess={() => setActiveTab('my-orders')}
      />

      {/* Mobile App Native Bottom Navigation Bar (Visible on mobile/tablet screens) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] px-3 flex items-center justify-around">
        <button
          onClick={() => setActiveTab('catalog')}
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
            onClick={() => setActiveTab('my-orders')}
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
            onClick={() => setActiveTab('warehouse')}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${
              activeTab === 'warehouse'
                ? 'text-amber-800 font-bold bg-amber-50'
                : 'text-slate-500 font-medium'
            }`}
          >
            <Warehouse className="w-5 h-5 text-amber-600" />
            <span className="text-[10px]">Warehouse</span>
          </button>
        )}

        {(currentUser.role === 'admin' || currentUser.role === 'super_admin') && (
          <button
            onClick={() => setActiveTab('admin')}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${
              activeTab === 'admin'
                ? 'text-indigo-800 font-bold bg-indigo-50'
                : 'text-slate-500 font-medium'
            }`}
          >
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <span className="text-[10px]">Admin</span>
          </button>
        )}

        {currentUser.role === 'buyer' && (
          <button
            onClick={() => setIsCartOpen(true)}
            className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl text-slate-500 font-medium relative"
          >
            <Heart className="w-5 h-5 text-emerald-600" />
            <span className="text-[10px]">Cart</span>
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
