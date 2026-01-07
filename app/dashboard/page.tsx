"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard-header"
import { FileUploadZone } from "@/components/file-upload-zone"
import { SyllabusCard } from "@/components/syllabus-card"
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
      <DashboardHeader userName="Cornell Student" userEmail="student@cornell.edu" />

      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Upload Section */}
        <section>
          <h1 className="text-2xl font-semibold text-foreground mb-2">Upload Syllabus</h1>
          <p className="text-muted-foreground mb-6">
            Drop your course syllabus and let AI extract all the important dates.
          </p>
          <FileUploadZone onFileSelect={handleFileSelect} isProcessing={isProcessing} />
        </section>

        {/* Recent Uploads */}
        {recentSyllabi.length > 0 && (
          <section className="mt-16">
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
