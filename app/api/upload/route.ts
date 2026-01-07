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

    // Convert PDF to text (using pdf-parse in production)
    // For now, we'll extract text using ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // In production, use pdf-parse:
    // const pdfParse = require('pdf-parse')
    // const pdfData = await pdfParse(buffer)
    // const pdfText = pdfData.text

    // For demo, use a simplified text extraction
    const pdfText = buffer.toString("utf-8").replace(/[^\x20-\x7E\n]/g, " ")

    // Extract structured data using Claude
    const syllabusData = await extractSyllabusData(pdfText)

    return NextResponse.json({
      success: true,
      data: syllabusData,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Failed to process syllabus" }, { status: 500 })
  }
}
