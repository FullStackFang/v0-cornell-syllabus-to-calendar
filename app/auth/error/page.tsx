"use client"

import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Calendar, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

function AuthErrorContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const message = searchParams.get("message") || "An authentication error occurred"

  const friendlyMessage = message.includes("expired")
    ? "Your magic link has expired. Magic links are valid for 1 hour."
    : message.includes("PKCE")
    ? "Your sign-in session expired. Please request a new magic link."
    : message

  return (
    <div className="min-h-screen bg-gradient-warm flex flex-col relative overflow-hidden">
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/60 shrink-0 relative z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-soft">
              <Calendar className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg text-foreground tracking-tight">Syllabus Agent</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 relative z-10">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-semibold mb-2">Sign in failed</h1>
          <p className="text-muted-foreground mb-6">{friendlyMessage}</p>
          <Button onClick={() => router.push("/")} className="rounded-full">
            Try again
          </Button>
        </div>
      </main>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-warm flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  )
}
