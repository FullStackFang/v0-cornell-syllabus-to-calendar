import { v4 as uuidv4 } from "uuid";
import { getOrCreateCourseFolder, readJsonFile, writeJsonFile } from "./drive";
const KB_FILE = "knowledge-base.json";
// In-memory cache for performance and testing without auth
const knowledgeBaseCache = new Map();
export function createEmptyKnowledgeBase(courseId) {
    return {
        courseId,
        faqs: [],
        syllabusSummary: undefined,
        keyDates: [],
        policies: [],
    };
}
/**
 * Gets knowledge base - from Drive if accessToken provided, from cache otherwise.
 */
export async function getKnowledgeBase(courseId, accessToken) {
    // If no access token, use in-memory cache (for testing)
    if (!accessToken) {
        if (knowledgeBaseCache.has(courseId)) {
            return knowledgeBaseCache.get(courseId);
        }
        const kb = createEmptyKnowledgeBase(courseId);
        knowledgeBaseCache.set(courseId, kb);
        return kb;
    }
    // Try to load from Drive
    try {
        const folderId = await getOrCreateCourseFolder(accessToken, courseId);
        const kb = await readJsonFile(accessToken, folderId, KB_FILE);
        if (kb) {
            // Update cache
            knowledgeBaseCache.set(courseId, kb);
            return kb;
        }
    }
    catch (error) {
        console.error("Failed to load KB from Drive:", error);
    }
    // Return cached or empty
    if (knowledgeBaseCache.has(courseId)) {
        return knowledgeBaseCache.get(courseId);
    }
    const kb = createEmptyKnowledgeBase(courseId);
    knowledgeBaseCache.set(courseId, kb);
    return kb;
}
/**
 * Saves knowledge base - to Drive if accessToken provided, to cache otherwise.
 */
export async function saveKnowledgeBase(kb, accessToken) {
    // Always update cache
    knowledgeBaseCache.set(kb.courseId, kb);
    // If access token provided, save to Drive
    if (accessToken) {
        try {
            const folderId = await getOrCreateCourseFolder(accessToken, kb.courseId);
            await writeJsonFile(accessToken, folderId, KB_FILE, kb);
        }
        catch (error) {
            console.error("Failed to save KB to Drive:", error);
            throw error;
        }
    }
}
/**
 * Adds an FAQ to the knowledge base.
 */
export async function addFAQ(courseId, question, answer, source = "professor_approved", accessToken) {
    const kb = await getKnowledgeBase(courseId, accessToken);
    const faq = {
        id: uuidv4(),
        question,
        answer,
        source,
        created: new Date().toISOString(),
    };
    kb.faqs.push(faq);
    await saveKnowledgeBase(kb, accessToken);
    return faq;
}
/**
 * Updates an FAQ.
 */
export async function updateFAQ(courseId, faqId, updates, accessToken) {
    const kb = await getKnowledgeBase(courseId, accessToken);
    const faq = kb.faqs.find((f) => f.id === faqId);
    if (!faq) {
        return null;
    }
    if (updates.question)
        faq.question = updates.question;
    if (updates.answer)
        faq.answer = updates.answer;
    await saveKnowledgeBase(kb, accessToken);
    return faq;
}
/**
 * Removes an FAQ.
 */
export async function removeFAQ(courseId, faqId, accessToken) {
    const kb = await getKnowledgeBase(courseId, accessToken);
    const index = kb.faqs.findIndex((f) => f.id === faqId);
    if (index === -1) {
        return false;
    }
    kb.faqs.splice(index, 1);
    await saveKnowledgeBase(kb, accessToken);
    return true;
}
/**
 * Searches FAQs for matches.
 */
export async function searchFAQs(courseId, query, accessToken) {
    const kb = await getKnowledgeBase(courseId, accessToken);
    // Simple text matching for now
    // TODO: Use embeddings for semantic search
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 2);
    const results = kb.faqs.map((faq) => {
        const questionLower = faq.question.toLowerCase();
        const answerLower = faq.answer.toLowerCase();
        // Count matching words
        let matchCount = 0;
        for (const word of queryWords) {
            if (questionLower.includes(word))
                matchCount += 2;
            if (answerLower.includes(word))
                matchCount += 1;
        }
        // Calculate simple similarity score
        const similarity = queryWords.length > 0 ? matchCount / (queryWords.length * 3) : 0;
        return { ...faq, similarity };
    });
    // Return FAQs with similarity > 0, sorted by similarity
    return results
        .filter((r) => r.similarity > 0)
        .sort((a, b) => b.similarity - a.similarity);
}
/**
 * Updates the syllabus summary.
 */
export async function updateSyllabusSummary(courseId, summary, accessToken) {
    const kb = await getKnowledgeBase(courseId, accessToken);
    kb.syllabusSummary = summary;
    await saveKnowledgeBase(kb, accessToken);
}
/**
 * Adds a key date.
 */
export async function addKeyDate(courseId, date, description, accessToken) {
    const kb = await getKnowledgeBase(courseId, accessToken);
    kb.keyDates = kb.keyDates || [];
    kb.keyDates.push({ date, description });
    await saveKnowledgeBase(kb, accessToken);
}
/**
 * Adds a policy.
 */
export async function addPolicy(courseId, policy, accessToken) {
    const kb = await getKnowledgeBase(courseId, accessToken);
    kb.policies = kb.policies || [];
    kb.policies.push(policy);
    await saveKnowledgeBase(kb, accessToken);
}
/**
 * Lists all FAQs.
 */
export async function listFAQs(courseId, accessToken) {
    const kb = await getKnowledgeBase(courseId, accessToken);
    return kb.faqs;
}
/**
 * Builds context string from knowledge base for AI prompts.
 */
export function buildKnowledgeContext(kb) {
    const parts = [];
    if (kb.syllabusSummary) {
        parts.push(`SYLLABUS SUMMARY:\n${kb.syllabusSummary}`);
    }
    if (kb.keyDates && kb.keyDates.length > 0) {
        parts.push(`KEY DATES:\n${kb.keyDates.map((d) => `- ${d.date}: ${d.description}`).join("\n")}`);
    }
    if (kb.policies && kb.policies.length > 0) {
        parts.push(`POLICIES:\n${kb.policies.map((p) => `- ${p}`).join("\n")}`);
    }
    if (kb.faqs.length > 0) {
        const faqText = kb.faqs
            .slice(-10) // Most recent 10 FAQs
            .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
            .join("\n\n");
        parts.push(`PREVIOUS Q&A:\n${faqText}`);
    }
    return parts.join("\n\n---\n\n");
}
/**
 * Clears in-memory cache (for testing).
 */
export function clearCache(courseId) {
    if (courseId) {
        knowledgeBaseCache.delete(courseId);
    }
    else {
        knowledgeBaseCache.clear();
    }
}
//# sourceMappingURL=knowledge-base.js.map