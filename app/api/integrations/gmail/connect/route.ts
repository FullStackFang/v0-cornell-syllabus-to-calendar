import { createClient } from '@/lib/supabase/server'
import { getGmailAuthUrl } from '@/lib/integrations'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Generate state token for CSRF protection (includes user ID)
    const state = Buffer.from(JSON.stringify({
      userId: user.id,
      timestamp: Date.now(),
    })).toString('base64')

    const authUrl = getGmailAuthUrl(state)

    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Gmail connect error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate Gmail connection' },
      { status: 500 }
    )
  }
}
