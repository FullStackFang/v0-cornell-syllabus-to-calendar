import { updateSession } from '@/lib/supabase/middleware'
import { type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Use Supabase for session management
  return await updateSession(request)
}

export const config = {
  matcher: [
    // Protected routes
    '/dashboard/:path*',
    '/review/:path*',
    '/chat/:path*',
    '/success/:path*',
    '/settings/:path*',
    // Auth routes (needed for cookie handling during code exchange)
    '/auth/:path*',
  ],
}
