import { createMcpHandler } from "@vercel/mcp-adapter"
import { z } from "zod"
import {
  searchEmails,
  getEmailThread,
  findPersonEmail,
  sendEmail,
  createDraft
} from "@/lib/gmail"
import { createBatchEvents, listCalendarEvents } from "@/lib/google-calendar"

const handler = createMcpHandler(
  (server) => {
    // Tool: Search emails
    server.registerTool(
      "search_emails",
      {
        title: "Search Emails",
        description: "Search user's Gmail inbox using Gmail search query syntax",
        inputSchema: {
          accessToken: z.string().describe("User's Google access token"),
          query: z.string().describe("Gmail search query (e.g., 'from:professor@example.com')"),
          maxResults: z.number().optional().default(10).describe("Maximum number of results")
        }
      },
      async ({ accessToken, query, maxResults }) => {
        const emails = await searchEmails(accessToken, query, maxResults)
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              count: emails.length,
              emails: emails.map(e => ({
                id: e.id,
                threadId: e.threadId,
                subject: e.subject,
                from: e.from,
                date: e.date,
                snippet: e.snippet
              }))
            })
          }]
        }
      }
    )

    // Tool: Send email
    server.registerTool(
      "send_email",
      {
        title: "Send Email",
        description: "Send an email to a recipient",
        inputSchema: {
          accessToken: z.string().describe("User's Google access token"),
          to: z.string().describe("Recipient email address"),
          subject: z.string().describe("Email subject"),
          body: z.string().describe("Email body text"),
          threadId: z.string().optional().describe("Thread ID to reply to (for threading)")
        }
      },
      async ({ accessToken, to, subject, body, threadId }) => {
        const result = await sendEmail(accessToken, to, subject, body, threadId)
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ success: true, ...result })
          }]
        }
      }
    )

    // Tool: Create draft
    server.registerTool(
      "create_draft",
      {
        title: "Create Draft",
        description: "Create an email draft for review before sending",
        inputSchema: {
          accessToken: z.string().describe("User's Google access token"),
          to: z.string().describe("Recipient email address"),
          subject: z.string().describe("Email subject"),
          body: z.string().describe("Email body text")
        }
      },
      async ({ accessToken, to, subject, body }) => {
        const result = await createDraft(accessToken, to, subject, body)
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ success: true, ...result })
          }]
        }
      }
    )

    // Tool: Get email thread
    server.registerTool(
      "get_email_thread",
      {
        title: "Get Email Thread",
        description: "Get the full content of an email thread",
        inputSchema: {
          accessToken: z.string().describe("User's Google access token"),
          threadId: z.string().describe("Gmail thread ID")
        }
      },
      async ({ accessToken, threadId }) => {
        const thread = await getEmailThread(accessToken, threadId)
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              threadId: thread.id,
              messageCount: thread.messages.length,
              messages: thread.messages.map(m => ({
                from: m.from,
                date: m.date,
                subject: m.subject,
                body: m.body?.substring(0, 2000)
              }))
            })
          }]
        }
      }
    )

    // Tool: Find person email
    server.registerTool(
      "find_person_email",
      {
        title: "Find Person Email",
        description: "Find someone's email address by searching past emails with them",
        inputSchema: {
          accessToken: z.string().describe("User's Google access token"),
          name: z.string().describe("Person's name to search for")
        }
      },
      async ({ accessToken, name }) => {
        const result = await findPersonEmail(accessToken, name)
        if (result) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ success: true, found: true, ...result })
            }]
          }
        }
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              found: false,
              message: `Could not find email for "${name}" in past emails`
            })
          }]
        }
      }
    )

    // Tool: Create calendar events
    server.registerTool(
      "create_calendar_events",
      {
        title: "Create Calendar Events",
        description: "Create one or more events on Google Calendar",
        inputSchema: {
          accessToken: z.string().describe("User's Google access token"),
          events: z.array(z.object({
            title: z.string().describe("Event title"),
            startDate: z.string().describe("Start date in YYYY-MM-DD format"),
            startTime: z.string().optional().describe("Start time in HH:MM format (24-hour)"),
            endDate: z.string().optional().describe("End date in YYYY-MM-DD format"),
            endTime: z.string().optional().describe("End time in HH:MM format (24-hour)"),
            location: z.string().optional().describe("Event location"),
            description: z.string().optional().describe("Event description"),
            attendees: z.array(z.string()).optional().describe("Email addresses of attendees")
          })).describe("Array of events to create")
        }
      },
      async ({ accessToken, events }) => {
        const result = await createBatchEvents(accessToken, events)
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ success: true, created: result.created, errors: result.errors })
          }]
        }
      }
    )

    // Tool: List calendar events
    server.registerTool(
      "list_calendar_events",
      {
        title: "List Calendar Events",
        description: "List calendar events in a date range",
        inputSchema: {
          accessToken: z.string().describe("User's Google access token"),
          startDate: z.string().describe("Start date in YYYY-MM-DD format"),
          endDate: z.string().describe("End date in YYYY-MM-DD format")
        }
      },
      async ({ accessToken, startDate, endDate }) => {
        const events = await listCalendarEvents(
          accessToken,
          `${startDate}T00:00:00-05:00`,
          `${endDate}T23:59:59-05:00`
        )
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              count: events.length,
              events: events.map(e => ({
                title: e.title,
                startDate: e.startDate,
                startTime: e.startTime,
                endTime: e.endTime,
                location: e.location
              }))
            })
          }]
        }
      }
    )
  },
  {
    serverInfo: {
      name: "syllabus-agent-mcp",
      version: "1.0.0"
    }
  },
  {
    basePath: "/api/mcp",
    maxDuration: 60
  }
)

export { handler as GET, handler as POST }
