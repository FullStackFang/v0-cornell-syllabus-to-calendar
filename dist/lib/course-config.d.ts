/**
 * Available Claude models with cost/capability tradeoffs.
 *
 * Costs (approx per 1M tokens):
 * - haiku: $0.25 input, $1.25 output - Fast, cheap, good for simple Q&A
 * - sonnet: $3 input, $15 output - Balanced quality/cost
 * - opus: $15 input, $75 output - Most capable, use sparingly
 */
export type ClaudeModel = "haiku" | "sonnet" | "opus";
export declare const MODEL_IDS: Record<ClaudeModel, string>;
export declare const MODEL_INFO: Record<ClaudeModel, {
    name: string;
    costPer1M: {
        input: number;
        output: number;
    };
    description: string;
}>;
export interface CourseSettings {
    autoReplyThreshold: number;
    notifyOnNewQuestion: boolean;
    maxAutoRepliesPerDay?: number;
    /** Model to use for answering questions. Defaults to 'haiku' for cost efficiency. */
    model: ClaudeModel;
    /** Use a smarter model when confidence is low. Defaults to false. */
    useSmartModelForLowConfidence?: boolean;
    /** Threshold below which to use smarter model. Defaults to 0.5. */
    smartModelThreshold?: number;
}
export interface CourseConfig {
    courseId: string;
    courseName: string;
    professorEmail: string;
    professorName?: string;
    encryptedApiKey?: string;
    settings: CourseSettings;
    createdAt: string;
    updatedAt: string;
}
export interface PendingQuestion {
    id: string;
    emailId: string;
    threadId: string;
    from: string;
    subject: string;
    body: string;
    receivedAt: string;
    suggestedResponse: string;
    confidence: number;
    reasoning: string;
}
export interface AnsweredQuestion {
    id: string;
    emailId: string;
    from: string;
    subject: string;
    question: string;
    response: string;
    answeredAt: string;
    wasAutoReply: boolean;
    addedToFaq: boolean;
}
/**
 * Creates a new course configuration.
 */
export declare function createCourse(accessToken: string, courseId: string, courseName: string, professorEmail: string, professorName?: string, anthropicApiKey?: string): Promise<CourseConfig>;
/**
 * Gets a course configuration.
 */
export declare function getCourseConfig(accessToken: string, courseId: string): Promise<CourseConfig | null>;
/**
 * Updates a course configuration.
 */
export declare function updateCourseConfig(accessToken: string, courseId: string, updates: Partial<Omit<CourseConfig, "courseId" | "createdAt">>): Promise<CourseConfig>;
/**
 * Updates the API key for a course.
 */
export declare function updateApiKey(accessToken: string, courseId: string, anthropicApiKey: string, professorEmail: string): Promise<void>;
/**
 * Gets the decrypted API key for a course.
 */
export declare function getDecryptedApiKey(accessToken: string, courseId: string, professorEmail: string): Promise<string | null>;
/**
 * Lists all courses for a user.
 */
export declare function listCourses(accessToken: string): Promise<CourseConfig[]>;
/**
 * Gets the pending questions queue.
 */
export declare function getPendingQuestions(accessToken: string, courseId: string): Promise<PendingQuestion[]>;
/**
 * Adds a question to the pending queue.
 */
export declare function addPendingQuestion(accessToken: string, courseId: string, question: PendingQuestion): Promise<void>;
/**
 * Removes a question from the pending queue.
 */
export declare function removePendingQuestion(accessToken: string, courseId: string, questionId: string): Promise<PendingQuestion | null>;
/**
 * Gets the question history.
 */
export declare function getQuestionHistory(accessToken: string, courseId: string, limit?: number): Promise<AnsweredQuestion[]>;
/**
 * Adds an answered question to history.
 */
export declare function addToHistory(accessToken: string, courseId: string, question: AnsweredQuestion): Promise<void>;
/**
 * Gets course statistics.
 */
export declare function getCourseStats(accessToken: string, courseId: string): Promise<{
    totalQuestions: number;
    autoReplied: number;
    manuallyAnswered: number;
    pendingCount: number;
    autoReplyRate: number;
    thisWeek: number;
}>;
//# sourceMappingURL=course-config.d.ts.map