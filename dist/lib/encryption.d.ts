/**
 * Encrypts a string using AES-256-GCM.
 * Returns a base64-encoded string containing: salt + iv + authTag + ciphertext
 *
 * @param plaintext - The string to encrypt (e.g., API key)
 * @param secret - The secret to derive the key from (e.g., derived from OAuth token)
 */
export declare function encrypt(plaintext: string, secret: string): string;
/**
 * Decrypts a string that was encrypted with encrypt().
 *
 * @param encryptedData - The base64-encoded encrypted string
 * @param secret - The same secret used for encryption
 */
export declare function decrypt(encryptedData: string, secret: string): string;
/**
 * Generates a deterministic encryption secret from a user's OAuth token.
 * This ensures the same user always gets the same encryption key,
 * but different users have different keys.
 *
 * Note: In production, you might want to use a more stable identifier
 * like the user's Google ID, since access tokens rotate.
 */
export declare function deriveSecretFromToken(accessToken: string): string;
/**
 * Generates a stable encryption secret from a user's email.
 * More stable than access token since email doesn't change.
 * Combined with app secret for security.
 */
export declare function deriveSecretFromEmail(email: string): string;
/**
 * Encrypts an API key for storage.
 * Uses the user's email as the basis for the encryption key.
 */
export declare function encryptApiKey(apiKey: string, userEmail: string): string;
/**
 * Decrypts an API key from storage.
 */
export declare function decryptApiKey(encryptedKey: string, userEmail: string): string;
//# sourceMappingURL=encryption.d.ts.map