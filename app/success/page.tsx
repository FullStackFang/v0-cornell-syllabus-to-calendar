import Link from "next/link"
import { CheckCircle, Calendar, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DashboardHeader } from "@/components/dashboard-header"

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader userName="Cornell Student" userEmail="student@cornell.edu" />

      <main className="max-w-xl mx-auto px-6 py-20">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>

          <h1 className="text-2xl font-semibold text-foreground">Calendar File Downloaded</h1>
          <p className="text-muted-foreground mt-2">Import the .ics file into your calendar app to add all events.</p>

          <div className="mt-8 p-6 rounded-2xl bg-card border border-border text-left">
            <h2 className="font-medium text-foreground mb-4">How to Import</h2>
            <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside">
              <li>Open Google Calendar, Apple Calendar, or Outlook</li>
              <li>Look for "Import" or "Add calendar" option</li>
              <li>Select the downloaded .ics file</li>
              <li>Choose which calendar to add the events to</li>
            </ol>
          </div>

          <div className="mt-8 flex flex-col gap-3">
            <Button asChild size="lg" className="w-full">
              <a
                href="https://calendar.google.com/calendar/r/settings/export"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Open Google Calendar Import
              </a>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full bg-transparent">
              <Link href="/dashboard">
                <Plus className="w-4 h-4 mr-2" />
                Process Another Syllabus
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
