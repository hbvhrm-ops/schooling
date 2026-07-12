import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

const DEFAULT_TEMPLATES: Record<string, { title: string; body_text: string; signature_title: string }> = {
  slc: {
    title: 'School Leaving Certificate',
    body_text: `This is to certify that Mr./Mrs. {name} S/O {father_name} is a student of this institution. The student has passed class {class_name} and is leaving this school on {leaving_date} due to {leaving_reason}. His/Her conduct and character during stay at this institution has been {conduct}. We wish him/her all the best for future endeavors.`,
    signature_title: 'Principal'
  },
  birth: {
    title: 'BIRTH CERTIFICATE',
    body_text: `This is to certify that {name} son/daughter of {father_name} was born on {dob} (in words: {dob_words}). The place of birth was {birth_place} and is recorded under entry number {register_no} in the birth register of this institution. This certificate is issued on request of the parents/guardian of the student.`,
    signature_title: 'Principal'
  },
  character: {
    title: 'CHARACTER CERTIFICATE',
    body_text: `This is to certify that {name} son/daughter of {father_name} has been a student of this institution. During stay, his/her character and conduct has been found to be {conduct}. We wish him/her continued success in future academic endeavors.`,
    signature_title: 'Principal'
  },
  sports: {
    title: 'CERTIFICATE OF SPORTS ACHIEVEMENT',
    body_text: `This is to certify that {name} son/daughter of {father_name} has actively participated in the {sport_name} tournament. They achieved the position of {achievement} at the {event_name} held on {date}.`,
    signature_title: 'Principal'
  },
  top_positions: {
    title: 'CERTIFICATE',
    body_text: `This certificate is awarded to {name} Son of / Daughter of {father_name} has achieved outstanding academic performance and secured the {position} Position in Class {class_name} during the {exam_name} Examination of {year}. Your dedication, hard work, and excellence are truly commendable. We wish you continued success in your future academic endeavors.`,
    signature_title: 'Principal'
  }
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session?.schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')

  if (!type) {
    return NextResponse.json({ error: 'Type query parameter is required' }, { status: 400 })
  }

  const supabase = createServerClient()
  const [templateRes, schoolRes] = await Promise.all([
    supabase.from('certificate_templates').select('*').eq('school_id', session.schoolId).eq('type', type).maybeSingle(),
    supabase.from('schools').select('name, logo_url, contact, address, psra_reg_no, bise_no').eq('id', session.schoolId).maybeSingle()
  ])

  if (templateRes.error) {
    return NextResponse.json({ error: templateRes.error.message }, { status: 400 })
  }

  const school = schoolRes.data
  const data = templateRes.data

  if (!data) {
    const defaultTemplate = DEFAULT_TEMPLATES[type] || {
      title: 'CERTIFICATE',
      body_text: 'This is to certify that {name} has completed their activities.',
      signature_title: 'Principal'
    }
    return NextResponse.json({
      schoolName: school?.name || session.schoolName,
      schoolLogo: school?.logo_url || '',
      schoolContact: school?.contact || '',
      schoolAddress: school?.address || '',
      schoolPsra: school?.psra_reg_no || '',
      schoolBise: school?.bise_no || '',
      template: {
        logo_url: '',
        ...defaultTemplate
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
  const { type, logo_url, title, body_text, signature_title } = body

  if (!type || !body_text) {
    return NextResponse.json({ error: 'Type and body text are required' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('certificate_templates')
    .upsert({
      school_id: session.schoolId,
      type,
      logo_url: logo_url || '',
      title: title || '',
      body_text,
      signature_title: signature_title || 'Principal',
    }, { onConflict: 'school_id,type' })
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
