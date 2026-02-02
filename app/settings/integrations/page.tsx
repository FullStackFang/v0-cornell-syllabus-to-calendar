"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/providers"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Calendar,
  Mail,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  ExternalLink,
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Integration {
  provider: string
  name: string
  description: string
  status: "connected" | "paused" | "disconnected"
  connected_at: string | null
}

export default function IntegrationsPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [isLoadingIntegrations, setIsLoadingIntegrations] = useState(true)
  const [isTogglingGmail, setIsTogglingGmail] = useState(false)
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  // Handle URL parameters (success/error from OAuth callback)
  const success = searchParams.get("success")
  const error = searchParams.get("error")
  const expectedEmail = searchParams.get("expected")
  const gotEmail = searchParams.get("got")

  // Fetch integrations on load
  useEffect(() => {
    const fetchIntegrations = async () => {
      try {
        const res = await fetch("/api/integrations")
        if (res.ok) {
          const data = await res.json()
          setIntegrations(data.integrations)
        }
      } catch (error) {
        console.error("Failed to fetch integrations:", error)
      } finally {
        setIsLoadingIntegrations(false)
      }
    }

    if (user) {
      fetchIntegrations()
    }
  }, [user])

  // Get Gmail integration status
  const gmailIntegration = integrations.find(i => i.provider === "gmail")
  const isGmailConnected = gmailIntegration?.status === "connected"
  const isGmailPaused = gmailIntegration?.status === "paused"

  const handleConnectGmail = () => {
    // Redirect to Gmail OAuth
    window.location.href = "/api/integrations/gmail/connect"
  }

  const handleToggleGmail = async () => {
    setIsTogglingGmail(true)
    try {
      const res = await fetch("/api/integrations/gmail/toggle", {
        method: "POST",
      })

      if (res.ok) {
        const data = await res.json()
        setIntegrations(prev =>
          prev.map(i =>
            i.provider === "gmail" ? { ...i, status: data.status } : i
          )
        )
      }
    } catch (error) {
      console.error("Failed to toggle Gmail:", error)
    } finally {
      setIsTogglingGmail(false)
    }
  }

  const handleDisconnectGmail = async () => {
    setIsDisconnecting(true)
    try {
      const res = await fetch("/api/integrations/gmail/disconnect", {
        method: "POST",
      })

      if (res.ok) {
        setIntegrations(prev =>
          prev.map(i =>
            i.provider === "gmail" ? { ...i, status: "disconnected", connected_at: null } : i
          )
        )
        setShowDisconnectDialog(false)
      }
    } catch (error) {
      console.error("Failed to disconnect Gmail:", error)
    } finally {
      setIsDisconnecting(false)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-warm flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-muted-foreground font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  // Not signed in - redirect to home
  if (!user) {
    router.push("/")
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-warm">
      {/* Header */}
      <header className="bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-soft">
              <Calendar className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg text-foreground tracking-tight">Settings</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold mb-2">Integrations</h1>
          <p className="text-muted-foreground">
            Connect external services to enhance your experience
          </p>
        </div>

        {/* Success/Error Messages */}
        {success === "gmail_connected" && (
          <div className="mb-6 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-green-800 dark:text-green-200">Gmail connected successfully</p>
              <p className="text-sm text-green-700 dark:text-green-300">
                You can now search emails and use email-related features.
              </p>
            </div>
          </div>
        )}

        {error === "email_mismatch" && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800 dark:text-red-200">Email mismatch</p>
              <p className="text-sm text-red-700 dark:text-red-300">
                You signed in with <span className="font-medium">{gotEmail}</span>, but your account email is{" "}
                <span className="font-medium">{expectedEmail}</span>. Please connect the same Gmail account.
              </p>
            </div>
          </div>
        )}

        {error && error !== "email_mismatch" && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800 dark:text-red-200">Connection failed</p>
              <p className="text-sm text-red-700 dark:text-red-300">
                {error.replace(/_/g, " ")}. Please try again.
              </p>
            </div>
          </div>
        )}

        {/* Gmail Integration Card */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                <Mail className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-lg font-semibold">Gmail</h3>
                  {isGmailConnected && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                      Connected
                    </span>
                  )}
                  {isGmailPaused && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300">
                      Paused
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground text-sm mb-4">
                  Search and access your emails to find course-related communications.
                  Required for email search features.
                </p>

                {isLoadingIntegrations ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Loading...</span>
                  </div>
                ) : isGmailConnected || isGmailPaused ? (
                  <div className="space-y-4">
                    {/* Toggle for pausing */}
                    <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-muted/50">
                      <div>
                        <p className="text-sm font-medium">Email monitoring</p>
                        <p className="text-xs text-muted-foreground">
                          {isGmailConnected ? "Active - emails can be searched" : "Paused - email features disabled"}
                        </p>
                      </div>
                      <Switch
                        checked={isGmailConnected}
                        onCheckedChange={handleToggleGmail}
                        disabled={isTogglingGmail}
                      />
                    </div>

                    {/* Connected info */}
                    {gmailIntegration?.connected_at && (
                      <p className="text-xs text-muted-foreground">
                        Connected on {new Date(gmailIntegration.connected_at).toLocaleDateString()}
                      </p>
                    )}

                    {/* Disconnect link */}
                    <button
                      onClick={() => setShowDisconnectDialog(true)}
                      className="text-sm text-destructive hover:underline"
                    >
                      Disconnect Gmail
                    </button>
                  </div>
                ) : (
                  <Button onClick={handleConnectGmail} className="gap-2">
                    <ExternalLink className="w-4 h-4" />
                    Connect Gmail
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Permissions info */}
          <div className="px-6 py-4 bg-muted/30 border-t border-border">
            <p className="text-xs text-muted-foreground">
              <strong>Permissions requested:</strong> Read emails, send emails on your behalf.
              We only access emails when you explicitly search for them.
            </p>
          </div>
        </div>

        {/* Future integrations placeholder */}
        <div className="mt-8 text-center text-muted-foreground text-sm">
          <p>More integrations coming soon: Google Calendar, Canvas LMS</p>
        </div>
      </main>

      {/* Disconnect Confirmation Dialog */}
      <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Gmail?</AlertDialogTitle>
            <AlertDialogDescription>
              This will revoke access to your Gmail account. Email search and related features
              will be disabled until you reconnect.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDisconnecting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnectGmail}
              disabled={isDisconnecting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDisconnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                "Disconnect"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
