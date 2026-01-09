"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  FileText, Mail, X, ExternalLink, Tag, Loader2, Upload,
  BookOpen, Hash, User, MailIcon, Clock, MapPin, Calendar,
  ChevronDown, ChevronRight, ChevronLeft, Trash2, Download, Check
} from "lucide-react"
import { FileUploadZone } from "@/components/file-upload-zone"
import { CalendarPreviewModal } from "@/components/calendar-preview-modal"
import type { EmailMessage, SyllabusData } from "@/types"

// Assignment type colors
const assignmentTypeColors: Record<string, { bg: string; text: string }> = {
  homework: { bg: "bg-blue-500/10", text: "text-blue-600" },
  project: { bg: "bg-green-500/10", text: "text-green-600" },
  exam: { bg: "bg-red-500/10", text: "text-red-600" },
  quiz: { bg: "bg-yellow-500/10", text: "text-yellow-600" },
  participation: { bg: "bg-purple-500/10", text: "text-purple-600" },
}

// Email category types and colors
export type EmailTag = "assignment" | "project" | "announcement" | "schedule" | "general"

const tagConfig: Record<EmailTag, { label: string; color: string; bgColor: string }> = {
  assignment: { label: "Assignment", color: "text-orange-700 dark:text-orange-300", bgColor: "bg-orange-100 dark:bg-orange-900/50" },
  project: { label: "Project", color: "text-purple-700 dark:text-purple-300", bgColor: "bg-purple-100 dark:bg-purple-900/50" },
  announcement: { label: "Announcement", color: "text-blue-700 dark:text-blue-300", bgColor: "bg-blue-100 dark:bg-blue-900/50" },
  schedule: { label: "Schedule", color: "text-green-700 dark:text-green-300", bgColor: "bg-green-100 dark:bg-green-900/50" },
  general: { label: "General", color: "text-gray-700 dark:text-gray-300", bgColor: "bg-gray-100 dark:bg-gray-800" },
}

// Auto-detect tag from email subject/content
function detectEmailTag(email: EmailMessage): EmailTag {
  const text = `${email.subject} ${email.snippet}`.toLowerCase()

  if (text.includes("assignment") || text.includes("homework") || text.includes("due date") || text.includes("submit")) {
    return "assignment"
  }
  if (text.includes("project") || text.includes("team") || text.includes("group work")) {
    return "project"
  }
  if (text.includes("schedule") || text.includes("class") || text.includes("session") || text.includes("meeting") || text.includes("calendar")) {
    return "schedule"
  }
  if (text.includes("announcement") || text.includes("important") || text.includes("update") || text.includes("reminder")) {
    return "announcement"
  }
  return "general"
}

// Gmail URL helper
const getGmailUrl = (threadId: string) =>
  `https://mail.google.com/mail/u/0/#inbox/${threadId}`

// Check if content appears to be HTML
function isHtmlContent(content: string): boolean {
  // Check for common HTML tags
  return /<(div|p|br|table|tr|td|span|a|img|html|body|head)[^>]*>/i.test(content)
}

// Clean email body - strip tracking URLs and clean up formatting
function cleanEmailBody(body: string): string {
  if (!body) return ""

  // Remove tracking URLs (common patterns)
  let cleaned = body
    .replace(/https?:\/\/link\.[^\s)]+/g, "") // Remove tracking links
    .replace(/\([^)]*https?:\/\/[^)]+\)/g, "") // Remove (url) patterns
    .replace(/\s*\(\s*\)/g, "") // Remove empty parentheses

  // Check if this is HTML content
  const isHtml = isHtmlContent(cleaned)

  if (isHtml) {
    // For HTML content, strip problematic elements but keep structure
    cleaned = cleaned
      .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "") // Remove head section
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "") // Remove style tags
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "") // Remove script tags
      .replace(/<!--[\s\S]*?-->/g, "") // Remove HTML comments
      .replace(/<meta[^>]*\/?>/gi, "") // Remove meta tags
      .replace(/<link[^>]*\/?>/gi, "") // Remove link tags
      .replace(/<\/?html[^>]*>/gi, "") // Remove html wrapper
      .replace(/<\/?body[^>]*>/gi, "") // Remove body wrapper
      .replace(/<img[^>]*>/gi, "") // Remove images (often tracking pixels)
      .replace(/style="[^"]*"/gi, "") // Remove inline styles
      .replace(/class="[^"]*"/gi, "") // Remove classes
      .replace(/<a[^>]*href="https?:\/\/link\.[^"]*"[^>]*>([^<]*)<\/a>/gi, "$1") // Remove tracking links but keep text
  } else {
    // For plain text content, convert to simple HTML
    // First escape any HTML entities
    cleaned = cleaned
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")

    // Convert newlines to <br> tags
    cleaned = cleaned
      .replace(/\r\n/g, "\n") // Normalize line endings
      .replace(/\n{3,}/g, "\n\n") // Reduce multiple newlines
      .replace(/\n/g, "<br>\n") // Convert newlines to <br>

    // Convert plain text URLs to links (but not tracking ones)
    cleaned = cleaned.replace(
      /(https?:\/\/(?!link\.)[^\s<]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline break-all">$1</a>'
    )
  }

  // Final cleanup
  cleaned = cleaned
    .replace(/(<br\s*\/?>\s*){3,}/gi, "<br><br>") // Reduce excessive breaks
    .replace(/^\s+|\s+$/g, "") // Trim

  return cleaned
}

interface EmailTagBadgeProps {
  tag: EmailTag
  onTagChange?: (tag: EmailTag) => void
}

function EmailTagBadge({ tag, onTagChange }: EmailTagBadgeProps) {
  const config = tagConfig[tag]
  const [showDropdown, setShowDropdown] = useState(false)

  if (!onTagChange) {
    return (
      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", config.color, config.bgColor)}>
        {config.label}
      </span>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={cn("text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 hover:opacity-80", config.color, config.bgColor)}
      >
        <Tag className="h-3 w-3" />
        {config.label}
      </button>
      {showDropdown && (
        <div className="absolute top-full left-0 mt-1 bg-background border border-border rounded-md shadow-lg z-10 py-1 min-w-[120px]">
          {(Object.keys(tagConfig) as EmailTag[]).map((t) => (
            <button
              key={t}
              onClick={() => { onTagChange(t); setShowDropdown(false) }}
              className={cn(
                "w-full text-left px-3 py-1.5 text-xs hover:bg-muted",
                t === tag && "bg-muted"
              )}
            >
              <span className={cn("inline-block w-2 h-2 rounded-full mr-2", tagConfig[t].bgColor)} />
              {tagConfig[t].label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface RightPanelProps {
  // Syllabus data
  syllabusData: SyllabusData | null
  onFileSelect: (file: File) => void
  isProcessing: boolean
  onAddToCalendar?: () => void
  isAddingToCalendar?: boolean
  eventsAdded?: boolean
  onFindRelatedEmails?: () => void
  isFindingEmails?: boolean

  // Email data
  emails: EmailMessage[]
  selectedEmail: EmailMessage | null
  isLoadingEmail: boolean
  onEmailSelect: (email: EmailMessage) => void
  onEmailClose: () => void

  // Tab control
  activeTab?: "syllabus" | "emails"
  onTabChange?: (tab: "syllabus" | "emails") => void
}

export function RightPanel({
  syllabusData,
  onFileSelect,
  isProcessing,
  onAddToCalendar,
  isAddingToCalendar,
  eventsAdded,
  onFindRelatedEmails,
  isFindingEmails,
  emails,
  selectedEmail,
  isLoadingEmail,
  onEmailSelect,
  onEmailClose,
  activeTab = "syllabus",
  onTabChange,
}: RightPanelProps) {
  const [internalTab, setInternalTab] = useState<"syllabus" | "emails">(activeTab)
  const [emailTags, setEmailTags] = useState<Record<string, EmailTag>>({})
  const [scheduleExpanded, setScheduleExpanded] = useState(true)
  const [assignmentsExpanded, setAssignmentsExpanded] = useState(true)
  const [showPreview, setShowPreview] = useState(false)

  const currentTab = onTabChange ? activeTab : internalTab
  const setTab = onTabChange || setInternalTab

  const getEmailTag = (email: EmailMessage): EmailTag => {
    return emailTags[email.id] || detectEmailTag(email)
  }

  const handleTagChange = (emailId: string, tag: EmailTag) => {
    setEmailTags(prev => ({ ...prev, [emailId]: tag }))
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Tab Header */}
      <div className="flex border-b border-border shrink-0">
        <button
          onClick={() => setTab("syllabus")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
            currentTab === "syllabus"
              ? "text-primary border-b-2 border-primary bg-primary/5"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <FileText className="h-4 w-4" />
          Syllabus
        </button>
        <button
          onClick={() => setTab("emails")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
            currentTab === "emails"
              ? "text-primary border-b-2 border-primary bg-primary/5"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <Mail className="h-4 w-4" />
          Emails
          {emails.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
              {emails.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {currentTab === "syllabus" && (
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {/* Upload Zone - compact */}
            <div className="p-3 border-b border-border">
              <FileUploadZone
                onFileSelect={onFileSelect}
                isProcessing={isProcessing}
              />
            </div>

            {syllabusData ? (
              <div className="flex flex-col h-full">
                {/* Course Info - Compact Card */}
                <div className="p-3 border-b border-border">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-muted flex items-center justify-center shrink-0">
                        <BookOpen className="w-3 h-3 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-muted-foreground">Course</p>
                        <p className="font-medium text-foreground truncate">{syllabusData.course.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-muted flex items-center justify-center shrink-0">
                        <Hash className="w-3 h-3 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-muted-foreground">Code</p>
                        <p className="font-medium text-foreground">{syllabusData.course.code}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-muted flex items-center justify-center shrink-0">
                        <User className="w-3 h-3 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-muted-foreground">Instructor</p>
                        <p className="font-medium text-foreground truncate">{syllabusData.course.instructor}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-muted flex items-center justify-center shrink-0">
                        <MailIcon className="w-3 h-3 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-muted-foreground">Email</p>
                        <p className="font-medium text-foreground truncate text-[10px]">{syllabusData.course.email || "N/A"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Bar - Side by side buttons */}
                <div className="p-3 border-b border-border bg-background">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => setShowPreview(true)}
                      disabled={isAddingToCalendar || eventsAdded}
                      size="sm"
                      variant={eventsAdded ? "outline" : "default"}
                    >
                      {eventsAdded ? (
                        <>
                          <Check className="w-4 h-4 mr-2 text-green-600" />
                          Events Added
                        </>
                      ) : isAddingToCalendar ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Calendar className="w-4 h-4 mr-2" />
                          Add {syllabusData.schedule.length + syllabusData.assignments.filter(a => a.dueDate).length} Events
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={onFindRelatedEmails}
                      disabled={isFindingEmails}
                      variant="outline"
                      size="sm"
                    >
                      {isFindingEmails ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Mail className="w-4 h-4 mr-2" />
                      )}
                      Find Emails
                    </Button>
                  </div>
                </div>

                {/* Schedule Section - Collapsible */}
                <div className="border-b border-border">
                  <button
                    onClick={() => setScheduleExpanded(!scheduleExpanded)}
                    className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-sm font-medium text-foreground">
                      Schedule ({syllabusData.schedule.length})
                    </span>
                    {scheduleExpanded ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                  {scheduleExpanded && (
                    <div className="max-h-48 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                      {syllabusData.schedule.map((session) => {
                        const date = new Date(session.date)
                        const day = date.getDate()
                        const month = date.toLocaleString("en-US", { month: "short" })
                        return (
                          <div
                            key={session.id}
                            className="flex items-start gap-3 px-3 py-2 hover:bg-muted/30 border-t border-border/50"
                          >
                            <div className="text-center w-10 shrink-0">
                              <p className="text-lg font-semibold text-foreground leading-none">{day}</p>
                              <p className="text-[10px] text-muted-foreground uppercase">{month}</p>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{session.topic}</p>
                              <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                                {session.time && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {session.time} ({session.duration_hours}h)
                                  </span>
                                )}
                                {session.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {session.location}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Assignments Section - Collapsible */}
                <div className="border-b border-border">
                  <button
                    onClick={() => setAssignmentsExpanded(!assignmentsExpanded)}
                    className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-sm font-medium text-foreground">
                      Assignments ({syllabusData.assignments.length})
                    </span>
                    {assignmentsExpanded ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                  {assignmentsExpanded && (
                    <div className="max-h-48 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                      {syllabusData.assignments.map((assignment) => {
                        const typeColor = assignmentTypeColors[assignment.type] || assignmentTypeColors.homework
                        return (
                          <div
                            key={assignment.id}
                            className="flex items-start gap-3 px-3 py-2 hover:bg-muted/30 border-t border-border/50"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-foreground truncate">{assignment.name}</p>
                                <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0", typeColor.bg, typeColor.text)}>
                                  {assignment.type}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                                {assignment.dueDate && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {assignment.dueDate}
                                  </span>
                                )}
                                <span>{assignment.weight}</span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center p-4">
                <FileText className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Drop a syllabus PDF above or paste text in the chat.
                </p>
              </div>
            )}
          </div>
        )}

        {currentTab === "emails" && (
          <div className="h-full flex flex-col">
            {/* Show email detail if selected, otherwise show list */}
            {selectedEmail ? (
              /* Email Detail - Full Width */
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header with back button */}
                <div className="flex items-start gap-3 p-3 border-b border-border shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={onEmailClose}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <EmailTagBadge tag={getEmailTag(selectedEmail)} />
                      <a
                        href={getGmailUrl(selectedEmail.threadId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary ml-auto"
                        title="Open in Gmail"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                    <h3 className="font-semibold text-foreground text-sm">
                      {selectedEmail.subject || "(No subject)"}
                    </h3>
                  </div>
                </div>

                {/* Metadata */}
                <div className="px-3 py-2 border-b border-border text-xs space-y-0.5 shrink-0 bg-muted/30">
                  <div className="text-muted-foreground">
                    <span className="font-medium">From:</span> {selectedEmail.from}
                  </div>
                  <div className="text-muted-foreground">
                    <span className="font-medium">Date:</span> {selectedEmail.date}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                  {isLoadingEmail ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : selectedEmail.body ? (
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: cleanEmailBody(selectedEmail.body) }}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">{selectedEmail.snippet}</p>
                  )}
                </div>
              </div>
            ) : (
              /* Email List - Full Width */
              <div className="flex-1 overflow-y-auto">
                {emails.length > 0 ? (
                  <div className="divide-y divide-border">
                    {emails.map((email) => {
                      const tag = getEmailTag(email)
                      return (
                        <div
                          key={email.id}
                          onClick={() => onEmailSelect(email)}
                          className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <EmailTagBadge
                              tag={tag}
                              onTagChange={(t) => handleTagChange(email.id, t)}
                            />
                            <a
                              href={getGmailUrl(email.threadId)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-muted-foreground hover:text-primary"
                              title="Open in Gmail"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </div>
                          <h4 className="font-medium text-sm text-foreground">
                            {email.subject || "(No subject)"}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {email.from}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {email.snippet}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-4">
                    <Mail className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h3 className="font-medium text-foreground mb-1">No Emails</h3>
                    <p className="text-sm text-muted-foreground">
                      Search for emails in the chat to see them here.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Calendar Preview Modal */}
      {syllabusData && (
        <CalendarPreviewModal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          onConfirm={() => {
            setShowPreview(false)
            onAddToCalendar?.()
          }}
          syllabusData={syllabusData}
          isCreating={isAddingToCalendar}
          mode="sync"
        />
      )}
    </div>
  )
}
