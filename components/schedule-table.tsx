"use client"

import { useState } from "react"
import { Plus, Trash2, MapPin, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { ClassSession } from "@/types"

interface ScheduleTableProps {
  sessions: ClassSession[]
  onUpdate: (sessions: ClassSession[]) => void
}

export function ScheduleTable({ sessions, onUpdate }: ScheduleTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null)

  const handleUpdate = (id: string, field: keyof ClassSession, value: string | number) => {
    const updated = sessions.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    onUpdate(updated)
  }

  const handleDelete = (id: string) => {
    onUpdate(sessions.filter((s) => s.id !== id))
  }

  const handleAdd = () => {
    const newSession: ClassSession = {
      id: `session-${Date.now()}`,
      date: new Date().toISOString().split("T")[0],
      time: "09:00:00",
      duration_hours: 2,
      topic: "New Session",
      location: "TBD",
    }
    onUpdate([...sessions, newSession])
    setEditingId(newSession.id)
  }

  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">Class Schedule</h2>
        <Button size="sm" variant="outline" onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-1" />
          Add Session
        </Button>
      </div>

      {sessions.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          <p>No class sessions found</p>
          <p className="text-sm mt-1">Click "Add Session" to create one</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {sessions.map((session) => (
            <div key={session.id} className="p-4 hover:bg-muted/50 transition-colors group">
              {editingId === session.id ? (
                <div className="grid gap-3">
                  <div className="grid sm:grid-cols-3 gap-3">
                    <Input
                      type="date"
                      value={session.date}
                      onChange={(e) => handleUpdate(session.id, "date", e.target.value)}
                    />
                    <Input
                      type="time"
                      value={session.time.slice(0, 5)}
                      onChange={(e) => handleUpdate(session.id, "time", e.target.value + ":00")}
                    />
                    <Input
                      type="number"
                      placeholder="Duration (hrs)"
                      value={session.duration_hours}
                      onChange={(e) => handleUpdate(session.id, "duration_hours", Number(e.target.value))}
                    />
                  </div>
                  <Input
                    placeholder="Topic"
                    value={session.topic}
                    onChange={(e) => handleUpdate(session.id, "topic", e.target.value)}
                  />
                  <div className="flex gap-3">
                    <Input
                      placeholder="Location"
                      value={session.location}
                      onChange={(e) => handleUpdate(session.id, "location", e.target.value)}
                      className="flex-1"
                    />
                    <Button size="sm" onClick={() => setEditingId(null)}>
                      Done
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-4">
                  <div className="text-center shrink-0 w-14">
                    <p className="text-2xl font-semibold text-foreground">{new Date(session.date).getDate()}</p>
                    <p className="text-xs text-muted-foreground uppercase">
                      {new Date(session.date).toLocaleDateString("en-US", { month: "short" })}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="font-medium text-foreground cursor-pointer hover:text-primary transition-colors"
                      onClick={() => setEditingId(session.id)}
                    >
                      {session.topic}
                    </p>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {session.time.slice(0, 5)} ({session.duration_hours}h)
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {session.location}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(session.id)}
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
