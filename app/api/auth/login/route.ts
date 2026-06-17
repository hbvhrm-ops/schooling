import { NextRequest, NextResponse } from 'next/server'
import { createSession } from '@/lib/auth'
import bcrypt from 'bcryptjs'

// In-memory school store (replace with Supabase queries once DB is connected)
const ADMIN_USER = {
  username: process.env.ADMIN_USERNAME || 'admin',
  password: process.env.ADMIN_PASSWORD || 'admin123',
}

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()

    // Check admin credentials
    if (username === ADMIN_USER.username && password === ADMIN_USER.password) {
      const token = await createSession({ role: 'admin' })
      const response = NextResponse.json({ role: 'admin', success: true })
      response.cookies.set('session', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      })
      return response
    }

    // Check school credentials from Supabase
    const { createServerClient } = await import('@/lib/supabase')
    const supabase = createServerClient()

    const { data: school, error } = await supabase
      .from('schools')
      .select('id, name, username, password_hash, active')
      .eq('username', username)
      .eq('active', true)
      .single()

    if (error || !school) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, school.password_hash)
    if (!validPassword) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
    }

    const token = await createSession({
      role: 'school',
      schoolId: school.id,
      schoolName: school.name,
    })

    const response = NextResponse.json({ role: 'school', success: true, schoolName: school.name })
    response.cookies.set('session', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    return response
  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
