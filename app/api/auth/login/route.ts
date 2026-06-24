import { NextRequest, NextResponse } from 'next/server'
import { createSession } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { createServerClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()
    const supabase = createServerClient()

    // Check admin credentials in database
    let isAdminMatch = false
    let isAdminQueryExecuted = false

    try {
      const { data: adminSettings } = await supabase
        .from('admin_settings')
        .select('username, password_hash')
        .eq('username', username)
        .maybeSingle()

      if (adminSettings) {
        isAdminQueryExecuted = true
        const valid = await bcrypt.compare(password, adminSettings.password_hash)
        if (valid) {
          isAdminMatch = true
        }
      }
    } catch (err) {
      console.warn('admin_settings query failed, falling back to env configurations:', err)
    }

    // Fallback to environment variables if database entry doesn't exist
    if (!isAdminMatch && !isAdminQueryExecuted) {
      const envUsername = process.env.ADMIN_USERNAME || 'admin'
      const envPassword = process.env.ADMIN_PASSWORD || 'admin123'
      if (username === envUsername && password === envPassword) {
        isAdminMatch = true
      }
    }

    if (isAdminMatch) {
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
