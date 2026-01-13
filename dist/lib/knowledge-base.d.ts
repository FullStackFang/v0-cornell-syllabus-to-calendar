export interface FAQ {
    id: string;
    question: string;
    answer: string;
    source: "professor_approved" | "syllabus" | "manual";
    created: string;
}
export interface KnowledgeBase {
    courseId: string;
    faqs: FAQ[];
    syllabusSummary?: string;
    keyDates?: Array<{
        date: string;
        description: string;
    }>;
    policies?: string[];
}
export declare function createEmptyKnowledgeBase(courseId: string): KnowledgeBase;
/**
 * Gets knowledge base - from Drive if accessToken provided, from cache otherwise.
 */
export declare function getKnowledgeBase(courseId: string, accessToken?: string): Promise<KnowledgeBase>;
/**
 * Saves knowledge base - to Drive if accessToken provided, to cache otherwise.
 */
export declare function saveKnowledgeBase(kb: KnowledgeBase, accessToken?: string): Promise<void>;
/**
 * Adds an FAQ to the knowledge base.
 */
export declare function addFAQ(courseId: string, question: string, answer: string, source?: FAQ["source"], accessToken?: string): Promise<FAQ>;
/**
 * Updates an FAQ.
 */
export declare function updateFAQ(courseId: string, faqId: string, updates: Partial<Pick<FAQ, "question" | "answer">>, accessToken?: string): Promise<FAQ | null>;
/**
 * Removes an FAQ.
 */
export declare function removeFAQ(courseId: string, faqId: string, accessToken?: string): Promise<boolean>;
/**
 * Searches FAQs for matches.
 */
export declare function searchFAQs(courseId: string, query: string, accessToken?: string): Promise<Array<FAQ & {
    similarity: number;
}>>;
/**
 * Updates the syllabus summary.
 */
export declare function updateSyllabusSummary(courseId: string, summary: string, accessToken?: string): Promise<void>;
/**
 * Adds a key date.
 */
export declare function addKeyDate(courseId: string, date: string, description: string, accessToken?: string): Promise<void>;
/**
 * Adds a policy.
 */
export declare function addPolicy(courseId: string, policy: string, accessToken?: string): Promise<void>;
/**
 * Lists all FAQs.
 */
export declare function listFAQs(courseId: string, accessToken?: string): Promise<FAQ[]>;
/**
 * Builds context string from knowledge base for AI prompts.
 */
export declare function buildKnowledgeContext(kb: KnowledgeBase): string;
/**
 * Clears in-memory cache (for testing).
 */
export declare function clearCache(courseId?: string): void;
//# sourceMappingURL=knowledge-base.d.ts.map