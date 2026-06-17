import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('schools')
      .select('id, name, username, contact, active, created_at, monthly_income')
      .order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json({ schools: data || [] })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ schools: [] })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, username, password, contact } = await req.json()
    if (!name || !username || !password) {
      return NextResponse.json({ error: 'Name, username, and password are required' }, { status: 400 })
    }
    const supabase = createServerClient()
    // Check username uniqueness
    const { data: existing } = await supabase.from('schools').select('id').eq('username', username).single()
    if (existing) return NextResponse.json({ error: 'Username already taken' }, { status: 409 })

    const password_hash = await bcrypt.hash(password, 10)
    const { data, error } = await supabase.from('schools').insert({
      name, username, password_hash, contact: contact || null, active: true
    }).select().single()
    if (error) throw error
    return NextResponse.json({ school: data, success: true }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to create school' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, ...updates } = body
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const supabase = createServerClient()
    if (updates.password) {
      updates.password_hash = await bcrypt.hash(updates.password, 10)
      delete updates.password
    }
    const { error } = await supabase.from('schools').update(updates).eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to update school' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
    const supabase = createServerClient()
    const { error } = await supabase.from('schools').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to delete school' }, { status: 500 })
  }
}
