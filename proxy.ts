import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifySession } from '@/lib/auth'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('session')?.value

  // Public route - login page
  if (pathname === '/') {
    if (token) {
      const session = await verifySession(token)
      if (session?.role === 'admin') return NextResponse.redirect(new URL('/admin', request.url))
      if (session?.role === 'school') return NextResponse.redirect(new URL('/school', request.url))
    }
    return NextResponse.next()
  }

  // Protected routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/school')) {
    if (!token) return NextResponse.redirect(new URL('/', request.url))
    const session = await verifySession(token)
    if (!session) return NextResponse.redirect(new URL('/', request.url))

    if (pathname.startsWith('/admin') && session.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
    if (pathname.startsWith('/school') && session.role !== 'school') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/admin/:path*', '/school/:path*'],
}
