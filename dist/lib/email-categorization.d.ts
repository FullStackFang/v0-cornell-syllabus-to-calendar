import type { Course, SyllabusData, EmailMessage, CategorizedEmail, GroupedEmails } from "@/types";
/**
 * Extract significant keywords from a course name
 * Filters out common stop words and short words
 */
export declare function extractSignificantKeywords(courseName: string): string[];
/**
 * Build a Gmail search query from course data
 * Combines instructor email, course code, and significant keywords
 */
export declare function buildCourseEmailQuery(course: Course): string;
/**
 * Categorize a single email based on subject and snippet content
 * Also checks against assignment names from the syllabus
 */
export declare function categorizeEmail(email: EmailMessage, syllabusData: SyllabusData): CategorizedEmail;
/**
 * Group an array of emails into categories
 * Sorts each category by date (newest first)
 */
export declare function groupEmails(emails: EmailMessage[], syllabusData: SyllabusData): GroupedEmails;
//# sourceMappingURL=email-categorization.d.ts.map