import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const isMock = !supabaseUrl ||
  supabaseUrl === 'your_supabase_project_url' ||
  !supabaseUrl.startsWith('http')

function readDb() {
  if (typeof window !== 'undefined') return {}
  try {
    const fs = require('fs')
    const path = require('path')
    const DB_FILE = path.join(process.cwd(), 'local_db.json')
    if (!fs.existsSync(DB_FILE)) {
      const initial = {
        schools: [],
        classes: [],
        sections: [],
        subjects: [],
        students: [],
        attendance: [],
        exam_types: [],
        results: [],
        grading_policy: [],
        fee_templates: [],
        fee_criteria: [],
        fee_invoices: [],
        expense_heads: [],
        payment_sources: [],
        expenses: [],
        staff: [],
        sms_templates: [],
        budget: []
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2))
      return initial
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
  } catch (err) {
    console.error('Error reading local mock db:', err)
    return {}
  }
}

function writeDb(data: any) {
  if (typeof window !== 'undefined') return
  try {
    const fs = require('fs')
    const path = require('path')
    const DB_FILE = path.join(process.cwd(), 'local_db.json')
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2))
  } catch (err) {
    console.error('Error writing local mock db:', err)
  }
}

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

class MockQueryBuilder {
  table: string
  filters: any[]
  orderBy: { column: string; ascending: boolean } | null
  isSingle: boolean
  action: 'select' | 'insert' | 'update' | 'delete'
  actionData: any
  limitCount: number | null
  isUpsert?: boolean
  upsertOnConflict?: string

  constructor(table: string) {
    this.table = table
    this.filters = []
    this.orderBy = null
    this.isSingle = false
    this.action = 'select'
    this.limitCount = null
  }

  select(fields = '*') {
    return this
  }

  eq(column: string, value: any) {
    this.filters.push({ type: 'eq', column, value })
    return this
  }

  neq(column: string, value: any) {
    this.filters.push({ type: 'neq', column, value })
    return this
  }

  gte(column: string, value: any) {
    this.filters.push({ type: 'gte', column, value })
    return this
  }

  lte(column: string, value: any) {
    this.filters.push({ type: 'lte', column, value })
    return this
  }

  in(column: string, values: any[]) {
    this.filters.push({ type: 'in', column, values })
    return this
  }

  order(column: string, options: any = {}) {
    this.orderBy = { column, ascending: options.ascending !== false }
    return this
  }

  single() {
    this.isSingle = true
    return this
  }

  limit(count: number) {
    this.limitCount = count
    return this
  }

  insert(data: any) {
    this.action = 'insert'
    this.actionData = data
    return this
  }

  upsert(data: any, options: any = {}) {
    this.action = 'insert'
    this.isUpsert = true
    this.actionData = data
    this.upsertOnConflict = options.onConflict
    return this
  }

  update(data: any) {
    this.action = 'update'
    this.actionData = data
    return this
  }

  delete() {
    this.action = 'delete'
    return this
  }

  async then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    try {
      const result = await this.execute()
      if (onfulfilled) return onfulfilled(result)
      return result
    } catch (err) {
      if (onrejected) return onrejected(err)
      throw err
    }
  }

  async execute() {
    const db = readDb()
    if (!db[this.table]) {
      db[this.table] = []
    }

    let rows = [...db[this.table]]

    if (this.action === 'insert') {
      const insertItems = Array.isArray(this.actionData) ? this.actionData : [this.actionData]
      const newItems = insertItems.map((item: any) => {
        if (this.isUpsert && this.upsertOnConflict) {
          const conflictKeys = this.upsertOnConflict.split(',')
          const existingIndex = db[this.table].findIndex((row: any) => {
            return conflictKeys.every((key: string) => {
              const k = key.trim()
              return String(row[k]) === String(item[k])
            })
          })
          if (existingIndex > -1) {
            db[this.table][existingIndex] = {
              ...db[this.table][existingIndex],
              ...item,
              updated_at: new Date().toISOString()
            }
            return db[this.table][existingIndex]
          }
        }
        return {
          id: uuid(),
          created_at: new Date().toISOString(),
          ...item
        }
      })
      
      const toPush = newItems.filter((item: any) => {
        return !db[this.table].some((row: any) => row.id === item.id)
      })
      db[this.table].push(...toPush)
      writeDb(db)
      
      const responseData = Array.isArray(this.actionData) ? newItems : newItems[0]
      return { data: responseData, error: null }
    }

    const matches = (row: any) => {
      for (const filter of this.filters) {
        const val = row[filter.column]
        if (filter.type === 'eq') {
          if (String(val) !== String(filter.value)) return false
        } else if (filter.type === 'neq') {
          if (String(val) === String(filter.value)) return false
        } else if (filter.type === 'gte') {
          if (val < filter.value) return false
        } else if (filter.type === 'lte') {
          if (val > filter.value) return false
        } else if (filter.type === 'in') {
          if (!filter.values.map(String).includes(String(val))) return false
        }
      }
      return true
    }

    if (this.action === 'update') {
      const updatedData: any[] = []
      db[this.table] = db[this.table].map((row: any) => {
        if (matches(row)) {
          const updatedRow = { ...row, ...this.actionData }
          updatedData.push(updatedRow)
          return updatedRow
        }
        return row
      })
      writeDb(db)
      return { data: this.isSingle ? (updatedData[0] || null) : updatedData, error: null }
    }

    if (this.action === 'delete') {
      const remaining: any[] = []
      const deleted: any[] = []
      db[this.table].forEach((row: any) => {
        if (matches(row)) {
          deleted.push(row)
        } else {
          remaining.push(row)
        }
      })
      db[this.table] = remaining
      writeDb(db)
      return { data: this.isSingle ? (deleted[0] || null) : deleted, error: null }
    }

    let results = rows.filter(matches)

    if (this.orderBy) {
      const { column, ascending } = this.orderBy
      results.sort((a, b) => {
        const valA = a[column]
        const valB = b[column]
        if (valA === valB) return 0
        if (valA === undefined || valA === null) return 1
        if (valB === undefined || valB === null) return -1
        const comp = valA < valB ? -1 : 1
        return ascending ? comp : -comp
      })
    }

    if (this.limitCount !== null) {
      results = results.slice(0, this.limitCount)
    }

    // Populate relations
    results = results.map(row => {
      const rowCopy = { ...row }
      if (rowCopy.class_id) {
        const cls = db.classes?.find((c: any) => String(c.id) === String(rowCopy.class_id))
        if (cls) rowCopy.classes = { name: cls.name }
      }
      if (rowCopy.section_id) {
        const sec = db.sections?.find((s: any) => String(s.id) === String(rowCopy.section_id))
        if (sec) rowCopy.sections = { name: sec.name }
      }
      if (rowCopy.head_id) {
        const head = db.expense_heads?.find((h: any) => String(h.id) === String(rowCopy.head_id))
        if (head) rowCopy.expense_heads = { name: head.name }
      }
      if (rowCopy.source_id) {
        const src = db.payment_sources?.find((s: any) => String(s.id) === String(rowCopy.source_id))
        if (src) rowCopy.payment_sources = { name: src.name }
      }
      if (rowCopy.student_id) {
        const stud = db.students?.find((s: any) => String(s.id) === String(rowCopy.student_id))
        if (stud) rowCopy.students = { ...stud }
      }
      if (rowCopy.subject_id) {
        const sub = db.subjects?.find((s: any) => String(s.id) === String(rowCopy.subject_id))
        if (sub) rowCopy.subjects = { name: sub.name }
      }
      if (rowCopy.exam_type_id) {
        const exam = db.exam_types?.find((e: any) => String(e.id) === String(rowCopy.exam_type_id))
        if (exam) rowCopy.exam_types = { name: exam.name }
      }
      return rowCopy
    })

    if (this.isSingle) {
      return { data: results[0] || null, error: results.length === 0 ? new Error('Not found') : null }
    }

    return { data: results, error: null }
  }
}

const mockSupabase = {
  from: (table: string) => {
    return new MockQueryBuilder(table)
  }
}

export const supabase = isMock ? (mockSupabase as any) : createClient(supabaseUrl, supabaseAnonKey)

export function createServerClient() {
  if (isMock) {
    return mockSupabase as any
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

