/**
 * Local Google OAuth for MCP Server
 *
 * Handles authentication without a web app:
 * 1. First run: Opens browser for consent
 * 2. Stores refresh token locally
 * 3. Auto-refreshes access token as needed
 */
/**
 * Clears stored credentials
 */
export declare function clearCredentials(): void;
/**
 * Gets a valid access token, refreshing or re-authenticating as needed
 */
export declare function getAccessToken(): Promise<string>;
/**
 * Gets the authenticated user's email
 */
export declare function getUserEmail(): Promise<string>;
/**
 * Checks if the user is authenticated
 */
export declare function isAuthenticated(): boolean;
/**
 * Gets authentication status info
 */
export declare function getAuthStatus(): Promise<{
    authenticated: boolean;
    email?: string;
    dataDir: string;
}>;
//# sourceMappingURL=google.d.ts.map