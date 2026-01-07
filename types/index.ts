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
}

export interface UploadedSyllabus {
  id: string
  courseName: string
  uploadDate: string
  eventsCreated: number
  data: SyllabusData
}
