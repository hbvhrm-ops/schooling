-- ============================================================
-- EduManage Multi-School Management System
-- Supabase SQL Schema
-- Run this in: Supabase Dashboard > SQL Editor > New Query
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Schools ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schools (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  username        TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  contact         TEXT,
  logo_url        TEXT,
  address         TEXT,
  psra_reg_no     TEXT,
  bise_no         TEXT,
  active          BOOLEAN DEFAULT TRUE,
  monthly_income  NUMERIC(10,2) DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Classes ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS classes (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Sections ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sections (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  class_id  UUID REFERENCES classes(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Subjects ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subjects (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  class_id  UUID REFERENCES classes(id) ON DELETE SET NULL,
  name      TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Students ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id       UUID REFERENCES schools(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  father_name     TEXT,
  class_id        UUID REFERENCES classes(id) ON DELETE SET NULL,
  section_id      UUID REFERENCES sections(id) ON DELETE SET NULL,
  roll_no         TEXT,
  gender          TEXT DEFAULT 'Male',
  dob             DATE,
  contact         TEXT,
  address         TEXT,
  photo_url       TEXT,
  status          TEXT DEFAULT 'active' CHECK (status IN ('active','discharged')),
  session         TEXT DEFAULT '2026',
  additional_info JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Registration Fields ──────────────────────────────────
CREATE TABLE IF NOT EXISTS registration_fields (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id     UUID REFERENCES schools(id) ON DELETE CASCADE,
  field_label   TEXT NOT NULL,
  field_type    TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'dropdown')),
  field_options TEXT, -- comma-separated choices for dropdown
  is_required   BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Attendance ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  status     TEXT NOT NULL CHECK (status IN ('present','absent','leave')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, date)
);

-- ── Exam Types ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exam_types (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Exam Schedules ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exam_schedules (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_type_id UUID REFERENCES exam_types(id) ON DELETE CASCADE,
  subject_id   UUID REFERENCES subjects(id) ON DELETE CASCADE,
  date         DATE,
  time         TIME,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Results ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS results (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id     UUID REFERENCES students(id) ON DELETE CASCADE,
  exam_type_id   UUID REFERENCES exam_types(id) ON DELETE CASCADE,
  subject_id     UUID REFERENCES subjects(id) ON DELETE SET NULL,
  marks_obtained NUMERIC(5,2),
  total_marks    NUMERIC(5,2) DEFAULT 100,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── Grading Policy ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS grading_policy (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  grade     TEXT NOT NULL,
  min_marks NUMERIC(5,2) NOT NULL,
  max_marks NUMERIC(5,2) NOT NULL,
  gpa       TEXT,
  remarks   TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Fee Templates ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fee_templates (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  amount    NUMERIC(10,2) NOT NULL,
  frequency TEXT DEFAULT 'Monthly',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Fee Criteria ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fee_criteria (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id        UUID REFERENCES schools(id) ON DELETE CASCADE,
  fee_template_id  UUID REFERENCES fee_templates(id) ON DELETE CASCADE,
  class_id         UUID REFERENCES classes(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Fee Invoices ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fee_invoices (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id        UUID REFERENCES schools(id) ON DELETE CASCADE,
  student_id       UUID REFERENCES students(id) ON DELETE CASCADE,
  fee_template_id  UUID REFERENCES fee_templates(id) ON DELETE SET NULL,
  month            INTEGER NOT NULL,
  year             INTEGER NOT NULL,
  amount           NUMERIC(10,2) NOT NULL,
  amount_paid      NUMERIC(10,2) DEFAULT 0,
  status           TEXT DEFAULT 'pending' CHECK (status IN ('pending','paid','partial')),
  paid_date        DATE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Expense Heads ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expense_heads (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Payment Sources ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_sources (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Expenses ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  date      DATE NOT NULL DEFAULT CURRENT_DATE,
  head_id   UUID REFERENCES expense_heads(id) ON DELETE SET NULL,
  source_id UUID REFERENCES payment_sources(id) ON DELETE SET NULL,
  amount    NUMERIC(10,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Staff ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  role      TEXT DEFAULT 'Teacher',
  salary    NUMERIC(10,2),
  contact   TEXT,
  join_date DATE,
  status    TEXT DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── SMS Templates ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sms_templates (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  type      TEXT NOT NULL,
  message   TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Budget ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS budget (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  month     INTEGER NOT NULL,
  year      INTEGER NOT NULL,
  amount    NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, month, year)
);

-- ── SLC Templates ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS slc_templates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id       UUID REFERENCES schools(id) ON DELETE CASCADE,
  logo_url        TEXT,
  title           TEXT DEFAULT 'SCHOOL LEAVING CERTIFICATE',
  body_text       TEXT NOT NULL,
  signature_title TEXT DEFAULT 'Principal',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id)
);

-- ── Certificate Templates ───────────────────────────────────
CREATE TABLE IF NOT EXISTS certificate_templates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id       UUID REFERENCES schools(id) ON DELETE CASCADE,
  type            TEXT NOT NULL, -- 'slc', 'birth', 'character', 'sports', 'top_positions'
  logo_url        TEXT,
  title           TEXT,
  body_text       TEXT NOT NULL,
  signature_title TEXT DEFAULT 'Principal',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, type)
);


-- ============================================================
-- Row Level Security (RLS) — Recommended for production
-- Disable anon access, only allow authenticated requests
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE slc_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE grading_policy ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_heads ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_schedules ENABLE ROW LEVEL SECURITY;

-- Allow all operations via service role (used by Next.js API routes)
-- Since we use anon key from server, we grant full access via policy
-- In production, use service_role key instead of anon key

CREATE POLICY "Allow all via anon" ON schools FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all via anon" ON classes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all via anon" ON sections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all via anon" ON subjects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all via anon" ON students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all via anon" ON registration_fields FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all via anon" ON slc_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all via anon" ON attendance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all via anon" ON exam_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all via anon" ON exam_schedules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all via anon" ON results FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all via anon" ON grading_policy FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all via anon" ON fee_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all via anon" ON fee_criteria FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all via anon" ON fee_invoices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all via anon" ON expense_heads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all via anon" ON payment_sources FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all via anon" ON expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all via anon" ON staff FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all via anon" ON sms_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all via anon" ON budget FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all via anon" ON certificate_templates FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- Indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_students_school ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id, date);
CREATE INDEX IF NOT EXISTS idx_fee_invoices_school ON fee_invoices(school_id, month, year);
CREATE INDEX IF NOT EXISTS idx_expenses_school ON expenses(school_id, date);
CREATE INDEX IF NOT EXISTS idx_results_student ON results(student_id, exam_type_id);

-- ── Admin Settings ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_settings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username        TEXT UNIQUE NOT NULL DEFAULT 'admin',
  password_hash   TEXT NOT NULL
);

ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all via anon" ON admin_settings FOR ALL USING (true) WITH CHECK (true);

-- ── Timetables ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS timetables (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id  UUID REFERENCES schools(id) ON DELETE CASCADE,
  class_id   UUID REFERENCES classes(id) ON DELETE CASCADE,
  schedule   JSONB NOT NULL DEFAULT '{"periods": [], "grid": {}}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, class_id)
);

ALTER TABLE timetables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all via anon" ON timetables FOR ALL USING (true) WITH CHECK (true);


