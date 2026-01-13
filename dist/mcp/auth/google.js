/**
 * Local Google OAuth for MCP Server
 *
 * Handles authentication without a web app:
 * 1. First run: Opens browser for consent
 * 2. Stores refresh token locally
 * 3. Auto-refreshes access token as needed
 */
import { google } from "googleapis";
import * as http from "http";
import * as url from "url";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as crypto from "crypto";
// Directory for storing credentials
const DATA_DIR = process.env.COURSE_ASSISTANT_DATA_DIR ||
    path.join(os.homedir(), ".course-assistant");
const CREDENTIALS_FILE = path.join(DATA_DIR, "credentials.json");
const ENCRYPTION_KEY_FILE = path.join(DATA_DIR, ".key");
// Required scopes
const SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/drive.file",
];
// In-memory token cache
let cachedToken = null;
/**
 * Ensures the data directory exists
 */
function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
    }
}
/**
 * Gets or creates an encryption key for storing credentials
 */
function getEncryptionKey() {
    ensureDataDir();
    if (fs.existsSync(ENCRYPTION_KEY_FILE)) {
        return fs.readFileSync(ENCRYPTION_KEY_FILE);
    }
    const key = crypto.randomBytes(32);
    fs.writeFileSync(ENCRYPTION_KEY_FILE, key, { mode: 0o600 });
    return key;
}
/**
 * Encrypts a string
 */
function encrypt(text) {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag();
    return JSON.stringify({
        iv: iv.toString("hex"),
        authTag: authTag.toString("hex"),
        data: encrypted,
    });
}
/**
 * Decrypts a string
 */
function decrypt(encryptedJson) {
    const key = getEncryptionKey();
    const { iv, authTag, data } = JSON.parse(encryptedJson);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "hex"));
    decipher.setAuthTag(Buffer.from(authTag, "hex"));
    let decrypted = decipher.update(data, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
}
/**
 * Saves credentials to disk (encrypted)
 */
function saveCredentials(refreshToken, email) {
    ensureDataDir();
    const credentials = {
        refreshToken: encrypt(refreshToken),
        email,
        encryptedAt: new Date().toISOString(),
    };
    fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2), {
        mode: 0o600,
    });
}
/**
 * Loads credentials from disk
 */
function loadCredentials() {
    if (!fs.existsSync(CREDENTIALS_FILE)) {
        return null;
    }
    try {
        const data = fs.readFileSync(CREDENTIALS_FILE, "utf8");
        const credentials = JSON.parse(data);
        return {
            refreshToken: decrypt(credentials.refreshToken),
            email: credentials.email,
        };
    }
    catch (error) {
        console.error("Failed to load credentials:", error);
        return null;
    }
}
/**
 * Clears stored credentials
 */
export function clearCredentials() {
    if (fs.existsSync(CREDENTIALS_FILE)) {
        fs.unlinkSync(CREDENTIALS_FILE);
    }
    cachedToken = null;
}
/**
 * Creates an OAuth2 client
 */
function createOAuth2Client() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
        throw new Error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variables");
    }
    return new google.auth.OAuth2(clientId, clientSecret, "http://localhost:3847/callback" // Local callback for OAuth
    );
}
/**
 * Opens the browser for authentication
 */
async function openBrowser(url) {
    const { exec } = await import("child_process");
    const platform = process.platform;
    let command;
    if (platform === "darwin") {
        command = `open "${url}"`;
    }
    else if (platform === "win32") {
        command = `start "" "${url}"`;
    }
    else {
        command = `xdg-open "${url}"`;
    }
    exec(command, (error) => {
        if (error) {
            console.error("Failed to open browser. Please visit this URL manually:");
            console.error(url);
        }
    });
}
/**
 * Performs interactive OAuth flow
 */
async function performOAuthFlow() {
    const oauth2Client = createOAuth2Client();
    return new Promise((resolve, reject) => {
        // Create a temporary local server to receive the callback
        const server = http.createServer(async (req, res) => {
            try {
                const parsedUrl = url.parse(req.url || "", true);
                if (parsedUrl.pathname === "/callback") {
                    const code = parsedUrl.query.code;
                    if (!code) {
                        res.writeHead(400);
                        res.end("Missing authorization code");
                        return;
                    }
                    // Exchange code for tokens
                    const { tokens } = await oauth2Client.getToken(code);
                    oauth2Client.setCredentials(tokens);
                    // Get user email
                    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
                    const userInfo = await oauth2.userinfo.get();
                    const email = userInfo.data.email || "unknown";
                    // Send success response
                    res.writeHead(200, { "Content-Type": "text/html" });
                    res.end(`
            <html>
              <body style="font-family: system-ui; padding: 40px; text-align: center;">
                <h1>Authentication Successful!</h1>
                <p>You can close this window and return to Claude Desktop.</p>
                <p style="color: #666;">Authenticated as: ${email}</p>
              </body>
            </html>
          `);
                    // Close server
                    server.close();
                    if (!tokens.refresh_token) {
                        reject(new Error("No refresh token received. Try revoking app access and re-authenticating."));
                        return;
                    }
                    resolve({
                        refreshToken: tokens.refresh_token,
                        email,
                    });
                }
            }
            catch (error) {
                res.writeHead(500);
                res.end("Authentication failed");
                server.close();
                reject(error);
            }
        });
        server.listen(3847, () => {
            // Generate auth URL
            const authUrl = oauth2Client.generateAuthUrl({
                access_type: "offline",
                scope: SCOPES,
                prompt: "consent", // Force consent to get refresh token
            });
            console.error("\n" + "=".repeat(60));
            console.error("Opening browser for Google authentication...");
            console.error("If browser doesn't open, visit this URL:");
            console.error(authUrl);
            console.error("=".repeat(60) + "\n");
            openBrowser(authUrl);
        });
        // Timeout after 5 minutes
        setTimeout(() => {
            server.close();
            reject(new Error("Authentication timed out"));
        }, 5 * 60 * 1000);
    });
}
/**
 * Gets a valid access token, refreshing or re-authenticating as needed
 */
export async function getAccessToken() {
    // Check cached token
    if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
        return cachedToken.accessToken;
    }
    const oauth2Client = createOAuth2Client();
    // Try to load stored credentials
    const stored = loadCredentials();
    if (stored) {
        try {
            oauth2Client.setCredentials({ refresh_token: stored.refreshToken });
            const { credentials } = await oauth2Client.refreshAccessToken();
            if (credentials.access_token) {
                cachedToken = {
                    accessToken: credentials.access_token,
                    refreshToken: stored.refreshToken,
                    email: stored.email,
                    expiresAt: credentials.expiry_date || Date.now() + 3600000,
                };
                return credentials.access_token;
            }
        }
        catch (error) {
            console.error("Failed to refresh token, re-authenticating...");
        }
    }
    // Need to authenticate
    const { refreshToken, email } = await performOAuthFlow();
    // Save credentials
    saveCredentials(refreshToken, email);
    // Get fresh access token
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await oauth2Client.refreshAccessToken();
    if (!credentials.access_token) {
        throw new Error("Failed to get access token");
    }
    cachedToken = {
        accessToken: credentials.access_token,
        refreshToken,
        email,
        expiresAt: credentials.expiry_date || Date.now() + 3600000,
    };
    return credentials.access_token;
}
/**
 * Gets the authenticated user's email
 */
export async function getUserEmail() {
    // Ensure we have a valid token (this will authenticate if needed)
    await getAccessToken();
    if (cachedToken?.email) {
        return cachedToken.email;
    }
    const stored = loadCredentials();
    return stored?.email || "unknown";
}
/**
 * Checks if the user is authenticated
 */
export function isAuthenticated() {
    return loadCredentials() !== null;
}
/**
 * Gets authentication status info
 */
export async function getAuthStatus() {
    const stored = loadCredentials();
    return {
        authenticated: stored !== null,
        email: stored?.email,
        dataDir: DATA_DIR,
    };
}
//# sourceMappingURL=google.js.map