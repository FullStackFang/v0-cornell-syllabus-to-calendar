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

  const icons: Record<string, typeof Calendar> = {
    create_calendar_events: Calendar,
    search_emails: Mail,
    summarize_email_thread: Mail,
    parse_syllabus: FileText,
  }

  const Icon = icons[toolName] || FileText

  if (toolName === "create_calendar_events" && data.success) {
    return (
      <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3 mt-2">
        <div className="flex items-center gap-2 text-green-700 dark:text-green-300 font-medium">
          <Calendar className="h-4 w-4" />
          {data.message as string}
        </div>
        {(data.errors as string[])?.length > 0 && (
          <div className="text-sm text-red-600 dark:text-red-400 mt-1">
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
    return (
      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mt-2">
        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-medium mb-2">
          <Mail className="h-4 w-4" />
          Found {data.count as number} emails
        </div>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {emails.slice(0, 10).map((email, i) => (
            <div
              key={i}
              className="group bg-white dark:bg-gray-800 rounded-md p-3 border border-blue-100 dark:border-blue-900 hover:border-blue-300 dark:hover:border-blue-700 transition-colors cursor-pointer"
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
                  <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {email.subject || "(No subject)"}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400 text-xs mt-0.5">
                    {email.from}
                  </div>
                  <div className="text-gray-500 dark:text-gray-500 text-xs mt-1 line-clamp-2">
                    {email.snippet}
                  </div>
                </div>
                <a
                  href={getGmailUrl(email.threadId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0 p-1.5 rounded hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Open in Gmail"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          ))}
        </div>
        {emails.length > 10 && (
          <div className="text-xs text-blue-600 dark:text-blue-400 mt-2 text-center">
            Showing 10 of {emails.length} emails
          </div>
        )}
      </div>
    )
  }

  if (toolName === "parse_syllabus" && data.success) {
    const syllabus = data.data as SyllabusData
    return (
      <div className="bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-lg p-3 mt-2">
        <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-medium mb-2">
          <FileText className="h-4 w-4" />
          Parsed Syllabus
        </div>
        <div className="text-sm text-gray-700 dark:text-gray-300">
          <div><strong>{syllabus.course.code}</strong>: {syllabus.course.name}</div>
          <div>Instructor: {syllabus.course.instructor}</div>
          <div>{syllabus.schedule.length} class sessions · {syllabus.assignments.length} assignments</div>
        </div>
        {onFindEmails && (
          <Button
            variant="outline"
            size="sm"
            className="mt-3 gap-2"
            onClick={() => onFindEmails(syllabus)}
          >
            <Search className="h-3.5 w-3.5" />
            Find Related Emails
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 mt-2">
      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm">
        <Icon className="h-4 w-4" />
        Tool: {toolName}
      </div>
    </div>
  )
}

export function ChatMessage({ message, onFindEmails, onEmailSelect }: ChatMessageProps) {
  const isUser = message.role === "user"

  return (
    <div className={cn("flex gap-3 p-4", isUser ? "bg-transparent" : "bg-gray-50 dark:bg-gray-900")}>
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className="flex-1 space-y-2">
        <div className="prose dark:prose-invert max-w-none text-sm">
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
