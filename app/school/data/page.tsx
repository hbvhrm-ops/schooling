'use client'
import { useState } from 'react'

type Tab = 'export' | 'import'

const EXPORT_TYPES = [
  { key: 'students', label: 'Students', icon: '🎓', desc: 'All student records' },
  { key: 'attendance', label: 'Attendance', icon: '📋', desc: 'Attendance records' },
  { key: 'fee', label: 'Fee Records', icon: '💳', desc: 'Fee invoices and payments' },
  { key: 'expenses', label: 'Expenses', icon: '💸', desc: 'Expense records and ledger' },
  { key: 'results', label: 'Results', icon: '📝', desc: 'Exam results' },
  { key: 'staff', label: 'Staff', icon: '👥', desc: 'Staff records and salaries' },
]

export default function DataPage() {
  const [tab, setTab] = useState<Tab>('export')
  const [exporting, setExporting] = useState<string | null>(null)
  const [importing, setImporting] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null)

  async function handleExport(type: string) {
    setExporting(type)
    setMsg(null)
    try {
      const r = await fetch(`/api/school/data?type=${type}`)
      if (!r.ok) throw new Error('Export failed')
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${type}_export_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
      setMsg({ type: 'success', text: `${type} data exported successfully!` })
    } catch {
      setMsg({ type: 'danger', text: `Failed to export ${type} data.` })
    } finally {
      setExporting(null)
    }
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>, type: string) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(type)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)
    fetch('/api/school/data', { method: 'POST', body: formData })
      .then(r => r.json())
      .then(d => {
        if (d.success) setMsg({ type: 'success', text: `${type} data imported! ${d.count || ''} records processed.` })
        else setMsg({ type: 'danger', text: d.error || 'Import failed' })
      })
      .catch(() => setMsg({ type: 'danger', text: 'Import failed' }))
      .finally(() => setImporting(null))
    e.target.value = ''
  }

  return (
    <div style={{ padding: '2rem', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>🗄️ Data Import / Export</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Backup or restore your school data in CSV format</p>
      </div>

      <div className="tab-bar" style={{ marginBottom: '1.5rem' }}>
        <button className={`tab-btn ${tab === 'export' ? 'active' : ''}`} onClick={() => setTab('export')}>⬇️ Export Data</button>
        <button className={`tab-btn ${tab === 'import' ? 'active' : ''}`} onClick={() => setTab('import')}>⬆️ Import Data</button>
      </div>

      {msg && <div className={`alert alert-${msg.type} animate-fade`} style={{ marginBottom: '1.5rem' }}>{msg.text}</div>}

      {tab === 'export' && (
        <>
          <div className="alert alert-info" style={{ marginBottom: '1.5rem' }}>
            <span>💡</span> Export your data to CSV files that can be opened in Excel or Google Sheets.
          </div>
          <div className="grid-3" style={{ gap: '1rem' }}>
            {EXPORT_TYPES.map(t => (
              <div key={t.key} className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{t.icon}</div>
                <h3 style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{t.label}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1.25rem' }}>{t.desc}</p>
                <button
                  onClick={() => handleExport(t.key)}
                  className="btn btn-primary w-full"
                  disabled={exporting === t.key}
                  style={{ justifyContent: 'center' }}
                >
                  {exporting === t.key ? '⏳ Exporting...' : '⬇️ Export CSV'}
                </button>
              </div>
            ))}
          </div>
          <div className="card" style={{ marginTop: '1.5rem', maxWidth: '500px' }}>
            <h3 style={{ fontWeight: 700, marginBottom: '0.75rem' }}>⬇️ Export All Data</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>Download a complete backup of all school data in a single ZIP file.</p>
            <button className="btn btn-secondary">📦 Export All (ZIP)</button>
          </div>
        </>
      )}

      {tab === 'import' && (
        <>
          <div className="alert alert-warning" style={{ marginBottom: '1.5rem' }}>
            <span>⚠️</span> Importing data will ADD records to existing data. Duplicate records may be created if importing the same file twice.
          </div>
          <div className="grid-3" style={{ gap: '1rem' }}>
            {EXPORT_TYPES.map(t => (
              <div key={t.key} className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{t.icon}</div>
                <h3 style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{t.label}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1.25rem' }}>{t.desc}</p>
                <label
                  htmlFor={`import-${t.key}`}
                  className="btn btn-secondary w-full"
                  style={{ cursor: 'pointer', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {importing === t.key ? '⏳ Importing...' : '⬆️ Import CSV'}
                </label>
                <input
                  id={`import-${t.key}`}
                  type="file"
                  accept=".csv"
                  style={{ display: 'none' }}
                  onChange={e => handleImport(e, t.key)}
                  disabled={!!importing}
                />
              </div>
            ))}
          </div>
          <div className="card" style={{ marginTop: '1.5rem', maxWidth: '600px' }}>
            <h3 style={{ fontWeight: 700, marginBottom: '0.75rem' }}>📋 CSV Format Requirements</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <div>🎓 <strong>Students:</strong> name, father_name, class, section, roll_no, gender, dob, contact, address</div>
              <div>💳 <strong>Fee:</strong> student_name, amount, month, year, status, paid_date</div>
              <div>💸 <strong>Expenses:</strong> date, head, source, amount, description</div>
              <div>👥 <strong>Staff:</strong> name, role, salary, contact, join_date</div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
