/**
 * MCP Tool Registry
 *
 * Registers all available tools with the MCP server.
 * Tools are organized by category and connect to lib/ functions.
 */
import { getAccessToken, getUserEmail } from "../auth/google.js";
// Import lib functions
import { searchEmails, getEmailThread, sendEmail, createDraft, } from "../../lib/gmail.js";
import { createBatchEvents, listCalendarEvents, } from "../../lib/google-calendar.js";
import { getKnowledgeBase, addFAQ, updateFAQ, removeFAQ, listFAQs, searchFAQs, updateSyllabusSummary, addKeyDate, addPolicy, } from "../../lib/knowledge-base.js";
import { createCourse, getCourseConfig, updateCourseConfig, listCourses, getPendingQuestions, removePendingQuestion, addToHistory, getCourseStats, } from "../../lib/course-config.js";
// Helper to create tool response
function createResponse(data) {
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify(data, null, 2),
            },
        ],
    };
}
// Helper to handle errors
function handleError(error) {
    const message = error instanceof Error ? error.message : String(error);
    return createResponse({ success: false, error: message });
}
/**
 * Registers all tools with the MCP server
 */
export function registerTools(server) {
    // ============================================
    // COURSE MANAGEMENT TOOLS
    // ============================================
    server.setRequestHandler({ method: "tools/call" }, async (request) => {
        const { name, arguments: args = {} } = request.params;
        try {
            const accessToken = await getAccessToken();
            const userEmail = await getUserEmail();
            switch (name) {
                // ----------------------------------------
                // Course Management
                // ----------------------------------------
                case "setup_course": {
                    const courseId = String(args.courseId || "").toLowerCase().replace(/\s+/g, "-");
                    const courseName = String(args.courseName || "");
                    if (!courseId || !courseName) {
                        return createResponse({
                            success: false,
                            error: "courseId and courseName are required",
                        });
                    }
                    const course = await createCourse(accessToken, courseId, courseName, userEmail);
                    return createResponse({
                        success: true,
                        message: `Course "${courseName}" created`,
                        course: {
                            courseId: course.courseId,
                            courseName: course.courseName,
                            professorEmail: course.professorEmail,
                        },
                    });
                }
                case "list_courses": {
                    const courses = await listCourses(accessToken);
                    return createResponse({
                        success: true,
                        count: courses.length,
                        courses: courses.map((c) => ({
                            courseId: c.courseId,
                            courseName: c.courseName,
                            createdAt: c.createdAt,
                        })),
                    });
                }
                case "get_course_info": {
                    const courseId = String(args.courseId || "");
                    if (!courseId) {
                        return createResponse({ success: false, error: "courseId required" });
                    }
                    const config = await getCourseConfig(accessToken, courseId);
                    if (!config) {
                        return createResponse({ success: false, error: "Course not found" });
                    }
                    const kb = await getKnowledgeBase(courseId, accessToken);
                    const stats = await getCourseStats(accessToken, courseId);
                    return createResponse({
                        success: true,
                        course: {
                            courseId: config.courseId,
                            courseName: config.courseName,
                            professorEmail: config.professorEmail,
                            settings: config.settings,
                            createdAt: config.createdAt,
                        },
                        knowledgeBase: {
                            faqCount: kb.faqs.length,
                            hasSyllabusSummary: !!kb.syllabusSummary,
                            keyDatesCount: kb.keyDates?.length || 0,
                            policiesCount: kb.policies?.length || 0,
                        },
                        stats,
                    });
                }
                case "update_settings": {
                    const courseId = String(args.courseId || "");
                    const settings = args.settings;
                    if (!courseId) {
                        return createResponse({ success: false, error: "courseId required" });
                    }
                    await updateCourseConfig(accessToken, courseId, { settings: settings });
                    return createResponse({
                        success: true,
                        message: "Settings updated",
                    });
                }
                // ----------------------------------------
                // Knowledge Base
                // ----------------------------------------
                case "sync_syllabus": {
                    const courseId = String(args.courseId || "");
                    const syllabusText = String(args.syllabusText || "");
                    if (!courseId || !syllabusText) {
                        return createResponse({
                            success: false,
                            error: "courseId and syllabusText required",
                        });
                    }
                    // Store the syllabus summary
                    await updateSyllabusSummary(courseId, syllabusText, accessToken);
                    // Return info about what was stored
                    return createResponse({
                        success: true,
                        message: "Syllabus summary stored. Use add_faq, add_key_date, and add_policy to extract specific items.",
                        syllabusLength: syllabusText.length,
                    });
                }
                case "add_faq": {
                    const courseId = String(args.courseId || "");
                    const question = String(args.question || "");
                    const answer = String(args.answer || "");
                    if (!courseId || !question || !answer) {
                        return createResponse({
                            success: false,
                            error: "courseId, question, and answer required",
                        });
                    }
                    const faq = await addFAQ(courseId, question, answer, "manual", accessToken);
                    return createResponse({
                        success: true,
                        message: "FAQ added",
                        faq: { id: faq.id, question: faq.question, answer: faq.answer },
                    });
                }
                case "list_faqs": {
                    const courseId = String(args.courseId || "");
                    if (!courseId) {
                        return createResponse({ success: false, error: "courseId required" });
                    }
                    const faqs = await listFAQs(courseId, accessToken);
                    return createResponse({
                        success: true,
                        count: faqs.length,
                        faqs: faqs.map((f) => ({
                            id: f.id,
                            question: f.question,
                            answer: f.answer,
                            source: f.source,
                        })),
                    });
                }
                case "update_faq": {
                    const courseId = String(args.courseId || "");
                    const faqId = String(args.faqId || "");
                    const question = args.question ? String(args.question) : undefined;
                    const answer = args.answer ? String(args.answer) : undefined;
                    if (!courseId || !faqId) {
                        return createResponse({
                            success: false,
                            error: "courseId and faqId required",
                        });
                    }
                    const updated = await updateFAQ(courseId, faqId, { question, answer }, accessToken);
                    if (!updated) {
                        return createResponse({ success: false, error: "FAQ not found" });
                    }
                    return createResponse({
                        success: true,
                        message: "FAQ updated",
                        faq: updated,
                    });
                }
                case "remove_faq": {
                    const courseId = String(args.courseId || "");
                    const faqId = String(args.faqId || "");
                    if (!courseId || !faqId) {
                        return createResponse({
                            success: false,
                            error: "courseId and faqId required",
                        });
                    }
                    const removed = await removeFAQ(courseId, faqId, accessToken);
                    return createResponse({
                        success: removed,
                        message: removed ? "FAQ removed" : "FAQ not found",
                    });
                }
                case "search_faqs": {
                    const courseId = String(args.courseId || "");
                    const query = String(args.query || "");
                    if (!courseId || !query) {
                        return createResponse({
                            success: false,
                            error: "courseId and query required",
                        });
                    }
                    const results = await searchFAQs(courseId, query, accessToken);
                    return createResponse({
                        success: true,
                        count: results.length,
                        results: results.slice(0, 5).map((r) => ({
                            id: r.id,
                            question: r.question,
                            answer: r.answer,
                            similarity: r.similarity,
                        })),
                    });
                }
                case "add_key_date": {
                    const courseId = String(args.courseId || "");
                    const date = String(args.date || "");
                    const description = String(args.description || "");
                    if (!courseId || !date || !description) {
                        return createResponse({
                            success: false,
                            error: "courseId, date, and description required",
                        });
                    }
                    await addKeyDate(courseId, date, description, accessToken);
                    return createResponse({
                        success: true,
                        message: `Key date added: ${date} - ${description}`,
                    });
                }
                case "add_policy": {
                    const courseId = String(args.courseId || "");
                    const policy = String(args.policy || "");
                    if (!courseId || !policy) {
                        return createResponse({
                            success: false,
                            error: "courseId and policy required",
                        });
                    }
                    await addPolicy(courseId, policy, accessToken);
                    return createResponse({
                        success: true,
                        message: "Policy added",
                    });
                }
                // ----------------------------------------
                // Email Processing
                // ----------------------------------------
                case "check_emails": {
                    const courseId = String(args.courseId || "");
                    const query = String(args.query || "is:unread");
                    const maxResults = Number(args.maxResults || 10);
                    if (!courseId) {
                        return createResponse({ success: false, error: "courseId required" });
                    }
                    // Search emails
                    const emails = await searchEmails(accessToken, query, maxResults);
                    // Get knowledge base for confidence scoring
                    const kb = await getKnowledgeBase(courseId, accessToken);
                    // Analyze each email
                    const analyzed = await Promise.all(emails.map(async (email) => {
                        // Search for matching FAQs
                        const matches = await searchFAQs(courseId, email.snippet || "", accessToken);
                        const bestMatch = matches[0];
                        // Simple confidence based on FAQ match
                        const confidence = bestMatch ? Math.min(bestMatch.similarity + 0.3, 0.95) : 0.3;
                        return {
                            id: email.id,
                            threadId: email.threadId,
                            from: email.from,
                            subject: email.subject,
                            date: email.date,
                            snippet: email.snippet,
                            confidence: Math.round(confidence * 100),
                            suggestedResponse: bestMatch?.answer || null,
                            matchedFaq: bestMatch
                                ? { question: bestMatch.question, similarity: bestMatch.similarity }
                                : null,
                        };
                    }));
                    return createResponse({
                        success: true,
                        count: analyzed.length,
                        emails: analyzed,
                    });
                }
                case "get_pending": {
                    const courseId = String(args.courseId || "");
                    if (!courseId) {
                        return createResponse({ success: false, error: "courseId required" });
                    }
                    const pending = await getPendingQuestions(accessToken, courseId);
                    return createResponse({
                        success: true,
                        count: pending.length,
                        questions: pending,
                    });
                }
                case "approve_response": {
                    const courseId = String(args.courseId || "");
                    const emailId = String(args.emailId || "");
                    const threadId = String(args.threadId || "");
                    const to = String(args.to || "");
                    const response = String(args.response || "");
                    if (!courseId || !to || !response) {
                        return createResponse({
                            success: false,
                            error: "courseId, to, and response required",
                        });
                    }
                    // Send the email
                    const result = await sendEmail(accessToken, to, "Re: Your Question", response, threadId || undefined);
                    // Add to history
                    await addToHistory(accessToken, courseId, {
                        id: `answered-${Date.now()}`,
                        emailId,
                        from: to,
                        subject: "Re: Your Question",
                        question: "", // Would need original question
                        response,
                        answeredAt: new Date().toISOString(),
                        wasAutoReply: false,
                        addedToFaq: false,
                    });
                    return createResponse({
                        success: true,
                        message: `Response sent to ${to}`,
                        messageId: result.messageId,
                    });
                }
                case "draft_response": {
                    const to = String(args.to || "");
                    const subject = String(args.subject || "Re: Your Question");
                    const body = String(args.body || "");
                    if (!to || !body) {
                        return createResponse({
                            success: false,
                            error: "to and body required",
                        });
                    }
                    const result = await createDraft(accessToken, to, subject, body);
                    return createResponse({
                        success: true,
                        message: `Draft created for ${to}`,
                        draftId: result.draftId,
                    });
                }
                case "ignore_question": {
                    const courseId = String(args.courseId || "");
                    const questionId = String(args.questionId || "");
                    if (!courseId || !questionId) {
                        return createResponse({
                            success: false,
                            error: "courseId and questionId required",
                        });
                    }
                    const removed = await removePendingQuestion(accessToken, courseId, questionId);
                    return createResponse({
                        success: !!removed,
                        message: removed ? "Question removed from queue" : "Question not found",
                    });
                }
                // ----------------------------------------
                // General Email Tools
                // ----------------------------------------
                case "search_emails": {
                    const query = String(args.query || "");
                    const maxResults = Number(args.maxResults || 10);
                    if (!query) {
                        return createResponse({ success: false, error: "query required" });
                    }
                    const emails = await searchEmails(accessToken, query, maxResults);
                    return createResponse({
                        success: true,
                        count: emails.length,
                        emails: emails.map((e) => ({
                            id: e.id,
                            threadId: e.threadId,
                            from: e.from,
                            subject: e.subject,
                            date: e.date,
                            snippet: e.snippet,
                        })),
                    });
                }
                case "get_email_thread": {
                    const threadId = String(args.threadId || "");
                    if (!threadId) {
                        return createResponse({ success: false, error: "threadId required" });
                    }
                    const thread = await getEmailThread(accessToken, threadId);
                    return createResponse({
                        success: true,
                        threadId: thread.id,
                        messageCount: thread.messages.length,
                        messages: thread.messages.map((m) => ({
                            from: m.from,
                            date: m.date,
                            subject: m.subject,
                            body: m.body?.substring(0, 2000),
                        })),
                    });
                }
                case "send_email": {
                    const to = String(args.to || "");
                    const subject = String(args.subject || "");
                    const body = String(args.body || "");
                    const threadId = args.threadId ? String(args.threadId) : undefined;
                    if (!to || !subject || !body) {
                        return createResponse({
                            success: false,
                            error: "to, subject, and body required",
                        });
                    }
                    const result = await sendEmail(accessToken, to, subject, body, threadId);
                    return createResponse({
                        success: true,
                        message: `Email sent to ${to}`,
                        ...result,
                    });
                }
                // ----------------------------------------
                // Calendar Tools
                // ----------------------------------------
                case "create_event": {
                    const title = String(args.title || "");
                    const startDate = String(args.startDate || "");
                    const startTime = args.startTime ? String(args.startTime) : undefined;
                    const endDate = args.endDate ? String(args.endDate) : undefined;
                    const endTime = args.endTime ? String(args.endTime) : undefined;
                    const location = args.location ? String(args.location) : undefined;
                    const description = args.description ? String(args.description) : undefined;
                    if (!title || !startDate) {
                        return createResponse({
                            success: false,
                            error: "title and startDate required",
                        });
                    }
                    const result = await createBatchEvents(accessToken, [
                        { title, startDate, startTime, endDate, endTime, location, description },
                    ]);
                    return createResponse({
                        success: result.errors.length === 0,
                        created: result.created,
                        errors: result.errors,
                    });
                }
                case "list_events": {
                    const startDate = String(args.startDate || "");
                    const endDate = String(args.endDate || "");
                    if (!startDate || !endDate) {
                        return createResponse({
                            success: false,
                            error: "startDate and endDate required",
                        });
                    }
                    const events = await listCalendarEvents(accessToken, `${startDate}T00:00:00-05:00`, `${endDate}T23:59:59-05:00`);
                    return createResponse({
                        success: true,
                        count: events.length,
                        events: events.map((e) => ({
                            title: e.title,
                            startDate: e.startDate,
                            startTime: e.startTime,
                            endTime: e.endTime,
                            location: e.location,
                        })),
                    });
                }
                // ----------------------------------------
                // Analytics
                // ----------------------------------------
                case "get_stats": {
                    const courseId = String(args.courseId || "");
                    if (!courseId) {
                        return createResponse({ success: false, error: "courseId required" });
                    }
                    const stats = await getCourseStats(accessToken, courseId);
                    return createResponse({
                        success: true,
                        stats,
                    });
                }
                // ----------------------------------------
                // Default
                // ----------------------------------------
                default:
                    return createResponse({
                        success: false,
                        error: `Unknown tool: ${name}`,
                    });
            }
        }
        catch (error) {
            return handleError(error);
        }
    });
}
/**
 * Returns the list of available tools for registration
 */
export function getToolDefinitions() {
    return [
        // Course Management
        {
            name: "setup_course",
            description: "Create a new course. Creates a folder in Google Drive to store course data.",
            inputSchema: {
                type: "object",
                properties: {
                    courseId: { type: "string", description: "Course identifier (e.g., 'cs-101')" },
                    courseName: { type: "string", description: "Full course name (e.g., 'Introduction to Computer Science')" },
                },
                required: ["courseId", "courseName"],
            },
        },
        {
            name: "list_courses",
            description: "List all courses you have set up",
            inputSchema: { type: "object", properties: {} },
        },
        {
            name: "get_course_info",
            description: "Get detailed information about a course including settings, knowledge base stats, and analytics",
            inputSchema: {
                type: "object",
                properties: {
                    courseId: { type: "string", description: "Course identifier" },
                },
                required: ["courseId"],
            },
        },
        {
            name: "update_settings",
            description: "Update course settings like auto-reply threshold",
            inputSchema: {
                type: "object",
                properties: {
                    courseId: { type: "string", description: "Course identifier" },
                    settings: {
                        type: "object",
                        description: "Settings to update",
                        properties: {
                            autoReplyThreshold: { type: "number", description: "Confidence threshold for auto-reply (0-1)" },
                        },
                    },
                },
                required: ["courseId", "settings"],
            },
        },
        // Knowledge Base
        {
            name: "sync_syllabus",
            description: "Store syllabus text in the knowledge base. You should then use add_faq, add_key_date, and add_policy to extract specific items.",
            inputSchema: {
                type: "object",
                properties: {
                    courseId: { type: "string", description: "Course identifier" },
                    syllabusText: { type: "string", description: "Full syllabus text content" },
                },
                required: ["courseId", "syllabusText"],
            },
        },
        {
            name: "add_faq",
            description: "Add a question and answer to the knowledge base. These are used to suggest responses to student emails.",
            inputSchema: {
                type: "object",
                properties: {
                    courseId: { type: "string", description: "Course identifier" },
                    question: { type: "string", description: "The question" },
                    answer: { type: "string", description: "The answer" },
                },
                required: ["courseId", "question", "answer"],
            },
        },
        {
            name: "list_faqs",
            description: "List all FAQs in the knowledge base",
            inputSchema: {
                type: "object",
                properties: {
                    courseId: { type: "string", description: "Course identifier" },
                },
                required: ["courseId"],
            },
        },
        {
            name: "update_faq",
            description: "Update an existing FAQ",
            inputSchema: {
                type: "object",
                properties: {
                    courseId: { type: "string", description: "Course identifier" },
                    faqId: { type: "string", description: "FAQ ID to update" },
                    question: { type: "string", description: "New question text (optional)" },
                    answer: { type: "string", description: "New answer text (optional)" },
                },
                required: ["courseId", "faqId"],
            },
        },
        {
            name: "remove_faq",
            description: "Remove an FAQ from the knowledge base",
            inputSchema: {
                type: "object",
                properties: {
                    courseId: { type: "string", description: "Course identifier" },
                    faqId: { type: "string", description: "FAQ ID to remove" },
                },
                required: ["courseId", "faqId"],
            },
        },
        {
            name: "search_faqs",
            description: "Search FAQs for matches to a query",
            inputSchema: {
                type: "object",
                properties: {
                    courseId: { type: "string", description: "Course identifier" },
                    query: { type: "string", description: "Search query" },
                },
                required: ["courseId", "query"],
            },
        },
        {
            name: "add_key_date",
            description: "Add an important date to the course (exam, deadline, etc.)",
            inputSchema: {
                type: "object",
                properties: {
                    courseId: { type: "string", description: "Course identifier" },
                    date: { type: "string", description: "Date in YYYY-MM-DD format" },
                    description: { type: "string", description: "What happens on this date" },
                },
                required: ["courseId", "date", "description"],
            },
        },
        {
            name: "add_policy",
            description: "Add a course policy to the knowledge base",
            inputSchema: {
                type: "object",
                properties: {
                    courseId: { type: "string", description: "Course identifier" },
                    policy: { type: "string", description: "Policy text" },
                },
                required: ["courseId", "policy"],
            },
        },
        // Email Processing
        {
            name: "check_emails",
            description: "Check inbox for student questions and analyze them against the knowledge base",
            inputSchema: {
                type: "object",
                properties: {
                    courseId: { type: "string", description: "Course identifier" },
                    query: { type: "string", description: "Gmail search query (default: 'is:unread')" },
                    maxResults: { type: "number", description: "Maximum emails to check (default: 10)" },
                },
                required: ["courseId"],
            },
        },
        {
            name: "get_pending",
            description: "Get questions in the pending queue awaiting your action",
            inputSchema: {
                type: "object",
                properties: {
                    courseId: { type: "string", description: "Course identifier" },
                },
                required: ["courseId"],
            },
        },
        {
            name: "approve_response",
            description: "Approve and send a response to a student",
            inputSchema: {
                type: "object",
                properties: {
                    courseId: { type: "string", description: "Course identifier" },
                    emailId: { type: "string", description: "Original email ID" },
                    threadId: { type: "string", description: "Thread ID for reply threading" },
                    to: { type: "string", description: "Recipient email address" },
                    response: { type: "string", description: "Response text to send" },
                },
                required: ["courseId", "to", "response"],
            },
        },
        {
            name: "draft_response",
            description: "Create an email draft for review before sending",
            inputSchema: {
                type: "object",
                properties: {
                    to: { type: "string", description: "Recipient email address" },
                    subject: { type: "string", description: "Email subject" },
                    body: { type: "string", description: "Email body text" },
                },
                required: ["to", "body"],
            },
        },
        {
            name: "ignore_question",
            description: "Remove a question from the pending queue without responding",
            inputSchema: {
                type: "object",
                properties: {
                    courseId: { type: "string", description: "Course identifier" },
                    questionId: { type: "string", description: "Question ID to ignore" },
                },
                required: ["courseId", "questionId"],
            },
        },
        // General Email
        {
            name: "search_emails",
            description: "Search Gmail inbox using Gmail search syntax",
            inputSchema: {
                type: "object",
                properties: {
                    query: { type: "string", description: "Gmail search query" },
                    maxResults: { type: "number", description: "Maximum results (default: 10)" },
                },
                required: ["query"],
            },
        },
        {
            name: "get_email_thread",
            description: "Get the full content of an email thread",
            inputSchema: {
                type: "object",
                properties: {
                    threadId: { type: "string", description: "Gmail thread ID" },
                },
                required: ["threadId"],
            },
        },
        {
            name: "send_email",
            description: "Send an email",
            inputSchema: {
                type: "object",
                properties: {
                    to: { type: "string", description: "Recipient email" },
                    subject: { type: "string", description: "Subject line" },
                    body: { type: "string", description: "Email body" },
                    threadId: { type: "string", description: "Thread ID for replies (optional)" },
                },
                required: ["to", "subject", "body"],
            },
        },
        // Calendar
        {
            name: "create_event",
            description: "Create a calendar event",
            inputSchema: {
                type: "object",
                properties: {
                    title: { type: "string", description: "Event title" },
                    startDate: { type: "string", description: "Start date (YYYY-MM-DD)" },
                    startTime: { type: "string", description: "Start time (HH:MM, 24-hour)" },
                    endDate: { type: "string", description: "End date (YYYY-MM-DD)" },
                    endTime: { type: "string", description: "End time (HH:MM, 24-hour)" },
                    location: { type: "string", description: "Event location" },
                    description: { type: "string", description: "Event description" },
                },
                required: ["title", "startDate"],
            },
        },
        {
            name: "list_events",
            description: "List calendar events in a date range",
            inputSchema: {
                type: "object",
                properties: {
                    startDate: { type: "string", description: "Start date (YYYY-MM-DD)" },
                    endDate: { type: "string", description: "End date (YYYY-MM-DD)" },
                },
                required: ["startDate", "endDate"],
            },
        },
        // Analytics
        {
            name: "get_stats",
            description: "Get course statistics (questions answered, auto-reply rate, etc.)",
            inputSchema: {
                type: "object",
                properties: {
                    courseId: { type: "string", description: "Course identifier" },
                },
                required: ["courseId"],
            },
        },
    ];
}
//# sourceMappingURL=index.js.map