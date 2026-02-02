import crypto from "crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16
const SALT_LENGTH = 32

/**
 * Derives an encryption key from a password/secret using PBKDF2.
 * We use the user's Google OAuth access token hash as part of the derivation
 * so the key is unique per user session.
 */
function deriveKey(secret: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(secret, salt, 100000, 32, "sha256")
}

/**
 * Encrypts a string using AES-256-GCM.
 * Returns a base64-encoded string containing: salt + iv + authTag + ciphertext
 *
 * @param plaintext - The string to encrypt (e.g., API key)
 * @param secret - The secret to derive the key from (e.g., derived from OAuth token)
 */
export function encrypt(plaintext: string, secret: string): string {
  // Generate random salt and IV
  const salt = crypto.randomBytes(SALT_LENGTH)
  const iv = crypto.randomBytes(IV_LENGTH)

  // Derive key from secret and salt
  const key = deriveKey(secret, salt)

  // Create cipher and encrypt
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ])

  // Get auth tag
  const authTag = cipher.getAuthTag()

  // Combine: salt + iv + authTag + ciphertext
  const combined = Buffer.concat([salt, iv, authTag, encrypted])

  return combined.toString("base64")
}

/**
 * Decrypts a string that was encrypted with encrypt().
 *
 * @param encryptedData - The base64-encoded encrypted string
 * @param secret - The same secret used for encryption
 */
export function decrypt(encryptedData: string, secret: string): string {
  const combined = Buffer.from(encryptedData, "base64")

  // Extract components
  const salt = combined.subarray(0, SALT_LENGTH)
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
  const authTag = combined.subarray(
    SALT_LENGTH + IV_LENGTH,
    SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
  )
  const ciphertext = combined.subarray(
    SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
  )

  // Derive the same key
  const key = deriveKey(secret, salt)

  // Create decipher and decrypt
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ])

  return decrypted.toString("utf8")
}

/**
 * Generates a deterministic encryption secret from a user's OAuth token.
 * This ensures the same user always gets the same encryption key,
 * but different users have different keys.
 *
 * Note: In production, you might want to use a more stable identifier
 * like the user's Google ID, since access tokens rotate.
 */
export function deriveSecretFromToken(accessToken: string): string {
  // Use the first part of a hash of the token as the secret base
  // Combined with an app-level secret for additional security
  const appSecret = process.env.NEXTAUTH_SECRET || "fallback-secret"
  return crypto
    .createHash("sha256")
    .update(accessToken + appSecret)
    .digest("hex")
}

/**
 * Generates a stable encryption secret from a user's email.
 * More stable than access token since email doesn't change.
 * Combined with app secret for security.
 */
export function deriveSecretFromEmail(email: string): string {
  // Use ENCRYPTION_SECRET (preferred), falling back to NEXTAUTH_SECRET for backwards compatibility
  const appSecret = process.env.ENCRYPTION_SECRET || process.env.NEXTAUTH_SECRET || "fallback-secret"
  return crypto
    .createHash("sha256")
    .update(email.toLowerCase() + appSecret)
    .digest("hex")
}

/**
 * Encrypts an API key for storage.
 * Uses the user's email as the basis for the encryption key.
 */
export function encryptApiKey(apiKey: string, userEmail: string): string {
  const secret = deriveSecretFromEmail(userEmail)
  return encrypt(apiKey, secret)
}

/**
 * Decrypts an API key from storage.
 */
export function decryptApiKey(encryptedKey: string, userEmail: string): string {
  const secret = deriveSecretFromEmail(userEmail)
  return decrypt(encryptedKey, secret)
}
