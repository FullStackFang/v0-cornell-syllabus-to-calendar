"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Calendar, Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DashboardHeader } from "@/components/dashboard-header"
import { CourseInfoCard } from "@/components/course-info-card"
import { ScheduleTable } from "@/components/schedule-table"
import { AssignmentTable } from "@/components/assignment-table"
import { CalendarPreviewModal } from "@/components/calendar-preview-modal"
import type { SyllabusData, Course, ClassSession, Assignment } from "@/types"

export default function ReviewPage() {
  const router = useRouter()
  const [syllabusData, setSyllabusData] = useState<SyllabusData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showPreview, setShowPreview] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  // Load syllabus data from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem("syllabusData")
    if (stored) {
      try {
        setSyllabusData(JSON.parse(stored))
      } catch (e) {
        console.error("Failed to parse syllabus data:", e)
        router.push("/")
      }
    } else {
      // No data, redirect to home
      router.push("/")
    }
    setIsLoading(false)
  }, [router])

  const handleCourseUpdate = (course: Course) => {
    setSyllabusData((prev) => prev ? { ...prev, course } : null)
  }

  const handleScheduleUpdate = (schedule: ClassSession[]) => {
    setSyllabusData((prev) => prev ? { ...prev, schedule } : null)
  }

  const handleAssignmentsUpdate = (assignments: Assignment[]) => {
    setSyllabusData((prev) => prev ? { ...prev, assignments } : null)
  }

  const handleCreateEvents = async () => {
    setIsCreating(true)
    // TODO: Implement actual calendar sync
    await new Promise((resolve) => setTimeout(resolve, 2000))
    router.push("/success")
  }

  const handleDownloadJson = () => {
    if (!syllabusData) return
    const blob = new Blob([JSON.stringify(syllabusData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${syllabusData.course.code}-syllabus.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // No data state (shouldn't happen due to redirect, but safety check)
  if (!syllabusData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No syllabus data found</p>
          <Button onClick={() => router.push("/")}>Go Back</Button>
        </div>
      </div>
    )
  }

  const totalEvents = syllabusData.schedule.length + syllabusData.assignments.filter((a) => a.dueDate).length

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader userName="Cornell Student" userEmail="student@cornell.edu" />

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Back button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">Review Extracted Data</h1>
          <p className="text-muted-foreground mt-1">Review and edit the information before adding to your calendar.</p>
        </div>

        {/* Content */}
        <div className="space-y-6">
          <CourseInfoCard course={syllabusData.course} onUpdate={handleCourseUpdate} />
          <ScheduleTable sessions={syllabusData.schedule} onUpdate={handleScheduleUpdate} />
          <AssignmentTable assignments={syllabusData.assignments} onUpdate={handleAssignmentsUpdate} />
        </div>

        {/* Action bar */}
        <div className="sticky bottom-0 mt-8 -mx-6 px-6 py-4 bg-background/80 backdrop-blur-xl border-t border-border">
          <div className="flex items-center justify-between gap-4 max-w-4xl mx-auto">
            <Button variant="outline" onClick={handleDownloadJson}>
              <Download className="w-4 h-4 mr-2" />
              Export JSON
            </Button>
            <Button onClick={() => setShowPreview(true)} size="lg" className="px-8">
              <Calendar className="w-4 h-4 mr-2" />
              Add {totalEvents} Events to Calendar
            </Button>
          </div>
        </div>
      </main>

      <CalendarPreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        onConfirm={handleCreateEvents}
        syllabusData={syllabusData}
        isCreating={isCreating}
      />
    </div>
  )
}
