import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

interface SaveMaterialInput {
  courseId: string
  filename: string
  fileType: "pdf" | "docx" | "txt"
  fileHash: string
  extractedText?: string
  isSyllabus?: boolean
}

// POST /api/materials - Save a material and link to course
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body: SaveMaterialInput = await request.json()

    if (!body.courseId || !body.filename || !body.fileType || !body.fileHash) {
      return NextResponse.json(
        { error: "Missing required fields: courseId, filename, fileType, fileHash" },
        { status: 400 }
      )
    }

    // Verify the course belongs to this user
    const { data: course } = await supabase
      .from("courses")
      .select("id")
      .eq("id", body.courseId)
      .eq("professor_id", user.id)
      .single()

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // Check for duplicate
    const { data: existing } = await supabase
      .from("course_materials")
      .select("id")
      .eq("course_id", body.courseId)
      .eq("file_hash", body.fileHash)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: "This file has already been uploaded to this course" },
        { status: 409 }
      )
    }

    // Save the material
    const { data: material, error } = await supabase
      .from("course_materials")
      .insert({
        course_id: body.courseId,
        filename: body.filename,
        file_type: body.fileType,
        file_hash: body.fileHash,
        extracted_text: body.extractedText,
        is_syllabus: body.isSyllabus ?? false,
      })
      .select()
      .single()

    if (error) {
      console.error("Failed to save material:", error)
      return NextResponse.json({ error: "Failed to save material" }, { status: 500 })
    }

    return NextResponse.json({ material }, { status: 201 })
  } catch (error) {
    console.error("Failed to save material:", error)
    return NextResponse.json({ error: "Failed to save material" }, { status: 500 })
  }
}

// GET /api/materials?courseId=xxx - List materials for a course
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get("courseId")

    if (!courseId) {
      return NextResponse.json({ error: "courseId is required" }, { status: 400 })
    }

    // Verify the course belongs to this user
    const { data: course } = await supabase
      .from("courses")
      .select("id")
      .eq("id", courseId)
      .eq("professor_id", user.id)
      .single()

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    const { data: materials, error } = await supabase
      .from("course_materials")
      .select("id, filename, file_type, is_syllabus, created_at")
      .eq("course_id", courseId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Failed to fetch materials:", error)
      return NextResponse.json({ error: "Failed to fetch materials" }, { status: 500 })
    }

    return NextResponse.json({ materials })
  } catch (error) {
    console.error("Failed to fetch materials:", error)
    return NextResponse.json({ error: "Failed to fetch materials" }, { status: 500 })
  }
}
