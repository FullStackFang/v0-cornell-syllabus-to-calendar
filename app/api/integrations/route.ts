import { createClient } from '@/lib/supabase/server'
import { getUserIntegrations } from '@/lib/integrations'
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

    const integrations = await getUserIntegrations(user.id)

    // Define available providers with their connection status
    const providers = [
      {
        provider: 'gmail',
        name: 'Gmail',
        description: 'Monitor emails and send auto-replies',
        status: integrations.find(i => i.provider === 'gmail')?.status || 'disconnected',
        connected_at: integrations.find(i => i.provider === 'gmail')?.connected_at || null,
      },
      // Future providers can be added here
      // {
      //   provider: 'google-calendar',
      //   name: 'Google Calendar',
      //   description: 'Sync course schedule to calendar',
      //   status: integrations.find(i => i.provider === 'google-calendar')?.status || 'disconnected',
      //   connected_at: integrations.find(i => i.provider === 'google-calendar')?.connected_at || null,
      // },
    ]

    return NextResponse.json({ integrations: providers })
  } catch (error) {
    console.error('Failed to get integrations:', error)
    return NextResponse.json(
      { error: 'Failed to get integrations' },
      { status: 500 }
    )
  }
}
