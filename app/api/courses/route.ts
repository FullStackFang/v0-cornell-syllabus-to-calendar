import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { CreateCourseInput, CourseFlowCourse } from '@/types'

// Generate plus address from user email and course code
function generatePlusAddress(email: string, courseCode: string): string {
  const [localPart, domain] = email.split('@')
  // Normalize course code: lowercase, remove spaces
  const normalizedCode = courseCode.toLowerCase().replace(/\s+/g, '')
  return `${localPart}+${normalizedCode}@${domain}`
}

// GET /api/courses - List professor's courses
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: courses, error } = await supabase
      .from('courses')
      .select('*')
      .eq('professor_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch courses:', error)
      return NextResponse.json(
        { error: 'Failed to fetch courses' },
        { status: 500 }
      )
    }

    return NextResponse.json({ courses: courses as CourseFlowCourse[] })
  } catch (error) {
    console.error('Failed to get courses:', error)
    return NextResponse.json(
      { error: 'Failed to get courses' },
      { status: 500 }
    )
  }
}

// POST /api/courses - Create a new course
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body: CreateCourseInput = await request.json()

    // Validate required fields
    if (!body.name || !body.course_code || !body.semester) {
      return NextResponse.json(
        { error: 'Missing required fields: name, course_code, semester' },
        { status: 400 }
      )
    }

    // Generate plus address
    const plusAddress = generatePlusAddress(user.email!, body.course_code)

    // Check for duplicate course (same code + semester)
    const { data: existing } = await supabase
      .from('courses')
      .select('id')
      .eq('professor_id', user.id)
      .eq('course_code', body.course_code)
      .eq('semester', body.semester)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: `You already have ${body.course_code} for ${body.semester}` },
        { status: 409 }
      )
    }

    // Create the course
    const { data: course, error } = await supabase
      .from('courses')
      .insert({
        professor_id: user.id,
        name: body.name,
        course_code: body.course_code,
        semester: body.semester,
        plus_address: plusAddress,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create course:', error)
      return NextResponse.json(
        { error: 'Failed to create course' },
        { status: 500 }
      )
    }

    return NextResponse.json({ course: course as CourseFlowCourse }, { status: 201 })
  } catch (error) {
    console.error('Failed to create course:', error)
    return NextResponse.json(
      { error: 'Failed to create course' },
      { status: 500 }
    )
  }
}
