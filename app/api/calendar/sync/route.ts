import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createBatchEvents, listUserCalendars } from "@/lib/google-calendar"
import type { CalendarEvent } from "@/types"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { events, calendarId = "primary" } = (await request.json()) as {
      events: CalendarEvent[]
      calendarId?: string
    }

    if (!events || !Array.isArray(events)) {
      return NextResponse.json({ error: "Events array required" }, { status: 400 })
    }

    const result = await createBatchEvents(session.accessToken, events, calendarId)

    return NextResponse.json({
      success: true,
      created: result.created,
      errors: result.errors,
    })
  } catch (error) {
    console.error("Calendar sync error:", error)
    return NextResponse.json({ error: "Failed to sync calendar" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const calendars = await listUserCalendars(session.accessToken)

    return NextResponse.json({ calendars })
  } catch (error) {
    console.error("Calendar list error:", error)
    return NextResponse.json({ error: "Failed to list calendars" }, { status: 500 })
  }
}
