import { google } from "googleapis";
function getDriveClient(accessToken) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    return google.drive({ version: "v3", auth });
}
const APP_FOLDER_NAME = "CourseAssistant";
/**
 * Gets or creates the root CourseAssistant folder in the user's Drive.
 */
export async function getOrCreateAppFolder(accessToken) {
    const drive = getDriveClient(accessToken);
    // Search for existing folder
    const response = await drive.files.list({
        q: `name='${APP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: "files(id, name)",
        spaces: "drive",
    });
    if (response.data.files && response.data.files.length > 0) {
        return response.data.files[0].id;
    }
    // Create the folder
    const folder = await drive.files.create({
        requestBody: {
            name: APP_FOLDER_NAME,
            mimeType: "application/vnd.google-apps.folder",
        },
        fields: "id",
    });
    return folder.data.id;
}
/**
 * Gets or creates a course folder inside the app folder.
 */
export async function getOrCreateCourseFolder(accessToken, courseId) {
    const drive = getDriveClient(accessToken);
    const appFolderId = await getOrCreateAppFolder(accessToken);
    // Search for existing course folder
    const response = await drive.files.list({
        q: `name='${courseId}' and '${appFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: "files(id, name)",
        spaces: "drive",
    });
    if (response.data.files && response.data.files.length > 0) {
        return response.data.files[0].id;
    }
    // Create the course folder
    const folder = await drive.files.create({
        requestBody: {
            name: courseId,
            mimeType: "application/vnd.google-apps.folder",
            parents: [appFolderId],
        },
        fields: "id",
    });
    return folder.data.id;
}
/**
 * Reads a JSON file from Drive.
 * Returns null if file doesn't exist.
 */
export async function readJsonFile(accessToken, folderId, fileName) {
    const drive = getDriveClient(accessToken);
    // Find the file
    const response = await drive.files.list({
        q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
        fields: "files(id, name)",
        spaces: "drive",
    });
    if (!response.data.files || response.data.files.length === 0) {
        return null;
    }
    const fileId = response.data.files[0].id;
    // Download the content
    const content = await drive.files.get({
        fileId,
        alt: "media",
    });
    return content.data;
}
/**
 * Writes a JSON file to Drive.
 * Creates the file if it doesn't exist, updates it if it does.
 */
export async function writeJsonFile(accessToken, folderId, fileName, data) {
    const drive = getDriveClient(accessToken);
    const content = JSON.stringify(data, null, 2);
    // Check if file already exists
    const response = await drive.files.list({
        q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
        fields: "files(id, name)",
        spaces: "drive",
    });
    if (response.data.files && response.data.files.length > 0) {
        // Update existing file
        const fileId = response.data.files[0].id;
        await drive.files.update({
            fileId,
            media: {
                mimeType: "application/json",
                body: content,
            },
        });
        return fileId;
    }
    // Create new file
    const file = await drive.files.create({
        requestBody: {
            name: fileName,
            mimeType: "application/json",
            parents: [folderId],
        },
        media: {
            mimeType: "application/json",
            body: content,
        },
        fields: "id",
    });
    return file.data.id;
}
/**
 * Deletes a file from Drive.
 */
export async function deleteFile(accessToken, fileId) {
    const drive = getDriveClient(accessToken);
    await drive.files.delete({ fileId });
}
/**
 * Lists files in a folder.
 */
export async function listFiles(accessToken, folderId) {
    const drive = getDriveClient(accessToken);
    const response = await drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        fields: "files(id, name, mimeType, modifiedTime, size)",
        spaces: "drive",
    });
    return (response.data.files || []).map((f) => ({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        modifiedTime: f.modifiedTime || undefined,
        size: f.size || undefined,
    }));
}
/**
 * Uploads a file to Drive.
 */
export async function uploadFile(accessToken, folderId, fileName, content, mimeType) {
    const drive = getDriveClient(accessToken);
    const file = await drive.files.create({
        requestBody: {
            name: fileName,
            mimeType,
            parents: [folderId],
        },
        media: {
            mimeType,
            body: content,
        },
        fields: "id",
    });
    return file.data.id;
}
/**
 * Downloads a file from Drive.
 */
export async function downloadFile(accessToken, fileId) {
    const drive = getDriveClient(accessToken);
    const response = await drive.files.get({
        fileId,
        alt: "media",
    }, { responseType: "arraybuffer" });
    return Buffer.from(response.data);
}
/**
 * Lists all course folders for a user.
 */
export async function listCourseFolders(accessToken) {
    const drive = getDriveClient(accessToken);
    try {
        const appFolderId = await getOrCreateAppFolder(accessToken);
        return await listFiles(accessToken, appFolderId);
    }
    catch {
        return [];
    }
}
/**
 * Checks if a file exists in a folder.
 */
export async function fileExists(accessToken, folderId, fileName) {
    const drive = getDriveClient(accessToken);
    const response = await drive.files.list({
        q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
        fields: "files(id)",
        spaces: "drive",
    });
    return (response.data.files?.length || 0) > 0;
}
//# sourceMappingURL=drive.js.map