import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Failed to sign out' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { origin } = new URL(request.url)

  await supabase.auth.signOut()

  return NextResponse.redirect(`${origin}/`)
}
