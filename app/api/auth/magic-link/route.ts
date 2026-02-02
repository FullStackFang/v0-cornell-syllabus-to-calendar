import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const cookieStore = await cookies()

    // Track cookies that need to be set in the response
    const cookiesToSet: Array<{ name: string; value: string; options: Record<string, unknown> }> = []

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookies) {
            // Collect cookies to set in response
            cookies.forEach(({ name, value, options }) => {
              cookiesToSet.push({ name, value, options })
              // Also try to set in cookie store (may fail in route handlers)
              try {
                cookieStore.set(name, value, options)
              } catch {
                // Ignore - we'll set them in the response
              }
            })
          },
        },
      }
    )

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`,
      },
    })

    if (error) {
      console.error('Magic link error:', error.message, error.status, error)

      // Check for rate limiting
      if (error.message.includes('rate') || error.status === 429) {
        return NextResponse.json(
          { error: 'Too many requests. Please wait a minute before trying again.' },
          { status: 429 }
        )
      }

      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    // Create response with cookies
    const response = NextResponse.json({
      success: true,
      message: 'Check your email for the magic link',
    })

    // Set all cookies in the response
    cookiesToSet.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
    })

    return response
  } catch (error) {
    console.error('Magic link error:', error)
    return NextResponse.json(
      { error: 'Failed to send magic link' },
      { status: 500 }
    )
  }
}
