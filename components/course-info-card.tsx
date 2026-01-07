"use client"

import type React from "react"

import { useState } from "react"
import { Pencil, Check, X, User, Mail, BookOpen, Hash } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { Course } from "@/types"

interface CourseInfoCardProps {
  course: Course
  onUpdate: (course: Course) => void
}

export function CourseInfoCard({ course, onUpdate }: CourseInfoCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedCourse, setEditedCourse] = useState(course)

  const handleSave = () => {
    onUpdate(editedCourse)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedCourse(course)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">Course Information</h2>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={handleCancel}>
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Check className="w-4 h-4 mr-1" />
              Save
            </Button>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="courseName" className="text-sm font-medium text-muted-foreground mb-1.5 block">
              Course Name
            </label>
            <Input
              id="courseName"
              value={editedCourse.name}
              onChange={(e) => setEditedCourse({ ...editedCourse, name: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="courseCode" className="text-sm font-medium text-muted-foreground mb-1.5 block">
              Course Code
            </label>
            <Input
              id="courseCode"
              value={editedCourse.code}
              onChange={(e) => setEditedCourse({ ...editedCourse, code: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="instructor" className="text-sm font-medium text-muted-foreground mb-1.5 block">
              Instructor
            </label>
            <Input
              id="instructor"
              value={editedCourse.instructor}
              onChange={(e) => setEditedCourse({ ...editedCourse, instructor: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="email" className="text-sm font-medium text-muted-foreground mb-1.5 block">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={editedCourse.email}
              onChange={(e) => setEditedCourse({ ...editedCourse, email: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="semester" className="text-sm font-medium text-muted-foreground mb-1.5 block">
              Semester
            </label>
            <Input
              id="semester"
              value={editedCourse.semester}
              onChange={(e) => setEditedCourse({ ...editedCourse, semester: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="credits" className="text-sm font-medium text-muted-foreground mb-1.5 block">
              Credits
            </label>
            <Input
              id="credits"
              type="number"
              value={editedCourse.credits}
              onChange={(e) => setEditedCourse({ ...editedCourse, credits: Number(e.target.value) })}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-foreground">Course Information</h2>
        <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
          <Pencil className="w-4 h-4 mr-1" />
          Edit
        </Button>
      </div>
      <div className="grid sm:grid-cols-2 gap-6">
        <InfoRow icon={<BookOpen className="w-4 h-4" />} label="Course Name" value={course.name} />
        <InfoRow icon={<Hash className="w-4 h-4" />} label="Course Code" value={course.code} />
        <InfoRow icon={<User className="w-4 h-4" />} label="Instructor" value={course.instructor} />
        <InfoRow icon={<Mail className="w-4 h-4" />} label="Email" value={course.email} />
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium text-foreground">{value}</p>
      </div>
    </div>
  )
}
