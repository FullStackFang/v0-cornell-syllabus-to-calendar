"use client"

import { useState, useRef } from "react"
import { useSession, signIn, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ChatInterface, ChatInterfaceHandle } from "@/components/chat-interface"
import {
  Calendar,
  Sparkles,
  User,
  LogOut,
  BookOpen,
  Mail,
  Zap,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Image from "next/image"
import { RightPanel } from "@/components/right-panel"
import type { SyllabusData, EmailMessage, CalendarEvent } from "@/types"

// Helper to calculate end time from start time and duration
function calculateEndTime(startTime: string, durationHours: number): string {
  const [hours, minutes] = startTime.split(":").map(Number)
  const endHours = hours + durationHours
  return `${String(endHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const chatRef = useRef<ChatInterfaceHandle>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [syllabusData, setSyllabusData] = useState<SyllabusData | null>(null)
  const [isAddingToCalendar, setIsAddingToCalendar] = useState(false)
  const [eventsAdded, setEventsAdded] = useState(false)
  const [isFindingEmails, setIsFindingEmails] = useState(false)

  // Right panel state
  const [rightPanelTab, setRightPanelTab] = useState<"syllabus" | "emails">("syllabus")

  // Emails list (accumulated from chat searches)
  const [emails, setEmails] = useState<EmailMessage[]>([])

  // Selected email state
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null)
  const [isLoadingEmail, setIsLoadingEmail] = useState(false)

  // Handle file upload - parse and show in right panel
  const handleFileSelect = async (file: File) => {
    setIsProcessing(true)

    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to process syllabus")
      }

      const data = await res.json()

      // Set syllabus data to show in right panel
      setSyllabusData(data.data)
      setRightPanelTab("syllabus")
    } catch (error) {
      console.error("Upload error:", error)
      alert(error instanceof Error ? error.message : "Failed to process syllabus. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle adding events to calendar
  const handleAddToCalendar = async () => {
    if (!syllabusData) return

    setIsAddingToCalendar(true)

    try {
      // Convert syllabusData to CalendarEvent array
      const events: CalendarEvent[] = []
      const courseName = syllabusData.course.code

      // Add class sessions
      for (const session of syllabusData.schedule) {
        events.push({
          title: `${courseName}: ${session.topic}`,
          description: `Class session for ${syllabusData.course.name}`,
          startDate: session.date,
          startTime: session.time,
          endDate: session.date,
          endTime: calculateEndTime(session.time, session.duration_hours),
          location: session.location,
        })
      }

      // Add assignment due dates
      for (const assignment of syllabusData.assignments) {
        if (assignment.dueDate) {
          events.push({
            title: `${courseName}: ${assignment.name} Due`,
            description: `${assignment.type} - ${assignment.weight}`,
            startDate: assignment.dueDate,
            startTime: "23:59",
          })
        }
      }

      const res = await fetch("/api/calendar/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events }),
      })

      if (!res.ok) {
        throw new Error("Failed to create calendar events")
      }

      setEventsAdded(true)
    } catch (error) {
      console.error("Calendar sync error:", error)
    } finally {
      setIsAddingToCalendar(false)
    }
  }

  // Find related emails using syllabus data - sends a chat message
  const handleFindRelatedEmails = async () => {
    if (!syllabusData || !chatRef.current) return

    setIsFindingEmails(true)
    try {
      const { course, assignments } = syllabusData

      // Build search terms from syllabus
      const searchTerms: string[] = []
      if (course.code) searchTerms.push(course.code)
      if (course.name) searchTerms.push(`"${course.name}"`)
      if (course.instructor) searchTerms.push(course.instructor.split(' ').pop() || '') // Last name

      // Add some assignment names for better matching
      const assignmentNames = assignments.slice(0, 3).map(a => a.name).filter(Boolean)

      const message = `Search my Gmail for emails related to this course:
- Course: ${course.code} - ${course.name}
- Instructor: ${course.instructor || 'Unknown'}
- Key assignments: ${assignmentNames.join(', ') || 'None listed'}

Try searching for: ${searchTerms.join(' OR ')}

Group results by urgency - what's due today or soon first, then recent items, then older ones.`

      await chatRef.current.sendMessage(message)
    } finally {
      setIsFindingEmails(false)
    }
  }

  // Store syllabus when parsed
  const handleSyllabusData = (syllabus: SyllabusData) => {
    setSyllabusData(syllabus)
    setRightPanelTab("syllabus")
  }

  // Handle email selection from chat results - adds to email list and selects
  const handleEmailSelect = async (email: EmailMessage) => {
    // Add to emails list if not already there
    setEmails(prev => {
      const exists = prev.some(e => e.id === email.id)
      if (exists) return prev
      return [email, ...prev]
    })

    // Switch to emails tab
    setRightPanelTab("emails")

    // Set as selected and fetch full content
    setSelectedEmail(email)
    setIsLoadingEmail(true)

    try {
      const res = await fetch("/api/email/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: email.id }),
      })

      if (!res.ok) {
        throw new Error("Failed to fetch email")
      }

      const data = await res.json()

      // Update the email in the list with full content
      setEmails(prev => prev.map(e => e.id === email.id ? data.email : e))
      setSelectedEmail(data.email)
    } catch (error) {
      console.error("Email fetch error:", error)
      // Keep the email with just the snippet
    } finally {
      setIsLoadingEmail(false)
    }
  }

  // Handle selecting an email from the right panel list
  const handleEmailSelectFromPanel = async (email: EmailMessage) => {
    setSelectedEmail(email)

    // If we don't have full body, fetch it
    if (!email.body) {
      setIsLoadingEmail(true)
      try {
        const res = await fetch("/api/email/content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId: email.id }),
        })

        if (res.ok) {
          const data = await res.json()
          setEmails(prev => prev.map(e => e.id === email.id ? data.email : e))
          setSelectedEmail(data.email)
        }
      } catch (error) {
        console.error("Email fetch error:", error)
      } finally {
        setIsLoadingEmail(false)
      }
    }
  }

  const handleCloseSelectedEmail = () => {
    setSelectedEmail(null)
  }

  // Loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-warm flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center animate-pulse-soft">
            <Calendar className="w-6 h-6 text-primary" />
          </div>
          <p className="text-muted-foreground font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  // Not signed in - show landing page
  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-warm flex flex-col relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute top-1/2 -left-32 w-80 h-80 rounded-full bg-accent/10 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full bg-secondary/20 blur-3xl" />
        </div>

        <header className="border-b border-border/50 backdrop-blur-sm bg-background/60 shrink-0 relative z-10">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-soft">
                <Calendar className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-lg text-foreground tracking-tight">Syllabus Agent</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full px-5 hover-lift"
              onClick={() => signIn("google")}
            >
              Sign In
            </Button>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 relative z-10">
          <div className="max-w-2xl text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-secondary-foreground/10 text-secondary-foreground text-sm font-medium mb-8 animate-fade-in-up">
              <Sparkles className="w-4 h-4" />
              <span>AI-Powered for Cornell EMBA</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-semibold tracking-tight text-foreground leading-[1.1] mb-6 animate-fade-in-up stagger-1">
              Turn your syllabi into{" "}
              <span className="text-gradient">calendar events</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed mb-10 animate-fade-in-up stagger-2">
              Upload a PDF, chat with an AI agent, search your emails, and sync
              everything to Google Calendar in seconds.
            </p>

            {/* CTA Button */}
            <div className="animate-fade-in-up stagger-3">
              <Button
                size="lg"
                className="h-14 px-8 text-base rounded-full shadow-elevated hover-lift font-medium"
                onClick={() => signIn("google")}
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </Button>
            </div>

            {/* Feature pills */}
            <div className="flex flex-wrap items-center justify-center gap-3 mt-12 animate-fade-in-up stagger-4">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border text-sm text-muted-foreground">
                <BookOpen className="w-4 h-4 text-primary" />
                <span>PDF Parsing</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border text-sm text-muted-foreground">
                <Mail className="w-4 h-4 text-primary" />
                <span>Email Search</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border text-sm text-muted-foreground">
                <Calendar className="w-4 h-4 text-primary" />
                <span>Calendar Sync</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border text-sm text-muted-foreground">
                <Zap className="w-4 h-4 text-primary" />
                <span>AI Assistant</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Signed in - show main app with upload + chat
  return (
    <div className="h-screen flex flex-col bg-gradient-warm">
      {/* Header */}
      <header className="shrink-0 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-soft group-hover:shadow-elevated transition-shadow">
              <Calendar className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg text-foreground tracking-tight">Syllabus Agent</span>
          </a>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 rounded-full px-3 hover:bg-muted">
                {session.user?.image ? (
                  <Image
                    src={session.user.image}
                    alt={session.user.name || "User"}
                    width={32}
                    height={32}
                    className="rounded-full ring-2 ring-border"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                )}
                <span className="hidden sm:inline font-medium">{session.user?.name || "User"}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => signOut()} className="text-destructive focus:text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Panel - Chat */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <ChatInterface ref={chatRef} onEmailSelect={handleEmailSelect} onSyllabusData={handleSyllabusData} syllabusData={syllabusData} />
        </div>

        {/* Right Panel - Always visible tabbed panel */}
        <div className="w-[420px] border-l border-border/50 bg-card/50 backdrop-blur-sm shrink-0 overflow-hidden">
          <RightPanel
            syllabusData={syllabusData}
            onFileSelect={handleFileSelect}
            isProcessing={isProcessing}
            onAddToCalendar={handleAddToCalendar}
            isAddingToCalendar={isAddingToCalendar}
            eventsAdded={eventsAdded}
            onFindRelatedEmails={handleFindRelatedEmails}
            isFindingEmails={isFindingEmails}
            emails={emails}
            selectedEmail={selectedEmail}
            isLoadingEmail={isLoadingEmail}
            onEmailSelect={handleEmailSelectFromPanel}
            onEmailClose={handleCloseSelectedEmail}
            activeTab={rightPanelTab}
            onTabChange={setRightPanelTab}
          />
        </div>
      </main>
    </div>
  )
}
