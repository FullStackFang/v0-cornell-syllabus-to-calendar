import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { searchEmails, getEmailThread, getEmailContent } from "@/lib/gmail"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { query, maxResults = 10 } = (await request.json()) as {
      query: string
      maxResults?: number
    }

    if (!query) {
      return NextResponse.json({ error: "Search query required" }, { status: 400 })
    }

    const emails = await searchEmails(session.accessToken, query, maxResults)

    return NextResponse.json({ emails })
  } catch (error) {
    console.error("Email search error:", error)
    return NextResponse.json({ error: "Failed to search emails" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const threadId = searchParams.get("threadId")
    const messageId = searchParams.get("messageId")

    if (threadId) {
      const thread = await getEmailThread(session.accessToken, threadId)
      return NextResponse.json({ thread })
    }

    if (messageId) {
      const message = await getEmailContent(session.accessToken, messageId)
      return NextResponse.json({ message })
    }

    return NextResponse.json({ error: "threadId or messageId required" }, { status: 400 })
  } catch (error) {
    console.error("Email fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch email" }, { status: 500 })
  }
}
