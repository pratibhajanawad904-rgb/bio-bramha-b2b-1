import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

/**
 * API Route: Clear and Repopulate Role Assignments in Database
 * 
 * This route will:
 * 1. Delete ALL existing user_accounts records
 * 2. Insert fresh records for 8050946969 (super_admin) and 7975158924 (warehouse)
 * 
 * This ensures database is in sync with PREPROVISIONED_ACCOUNTS
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = supabaseServer

    // Step 1: Clear all user accounts (WARNING: This deletes ALL user account records)
    const { error: deleteError } = await supabase
      .from('user_accounts')
      .delete()
      .neq('phone', '') // Delete all records (neq with empty string matches all)

    if (deleteError) {
      console.error('Error clearing user_accounts:', deleteError)
      return NextResponse.json({
        success: false,
        error: 'Failed to clear existing roles',
        details: deleteError
      }, { status: 500 })
    }

    // Step 2: Insert correct role assignments
    const correctRoles = [
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
        assigned_warehouse_id: 'wh-taloja'
      }
    ]

    const { data: insertedData, error: insertError } = await supabase
      .from('user_accounts')
      .insert(correctRoles)
      .select()

    if (insertError) {
      console.error('Error inserting user_accounts:', insertError)
      return NextResponse.json({
        success: false,
        error: 'Failed to insert new roles',
        details: insertError
      }, { status: 500 })
    }

    // Step 3: Verify the result
    const { data: verifyData, error: verifyError } = await supabase
      .from('user_accounts')
      .select('*')
      .order('phone', { ascending: true })

    if (verifyError) {
      console.error('Error verifying user_accounts:', verifyError)
    }

    return NextResponse.json({
      success: true,
      message: 'Database roles cleared and repopulated successfully',
      cleared: true,
      inserted: insertedData?.length || 0,
      current_roles: verifyData || []
    })

  } catch (error: any) {
    console.error('Unexpected error in reset-database-roles:', error)
    return NextResponse.json({
      success: false,
      error: 'Unexpected error',
      details: error.message
    }, { status: 500 })
  }
}
