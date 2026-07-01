import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServerClient()
    const { data: school, error } = await supabase
      .from('schools')
      .select('name, logo_url, contact, address, psra_reg_no, bise_no')
      .eq('id', session.schoolId)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ school })
  } catch (err: any) {
    console.error('Error fetching school profile:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, logo_url, contact, address, psra_reg_no, bise_no } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'School name is required' }, { status: 400 })
    }

    const supabase = createServerClient()
    const { data: school, error } = await supabase
      .from('schools')
      .update({
        name: name.trim(),
        logo_url: logo_url || '',
        contact: contact || '',
        address: address || '',
        psra_reg_no: psra_reg_no || '',
        bise_no: bise_no || '',
      })
      .eq('id', session.schoolId)
      .select('name, logo_url, contact, address, psra_reg_no, bise_no')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, school })
  } catch (err: any) {
    console.error('Error updating school profile:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  return PUT(req)
}
