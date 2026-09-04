# Dealer Mitra — BioBrahma B2B Fertilizer Distribution (MVP V1)

## Problem Statement
Upgrade the EXISTING Next.js + Supabase + Capacitor B2B fertilizer app to a production-ready,
mobile-first MVP for Google Play. Preserve all working auth/data/logic; merge design-components
improvements; apply specific business/UI corrections.

## Architecture (unchanged)
- Next.js 16 (App Router) + React 19 + TS + Tailwind v4
- Supabase (Postgres) via server-side `/api` routes (service_role); RLS-locked
- MSG91 phone OTP (server-backed; secrets server-only in lib/env.ts)
- Capacitor 8 Android; web build vs `output:'export'` native build (lib/platform.ts)
- Entry: app/page.tsx -> AppProvider -> LoginGate -> AppShell

## Implemented (2026-06)
- MOQ = 1 for ALL products: lib/app-context (addToCart/updateCartItemQuantity),
  api/orders/route.ts (removed bulk MOQ enforcement), catalog/cart steppers step by 1.
- Clear unit pricing "₹X / unit" on cards; cart shows unit × qty = line total; checkout shows
  per-line "price × qty = total".
- Prominent "Add to Cart" (full-width, min-h ~46px touch target); qty stepper 44px targets.
- Post-order navigation: checkout shows a success confirmation panel (order id + total) then
  "View My Orders" routes to my-orders (no home redirect; no duplicate orders).
- Saved-address flow in checkout: loads addresses (GET /api/account/address), radio-select,
  "Add New Address", "Save this address for future orders" (POST). No schema change.
- Payment section cleaned (removed harsh debug-red instruction box; production wording).
  Removed "Supabase Cloud Live" header badge and "MSG91 Gateway" OTP footer.
- Default warehouse repointed to Taloja, Mumbai, Maharashtra (lib/data.ts); warehouse SELECTOR
  removed from checkout — dealer sees static "Taloja, Mumbai, Maharashtra". Guntur removed.
- Support: tel: link kept & works; number stays configurable via Admin dashboard (NOT fabricated).
- Loading states: Place Order disables + spinner (prevents duplicate submit).
- Mobile/Capacitor: safe-area padding on checkout/OTP modals, inputMode=numeric, no horizontal
  scroll, responsive spacing merged from design-components.
- data-testid added across catalog, cart, checkout, login for QA.

## Verification
- `next build` (production) SUCCEEDS.
- `tsc --noEmit`: 0 errors in app code (only pre-existing errors inside reference folder
  design-components/, which is not imported and build ignores TS errors).
- Login screen renders at 390px mobile viewport.

## NOT verifiable in this preview env
- Authenticated E2E (OTP verify, catalog load, order creation, saved addresses) needs the
  user's Supabase + MSG91 secrets (server-only, not in repo) and same-origin /api routing.
  These run on the user's Vercel/native deployment, not this Emergent preview.

## Seed accounts (unchanged): super_admin 8050946969, warehouse 7975158924

## Backlog / Next
- Admin: set real support phone/UPI/QR from Admin dashboard (already supported).
- Optional: address edit-in-checkout, delivery-state selector.
