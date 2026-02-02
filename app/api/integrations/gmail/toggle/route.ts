import { createClient } from '@/lib/supabase/server'
import { toggleGmailStatus } from '@/lib/integrations'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const newStatus = await toggleGmailStatus(user.id)

    return NextResponse.json({
      success: true,
      status: newStatus,
    })
  } catch (error) {
    console.error('Toggle Gmail error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to toggle Gmail status' },
      { status: 500 }
    )
  }
}
