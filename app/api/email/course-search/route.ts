import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getGmailToken } from "@/lib/integrations"
import { searchEmails } from "@/lib/gmail"
import { buildCourseEmailQuery, groupEmails } from "@/lib/email-categorization"
import type { SyllabusData, EmailMessage } from "@/types"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const accessToken = await getGmailToken(user.id)

    if (!accessToken) {
      return NextResponse.json({
        error: "Gmail not connected",
        message: "Please connect Gmail from Settings > Integrations",
        connectUrl: "/settings/integrations",
      }, { status: 403 })
    }

    const { syllabusData, maxResults = 50 } = (await request.json()) as {
      syllabusData: SyllabusData
      maxResults?: number
    }

    if (!syllabusData?.course) {
      return NextResponse.json({ error: "Syllabus data required" }, { status: 400 })
    }

    // Build Gmail query from course data
    const query = buildCourseEmailQuery(syllabusData.course)

    if (!query) {
      return NextResponse.json({
        query: "",
        groupedEmails: {
          assignments: [],
          announcements: [],
          schedule_changes: [],
          general: [],
        },
        totalCount: 0,
      })
    }

    // Search emails using the constructed query
    const emails = await searchEmails(accessToken, query, maxResults)

    // Cast to the shared EmailMessage type
    const typedEmails: EmailMessage[] = emails.map(email => ({
      id: email.id,
      threadId: email.threadId,
      subject: email.subject,
      from: email.from,
      date: email.date,
      snippet: email.snippet,
      body: email.body,
    }))

    // Categorize and group emails
    const groupedEmails = groupEmails(typedEmails, syllabusData)

    return NextResponse.json({
      query,
      groupedEmails,
      totalCount: emails.length,
    })
  } catch (error) {
    console.error("Course email search error:", error)
    return NextResponse.json({ error: "Failed to search course emails" }, { status: 500 })
  }
}
