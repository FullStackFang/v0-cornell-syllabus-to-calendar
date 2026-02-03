import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

interface CreateFromSyllabusInput {
  // Course info (from syllabus extraction or user input)
  name: string
  course_code: string
  semester: string
  // Material info
  filename: string
  fileHash: string
  extractedText?: string
}

// Generate plus address from user email and course code
function generatePlusAddress(email: string, courseCode: string): string {
  const [localPart, domain] = email.split("@")
  const normalizedCode = courseCode.toLowerCase().replace(/\s+/g, "")
  return `${localPart}+${normalizedCode}@${domain}`
}

// POST /api/courses/from-syllabus - Create course and attach syllabus material
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body: CreateFromSyllabusInput = await request.json()

    // Validate required fields
    if (!body.name || !body.course_code || !body.semester) {
      return NextResponse.json(
        { error: "Missing required fields: name, course_code, semester" },
        { status: 400 }
      )
    }

    if (!body.filename || !body.fileHash) {
      return NextResponse.json(
        { error: "Missing required fields: filename, fileHash" },
        { status: 400 }
      )
    }

    // Check for duplicate course
    const { data: existingCourse } = await supabase
      .from("courses")
      .select("id, name")
      .eq("professor_id", user.id)
      .eq("course_code", body.course_code)
      .eq("semester", body.semester)
      .single()

    if (existingCourse) {
      return NextResponse.json(
        { error: `You already have ${body.course_code} for ${body.semester}` },
        { status: 409 }
      )
    }

    // Generate plus address
    const plusAddress = generatePlusAddress(user.email!, body.course_code)

    // Create the course
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .insert({
        professor_id: user.id,
        name: body.name,
        course_code: body.course_code,
        semester: body.semester,
        plus_address: plusAddress,
      })
      .select()
      .single()

    if (courseError) {
      console.error("Failed to create course:", courseError)
      return NextResponse.json({ error: "Failed to create course" }, { status: 500 })
    }

    // Save the syllabus material
    const { data: material, error: materialError } = await supabase
      .from("course_materials")
      .insert({
        course_id: course.id,
        filename: body.filename,
        file_type: "pdf",
        file_hash: body.fileHash,
        extracted_text: body.extractedText,
        is_syllabus: true,
      })
      .select()
      .single()

    if (materialError) {
      console.error("Failed to save material:", materialError)
      // Course was created but material failed - still return course
      return NextResponse.json({
        course,
        material: null,
        warning: "Course created but failed to save syllabus material",
      }, { status: 201 })
    }

    return NextResponse.json({ course, material }, { status: 201 })
  } catch (error) {
    console.error("Failed to create course from syllabus:", error)
    return NextResponse.json({ error: "Failed to create course" }, { status: 500 })
  }
}
