"use client"

import { useState, useRef, useEffect } from "react"
import { useAuth } from "@/components/providers"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChatInterface, ChatInterfaceHandle } from "@/components/chat-interface"
import {
  Calendar,
  Sparkles,
  User,
  LogOut,
  BookOpen,
  Mail,
  Zap,
  Settings,
  Loader2,
  CheckCircle,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RightPanel } from "@/components/right-panel"
import type { SyllabusData, EmailMessage, CalendarEvent, CourseFlowCourse } from "@/types"

// Course match info from upload API
interface CourseMatch {
  status: "existing" | "new"
  course?: CourseFlowCourse
  suggestedCourse?: {
    name: string
    course_code: string
    semester: string
  }
  similarCourses?: Array<{ id: string; name: string; course_code: string; semester: string }>
}

// Helper to calculate end time from start time and duration
function calculateEndTime(startTime: string, durationHours: number): string {
  const [hours, minutes] = startTime.split(":").map(Number)
  const endHours = hours + durationHours
  return `${String(endHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

export default function HomePage() {
  const { user, isLoading, signOut } = useAuth()
  const router = useRouter()
  const chatRef = useRef<ChatInterfaceHandle>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [syllabusData, setSyllabusData] = useState<SyllabusData | null>(null)
  const [isAddingToCalendar, setIsAddingToCalendar] = useState(false)
  const [eventsAdded, setEventsAdded] = useState(false)
  const [isFindingEmails, setIsFindingEmails] = useState(false)

  // Course creation from syllabus
  const [courseMatch, setCourseMatch] = useState<CourseMatch | null>(null)
  const [uploadedFileInfo, setUploadedFileInfo] = useState<{ filename: string; fileHash: string } | null>(null)
  const [showCourseDialog, setShowCourseDialog] = useState(false)
  const [isCreatingCourse, setIsCreatingCourse] = useState(false)

  // Magic link form state
  const [email, setEmail] = useState("")
  const [isSendingMagicLink, setIsSendingMagicLink] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [magicLinkError, setMagicLinkError] = useState<string | null>(null)
  const [cooldownSeconds, setCooldownSeconds] = useState(0)

  // Cooldown timer effect
  useEffect(() => {
    // Check localStorage for existing cooldown
    const storedCooldownEnd = localStorage.getItem("magicLinkCooldownEnd")
    if (storedCooldownEnd) {
      const remaining = Math.ceil((parseInt(storedCooldownEnd) - Date.now()) / 1000)
      if (remaining > 0) {
        setCooldownSeconds(remaining)
      } else {
        localStorage.removeItem("magicLinkCooldownEnd")
      }
    }
  }, [])

  // Countdown timer
  useEffect(() => {
    if (cooldownSeconds <= 0) return

    const timer = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          localStorage.removeItem("magicLinkCooldownEnd")
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [cooldownSeconds])

  // Right panel state
  const [rightPanelTab, setRightPanelTab] = useState<"syllabus" | "emails">("syllabus")

  // Emails list (accumulated from chat searches)
  const [emails, setEmails] = useState<EmailMessage[]>([])

  // Selected email state
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null)
  const [isLoadingEmail, setIsLoadingEmail] = useState(false)

  // Start cooldown timer (60 seconds for Supabase rate limit)
  const startCooldown = (seconds: number = 60) => {
    const cooldownEnd = Date.now() + seconds * 1000
    localStorage.setItem("magicLinkCooldownEnd", cooldownEnd.toString())
    setCooldownSeconds(seconds)
  }

  // Handle magic link sign in - use client-side Supabase for proper PKCE handling
  const handleMagicLinkSignIn = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      setMagicLinkError("Please enter your email address")
      return
    }

    if (cooldownSeconds > 0) {
      setMagicLinkError(`Please wait ${cooldownSeconds} seconds before requesting another link`)
      return
    }

    setIsSendingMagicLink(true)
    setMagicLinkError(null)

    try {
      // Import and use client-side Supabase directly for proper PKCE storage
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        // If rate limited, start cooldown
        if (error.message?.toLowerCase().includes("rate") || error.status === 429) {
          startCooldown(60)
        }
        throw new Error(error.message || "Failed to send magic link")
      }

      // Success - start cooldown and show success
      startCooldown(60)
      setMagicLinkSent(true)
    } catch (error) {
      setMagicLinkError(error instanceof Error ? error.message : "Failed to send magic link")
    } finally {
      setIsSendingMagicLink(false)
    }
  }

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

      // Handle duplicate file
      if (data.duplicate) {
        alert(`This file has already been uploaded${data.existingMaterial?.course ? ` to ${data.existingMaterial.course.name}` : ""}.`)
        return
      }

      // Set syllabus data to show in right panel
      setSyllabusData(data.data)
      setRightPanelTab("syllabus")

      // Store file info and course match for potential course creation
      if (data.fileHash && data.filename) {
        setUploadedFileInfo({ filename: data.filename, fileHash: data.fileHash })
      }
      if (data.courseMatch) {
        setCourseMatch(data.courseMatch)
        // Show course creation dialog if it's a new course
        if (data.courseMatch.status === "new") {
          setShowCourseDialog(true)
        }
      }
    } catch (error) {
      console.error("Upload error:", error)
      alert(error instanceof Error ? error.message : "Failed to process syllabus. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  // Create course from syllabus
  const handleCreateCourseFromSyllabus = async () => {
    if (!courseMatch?.suggestedCourse || !uploadedFileInfo || !syllabusData) return

    setIsCreatingCourse(true)
    try {
      const res = await fetch("/api/courses/from-syllabus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: courseMatch.suggestedCourse.name,
          course_code: courseMatch.suggestedCourse.course_code,
          semester: courseMatch.suggestedCourse.semester,
          filename: uploadedFileInfo.filename,
          fileHash: uploadedFileInfo.fileHash,
          extractedText: JSON.stringify(syllabusData), // Store parsed data as text for now
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to create course")
      }

      const data = await res.json()

      // Update course match to show it's now an existing course
      setCourseMatch({
        status: "existing",
        course: data.course,
      })
      setShowCourseDialog(false)

      // Optional: redirect to course page
      // router.push(`/courses/${data.course.id}`)
    } catch (error) {
      console.error("Create course error:", error)
      alert(error instanceof Error ? error.message : "Failed to create course")
    } finally {
      setIsCreatingCourse(false)
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

  const handleSignOut = async () => {
    await signOut()
    router.push("/")
  }

  // Loading state
  if (isLoading) {
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

  // Not signed in - show landing page with magic link form
  if (!user) {
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

            {/* Magic Link Form */}
            <div className="animate-fade-in-up stagger-3 max-w-md mx-auto">
              {magicLinkSent ? (
                <div className="bg-card border border-border rounded-2xl p-8 shadow-soft">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </div>
                    <h2 className="text-xl font-semibold">Check your email</h2>
                    <p className="text-muted-foreground text-center">
                      We sent a magic link to <span className="font-medium text-foreground">{email}</span>.
                      Click the link in the email to sign in.
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setMagicLinkSent(false)
                        setEmail("")
                      }}
                      disabled={cooldownSeconds > 0}
                    >
                      {cooldownSeconds > 0
                        ? `Resend available in ${cooldownSeconds}s`
                        : "Use a different email"}
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleMagicLinkSignIn} className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-14 px-5 text-base rounded-full flex-1"
                      disabled={isSendingMagicLink}
                    />
                    <Button
                      type="submit"
                      size="lg"
                      className="h-14 px-8 text-base rounded-full shadow-elevated hover-lift font-medium whitespace-nowrap"
                      disabled={isSendingMagicLink || cooldownSeconds > 0}
                    >
                      {isSendingMagicLink ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : cooldownSeconds > 0 ? (
                        `Wait ${cooldownSeconds}s`
                      ) : (
                        "Sign In"
                      )}
                    </Button>
                  </div>
                  {magicLinkError && (
                    <p className="text-sm text-destructive">{magicLinkError}</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    We&apos;ll send you a magic link to sign in. No password needed.
                  </p>
                </form>
              )}
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
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <span className="hidden sm:inline font-medium">{user.email}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => router.push("/courses")}>
                <BookOpen className="w-4 h-4 mr-2" />
                Courses
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/settings/integrations")}>
                <Settings className="w-4 h-4 mr-2" />
                Integrations
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
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

      {/* Course Creation Dialog */}
      <Dialog open={showCourseDialog} onOpenChange={setShowCourseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Course from Syllabus</DialogTitle>
            <DialogDescription>
              We detected course information from your syllabus. Would you like to create this course?
            </DialogDescription>
          </DialogHeader>

          {courseMatch?.suggestedCourse && (
            <div className="py-4 space-y-3">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Course Name</span>
                  <span className="text-sm font-medium">{courseMatch.suggestedCourse.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Course Code</span>
                  <span className="text-sm font-mono font-medium">{courseMatch.suggestedCourse.course_code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Semester</span>
                  <span className="text-sm font-medium">{courseMatch.suggestedCourse.semester}</span>
                </div>
              </div>

              {courseMatch.similarCourses && courseMatch.similarCourses.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  <p className="mb-1">You have similar courses:</p>
                  <ul className="list-disc list-inside">
                    {courseMatch.similarCourses.map(c => (
                      <li key={c.id}>{c.course_code} - {c.semester}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCourseDialog(false)}>
              Skip for Now
            </Button>
            <Button onClick={handleCreateCourseFromSyllabus} disabled={isCreatingCourse}>
              {isCreatingCourse ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <BookOpen className="w-4 h-4 mr-2" />
                  Create Course
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
