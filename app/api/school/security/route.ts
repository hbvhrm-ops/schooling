import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { currentPassword, newPassword } = await req.json()
  if (!currentPassword || !newPassword) return NextResponse.json({ error: 'Both passwords are required' }, { status: 400 })
  if (newPassword.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })

  const supabase = createServerClient()
  const { data: school } = await supabase.from('schools').select('password_hash').eq('id', session.schoolId).single()
  if (!school) return NextResponse.json({ error: 'School not found' }, { status: 404 })

  const valid = await bcrypt.compare(currentPassword, school.password_hash)
  if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 })

  const newHash = await bcrypt.hash(newPassword, 10)
  await supabase.from('schools').update({ password_hash: newHash }).eq('id', session.schoolId)
  return NextResponse.json({ success: true })
}
