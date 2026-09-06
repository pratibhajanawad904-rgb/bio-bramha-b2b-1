# Dealer Mitra — BioBrahma B2B Fertilizer Distribution (MVP Final Check)

## Problem Statement
Existing Next.js 16 + Supabase + Capacitor Android B2B app. Final production check: dealer ID linkage & data isolation,
merge design-components/ into components/, perfect mobile login layout, MOQ=1 + unit pricing, cart/checkout,
saved/default addresses, Reorder, post-order navigation, warehouse locked to Taloja, clean payment/support messaging,
remove "Modes", Capacitor Android safe areas/keyboard, preserve admin + security.

## Architecture (unchanged)
- Next.js 16 App Router, React 19, Tailwind v4; server /api routes use Supabase service_role (lib/supabase-admin.ts)
- Session: signed JWT from /api/auth/verify-otp; identity = normalized 10-digit phone; dealer id = `user-<phone>`
- Tables: products, offers, orders(buyer_id, phone), user_accounts, user_addresses(phone, is_default), app_settings
- RLS: anon has no access to orders/user_accounts/user_addresses; all dealer data goes through session-scoped /api routes
- Capacitor: web build = server (Vercel), APK = static export talking to NEXT_PUBLIC_API_BASE_URL
- No Google OAuth exists in codebase (google-auth-button.tsx is a legacy-named, unused phone-OTP modal)

## Implemented this session (2026-06)
- Data isolation: removed demo "ramesh" order filter (header + orders view); orders filtered strictly by buyerId
- Reorder: stock/availability check, uses CURRENT catalog price, caps qty to stock, reports unavailable items, opens cart, never auto-places
- Checkout: delete saved address, "Delivering here"/Default badges, state selector (MH default), unit price · qty lines, "Place Order" button
- Support: removed fabricated helpline default ('1800-425-9999 / +91 94400 12345' treated as NOT configured); tel: link only when admin configured a number
- "Modes" removed: header role pill + "Role: X mode" text, "Admin/Warehouse Mode", "Catalogue Preview Mode"
- Design merge: header dropdown (design version), app-shell nav history + Android hardware back button (@capacitor/app), Profile in bottom nav, cart drawer safe-area footer
- Login: min-w-0/shrink-0 fixes, inputMode numeric, autocomplete one-time-code, 48px buttons, verified 320/360/390 no overflow
- Mobile: globals.css overflow-x hidden + 16px inputs, AndroidManifest windowSoftInputMode=adjustResize
- Security: removed hard-coded MSG91 auth key/template from client bundle; native OTP send/verify now go through server /api/auth routes; DEPLOYMENT.md scrubbed. ACTION: rotate MSG91 key (was in git history)
- Order detail modal null-guards timeline/items

## Live verification (2026-06, with real Supabase + MSG91 keys in /app/.env.local, gitignored)
- send-otp -> MSG91 OK; verify-otp with real code -> session issued (user 8618734070 "Pratibha", buyer)
- /api/orders GET: 37 orders, all buyer_id user-8618734070 (isolation OK); anon REST on orders/user_accounts/user_addresses -> 42501 denied (RLS OK)
- Address add / set default / delete OK; order placed (MOQ 1, total 620) -> visible -> cancelled; over-stock rejected (new server stock guard)
- UI with real session: 38 orders, Reorder at current price, default address auto-selected, Taloja shown, support tel:9321319432 (admin-configured)
- verify-otp now distinguishes MSG91 auth-key/config errors from wrong code (was all "Invalid OTP")
- NOTE: in this preview the ingress sends /api/* to port 8001, so a tiny node proxy 8001->3000 (/tmp/proxy8001.js) is needed for browser testing

## Order-flow fix session (2026-06)
- Root cause of "cannot place order" on Android: static APK built without NEXT_PUBLIC_API_BASE_URL -> /api calls hit capacitor origin. build-apk.mjs now refuses to build without a live https URL; api-client returns a clear error on native if missing; .env.production.apk.example added
- Web flow verified in browser with live session: Add to Cart -> Cart -> Checkout -> Place Order (ORD-123425, ₹450) -> success panel -> View My Orders shows it first (then cancelled as test)
- Orders now sorted newest first (table has no created_at: sort by date, then placed timestamp)
- Restored truncated product images (azospirillum.png / -field.png were cut at 512KB/1MB in last commit) from initial import

## Verification
- `next build` OK, `tsc --noEmit` 0 errors (excluding reference design-components/)
- Testing agent iteration_1: 11/12 pass; the 1 crash (order detail without timeline) fixed and re-verified
- NOT verifiable here: real OTP login, Supabase-backed order/address persistence (no secrets in this env)

## Schema
- No migration needed: user_addresses already exists (0002). Optional cleanup SQL:
  update public.app_settings set helpline_number = null where helpline_number = '1800-425-9999 / +91 94400 12345';

## Backlog
- P1: Admin sets real support phone via Admin › Support Contact Settings
- P2: Stock check server-side in /api/orders POST; stock decrement on order
- P2: Update supabase/seed.sql to drop placeholder helpline for fresh installs
