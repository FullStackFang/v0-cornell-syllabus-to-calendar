import { streamText, tool } from "ai"
import { anthropic } from "@ai-sdk/anthropic"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  toolSchemas,
  executeCreateCalendarEvents,
  executeSearchEmails,
  executeSummarizeEmailThread,
  executeParseSyllabus,
} from "@/lib/agent/tools"

export const maxDuration = 60

const SYSTEM_PROMPT = `You are a helpful academic assistant for Cornell EMBA students. You help manage course schedules, parse syllabi, create calendar events, and find course-related emails.

Your capabilities:
1. Parse syllabus PDFs to extract course information, schedules, and assignments
2. Create calendar events on the user's Google Calendar
3. Search the user's Gmail for course-related emails (from professors, about assignments, etc.)
4. Summarize email threads about course topics

When a user uploads a syllabus or provides syllabus text:
1. Use the parse_syllabus tool to extract structured data
2. Present the extracted information clearly
3. Offer to create calendar events for class sessions and assignment due dates

When creating calendar events:
- Always confirm the events before creating them
- Use clear, descriptive titles like "EMBA 5100: Strategy Session" or "Assignment Due: Case Analysis"
- Include relevant details in the description

When searching emails:
- Use Gmail search syntax (from:, subject:, after:, before:, etc.)
- Summarize the results helpfully
- Offer to read specific threads in detail

Be concise but helpful. Focus on making academic scheduling easier.`

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.accessToken) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { messages } = await req.json()

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: SYSTEM_PROMPT,
    messages,
    tools: {
      create_calendar_events: tool({
        description: toolSchemas.create_calendar_events.description,
        parameters: toolSchemas.create_calendar_events.parameters,
        execute: async (params) => {
          return executeCreateCalendarEvents(session.accessToken!, params)
        },
      }),
      search_emails: tool({
        description: toolSchemas.search_emails.description,
        parameters: toolSchemas.search_emails.parameters,
        execute: async (params) => {
          return executeSearchEmails(session.accessToken!, params)
        },
      }),
      summarize_email_thread: tool({
        description: toolSchemas.summarize_email_thread.description,
        parameters: toolSchemas.summarize_email_thread.parameters,
        execute: async (params) => {
          return executeSummarizeEmailThread(session.accessToken!, params)
        },
      }),
      parse_syllabus: tool({
        description: toolSchemas.parse_syllabus.description,
        parameters: toolSchemas.parse_syllabus.parameters,
        execute: async (params) => {
          return executeParseSyllabus(params)
        },
      }),
    },
    maxSteps: 5,
  })

  return result.toDataStreamResponse()
}
