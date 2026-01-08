"use client"

import { Button } from "@/components/ui/button"
import { X, Calendar, User, Mail, ExternalLink } from "lucide-react"
import type { EmailMessage } from "@/types"

// Construct Gmail URL from threadId
const getGmailUrl = (threadId: string) =>
  `https://mail.google.com/mail/u/0/#inbox/${threadId}`

// Re-export EmailMessage as EmailData for backwards compatibility
export type EmailData = EmailMessage

interface EmailPanelProps {
  email: EmailData
  onClose: () => void
}

export function EmailPanel({ email, onClose }: EmailPanelProps) {
  const formattedDate = new Date(email.date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-border">
        <div className="flex-1 min-w-0 pr-4">
          <h3 className="font-semibold text-foreground line-clamp-2">
            {email.subject || "(No subject)"}
          </h3>
        </div>
        <div className="flex gap-2 shrink-0">
          {email.threadId && (
            <Button variant="outline" size="sm" asChild>
              <a
                href={getGmailUrl(email.threadId)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Open in Gmail
              </a>
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Metadata */}
      <div className="p-4 border-b border-border space-y-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <User className="h-4 w-4 shrink-0" />
          <span className="truncate">{email.from}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4 shrink-0" />
          <span>{formattedDate}</span>
        </div>
        {email.threadId && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-4 w-4 shrink-0" />
            <span className="text-xs font-mono">Thread: {email.threadId.slice(0, 8)}...</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {email.body ? (
          <div
            className="prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: email.body }}
          />
        ) : email.snippet ? (
          <div className="text-sm text-muted-foreground">
            <p className="italic mb-2">Preview:</p>
            <p>{email.snippet}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">No content available</p>
        )}
      </div>
    </div>
  )
}
