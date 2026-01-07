import Link from "next/link"
import { FileText, Calendar, ChevronRight } from "lucide-react"
import type { UploadedSyllabus } from "@/types"

interface SyllabusCardProps {
  syllabus: UploadedSyllabus
}

export function SyllabusCard({ syllabus }: SyllabusCardProps) {
  return (
    <Link
      href={`/review?id=${syllabus.id}`}
      className="group flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/30 hover:bg-muted/50 transition-all"
    >
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <FileText className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-foreground truncate">{syllabus.courseName}</h3>
        <p className="text-sm text-muted-foreground">Uploaded {new Date(syllabus.uploadDate).toLocaleDateString()}</p>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Calendar className="w-4 h-4" />
        <span>{syllabus.eventsCreated} events</span>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
    </Link>
  )
}
