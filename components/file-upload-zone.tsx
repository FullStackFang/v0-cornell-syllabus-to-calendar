"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { Upload, FileText, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface FileUploadZoneProps {
  onFileSelect: (file: File) => void
  isProcessing?: boolean
  className?: string
}

export function FileUploadZone({ onFileSelect, isProcessing = false, className }: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const validateFile = (file: File): boolean => {
    if (file.type !== "application/pdf") {
      setError("Please upload a PDF file")
      return false
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB")
      return false
    }
    setError(null)
    return true
  }

  const handleFile = useCallback(
    (file: File) => {
      if (validateFile(file)) {
        setSelectedFile(file)
        onFileSelect(file)
      }
    },
    [onFileSelect],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const clearFile = () => {
    setSelectedFile(null)
    setError(null)
  }

  if (isProcessing) {
    return (
      <div
        className={cn(
          "relative rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-12 transition-all",
          className,
        )}
      >
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
          <p className="text-lg font-medium text-foreground">Analyzing syllabus...</p>
          <p className="text-sm text-muted-foreground mt-1">This may take a few seconds</p>
        </div>
      </div>
    )
  }

  if (selectedFile && !error) {
    return (
      <div className={cn("relative rounded-2xl border-2 border-primary/30 bg-primary/5 p-8 transition-all", className)}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">{selectedFile.name}</p>
            <p className="text-sm text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
          <button type="button" onClick={clearFile} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={cn(
        "relative rounded-2xl border-2 border-dashed transition-all cursor-pointer",
        isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50",
        error && "border-destructive bg-destructive/5",
        className,
      )}
    >
      <label className="flex flex-col items-center justify-center p-12 cursor-pointer">
        <input type="file" accept=".pdf,application/pdf" onChange={handleInputChange} className="sr-only" />
        <div
          className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors",
            isDragging ? "bg-primary/20" : "bg-muted",
          )}
        >
          <Upload className={cn("w-8 h-8", isDragging ? "text-primary" : "text-muted-foreground")} />
        </div>
        <p className="text-lg font-medium text-foreground">
          {isDragging ? "Drop your file here" : "Drop your syllabus here"}
        </p>
        <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
        <p className="text-xs text-muted-foreground mt-4">PDF files only, up to 10MB</p>
        {error && <p className="text-sm text-destructive mt-2">{error}</p>}
      </label>
    </div>
  )
}
