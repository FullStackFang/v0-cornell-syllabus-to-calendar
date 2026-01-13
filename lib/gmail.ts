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

// Extract email address from "Name <email@domain.com>" format
function extractEmailFromHeader(fromHeader: string): string | null {
  const emailMatch = fromHeader.match(/<([^>]+)>/)
  if (emailMatch) {
    return emailMatch[1]
  }
  // If no angle brackets, check if the whole thing is an email
  if (fromHeader.includes("@")) {
    return fromHeader.trim()
  }
  return null
}

export async function findPersonEmail(
  accessToken: string,
  name: string
): Promise<{ email: string; name: string } | null> {
  // First, search for emails FROM this person
  const fromResults = await searchEmails(accessToken, `from:${name}`, 5)
  if (fromResults.length > 0) {
    const email = extractEmailFromHeader(fromResults[0].from)
    if (email) {
      return { email, name: fromResults[0].from.replace(/<[^>]+>/, "").trim() }
    }
  }

  // If not found, search for emails TO this person (in sent mail)
  const toResults = await searchEmails(accessToken, `to:${name}`, 5)
  if (toResults.length > 0) {
    // For sent emails, we need to get the full message to find the To header
    const gmail = getGmailClient(accessToken)
    const detail = await gmail.users.messages.get({
      userId: "me",
      id: toResults[0].id,
      format: "metadata",
      metadataHeaders: ["To"],
    })
    const toHeader = extractHeader(detail.data.payload?.headers || [], "To")
    const email = extractEmailFromHeader(toHeader)
    if (email) {
      return { email, name: toHeader.replace(/<[^>]+>/, "").trim() }
    }
  }

  return null
}

// Encode message for Gmail API (RFC 2822 format, base64url encoded)
function encodeMessage(message: string): string {
  return Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

// Send an email
export async function sendEmail(
  accessToken: string,
  to: string,
  subject: string,
  body: string,
  threadId?: string
): Promise<{ id: string; threadId: string }> {
  const gmail = getGmailClient(accessToken)

  const message = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    body
  ].join("\n")

  const response = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encodeMessage(message),
      threadId: threadId
    }
  })

  return { id: response.data.id!, threadId: response.data.threadId! }
}

// Create an email draft
export async function createDraft(
  accessToken: string,
  to: string,
  subject: string,
  body: string
): Promise<{ id: string; draftId: string }> {
  const gmail = getGmailClient(accessToken)

  const message = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    body
  ].join("\n")

  const response = await gmail.users.drafts.create({
    userId: "me",
    requestBody: {
      message: { raw: encodeMessage(message) }
    }
  })

  return { id: response.data.message!.id!, draftId: response.data.id! }
}

// Send a reply to an email thread with proper threading headers
export async function sendReply(
  accessToken: string,
  originalEmail: EmailMessage,
  replyBody: string
): Promise<{ id: string; threadId: string }> {
  const gmail = getGmailClient(accessToken)

  // Extract the sender's email for replying
  const toEmail = extractEmailFromHeader(originalEmail.from) || originalEmail.from

  // Create reply subject (add Re: if not already present)
  const replySubject = originalEmail.subject.startsWith("Re:")
    ? originalEmail.subject
    : `Re: ${originalEmail.subject}`

  const message = [
    `To: ${toEmail}`,
    `Subject: ${replySubject}`,
    `In-Reply-To: ${originalEmail.id}`,
    `References: ${originalEmail.id}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    replyBody
  ].join("\n")

  const response = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encodeMessage(message),
      threadId: originalEmail.threadId
    }
  })

  return { id: response.data.id!, threadId: response.data.threadId! }
}

// Set up Gmail push notifications via Pub/Sub
export async function setupGmailWatch(
  accessToken: string,
  topicName: string,
  labelIds: string[] = ["INBOX"]
): Promise<{ historyId: string; expiration: string }> {
  const gmail = getGmailClient(accessToken)

  const response = await gmail.users.watch({
    userId: "me",
    requestBody: {
      topicName,
      labelIds,
    },
  })

  return {
    historyId: response.data.historyId!,
    expiration: response.data.expiration!,
  }
}

// Stop Gmail push notifications
export async function stopGmailWatch(accessToken: string): Promise<void> {
  const gmail = getGmailClient(accessToken)
  await gmail.users.stop({ userId: "me" })
}

// Get new messages since a history ID
export async function getNewMessagesSinceHistoryId(
  accessToken: string,
  startHistoryId: string
): Promise<EmailMessage[]> {
  const gmail = getGmailClient(accessToken)

  try {
    const response = await gmail.users.history.list({
      userId: "me",
      startHistoryId,
      historyTypes: ["messageAdded"],
    })

    const history = response.data.history || []
    const messageIds = new Set<string>()

    for (const h of history) {
      if (h.messagesAdded) {
        for (const msg of h.messagesAdded) {
          if (msg.message?.id) {
            messageIds.add(msg.message.id)
          }
        }
      }
    }

    // Fetch full content for each new message
    const messages: EmailMessage[] = []
    for (const msgId of messageIds) {
      const email = await getEmailContent(accessToken, msgId)
      messages.push(email)
    }

    return messages
  } catch (error: any) {
    // If history is too old, Gmail returns 404
    if (error.code === 404) {
      console.warn("History ID expired, need to resync")
      return []
    }
    throw error
  }
}

// Create or get a label
export async function getOrCreateLabel(
  accessToken: string,
  labelName: string
): Promise<string> {
  const gmail = getGmailClient(accessToken)

  // First, try to find existing label
  const labelsResponse = await gmail.users.labels.list({ userId: "me" })
  const existingLabel = labelsResponse.data.labels?.find(
    (l) => l.name === labelName
  )

  if (existingLabel) {
    return existingLabel.id!
  }

  // Create new label
  const createResponse = await gmail.users.labels.create({
    userId: "me",
    requestBody: {
      name: labelName,
      labelListVisibility: "labelShow",
      messageListVisibility: "show",
    },
  })

  return createResponse.data.id!
}

// Add label to a message
export async function addLabelToMessage(
  accessToken: string,
  messageId: string,
  labelId: string
): Promise<void> {
  const gmail = getGmailClient(accessToken)

  await gmail.users.messages.modify({
    userId: "me",
    id: messageId,
    requestBody: {
      addLabelIds: [labelId],
    },
  })
}

// Remove label from a message
export async function removeLabelFromMessage(
  accessToken: string,
  messageId: string,
  labelId: string
): Promise<void> {
  const gmail = getGmailClient(accessToken)

  await gmail.users.messages.modify({
    userId: "me",
    id: messageId,
    requestBody: {
      removeLabelIds: [labelId],
    },
  })
}

// Mark a course question as answered
export async function markQuestionAnswered(
  accessToken: string,
  messageId: string,
  courseId: string
): Promise<void> {
  const pendingLabelId = await getOrCreateLabel(
    accessToken,
    `CourseAssistant/${courseId}/Pending`
  )
  const answeredLabelId = await getOrCreateLabel(
    accessToken,
    `CourseAssistant/${courseId}/Answered`
  )

  const gmail = getGmailClient(accessToken)
  await gmail.users.messages.modify({
    userId: "me",
    id: messageId,
    requestBody: {
      addLabelIds: [answeredLabelId],
      removeLabelIds: [pendingLabelId],
    },
  })
}

// Mark a question as pending (waiting for professor)
export async function markQuestionPending(
  accessToken: string,
  messageId: string,
  courseId: string
): Promise<void> {
  const pendingLabelId = await getOrCreateLabel(
    accessToken,
    `CourseAssistant/${courseId}/Pending`
  )

  await addLabelToMessage(accessToken, messageId, pendingLabelId)
}
