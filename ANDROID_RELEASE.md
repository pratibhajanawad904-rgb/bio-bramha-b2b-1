# Android release (Google Play .aab)

Package: `com.biobramha.dealermitra` · versionCode 20 · versionName 20.0.0
Production API: `https://bio-bramha-b2b-1-git-main-pratibha-projects.vercel.app` (from `.env.production.apk`)

The Android project in `android/` is already synced with the production web bundle
(`android/app/src/main/assets/public`, built with the production API URL above).

## Build the .aab in Android Studio (your existing upload keystore)

1. `npm install` in the project root (Gradle resolves Capacitor from `node_modules`).
2. Optional, only if the web code changed: `npm run android:sync` (re-exports and re-syncs assets).
3. Open the **`android/`** folder in Android Studio and let Gradle sync (JDK 17, compileSdk 36).
4. **Build → Generate Signed Bundle / APK → Android App Bundle → release** and pick your existing
   Play upload keystore. Do not create a new key.
5. Upload `app-release.aab` to Google Play Console.

Command line alternative: copy `android/keystore.properties.example` to `android/keystore.properties`,
fill in your keystore details (git-ignored), then run `npm run build:aab`.

Note: `android/build.gradle` writes build output to `C:/gradle-builds/bio-bramha` on Windows
(avoids OneDrive file locks). The .aab appears at `C:/gradle-builds/bio-bramha/app/outputs/bundle/release/`.

## Before you upload
- Vercel must have the correct `NEXT_PUBLIC_SUPABASE_URL=https://rmyvftmmcoulhvipmjyw.supabase.co`
  (the deployed value had a typo) plus `SUPABASE_SERVICE_ROLE_KEY`, `MSG91_AUTH_KEY`,
  `MSG91_TEMPLATE_ID`, `MSG91_SENDER_ID`, `SESSION_SECRET`.
- Check `https://bio-bramha-b2b-1-git-main-pratibha-projects.vercel.app/api/health` returns `"ok": true`.
