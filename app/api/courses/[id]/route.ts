import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { UpdateCourseInput, CourseFlowCourse } from '@/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/courses/[id] - Get a single course
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: course, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', id)
      .eq('professor_id', user.id)
      .single()

    if (error || !course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ course: course as CourseFlowCourse })
  } catch (error) {
    console.error('Failed to get course:', error)
    return NextResponse.json(
      { error: 'Failed to get course' },
      { status: 500 }
    )
  }
}

// PATCH /api/courses/[id] - Update a course
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body: UpdateCourseInput = await request.json()

    // Check course exists and belongs to user
    const { data: existing } = await supabase
      .from('courses')
      .select('*')
      .eq('id', id)
      .eq('professor_id', user.id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    // Build update object
    const updates: Record<string, unknown> = {}
    if (body.name) updates.name = body.name
    if (body.settings) {
      // Merge settings with existing
      updates.settings = {
        ...existing.settings,
        ...body.settings,
      }
    }

    // Determine final course_code and semester (for uniqueness check)
    const newCourseCode = body.course_code || existing.course_code
    const newSemester = body.semester || existing.semester
    const codeChanged = body.course_code && body.course_code !== existing.course_code
    const semesterChanged = body.semester && body.semester !== existing.semester

    // If course_code or semester changes, check for duplicates
    if (codeChanged || semesterChanged) {
      const { data: duplicate } = await supabase
        .from('courses')
        .select('id')
        .eq('professor_id', user.id)
        .eq('course_code', newCourseCode)
        .eq('semester', newSemester)
        .neq('id', id)
        .single()

      if (duplicate) {
        return NextResponse.json(
          { error: `You already have ${newCourseCode} for ${newSemester}` },
          { status: 409 }
        )
      }

      if (semesterChanged) {
        updates.semester = body.semester
      }

      if (codeChanged) {
        updates.course_code = body.course_code
        const [localPart, domain] = user.email!.split('@')
        const normalizedCode = body.course_code!.toLowerCase().replace(/\s+/g, '')
        updates.plus_address = `${localPart}+${normalizedCode}@${domain}`
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    const { data: course, error } = await supabase
      .from('courses')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Failed to update course:', error)
      return NextResponse.json(
        { error: 'Failed to update course' },
        { status: 500 }
      )
    }

    return NextResponse.json({ course: course as CourseFlowCourse })
  } catch (error) {
    console.error('Failed to update course:', error)
    return NextResponse.json(
      { error: 'Failed to update course' },
      { status: 500 }
    )
  }
}

// DELETE /api/courses/[id] - Archive a course (soft delete)
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check course exists and belongs to user
    const { data: existing } = await supabase
      .from('courses')
      .select('id')
      .eq('id', id)
      .eq('professor_id', user.id)
      .single()

    if (!existing) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    // Soft delete by setting status to archived
    const { error } = await supabase
      .from('courses')
      .update({ status: 'archived' })
      .eq('id', id)

    if (error) {
      console.error('Failed to archive course:', error)
      return NextResponse.json(
        { error: 'Failed to archive course' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to archive course:', error)
    return NextResponse.json(
      { error: 'Failed to archive course' },
      { status: 500 }
    )
  }
}
