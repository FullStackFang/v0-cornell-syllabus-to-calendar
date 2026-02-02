"use client"

import { cn } from "@/lib/utils"
import { User, Bot, Calendar, Mail, FileText, Search, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Message } from "ai"
import type { SyllabusData, EmailMessage } from "@/types"

interface ChatMessageProps {
  message: Message
  onFindEmails?: (syllabus: SyllabusData) => void
  onEmailSelect?: (email: EmailMessage) => void
}

// Gmail URL helper
const getGmailUrl = (threadId: string) =>
  `https://mail.google.com/mail/u/0/#inbox/${threadId}`

// Email category types
type EmailTag = "assignment" | "project" | "announcement" | "schedule" | "general"

const tagConfig: Record<EmailTag, { label: string; color: string; bgColor: string; borderColor: string }> = {
  assignment: { label: "Assignments", color: "text-amber-700 dark:text-amber-300", bgColor: "bg-amber-50 dark:bg-amber-950", borderColor: "border-amber-200 dark:border-amber-800" },
  project: { label: "Projects", color: "text-violet-700 dark:text-violet-300", bgColor: "bg-violet-50 dark:bg-violet-950", borderColor: "border-violet-200 dark:border-violet-800" },
  announcement: { label: "Announcements", color: "text-sky-700 dark:text-sky-300", bgColor: "bg-sky-50 dark:bg-sky-950", borderColor: "border-sky-200 dark:border-sky-800" },
  schedule: { label: "Schedule", color: "text-emerald-700 dark:text-emerald-300", bgColor: "bg-emerald-50 dark:bg-emerald-950", borderColor: "border-emerald-200 dark:border-emerald-800" },
  general: { label: "General", color: "text-stone-700 dark:text-stone-300", bgColor: "bg-stone-50 dark:bg-stone-900", borderColor: "border-stone-200 dark:border-stone-700" },
}

// Auto-detect tag from email subject/content
function detectEmailTag(subject: string, snippet: string): EmailTag {
  const text = `${subject} ${snippet}`.toLowerCase()
  if (text.includes("assignment") || text.includes("homework") || text.includes("due date") || text.includes("submit") || text.includes("evaluation")) {
    return "assignment"
  }
  if (text.includes("project") || text.includes("presentation") || text.includes("team") || text.includes("group work")) {
    return "project"
  }
  if (text.includes("schedule") || text.includes("class") || text.includes("session") || text.includes("meeting") || text.includes("office hours")) {
    return "schedule"
  }
  if (text.includes("announcement") || text.includes("important") || text.includes("update") || text.includes("reminder") || text.includes("opportunity") || text.includes("fellowship")) {
    return "announcement"
  }
  return "general"
}

function ToolResultCard({
  toolName,
  result,
  onFindEmails,
  onEmailSelect,
}: {
  toolName: string
  result: unknown
  onFindEmails?: (syllabus: SyllabusData) => void
  onEmailSelect?: (email: EmailMessage) => void
}) {
  const data = result as Record<string, unknown>

  if (toolName === "create_calendar_events" && data.success) {
    return (
      <div className="bg-emerald-50 dark:bg-emerald-950/50 border-2 border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 mt-3 shadow-soft">
        <div className="flex items-center gap-3 text-emerald-700 dark:text-emerald-300 font-semibold">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
            <Calendar className="h-4 w-4" />
          </div>
          {data.message as string}
        </div>
        {(data.errors as string[])?.length > 0 && (
          <div className="text-sm text-red-600 dark:text-red-400 mt-2 pl-11">
            Errors: {(data.errors as string[]).join(", ")}
          </div>
        )}
      </div>
    )
  }

  if (toolName === "search_emails" && data.success) {
    const emails = data.emails as Array<{
      id: string
      subject: string
      from: string
      date: string
      snippet: string
      threadId: string
    }>

    // Group emails by tag
    const groupedEmails = emails.reduce((acc, email) => {
      const tag = detectEmailTag(email.subject, email.snippet)
      if (!acc[tag]) acc[tag] = []
      acc[tag].push(email)
      return acc
    }, {} as Record<EmailTag, typeof emails>)

    // Order of tags to display
    const tagOrder: EmailTag[] = ["assignment", "project", "schedule", "announcement", "general"]

    return (
      <div className="bg-card border-2 border-border rounded-2xl p-4 mt-3 overflow-hidden shadow-soft">
        <div className="flex items-center gap-3 text-foreground font-semibold mb-4">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Mail className="h-4 w-4 text-primary" />
          </div>
          Found {data.count as number} emails
        </div>
        <div className="space-y-3">
          {tagOrder.map((tag) => {
            const tagEmails = groupedEmails[tag]
            if (!tagEmails || tagEmails.length === 0) return null
            const config = tagConfig[tag]
            return (
              <div key={tag} className={cn("rounded-xl border-2 p-3", config.bgColor, config.borderColor)}>
                <div className={cn("text-xs font-bold mb-2 px-1 uppercase tracking-wide", config.color)}>
                  {config.label} ({tagEmails.length})
                </div>
                <div className="space-y-2">
                  {tagEmails.map((email, i) => (
                    <div
                      key={i}
                      className="group bg-background/80 backdrop-blur-sm rounded-xl p-3 border-2 border-transparent hover:border-primary/20 transition-all cursor-pointer hover-lift"
                      onClick={() => onEmailSelect?.({
                        id: email.id,
                        threadId: email.threadId,
                        subject: email.subject,
                        from: email.from,
                        date: email.date,
                        snippet: email.snippet,
                      })}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-foreground text-sm truncate">
                            {email.subject || "(No subject)"}
                          </div>
                          <div className="text-muted-foreground text-xs mt-0.5 truncate">
                            {email.from}
                          </div>
                        </div>
                        <a
                          href={getGmailUrl(email.threadId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0 p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-all"
                          title="Open in Gmail"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (toolName === "parse_syllabus" && data.success) {
    const syllabus = data.data as SyllabusData
    return (
      <div className="bg-accent/30 border-2 border-accent-foreground/20 rounded-2xl p-4 mt-3 shadow-soft">
        <div className="flex items-center gap-3 text-accent-foreground font-semibold mb-3">
          <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center">
            <FileText className="h-4 w-4" />
          </div>
          Parsed Syllabus
        </div>
        <div className="text-sm text-foreground pl-11 space-y-1">
          <div><span className="font-semibold">{syllabus.course.code}</span>: {syllabus.course.name}</div>
          <div className="text-muted-foreground">Instructor: {syllabus.course.instructor}</div>
          <div className="text-muted-foreground">{syllabus.schedule.length} class sessions, {syllabus.assignments.length} assignments</div>
        </div>
        {onFindEmails && (
          <Button
            variant="secondary"
            size="sm"
            className="mt-4 ml-11 rounded-full"
            onClick={() => onFindEmails(syllabus)}
          >
            <Search className="h-3.5 w-3.5 mr-2" />
            Find Related Emails
          </Button>
        )}
      </div>
    )
  }

  // For get_email_thread, don't show anything - the AI summarizes it in text
  if (toolName === "get_email_thread") {
    return null
  }

  // Default fallback - hide unknown tools to reduce clutter
  return null
}

export function ChatMessage({ message, onFindEmails, onEmailSelect }: ChatMessageProps) {
  const isUser = message.role === "user"

  return (
    <div className={cn("flex gap-4 p-6", isUser ? "bg-transparent" : "bg-card/50")}>
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-soft",
          isUser
            ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground"
            : "bg-secondary text-secondary-foreground"
        )}
      >
        {isUser ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <div className="prose dark:prose-invert max-w-none text-sm break-words leading-relaxed">
          {message.content}
        </div>
        {message.toolInvocations?.map((invocation, i) => (
          <div key={i}>
            {invocation.state === "result" && (
              <ToolResultCard
                toolName={invocation.toolName}
                result={invocation.result}
                onFindEmails={onFindEmails}
                onEmailSelect={onEmailSelect}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
