"use client"
import { useState } from "react"
import { Calendar, Clock, MapPin, X, Download, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { SyllabusData, CalendarEvent } from "@/types"

interface CalendarPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  syllabusData: SyllabusData
  isCreating?: boolean
}

export function CalendarPreviewModal({
  isOpen,
  onClose,
  onConfirm,
  syllabusData,
  isCreating = false,
}: CalendarPreviewModalProps) {
  const [downloadComplete, setDownloadComplete] = useState(false)

  if (!isOpen) return null

  const events = generateCalendarEvents(syllabusData)

  const handleDownloadICS = () => {
    const icsContent = generateICSContent(events)
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${syllabusData.course.code}-calendar.ics`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setDownloadComplete(true)
    setTimeout(() => {
      onConfirm()
    }, 1500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-background rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Calendar Preview</h2>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[60vh]">
          <p className="text-sm text-muted-foreground mb-4">
            {events.length} events will be exported to a calendar file
          </p>

          <div className="space-y-3">
            {events.map((event, index) => (
              <div key={index} className="p-3 rounded-xl bg-muted/50 border border-border">
                <p className="font-medium text-foreground text-sm">{event.title}</p>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(event.startDate).toLocaleDateString()}
                  </span>
                  {event.startTime && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {event.startTime}
                    </span>
                  )}
                  {event.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {event.location}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-border bg-muted/30">
          <Button variant="outline" onClick={onClose} disabled={isCreating || downloadComplete}>
            Cancel
          </Button>
          <Button onClick={handleDownloadICS} disabled={isCreating || downloadComplete}>
            {downloadComplete ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Downloaded
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Download .ics File
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

function generateCalendarEvents(data: SyllabusData): CalendarEvent[] {
  const events: CalendarEvent[] = []
  const courseName = data.course.code

  for (const session of data.schedule) {
    const endTime = calculateEndTime(session.time, session.duration_hours)
    events.push({
      title: `${courseName}: ${session.topic}`,
      description: `Class session for ${data.course.name}`,
      startDate: session.date,
      startTime: session.time,
      endDate: session.date,
      endTime,
      location: session.location,
    })
  }

  for (const assignment of data.assignments) {
    if (assignment.dueDate) {
      events.push({
        title: `${courseName}: ${assignment.name} Due`,
        description: `${assignment.type} - ${assignment.weight}\n${assignment.description}`,
        startDate: assignment.dueDate,
        startTime: "23:59",
        endDate: assignment.dueDate,
        endTime: "23:59",
      })
    }
  }

  return events.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
}

function calculateEndTime(startTime: string, durationHours: number): string {
  const [hours, minutes] = startTime.split(":").map(Number)
  const endHours = hours + durationHours
  return `${String(endHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

function generateICSContent(events: CalendarEvent[]): string {
  const formatDate = (dateStr: string, timeStr?: string): string => {
    const [year, month, day] = dateStr.split("-").map(Number)
    const [hours, minutes] = timeStr ? timeStr.split(":").map(Number) : [0, 0]
    const date = new Date(year, month - 1, day, hours, minutes)
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
DTSTAMP:${formatDate(new Date().toISOString().split("T")[0], "00:00")}
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
