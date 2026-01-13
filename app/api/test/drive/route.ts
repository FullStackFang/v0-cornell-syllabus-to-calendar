import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  getOrCreateAppFolder,
  getOrCreateCourseFolder,
  listFiles,
  listCourseFolders,
} from "@/lib/drive"
import {
  createCourse,
  getCourseConfig,
  updateApiKey,
  getDecryptedApiKey,
  listCourses,
  getPendingQuestions,
  addPendingQuestion,
  getCourseStats,
} from "@/lib/course-config"
import {
  getKnowledgeBase,
  addFAQ,
  listFAQs,
  updateSyllabusSummary,
  addKeyDate,
} from "@/lib/knowledge-base"

// GET: View Drive data
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.accessToken) {
    return NextResponse.json(
      { error: "Not authenticated. Please log in first." },
      { status: 401 }
    )
  }

  const url = new URL(req.url)
  const action = url.searchParams.get("action") || "list-courses"
  const courseId = url.searchParams.get("courseId")
  const accessToken = session.accessToken

  try {
    switch (action) {
      case "list-courses": {
        const courses = await listCourses(accessToken)
        return NextResponse.json({
          success: true,
          count: courses.length,
          courses: courses.map((c) => ({
            courseId: c.courseId,
            courseName: c.courseName,
            professorEmail: c.professorEmail,
            hasApiKey: !!c.encryptedApiKey,
            settings: c.settings,
            createdAt: c.createdAt,
          })),
        })
      }

      case "get-course": {
        if (!courseId) {
          return NextResponse.json(
            { error: "courseId required" },
            { status: 400 }
          )
        }
        const config = await getCourseConfig(accessToken, courseId)
        if (!config) {
          return NextResponse.json(
            { error: "Course not found" },
            { status: 404 }
          )
        }
        return NextResponse.json({
          success: true,
          course: {
            ...config,
            encryptedApiKey: config.encryptedApiKey ? "[ENCRYPTED]" : null,
          },
        })
      }

      case "get-knowledge-base": {
        if (!courseId) {
          return NextResponse.json(
            { error: "courseId required" },
            { status: 400 }
          )
        }
        const kb = await getKnowledgeBase(courseId, accessToken)
        return NextResponse.json({
          success: true,
          knowledgeBase: kb,
        })
      }

      case "get-pending": {
        if (!courseId) {
          return NextResponse.json(
            { error: "courseId required" },
            { status: 400 }
          )
        }
        const pending = await getPendingQuestions(accessToken, courseId)
        return NextResponse.json({
          success: true,
          count: pending.length,
          questions: pending,
        })
      }

      case "get-stats": {
        if (!courseId) {
          return NextResponse.json(
            { error: "courseId required" },
            { status: 400 }
          )
        }
        const stats = await getCourseStats(accessToken, courseId)
        return NextResponse.json({
          success: true,
          stats,
        })
      }

      case "list-folders": {
        const folders = await listCourseFolders(accessToken)
        return NextResponse.json({
          success: true,
          folders,
        })
      }

      case "app-folder": {
        const folderId = await getOrCreateAppFolder(accessToken)
        const files = await listFiles(accessToken, folderId)
        return NextResponse.json({
          success: true,
          folderId,
          files,
        })
      }

      default:
        return NextResponse.json(
          {
            error: "Unknown action",
            availableActions: [
              "list-courses",
              "get-course",
              "get-knowledge-base",
              "get-pending",
              "get-stats",
              "list-folders",
              "app-folder",
            ],
          },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error("Drive test error:", error)
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    )
  }
}

// POST: Create/modify Drive data
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.accessToken) {
    return NextResponse.json(
      { error: "Not authenticated. Please log in first." },
      { status: 401 }
    )
  }

  const body = await req.json()
  const { action, courseId } = body
  const accessToken = session.accessToken

  try {
    switch (action) {
      case "create-course": {
        const { courseName, professorEmail, anthropicApiKey } = body
        if (!courseId || !courseName) {
          return NextResponse.json(
            { error: "courseId and courseName required" },
            { status: 400 }
          )
        }

        const email = professorEmail || session.user?.email
        if (!email) {
          return NextResponse.json(
            { error: "professorEmail required" },
            { status: 400 }
          )
        }

        const config = await createCourse(
          accessToken,
          courseId,
          courseName,
          email,
          session.user?.name || undefined,
          anthropicApiKey
        )

        return NextResponse.json({
          success: true,
          message: `Course "${courseName}" created`,
          course: {
            ...config,
            encryptedApiKey: config.encryptedApiKey ? "[ENCRYPTED]" : null,
          },
        })
      }

      case "set-api-key": {
        const { anthropicApiKey, professorEmail } = body
        if (!courseId || !anthropicApiKey) {
          return NextResponse.json(
            { error: "courseId and anthropicApiKey required" },
            { status: 400 }
          )
        }

        const email = professorEmail || session.user?.email
        if (!email) {
          return NextResponse.json(
            { error: "professorEmail required" },
            { status: 400 }
          )
        }

        await updateApiKey(accessToken, courseId, anthropicApiKey, email)

        return NextResponse.json({
          success: true,
          message: "API key updated and encrypted",
        })
      }

      case "verify-api-key": {
        const { professorEmail } = body
        if (!courseId) {
          return NextResponse.json(
            { error: "courseId required" },
            { status: 400 }
          )
        }

        const email = professorEmail || session.user?.email
        if (!email) {
          return NextResponse.json(
            { error: "professorEmail required" },
            { status: 400 }
          )
        }

        const decrypted = await getDecryptedApiKey(accessToken, courseId, email)

        return NextResponse.json({
          success: true,
          hasKey: !!decrypted,
          keyPreview: decrypted
            ? `${decrypted.substring(0, 10)}...${decrypted.substring(decrypted.length - 4)}`
            : null,
        })
      }

      case "add-faq": {
        const { question, answer, source = "manual" } = body
        if (!courseId || !question || !answer) {
          return NextResponse.json(
            { error: "courseId, question, and answer required" },
            { status: 400 }
          )
        }

        const faq = await addFAQ(courseId, question, answer, source, accessToken)

        return NextResponse.json({
          success: true,
          message: "FAQ added to Drive",
          faq,
        })
      }

      case "seed-knowledge-base": {
        if (!courseId) {
          return NextResponse.json(
            { error: "courseId required" },
            { status: 400 }
          )
        }

        // Add sample FAQs
        const sampleFaqs = [
          {
            question: "When is the midterm exam?",
            answer: "The midterm exam is scheduled for March 15th at 2:00 PM in Room 301.",
          },
          {
            question: "What is the late homework policy?",
            answer: "Late homework loses 10% per day, up to 3 days. After 3 days, no credit.",
          },
          {
            question: "When are office hours?",
            answer: "Office hours are Tuesday and Thursday 3-5 PM in Room 205.",
          },
        ]

        for (const faq of sampleFaqs) {
          await addFAQ(courseId, faq.question, faq.answer, "manual", accessToken)
        }

        await updateSyllabusSummary(
          courseId,
          "This is an introductory data science course covering statistics and machine learning basics.",
          accessToken
        )

        await addKeyDate(courseId, "2025-03-15", "Midterm Exam", accessToken)
        await addKeyDate(courseId, "2025-05-10", "Final Exam", accessToken)

        const kb = await getKnowledgeBase(courseId, accessToken)

        return NextResponse.json({
          success: true,
          message: "Knowledge base seeded and saved to Drive",
          knowledgeBase: kb,
        })
      }

      case "add-pending-question": {
        const { from, subject, body: questionBody, suggestedResponse, confidence } = body
        if (!courseId || !from || !subject || !questionBody) {
          return NextResponse.json(
            { error: "courseId, from, subject, and body required" },
            { status: 400 }
          )
        }

        const question = {
          id: `q-${Date.now()}`,
          emailId: `email-${Date.now()}`,
          threadId: `thread-${Date.now()}`,
          from,
          subject,
          body: questionBody,
          receivedAt: new Date().toISOString(),
          suggestedResponse: suggestedResponse || "No suggestion generated",
          confidence: confidence || 0.5,
          reasoning: "Test question",
        }

        await addPendingQuestion(accessToken, courseId, question)

        return NextResponse.json({
          success: true,
          message: "Pending question added",
          question,
        })
      }

      default:
        return NextResponse.json(
          {
            error: "Unknown action",
            availableActions: [
              "create-course",
              "set-api-key",
              "verify-api-key",
              "add-faq",
              "seed-knowledge-base",
              "add-pending-question",
            ],
          },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error("Drive test error:", error)
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    )
  }
}
