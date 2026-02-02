import { createClient } from '@/lib/supabase/server'
import { disconnectGmail } from '@/lib/integrations'
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

    await disconnectGmail(user.id)

    return NextResponse.json({
      success: true,
      message: 'Gmail disconnected successfully',
    })
  } catch (error) {
    console.error('Disconnect Gmail error:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect Gmail' },
      { status: 500 }
    )
  }
}
