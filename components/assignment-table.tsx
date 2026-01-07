"use client"

import { useState } from "react"
import { Plus, Trash2, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Assignment } from "@/types"

interface AssignmentTableProps {
  assignments: Assignment[]
  onUpdate: (assignments: Assignment[]) => void
}

const typeColors: Record<string, string> = {
  homework: "bg-blue-500/10 text-blue-600",
  exam: "bg-red-500/10 text-red-600",
  project: "bg-green-500/10 text-green-600",
  quiz: "bg-yellow-500/10 text-yellow-600",
  participation: "bg-purple-500/10 text-purple-600",
}

export function AssignmentTable({ assignments, onUpdate }: AssignmentTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null)

  const handleUpdate = (id: string, field: keyof Assignment, value: string | null) => {
    const updated = assignments.map((a) => (a.id === id ? { ...a, [field]: value } : a))
    onUpdate(updated)
  }

  const handleDelete = (id: string) => {
    onUpdate(assignments.filter((a) => a.id !== id))
  }

  const handleAdd = () => {
    const newAssignment: Assignment = {
      id: `assignment-${Date.now()}`,
      name: "New Assignment",
      type: "homework",
      dueDate: null,
      weight: "10%",
      description: "",
    }
    onUpdate([...assignments, newAssignment])
    setEditingId(newAssignment.id)
  }

  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">Assignments</h2>
        <Button size="sm" variant="outline" onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-1" />
          Add Assignment
        </Button>
      </div>

      {assignments.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          <p>No assignments found</p>
          <p className="text-sm mt-1">Click "Add Assignment" to create one</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {assignments.map((assignment) => (
            <div key={assignment.id} className="p-4 hover:bg-muted/50 transition-colors group">
              {editingId === assignment.id ? (
                <div className="grid gap-3">
                  <Input
                    placeholder="Assignment name"
                    value={assignment.name}
                    onChange={(e) => handleUpdate(assignment.id, "name", e.target.value)}
                  />
                  <div className="grid sm:grid-cols-3 gap-3">
                    <Select
                      value={assignment.type}
                      onValueChange={(value) => handleUpdate(assignment.id, "type", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="homework">Homework</SelectItem>
                        <SelectItem value="exam">Exam</SelectItem>
                        <SelectItem value="project">Project</SelectItem>
                        <SelectItem value="quiz">Quiz</SelectItem>
                        <SelectItem value="participation">Participation</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="date"
                      value={assignment.dueDate || ""}
                      onChange={(e) => handleUpdate(assignment.id, "dueDate", e.target.value || null)}
                    />
                    <Input
                      placeholder="Weight (e.g., 20%)"
                      value={assignment.weight}
                      onChange={(e) => handleUpdate(assignment.id, "weight", e.target.value)}
                    />
                  </div>
                  <div className="flex gap-3">
                    <Input
                      placeholder="Description"
                      value={assignment.description}
                      onChange={(e) => handleUpdate(assignment.id, "description", e.target.value)}
                      className="flex-1"
                    />
                    <Button size="sm" onClick={() => setEditingId(null)}>
                      Done
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p
                        className="font-medium text-foreground cursor-pointer hover:text-primary transition-colors"
                        onClick={() => setEditingId(assignment.id)}
                      >
                        {assignment.name}
                      </p>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColors[assignment.type] || "bg-muted text-muted-foreground"}`}
                      >
                        {assignment.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      {assignment.dueDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(assignment.dueDate).toLocaleDateString()}
                        </span>
                      )}
                      <span>{assignment.weight}</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(assignment.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
