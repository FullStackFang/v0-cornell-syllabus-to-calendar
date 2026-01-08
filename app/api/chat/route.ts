import Anthropic from "@anthropic-ai/sdk"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createBatchEvents } from "@/lib/google-calendar"
import { searchEmails, getEmailThread } from "@/lib/gmail"

export const maxDuration = 60

const anthropic = new Anthropic()

function getSystemPrompt() {
  const today = new Date()
  const dateStr = today.toISOString().split('T')[0]
  const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' })

  return `You are a helpful academic assistant for Cornell EMBA students. You help manage course schedules, parse syllabi, create calendar events, and find course-related emails.

TODAY'S DATE: ${dayOfWeek}, ${dateStr}

Your capabilities:
1. Parse syllabus PDFs to extract course information, schedules, and assignments
2. Create calendar events on the user's Google Calendar using the create_calendar_events tool
3. Search the user's Gmail for course-related emails using the search_emails tool
4. Get and summarize email threads using the get_email_thread tool

When a user uploads a syllabus or provides syllabus text:
1. Extract and present the information clearly
2. Offer to create calendar events for class sessions and assignment due dates

When creating calendar events:
- Use the create_calendar_events tool immediately when the user asks - don't ask for confirmation unless details are unclear
- Calculate dates automatically (e.g., "tomorrow" = the day after TODAY'S DATE)
- Use 24-hour time format (14:00 for 2pm)
- Default to 1 hour duration if not specified
- Use clear titles like "EMBA 5100: Strategy Session" or "Team Meeting"

When searching emails:
- Use Gmail search syntax (from:, subject:, after:, before:, etc.)
- Summarize results helpfully

Be concise and action-oriented. Execute tools when asked rather than asking for more details.`
}

const tools: Anthropic.Tool[] = [
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
            },
            required: ["title", "startDate"],
          },
        },
      },
      required: ["events"],
    },
  },
  {
    name: "search_emails",
    description: "Search the user's Gmail for emails. Use Gmail search syntax: 'from:email@example.com', 'subject:keyword', etc.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Gmail search query" },
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
]

async function executeTool(name: string, input: Record<string, unknown>, accessToken: string) {
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
      }))

      try {
        const result = await createBatchEvents(accessToken, calendarEvents)
        console.log("Calendar result:", result)
        return { success: true, message: `Created ${result.created} calendar event(s)`, created: result.created, errors: result.errors }
      } catch (error) {
        console.error("Calendar error:", error)
        return { success: false, error: `Failed to create calendar events: ${error}` }
      }
    }
    case "search_emails": {
      const query = input.query as string
      const maxResults = (input.maxResults as number) ?? 10
      try {
        const emails = await searchEmails(accessToken, query, maxResults)
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
      const threadId = input.threadId as string
      try {
        const thread = await getEmailThread(accessToken, threadId)
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
    default:
      return { error: "Unknown tool" }
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.accessToken) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { messages } = await req.json()
  const accessToken = session.accessToken

  try {
    // Convert messages to Anthropic format
    const anthropicMessages: Anthropic.MessageParam[] = messages.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }))

    let response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: getSystemPrompt(),
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
            accessToken
          )
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
        system: getSystemPrompt(),
        tools,
        messages: anthropicMessages,
      })
    }

    // Extract text from response
    const textBlock = response.content.find((block): block is Anthropic.TextBlock => block.type === "text")
    const responseText = textBlock?.text || ""

    // Return as streaming format expected by client
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`0:${JSON.stringify(responseText)}\n`))
        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
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
