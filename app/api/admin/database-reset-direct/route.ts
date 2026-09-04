import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

/**
 * Direct database reset - No permissions check for emergency use
 * WARNING: This will delete ALL user_accounts and recreate only 2 accounts
 */
export async function POST() {
  try {
    console.log('🔧 EMERGENCY DATABASE RESET STARTED')

    // Step 1: Get current state
    console.log('📊 Step 1: Checking current database state...')
    const { data: beforeData, error: beforeError } = await supabaseServer
      .from('user_accounts')
      .select('*')

    console.log('Current accounts:', beforeData)
    console.log('Query error (if any):', beforeError)

    // Step 2: Delete all accounts
    console.log('🗑️ Step 2: Deleting all accounts...')
    const { error: deleteError } = await supabaseServer
      .from('user_accounts')
      .delete()
      .neq('phone', '')

    if (deleteError) {
      console.error('Delete error:', deleteError)
      return NextResponse.json({
        success: false,
        error: 'Failed to delete accounts',
        details: deleteError,
        step: 'delete'
      }, { status: 500 })
    }

    console.log('✅ All accounts deleted')

    // Step 3: Insert fresh accounts
    console.log('📥 Step 3: Inserting fresh accounts...')
    const newAccounts = [
      {
        phone: '8050946969',
        role: 'super_admin',
        name: 'Super Admin',
        assigned_warehouse_id: null
      },
      {
        phone: '7975158924',
        role: 'warehouse',
        name: 'Warehouse Manager',
        assigned_warehouse_id: 'wh-central'
      }
    ]

    const { data: insertedData, error: insertError } = await supabaseServer
      .from('user_accounts')
      .insert(newAccounts)
      .select()

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json({
        success: false,
        error: 'Failed to insert accounts',
        details: insertError,
        step: 'insert'
      }, { status: 500 })
    }

    console.log('✅ Accounts inserted:', insertedData)

    // Step 4: Verify final state
    console.log('🔍 Step 4: Verifying final state...')
    const { data: afterData, error: afterError } = await supabaseServer
      .from('user_accounts')
      .select('*')
      .order('phone', { ascending: true })

    if (afterError) {
      console.error('Verify error:', afterError)
    }

    console.log('✅ DATABASE RESET COMPLETE!')
    console.log('Final accounts:', afterData)

    return NextResponse.json({
      success: true,
      message: 'Database reset completed successfully',
      before_count: beforeData?.length || 0,
      after_count: afterData?.length || 0,
      inserted: insertedData?.length || 0,
      current_accounts: afterData || [],
      instructions: [
        '1. Clear localStorage on browser with 8050946969',
        '2. Clear localStorage on browser with 7975158924',
        '3. Re-login both accounts with OTP 123456',
        '4. Verify roles are correct'
      ]
    })

  } catch (error: any) {
    console.error('❌ Unexpected error:', error)
    return NextResponse.json({
      success: false,
      error: 'Unexpected error',
      details: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
