import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  getKnowledgeBase,
  addFAQ,
  searchFAQs,
  updateSyllabusSummary,
  addKeyDate,
  buildKnowledgeContext,
  clearCache,
} from "@/lib/knowledge-base"
import {
  analyzeQuestion,
  shouldAutoReply,
  EmailData,
  AnalyzeOptions,
  estimateCost,
} from "@/lib/agent-decision"
import { ClaudeModel, MODEL_INFO } from "@/lib/course-config"

// GET: View current knowledge base (in-memory for testing without auth)
export async function GET(req: Request) {
  const url = new URL(req.url)
  const courseId = url.searchParams.get("courseId") || "test-course"
  const action = url.searchParams.get("action")

  // Check if we have a session for Drive storage
  const session = await getServerSession(authOptions)
  const accessToken = session?.accessToken

  const kb = await getKnowledgeBase(courseId, accessToken)

  if (action === "context") {
    return NextResponse.json({
      courseId,
      context: buildKnowledgeContext(kb),
      usingDrive: !!accessToken,
    })
  }

  return NextResponse.json({
    courseId,
    knowledgeBase: kb,
    faqCount: kb.faqs.length,
    usingDrive: !!accessToken,
  })
}

// POST: Add FAQs, test questions, or seed data
export async function POST(req: Request) {
  const body = await req.json()
  const { action, courseId = "test-course" } = body

  // Check if we have a session for Drive storage
  const session = await getServerSession(authOptions)
  const accessToken = session?.accessToken

  switch (action) {
    case "add-faq": {
      const { question, answer, source = "manual" } = body
      if (!question || !answer) {
        return NextResponse.json(
          { error: "Missing question or answer" },
          { status: 400 }
        )
      }
      const faq = await addFAQ(courseId, question, answer, source, accessToken)
      return NextResponse.json({
        success: true,
        faq,
        usingDrive: !!accessToken,
      })
    }

    case "seed": {
      const sampleFaqs = [
        {
          question: "When is the midterm exam?",
          answer: "The midterm exam is scheduled for March 15th at 2:00 PM in Room 301. Please bring a calculator and arrive 10 minutes early.",
        },
        {
          question: "What is the late homework policy?",
          answer: "Late homework submissions lose 10% per day, up to a maximum of 3 days late. After 3 days, no credit is given. Extensions require prior approval.",
        },
        {
          question: "When are office hours?",
          answer: "Office hours are held every Tuesday and Thursday from 3-5 PM in my office (Room 205). You can also schedule appointments via email.",
        },
        {
          question: "How is the final grade calculated?",
          answer: "Final grades are calculated as: Homework 30%, Midterm 25%, Final Exam 35%, Participation 10%.",
        },
        {
          question: "Is the textbook required?",
          answer: "Yes, the textbook 'Introduction to Data Science' by Smith is required. The bookstore has copies, or you can purchase the e-book version.",
        },
        {
          question: "Can I use AI tools for assignments?",
          answer: "AI tools like ChatGPT may be used for learning and understanding concepts, but all submitted work must be your own. Cite any AI assistance in your submissions.",
        },
      ]

      for (const faq of sampleFaqs) {
        await addFAQ(courseId, faq.question, faq.answer, "manual", accessToken)
      }

      await updateSyllabusSummary(
        courseId,
        "This is an introductory course covering data science fundamentals including statistics, machine learning basics, and data visualization. Prerequisites: Basic programming knowledge.",
        accessToken
      )

      await addKeyDate(courseId, "2025-03-15", "Midterm Exam", accessToken)
      await addKeyDate(courseId, "2025-05-10", "Final Exam", accessToken)
      await addKeyDate(courseId, "2025-04-01", "Project Proposal Due", accessToken)
      await addKeyDate(courseId, "2025-05-01", "Final Project Due", accessToken)

      const kb = await getKnowledgeBase(courseId, accessToken)

      return NextResponse.json({
        success: true,
        message: `Seeded ${sampleFaqs.length} FAQs`,
        knowledgeBase: kb,
        usingDrive: !!accessToken,
      })
    }

    case "search": {
      const { query } = body
      if (!query) {
        return NextResponse.json({ error: "Missing query" }, { status: 400 })
      }
      const results = await searchFAQs(courseId, query, accessToken)
      return NextResponse.json({ query, results })
    }

    case "test-question": {
      const {
        question,
        from = "student@cornell.edu",
        subject = "Question",
        model = "haiku",
        useSmartModelForLowConfidence = false,
      } = body
      if (!question) {
        return NextResponse.json({ error: "Missing question" }, { status: 400 })
      }

      // Validate model
      if (!["haiku", "sonnet", "opus"].includes(model)) {
        return NextResponse.json(
          { error: "Invalid model. Use: haiku, sonnet, or opus" },
          { status: 400 }
        )
      }

      const emailData: EmailData = {
        id: "test-" + Date.now(),
        threadId: "thread-" + Date.now(),
        from,
        subject,
        body: question,
        date: new Date().toISOString(),
      }

      const kb = await getKnowledgeBase(courseId, accessToken)

      const options: AnalyzeOptions = {
        model: model as ClaudeModel,
        useSmartModelForLowConfidence,
        smartModelThreshold: 0.5,
      }

      const decision = await analyzeQuestion(emailData, kb, options)
      const cost = estimateCost(decision.modelUsed)

      return NextResponse.json({
        input: {
          question,
          from,
          subject,
          model,
          useSmartModelForLowConfidence,
        },
        decision: {
          confidence: decision.confidence,
          confidencePercent: `${(decision.confidence * 100).toFixed(0)}%`,
          wouldAutoReply: shouldAutoReply(decision),
          response: decision.response,
          reasoning: decision.reasoning,
          matchedFaqIds: decision.matchedFaqIds,
          modelUsed: decision.modelUsed,
          modelInfo: MODEL_INFO[decision.modelUsed],
        },
        estimatedCost: {
          perQuestion: `$${cost.total.toFixed(6)}`,
          per100Questions: `$${(cost.total * 100).toFixed(4)}`,
          per1000Questions: `$${(cost.total * 1000).toFixed(2)}`,
        },
        knowledgeBaseStats: {
          faqCount: kb.faqs.length,
          hasSyllabusSummary: !!kb.syllabusSummary,
          keyDatesCount: kb.keyDates?.length || 0,
        },
        usingDrive: !!accessToken,
      })
    }

    case "list-models": {
      return NextResponse.json({
        models: Object.entries(MODEL_INFO).map(([key, info]) => ({
          id: key,
          ...info,
          estimatedCostPerQuestion: `$${estimateCost(key as ClaudeModel).total.toFixed(6)}`,
        })),
        recommendation: "Use 'haiku' for most questions. It's 12x cheaper than 'sonnet' and handles simple Q&A well.",
      })
    }

    case "clear": {
      clearCache(courseId)
      return NextResponse.json({
        success: true,
        message: "In-memory cache cleared (Drive data unchanged)",
      })
    }

    default:
      return NextResponse.json(
        {
          error: "Unknown action",
          availableActions: [
            "add-faq",
            "seed",
            "search",
            "test-question",
            "list-models",
            "clear",
          ],
        },
        { status: 400 }
      )
  }
}
