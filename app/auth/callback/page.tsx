"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createClient()

      // With implicit flow, Supabase automatically detects tokens in URL hash
      // via detectSessionInUrl: true - just check if we have a session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        setError(sessionError.message)
        return
      }

      if (session) {
        // Success! Redirect to home
        router.push("/")
        return
      }

      // Check URL for errors
      if (typeof window !== "undefined") {
        const hash = window.location.hash
        const searchParams = new URLSearchParams(window.location.search)

        // Check query params for error
        const queryError = searchParams.get("error_description") || searchParams.get("error")
        if (queryError) {
          setError(queryError)
          return
        }

        // Check hash for error
        if (hash) {
          const hashParams = new URLSearchParams(hash.substring(1))
          const hashError = hashParams.get("error_description") || hashParams.get("error")
          if (hashError) {
            setError(hashError)
            return
          }
        }
      }

      // No session and no error - something went wrong
      setError("Unable to sign in. Please try again.")
    }

    // Small delay to let Supabase process the URL
    setTimeout(handleCallback, 100)
  }, [router])

  useEffect(() => {
    if (error) {
      router.push(`/auth/error?message=${encodeURIComponent(error)}`)
    }
  }, [error, router])

  return (
    <div className="min-h-screen bg-gradient-warm flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
        <p className="text-muted-foreground font-medium">Signing you in...</p>
      </div>
    </div>
  )
}
