"use client"

import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChatMessage } from "@/components/chat-message"
import { Send, Paperclip, Loader2, MessageSquare } from "lucide-react"
import type { Message } from "ai"
import type { SyllabusData, EmailMessage } from "@/types"

interface ChatInterfaceProps {
  onFileUpload?: (file: File) => void
  onFindEmails?: (syllabus: SyllabusData) => void
  onEmailSelect?: (email: EmailMessage) => void
  onSyllabusData?: (syllabus: SyllabusData) => void
  syllabusData?: SyllabusData | null
}

export interface ChatInterfaceHandle {
  sendMessage: (content: string) => Promise<void>
}

export const ChatInterface = forwardRef<ChatInterfaceHandle, ChatInterfaceProps>(function ChatInterface(
  { onFileUpload, onFindEmails, onEmailSelect, onSyllabusData, syllabusData },
  ref
) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const prevMessageCountRef = useRef(0)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  // Only scroll when message count actually increases (new message added)
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      scrollToBottom()
    }
    prevMessageCountRef.current = messages.length
  }, [messages.length, scrollToBottom])

  // Programmatic message sending (exposed via ref)
  const sendMessageProgrammatically = useCallback(async (content: string) => {
    if (isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMessage], syllabusData }),
      })

      if (!response.ok) {
        throw new Error("Failed to get response")
      }

      const data = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.text || "",
        toolInvocations: data.toolInvocations,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error("Chat error:", error)
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, messages, syllabusData])

  // Expose sendMessage via ref
  useImperativeHandle(ref, () => ({
    sendMessage: sendMessageProgrammatically,
  }), [sendMessageProgrammatically])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMessage], syllabusData }),
      })

      if (!response.ok) {
        throw new Error("Failed to get response")
      }

      const data = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.text || "",
        toolInvocations: data.toolInvocations,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error("Chat error:", error)
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== "application/pdf") {
      alert("Please upload a PDF file")
      return
    }

    onFileUpload?.(file)

    // Show user message about the upload
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: `I've uploaded a syllabus PDF: "${file.name}". Please parse it and extract the course information.`,
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    try {
      // Upload PDF to server for parsing
      const formData = new FormData()
      formData.append("file", file)

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!uploadRes.ok) {
        throw new Error("Failed to process syllabus")
      }

      const uploadData = await uploadRes.json()
      const syllabusData = uploadData.data

      // Notify parent about syllabus data
      onSyllabusData?.(syllabusData)

      // Format the parsed data as an assistant response
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `I've successfully parsed the syllabus! Here's what I found:\n\n**Course:** ${syllabusData.course.code} - ${syllabusData.course.name}\n**Instructor:** ${syllabusData.course.instructor}\n**Semester:** ${syllabusData.course.semester}\n**Credits:** ${syllabusData.course.credits}\n\n**Schedule:** ${syllabusData.schedule.length} class sessions found\n**Assignments:** ${syllabusData.assignments.length} assignments/exams found\n\nYou can ask me to create calendar events, search for related emails, or get more details about specific assignments.`,
        toolInvocations: [
          {
            state: "result" as const,
            toolCallId: `upload-${Date.now()}`,
            toolName: "parse_syllabus",
            args: { fileName: file.name },
            result: { success: true, data: syllabusData },
          },
        ],
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error("Upload error:", error)
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Sorry, I couldn't process that PDF. Please make sure it's a valid syllabus document and try again.",
        },
      ])
    } finally {
      setIsLoading(false)
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="flex flex-col h-full min-w-0 bg-gradient-warm">
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-6 shadow-soft">
              <MessageSquare className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-2xl font-display font-semibold text-foreground mb-3">Syllabus Calendar Agent</h3>
            <p className="text-muted-foreground max-w-md leading-relaxed mb-8">
              Upload a syllabus PDF or ask me to help with your course schedule. I can create
              calendar events, search your emails for course-related content, and more.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="rounded-full px-6"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-4 w-4 mr-2" />
                Upload Syllabus
              </Button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {messages.map((message, index) => (
              <div key={message.id} className="animate-fade-in-up" style={{ animationDelay: `${index * 50}ms` }}>
                <ChatMessage message={message} onFindEmails={onFindEmails} onEmailSelect={onEmailSelect} />
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-4 p-6 bg-card/50">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary shadow-soft">
                  <Loader2 className="h-5 w-5 animate-spin text-secondary-foreground" />
                </div>
                <div className="flex items-center text-sm text-muted-foreground font-medium">
                  Thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="border-t border-border/50 p-4 bg-background/80 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="flex gap-3 max-w-4xl mx-auto">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your syllabus, search emails, or create calendar events..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !input.trim()} className="shrink-0 px-5">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <span className="hidden sm:inline mr-2">Send</span>
                <Send className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  )
})
