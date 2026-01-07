"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Calendar, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DashboardHeader } from "@/components/dashboard-header"
import { CourseInfoCard } from "@/components/course-info-card"
import { ScheduleTable } from "@/components/schedule-table"
import { AssignmentTable } from "@/components/assignment-table"
import { CalendarPreviewModal } from "@/components/calendar-preview-modal"
import type { SyllabusData, Course, ClassSession, Assignment } from "@/types"

// Demo data
const initialData: SyllabusData = {
  course: {
    name: "AI Applications for Business",
    code: "NBAE6921",
    instructor: "Emaad Manzoor",
    email: "emaadmanzoor@cornell.edu",
    semester: "January 2026",
    credits: 2,
  },
  schedule: [
    {
      id: "s1",
      date: "2026-01-04",
      time: "09:00:00",
      duration_hours: 4,
      topic: "Foundations of Generative Thinking",
      location: "Sage Hall 101",
    },
    {
      id: "s2",
      date: "2026-01-05",
      time: "09:00:00",
      duration_hours: 4,
      topic: "AI-Powered Research & Analysis",
      location: "Sage Hall 101",
    },
    {
      id: "s3",
      date: "2026-01-06",
      time: "09:00:00",
      duration_hours: 4,
      topic: "Building AI Agents",
      location: "Sage Hall 101",
    },
    {
      id: "s4",
      date: "2026-01-07",
      time: "09:00:00",
      duration_hours: 4,
      topic: "AI Strategy & Implementation",
      location: "Sage Hall 101",
    },
    {
      id: "s5",
      date: "2026-01-08",
      time: "09:00:00",
      duration_hours: 4,
      topic: "Project Work Session",
      location: "Sage Hall 101",
    },
    {
      id: "s6",
      date: "2026-01-09",
      time: "09:00:00",
      duration_hours: 4,
      topic: "Demo Day",
      location: "Sage Hall 101",
    },
  ],
  assignments: [
    {
      id: "a1",
      name: "Pre-Course Assignment",
      type: "homework",
      dueDate: "2026-01-03",
      weight: "10%",
      description: "Complete readings and reflection",
    },
    {
      id: "a2",
      name: "Daily Participation",
      type: "participation",
      dueDate: null,
      weight: "30%",
      description: "Active engagement in class discussions",
    },
    {
      id: "a3",
      name: "Individual AI Application",
      type: "project",
      dueDate: "2026-01-07",
      weight: "20%",
      description: "Build a personal AI tool",
    },
    {
      id: "a4",
      name: "Group Project Presentation",
      type: "project",
      dueDate: "2026-01-09",
      weight: "30%",
      description: "Demo Day presentation",
    },
    {
      id: "a5",
      name: "Peer Evaluation",
      type: "participation",
      dueDate: "2026-01-09",
      weight: "10%",
      description: "Evaluate team members",
    },
  ],
  gradingBreakdown: {
    participation: "30%",
    homework: "10%",
    project: "60%",
  },
}

export default function ReviewPage() {
  const router = useRouter()
  const [syllabusData, setSyllabusData] = useState<SyllabusData>(initialData)
  const [showPreview, setShowPreview] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const handleCourseUpdate = (course: Course) => {
    setSyllabusData((prev) => ({ ...prev, course }))
  }

  const handleScheduleUpdate = (schedule: ClassSession[]) => {
    setSyllabusData((prev) => ({ ...prev, schedule }))
  }

  const handleAssignmentsUpdate = (assignments: Assignment[]) => {
    setSyllabusData((prev) => ({ ...prev, assignments }))
  }

  const handleCreateEvents = async () => {
    setIsCreating(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000))
    router.push("/success")
  }

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(syllabusData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${syllabusData.course.code}-syllabus.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalEvents = syllabusData.schedule.length + syllabusData.assignments.filter((a) => a.dueDate).length

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader userName="Cornell Student" userEmail="student@cornell.edu" />

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Back button */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
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
