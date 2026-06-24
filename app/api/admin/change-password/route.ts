import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { currentPassword, newPassword } = await req.json()
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current password and new password are required' }, { status: 400 })
    }

    const supabase = createServerClient()
    
    // Get current password hash from database
    let passwordHash = ''
    const { data: adminSettings } = await supabase
      .from('admin_settings')
      .select('password_hash')
      .eq('username', 'admin')
      .maybeSingle()

    if (adminSettings) {
      passwordHash = adminSettings.password_hash
    } else {
      // Fallback to env password if table is not yet updated/populated
      const envPassword = process.env.ADMIN_PASSWORD || 'admin123'
      if (currentPassword !== envPassword) {
        return NextResponse.json({ error: 'Incorrect current password' }, { status: 400 })
      }
    }

    if (passwordHash) {
      const valid = await bcrypt.compare(currentPassword, passwordHash)
      if (!valid) {
        return NextResponse.json({ error: 'Incorrect current password' }, { status: 400 })
      }
    }

    // Hash the new password
    const hashed = await bcrypt.hash(newPassword, 10)

    // Save/Upsert new credentials to database
    const { error } = await supabase
      .from('admin_settings')
      .upsert({
        username: 'admin',
        password_hash: hashed
      }, { onConflict: 'username' })

    if (error) throw error

    return NextResponse.json({ success: true, message: 'Password updated successfully' })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to update password. Make sure the admin_settings table is created.' }, { status: 500 })
  }
}
