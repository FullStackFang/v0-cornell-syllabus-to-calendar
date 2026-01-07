import type React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FileText, Sparkles, Calendar } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Calendar className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">Syllabus Agent</span>
          </div>
          <Button asChild size="sm" variant="ghost">
            <Link href="/dashboard">Sign In</Link>
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI-Powered for Cornell EMBA</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-semibold tracking-tight text-foreground text-balance leading-tight">
            Turn your syllabi into <span className="text-primary">calendar events</span>
          </h1>

          <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto text-pretty leading-relaxed">
            Upload a PDF, let AI extract all the important dates, and sync everything to Google Calendar in seconds.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="h-12 px-8 text-base rounded-full">
              <Link href="/dashboard">
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </Link>
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="max-w-4xl mx-auto mt-32">
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={<FileText className="w-6 h-6" />}
              title="Upload Syllabus"
              description="Drag and drop any course syllabus PDF. We support all standard formats."
            />
            <FeatureCard
              icon={<Sparkles className="w-6 h-6" />}
              title="AI Extraction"
              description="Claude AI intelligently parses dates, assignments, and class schedules."
            />
            <FeatureCard
              icon={<Calendar className="w-6 h-6" />}
              title="Auto Calendar"
              description="Events are automatically created in your Google Calendar with reminders."
            />
          </div>
        </div>

        {/* How it works */}
        <div className="max-w-2xl mx-auto mt-32">
          <h2 className="text-2xl font-semibold text-center text-foreground mb-12">How it works</h2>
          <div className="space-y-8">
            <Step
              number="1"
              title="Sign in with Google"
              description="Connect your Google account to enable calendar access."
            />
            <Step
              number="2"
              title="Upload your syllabus"
              description="Drop your PDF and watch AI analyze it in seconds."
            />
            <Step number="3" title="Review and edit" description="Fine-tune any extracted data before syncing." />
            <Step
              number="4"
              title="Sync to calendar"
              description="All events appear in your Google Calendar instantly."
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <span>Built for Cornell EMBA Students</span>
          <span>Powered by Claude AI</span>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-6 rounded-2xl bg-card border border-border hover:border-primary/20 transition-colors">
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}

function Step({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="flex gap-4">
      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold shrink-0">
        {number}
      </div>
      <div>
        <h3 className="font-medium text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  )
}
