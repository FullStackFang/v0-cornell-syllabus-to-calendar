import { createClient } from '@/lib/supabase/server'
import { saveGmailTokens } from '@/lib/integrations'
import { google } from 'googleapis'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // Handle OAuth errors
  if (error) {
    console.error('Gmail OAuth error:', error)
    return NextResponse.redirect(
      `${origin}/settings/integrations?error=${encodeURIComponent(error)}`
    )
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/settings/integrations?error=missing_code`
    )
  }

  try {
    // Verify the user is authenticated
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(`${origin}/?error=not_authenticated`)
    }

    // Verify state token (CSRF protection)
    if (state) {
      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString())
        if (stateData.userId !== user.id) {
          return NextResponse.redirect(
            `${origin}/settings/integrations?error=invalid_state`
          )
        }
        // Check timestamp (5 minute expiry)
        if (Date.now() - stateData.timestamp > 5 * 60 * 1000) {
          return NextResponse.redirect(
            `${origin}/settings/integrations?error=state_expired`
          )
        }
      } catch {
        return NextResponse.redirect(
          `${origin}/settings/integrations?error=invalid_state`
        )
      }
    }

    // Exchange code for tokens
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/gmail/callback`
    )

    const { tokens } = await oauth2Client.getToken(code)

    if (!tokens.access_token) {
      return NextResponse.redirect(
        `${origin}/settings/integrations?error=no_access_token`
      )
    }

    // Verify the Gmail account matches the user's email
    oauth2Client.setCredentials(tokens)
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
    const { data: userInfo } = await oauth2.userinfo.get()

    if (!userInfo.email) {
      return NextResponse.redirect(
        `${origin}/settings/integrations?error=no_email_in_token`
      )
    }

    // Get user's profile email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single()

    if (profile?.email && userInfo.email.toLowerCase() !== profile.email.toLowerCase()) {
      // Gmail account doesn't match login email
      return NextResponse.redirect(
        `${origin}/settings/integrations?error=email_mismatch&expected=${encodeURIComponent(profile.email)}&got=${encodeURIComponent(userInfo.email)}`
      )
    }

    // Save the tokens
    await saveGmailTokens(user.id, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || undefined,
      expiry_date: tokens.expiry_date || undefined,
      scope: tokens.scope || undefined,
    })

    return NextResponse.redirect(
      `${origin}/settings/integrations?success=gmail_connected`
    )
  } catch (error) {
    console.error('Gmail callback error:', error)
    return NextResponse.redirect(
      `${origin}/settings/integrations?error=callback_failed`
    )
  }
}
