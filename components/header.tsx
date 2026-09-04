'use client'

import React from 'react'
import { useApp } from '@/lib/app-context'
import { Role } from '@/lib/data'
import { GoogleAuthButton } from './google-auth-button'
import { MobileOTPModal } from './mobile-otp-modal'
import { LogoutConfirmationModal } from './logout-confirmation-modal'
import { Sprout, ShoppingBag, ShieldCheck, Warehouse, User, ChevronDown, Tag, Smartphone } from 'lucide-react'

interface HeaderProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  setIsCartOpen: (open: boolean) => void
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, setIsCartOpen }) => {
  const { currentUser, isGoogleLoggedIn, logout, cart, orders, offers } = useApp()
  const [isAccountMenuOpen, setIsAccountMenuOpen] = React.useState(false)
  const [isOTPModalOpen, setIsOTPModalOpen] = React.useState(false)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = React.useState(false)

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const pendingOrdersCount = orders.filter((o) => o.status === 'placed').length
  const activeOffersCount = offers.filter((o) => o.active).length
  const activeBuyerOrdersCount = orders.filter(
    (o) =>
      (o.buyerId === currentUser.id || (o.buyerName && o.buyerName.toLowerCase().includes('ramesh')) || o.buyerEmail === currentUser.email) &&
      o.status !== 'delivered' &&
      o.status !== 'cancelled'
  ).length

  return (
    <>
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs pt-[max(0.75rem,env(safe-area-inset-top))] sm:pt-2.5 pb-2.5">
      {/* Main Header Navigation */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 flex items-center justify-between gap-3">

        {/* Brand Logo */}
        <div
          onClick={() => setActiveTab(currentUser.role === 'warehouse' ? 'warehouse' : currentUser.role === 'admin' ? 'admin' : 'catalog')}
          className="flex items-center gap-2 cursor-pointer group shrink-0"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-700 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-700/20 group-hover:scale-105 transition-transform">
            <Sprout className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-sm xs:text-base sm:text-xl font-bold tracking-tight text-slate-900 group-hover:text-emerald-700 transition-colors flex items-center gap-1">
              Dealer Mitra
              <span className="text-[8px] xs:text-[9px] sm:text-[10px] font-extrabold uppercase px-1 py-0.2 sm:px-2 sm:py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                B2B
              </span>
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-500 hidden sm:block">Bio-Bramha | Bio-Fertilizers & Crop Care</p>
          </div>
        </div>


        {/* Navigation Tabs - Desktop (md and above) */}
        <nav className="hidden md:flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'catalog'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-xs'
                : 'text-slate-600 hover:text-emerald-700 hover:bg-slate-50'
            }`}
          >
            Product Catalogue
          </button>

          {currentUser.role === 'buyer' && (
            <button
              onClick={() => setActiveTab('my-orders')}
              className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'my-orders'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-xs'
                  : 'text-slate-600 hover:text-emerald-700 hover:bg-slate-50'
              }`}
            >
              My Orders
              {activeBuyerOrdersCount > 0 && (
                <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full font-bold">
                  {activeBuyerOrdersCount}
                </span>
              )}
            </button>
          )}

          {currentUser.role === 'warehouse' && (
            <button
              onClick={() => setActiveTab('warehouse')}
              className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'warehouse'
                  ? 'bg-amber-50 text-amber-800 border border-amber-200 shadow-xs'
                  : 'text-slate-600 hover:text-amber-800 hover:bg-amber-50/50'
              }`}
            >
              <Warehouse className="w-4 h-4 text-amber-600" />
              <span>Warehouse Hub</span>
              {pendingOrdersCount > 0 && (
                <span className="bg-amber-400 text-amber-950 text-xs font-black px-2 py-0.5 rounded-full">
                  {pendingOrdersCount}
                </span>
              )}
            </button>
          )}

          {(currentUser.role === 'admin' || currentUser.role === 'super_admin') && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-indigo-50 text-indigo-800 border border-indigo-200 shadow-xs'
                  : 'text-slate-600 hover:text-indigo-800 hover:bg-indigo-50/50'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Admin Center</span>
              {activeOffersCount > 0 && (
                <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  {activeOffersCount}
                </span>
              )}
            </button>
          )}
        </nav>

        {/* Action Controls: Cart & Unified Account Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Cart Icon (Buyer Mode) */}
          {currentUser.role === 'buyer' && (
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-1.5 sm:p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-700/20 transition-all flex items-center gap-1 font-semibold text-xs sm:text-sm shrink-0"
              title="View Cart"
            >
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Cart</span>
              {totalCartCount > 0 && (
                <span className="bg-white text-emerald-800 text-[10px] sm:text-xs font-extrabold px-1.5 py-0.2 rounded-full shadow-xs">
                  {totalCartCount}
                </span>
              )}
            </button>
          )}

          {/* Unified Account Profile & Role Switcher Dropdown */}
          <div className="relative shrink-0">
            <button
              onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
              className="flex items-center gap-1.5 px-2 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-800 font-semibold text-xs transition-all cursor-pointer shrink-0"
            >
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-600 text-white font-black text-[10px] sm:text-xs flex items-center justify-center shrink-0">
                {currentUser.name.charAt(0)}
              </div>
              <span className="truncate max-w-[65px] xs:max-w-[90px] sm:max-w-[130px] font-bold text-slate-900">

                {currentUser.name.split(' ')[0]}
              </span>
              <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                currentUser.role === 'buyer'
                  ? 'bg-emerald-100 text-emerald-800'
                  : currentUser.role === 'warehouse'
                  ? 'bg-amber-100 text-amber-900'
                  : 'bg-indigo-100 text-indigo-800'
              }`}>
                {currentUser.role}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isAccountMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Account Menu Dropdown */}
            {isAccountMenuOpen && (
              <>
                <div
                  onClick={() => setIsAccountMenuOpen(false)}
                  className="fixed inset-0 z-40"
                ></div>
                <div className="fixed top-14 right-3 sm:absolute sm:right-0 sm:top-full sm:mt-2 w-[calc(100vw-24px)] max-w-xs sm:w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-50 animate-fade-in space-y-4 max-h-[85vh] overflow-y-auto">

                  {/* Account Profile Header */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-700 text-white font-bold text-sm flex items-center justify-center shrink-0">
                      {currentUser.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-slate-900 text-sm truncate">{currentUser.name}</h4>
                      <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
                      <span className="text-[10px] font-bold uppercase text-emerald-700 mt-0.5 block">
                        Role: {currentUser.role} mode
                      </span>
                    </div>
                  </div>

                  {/* Account Info Notice */}
                  <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-medium">
                    {currentUser.role === 'admin' ? (
                      <span className="text-indigo-700 font-bold">Authorized System Administrator</span>
                    ) : currentUser.role === 'warehouse' ? (
                      <span className="text-amber-800 font-bold">Authorized Central Warehouse Manager</span>
                    ) : (
                      <span className="text-emerald-700 font-bold">Authorized B2B Dealer / Buyer</span>
                    )}
                  </div>
                  {/* Account info - no switching without proper logout */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-900 leading-relaxed font-medium">
                      <strong className="block mb-1">🔒 Secure Account Session</strong>
                      <p className="text-[11px]">
                        Logged in as <span className="font-bold">{currentUser.phone}</span>. 
                        To switch accounts, please logout and sign in with a different phone number.
                      </p>
                    </div>
                  </div>

                  {/* Profile Button */}
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        setIsAccountMenuOpen(false)
                        setActiveTab('profile')
                      }}
                      className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <User className="w-4 h-4" />
                      <span>My Profile & Settings</span>
                    </button>
                  </div>

                  {/* Logout Button - Mobile Optimized - Dark Red */}
                  <div className="pt-3 border-t border-slate-100">
                    {isGoogleLoggedIn && (
                      <button
                        onClick={() => {
                          setIsAccountMenuOpen(false)
                          setIsLogoutModalOpen(true)
                        }}
                        className="w-full py-3 px-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 active:from-red-800 active:to-red-900 text-white rounded-xl font-bold text-sm border-2 border-red-800 transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 touch-manipulation"
                      >
                        <User className="w-5 h-5" />
                        <span>Logout & Switch Account</span>
                      </button>
                    )}
                    {!isGoogleLoggedIn && (
                      <button
                        onClick={() => {
                          setIsAccountMenuOpen(false)
                          setIsOTPModalOpen(true)
                        }}
                        className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl font-bold text-sm border-2 border-emerald-700 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95"
                      >
                        <Smartphone className="w-5 h-5" />
                        <span>Sign In with Mobile OTP</span>
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>

      {/* Mobile OTP Modal */}
      <MobileOTPModal isOpen={isOTPModalOpen} onClose={() => setIsOTPModalOpen(false)} />
      
      {/* Logout Confirmation Modal */}
      <LogoutConfirmationModal
        isOpen={isLogoutModalOpen}
        onConfirm={() => {
          setIsLogoutModalOpen(false)
          logout()
        }}
        onCancel={() => setIsLogoutModalOpen(false)}
        userName={currentUser.name}
        userPhone={currentUser.phone}
      />
    </>
  )
}
