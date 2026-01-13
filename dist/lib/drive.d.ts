export interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
    modifiedTime?: string;
    size?: string;
}
/**
 * Gets or creates the root CourseAssistant folder in the user's Drive.
 */
export declare function getOrCreateAppFolder(accessToken: string): Promise<string>;
/**
 * Gets or creates a course folder inside the app folder.
 */
export declare function getOrCreateCourseFolder(accessToken: string, courseId: string): Promise<string>;
/**
 * Reads a JSON file from Drive.
 * Returns null if file doesn't exist.
 */
export declare function readJsonFile<T>(accessToken: string, folderId: string, fileName: string): Promise<T | null>;
/**
 * Writes a JSON file to Drive.
 * Creates the file if it doesn't exist, updates it if it does.
 */
export declare function writeJsonFile<T>(accessToken: string, folderId: string, fileName: string, data: T): Promise<string>;
/**
 * Deletes a file from Drive.
 */
export declare function deleteFile(accessToken: string, fileId: string): Promise<void>;
/**
 * Lists files in a folder.
 */
export declare function listFiles(accessToken: string, folderId: string): Promise<DriveFile[]>;
/**
 * Uploads a file to Drive.
 */
export declare function uploadFile(accessToken: string, folderId: string, fileName: string, content: Buffer | string, mimeType: string): Promise<string>;
/**
 * Downloads a file from Drive.
 */
export declare function downloadFile(accessToken: string, fileId: string): Promise<Buffer>;
/**
 * Lists all course folders for a user.
 */
export declare function listCourseFolders(accessToken: string): Promise<DriveFile[]>;
/**
 * Checks if a file exists in a folder.
 */
export declare function fileExists(accessToken: string, folderId: string, fileName: string): Promise<boolean>;
//# sourceMappingURL=drive.d.ts.map