export interface EmailMessage {
    id: string;
    threadId: string;
    subject: string;
    from: string;
    date: string;
    snippet: string;
    body?: string;
}
export interface EmailThread {
    id: string;
    messages: EmailMessage[];
}
export declare function searchEmails(accessToken: string, query: string, maxResults?: number): Promise<EmailMessage[]>;
export declare function getEmailThread(accessToken: string, threadId: string): Promise<EmailThread>;
export declare function getEmailContent(accessToken: string, messageId: string): Promise<EmailMessage>;
export declare function findPersonEmail(accessToken: string, name: string): Promise<{
    email: string;
    name: string;
} | null>;
export declare function sendEmail(accessToken: string, to: string, subject: string, body: string, threadId?: string): Promise<{
    id: string;
    threadId: string;
}>;
export declare function createDraft(accessToken: string, to: string, subject: string, body: string): Promise<{
    id: string;
    draftId: string;
}>;
export declare function sendReply(accessToken: string, originalEmail: EmailMessage, replyBody: string): Promise<{
    id: string;
    threadId: string;
}>;
export declare function setupGmailWatch(accessToken: string, topicName: string, labelIds?: string[]): Promise<{
    historyId: string;
    expiration: string;
}>;
export declare function stopGmailWatch(accessToken: string): Promise<void>;
export declare function getNewMessagesSinceHistoryId(accessToken: string, startHistoryId: string): Promise<EmailMessage[]>;
export declare function getOrCreateLabel(accessToken: string, labelName: string): Promise<string>;
export declare function addLabelToMessage(accessToken: string, messageId: string, labelId: string): Promise<void>;
export declare function removeLabelFromMessage(accessToken: string, messageId: string, labelId: string): Promise<void>;
export declare function markQuestionAnswered(accessToken: string, messageId: string, courseId: string): Promise<void>;
export declare function markQuestionPending(accessToken: string, messageId: string, courseId: string): Promise<void>;
//# sourceMappingURL=gmail.d.ts.map