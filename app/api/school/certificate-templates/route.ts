import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

const DEFAULT_TEMPLATES: Record<string, { title: string; body_text: string; signature_title: string }> = {
  slc: {
    title: 'SCHOOL LEAVING CERTIFICATE',
    body_text: `This is to certify that {name}, son/daughter of {father_name}, was a student of this institution.

During their time here, they were enrolled in {class_name} under Roll No: {roll_no}. Their date of birth is recorded as {dob}.

The student has successfully completed their studies at this school and is leaving on {leaving_date}.
Reason for leaving: {leaving_reason}
Character and Conduct: {conduct}

We wish them all the best in their future endeavors.`,
    signature_title: 'Principal'
  },
  birth: {
    title: 'BIRTH CERTIFICATE',
    body_text: `This is to certify that according to our official school admission register, {name}, son/daughter of {father_name}, was born on {dob}.

They were admitted to class {class_name} under Roll No: {roll_no} on {reg_date}. Their record shows their gender as {gender} and their address as {address}.

This certificate is issued on request of the parents/guardian of the student.`,
    signature_title: 'Principal'
  },
  character: {
    title: 'CHARACTER & CONDUCT CERTIFICATE',
    body_text: `This is to certify that {name}, son/daughter of {father_name}, was enrolled in this institution in class {class_name} under Roll No: {roll_no}.

During their stay in this school, they maintained a {conduct} moral character and demonstrated highly disciplined behavior. They participated actively in various class activities and showed respect to teachers and fellow students.

We have no reason to believe otherwise, and we wish them the best of luck in their future.`,
    signature_title: 'Principal'
  },
  sports: {
    title: 'CERTIFICATE OF SPORTS ACHIEVEMENT',
    body_text: `This is to certify that {name}, son/daughter of {father_name}, representing class {class_name}, has actively participated in the {sport_name} tournament.

They achieved the position of {achievement} at the {event_name} held on {date}.

We commend their outstanding dedication, sportsmanship, and performance.`,
    signature_title: 'Principal'
  },
  top_positions: {
    title: 'CERTIFICATE OF ACADEMIC EXCELLENCE',
    body_text: `This certificate is awarded to {name}, son/daughter of {father_name}, student of class {class_name} (Roll No: {roll_no}), in recognition of securing the {position} position in the {exam_name} examinations.

They obtained {marks_obtained} marks out of a total of {total_marks}, achieving a percentage of {percentage}%.

We congratulate them on this brilliant academic achievement and wish them continued success in their studies.`,
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
    supabase.from('schools').select('name, logo_url').eq('id', session.schoolId).maybeSingle()
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
      template: {
        logo_url: '',
        ...defaultTemplate
      }
    })
  }

  return NextResponse.json({
    schoolName: school?.name || session.schoolName,
    schoolLogo: school?.logo_url || '',
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
    .select('name, logo_url')
    .eq('id', session.schoolId)
    .maybeSingle()

  return NextResponse.json({
    schoolName: school?.name || session.schoolName,
    schoolLogo: school?.logo_url || '',
    template: data
  })
}
