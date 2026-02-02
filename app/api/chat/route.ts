import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@/lib/supabase/server"
import { getGmailToken } from "@/lib/integrations"
import { createBatchEvents, listCalendarEvents } from "@/lib/google-calendar"
import { searchEmails, getEmailThread, findPersonEmail, sendEmail, createDraft } from "@/lib/gmail"

export const maxDuration = 60

const anthropic = new Anthropic()

interface SyllabusDataParam {
  course: { code?: string; name?: string; instructor?: string; email?: string; semester?: string; credits?: string }
  schedule: Array<{ date: string; time: string; topic: string; location?: string; duration_hours?: number }>
  assignments: Array<{ name: string; dueDate?: string; type?: string; weight?: string }>
}

function getSystemPrompt(syllabusData?: SyllabusDataParam, hasGmailAccess = false) {
  const today = new Date()
  // Use local date, not UTC (toISOString returns UTC which can be off by a day)
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  const dateStr = `${year}-${month}-${day}`
  const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' })

  let basePrompt = `You are a helpful academic assistant for Cornell EMBA students. You help manage course schedules, parse syllabi, create calendar events, and find course-related emails.

TODAY'S DATE: ${dayOfWeek}, ${dateStr}

RESPONSE STYLE:
- Write like you're texting a friend, not writing a formal report
- NO markdown headers (no ##, ###, **bold labels:**)
- NO bullet points with bold category labels
- Use natural paragraph breaks and simple lists without bullets when needed
- Be warm and direct: "Here's what matters right now:" not "**Recent/Urgent:**"

Example of BAD formatting:
"**Recent Assignments:**
- **Homework 2** - was due Jan 8 midnight (15 points)"

Example of GOOD formatting:
"Recent stuff you might have already handled:
Homework 2 was due yesterday at midnight, worth 15 points"

When creating calendar events:
- Use the create_calendar_events tool immediately
- Calculate dates automatically (e.g., "tomorrow" = day after today)
- Use 24-hour time format (14:00 for 2pm)

When inviting people to events:
- If user provides an email address, add it to the attendees array
- If user says "invite [name]" without an email, use find_person_email tool first to look up their email
- If find_person_email finds the email, create the event with that attendee
- If not found, ask the user for the email address

When user asks about their schedule or availability:
- Use list_calendar_events to check what's on their calendar
- For "am I free at X time?", list that day's events and check for conflicts
- For "what's on my calendar today/tomorrow?", list those events
- Present the schedule conversationally, not as a data dump

Be concise and human.`

  if (!hasGmailAccess) {
    basePrompt += `

EMAIL ACCESS:
Gmail is not connected. Email search, sending, and drafts are unavailable.
If the user asks about emails, let them know they need to connect Gmail from Settings > Integrations.`
  } else {
    basePrompt += `

When searching emails:
- Start with "I found X emails about [course]. Here's what matters:"
- Group naturally by urgency in plain language: "Today's deadlines:", "Recent stuff:", "From earlier:"
- Write in complete sentences, not fragmented bullet points
- End with a casual offer like "Want me to pull up details from any of these?"`
  }

  if (syllabusData) {
    const schedulePreview = syllabusData.schedule?.slice(0, 5).map(s => `- ${s.date}: ${s.topic}`).join('\n') || 'None'
    const moreSessionsNote = (syllabusData.schedule?.length || 0) > 5
      ? `\n... and ${syllabusData.schedule.length - 5} more sessions`
      : ''
    const assignmentsList = syllabusData.assignments?.map(a =>
      `- ${a.name}${a.dueDate ? ` (due ${a.dueDate})` : ''}${a.weight ? ` - ${a.weight}` : ''}`
    ).join('\n') || 'None'

    basePrompt += `

CURRENT UPLOADED SYLLABUS:
Course: ${syllabusData.course?.code || 'N/A'} - ${syllabusData.course?.name || 'Unknown'}
Instructor: ${syllabusData.course?.instructor || 'Unknown'}
Semester: ${syllabusData.course?.semester || 'Unknown'}

Schedule (${syllabusData.schedule?.length || 0} sessions):
${schedulePreview}${moreSessionsNote}

Assignments (${syllabusData.assignments?.length || 0} items):
${assignmentsList}

You have access to this syllabus data. Answer questions about the course using this information.`
  }

  return basePrompt
}

function getTools(hasGmailAccess: boolean): Anthropic.Tool[] {
  const calendarTools: Anthropic.Tool[] = [
    {
      name: "create_calendar_events",
      description: "Create events on the user's Google Calendar. Use this immediately when the user wants to add events. Calculate dates from context (e.g., 'tomorrow' means the day after today).",
      input_schema: {
        type: "object" as const,
        properties: {
          events: {
            type: "array",
            description: "Array of calendar events to create",
            items: {
              type: "object",
              properties: {
                title: { type: "string", description: "Event title" },
                description: { type: "string", description: "Event description" },
                startDate: { type: "string", description: "Start date in YYYY-MM-DD format" },
                startTime: { type: "string", description: "Start time in HH:MM format (24-hour), e.g., '14:00' for 2pm" },
                endDate: { type: "string", description: "End date in YYYY-MM-DD format (usually same as startDate)" },
                endTime: { type: "string", description: "End time in HH:MM format (24-hour), e.g., '15:00' for 3pm" },
                location: { type: "string", description: "Event location" },
                attendees: { type: "array", items: { type: "string" }, description: "Email addresses of people to invite" },
              },
              required: ["title", "startDate"],
            },
          },
        },
        required: ["events"],
      },
    },
    {
      name: "list_calendar_events",
      description: "List the user's calendar events in a date range. Use this to check availability, find free time, see what's scheduled, or answer questions like 'what's on my calendar today?' or 'am I free at 3pm?'",
      input_schema: {
        type: "object" as const,
        properties: {
          startDate: { type: "string", description: "Start date in YYYY-MM-DD format" },
          endDate: { type: "string", description: "End date in YYYY-MM-DD format (can be same as startDate for single day)" },
        },
        required: ["startDate", "endDate"],
      },
    },
  ]

  if (!hasGmailAccess) {
    return calendarTools
  }

  const emailTools: Anthropic.Tool[] = [
    {
      name: "search_emails",
      description: "Search the user's Gmail for emails. Use Gmail search syntax. For course searches, just use the course code (e.g., 'NBAE6921') - keep it simple.",
      input_schema: {
        type: "object" as const,
        properties: {
          query: { type: "string", description: "Gmail search query. For courses, just use the course code directly." },
          maxResults: { type: "number", description: "Maximum number of results (default 10)" },
        },
        required: ["query"],
      },
    },
    {
      name: "get_email_thread",
      description: "Get the full content of an email thread to read or summarize it.",
      input_schema: {
        type: "object" as const,
        properties: {
          threadId: { type: "string", description: "The Gmail thread ID" },
        },
        required: ["threadId"],
      },
    },
    {
      name: "find_person_email",
      description: "Find someone's email address by searching past emails with them. Use this when the user wants to invite someone by name (e.g., 'invite Cristian') but didn't provide their email.",
      input_schema: {
        type: "object" as const,
        properties: {
          name: { type: "string", description: "Person's name to search for" },
        },
        required: ["name"],
      },
    },
    {
      name: "send_email",
      description: "Send an email to someone. Use this to reply to students or send messages. Always confirm with the user before sending.",
      input_schema: {
        type: "object" as const,
        properties: {
          to: { type: "string", description: "Recipient email address" },
          subject: { type: "string", description: "Email subject line" },
          body: { type: "string", description: "Email body text" },
          threadId: { type: "string", description: "Optional thread ID to reply to an existing conversation" },
        },
        required: ["to", "subject", "body"],
      },
    },
    {
      name: "create_draft",
      description: "Create an email draft for the user to review before sending. Use this when drafting responses that need approval.",
      input_schema: {
        type: "object" as const,
        properties: {
          to: { type: "string", description: "Recipient email address" },
          subject: { type: "string", description: "Email subject line" },
          body: { type: "string", description: "Email body text" },
        },
        required: ["to", "subject", "body"],
      },
    },
  ]

  return [...calendarTools, ...emailTools]
}

async function executeTool(
  name: string,
  input: Record<string, unknown>,
  calendarToken: string,
  gmailToken: string | null
) {
  console.log(`Executing tool: ${name}`, JSON.stringify(input, null, 2))

  switch (name) {
    case "create_calendar_events": {
      const events = input.events as Array<{
        title: string
        description?: string
        startDate: string
        startTime?: string
        endDate?: string
        endTime?: string
        location?: string
        attendees?: string[]
      }>

      // Transform events to match the CalendarEvent type
      const calendarEvents = events.map(e => ({
        title: e.title,
        description: e.description,
        startDate: e.startDate,
        startTime: e.startTime,
        endDate: e.endDate || e.startDate,
        endTime: e.endTime,
        location: e.location,
        attendees: e.attendees,
      }))

      try {
        const result = await createBatchEvents(calendarToken, calendarEvents)
        console.log("Calendar result:", result)
        return { success: true, message: `Created ${result.created} calendar event(s)`, created: result.created, errors: result.errors }
      } catch (error) {
        console.error("Calendar error:", error)
        return { success: false, error: `Failed to create calendar events: ${error}` }
      }
    }
    case "search_emails": {
      if (!gmailToken) {
        return { success: false, error: "Gmail not connected. Please connect Gmail from Settings > Integrations." }
      }
      const query = input.query as string
      const maxResults = (input.maxResults as number) ?? 10
      try {
        const emails = await searchEmails(gmailToken, query, maxResults)
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
      } catch (error) {
        console.error("Email search error:", error)
        return { success: false, error: "Failed to search emails" }
      }
    }
    case "get_email_thread": {
      if (!gmailToken) {
        return { success: false, error: "Gmail not connected. Please connect Gmail from Settings > Integrations." }
      }
      const threadId = input.threadId as string
      try {
        const thread = await getEmailThread(gmailToken, threadId)
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
      } catch (error) {
        console.error("Get thread error:", error)
        return { success: false, error: "Failed to get email thread" }
      }
    }
    case "find_person_email": {
      if (!gmailToken) {
        return { success: false, error: "Gmail not connected. Please connect Gmail from Settings > Integrations." }
      }
      const name = input.name as string
      try {
        const result = await findPersonEmail(gmailToken, name)
        if (result) {
          return {
            success: true,
            found: true,
            email: result.email,
            fullName: result.name,
          }
        } else {
          return {
            success: true,
            found: false,
            message: `Could not find email for "${name}" in your past emails. Ask the user for their email address.`,
          }
        }
      } catch (error) {
        console.error("Find person email error:", error)
        return { success: false, error: "Failed to search for person's email" }
      }
    }
    case "send_email": {
      if (!gmailToken) {
        return { success: false, error: "Gmail not connected. Please connect Gmail from Settings > Integrations." }
      }
      const to = input.to as string
      const subject = input.subject as string
      const body = input.body as string
      const threadId = input.threadId as string | undefined
      try {
        const result = await sendEmail(gmailToken, to, subject, body, threadId)
        return {
          success: true,
          message: `Email sent successfully to ${to}`,
          messageId: result.id,
          threadId: result.threadId,
        }
      } catch (error) {
        console.error("Send email error:", error)
        return { success: false, error: "Failed to send email" }
      }
    }
    case "create_draft": {
      if (!gmailToken) {
        return { success: false, error: "Gmail not connected. Please connect Gmail from Settings > Integrations." }
      }
      const to = input.to as string
      const subject = input.subject as string
      const body = input.body as string
      try {
        const result = await createDraft(gmailToken, to, subject, body)
        return {
          success: true,
          message: `Draft created successfully. You can find it in your Gmail drafts.`,
          draftId: result.draftId,
          messageId: result.id,
        }
      } catch (error) {
        console.error("Create draft error:", error)
        return { success: false, error: "Failed to create draft" }
      }
    }
    case "list_calendar_events": {
      const startDate = input.startDate as string
      const endDate = input.endDate as string
      try {
        const events = await listCalendarEvents(
          calendarToken,
          `${startDate}T00:00:00-05:00`,
          `${endDate}T23:59:59-05:00`
        )
        return {
          success: true,
          count: events.length,
          events: events.map(e => ({
            title: e.title,
            startDate: e.startDate,
            startTime: e.startTime,
            endTime: e.endTime,
            location: e.location,
          })),
        }
      } catch (error) {
        console.error("List calendar events error:", error)
        return { success: false, error: "Failed to list calendar events" }
      }
    }
    default:
      return { error: "Unknown tool" }
  }
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return new Response("Unauthorized", { status: 401 })
  }

  // Get Gmail token (may be null if not connected)
  const gmailToken = await getGmailToken(user.id)

  // For calendar, we currently use Gmail token for simplicity
  // In a full implementation, calendar would be a separate connector
  // For now, require Gmail to be connected for calendar operations too
  const calendarToken = gmailToken

  if (!calendarToken) {
    return new Response(JSON.stringify({
      error: "Gmail not connected",
      message: "Please connect Gmail from Settings > Integrations to use this feature.",
      connectUrl: "/settings/integrations",
    }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    })
  }

  const { messages, syllabusData } = await req.json()
  const hasGmailAccess = !!gmailToken

  try {
    // Convert messages to Anthropic format
    const anthropicMessages: Anthropic.MessageParam[] = messages.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }))

    // Track all tool invocations for the frontend
    const toolInvocations: Array<{
      state: "result"
      toolCallId: string
      toolName: string
      args: Record<string, unknown>
      result: unknown
    }> = []

    const tools = getTools(hasGmailAccess)

    let response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: getSystemPrompt(syllabusData, hasGmailAccess),
      tools,
      messages: anthropicMessages,
    })

    // Handle tool use loop - may have multiple tool calls per response
    while (response.stop_reason === "tool_use") {
      // Find ALL tool_use blocks in the response
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
      )

      if (toolUseBlocks.length === 0) break

      // Execute all tools and collect results
      const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
        toolUseBlocks.map(async (toolUseBlock) => {
          const toolResult = await executeTool(
            toolUseBlock.name,
            toolUseBlock.input as Record<string, unknown>,
            calendarToken,
            gmailToken
          )

          // Track for frontend
          toolInvocations.push({
            state: "result",
            toolCallId: toolUseBlock.id,
            toolName: toolUseBlock.name,
            args: toolUseBlock.input as Record<string, unknown>,
            result: toolResult,
          })

          return {
            type: "tool_result" as const,
            tool_use_id: toolUseBlock.id,
            content: JSON.stringify(toolResult),
          }
        })
      )

      // Add assistant response and ALL tool results to messages
      anthropicMessages.push({
        role: "assistant",
        content: response.content,
      })
      anthropicMessages.push({
        role: "user",
        content: toolResults,
      })

      // Get next response
      response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: getSystemPrompt(syllabusData, hasGmailAccess),
        tools,
        messages: anthropicMessages,
      })
    }

    // Extract text from response
    const textBlock = response.content.find((block): block is Anthropic.TextBlock => block.type === "text")
    const responseText = textBlock?.text || ""

    // Return JSON response with text and tool invocations
    return new Response(JSON.stringify({
      text: responseText,
      toolInvocations: toolInvocations.length > 0 ? toolInvocations : undefined,
    }), {
      headers: {
        "Content-Type": "application/json",
      },
    })
  } catch (error) {
    console.error("Chat API error:", error)
    return new Response(JSON.stringify({ error: "Failed to generate response" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
