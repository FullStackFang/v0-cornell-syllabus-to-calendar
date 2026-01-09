export interface Course {
  name: string
  code: string
  instructor: string
  email: string
  semester: string
  credits: number
}

export interface ClassSession {
  id: string
  date: string
  time: string
  duration_hours: number
  topic: string
  location: string
}

export interface Assignment {
  id: string
  name: string
  type: "homework" | "exam" | "project" | "quiz" | "participation"
  dueDate: string | null
  weight: string
  description: string
}

export interface SyllabusData {
  course: Course
  schedule: ClassSession[]
  assignments: Assignment[]
  gradingBreakdown: Record<string, string>
}

export interface CalendarEvent {
  title: string
  description?: string
  startDate: string
  startTime?: string
  endDate?: string
  endTime?: string
  location?: string
  attendees?: string[]
}

export interface UploadedSyllabus {
  id: string
  courseName: string
  uploadDate: string
  eventsCreated: number
  data: SyllabusData
}

// Email categorization types
export type EmailCategory = 'assignments' | 'announcements' | 'schedule_changes' | 'general'

export interface EmailMessage {
  id: string
  threadId: string
  subject: string
  from: string
  date: string
  snippet: string
  body?: string
}

export interface CategorizedEmail {
  email: EmailMessage
  category: EmailCategory
  matchedKeywords: string[]
}

export interface GroupedEmails {
  assignments: CategorizedEmail[]
  announcements: CategorizedEmail[]
  schedule_changes: CategorizedEmail[]
  general: CategorizedEmail[]
}
