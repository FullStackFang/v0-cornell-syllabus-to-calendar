import { NextResponse } from "next/server"
import type { CalendarEvent } from "@/types"

export async function POST(request: Request) {
  try {
    const { events } = (await request.json()) as { events: CalendarEvent[] }

    if (!events || !Array.isArray(events)) {
      return NextResponse.json({ error: "No events provided" }, { status: 400 })
    }

    const icsContent = generateICS(events)

    return NextResponse.json({
      success: true,
      created: events.length,
      icsContent,
    })
  } catch (error) {
    console.error("Calendar create error:", error)
    return NextResponse.json({ error: "Failed to create calendar events" }, { status: 500 })
  }
}

function generateICS(events: CalendarEvent[]): string {
  const formatDate = (dateStr: string, timeStr?: string): string => {
    const date = new Date(dateStr)
    if (timeStr) {
      const [hours, minutes] = timeStr.split(":")
      date.setHours(Number.parseInt(hours), Number.parseInt(minutes), 0)
    }
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
  }

  const escapeText = (text: string): string => {
    return text.replace(/[,;\\]/g, (match) => "\\" + match).replace(/\n/g, "\\n")
  }

  const icsEvents = events
    .map((event) => {
      const start = formatDate(event.startDate, event.startTime)
      const end = event.endDate
        ? formatDate(event.endDate, event.endTime)
        : formatDate(event.startDate, event.endTime || "23:59")

      return `BEGIN:VEVENT
UID:${Date.now()}-${Math.random().toString(36).substring(2, 11)}@syllabuscalendar.app
DTSTAMP:${formatDate(new Date().toISOString())}
DTSTART:${start}
DTEND:${end}
SUMMARY:${escapeText(event.title)}
DESCRIPTION:${escapeText(event.description || "")}
LOCATION:${escapeText(event.location || "")}
END:VEVENT`
    })
    .join("\n")

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Syllabus Calendar Agent//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
${icsEvents}
END:VCALENDAR`
}
