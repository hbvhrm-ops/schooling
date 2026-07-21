import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

const DEFAULT_TEMPLATES: Record<string, { title: string; body_text: string; signature_title: string }> = {
  slc: {
    title: 'School Leaving Certificate',
    body_text: `This is to certify that {name}, Son/Daughter of {father_name}, bearing Roll No. {roll_no}, was a bonafide student of Class {class_name} at this institution. As per official records, their date of birth is {dob}. The student is leaving this school on {leaving_date} due to {leaving_reason}. Throughout their period of study at this institution, their academic performance and general conduct have been evaluated as {conduct}. We wish them every success in all their future academic and personal endeavors.`,
    signature_title: 'Principal'
  },
  birth: {
    title: 'BIRTH CERTIFICATE',
    body_text: `This is to certify that {name}, Son/Daughter of {father_name}, was born on {dob} (in words: {dob_words}) at {birth_place}. The birth record is officially registered under entry number {register_no} in the register of this institution. This certificate is officially issued upon the formal request of the parent or legal guardian for all official records.`,
    signature_title: 'Principal'
  },
  character: {
    title: 'CHARACTER CERTIFICATE',
    body_text: `This is to certify that {name}, Son/Daughter of {father_name}, was a student of Class {class_name} at this institution. Throughout their tenure at this school, their conduct, moral character, and overall behavior have been consistently observed to be {conduct}. They have shown commendable discipline and sense of responsibility. We wish them continued success in all future academic endeavors.`,
    signature_title: 'Principal'
  },
  sports: {
    title: 'CERTIFICATE OF SPORTS ACHIEVEMENT',
    body_text: `This is to certify that {name}, Son/Daughter of {father_name}, actively participated in the {sport_name} tournament representing this institution. They demonstrated exemplary athletic dedication and achieved the position of {achievement} at the {event_name} organized on {date}. We commend their athletic spirit and wish them continued success in future sporting events.`,
    signature_title: 'Principal'
  },
  top_positions: {
    title: 'CERTIFICATE OF ACADEMIC EXCELLENCE',
    body_text: `This certificate of academic excellence is proudly awarded to {name}, Son/Daughter of {father_name}, in recognition of outstanding scholastic performance by securing the {position} Position in Class {class_name} during the {exam_name} Examination of {year}. Obtaining {marks_obtained} out of {total_marks} marks ({percentage}), their perseverance, diligence, and academic brilliance are truly commendable. We extend our heartiest congratulations and wish them a highly successful future ahead.`,
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
