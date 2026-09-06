import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const settingsFilePath = path.join(process.cwd(), 'lib', 'settings.json')

const defaultSettings = {
  helplineNumber: '',
  helplineEmail: 'support@biobramha.com',
  paymentSettings: {
    qrCodeImage: null,
    upiId: '',
    accountDetails: ''
  }
}

function readSettingsFromFile() {
  try {
    if (fs.existsSync(settingsFilePath)) {
      const data = fs.readFileSync(settingsFilePath, 'utf-8')
      const parsed = JSON.parse(data)
      return {
        helplineNumber: parsed.helplineNumber || defaultSettings.helplineNumber,
        helplineEmail: parsed.helplineEmail || defaultSettings.helplineEmail,
        paymentSettings: parsed.paymentSettings || defaultSettings.paymentSettings
      }
    }
  } catch (e) {
    console.warn('[Settings API] Failed to read settings file:', e)
  }
  return defaultSettings
}

function writeSettingsToFile(settings: { helplineNumber: string; helplineEmail: string; paymentSettings?: any }) {
  try {
    const dir = path.dirname(settingsFilePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(settingsFilePath, JSON.stringify(settings, null, 2), 'utf-8')
  } catch (e) {
    console.warn('[Settings API] Failed to write settings file:', e)
  }
}

export async function GET() {
  const settings = readSettingsFromFile()
  return NextResponse.json(settings)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const current = readSettingsFromFile()

    const updated = {
      helplineNumber: body.helplineNumber && body.helplineNumber.trim() !== '' ? body.helplineNumber.trim() : current.helplineNumber,
      helplineEmail: body.helplineEmail && body.helplineEmail.trim() !== '' ? body.helplineEmail.trim() : current.helplineEmail,
      paymentSettings: body.paymentSettings || current.paymentSettings || {
        qrCodeImage: null,
        upiId: '',
        accountDetails: ''
      }
    }

    writeSettingsToFile(updated)

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      settings: updated
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to update settings' }, { status: 500 })
  }
}
