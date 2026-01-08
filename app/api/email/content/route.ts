import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getEmailContent } from "@/lib/gmail"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.accessToken) {
    return new Response("Unauthorized", { status: 401 })
  }

  try {
    const { messageId } = await req.json()

    if (!messageId) {
      return new Response(JSON.stringify({ error: "messageId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const email = await getEmailContent(session.accessToken, messageId)

    return new Response(JSON.stringify({ email }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Email content error:", error)
    return new Response(JSON.stringify({ error: "Failed to fetch email content" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
