import { createClient } from "@/lib/supabase/server"
import { getGmailToken } from "@/lib/integrations"
import { getEmailContent } from "@/lib/gmail"

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return new Response("Unauthorized", { status: 401 })
  }

  const accessToken = await getGmailToken(user.id)

  if (!accessToken) {
    return new Response(JSON.stringify({
      error: "Gmail not connected",
      message: "Please connect Gmail from Settings > Integrations",
      connectUrl: "/settings/integrations",
    }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    })
  }

  try {
    const { messageId } = await req.json()

    if (!messageId) {
      return new Response(JSON.stringify({ error: "messageId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const email = await getEmailContent(accessToken, messageId)

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
