import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

const DEFAULT_BODY = `This is to certify that {name}, son/daughter of {father_name}, was a student of this institution.

During their time here, they were enrolled in {class_name} under Roll No: {roll_no}. Their date of birth is recorded as {dob}.

The student has successfully completed their studies at this school and is leaving on {leaving_date}.
Reason for leaving: {leaving_reason}
Character and Conduct: {conduct}

We wish them all the best in their future endeavors.`

export async function GET() {
  const session = await getSession()
  if (!session?.schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('slc_templates')
    .select('*')
    .eq('school_id', session.schoolId)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (!data) {
    // Return default template content if none has been saved yet
    return NextResponse.json({
      template: {
        logo_url: '',
        title: 'SCHOOL LEAVING CERTIFICATE',
        body_text: DEFAULT_BODY,
        signature_title: 'Principal',
      }
    })
  }

  return NextResponse.json({ template: data })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { logo_url, title, body_text, signature_title } = body

  if (!body_text) {
    return NextResponse.json({ error: 'Body text template is required' }, { status: 400 })
  }

  const supabase = createServerClient()
  
  // Since we have a UNIQUE constraint on school_id, we can perform an upsert
  const { data, error } = await supabase
    .from('slc_templates')
    .upsert({
      school_id: session.schoolId,
      logo_url: logo_url || '',
      title: title || 'SCHOOL LEAVING CERTIFICATE',
      body_text: body_text,
      signature_title: signature_title || 'Principal',
    }, { onConflict: 'school_id' })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ template: data })
}
