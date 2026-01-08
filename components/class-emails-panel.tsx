"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { EmailPanel, type EmailData } from "@/components/email-panel"
import {
  Mail,
  FileText,
  Bell,
  CalendarX,
  Inbox,
  ChevronDown,
  ChevronRight,
  Loader2,
  X,
  RefreshCw,
  ArrowLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { GroupedEmails, EmailCategory, CategorizedEmail } from "@/types"

interface ClassEmailsPanelProps {
  groupedEmails: GroupedEmails | null
  isLoading: boolean
  error: string | null
  onRefresh: () => void
  onClose: () => void
  courseName: string
}

const CATEGORY_CONFIG: Record<
  EmailCategory,
  {
    label: string
    icon: typeof Mail
    bgColor: string
    textColor: string
    borderColor: string
  }
> = {
  assignments: {
    label: "Assignments",
    icon: FileText,
    bgColor: "bg-blue-50 dark:bg-blue-950",
    textColor: "text-blue-700 dark:text-blue-300",
    borderColor: "border-blue-200 dark:border-blue-800",
  },
  announcements: {
    label: "Announcements",
    icon: Bell,
    bgColor: "bg-amber-50 dark:bg-amber-950",
    textColor: "text-amber-700 dark:text-amber-300",
    borderColor: "border-amber-200 dark:border-amber-800",
  },
  schedule_changes: {
    label: "Schedule Changes",
    icon: CalendarX,
    bgColor: "bg-red-50 dark:bg-red-950",
    textColor: "text-red-700 dark:text-red-300",
    borderColor: "border-red-200 dark:border-red-800",
  },
  general: {
    label: "General",
    icon: Inbox,
    bgColor: "bg-gray-50 dark:bg-gray-900",
    textColor: "text-gray-700 dark:text-gray-300",
    borderColor: "border-gray-200 dark:border-gray-700",
  },
}

export function ClassEmailsPanel({
  groupedEmails,
  isLoading,
  error,
  onRefresh,
  onClose,
  courseName,
}: ClassEmailsPanelProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<EmailCategory>>(
    new Set(["assignments", "announcements", "schedule_changes", "general"])
  )
  const [selectedEmail, setSelectedEmail] = useState<EmailData | null>(null)

  const toggleCategory = (category: EmailCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  // If an email is selected, show the EmailPanel detail view
  if (selectedEmail) {
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="p-3 border-b border-border flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedEmail(null)}
            className="gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to list
          </Button>
        </div>
        <div className="flex-1 overflow-hidden">
          <EmailPanel email={selectedEmail} onClose={() => setSelectedEmail(null)} />
        </div>
      </div>
    )
  }

  const totalCount = groupedEmails
    ? Object.values(groupedEmails).reduce((sum, cat) => sum + cat.length, 0)
    : 0

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border shrink-0">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">Course Emails</h3>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{courseName}</p>
            {groupedEmails && (
              <p className="text-xs text-muted-foreground">{totalCount} emails found</p>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onRefresh}
              disabled={isLoading}
              title="Refresh emails"
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onClose}
              title="Close panel"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-2">Searching emails...</p>
          </div>
        )}

        {error && (
          <div className="p-4 text-sm text-red-600 dark:text-red-400">{error}</div>
        )}

        {!isLoading && !error && groupedEmails && (
          <div className="divide-y divide-border">
            {(Object.keys(CATEGORY_CONFIG) as EmailCategory[]).map((category) => {
              const config = CATEGORY_CONFIG[category]
              const emails = groupedEmails[category]
              const isExpanded = expandedCategories.has(category)
              const Icon = config.icon

              return (
                <div key={category}>
                  <button
                    onClick={() => toggleCategory(category)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 transition-colors",
                      "hover:bg-muted/50",
                      config.bgColor
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={cn("h-4 w-4", config.textColor)} />
                      <span className={cn("font-medium text-sm", config.textColor)}>
                        {config.label}
                      </span>
                      <span className="text-xs text-muted-foreground bg-background/50 px-1.5 py-0.5 rounded">
                        {emails.length}
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="divide-y divide-border/50">
                      {emails.length === 0 ? (
                        <p className="p-3 text-xs text-muted-foreground italic">
                          No emails in this category
                        </p>
                      ) : (
                        emails.map(({ email, matchedKeywords }) => (
                          <EmailListItem
                            key={email.id}
                            email={email}
                            matchedKeywords={matchedKeywords}
                            onClick={() => setSelectedEmail(email)}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {!isLoading && !error && !groupedEmails && (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <Mail className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Click the refresh button to search for course-related emails
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

interface EmailListItemProps {
  email: EmailData
  matchedKeywords: string[]
  onClick: () => void
}

function EmailListItem({ email, matchedKeywords, onClick }: EmailListItemProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 hover:bg-muted/50 transition-colors"
    >
      <div className="text-sm font-medium text-foreground line-clamp-1">
        {email.subject || "(No subject)"}
      </div>
      <div className="text-xs text-muted-foreground truncate mt-0.5">{email.from}</div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-muted-foreground">
          {new Date(email.date).toLocaleDateString()}
        </span>
        {matchedKeywords.length > 0 && (
          <span className="text-xs text-blue-600 dark:text-blue-400 truncate max-w-[120px]">
            {matchedKeywords[0]}
          </span>
        )}
      </div>
    </button>
  )
}
