import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

const DEFAULT_BODY = `This is to certify that {name}, Son/Daughter of {father_name}, was a bonafide student of Class {class_name} at this institution. According to official school records, their date of birth is recorded as {dob}. The student is leaving this institution on {leaving_date} due to completion of studies or personal reasons. During their tenure at this school, their academic diligence and general conduct have been evaluated as {conduct}. We wish them every success in all their future academic and personal endeavors.`

export async function GET() {
  const session = await getSession()
  if (!session?.schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerClient()
  const [templateRes, schoolRes] = await Promise.all([
    supabase.from('slc_templates').select('*').eq('school_id', session.schoolId).maybeSingle(),
    supabase.from('schools').select('name, logo_url, contact, address, psra_reg_no, bise_no').eq('id', session.schoolId).maybeSingle()
  ])

  if (templateRes.error) {
    return NextResponse.json({ error: templateRes.error.message }, { status: 400 })
  }

  const school = schoolRes.data
  const data = templateRes.data

  if (!data) {
    // Return default template content if none has been saved yet
    return NextResponse.json({
      schoolName: school?.name || session.schoolName,
      schoolLogo: school?.logo_url || '',
      schoolContact: school?.contact || '',
      schoolAddress: school?.address || '',
      schoolPsra: school?.psra_reg_no || '',
      schoolBise: school?.bise_no || '',
      template: {
        logo_url: '',
        title: 'School Leaving Certificate',
        body_text: DEFAULT_BODY,
        signature_title: 'Principal',
      }
    })
  }

  return NextResponse.json({
    schoolName: school?.name || session.schoolName,
    schoolLogo: school?.logo_url || '',
    schoolContact: school?.contact || '',
    schoolAddress: school?.address || '',
    schoolPsra: school?.psra_reg_no || '',
    schoolBise: school?.bise_no || '',
    template: data
  })
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

  const { data: school } = await supabase
    .from('schools')
    .select('name, logo_url, contact, address, psra_reg_no, bise_no')
    .eq('id', session.schoolId)
    .maybeSingle()

  return NextResponse.json({
    schoolName: school?.name || session.schoolName,
    schoolLogo: school?.logo_url || '',
    schoolContact: school?.contact || '',
    schoolAddress: school?.address || '',
    schoolPsra: school?.psra_reg_no || '',
    schoolBise: school?.bise_no || '',
    template: data
  })
}
