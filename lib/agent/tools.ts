import { z } from "zod"
import { createBatchEvents } from "@/lib/google-calendar"
import { searchEmails, getEmailThread } from "@/lib/gmail"
import { extractSyllabusData } from "@/lib/anthropic"

export const calendarEventSchema = z.object({
  title: z.string().describe("Event title"),
  description: z.string().optional().describe("Event description"),
  startDate: z.string().describe("Start date in YYYY-MM-DD format"),
  startTime: z.string().optional().describe("Start time in HH:MM format (24-hour)"),
  endDate: z.string().optional().describe("End date in YYYY-MM-DD format"),
  endTime: z.string().optional().describe("End time in HH:MM format (24-hour)"),
  location: z.string().optional().describe("Event location"),
})

export const toolSchemas = {
  create_calendar_events: {
    description:
      "Create events on the user's Google Calendar. Use this when the user wants to add course sessions, assignments, or exams to their calendar.",
    parameters: z.object({
      events: z.array(calendarEventSchema).describe("Array of calendar events to create"),
      calendarId: z.string().optional().describe("Calendar ID (defaults to primary calendar)"),
    }),
  },

  search_emails: {
    description:
      "Search the user's Gmail for emails. Use Gmail search syntax: 'from:email@example.com', 'subject:keyword', 'after:2024/01/01', etc. Use this to find course-related emails from professors or about assignments.",
    parameters: z.object({
      query: z.string().describe("Gmail search query"),
      maxResults: z.number().optional().describe("Maximum number of results (default 10)"),
    }),
  },

  summarize_email_thread: {
    description:
      "Get an email thread and summarize its contents. Use this when the user wants to understand a conversation thread about a course topic.",
    parameters: z.object({
      threadId: z.string().describe("The Gmail thread ID to fetch and summarize"),
    }),
  },

  parse_syllabus: {
    description:
      "Extract structured course data from syllabus text. Use this when the user uploads a syllabus or provides syllabus content to parse.",
    parameters: z.object({
      syllabusText: z.string().describe("The raw text content from a syllabus PDF"),
    }),
  },
}

export async function executeCreateCalendarEvents(
  accessToken: string,
  params: z.infer<typeof toolSchemas.create_calendar_events.parameters>
) {
  const result = await createBatchEvents(accessToken, params.events, params.calendarId)
  return {
    success: true,
    message: `Created ${result.created} calendar events`,
    created: result.created,
    errors: result.errors,
  }
}

export async function executeSearchEmails(
  accessToken: string,
  params: z.infer<typeof toolSchemas.search_emails.parameters>
) {
  const emails = await searchEmails(accessToken, params.query, params.maxResults ?? 10)
  return {
    success: true,
    count: emails.length,
    emails: emails.map((e) => ({
      id: e.id,
      threadId: e.threadId,
      subject: e.subject,
      from: e.from,
      date: e.date,
      snippet: e.snippet,
    })),
  }
}

export async function executeSummarizeEmailThread(
  accessToken: string,
  params: z.infer<typeof toolSchemas.summarize_email_thread.parameters>
) {
  const thread = await getEmailThread(accessToken, params.threadId)
  return {
    success: true,
    threadId: thread.id,
    messageCount: thread.messages.length,
    messages: thread.messages.map((m) => ({
      from: m.from,
      date: m.date,
      subject: m.subject,
      body: m.body?.substring(0, 2000),
    })),
  }
}

export async function executeParseSyllabus(
  params: z.infer<typeof toolSchemas.parse_syllabus.parameters>
) {
  const syllabusData = await extractSyllabusData(params.syllabusText)
  return {
    success: true,
    data: syllabusData,
  }
}
