/**
 * The web deployment and the Android app need different build outputs.
 *
 *  - Web (Vercel / `next dev`): a normal Next.js build so the /api routes are real
 *    functions. Login needs POST /api/auth/send-otp, and MSG91 sends no CORS headers,
 *    so the browser cannot call it directly. `output: 'export'` emits static files
 *    only, which is why OTP worked locally but 404'd once deployed.
 *
 *  - Android (Capacitor): `output: 'export'` to produce the static `out/` bundle that
 *    gets packaged into the APK. The app does not use /api at all; it talks to MSG91
 *    over native HTTP (see lib/auth-client.ts) and to Supabase directly.
 *
 * Build the APK with `npm run build:apk`, which sets BUILD_TARGET=capacitor.
 */
const isCapacitorBuild = process.env.BUILD_TARGET === 'capacitor'

const SUPABASE_ORIGIN = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://*.supabase.co'
const MSG91_ORIGIN = 'https://control.msg91.com'

/**
 * Content Security Policy.
 *
 * 'unsafe-inline' for styles is required by Tailwind's runtime style injection, and
 * 'unsafe-eval' is omitted so eval-based injection is blocked. Images allow data:
 * because payment QR codes are stored as base64 data URLs.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${SUPABASE_ORIGIN} https://*.supabase.co ${MSG91_ORIGIN} https://vitals.vercel-insights.com`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'"
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  // Force HTTPS for two years, including subdomains.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Block clickjacking. frame-ancestors above covers modern browsers; this covers old ones.
  { key: 'X-Frame-Options', value: 'DENY' },
  // Stop MIME sniffing turning an upload into executable content.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Don't leak internal paths in the Referer header to third parties.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Deny access to hardware APIs the app does not use.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' }
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(isCapacitorBuild ? { output: 'export' } : {}),
  // Don't advertise the framework version to scanners.
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Headers are served by the Next server, so they do not apply to the static export.
  // The APK gets equivalent protection from its network security config instead.
  ...(isCapacitorBuild
    ? {}
    : {
        async headers() {
          return [{ source: '/:path*', headers: securityHeaders }]
        }
      })
}

export default nextConfig
