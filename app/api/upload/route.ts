import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { extractSyllabusData } from "@/lib/anthropic"
import crypto from "crypto"

// Compute SHA-256 hash of file content
function computeFileHash(buffer: ArrayBuffer): string {
  return crypto.createHash("sha256").update(Buffer.from(buffer)).digest("hex")
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "File must be a PDF" }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be less than 10MB" }, { status: 400 })
    }

    // Convert PDF to base64 and compute hash
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString("base64")
    const fileHash = computeFileHash(arrayBuffer)

    // Check for duplicate file upload
    const { data: existingMaterial } = await supabase
      .from("course_materials")
      .select("id, course_id, filename, courses(id, name, course_code, semester)")
      .eq("file_hash", fileHash)
      .single()

    if (existingMaterial) {
      return NextResponse.json({
        success: true,
        duplicate: true,
        existingMaterial: {
          id: existingMaterial.id,
          filename: existingMaterial.filename,
          course: existingMaterial.courses,
        },
        message: "This file has already been uploaded",
      })
    }

    // Extract structured data using Claude's native PDF support
    const syllabusData = await extractSyllabusData(base64, "pdf")

    // Check if a course exists with this code + semester
    let courseMatch = null
    if (syllabusData.course?.code && syllabusData.course?.semester) {
      const { data: existingCourse } = await supabase
        .from("courses")
        .select("id, name, course_code, semester, plus_address")
        .eq("professor_id", user.id)
        .eq("course_code", syllabusData.course.code)
        .eq("semester", syllabusData.course.semester)
        .eq("status", "active")
        .single()

      if (existingCourse) {
        courseMatch = {
          status: "existing",
          course: existingCourse,
        }
      } else {
        // Check if any course with this code exists (different semester)
        const { data: similarCourses } = await supabase
          .from("courses")
          .select("id, name, course_code, semester")
          .eq("professor_id", user.id)
          .eq("course_code", syllabusData.course.code)
          .eq("status", "active")

        courseMatch = {
          status: "new",
          suggestedCourse: {
            name: syllabusData.course.name,
            course_code: syllabusData.course.code,
            semester: syllabusData.course.semester,
          },
          similarCourses: similarCourses || [],
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: syllabusData,
      fileHash,
      filename: file.name,
      courseMatch,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Failed to process syllabus" }, { status: 500 })
  }
}
