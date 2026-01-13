#!/usr/bin/env node
/**
 * Course Assistant MCP Server
 *
 * A pure MCP server for managing course Q&A via Claude Desktop, Cursor, or any MCP client.
 *
 * Usage:
 *   npx course-assistant-mcp          # Start stdio server (for Claude Desktop)
 *   npx course-assistant-mcp --http   # Start HTTP server (for remote access)
 *   npx course-assistant-mcp --setup  # Run initial setup
 *   npx course-assistant-mcp --status # Check auth status
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { getToolDefinitions } from "./tools/index.js";
import { getAccessToken, getUserEmail, getAuthStatus, clearCredentials, } from "./auth/google.js";
const SERVER_NAME = "course-assistant";
const SERVER_VERSION = "1.0.0";
/**
 * Creates and configures the MCP server
 */
function createServer() {
    const server = new Server({
        name: SERVER_NAME,
        version: SERVER_VERSION,
    }, {
        capabilities: {
            tools: {},
        },
    });
    // Handle list tools request
    server.setRequestHandler(ListToolsRequestSchema, async () => {
        return {
            tools: getToolDefinitions(),
        };
    });
    // Handle tool calls
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        try {
            // Get access token (will prompt for auth if needed)
            const accessToken = await getAccessToken();
            const userEmail = await getUserEmail();
            // Import and execute the tool
            const { registerTools } = await import("./tools/index.js");
            // The tools are registered dynamically, so we need to handle them here
            // This is a simplified approach - in production, you'd want a cleaner pattern
            return await executeToolCall(name, args || {}, accessToken, userEmail);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({ success: false, error: message }),
                    },
                ],
            };
        }
    });
    return server;
}
/**
 * Execute a tool call with the given arguments
 */
async function executeToolCall(name, args, accessToken, userEmail) {
    // Import lib functions dynamically to avoid issues with ESM/CJS
    const { searchEmails, getEmailThread, sendEmail, createDraft, } = await import("../lib/gmail.js");
    const { createBatchEvents, listCalendarEvents, } = await import("../lib/google-calendar.js");
    const { getKnowledgeBase, addFAQ, updateFAQ, removeFAQ, listFAQs, searchFAQs, updateSyllabusSummary, addKeyDate, addPolicy, } = await import("../lib/knowledge-base.js");
    const { createCourse, getCourseConfig, updateCourseConfig, listCourses, getPendingQuestions, removePendingQuestion, addToHistory, getCourseStats, } = await import("../lib/course-config.js");
    const createResponse = (data) => ({
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    });
    switch (name) {
        // Course Management
        case "setup_course": {
            const courseId = String(args.courseId || "").toLowerCase().replace(/\s+/g, "-");
            const courseName = String(args.courseName || "");
            if (!courseId || !courseName) {
                return createResponse({ success: false, error: "courseId and courseName required" });
            }
            const course = await createCourse(accessToken, courseId, courseName, userEmail);
            return createResponse({
                success: true,
                message: `Course "${courseName}" created`,
                course: { courseId: course.courseId, courseName: course.courseName },
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
            if (!courseId)
                return createResponse({ success: false, error: "courseId required" });
            const config = await getCourseConfig(accessToken, courseId);
            if (!config)
                return createResponse({ success: false, error: "Course not found" });
            const kb = await getKnowledgeBase(courseId, accessToken);
            const stats = await getCourseStats(accessToken, courseId);
            return createResponse({
                success: true,
                course: {
                    courseId: config.courseId,
                    courseName: config.courseName,
                    settings: config.settings,
                },
                knowledgeBase: {
                    faqCount: kb.faqs.length,
                    hasSyllabusSummary: !!kb.syllabusSummary,
                    keyDatesCount: kb.keyDates?.length || 0,
                },
                stats,
            });
        }
        case "update_settings": {
            const courseId = String(args.courseId || "");
            if (!courseId)
                return createResponse({ success: false, error: "courseId required" });
            await updateCourseConfig(accessToken, courseId, { settings: args.settings });
            return createResponse({ success: true, message: "Settings updated" });
        }
        // Knowledge Base
        case "sync_syllabus": {
            const courseId = String(args.courseId || "");
            const syllabusText = String(args.syllabusText || "");
            if (!courseId || !syllabusText) {
                return createResponse({ success: false, error: "courseId and syllabusText required" });
            }
            await updateSyllabusSummary(courseId, syllabusText, accessToken);
            return createResponse({
                success: true,
                message: "Syllabus stored. Use add_faq, add_key_date, add_policy to extract specific items.",
            });
        }
        case "add_faq": {
            const courseId = String(args.courseId || "");
            const question = String(args.question || "");
            const answer = String(args.answer || "");
            if (!courseId || !question || !answer) {
                return createResponse({ success: false, error: "courseId, question, answer required" });
            }
            const faq = await addFAQ(courseId, question, answer, "manual", accessToken);
            return createResponse({ success: true, message: "FAQ added", faq });
        }
        case "list_faqs": {
            const courseId = String(args.courseId || "");
            if (!courseId)
                return createResponse({ success: false, error: "courseId required" });
            const faqs = await listFAQs(courseId, accessToken);
            return createResponse({ success: true, count: faqs.length, faqs });
        }
        case "update_faq": {
            const courseId = String(args.courseId || "");
            const faqId = String(args.faqId || "");
            if (!courseId || !faqId) {
                return createResponse({ success: false, error: "courseId and faqId required" });
            }
            const updated = await updateFAQ(courseId, faqId, { question: args.question, answer: args.answer }, accessToken);
            return createResponse({ success: !!updated, faq: updated });
        }
        case "remove_faq": {
            const courseId = String(args.courseId || "");
            const faqId = String(args.faqId || "");
            if (!courseId || !faqId) {
                return createResponse({ success: false, error: "courseId and faqId required" });
            }
            const removed = await removeFAQ(courseId, faqId, accessToken);
            return createResponse({ success: removed });
        }
        case "search_faqs": {
            const courseId = String(args.courseId || "");
            const query = String(args.query || "");
            if (!courseId || !query) {
                return createResponse({ success: false, error: "courseId and query required" });
            }
            const results = await searchFAQs(courseId, query, accessToken);
            return createResponse({ success: true, results: results.slice(0, 5) });
        }
        case "add_key_date": {
            const courseId = String(args.courseId || "");
            const date = String(args.date || "");
            const description = String(args.description || "");
            if (!courseId || !date || !description) {
                return createResponse({ success: false, error: "courseId, date, description required" });
            }
            await addKeyDate(courseId, date, description, accessToken);
            return createResponse({ success: true, message: `Key date added: ${date}` });
        }
        case "add_policy": {
            const courseId = String(args.courseId || "");
            const policy = String(args.policy || "");
            if (!courseId || !policy) {
                return createResponse({ success: false, error: "courseId and policy required" });
            }
            await addPolicy(courseId, policy, accessToken);
            return createResponse({ success: true, message: "Policy added" });
        }
        // Email Processing
        case "check_emails": {
            const courseId = String(args.courseId || "");
            const query = String(args.query || "is:unread");
            const maxResults = Number(args.maxResults || 10);
            if (!courseId)
                return createResponse({ success: false, error: "courseId required" });
            const emails = await searchEmails(accessToken, query, maxResults);
            const analyzed = await Promise.all(emails.map(async (email) => {
                const matches = await searchFAQs(courseId, email.snippet || "", accessToken);
                const bestMatch = matches[0];
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
                };
            }));
            return createResponse({ success: true, count: analyzed.length, emails: analyzed });
        }
        case "get_pending": {
            const courseId = String(args.courseId || "");
            if (!courseId)
                return createResponse({ success: false, error: "courseId required" });
            const pending = await getPendingQuestions(accessToken, courseId);
            return createResponse({ success: true, count: pending.length, questions: pending });
        }
        case "approve_response": {
            const courseId = String(args.courseId || "");
            const to = String(args.to || "");
            const response = String(args.response || "");
            const threadId = args.threadId ? String(args.threadId) : undefined;
            if (!courseId || !to || !response) {
                return createResponse({ success: false, error: "courseId, to, response required" });
            }
            const result = await sendEmail(accessToken, to, "Re: Your Question", response, threadId);
            await addToHistory(accessToken, courseId, {
                id: `answered-${Date.now()}`,
                emailId: String(args.emailId || ""),
                from: to,
                subject: "Re: Your Question",
                question: "",
                response,
                answeredAt: new Date().toISOString(),
                wasAutoReply: false,
                addedToFaq: false,
            });
            return createResponse({ success: true, message: `Sent to ${to}`, messageId: result.messageId });
        }
        case "draft_response": {
            const to = String(args.to || "");
            const subject = String(args.subject || "Re: Your Question");
            const body = String(args.body || "");
            if (!to || !body) {
                return createResponse({ success: false, error: "to and body required" });
            }
            const result = await createDraft(accessToken, to, subject, body);
            return createResponse({ success: true, message: `Draft created`, draftId: result.draftId });
        }
        case "ignore_question": {
            const courseId = String(args.courseId || "");
            const questionId = String(args.questionId || "");
            if (!courseId || !questionId) {
                return createResponse({ success: false, error: "courseId and questionId required" });
            }
            const removed = await removePendingQuestion(accessToken, courseId, questionId);
            return createResponse({ success: !!removed });
        }
        // General Email
        case "search_emails": {
            const query = String(args.query || "");
            const maxResults = Number(args.maxResults || 10);
            if (!query)
                return createResponse({ success: false, error: "query required" });
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
            if (!threadId)
                return createResponse({ success: false, error: "threadId required" });
            const thread = await getEmailThread(accessToken, threadId);
            return createResponse({
                success: true,
                threadId: thread.id,
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
                return createResponse({ success: false, error: "to, subject, body required" });
            }
            const result = await sendEmail(accessToken, to, subject, body, threadId);
            return createResponse({ success: true, message: `Sent to ${to}`, ...result });
        }
        // Calendar
        case "create_event": {
            const title = String(args.title || "");
            const startDate = String(args.startDate || "");
            if (!title || !startDate) {
                return createResponse({ success: false, error: "title and startDate required" });
            }
            const result = await createBatchEvents(accessToken, [
                {
                    title,
                    startDate,
                    startTime: args.startTime,
                    endDate: args.endDate,
                    endTime: args.endTime,
                    location: args.location,
                    description: args.description,
                },
            ]);
            return createResponse({ success: result.errors.length === 0, created: result.created });
        }
        case "list_events": {
            const startDate = String(args.startDate || "");
            const endDate = String(args.endDate || "");
            if (!startDate || !endDate) {
                return createResponse({ success: false, error: "startDate and endDate required" });
            }
            const events = await listCalendarEvents(accessToken, `${startDate}T00:00:00-05:00`, `${endDate}T23:59:59-05:00`);
            return createResponse({
                success: true,
                count: events.length,
                events: events.map((e) => ({
                    title: e.title,
                    startDate: e.startDate,
                    startTime: e.startTime,
                    location: e.location,
                })),
            });
        }
        // Analytics
        case "get_stats": {
            const courseId = String(args.courseId || "");
            if (!courseId)
                return createResponse({ success: false, error: "courseId required" });
            const stats = await getCourseStats(accessToken, courseId);
            return createResponse({ success: true, stats });
        }
        default:
            return createResponse({ success: false, error: `Unknown tool: ${name}` });
    }
}
/**
 * Main entry point
 */
async function main() {
    const args = process.argv.slice(2);
    // Handle CLI commands
    if (args.includes("--setup") || args.includes("setup")) {
        console.log("Starting Google authentication...");
        try {
            await getAccessToken();
            const email = await getUserEmail();
            console.log(`\nAuthenticated as: ${email}`);
            console.log("Setup complete! You can now use the MCP server.");
        }
        catch (error) {
            console.error("Setup failed:", error);
            process.exit(1);
        }
        return;
    }
    if (args.includes("--status") || args.includes("status")) {
        const status = await getAuthStatus();
        console.log("\nCourse Assistant MCP Server");
        console.log("===========================");
        console.log(`Authenticated: ${status.authenticated ? "Yes" : "No"}`);
        if (status.email)
            console.log(`Email: ${status.email}`);
        console.log(`Data directory: ${status.dataDir}`);
        return;
    }
    if (args.includes("--logout") || args.includes("logout")) {
        clearCredentials();
        console.log("Logged out. Credentials cleared.");
        return;
    }
    if (args.includes("--help") || args.includes("-h")) {
        console.log(`
Course Assistant MCP Server

Usage:
  course-assistant-mcp [options]

Options:
  --setup    Run initial Google authentication
  --status   Check authentication status
  --logout   Clear stored credentials
  --help     Show this help message

For Claude Desktop, add to your config:
{
  "mcpServers": {
    "course-assistant": {
      "command": "node",
      "args": ["/path/to/mcp/server.js"],
      "env": {
        "GOOGLE_CLIENT_ID": "your-client-id",
        "GOOGLE_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
`);
        return;
    }
    // Start stdio server (default mode for Claude Desktop)
    const server = createServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    // Log to stderr (stdout is reserved for MCP protocol)
    console.error(`Course Assistant MCP Server v${SERVER_VERSION}`);
    console.error("Running in stdio mode for MCP client connection");
}
// Run
main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
//# sourceMappingURL=server.js.map