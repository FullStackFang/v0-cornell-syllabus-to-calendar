import { NextResponse } from "next/server"
import { extractSyllabusData } from "@/lib/anthropic"

export async function POST(request: Request) {
  try {
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

    // Convert PDF to base64 and send to Claude for direct PDF reading
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString("base64")

    // Extract structured data using Claude's native PDF support
    const syllabusData = await extractSyllabusData(base64, "pdf")

    return NextResponse.json({
      success: true,
      data: syllabusData,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Failed to process syllabus" }, { status: 500 })
  }
}
