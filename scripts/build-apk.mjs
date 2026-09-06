#!/usr/bin/env node
/**
 * Builds the Android app end to end.
 *
 * Sets BUILD_TARGET=capacitor so next.config.mjs switches to `output: 'export'`,
 * producing the static `out/` bundle Capacitor packages. Doing this through a script
 * rather than an inline env assignment keeps it working on both Windows and Unix.
 *
 * The app/api routes are moved aside for the duration of the export. `output: 'export'`
 * rejects dynamic route handlers, while the Vercel deployment needs those same handlers
 * to be dynamic, and `export const dynamic` cannot be conditional. The Android app calls
 * the LIVE server's /api routes via CapacitorHttp (NEXT_PUBLIC_API_BASE_URL), so the
 * route source files are not needed inside the static bundle.
 *
 * Usage: npm run build:apk
 */
import { spawnSync } from 'node:child_process'
import { rmSync, existsSync, renameSync, readFileSync, mkdirSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'

const isWindows = process.platform === 'win32'

// `npm run build:apk`            -> debug APK for testing on a phone
// `npm run build:aab`            -> signed release .aab for Google Play (bundleRelease)
// `npm run build:apk -- --sync`  -> only export web assets + cap sync (then open in Android Studio)
const args = process.argv.slice(2)
const wantAab = args.includes('--aab')
const syncOnly = args.includes('--sync')

const API_DIR = join('app', 'api')
const API_STASH = join('app', '_api_stashed_for_apk_build')
const APK_ENV_FILE = '.env.production.apk'

/**
 * Loads .env.production.apk into a plain object.
 *
 * This filename is not one of Next.js's built-in conventions (.env.production,
 * .env.production.local, etc.), so nothing loads it automatically. Reading it
 * explicitly here and merging it into the child process env is what actually makes
 * NEXT_PUBLIC_API_BASE_URL and friends reach the static export.
 */
function loadApkEnv() {
  const envFile = existsSync(APK_ENV_FILE) ? APK_ENV_FILE : (existsSync('.env.local') ? '.env.local' : (existsSync('.env') ? '.env' : null))
  if (!envFile) {
    console.warn(`\nWarning: No environment file found (.env.production.apk or .env.local). Building with default environment.`)
    return {}
  }

  const content = readFileSync(envFile, 'utf-8')
  const vars = {}

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    // Strip surrounding quotes if present.
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (key) vars[key] = value
  }

  console.log(`\nLoaded ${Object.keys(vars).length} variables from ${envFile}:`)
  for (const key of Object.keys(vars)) {
    console.log(`  ${key}`)
  }

  return vars
}

function run(command, args, options = {}) {
  console.log(`\n> ${command} ${args.join(' ')}`)
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: isWindows,
    ...options
  })

  if (result.status !== 0) {
    throw new Error(`Failed: ${command} ${args.join(' ')}`)
  }
}

function stashApiRoutes() {
  if (existsSync(API_STASH)) {
    // Left over from an interrupted run: put it back before doing anything else.
    if (!existsSync(API_DIR)) renameSync(API_STASH, API_DIR)
    else rmSync(API_STASH, { recursive: true, force: true })
  }
  if (existsSync(API_DIR)) {
    renameSync(API_DIR, API_STASH)
    console.log('\nTemporarily excluded app/api from the static export.')
  }
}

function restoreApiRoutes() {
  if (existsSync(API_STASH)) {
    if (existsSync(API_DIR)) rmSync(API_DIR, { recursive: true, force: true })
    renameSync(API_STASH, API_DIR)
    console.log('Restored app/api.')
  }
}

let exitCode = 0

try {
  const apkEnv = loadApkEnv()

  // The APK is a static bundle: every /api call must go to the live server. Building
  // without this (or with localhost) produces an app that cannot log in or place orders.
  const apiBase = String(apkEnv.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || '').trim()
  if (!/^https:\/\//.test(apiBase) || /localhost|127\.0\.0\.1/.test(apiBase)) {
    throw new Error(
      `NEXT_PUBLIC_API_BASE_URL must be the live https server URL (e.g. https://your-app.vercel.app). ` +
      `Got: "${apiBase || '(empty)'}". Set it in ${APK_ENV_FILE} (see ${APK_ENV_FILE}.example).`
    )
  }
  apkEnv.NEXT_PUBLIC_API_BASE_URL = apiBase.replace(/\/+$/, '')
  console.log(`\nAndroid API base: ${apkEnv.NEXT_PUBLIC_API_BASE_URL}`)

  // 1. Static export for the APK shell, without the API routes.
  stashApiRoutes()
  try {
    run('npx', ['next', 'build'], {
      env: { ...process.env, ...apkEnv, BUILD_TARGET: 'capacitor' }
    })
  } finally {
    restoreApiRoutes()
  }

  if (!existsSync(join('out', 'index.html'))) {
    throw new Error('Static export did not produce out/index.html')
  }

  // 2. Copy web assets into the Android project.
  run('npx', ['cap', 'sync', 'android'])

  // 3. Clear stale merged assets. Gradle intermittently fails with
  //    AccessDeniedException on these when the project lives in a synced folder
  //    such as OneDrive.
  const staleAssets = join('android', 'app', 'build', 'intermediates', 'assets')
  if (existsSync(staleAssets)) {
    try {
      rmSync(staleAssets, { recursive: true, force: true })
      console.log(`\nCleared stale merged assets at ${staleAssets}`)
    } catch (e) {
      console.warn(`\nCould not clear ${staleAssets}: ${e.message}`)
    }
  }

  if (syncOnly) {
    console.log('\nWeb assets exported and synced into android/. Open the android/ folder in Android Studio and use Build > Generate Signed Bundle / APK.')
    process.exit(0)
  }

  if (wantAab) {
    // 4b. Release bundle for Google Play. Signing comes from android/keystore.properties
    //     (see android/keystore.properties.example) or Android Studio's signing wizard.
    run(isWindows ? 'gradlew.bat' : './gradlew', ['bundleRelease'], { cwd: 'android' })
    const externalAab = 'C:/gradle-builds/bio-bramha/app/outputs/bundle/release/app-release.aab'
    const conventionalAab = join('android', 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab')
    if (existsSync(externalAab)) {
      mkdirSync(join('android', 'app', 'build', 'outputs', 'bundle', 'release'), { recursive: true })
      copyFileSync(externalAab, conventionalAab)
    }
    console.log(`\nDone. Release bundle at:\n  - ${existsSync(externalAab) ? externalAab : conventionalAab}`)
    process.exit(0)
  }

  // 4. Assemble the debug APK.
  run(isWindows ? 'gradlew.bat' : './gradlew', ['assembleDebug'], { cwd: 'android' })

  // Gradle's buildDir is redirected to C:/gradle-builds/bio-bramha (see android/build.gradle):
  // building inside this OneDrive-synced folder intermittently fails with
  // "Unable to delete directory ..." because of file-lock contention from
  // OneDrive/antivirus scanning mid-build. Copy the APK back to the conventional
  // path so tooling and documentation that expect it there still find it.
  const externalApk = 'C:/gradle-builds/bio-bramha/app/outputs/apk/debug/app-debug.apk'
  const conventionalApk = join('android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk')
  const rootApk = 'Dealer Mitra.apk'

  if (existsSync(externalApk)) {
    mkdirSync(join('android', 'app', 'build', 'outputs', 'apk', 'debug'), { recursive: true })
    copyFileSync(externalApk, conventionalApk)
    copyFileSync(externalApk, rootApk)
  }

  console.log(`\nDone. Fresh APK copied to:\n  - ${conventionalApk}\n  - ${rootApk}`)
} catch (e) {
  console.error(`\n${e.message}`)
  exitCode = 1
} finally {
  // Belt and braces: never leave the repo without its API routes.
  restoreApiRoutes()
}

process.exit(exitCode)
