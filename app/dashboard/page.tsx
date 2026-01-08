"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { FileUploadZone } from "@/components/file-upload-zone"
import { SyllabusCard } from "@/components/syllabus-card"
import { Calendar, LogOut, MessageSquare } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import type { UploadedSyllabus } from "@/types"

// Mock data for demonstration
const mockSyllabi: UploadedSyllabus[] = [
  {
    id: "1",
    courseName: "NBAE 6921: AI Applications for Business",
    uploadDate: "2025-01-02T10:00:00Z",
    eventsCreated: 12,
    data: {
      course: {
        name: "AI Applications for Business",
        code: "NBAE6921",
        instructor: "Emaad Manzoor",
        email: "emaadmanzoor@cornell.edu",
        semester: "January 2026",
        credits: 2,
      },
      schedule: [],
      assignments: [],
      gradingBreakdown: {},
    },
  },
]

export default function DashboardPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)
  const [recentSyllabi] = useState<UploadedSyllabus[]>(mockSyllabi)

  const handleFileSelect = async (file: File) => {
    setIsProcessing(true)

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // In real implementation, this would call the /api/upload endpoint
    // and then redirect to review page with the extracted data
    router.push("/review?demo=true")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Calendar className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">Syllabus Agent</span>
          </div>
          <div className="flex items-center gap-4">
            <Button asChild variant="default" size="sm">
              <Link href="/chat">
                <MessageSquare className="w-4 h-4 mr-2" />
                Chat with Agent
              </Link>
            </Button>
            {session?.user && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {session.user.image && (
                    <Image
                      src={session.user.image}
                      alt={session.user.name || "User"}
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  )}
                  <div className="hidden sm:block">
                    <div className="text-sm font-medium">{session.user.name}</div>
                    <div className="text-xs text-muted-foreground">{session.user.email}</div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => signOut({ callbackUrl: "/" })}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Upload Section */}
        <section>
          <h1 className="text-2xl font-semibold text-foreground mb-2">Upload Syllabus</h1>
          <p className="text-muted-foreground mb-6">
            Drop your course syllabus and let AI extract all the important dates.
          </p>
          <FileUploadZone onFileSelect={handleFileSelect} isProcessing={isProcessing} />
        </section>

        {/* Chat CTA */}
        <section className="mt-12 p-6 rounded-2xl bg-primary/5 border border-primary/20">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1">Chat with the AI Agent</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Ask questions about your courses, search your emails for course-related content, or get help managing your schedule.
              </p>
              <Button asChild size="sm">
                <Link href="/chat">Start Chatting</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Recent Uploads */}
        {recentSyllabi.length > 0 && (
          <section className="mt-12">
            <h2 className="text-lg font-semibold text-foreground mb-4">Recent Uploads</h2>
            <div className="space-y-3">
              {recentSyllabi.map((syllabus) => (
                <SyllabusCard key={syllabus.id} syllabus={syllabus} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
