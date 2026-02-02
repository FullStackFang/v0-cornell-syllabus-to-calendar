"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  FileText, Mail, X, ExternalLink, Tag, Loader2, Upload,
  BookOpen, Hash, User, MailIcon, Clock, MapPin, Calendar,
  ChevronDown, ChevronRight, ChevronLeft, Check
} from "lucide-react"
import { FileUploadZone } from "@/components/file-upload-zone"
import { CalendarPreviewModal } from "@/components/calendar-preview-modal"
import type { EmailMessage, SyllabusData } from "@/types"

// Assignment type colors - warm, cohesive palette
const assignmentTypeColors: Record<string, { bg: string; text: string }> = {
  homework: { bg: "bg-sky-100 dark:bg-sky-900/50", text: "text-sky-700 dark:text-sky-300" },
  project: { bg: "bg-emerald-100 dark:bg-emerald-900/50", text: "text-emerald-700 dark:text-emerald-300" },
  exam: { bg: "bg-rose-100 dark:bg-rose-900/50", text: "text-rose-700 dark:text-rose-300" },
  quiz: { bg: "bg-amber-100 dark:bg-amber-900/50", text: "text-amber-700 dark:text-amber-300" },
  participation: { bg: "bg-violet-100 dark:bg-violet-900/50", text: "text-violet-700 dark:text-violet-300" },
}

// Email category types and colors
export type EmailTag = "assignment" | "project" | "announcement" | "schedule" | "general"

const tagConfig: Record<EmailTag, { label: string; color: string; bgColor: string }> = {
  assignment: { label: "Assignment", color: "text-amber-700 dark:text-amber-300", bgColor: "bg-amber-100 dark:bg-amber-900/50" },
  project: { label: "Project", color: "text-violet-700 dark:text-violet-300", bgColor: "bg-violet-100 dark:bg-violet-900/50" },
  announcement: { label: "Announcement", color: "text-sky-700 dark:text-sky-300", bgColor: "bg-sky-100 dark:bg-sky-900/50" },
  schedule: { label: "Schedule", color: "text-emerald-700 dark:text-emerald-300", bgColor: "bg-emerald-100 dark:bg-emerald-900/50" },
  general: { label: "General", color: "text-stone-700 dark:text-stone-300", bgColor: "bg-stone-100 dark:bg-stone-800" },
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
  return /<(div|p|br|table|tr|td|span|a|img|html|body|head)[^>]*>/i.test(content)
}

// Clean email body - strip tracking URLs and clean up formatting
function cleanEmailBody(body: string): string {
  if (!body) return ""

  let cleaned = body
    .replace(/https?:\/\/link\.[^\s)]+/g, "")
    .replace(/\([^)]*https?:\/\/[^)]+\)/g, "")
    .replace(/\s*\(\s*\)/g, "")

  const isHtml = isHtmlContent(cleaned)

  if (isHtml) {
    cleaned = cleaned
      .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<meta[^>]*\/?>/gi, "")
      .replace(/<link[^>]*\/?>/gi, "")
      .replace(/<\/?html[^>]*>/gi, "")
      .replace(/<\/?body[^>]*>/gi, "")
      .replace(/<img[^>]*>/gi, "")
      .replace(/style="[^"]*"/gi, "")
      .replace(/class="[^"]*"/gi, "")
      .replace(/<a[^>]*href="https?:\/\/link\.[^"]*"[^>]*>([^<]*)<\/a>/gi, "$1")
  } else {
    cleaned = cleaned
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/\n/g, "<br>\n")
    cleaned = cleaned.replace(
      /(https?:\/\/(?!link\.)[^\s<]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline break-all">$1</a>'
    )
  }

  cleaned = cleaned
    .replace(/(<br\s*\/?>\s*){3,}/gi, "<br><br>")
    .replace(/^\s+|\s+$/g, "")

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
      <span className={cn("text-xs px-3 py-1 rounded-full font-semibold", config.color, config.bgColor)}>
        {config.label}
      </span>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={cn("text-xs px-3 py-1 rounded-full font-semibold flex items-center gap-1.5 hover:opacity-80 transition-opacity", config.color, config.bgColor)}
      >
        <Tag className="h-3 w-3" />
        {config.label}
      </button>
      {showDropdown && (
        <div className="absolute top-full left-0 mt-2 bg-popover border-2 border-border rounded-xl shadow-elevated z-10 py-2 min-w-[140px] animate-scale-in">
          {(Object.keys(tagConfig) as EmailTag[]).map((t) => (
            <button
              key={t}
              onClick={() => { onTagChange(t); setShowDropdown(false) }}
              className={cn(
                "w-full text-left px-4 py-2 text-xs font-medium hover:bg-muted transition-colors",
                t === tag && "bg-muted"
              )}
            >
              <span className={cn("inline-block w-2.5 h-2.5 rounded-full mr-2", tagConfig[t].bgColor)} />
              {tagConfig[t].label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface RightPanelProps {
  syllabusData: SyllabusData | null
  onFileSelect: (file: File) => void
  isProcessing: boolean
  onAddToCalendar?: () => void
  isAddingToCalendar?: boolean
  eventsAdded?: boolean
  onFindRelatedEmails?: () => void
  isFindingEmails?: boolean
  emails: EmailMessage[]
  selectedEmail: EmailMessage | null
  isLoadingEmail: boolean
  onEmailSelect: (email: EmailMessage) => void
  onEmailClose: () => void
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
    <div className="flex flex-col h-full bg-card/30 backdrop-blur-sm">
      {/* Tab Header */}
      <div className="flex border-b border-border/50 shrink-0 bg-background/50">
        <button
          onClick={() => setTab("syllabus")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-semibold transition-all",
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
            "flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-semibold transition-all",
            currentTab === "emails"
              ? "text-primary border-b-2 border-primary bg-primary/5"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <Mail className="h-4 w-4" />
          Emails
          {emails.length > 0 && (
            <span className="ml-1 px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full font-bold">
              {emails.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {currentTab === "syllabus" && (
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {/* Upload Zone */}
            <div className="p-4 border-b border-border/50">
              <FileUploadZone
                onFileSelect={onFileSelect}
                isProcessing={isProcessing}
              />
            </div>

            {syllabusData ? (
              <div className="flex flex-col h-full">
                {/* Course Info Card */}
                <div className="p-4 border-b border-border/50">
                  <div className="bg-secondary/50 rounded-2xl p-4">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <BookOpen className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-muted-foreground font-medium">Course</p>
                          <p className="font-semibold text-foreground truncate">{syllabusData.course.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Hash className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-muted-foreground font-medium">Code</p>
                          <p className="font-semibold text-foreground">{syllabusData.course.code}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-muted-foreground font-medium">Instructor</p>
                          <p className="font-semibold text-foreground truncate">{syllabusData.course.instructor}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <MailIcon className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-muted-foreground font-medium">Email</p>
                          <p className="font-semibold text-foreground truncate text-[10px]">{syllabusData.course.email || "N/A"}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="p-4 border-b border-border/50">
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={() => setShowPreview(true)}
                      disabled={isAddingToCalendar || eventsAdded}
                      size="sm"
                      variant={eventsAdded ? "secondary" : "default"}
                      className="rounded-xl"
                    >
                      {eventsAdded ? (
                        <>
                          <Check className="w-4 h-4 mr-2 text-emerald-600" />
                          Added
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
                      className="rounded-xl"
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

                {/* Schedule Section */}
                <div className="border-b border-border/50">
                  <button
                    onClick={() => setScheduleExpanded(!scheduleExpanded)}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                  >
                    <span className="text-sm font-semibold text-foreground">
                      Schedule ({syllabusData.schedule.length})
                    </span>
                    {scheduleExpanded ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                  {scheduleExpanded && (
                    <div className="max-h-52 overflow-y-auto scrollbar-thin">
                      {syllabusData.schedule.map((session, index) => {
                        const date = new Date(session.date)
                        const day = date.getDate()
                        const month = date.toLocaleString("en-US", { month: "short" })
                        return (
                          <div
                            key={session.id}
                            className={cn(
                              "flex items-start gap-4 px-4 py-3 hover:bg-muted/30 transition-colors animate-fade-in-up",
                              index > 0 && "border-t border-border/30"
                            )}
                            style={{ animationDelay: `${index * 30}ms` }}
                          >
                            <div className="text-center w-12 shrink-0 bg-secondary rounded-xl py-2">
                              <p className="text-lg font-bold text-foreground leading-none">{day}</p>
                              <p className="text-[10px] text-muted-foreground uppercase font-semibold">{month}</p>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">{session.topic}</p>
                              <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1">
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

                {/* Assignments Section */}
                <div className="border-b border-border/50">
                  <button
                    onClick={() => setAssignmentsExpanded(!assignmentsExpanded)}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                  >
                    <span className="text-sm font-semibold text-foreground">
                      Assignments ({syllabusData.assignments.length})
                    </span>
                    {assignmentsExpanded ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                  {assignmentsExpanded && (
                    <div className="max-h-52 overflow-y-auto scrollbar-thin">
                      {syllabusData.assignments.map((assignment, index) => {
                        const typeColor = assignmentTypeColors[assignment.type] || assignmentTypeColors.homework
                        return (
                          <div
                            key={assignment.id}
                            className={cn(
                              "flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors animate-fade-in-up",
                              index > 0 && "border-t border-border/30"
                            )}
                            style={{ animationDelay: `${index * 30}ms` }}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-foreground truncate">{assignment.name}</p>
                                <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0", typeColor.bg, typeColor.text)}>
                                  {assignment.type}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1">
                                {assignment.dueDate && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {assignment.dueDate}
                                  </span>
                                )}
                                <span className="font-medium">{assignment.weight}</span>
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
              <div className="flex flex-col items-center justify-center h-64 text-center p-6">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">
                  Drop a syllabus PDF above or paste text in the chat.
                </p>
              </div>
            )}
          </div>
        )}

        {currentTab === "emails" && (
          <div className="h-full flex flex-col">
            {selectedEmail ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header with back button */}
                <div className="flex items-start gap-3 p-4 border-b border-border/50 shrink-0 bg-background/50">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0 rounded-lg"
                    onClick={onEmailClose}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <EmailTagBadge tag={getEmailTag(selectedEmail)} />
                      <a
                        href={getGmailUrl(selectedEmail.threadId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary ml-auto p-1.5 rounded-lg hover:bg-muted transition-colors"
                        title="Open in Gmail"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                    <h3 className="font-semibold text-foreground text-sm leading-tight">
                      {selectedEmail.subject || "(No subject)"}
                    </h3>
                  </div>
                </div>

                {/* Metadata */}
                <div className="px-4 py-3 border-b border-border/50 text-xs space-y-1 shrink-0 bg-secondary/30">
                  <div className="text-muted-foreground">
                    <span className="font-semibold text-foreground">From:</span> {selectedEmail.from}
                  </div>
                  <div className="text-muted-foreground">
                    <span className="font-semibold text-foreground">Date:</span> {selectedEmail.date}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
                  {isLoadingEmail ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
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
              <div className="flex-1 overflow-y-auto scrollbar-thin">
                {emails.length > 0 ? (
                  <div className="divide-y divide-border/50">
                    {emails.map((email, index) => {
                      const tag = getEmailTag(email)
                      return (
                        <div
                          key={email.id}
                          onClick={() => onEmailSelect(email)}
                          className="p-4 cursor-pointer hover:bg-muted/30 transition-all animate-fade-in-up"
                          style={{ animationDelay: `${index * 30}ms` }}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <EmailTagBadge
                              tag={tag}
                              onTagChange={(t) => handleTagChange(email.id, t)}
                            />
                            <a
                              href={getGmailUrl(email.threadId)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-muted-foreground hover:text-primary p-1 rounded-lg hover:bg-muted transition-colors"
                              title="Open in Gmail"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </div>
                          <h4 className="font-semibold text-sm text-foreground leading-tight">
                            {email.subject || "(No subject)"}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            {email.from}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-2">
                            {email.snippet}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6">
                    <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                      <Mail className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">No Emails</h3>
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
