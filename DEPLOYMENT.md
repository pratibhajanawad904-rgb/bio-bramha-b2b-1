# 🚀 Dealer Mitra (Bio-Bramha) — Production Deployment Guide

This guide provides step-by-step instructions for deploying the **Bio-Bramha Dealer Mitra** web application to Vercel, provisioning the Supabase PostgreSQL database, configuring SMS authentication with MSG91, and compiling the native Android APK.

---

## 1. 👥 Pre-Configured Administrator Accounts

The application has two hardcoded bootstrap accounts configured in code ([`lib/roles.ts`](file:///c:/Users/Sreeshan/OneDrive/Desktop/bio-bramha/lib/roles.ts)) and database seed ([`supabase/seed.sql`](file:///c:/Users/Sreeshan/OneDrive/Desktop/bio-bramha/supabase/seed.sql)):

| Role | Configured Phone Number | Default Name | Access Level / Features |
| :--- | :---: | :---: | :--- |
| **Super Admin** | `8050946969` | `Super Admin` | Full system control: product management, offers, role assignments, payment settings, compliance panel, transfer ownership |
| **Warehouse Manager** | `7975158924` | `Warehouse Manager` | Order fulfillment portal: order acceptance, dispatching, and delivery verification |
| **Buyer / Dealer** | *Any other phone* | Registered Name | Product catalog, cart, advance UPI/bank transfer checkout, order tracking |

> **Note on Login**: When logging in with `8050946969` or `7975158924`, the system sends an SMS OTP via MSG91. Once verified, the user is automatically granted their respective Super Admin or Warehouse dashboard interface.

---

## 2. 🗄️ Database Setup (Supabase)

### Step 2.1: Create a Supabase Project
1. Go to [https://supabase.com](https://supabase.com) and sign in.
2. Click **New Project**, select your organization, and choose region **South Asia (Mumbai - ap-south-1)** for lowest latency.
3. Once provisioned, open **Project Settings → API** and copy:
   - **Project URL** (e.g., `https://yourprojectid.supabase.co`)
   - **anon / public key**
   - **service_role / secret key** (Keep secret; used only by server-side routes)

### Step 2.2: Apply Database Migrations
Open the **SQL Editor** in your Supabase dashboard and run the following migration scripts in order:

1. [`supabase/migrations/0000_base_schema.sql`](file:///c:/Users/Sreeshan/OneDrive/Desktop/bio-bramha/supabase/migrations/0000_base_schema.sql) — Creates tables (`products`, `offers`, `orders`, `user_accounts`, `app_settings`, etc.)
2. [`supabase/migrations/0001_lock_down_rls.sql`](file:///c:/Users/Sreeshan/OneDrive/Desktop/bio-bramha/supabase/migrations/0001_lock_down_rls.sql) — Implements Row Level Security (RLS) policies.
3. [`supabase/migrations/0002_compliance_schema.sql`](file:///c:/Users/Sreeshan/OneDrive/Desktop/bio-bramha/supabase/migrations/0002_compliance_schema.sql) — Adds legal policies and user consent tracking.
4. [`supabase/seed.sql`](file:///c:/Users/Sreeshan/OneDrive/Desktop/bio-bramha/supabase/seed.sql) — Seeds initial catalog, settings, and boots the admin accounts (`8050946969` and `7975158924`).

---

## 3. 🌐 Web App Deployment (Vercel)

### Step 3.1: Configure Environment Variables
In your Vercel Project Settings (**Dashboard → Settings → Environment Variables**), add the following variables:

#### [COMPULSORY] Production Variables:
```env
# 1. Supabase Connection
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key-here

# 2. JWT Session Encryption
SESSION_SECRET=your-64-character-random-hex-string

# 3. MSG91 SMS & OTP Configuration (server-only; never use NEXT_PUBLIC_ for these)
MSG91_AUTH_KEY=your-msg91-auth-key
MSG91_TEMPLATE_ID=your-msg91-otp-template-id
MSG91_SENDER_ID=DMTRA
```

> **Generating a Session Secret**: Run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` in your terminal to generate a secure 64-character key.

### Step 3.2: Deploy
* **Via GitHub**: Push commits to the `main` branch connected to your Vercel project for automatic builds.
* **Via Vercel CLI**:
  ```bash
  npx vercel --prod
  ```

---

## 4. 📱 Android APK Wrapping & Build Pipeline (Capacitor 8)

The mobile app is built by **wrapping the Next.js web application into a native Android shell** using **Capacitor 8.0**.

### 🔍 How Wrapping Works:
1. **Static Export**: The Next.js web application is exported into a static bundle in the `out/` folder (`output: 'export'`).
2. **Capacitor Asset Sync**: `npx cap sync android` copies the static HTML/CSS/JS assets into the Android native project (`android/app/src/main/assets/public/`).
3. **Native Bridge & WebView**: The Android native code (`MainActivity.java`) loads the bundled UI into a high-performance Android WebView with native hardware bridges (storage, network, splash screen).
4. **URL Binding**: The backend domain (`NEXT_PUBLIC_API_BASE_URL`) and database endpoints (`NEXT_PUBLIC_SUPABASE_URL`) are baked into the compiled app binary.

---

### 🔄 How to Re-Wrap the APK When Changing Server / Domain:
If you deploy the web backend to your own new Vercel domain or new Supabase project, follow these 3 simple steps to re-wrap the APK:

#### Step 4.1: Prerequisites
Ensure your build computer has:
* **Node.js 18+**
* **Java Development Kit (JDK 17 or 21)**
* **Android SDK / Android Studio** (with `ANDROID_HOME` environment variable set)

#### Step 4.2: Update Target URLs in `.env.local`
Set your new live Vercel web URL and new Supabase URL:
```env
NEXT_PUBLIC_API_BASE_URL=https://your-new-domain.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://your-new-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-new-anon-key
```

#### Step 4.3: Execute the Automated Wrap & Build Script
Run the automated build script in terminal:
```bash
npm run build:apk
```

#### Step 4.4: Fresh APK Output
The build script compiles the native Android binary and automatically copies it to:
1. **`Dealer Mitra.apk`** *(Root project directory for easy distribution)*
2. **`android/app/build/outputs/apk/debug/app-debug.apk`**

You can send `Dealer Mitra.apk` directly to users or install on a physical Android device:
```bash
adb install -r "Dealer Mitra.apk"
```

---

## 5. 💳 Payment Methods Configuration

Cash on Delivery (COD) has been removed. The app supports:
1. **Advance UPI / QR Code Payment**
2. **Bank Transfer (NEFT / RTGS / IMPS)**

### Customizing Payment Details:
The Super Admin (`8050946969`) can log in, navigate to **Admin Dashboard → Payment Settings**, and configure:
- **UPI ID** (e.g. `biobramha@upi`)
- **Payment QR Code Image** (Upload custom company QR image)
- **Bank Account Details** (Bank Name, Account Number, IFSC, Account Holder)
- **Helpline Phone & Support Email**

---

## 6. 🔍 Verification & Sanity Testing

After deployment, verify the following core flows:
1. **Buyer Authentication**: Log in with any standard 10-digit mobile number, receive OTP via SMS, and view the catalog.
2. **Super Admin Access**: Log in with `8050946969` → verify access to Admin Center and product manager.
3. **Warehouse Access**: Log in with `7975158924` → verify access to the Warehouse Dispatch portal.
4. **Order Placement**: Add a product to cart → checkout with Advance UPI/Bank details → verify order appears in buyer orders and warehouse portal.
