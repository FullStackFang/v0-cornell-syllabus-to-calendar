import { createClient } from '@/lib/supabase/server'
import { encrypt, decrypt, deriveSecretFromEmail } from '@/lib/encryption'
import { google } from 'googleapis'

export interface GoogleTokens {
  access_token: string
  refresh_token?: string
  expiry_date?: number
  scope?: string
}

export interface Integration {
  id: string
  user_id: string
  provider: string
  status: 'connected' | 'paused' | 'disconnected'
  token_expiry: string | null
  provider_metadata: Record<string, unknown>
  connected_at: string | null
  disconnected_at: string | null
  created_at: string
}

/**
 * Get the Gmail access token for a user.
 * Returns null if not connected or tokens expired and can't refresh.
 */
export async function getGmailToken(userId: string): Promise<string | null> {
  const supabase = await createClient()

  // Get user's email for decryption
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .single()

  if (!profile?.email) {
    return null
  }

  // Get the integration
  const { data: integration } = await supabase
    .from('integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'gmail')
    .single()

  if (!integration || integration.status !== 'connected') {
    return null
  }

  if (!integration.access_token_encrypted) {
    return null
  }

  const secret = deriveSecretFromEmail(profile.email)

  // Check if token is expired
  const tokenExpiry = integration.token_expiry ? new Date(integration.token_expiry) : null
  const now = new Date()

  if (tokenExpiry && tokenExpiry <= now) {
    // Token expired, try to refresh
    if (integration.refresh_token_encrypted) {
      const refreshedToken = await refreshGmailToken(userId)
      return refreshedToken
    }
    return null
  }

  // Decrypt and return access token
  try {
    return decrypt(integration.access_token_encrypted, secret)
  } catch (error) {
    console.error('Failed to decrypt access token:', error)
    return null
  }
}

/**
 * Save Gmail tokens for a user.
 */
export async function saveGmailTokens(
  userId: string,
  tokens: GoogleTokens
): Promise<void> {
  const supabase = await createClient()

  // Get user's email for encryption
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .single()

  if (!profile?.email) {
    throw new Error('User profile not found')
  }

  const secret = deriveSecretFromEmail(profile.email)

  const encryptedAccessToken = encrypt(tokens.access_token, secret)
  const encryptedRefreshToken = tokens.refresh_token
    ? encrypt(tokens.refresh_token, secret)
    : null

  const tokenExpiry = tokens.expiry_date
    ? new Date(tokens.expiry_date).toISOString()
    : null

  const { error } = await supabase
    .from('integrations')
    .upsert({
      user_id: userId,
      provider: 'gmail',
      status: 'connected',
      access_token_encrypted: encryptedAccessToken,
      refresh_token_encrypted: encryptedRefreshToken,
      token_expiry: tokenExpiry,
      provider_metadata: {
        scope: tokens.scope,
      },
      connected_at: new Date().toISOString(),
      disconnected_at: null,
    }, {
      onConflict: 'user_id,provider',
    })

  if (error) {
    console.error('Failed to save Gmail tokens:', error)
    throw new Error('Failed to save Gmail tokens')
  }
}

/**
 * Refresh Gmail access token using the refresh token.
 */
export async function refreshGmailToken(userId: string): Promise<string | null> {
  const supabase = await createClient()

  // Get user's email for decryption/encryption
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .single()

  if (!profile?.email) {
    return null
  }

  // Get the integration
  const { data: integration } = await supabase
    .from('integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'gmail')
    .single()

  if (!integration?.refresh_token_encrypted) {
    return null
  }

  const secret = deriveSecretFromEmail(profile.email)

  try {
    const refreshToken = decrypt(integration.refresh_token_encrypted, secret)

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/gmail/callback`
    )

    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    })

    // Refresh the token
    const { credentials } = await oauth2Client.refreshAccessToken()

    if (!credentials.access_token) {
      throw new Error('No access token returned')
    }

    // Save the new tokens
    await saveGmailTokens(userId, {
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token || refreshToken,
      expiry_date: credentials.expiry_date || undefined,
      scope: credentials.scope || undefined,
    })

    return credentials.access_token
  } catch (error) {
    console.error('Failed to refresh Gmail token:', error)
    // Mark integration as disconnected if refresh fails
    await supabase
      .from('integrations')
      .update({
        status: 'disconnected',
        disconnected_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('provider', 'gmail')

    return null
  }
}

/**
 * Disconnect Gmail integration for a user.
 * Optionally revokes the token with Google.
 */
export async function disconnectGmail(
  userId: string,
  revokeToken = true
): Promise<void> {
  const supabase = await createClient()

  if (revokeToken) {
    // Try to revoke the token with Google
    const accessToken = await getGmailToken(userId)
    if (accessToken) {
      try {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        })
      } catch (error) {
        console.error('Failed to revoke Google token:', error)
        // Continue with disconnection even if revocation fails
      }
    }
  }

  // Remove tokens and mark as disconnected
  const { error } = await supabase
    .from('integrations')
    .update({
      status: 'disconnected',
      access_token_encrypted: null,
      refresh_token_encrypted: null,
      token_expiry: null,
      disconnected_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('provider', 'gmail')

  if (error) {
    console.error('Failed to disconnect Gmail:', error)
    throw new Error('Failed to disconnect Gmail')
  }
}

/**
 * Toggle Gmail integration status between connected and paused.
 */
export async function toggleGmailStatus(
  userId: string
): Promise<'connected' | 'paused'> {
  const supabase = await createClient()

  // Get current status
  const { data: integration } = await supabase
    .from('integrations')
    .select('status')
    .eq('user_id', userId)
    .eq('provider', 'gmail')
    .single()

  if (!integration) {
    throw new Error('Gmail integration not found')
  }

  const newStatus = integration.status === 'connected' ? 'paused' : 'connected'

  const { error } = await supabase
    .from('integrations')
    .update({ status: newStatus })
    .eq('user_id', userId)
    .eq('provider', 'gmail')

  if (error) {
    throw new Error('Failed to toggle Gmail status')
  }

  return newStatus
}

/**
 * Get all integrations for a user.
 */
export async function getUserIntegrations(userId: string): Promise<Integration[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('integrations')
    .select('id, user_id, provider, status, token_expiry, provider_metadata, connected_at, disconnected_at, created_at')
    .eq('user_id', userId)

  if (error) {
    console.error('Failed to get integrations:', error)
    return []
  }

  return data || []
}

/**
 * Get Gmail OAuth URL for connecting.
 */
export function getGmailAuthUrl(state?: string): string {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/gmail/callback`
  )

  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/userinfo.email',
  ]

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
    state: state || undefined,
  })
}
