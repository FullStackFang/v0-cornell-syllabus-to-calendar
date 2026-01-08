"use client"

import { useSession, signOut } from "next-auth/react"
import { ChatInterface } from "@/components/chat-interface"
import { Button } from "@/components/ui/button"
import { Calendar, LogOut } from "lucide-react"
import Image from "next/image"

export default function DashboardPage() {
  const { data: session } = useSession()

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border shrink-0">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Calendar className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">Syllabus Agent</span>
          </div>
          {session?.user && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {session.user.image && (
                  <Image
                    src={session.user.image}
                    alt={session.user.name || "User"}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                )}
                <div className="hidden sm:block">
                  <div className="text-sm font-medium">{session.user.name}</div>
                  <div className="text-xs text-muted-foreground">{session.user.email}</div>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => signOut({ callbackUrl: "/" })}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Chat Interface - Full Height */}
      <main className="flex-1 overflow-hidden max-w-4xl mx-auto w-full">
        <ChatInterface />
      </main>
    </div>
  )
}
