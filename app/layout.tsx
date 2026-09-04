import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const _inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Bio-Bramha Dealer Mitra | B2B Bio-Inputs Platform',
  description:
    'South India\'s trusted B2B platform for bio-fertilizers, biopesticides, and growth promoters. Serving Dealers, Retailers & VLEs across Andhra Pradesh, Telangana, Karnataka, and Maharashtra.',
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#059669',
  width: 'device-width',
  initialScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background">
      <body className="antialiased font-sans overflow-x-hidden">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
