"use client"

import { useState } from "react"
import { useSession, signIn, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ChatInterface } from "@/components/chat-interface"
import {
  Calendar,
  Sparkles,
  User,
  LogOut,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Image from "next/image"
import { RightPanel } from "@/components/right-panel"
import type { SyllabusData, EmailMessage } from "@/types"

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)
  const [syllabusData, setSyllabusData] = useState<SyllabusData | null>(null)
  const [isAddingToCalendar, setIsAddingToCalendar] = useState(false)

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
      const res = await fetch("/api/calendar/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syllabusData }),
      })

      if (!res.ok) {
        throw new Error("Failed to create calendar events")
      }

      const data = await res.json()
      alert(`Successfully created ${data.created} calendar events!`)
    } catch (error) {
      console.error("Calendar sync error:", error)
      alert("Failed to create calendar events. Please try again.")
    } finally {
      setIsAddingToCalendar(false)
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  // Not signed in - show landing page
  if (!session) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border shrink-0">
          <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Calendar className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground">Syllabus Agent</span>
            </div>
            <Button size="sm" onClick={() => signIn("google")}>
              Sign In
            </Button>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-6 py-20">
          <div className="max-w-2xl text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI-Powered for Cornell EMBA</span>
            </div>

            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-foreground leading-tight">
              Turn your syllabi into{" "}
              <span className="text-primary">calendar events</span>
            </h1>

            <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Upload a PDF, chat with an AI agent, search your emails, and sync
              everything to Google Calendar in seconds.
            </p>

            <Button
              size="lg"
              className="mt-10 h-12 px-8 text-base rounded-full"
              onClick={() => signIn("google")}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
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
        </main>
      </div>
    )
  }

  // Signed in - show main app with upload + chat
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="shrink-0 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Calendar className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">Syllabus Agent</span>
          </a>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                {session.user?.image ? (
                  <Image
                    src={session.user.image}
                    alt={session.user.name || "User"}
                    width={28}
                    height={28}
                    className="rounded-full"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                )}
                <span className="hidden sm:inline">{session.user?.name || "User"}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => signOut()}>
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
          <ChatInterface onEmailSelect={handleEmailSelect} onSyllabusData={handleSyllabusData} />
        </div>

        {/* Right Panel - Always visible tabbed panel */}
        <div className="w-[420px] border-l border-border bg-background shrink-0 overflow-hidden">
          <RightPanel
            syllabusData={syllabusData}
            onFileSelect={handleFileSelect}
            isProcessing={isProcessing}
            onAddToCalendar={handleAddToCalendar}
            isAddingToCalendar={isAddingToCalendar}
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
