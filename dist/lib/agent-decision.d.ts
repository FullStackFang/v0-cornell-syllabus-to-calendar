import { KnowledgeBase } from "./knowledge-base";
import { ClaudeModel, CourseSettings } from "./course-config";
export interface EmailData {
    id: string;
    threadId: string;
    from: string;
    subject: string;
    body: string;
    date: string;
}
export interface Decision {
    confidence: number;
    response: string;
    matchedFaqIds: string[];
    reasoning: string;
    modelUsed: ClaudeModel;
}
export interface AnalyzeOptions {
    /** Model to use. Defaults to 'haiku'. */
    model?: ClaudeModel;
    /** Custom Anthropic API key (for BYOK). Uses env var if not provided. */
    apiKey?: string;
    /** Auto-reply threshold. Defaults to 0.85. */
    autoReplyThreshold?: number;
    /** Use smarter model if initial confidence is low. */
    useSmartModelForLowConfidence?: boolean;
    /** Threshold below which to use smarter model. Defaults to 0.5. */
    smartModelThreshold?: number;
}
export declare function analyzeQuestion(email: EmailData, knowledgeBase: KnowledgeBase, options?: AnalyzeOptions): Promise<Decision>;
export declare function shouldAutoReply(decision: Decision, threshold?: number): boolean;
export declare function formatProfessorNotification(email: EmailData, decision: Decision, approvalLinks: {
    approve: string;
    edit: string;
    ignore: string;
}): string;
/**
 * Creates analyze options from course settings.
 */
export declare function createOptionsFromSettings(settings: CourseSettings, apiKey?: string): AnalyzeOptions;
/**
 * Estimates cost for a question based on model.
 * Assumes ~500 input tokens and ~200 output tokens per question.
 */
export declare function estimateCost(model: ClaudeModel): {
    input: number;
    output: number;
    total: number;
};
//# sourceMappingURL=agent-decision.d.ts.map