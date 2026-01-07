import { generateObject } from "ai"
import { z } from "zod"

const syllabusSchema = z.object({
  course: z.object({
    name: z.string(),
    code: z.string(),
    instructor: z.string(),
    email: z.string(),
    semester: z.string(),
    credits: z.number(),
  }),
  schedule: z.array(
    z.object({
      id: z.string(),
      date: z.string(),
      time: z.string(),
      duration_hours: z.number(),
      topic: z.string(),
      location: z.string(),
    }),
  ),
  assignments: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.enum(["homework", "exam", "project", "quiz", "participation"]),
      dueDate: z.string().nullable(),
      weight: z.string(),
      description: z.string(),
    }),
  ),
  gradingBreakdown: z.record(z.string()),
})

export async function extractSyllabusData(pdfText: string) {
  const { object } = await generateObject({
    model: "anthropic/claude-sonnet-4-20250514",
    schema: syllabusSchema,
    prompt: `You are a syllabus parser. Extract structured information from this course syllabus.

Extract ALL assignments, due dates, class sessions, and exams. If a due date is not explicitly stated, set it to null. If class times are not specified, estimate based on typical academic schedules.

Generate unique IDs for each schedule item (format: s1, s2, s3...) and assignment (format: a1, a2, a3...).

Syllabus content:
${pdfText}`,
  })

  return object
}
