import { google } from "googleapis"

function getGmailClient(accessToken: string) {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  return google.gmail({ version: "v1", auth })
}

export interface EmailMessage {
  id: string
  threadId: string
  subject: string
  from: string
  date: string
  snippet: string
  body?: string
}

export interface EmailThread {
  id: string
  messages: EmailMessage[]
}

function decodeBase64(data: string): string {
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8")
}

function extractHeader(headers: { name: string; value: string }[], name: string): string {
  const header = headers.find((h) => h.name.toLowerCase() === name.toLowerCase())
  return header?.value || ""
}

function extractBody(payload: { parts?: { mimeType: string; body: { data?: string } }[]; body?: { data?: string } }): string {
  if (payload.body?.data) {
    return decodeBase64(payload.body.data)
  }
  if (payload.parts) {
    const textPart = payload.parts.find((p) => p.mimeType === "text/plain")
    if (textPart?.body?.data) {
      return decodeBase64(textPart.body.data)
    }
    const htmlPart = payload.parts.find((p) => p.mimeType === "text/html")
    if (htmlPart?.body?.data) {
      const html = decodeBase64(htmlPart.body.data)
      return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim()
    }
  }
  return ""
}

export async function searchEmails(
  accessToken: string,
  query: string,
  maxResults = 10
): Promise<EmailMessage[]> {
  const gmail = getGmailClient(accessToken)

  const listResponse = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults,
  })

  const messages = listResponse.data.messages || []
  const emails: EmailMessage[] = []

  for (const msg of messages) {
    const detail = await gmail.users.messages.get({
      userId: "me",
      id: msg.id!,
      format: "metadata",
      metadataHeaders: ["Subject", "From", "Date"],
    })

    const headers = detail.data.payload?.headers || []
    emails.push({
      id: msg.id!,
      threadId: msg.threadId!,
      subject: extractHeader(headers, "Subject"),
      from: extractHeader(headers, "From"),
      date: extractHeader(headers, "Date"),
      snippet: detail.data.snippet || "",
    })
  }

  return emails
}

export async function getEmailThread(
  accessToken: string,
  threadId: string
): Promise<EmailThread> {
  const gmail = getGmailClient(accessToken)

  const thread = await gmail.users.threads.get({
    userId: "me",
    id: threadId,
    format: "full",
  })

  const messages: EmailMessage[] = (thread.data.messages || []).map((msg) => {
    const headers = msg.payload?.headers || []
    return {
      id: msg.id!,
      threadId: msg.threadId!,
      subject: extractHeader(headers, "Subject"),
      from: extractHeader(headers, "From"),
      date: extractHeader(headers, "Date"),
      snippet: msg.snippet || "",
      body: extractBody(msg.payload as any),
    }
  })

  return { id: threadId, messages }
}

export async function getEmailContent(
  accessToken: string,
  messageId: string
): Promise<EmailMessage> {
  const gmail = getGmailClient(accessToken)

  const msg = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full",
  })

  const headers = msg.data.payload?.headers || []
  return {
    id: msg.data.id!,
    threadId: msg.data.threadId!,
    subject: extractHeader(headers, "Subject"),
    from: extractHeader(headers, "From"),
    date: extractHeader(headers, "Date"),
    snippet: msg.data.snippet || "",
    body: extractBody(msg.data.payload as any),
  }
}
