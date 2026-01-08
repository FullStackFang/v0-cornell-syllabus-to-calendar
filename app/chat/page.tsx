"use client"

import { useSession, signOut } from "next-auth/react"
import { ChatInterface } from "@/components/chat-interface"
import { Button } from "@/components/ui/button"
import { LogOut, Calendar, ArrowLeft } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function ChatPage() {
  const { data: session } = useSession()

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="border-b border-gray-200 dark:border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Dashboard</span>
            </Link>
            <div className="h-4 w-px bg-gray-200 dark:bg-gray-800" />
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <span className="font-semibold">Syllabus Agent</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {session?.user && (
              <>
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
                  <span className="text-sm text-muted-foreground hidden sm:inline">
                    {session.user.email}
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden max-w-4xl mx-auto w-full">
        <ChatInterface />
      </main>
    </div>
  )
}
