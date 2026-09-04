# 📘 DEALER MITRA (Bio-Bramha) — Master Technical Specification & Operations Manual

**Document Classification**: Official Enterprise Technical Documentation & Operations Manual  
**Project Name**: Dealer Mitra (Bio-Bramha B2B Mobile-First Agri-Commerce Platform)  
**Client / Owner**: Bio-Bramha Private Limited  
**Release Version**: `v1.0.0-Release`  
**Date of Release**: August 2026  
**Primary Target Platforms**: Responsive Web Application (Vercel) & Native Android Mobile App (Capacitor 8 APK)  

---

## 📑 Table of Contents

1. [Executive Summary & System Overview](#1-executive-summary--system-overview)
2. [High-Level System Architecture & Topology](#2-high-level-system-architecture--topology)
3. [Role-Based Access Control (RBAC) & Pre-Provisioned Accounts](#3-role-based-access-control-rbac--pre-provisioned-accounts)
4. [Database Data Dictionary & PostgreSQL Schemas](#4-database-data-dictionary--postgresql-schemas)
5. [Complete REST API Endpoint Specification (21 Endpoints)](#5-complete-rest-api-endpoint-specification)
6. [E-Commerce, Checkout & Payment Engine](#6-e-commerce-checkout--payment-engine)
7. [Regulatory Compliance, Privacy & DPDP Act 2023](#7-regulatory-compliance-privacy--dpdp-act-2023)
8. [Frontend Architecture & State Management](#8-frontend-architecture--state-management)
9. [Android Native Mobile Architecture (Capacitor 8)](#9-android-native-mobile-architecture-capacitor-8)
10. [Client Administrative & Warehouse Operating Manual (SOPs)](#10-client-administrative--warehouse-operating-manual-sops)
11. [Troubleshooting, Diagnostics & Disaster Recovery](#11-troubleshooting-diagnostics--disaster-recovery)

---

## 1. Executive Summary & System Overview

### 1.1 Purpose of the Platform
**Dealer Mitra** is a modern B2B agricultural commerce platform engineered for **Bio-Bramha Private Limited**. It facilitates end-to-end commerce between agricultural product manufacturers, regional distributors, retail dealers, and village-level entrepreneurs. 

The system provides:
- **Zero-Password Authentication**: Instant mobile login using SMS OTP delivered via MSG91 DLT-approved routes.
- **Dynamic B2B Catalog**: Tiered product categorization, bulk packaging options, regional tax compliance, and active promotional schemes.
- **Advance Payment Engine**: Streamlined checkout featuring company UPI QR code display, direct bank transfer (NEFT/RTGS), and real-time order confirmation without Cash on Delivery risks.
- **Multi-Tier Fulfillment Hub**: Centralized warehouse dispatch interface for packing, courier assigning, and delivery verification.
- **Dual-Channel Deployment**: A single unified TypeScript codebase that compiles into a high-performance **Web Application (Vercel)** and a **Native Android Application (Capacitor 8 APK)**.

### 1.2 Core Technology Stack Summary

| Technology | Layer | Purpose |
| :--- | :--- | :--- |
| **Next.js 16.3 (Turbopack)** | Fullstack Framework | Server-side rendering, API routes, middleware, and static asset pipeline |
| **React 19** | Frontend UI | Component architecture, state hooks, and client interactions |
| **TypeScript 5.8** | Language | End-to-end type safety across client, server, and database interfaces |
| **Tailwind CSS 4 + Lucide** | Design System | Fluid responsive design, accessible UI primitives, and micro-interactions |
| **Supabase (PostgreSQL 15)** | Primary Database | Relational storage, JSONB attributes, and Row-Level Security (RLS) policies |
| **Capacitor 8 (Android)** | Mobile Native Shell | Native Android bridge, WebView wrapper, and offline asset caching |
| **MSG91 (DLT SMS Gateway)** | Authentication Gateway | TRAI-compliant transactional SMS OTP delivery and verification |
| **Jose / Crypto JWT** | Session Security | Cryptographically signed, stateless 12-hour session tokens |

---

## 2. High-Level System Architecture & Topology

### 2.1 System Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT PLATFORMS                                  |
|                                                                                   |
|   +------------------------------------+   +----------------------------------+   |
|   |    Android Native App (Capacitor)  |   |    Desktop / Mobile Web Browser  |   |
|   |  - Offline Asset Cache             |   |  - Responsive Next.js UI         |   |
|   |  - Native HTTP Bridge              |   |  - Dynamic Route Hydration       |   |
|   +-----------------+------------------+   +-----------------+----------------+   |
+---------------------|----------------------------------------|--------------------+
                      |                                        |
                      | HTTPS (REST / JSON)                    | HTTPS (Next.js SSR / API)
                      v                                        v
+-----------------------------------------------------------------------------------+
|                        VERCEL SERVERLESS EDGE PLATFORM                            |
|                                                                                   |
|   +---------------------------------------------------------------------------+   |
|   | Next.js App Router (app/api/*)                                             |   |
|   |  - Rate Limiting (In-Memory IP & Phone sliding windows)                   |   |
|   |  - JWT Session Cryptographic Verification & RBAC Guards                   |   |
|   |  - Content Security Policy (CSP) & Strict Security Headers                |   |
|   |  - Transactional Business Logic & Server Stores                           |   |
|   +--------------------+----------------------------------+--------------------+   |
+------------------------|----------------------------------|-----------------------+
                         |                                  |
                         | HTTPS / PostgreSQL Wire          | HTTPS (DLT Route)
                         v                                  v
+------------------------------------+    +-----------------------------------------+
|     SUPABASE POSTGRESQL CLOUD      |    |        MSG91 SMS GATEWAY (INDIA)        |
|                                    |    |                                         |
|  - Tables: products, orders,       |    |  - Template: 6a59ce32c9fa66b2d5069333   |
|    user_accounts, app_settings     |    |  - Sender ID: DMTRA                     |
|  - RLS Policies (Read/Write Lock)  |    |  - OTP Delivery & Resend Rate Limiting  |
|  - JSONB Metadata Stores           |    |                                         |
+------------------------------------+    +-----------------------------------------+
```

### 2.2 Security Architecture & Content Security Policy (CSP)
All web responses emit enterprise-grade security headers configured in [`next.config.mjs`](file:///c:/Users/Sreeshan/OneDrive/Desktop/bio-bramha/next.config.mjs):
* **Strict-Transport-Security**: `max-age=63072000; includeSubDomains; preload`
* **X-Content-Type-Options**: `nosniff`
* **X-Frame-Options**: `DENY` (Prevents clickjacking)
* **Referrer-Policy**: `strict-origin-when-cross-origin`
* **Content-Security-Policy**: Restricts script execution, frames, and connects exclusively to the app domain, `*.supabase.co`, `control.msg91.com`, and `vitals.vercel-insights.com`.

---

## 3. Role-Based Access Control (RBAC) & Pre-Provisioned Accounts

### 3.1 User Personas & Permissions Matrix

| Feature / Capability | Buyer (Dealer) | Warehouse Manager | Admin | Super Admin |
| :--- | :---: | :---: | :---: | :---: |
| **Browse Catalog & Offers** | ✅ | ✅ | ✅ | ✅ |
| **Add to Cart & Place Order** | ✅ | ❌ | ❌ | ✅ (Test mode) |
| **View Personal Orders & Status** | ✅ | ❌ | ❌ | ✅ |
| **Access Warehouse Dispatch Hub** | ❌ | ✅ | ❌ | ✅ |
| **Accept, Dispatch & Confirm Orders** | ❌ | ✅ | ❌ | ✅ |
| **Manage Catalog (Add/Edit Products)**| ❌ | ❌ | ✅ | ✅ |
| **Manage Promotional Schemes/Offers** | ❌ | ❌ | ✅ | ✅ |
| **Configure Payment QR & UPI Details**| ❌ | ❌ | ✅ | ✅ |
| **Edit Legal & Compliance Policies**  | ❌ | ❌ | ✅ | ✅ |
| **View Global Financial Analytics**   | ❌ | ❌ | ✅ | ✅ |
| **Promote / Demote User Roles**       | ❌ | ❌ | ❌ | ✅ |
| **Transfer Super Admin Ownership**    | ❌ | ❌ | ❌ | ✅ |

---

### 3.2 Pre-Provisioned Bootstrap Accounts

The platform includes two pre-configured bootstrap accounts hardcoded into core security files ([`lib/roles.ts`](file:///c:/Users/Sreeshan/OneDrive/Desktop/bio-bramha/lib/roles.ts), [`lib/server-store.ts`](file:///c:/Users/Sreeshan/OneDrive/Desktop/bio-bramha/lib/server-store.ts), [`lib/app-context.tsx`](file:///c:/Users/Sreeshan/OneDrive/Desktop/bio-bramha/lib/app-context.tsx), and [`supabase/seed.sql`](file:///c:/Users/Sreeshan/OneDrive/Desktop/bio-bramha/supabase/seed.sql)):

```typescript
export const PREPROVISIONED_ACCOUNTS: Record<string, { name: string; role: AppRole; assignedWarehouseId?: string }> = {
  '8050946969': { name: 'Super Admin', role: 'super_admin' },
  '7975158924': { name: 'Warehouse Manager', role: 'warehouse', assignedWarehouseId: 'wh-central' }
}
```

#### Detailed Account Profiles:

1. **Super Admin Account**:
   * **Phone Number**: `8050946969`
   * **Role**: `super_admin`
   * **Display Name**: `Super Admin`
   * **Privileges**: Highest system authority. Can modify products, create offers, change bank payment details, promote any dealer to an Admin, demote staff, or transfer Super Admin status.

2. **Central Warehouse Account**:
   * **Phone Number**: `7975158924`
   * **Role**: `warehouse`
   * **Display Name**: `Warehouse Manager`
   * **Assigned Facility**: `wh-central` (Central Distribution Hub)
   * **Privileges**: Order fulfillment queue, live status updating (`placed` ➔ `accepted` ➔ `dispatched` ➔ `delivered`), and delivery tracking.

---

### 3.3 Role Resolution & Multi-Tier Failover Protocol

To guarantee that the Super Admin and Warehouse managers never get locked out (even during intermittent network disconnects, local browser cache wipes, or database migrations), role lookup executes a 4-tier failover protocol:

```
[ Incoming Request / Login ]
             │
             ▼
 Tier 1: Supabase Database Query (`user_accounts` table)
             │
             ├─ Row found? ──> Use role from database
             │
             └─ No row / DB unreachable?
                     │
                     ▼
 Tier 2: Pre-Provisioned Bootstrap Map (`lib/roles.ts`)
                     │
                     ├─ Phone is 8050946969 or 7975158924? ──> Enforce super_admin / warehouse
                     │
                     └─ Other phone?
                             │
                             ▼
 Tier 3: Local Storage Role Sync (`bb_assigned_roles`)
                             │
                             ├─ Found locally? ──> Use cached role
                             │
                             └─ Not found?
                                     │
                                     ▼
 Tier 4: Default Role Assignment ──> Assign `buyer`
```

---

## 4. Database Data Dictionary & PostgreSQL Schemas

The database layer runs on **Supabase PostgreSQL 15**. All tables implement Row-Level Security (RLS) to enforce strict isolation.

### 4.1 Database Tables Overview

```
+--------------------------------------------------------------------------+
|                        SUPABASE POSTGRESQL SCHEMA                        |
+--------------------------------------------------------------------------+
|  1. products             - Catalog items, inventory, pricing, packaging  |
|  2. categories           - Catalog category taxonomy & display orders    |
|  3. orders               - B2B customer purchase orders & tracking       |
|  4. user_accounts        - User roster, role privileges, profile data    |
|  5. offers               - Promotional discounts & marketing campaigns   |
|  6. app_settings         - Payment QR image, UPI ID, Bank details, phone |
|  7. legal_policies       - Terms, Privacy Policy, Refund Policy text     |
|  8. user_consents        - Consent audit trail (DPDP Act compliance)     |
|  9. grievance_contact    - Official Grievance Officer statutory data     |
+--------------------------------------------------------------------------+
```

---

### 4.2 Detailed Data Dictionary

#### Table 1: `public.products`
Stores product catalog records, pricing tiers, and technical agrochemical specs.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `TEXT` | `PRIMARY KEY` | Unique product identifier (e.g. `prod-seaweed-1l`) |
| `name` | `TEXT` | `NOT NULL` | Commercial trade name of the product |
| `category` | `TEXT` | `NOT NULL` | High-level category name |
| `category_id` | `TEXT` | `NOT NULL` | Foreign key referencing `categories(id)` |
| `category_ids` | `TEXT[]` | `DEFAULT '{}'` | Array of applicable category tags |
| `description` | `TEXT` | `NOT NULL` | Short marketing description |
| `price` | `NUMERIC(10,2)` | `NOT NULL` | Standard selling price per unit in INR (₹) |
| `package_size` | `TEXT` | `NOT NULL` | Pack size (e.g. `1 Litre Bottle`, `5 Kg Bag`) |
| `image` | `TEXT` | `NOT NULL` | Primary image path (e.g. `/products/seaweed.png`) |
| `images` | `TEXT[]` | `DEFAULT '{}'` | Gallery of image paths |
| `stock` | `INTEGER` | `DEFAULT 0` | Available warehouse inventory count |
| `rating` | `NUMERIC(2,1)` | `DEFAULT 4.8` | Product review rating score (1.0 to 5.0) |
| `is_bulk` | `BOOLEAN` | `DEFAULT false`| Distinguishes wholesale bulk packs from retail packs |
| `details` | `JSONB` | `NOT NULL` | Structured specs: `{ dosage, shelfLife, howToUse, targetCrops, composition, certification }` |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT now()`| Record creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `DEFAULT now()`| Last updated timestamp |

---

#### Table 2: `public.orders`
Stores customer orders, delivery destinations, and execution stages.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `TEXT` | `PRIMARY KEY` | Unique order identifier (e.g. `ord-1723891234-abc1`) |
| `buyer_phone` | `TEXT` | `NOT NULL` | 10-digit phone number of purchasing dealer |
| `buyer_name` | `TEXT` | `NOT NULL` | Registered name of customer |
| `items` | `JSONB` | `NOT NULL` | Array of ordered items: `[{ product, quantity, unitPrice }]` |
| `total_amount` | `NUMERIC(10,2)` | `NOT NULL` | Total order invoice value in INR (₹) |
| `status` | `TEXT` | `NOT NULL` | Current stage: `placed` \| `accepted` \| `dispatched` \| `delivered` \| `cancelled` |
| `payment_terms` | `TEXT` | `NOT NULL` | `Advance UPI/QR` or `NEFT/RTGS Bank Transfer` |
| `shipping_address`| `JSONB` | `NOT NULL` | Structured destination: `{ street, city, state, pincode }` |
| `timeline` | `JSONB` | `DEFAULT '[]'` | Stage audit trail: `[{ stage, timestamp, notes }]` |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT now()`| Order placement timestamp |
| `updated_at` | `TIMESTAMPTZ` | `DEFAULT now()`| Status mutation timestamp |

---

#### Table 3: `public.user_accounts`
Stores user profile information, role privileges, and assigned fulfillment hubs.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `phone` | `TEXT` | `PRIMARY KEY` | Clean 10-digit mobile number |
| `name` | `TEXT` | `NOT NULL` | Full Name / Business Owner Name |
| `email` | `TEXT` | `NULLABLE` | Optional contact email address |
| `role` | `TEXT` | `NOT NULL` | Account authorization: `buyer`, `warehouse`, `admin`, `super_admin` |
| `assigned_warehouse_id` | `TEXT` | `NULLABLE` | Hub identifier (e.g. `wh-central`) if role is `warehouse` |
| `joined_date` | `TEXT` | `NOT NULL` | Display string for signup date (e.g. `Aug 2026`) |
| `state` | `TEXT` | `DEFAULT 'AP'` | Primary operating state abbreviation |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT now()`| Account creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `DEFAULT now()`| Role/profile update timestamp |

---

#### Table 4: `public.app_settings`
Global application configurations, corporate support numbers, and payment details.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `TEXT` | `PRIMARY KEY` | Singleton ID (always `'global'`) |
| `helpline_number` | `TEXT` | `NOT NULL` | Customer care phone numbers shown in footer and checkout |
| `helpline_email` | `TEXT` | `NOT NULL` | Official support email (`support@biobramha.com`) |
| `payment_settings` | `JSONB` | `NOT NULL` | Payment config: `{ qrCodeImage, upiId, accountDetails }` |
| `updated_at` | `TIMESTAMPTZ` | `DEFAULT now()`| Last updated timestamp |

---

#### Table 5: `public.legal_policies` & `public.user_consents`
Compliance tables satisfying the **Digital Personal Data Protection (DPDP) Act 2023**.

* **`legal_policies`**:
  * `id`: Policy slug (`privacy-policy`, `terms-of-service`, `refund-policy`)
  * `title`: Legal policy title
  * `version`: Version string (e.g., `1.0.0`)
  * `content`: Full markdown legal text
  * `effective_date`: Date policy became legally active

* **`user_consents`**:
  * `id`: UUID Primary key
  * `user_phone`: Phone number of consenting user
  * `policy_id`: Foreign key referencing policy
  * `version`: Consented policy version
  * `consented_at`: Timestamp of consent acceptance
  * `ip_address`: User IP address captured for compliance audit trails

---

## 5. Complete REST API Endpoint Specification

The backend exposes **21 server-side API endpoints** inside `app/api/`. All endpoints run server-side on Vercel with rate limiting and session validation.

```
=============================================================================================
ENDPOINT URI                       | METHOD | AUTHENTICATION     | DESCRIPTION
=============================================================================================
/api/auth/send-otp                 | POST   | Public (Rate-limit)| Sends SMS OTP via MSG91
/api/auth/verify-otp               | POST   | Public (Rate-limit)| Validates OTP & issues JWT
/api/auth/complete-signup          | POST   | Public (Rate-limit)| Sets name & bootstraps roles
/api/orders                        | GET    | Valid User Session | Lists user/warehouse orders
/api/orders                        | POST   | Buyer Session      | Places new order with price check
/api/orders                        | PATCH  | Warehouse/Admin    | Updates order stage & notes
/api/admin/products                | GET    | Admin/Super Admin  | Fetches all catalog products
/api/admin/products                | POST   | Admin/Super Admin  | Adds new product with specs
/api/admin/products                | PUT    | Admin/Super Admin  | Updates existing product
/api/admin/products                | DELETE | Admin/Super Admin  | Deletes product from catalog
/api/admin/categories              | GET    | Public / Admin     | Lists product categories
/api/admin/offers                  | GET    | Public / Admin     | Lists promotional schemes
/api/admin/offers                  | POST   | Admin/Super Admin  | Creates promotional scheme
/api/admin/roles                   | GET    | Admin/Super Admin  | Fetches elevated staff roster
/api/admin/assign-role             | POST   | Super Admin        | Promotes/demotes user role
/api/admin/transfer-super-admin    | POST   | Super Admin        | Transfers Super Admin ownership
/api/admin/settings                | GET    | Public / Admin     | Fetches support & payment info
/api/admin/settings                | POST   | Admin/Super Admin  | Updates payment QR/UPI/Bank info
/api/admin/policies                | GET    | Public             | Fetches legal policy text
/api/consent                       | POST   | Valid User Session | Logs policy consent timestamp
/api/account/delete                | POST   | Valid User Session | OTP-verified account deletion
=============================================================================================
```

---

### 5.1 Detailed Endpoint Contracts

#### `POST /api/auth/send-otp`
Sends a 6-digit one-time password to the specified Indian mobile number.
* **Rate Limits**: Max 3 requests per 10 minutes per IP / phone.
* **Request Body**:
  ```json
  { "phone": "8050946969" }
  ```
* **Success Response (200 OK)**:
  ```json
  { "success": true, "message": "OTP sent successfully" }
  ```

---

#### `POST /api/auth/verify-otp`
Verifies the SMS OTP and generates a signed 12-hour JWT session token.
* **Request Body**:
  ```json
  { "phone": "8050946969", "otp": "123456" }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "verified": true,
    "user": {
      "phone": "8050946969",
      "name": "Super Admin",
      "role": "super_admin",
      "joinedDate": "Aug 2026",
      "state": "AP"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```

---

#### `POST /api/orders`
Places a new purchase order. Server independently validates product prices and stock against the database.
* **Headers**: `Authorization: Bearer <JWT_TOKEN>`
* **Request Body**:
  ```json
  {
    "items": [
      {
        "product": { "id": "prod-seaweed-1l", "name": "Seaweed Extract", "price": 520 },
        "quantity": 5
      }
    ],
    "paymentTerms": "Advance UPI/QR",
    "shippingAddress": {
      "street": "NH-16 Main Road, Near Market Yard",
      "city": "Guntur",
      "state": "Andhra Pradesh",
      "pincode": "522001"
    }
  }
  ```
* **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "order": {
      "id": "ord-1723891234-a1b2",
      "totalAmount": 2600.00,
      "status": "placed",
      "paymentTerms": "Advance UPI/QR",
      "createdAt": "2026-08-18T12:00:00.000Z"
    }
  }
  ```

---

#### `POST /api/admin/settings`
Updates the company payment QR code, UPI ID, and bank account instructions.
* **Headers**: `Authorization: Bearer <SUPER_ADMIN_OR_ADMIN_JWT>`
* **Request Body**:
  ```json
  {
    "helplineNumber": "1800-425-9999 / +91 80509 46969",
    "helplineEmail": "support@biobramha.com",
    "paymentSettings": {
      "upiId": "biobramha@hdfcbank",
      "qrCodeImage": "data:image/png;base64,iVBORw0KGgo...",
      "accountDetails": "Bank: HDFC Bank Ltd\nAccount No: 50200012345678\nIFSC: HDFC0001234\nBranch: Guntur Main\nAccount Name: Bio-Bramha Pvt Ltd"
    }
  }
  ```
* **Success Response (200 OK)**:
  ```json
  { "success": true, "message": "Settings updated successfully" }
  ```

---

## 6. E-Commerce, Checkout & Payment Engine

### 6.1 Removal of Cash on Delivery (COD) Policy
By business mandate, **Cash on Delivery (COD) has been removed** across all buyer checkout views, product modals, cart drawers, footer tags, and API endpoints. 

### 6.2 Active Payment Terms

1. **Advance UPI / QR Code**:
   * Buyer is presented with the company's official QR code image and UPI ID (`biobramha@upi`).
   * Buyer completes payment on their UPI app (PhonePe, Google Pay, Paytm, BHIM) and clicks **"Confirm Order"**.
   * Order is placed in `placed` status; warehouse executive verifies UPI transaction ID prior to dispatch.

2. **Bank Transfer (NEFT / RTGS / IMPS)**:
   * Buyer receives official bank account coordinates (Bank Name, Account Number, IFSC, Account Holder Name).
   * Direct warehouse dispatch occurs upon bank ledger settlement.

---

### 6.3 Order Lifecycle State Machine

```
   [ Buyer Checkout ] ──────────> ( PLACED )
                                      │
                                      ▼
                           [ Warehouse Accepts Order ]
                                      │
                                      ▼
                                 ( ACCEPTED )
                                      │
                                      ▼
                           [ Packed & Dispatched ]
                                      │
                                      ▼
                               ( DISPATCHED )
                                      │
                                      ▼
                           [ Delivered to Dealer ]
                                      │
                                      ▼
                                ( DELIVERED )
```

* **`placed`**: Order submitted by buyer. Awaiting warehouse acceptance.
* **`accepted`**: Order reviewed and accepted by warehouse staff (`7975158924`).
* **`dispatched`**: Goods packed with invoice and handed over to logistics hub.
* **`delivered`**: Goods verified and handed over to dealer.
* **`cancelled`**: Cancelled by admin or buyer prior to dispatch.

---

## 7. Regulatory Compliance, Privacy & DPDP Act 2023

To ensure complete compliance with the Indian **Digital Personal Data Protection (DPDP) Act 2023** and **E-Commerce Consumer Protection Rules 2020**:

1. **Privacy & Data Protection Policy ([`/privacy-policy`](file:///c:/Users/Sreeshan/OneDrive/Desktop/bio-bramha/app/privacy-policy/page.tsx))**:
   * Explicitly documents personal data collected (phone number, name, shipping address).
   * States purpose limitation (order delivery, OTP authentication, regulatory invoice generation).
2. **Refund & Cancellation Policy ([`/refund-policy`](file:///c:/Users/Sreeshan/OneDrive/Desktop/bio-bramha/app/refund-policy/page.tsx))**:
   * Outlines 7-day transit damage replacement and agricultural product return guidelines.
3. **Statutory Grievance Redressal**:
   * Designated Grievance Officer details published:
     * **Officer**: Grievance Redressal Officer
     * **Email**: `grievance@biobramha.com`
     * **Response Window**: Formal acknowledgement within 48 hours; resolution within 30 days.
4. **Right to Erasure / Account Deletion ([`/delete-account`](file:///c:/Users/Sreeshan/OneDrive/Desktop/bio-bramha/app/delete-account/page.tsx))**:
   * Users can trigger automated account deletion.
   * Requires mandatory SMS OTP verification to prevent malicious erasure.

---

## 8. Frontend Architecture & State Management

The frontend uses Next.js 16 App Router with React 19 Client Components coordinated by [`lib/app-context.tsx`](file:///c:/Users/Sreeshan/OneDrive/Desktop/bio-bramha/lib/app-context.tsx).

### 8.1 Key Frontend Modules

* **`app/page.tsx`**: Main entry point handling dynamic view switching between **Catalog**, **Cart**, **Orders**, **Admin Dashboard**, and **Warehouse Dashboard** based on authenticated role.
* **`components/header.tsx` & `components/app-shell.tsx`**: Navigation bars, role-badge rendering, category drawer triggers, and responsive layout shells.
* **`components/admin-dashboard.tsx`**: Complete multi-tab control center:
  * *Products Tab*: Upload products, edit pricing, manage pack sizes, toggle bulk items.
  * *Offers Tab*: Add percentage discounts and promotional banners.
  * *Roles & Privileges Tab*: View elevated accounts roster, assign Admin roles, transfer Super Admin ownership.
  * *Payment Settings Tab*: Upload QR code image, configure UPI ID and bank coordinates.
  * *Compliance Panel*: View user consent audit logs and legal policies.
* **`components/warehouse-dashboard.tsx`**: Order management portal for warehouse staff to filter orders by stage (`placed`, `accepted`, `dispatched`, `delivered`) and update statuses with timestamped logs.
* **`components/buyer-checkout-modal.tsx`**: Modal presenting shipping address selection, advance payment instructions, and order placement triggers.

---

## 9. Android Native Mobile Architecture (Capacitor 8)

The mobile application is packaged using **Capacitor 8.0.0** inside the [`android/`](file:///c:/Users/Sreeshan/OneDrive/Desktop/bio-bramha/android) folder.

### 9.1 Build Pipeline Architecture

```
[ Next.js Source Code ]
          │
          ▼  `npm run build:apk` (scripts/build-apk.mjs)
  Stashes dynamic /api routes (app/api -> app/_api_stashed_for_apk_build)
          │
          ▼
  Exports Static Web Assets (`out/` directory with static index.html)
          │
          ▼
  Syncs Web Bundle into Android Project (`npx cap sync android`)
          │
          ▼
  Compiles Native Android APK (`gradlew assembleDebug`)
          │
          ▼
  Copies Fresh APK to:
    1. `Dealer Mitra.apk` (Project Root)
    2. `android/app/build/outputs/apk/debug/app-debug.apk`
```

### 9.2 Network Security & Permissions
Configured in [`android/app/src/main/AndroidManifest.xml`](file:///c:/Users/Sreeshan/OneDrive/Desktop/bio-bramha/android/app/src/main/AndroidManifest.xml):
* `android.permission.INTERNET`: Required for communicating with Supabase and MSG91.
* `android.permission.ACCESS_NETWORK_STATE`: Monitors offline/online connection state.
* `networkSecurityConfig`: Allows HTTPS connections and cleartext localhost development bridges.

---

### 9.3 How to Re-Wrap the APK for Your Own Domain
When the client deploys the web backend to their own custom Vercel domain (e.g., `https://dealer-mitra.biobramha.com`) or creates a new Supabase database, the APK must be re-wrapped so mobile requests point to their new server:

1. **Update URLs in `.env.local`**:
   ```env
   NEXT_PUBLIC_API_BASE_URL=https://your-new-domain.vercel.app
   NEXT_PUBLIC_SUPABASE_URL=https://your-new-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-new-anon-key
   ```
2. **Execute the Build & Wrap Command**:
   ```bash
   npm run build:apk
   ```
3. **Distribute Output**:
   The script packages the web app, syncs the native bridge, and outputs the freshly compiled APK at **`Dealer Mitra.apk`** in your root folder.

---

## 10. Client Administrative & Warehouse Operating Manual (SOPs)

### 10.1 Super Admin Daily SOP
1. **Login**: Open web app or APK ➔ Enter Super Admin phone **`8050946969`** ➔ Enter OTP.
2. **Access Admin Center**: Tap **"Admin Dashboard"** in the top navigation bar.
3. **Manage Products**:
   * Tap **"Add New Product"** to create a product. Fill Name, Category, Price, Stock, Pack Size, and Composition.
   * Tap **"Edit"** on any existing product card to adjust pricing or restock inventory.
4. **Update Payment Coordinates**:
   * Navigate to **"Settings"** tab.
   * Upload new bank QR code image or update UPI ID. Tap **"Save Settings"**.

---

### 10.2 Warehouse Manager Fulfillment SOP
1. **Login**: Open app ➔ Enter Warehouse phone **`7975158924`** ➔ Enter OTP.
2. **Access Fulfillment Portal**: Tap **"Warehouse Portal"** badge.
3. **Process Orders**:
   * Under **"Placed Orders"**, review incoming dealer orders. Tap **"Accept Order"**.
   * When goods are packed and courier dispatch is confirmed, tap **"Mark Dispatched"**.
   * Upon physical delivery confirmation by the transport hub, tap **"Confirm Delivery"**.

---

## 11. Troubleshooting, Diagnostics & Disaster Recovery

### 11.1 Common Errors & Fast Resolutions

| Symptom | Probable Cause | Immediate Resolution |
| :--- | :--- | :--- |
| **OTP SMS Not Arriving** | MSG91 DLT account low SMS balance or invalid phone number | Check MSG91 balance at `control.msg91.com`. Verify phone is exactly 10 digits without country code. |
| **"Permission Denied" Database Error** | Supabase RLS policies blocking unauthorized write | Ensure `SUPABASE_SERVICE_ROLE_KEY` is configured in Vercel environment variables. |
| **Super Admin showing as Buyer** | Browser cached old role session in `localStorage` | In Admin Dashboard, tap **"Clear Cache & Fix Role"** or clear browser cache/cookies and re-login. |
| **APK fails to load catalog** | `NEXT_PUBLIC_API_BASE_URL` empty during APK build | Set `NEXT_PUBLIC_API_BASE_URL=https://your-domain.vercel.app` in `.env.local` and re-run `npm run build:apk`. |

---

## 12. Sign-Off & Official Acceptance

This codebase, database architecture, and mobile build pipeline are certified **production-ready** and fully handed over to **Bio-Bramha Private Limited**.
