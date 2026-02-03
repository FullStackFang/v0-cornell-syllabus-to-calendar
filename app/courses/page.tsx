"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/providers"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import {
  Calendar,
  ArrowLeft,
  Plus,
  Copy,
  Check,
  BookOpen,
  Loader2,
  MoreVertical,
  Trash2,
  Settings,
  Mail,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { CourseFlowCourse } from "@/types"

export default function CoursesPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()

  const [courses, setCourses] = useState<CourseFlowCourse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CourseFlowCourse | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    course_code: "",
    semester: "",
  })

  // Fetch courses
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await fetch("/api/courses")
        if (res.ok) {
          const data = await res.json()
          setCourses(data.courses)
        }
      } catch (err) {
        console.error("Failed to fetch courses:", err)
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      fetchCourses()
    }
  }, [user])

  // Copy plus address to clipboard
  const copyPlusAddress = async (course: CourseFlowCourse) => {
    try {
      await navigator.clipboard.writeText(course.plus_address)
      setCopiedId(course.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  // Create course
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsCreating(true)

    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to create course")
        return
      }

      setCourses((prev) => [data.course, ...prev])
      setIsDialogOpen(false)
      setFormData({ name: "", course_code: "", semester: "" })
    } catch (err) {
      console.error("Failed to create course:", err)
      setError("Failed to create course")
    } finally {
      setIsCreating(false)
    }
  }

  // Delete (archive) course
  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)

    try {
      const res = await fetch(`/api/courses/${deleteTarget.id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        setCourses((prev) => prev.filter((c) => c.id !== deleteTarget.id))
      }
    } catch (err) {
      console.error("Failed to delete course:", err)
    } finally {
      setIsDeleting(false)
      setDeleteTarget(null)
    }
  }

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-warm flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-muted-foreground font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  // Not signed in
  if (!user) {
    router.push("/")
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-warm">
      {/* Header */}
      <header className="bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
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
                <BookOpen className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-lg text-foreground tracking-tight">
                Courses
              </span>
            </div>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                New Course
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Course</DialogTitle>
                <DialogDescription>
                  Add a new course to start managing student communications.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Course Name</Label>
                    <Input
                      id="name"
                      placeholder="Introduction to Computer Science"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, name: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="course_code">Course Code</Label>
                    <Input
                      id="course_code"
                      placeholder="CS101"
                      value={formData.course_code}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          course_code: e.target.value,
                        }))
                      }
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      This will be used in your plus-address for student emails
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="semester">Semester</Label>
                    <Input
                      id="semester"
                      placeholder="Spring 2026"
                      value={formData.semester}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          semester: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreating}>
                    {isCreating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Course"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No courses yet</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Create your first course to start managing student communications
              with AI-powered assistance.
            </p>
            <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Your First Course
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <div
                key={course.id}
                className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-colors"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg leading-tight mb-1">
                        {course.name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-mono bg-muted px-2 py-0.5 rounded">
                          {course.course_code}
                        </span>
                        <span>{course.semester}</span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(`/courses/${course.id}/settings`)
                          }
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Settings
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteTarget(course)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Archive
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Plus Address */}
                  <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-mono truncate">
                          {course.plus_address}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => copyPlusAddress(course)}
                      >
                        {copiedId === course.id ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Share this address with students for course emails
                    </p>
                  </div>

                  {/* Quick Stats Placeholder */}
                  <div className="mt-4 pt-4 border-t border-border flex items-center gap-4 text-sm text-muted-foreground">
                    <span>0 emails</span>
                    <span>0 FAQ entries</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this course?</AlertDialogTitle>
            <AlertDialogDescription>
              This will archive &quot;{deleteTarget?.name}&quot;. The course data will be
              preserved but it won&apos;t appear in your active courses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Archiving...
                </>
              ) : (
                "Archive"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
