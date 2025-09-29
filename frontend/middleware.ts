import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// List of paths that should be excluded from redirection
const EXCLUDED_PATHS = [
  '/waitlist',  // The waitlist page itself
  '/api',       // API routes
  '/_next',     // Next.js internal routes
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/logo'
]

export function middleware(request: NextRequest) {
  // Check if waitlist mode is enabled
  const isWaitlistMode = process.env.NEXT_PUBLIC_WAITLIST_MODE === 'true'

  // Get the current path
  const path = request.nextUrl.pathname

  // Check if the current path should be excluded from redirection
  const shouldExclude = EXCLUDED_PATHS.some(excludedPath => 
    path.startsWith(excludedPath)
  )

  // If waitlist mode is enabled and the path is not excluded, redirect to waitlist
  if (isWaitlistMode && !shouldExclude) {
    return NextResponse.redirect(new URL('/waitlist', request.url))
  }

  return NextResponse.next()
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
} 