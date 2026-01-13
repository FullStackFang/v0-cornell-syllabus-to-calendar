// Stop words to filter out when extracting keywords from course name
const STOP_WORDS = new Set([
    "the", "and", "or", "in", "of", "for", "to", "a", "an", "is", "are",
    "with", "by", "on", "at", "from", "as", "into", "through", "during",
]);
/**
 * Extract significant keywords from a course name
 * Filters out common stop words and short words
 */
export function extractSignificantKeywords(courseName) {
    return courseName
        .split(/\s+/)
        .filter(word => word.length > 3 &&
        !STOP_WORDS.has(word.toLowerCase()))
        .slice(0, 3); // Limit to top 3 keywords
}
/**
 * Build a Gmail search query from course data
 * Combines instructor email, course code, and significant keywords
 */
export function buildCourseEmailQuery(course) {
    const parts = [];
    // Add instructor email (most specific)
    if (course.email) {
        parts.push(`from:${course.email}`);
    }
    // Add course code (exact match)
    if (course.code) {
        // Handle both with and without spaces: "NBAE 6921" and "NBAE6921"
        const cleanCode = course.code.trim();
        parts.push(`"${cleanCode}"`);
        // Also add version without spaces if it has them
        const noSpaceCode = cleanCode.replace(/\s+/g, "");
        if (noSpaceCode !== cleanCode) {
            parts.push(`"${noSpaceCode}"`);
        }
    }
    // Add significant keywords from course name
    if (course.name) {
        const keywords = extractSignificantKeywords(course.name);
        keywords.forEach(kw => parts.push(`"${kw}"`));
    }
    // Combine with OR for broader search
    return parts.length > 0 ? `(${parts.join(" OR ")})` : "";
}
const CATEGORIZATION_RULES = [
    {
        category: "schedule_changes",
        priority: 1,
        subjectPatterns: [
            /reschedul/i,
            /cancell?ed/i,
            /moved\s+to/i,
            /room\s+change/i,
            /class\s+(cancelled|moved|rescheduled)/i,
            /date\s+change/i,
            /time\s+change/i,
            /location\s+change/i,
            /\bpostponed?\b/i,
            /\bno\s+class\b/i,
        ],
        snippetPatterns: [
            /class.*(?:cancelled|rescheduled|moved)/i,
            /new\s+(?:location|room|time|date)/i,
            /will\s+not\s+(?:meet|be\s+held)/i,
        ],
    },
    {
        category: "assignments",
        priority: 2,
        subjectPatterns: [
            /assignment/i,
            /homework/i,
            /\bdue\b/i,
            /\bsubmit/i,
            /deadline/i,
            /\bexam\b/i,
            /\bquiz\b/i,
            /\bproject\b/i,
            /\bgrade[sd]?\b/i,
            /\bfeedback\b/i,
            /\btest\b/i,
            /\bmidterm\b/i,
            /\bfinal\b/i,
        ],
        snippetPatterns: [
            /due\s+(date|by)/i,
            /please\s+submit/i,
            /submission\s+deadline/i,
            /your\s+grade/i,
        ],
    },
    {
        category: "announcements",
        priority: 3,
        subjectPatterns: [
            /\bannouncement\b/i,
            /\bupdate\b/i,
            /\bimportant\b/i,
            /\breminder\b/i,
            /\bnotice\b/i,
            /\balert\b/i,
            /\bfyi\b/i,
            /\bheads?\s*up\b/i,
            /\bplease\s+note\b/i,
        ],
        snippetPatterns: [
            /please\s+note/i,
            /i\s+wanted\s+to\s+(let\s+you\s+know|inform)/i,
            /this\s+is\s+a\s+reminder/i,
        ],
    },
];
/**
 * Categorize a single email based on subject and snippet content
 * Also checks against assignment names from the syllabus
 */
export function categorizeEmail(email, syllabusData) {
    const matchedKeywords = [];
    const textToSearch = `${email.subject} ${email.snippet}`.toLowerCase();
    // First, check against assignment names from syllabus (highest priority for assignments)
    for (const assignment of syllabusData.assignments) {
        const assignmentName = assignment.name.toLowerCase();
        if (assignmentName.length > 3 && textToSearch.includes(assignmentName)) {
            matchedKeywords.push(assignment.name);
            return { email, category: "assignments", matchedKeywords };
        }
    }
    // Apply pattern-based rules in priority order
    for (const rule of CATEGORIZATION_RULES) {
        // Check subject patterns
        for (const pattern of rule.subjectPatterns) {
            const match = email.subject.match(pattern);
            if (match) {
                matchedKeywords.push(match[0]);
                return { email, category: rule.category, matchedKeywords };
            }
        }
        // Check snippet patterns
        for (const pattern of rule.snippetPatterns) {
            const match = email.snippet.match(pattern);
            if (match) {
                matchedKeywords.push(match[0]);
                return { email, category: rule.category, matchedKeywords };
            }
        }
    }
    // Default to general category
    return { email, category: "general", matchedKeywords: [] };
}
/**
 * Group an array of emails into categories
 * Sorts each category by date (newest first)
 */
export function groupEmails(emails, syllabusData) {
    const grouped = {
        assignments: [],
        announcements: [],
        schedule_changes: [],
        general: [],
    };
    for (const email of emails) {
        const categorized = categorizeEmail(email, syllabusData);
        grouped[categorized.category].push(categorized);
    }
    // Sort each category by date (newest first)
    const categories = ["assignments", "announcements", "schedule_changes", "general"];
    categories.forEach(key => {
        grouped[key].sort((a, b) => new Date(b.email.date).getTime() - new Date(a.email.date).getTime());
    });
    return grouped;
}
//# sourceMappingURL=email-categorization.js.map