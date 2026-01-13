import { NextResponse } from "next/server"
import {
  getEmailContent,
  getNewMessagesSinceHistoryId,
  sendReply,
  sendEmail,
  markQuestionAnswered,
  markQuestionPending,
  EmailMessage,
} from "@/lib/gmail"
import {
  analyzeQuestion,
  shouldAutoReply,
  formatProfessorNotification,
  EmailData,
} from "@/lib/agent-decision"
import { getKnowledgeBase, addFAQ } from "@/lib/knowledge-base"

// In-memory storage for course configurations
// TODO: Replace with Google Drive storage in Phase 6
interface CourseConfig {
  courseId: string
  professorEmail: string
  courseEmail: string
  accessToken: string
  lastHistoryId: string
}

const courseConfigs = new Map<string, CourseConfig>()

// Register a course for email monitoring
export function registerCourse(config: CourseConfig) {
  courseConfigs.set(config.courseEmail, config)
}

// Check if an email is a course question based on recipient
function getCourseConfigForEmail(email: EmailMessage): CourseConfig | null {
  // Check if the email was sent to any registered course email
  for (const [courseEmail, config] of courseConfigs) {
    // Email might be in the To or Cc headers
    // For now, we'll check if the email matches any registered course
    // This is a simplified check - production would parse headers more carefully
    if (email.from !== config.professorEmail) {
      return config
    }
  }
  return null
}

// Generate approval links for professor notification
function generateApprovalLinks(
  messageId: string,
  courseId: string,
  baseUrl: string
): { approve: string; edit: string; ignore: string } {
  // Create a simple token (in production, use cryptographically secure tokens)
  const token = Buffer.from(
    JSON.stringify({ messageId, courseId, timestamp: Date.now() })
  ).toString("base64url")

  return {
    approve: `${baseUrl}/api/approve/${token}?action=approve`,
    edit: `${baseUrl}/api/approve/${token}?action=edit`,
    ignore: `${baseUrl}/api/approve/${token}?action=ignore`,
  }
}

// Process a single incoming email
async function processIncomingEmail(
  email: EmailMessage,
  config: CourseConfig,
  baseUrl: string
): Promise<void> {
  console.log(`Processing email from ${email.from}: ${email.subject}`)

  // Convert to EmailData format for agent
  const emailData: EmailData = {
    id: email.id,
    threadId: email.threadId,
    from: email.from,
    subject: email.subject,
    body: email.body || email.snippet,
    date: email.date,
  }

  // Get knowledge base for this course
  const knowledgeBase = await getKnowledgeBase(config.courseId)

  // Analyze the question
  const decision = await analyzeQuestion(emailData, knowledgeBase)

  console.log(
    `Decision for "${email.subject}": confidence=${decision.confidence}, autoReply=${shouldAutoReply(decision)}`
  )

  if (shouldAutoReply(decision)) {
    // High confidence - auto-reply to student
    await sendReply(config.accessToken, email, decision.response)

    // Mark as answered
    await markQuestionAnswered(config.accessToken, email.id, config.courseId)

    // Add to knowledge base for future reference
    await addFAQ(
      config.courseId,
      emailData.body,
      decision.response,
      "professor_approved" // Auto-approved due to high confidence match
    )

    console.log(`Auto-replied to ${email.from}`)
  } else {
    // Low confidence - route to professor
    const approvalLinks = generateApprovalLinks(
      email.id,
      config.courseId,
      baseUrl
    )

    const notificationBody = formatProfessorNotification(
      emailData,
      decision,
      approvalLinks
    )

    // Send notification to professor
    await sendEmail(
      config.accessToken,
      config.professorEmail,
      `[Course Q&A] New question from ${email.from}`,
      notificationBody
    )

    // Mark as pending
    await markQuestionPending(config.accessToken, email.id, config.courseId)

    console.log(`Routed to professor: ${config.professorEmail}`)
  }
}

// POST handler for Pub/Sub push notifications
export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Pub/Sub sends data in a specific format
    const { message, subscription } = body

    if (!message?.data) {
      console.log("No message data in webhook payload")
      return NextResponse.json({ status: "ok" })
    }

    // Decode the Pub/Sub message
    const decodedData = Buffer.from(message.data, "base64").toString("utf-8")
    const notification = JSON.parse(decodedData)

    console.log("Gmail notification received:", notification)

    // Gmail sends: { emailAddress, historyId }
    const { emailAddress, historyId } = notification

    // Find the course config for this email
    let config: CourseConfig | null = null
    for (const [email, c] of courseConfigs) {
      if (c.professorEmail === emailAddress || c.courseEmail === emailAddress) {
        config = c
        break
      }
    }

    if (!config) {
      console.log(`No course config found for ${emailAddress}`)
      return NextResponse.json({ status: "ok" })
    }

    // Get new messages since last history ID
    const newMessages = await getNewMessagesSinceHistoryId(
      config.accessToken,
      config.lastHistoryId
    )

    // Update last history ID
    config.lastHistoryId = historyId

    // Get base URL for approval links
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"

    // Process each new message
    for (const email of newMessages) {
      // Skip if this is from the professor (not a student question)
      if (email.from.includes(config.professorEmail)) {
        continue
      }

      await processIncomingEmail(email, config, baseUrl)
    }

    return NextResponse.json({ status: "ok", processed: newMessages.length })
  } catch (error) {
    console.error("Gmail webhook error:", error)
    // Return 200 to prevent Pub/Sub retries for non-retriable errors
    return NextResponse.json({ status: "error", message: String(error) })
  }
}

// GET handler for webhook verification (if needed)
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Gmail webhook endpoint is active",
    registeredCourses: courseConfigs.size,
  })
}
