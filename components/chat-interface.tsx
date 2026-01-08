"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChatMessage } from "@/components/chat-message"
import { Send, Paperclip, Loader2 } from "lucide-react"
import type { Message } from "ai"
import type { SyllabusData } from "@/types"

interface ChatInterfaceProps {
  onFileUpload?: (file: File) => void
  onFindEmails?: (syllabus: SyllabusData) => void
}

export function ChatInterface({ onFileUpload, onFindEmails }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

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
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      })

      if (!response.ok) {
        throw new Error("Failed to get response")
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ""

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "",
      }

      setMessages((prev) => [...prev, assistantMessage])

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split("\n")

          for (const line of lines) {
            if (line.startsWith("0:")) {
              try {
                const text = JSON.parse(line.slice(2))
                assistantContent += text
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessage.id
                      ? { ...msg, content: assistantContent }
                      : msg
                  )
                )
              } catch {
                // Skip parsing errors
              }
            }
          }
        }
      }
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
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="bg-primary/10 rounded-full p-4 mb-4">
              <Send className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Syllabus Calendar Agent</h3>
            <p className="text-muted-foreground max-w-md">
              Upload a syllabus PDF or ask me to help with your course schedule. I can create
              calendar events, search your emails for course-related content, and more.
            </p>
            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-4 w-4 mr-2" />
                Upload Syllabus
              </Button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} onFindEmails={onFindEmails} />
            ))}
            {isLoading && (
              <div className="flex gap-3 p-4 bg-gray-50 dark:bg-gray-900">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-600 dark:text-gray-300" />
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  Thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 dark:border-gray-800 p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
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
          <Button type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
