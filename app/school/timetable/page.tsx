'use client'

import { useState, useEffect, useCallback } from 'react'

interface ClassItem {
  id: string
  name: string
}

interface SubjectItem {
  id: string
  name: string
}

interface Period {
  name: string
  time: string
}

const DEFAULT_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function TimetablePage() {
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [subjects, setSubjects] = useState<SubjectItem[]>([])

  const [periods, setPeriods] = useState<Period[]>([
    { name: 'Period 1', time: '08:00 - 08:45' },
    { name: 'Period 2', time: '08:45 - 09:30' },
    { name: 'Period 3', time: '09:30 - 10:15' },
    { name: 'Break', time: '10:15 - 10:45' },
    { name: 'Period 4', time: '10:45 - 11:30' },
    { name: 'Period 5', time: '11:30 - 12:15' },
    { name: 'Period 6', time: '12:15 - 01:00' },
  ])

  const [grid, setGrid] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState<boolean>(false)
  const [saving, setSaving] = useState<boolean>(false)
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null)
  
  // School profile for print layout
  const [schoolName, setSchoolName] = useState('School Portal')
  const [schoolLogo, setSchoolLogo] = useState('')

  // Active cell state (for Excel formula bar display)
  const [activeCell, setActiveCell] = useState<{ day: string; periodIndex: number } | null>(null)

  // Fetch classes on mount
  useEffect(() => {
    fetch('/api/school/timetable')
      .then((r) => r.json())
      .then((data) => {
        if (data.classes) setClasses(data.classes)
      })
      .catch((err) => console.error('Error fetching classes:', err))

    // Fetch school info
    fetch('/api/school/profile')
      .then((r) => r.json())
      .then((data) => {
        if (data.school) {
          setSchoolName(data.school.name || 'School Portal')
          setSchoolLogo(data.school.logo_url || '')
        }
      })
      .catch((err) => console.error('Error fetching profile:', err))
  }, [])

  // Fetch timetable and subjects for the selected class
  const loadTimetable = useCallback(async (classId: string) => {
    if (!classId) return
    setLoading(true)
    setMsg(null)
    setActiveCell(null)

    try {
      const res = await fetch(`/api/school/timetable?class_id=${classId}`)
      const data = await res.json()

      if (data.subjects) {
        setSubjects(data.subjects)
      }

      if (data.timetable && data.timetable.schedule) {
        const sched = data.timetable.schedule
        if (sched.periods) setPeriods(sched.periods)
        if (sched.grid) {
          // Verify grid contains all default days
          const updatedGrid = { ...sched.grid }
          DEFAULT_DAYS.forEach((day) => {
            if (!updatedGrid[day]) {
              updatedGrid[day] = Array(sched.periods?.length || 7).fill('')
            } else if (updatedGrid[day].length < (sched.periods?.length || 7)) {
              // pad if list is shorter
              const diff = (sched.periods?.length || 7) - updatedGrid[day].length
              updatedGrid[day] = [...updatedGrid[day], ...Array(diff).fill('')]
            }
          })
          setGrid(updatedGrid)
        }
      } else {
        // Initialize default empty timetable
        const initialGrid: Record<string, string[]> = {}
        DEFAULT_DAYS.forEach((day) => {
          initialGrid[day] = Array(7).fill('')
        })
        // Set standard periods
        setPeriods([
          { name: 'Period 1', time: '08:00 - 08:45' },
          { name: 'Period 2', time: '08:45 - 09:30' },
          { name: 'Period 3', time: '09:30 - 10:15' },
          { name: 'Break', time: '10:15 - 10:45' },
          { name: 'Period 4', time: '10:45 - 11:30' },
          { name: 'Period 5', time: '11:30 - 12:15' },
          { name: 'Period 6', time: '12:15 - 01:00' },
        ])
        setGrid(initialGrid)
      }
    } catch (err) {
      console.error('Error loading timetable:', err)
      setMsg({ type: 'danger', text: 'Error loading timetable data.' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedClassId) {
      loadTimetable(selectedClassId)
    } else {
      setGrid({})
      setSubjects([])
      setActiveCell(null)
    }
  }, [selectedClassId, loadTimetable])

  const handleCellChange = (day: string, periodIndex: number, val: string) => {
    setGrid((prev) => {
      const copy = { ...prev }
      if (!copy[day]) {
        copy[day] = Array(periods.length).fill('')
      }
      const dayArr = [...copy[day]]
      dayArr[periodIndex] = val
      copy[day] = dayArr
      return copy
    })
  }

  const handlePeriodChange = (index: number, field: 'name' | 'time', val: string) => {
    setPeriods((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: val }
      return copy
    })
  }

  const addPeriod = () => {
    const newPeriodIndex = periods.length + 1
    const newPeriod: Period = {
      name: `Period ${newPeriodIndex}`,
      time: '00:00 - 00:00',
    }

    setPeriods((prev) => [...prev, newPeriod])

    // Update grid arrays for each day to include empty cell for the new period
    setGrid((prev) => {
      const copy = { ...prev }
      Object.keys(copy).forEach((day) => {
        copy[day] = [...copy[day], '']
      })
      return copy
    })
  }

  const removeLastPeriod = () => {
    if (periods.length <= 1) return
    if (!confirm('Are you sure you want to remove the last period column? Cell data for this period will be lost.')) return

    setPeriods((prev) => prev.slice(0, -1))
    setGrid((prev) => {
      const copy = { ...prev }
      Object.keys(copy).forEach((day) => {
        copy[day] = copy[day].slice(0, -1)
      })
      return copy
    })

    if (activeCell && activeCell.periodIndex >= periods.length - 1) {
      setActiveCell(null)
    }
  }

  const saveTimetable = async () => {
    if (!selectedClassId) return
    setSaving(true)
    setMsg(null)

    try {
      const res = await fetch('/api/school/timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: selectedClassId,
          schedule: {
            periods,
            grid,
          },
        }),
      })

      if (res.ok) {
        setMsg({ type: 'success', text: 'Timetable saved successfully!' })
      } else {
        const errData = await res.json()
        setMsg({ type: 'danger', text: errData.error || 'Failed to save timetable.' })
      }
    } catch (err) {
      console.error(err)
      setMsg({ type: 'danger', text: 'An error occurred while saving.' })
    } finally {
      setSaving(false)
    }
  }

  // Clone a day's schedule to all other days
  const cloneDaySchedule = (fromDay: string) => {
    const sourceSchedule = grid[fromDay]
    if (!sourceSchedule) return
    if (!confirm(`Do you want to copy ${fromDay}'s schedule to all other days?`)) return

    setGrid((prev) => {
      const copy = { ...prev }
      DEFAULT_DAYS.forEach((day) => {
        if (day !== fromDay) {
          copy[day] = [...sourceSchedule]
        }
      })
      return copy
    })
    setMsg({ type: 'success', text: `Successfully copied ${fromDay}'s schedule to all days!` })
  }

  const resetGrid = () => {
    if (!confirm('Are you sure you want to clear all cells in this timetable?')) return
    setGrid((prev) => {
      const copy = { ...prev }
      DEFAULT_DAYS.forEach((day) => {
        copy[day] = Array(periods.length).fill('')
      })
      return copy
    })
  }

  const getExcelColLetter = (index: number) => {
    // 0 -> B, 1 -> C, 2 -> D... (Day is A)
    return String.fromCharCode(66 + index) // ASCII 66 is 'B'
  }

  const getSelectedClassName = () => {
    const c = classes.find((cls) => cls.id === selectedClassId)
    return c ? c.name : ''
  }

  // Auto-generate active cell coordinate for Excel formula bar
  const getActiveCellCoord = () => {
    if (!activeCell) return ''
    const rowNum = DEFAULT_DAYS.indexOf(activeCell.day) + 3 // row 1 is letters, row 2 is period details
    const colLetter = getExcelColLetter(activeCell.periodIndex)
    return `${colLetter}${rowNum} (${activeCell.day.substring(0, 3)} - P${activeCell.periodIndex + 1})`
  }

  return (
    <div style={{ padding: '2rem', animation: 'fadeIn 0.3s ease' }}>
      {/* Dynamic styles to handle printing */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: #ffffff !important; color: #000000 !important; font-family: 'Inter', sans-serif !important; }
          .print-container {
            padding: 20px !important;
            width: 100% !important;
          }
          .print-header {
            display: flex !important;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid #000000;
            padding-bottom: 15px;
            margin-bottom: 25px;
          }
          .print-school-logo {
            width: 60px;
            height: 60px;
            object-fit: contain;
            border-radius: 8px;
            background: #fff;
          }
          .print-title {
            font-size: 20pt !important;
            font-weight: 800 !important;
            color: #000000 !important;
            text-align: center;
            flex-grow: 1;
          }
          .print-meta {
            font-size: 10pt;
            color: #444444;
            text-align: right;
          }
          .print-excel-table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-top: 15px !important;
          }
          .print-excel-table th, .print-excel-table td {
            border: 1px solid #000000 !important;
            padding: 10px 8px !important;
            text-align: center !important;
            vertical-align: middle !important;
            font-size: 10pt !important;
            color: #000000 !important;
            background: transparent !important;
          }
          .print-excel-table th {
            font-weight: 700 !important;
            background-color: #f3f4f6 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-cell-subject {
            font-weight: 600 !important;
            font-size: 10.5pt !important;
          }
          .print-cell-time {
            font-size: 8pt !important;
            color: #555555 !important;
            margin-top: 3px;
          }
        }
        @media screen {
          .print-only { display: none !important; }
        }
      ` }} />

      {/* Screen layout (NO PRINT) */}
      <div className="no-print">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>📅 Class Timetable</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Create and manage weekly schedules and subject timings for each class</p>
          </div>
          {selectedClassId && (
            <button onClick={() => window.print()} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🖨️ Print Timetable
            </button>
          )}
        </div>

        {msg && <div className={`alert alert-${msg.type} animate-fade`} style={{ marginBottom: '1.5rem' }}>{msg.text}</div>}

        {/* Filter Section */}
        <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 250px' }}>
            <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Select Class</label>
            <select className="form-select" value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)}>
              <option value="">-- Select a Class --</option>
              {classes.map(c => <option key={c.id} value={c.id}>Grade {c.name}</option>)}
            </select>
          </div>
          {selectedClassId && (
            <div style={{ display: 'flex', gap: '0.75rem', alignSelf: 'flex-end', marginTop: '1rem' }}>
              <button onClick={addPeriod} className="btn btn-secondary btn-sm">➕ Add Period</button>
              <button onClick={removeLastPeriod} className="btn btn-secondary btn-sm" style={{ color: 'var(--danger)' }} disabled={periods.length <= 1}>❌ Remove Last Period</button>
              <button onClick={resetGrid} className="btn btn-secondary btn-sm">🧹 Clear Sheet</button>
              <button onClick={saveTimetable} className="btn btn-primary btn-sm" disabled={saving}>
                {saving ? '⏳ Saving...' : '💾 Save Timetable'}
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="card" style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>Loading timetable data...</p>
          </div>
        ) : !selectedClassId ? (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6rem 2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📅</div>
            <h3 style={{ marginBottom: '0.5rem' }}>No Class Selected</h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '400px' }}>Please select a class from the filter dropdown above to view or modify its weekly timetable.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {/* Excel Formula Bar Display */}
            <div style={{
              display: 'flex',
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              overflow: 'hidden',
              fontFamily: 'monospace',
              fontSize: '0.85rem'
            }}>
              <div style={{
                background: '#e2e8f0',
                padding: '0.5rem 1rem',
                borderRight: '1px solid #cbd5e1',
                fontWeight: 700,
                color: 'var(--text-secondary)',
                minWidth: '160px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {activeCell ? getActiveCellCoord() : 'A1'}
              </div>
              <div style={{
                background: '#cbd5e1',
                padding: '0.5rem 0.75rem',
                borderRight: '1px solid #cbd5e1',
                fontWeight: 700,
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center'
              }}>
                fx
              </div>
              <div style={{
                flex: 1,
                background: '#ffffff',
                padding: '0.5rem 1rem',
                color: activeCell ? 'var(--text-primary)' : 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center'
              }}>
                {activeCell ? (
                  grid[activeCell.day]?.[activeCell.periodIndex] || '(Empty Cell)'
                ) : (
                  'Select any cell to view and edit details'
                )}
              </div>
            </div>

            {/* Excel Styled Table */}
            <div style={{
              overflowX: 'auto',
              borderRadius: '12px',
              border: '1px solid #cbd5e1',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'separate',
                borderSpacing: 0,
                background: '#ffffff'
              }}>
                <thead>
                  {/* Excel Column Letters Header */}
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{
                      width: '40px',
                      background: '#f1f5f9',
                      borderRight: '1px solid #cbd5e1',
                      borderBottom: '1px solid #cbd5e1',
                      padding: '0.25rem',
                      textAlign: 'center',
                      fontSize: '0.7rem',
                      color: 'var(--text-muted)'
                    }}>
                      &nbsp;
                    </th>
                    <th style={{
                      width: '160px',
                      background: '#f1f5f9',
                      borderRight: '1px solid #cbd5e1',
                      borderBottom: '1px solid #cbd5e1',
                      padding: '0.25rem',
                      textAlign: 'center',
                      fontSize: '0.7rem',
                      color: 'var(--text-muted)'
                    }}>
                      A
                    </th>
                    {periods.map((_, index) => (
                      <th key={index} style={{
                        background: '#f1f5f9',
                        borderRight: '1px solid #cbd5e1',
                        borderBottom: '1px solid #cbd5e1',
                        padding: '0.25rem',
                        textAlign: 'center',
                        fontSize: '0.7rem',
                        color: 'var(--text-muted)'
                      }}>
                        {getExcelColLetter(index)}
                      </th>
                    ))}
                  </tr>

                  {/* Timetable Period Headers */}
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{
                      width: '40px',
                      background: '#f1f5f9',
                      borderRight: '1px solid #cbd5e1',
                      borderBottom: '1px solid #cbd5e1',
                      padding: '0.5rem',
                      textAlign: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: 'var(--text-muted)'
                    }}>
                      &nbsp;
                    </th>
                    <th style={{
                      width: '160px',
                      borderRight: '1px solid #cbd5e1',
                      borderBottom: '2px solid #cbd5e1',
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontWeight: 700,
                      fontSize: '0.85rem'
                    }}>
                      Day / Period
                    </th>
                    {periods.map((p, index) => (
                      <th key={index} style={{
                        borderRight: '1px solid #cbd5e1',
                        borderBottom: '2px solid #cbd5e1',
                        padding: '0.5rem',
                        minWidth: '150px',
                        background: '#f8fafc'
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                          <input
                            type="text"
                            value={p.name}
                            onChange={(e) => handlePeriodChange(index, 'name', e.target.value)}
                            placeholder={`Period ${index + 1}`}
                            style={{
                              fontWeight: 700,
                              textAlign: 'center',
                              border: 'none',
                              background: 'transparent',
                              outline: 'none',
                              width: '100%',
                              fontSize: '0.85rem',
                              color: 'var(--text-primary)',
                              padding: '2px',
                              display: 'block'
                            }}
                          />
                          <input
                            type="text"
                            value={p.time}
                            onChange={(e) => handlePeriodChange(index, 'time', e.target.value)}
                            placeholder="e.g. 08:00 - 08:45"
                            style={{
                              fontWeight: 500,
                              textAlign: 'center',
                              border: 'none',
                              background: 'transparent',
                              outline: 'none',
                              width: '100%',
                              fontSize: '0.75rem',
                              color: 'var(--text-muted)',
                              padding: '2px',
                              display: 'block'
                            }}
                          />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DEFAULT_DAYS.map((day, rowIndex) => (
                    <tr key={day}>
                      {/* Excel Row Index Numbers */}
                      <td style={{
                        background: '#f1f5f9',
                        borderRight: '1px solid #cbd5e1',
                        borderBottom: '1px solid #cbd5e1',
                        padding: '0.5rem',
                        textAlign: 'center',
                        fontSize: '0.7rem',
                        color: 'var(--text-muted)',
                        fontWeight: 700
                      }}>
                        {rowIndex + 3}
                      </td>

                      {/* Day Label Cell (Excel Column A) */}
                      <td style={{
                        fontWeight: 700,
                        borderRight: '1px solid #cbd5e1',
                        borderBottom: '1px solid #cbd5e1',
                        padding: '0.75rem 1rem',
                        background: '#f8fafc',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.875rem'
                      }}>
                        <span>📅 {day}</span>
                        <button
                          onClick={() => cloneDaySchedule(day)}
                          title={`Copy ${day}'s schedule to other days`}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            color: 'var(--primary-light)',
                            transition: 'background 0.15s'
                          }}
                          onMouseOver={(e) => (e.currentTarget.style.background = '#e2e8f0')}
                          onMouseOut={(e) => (e.currentTarget.style.background = 'none')}
                        >
                          📋
                        </button>
                      </td>

                      {/* Editable Cells */}
                      {periods.map((_, periodIndex) => {
                        const cellValue = grid[day]?.[periodIndex] || ''
                        const isActive = activeCell?.day === day && activeCell?.periodIndex === periodIndex
                        
                        return (
                          <td
                            key={periodIndex}
                            onClick={() => setActiveCell({ day, periodIndex })}
                            style={{
                              borderRight: '1px solid #cbd5e1',
                              borderBottom: '1px solid #cbd5e1',
                              padding: 0,
                              background: isActive ? '#f0f9ff' : 'transparent',
                              transition: 'background 0.15s'
                            }}
                          >
                            <input
                              type="text"
                              list={`subjects-list-${selectedClassId}`}
                              value={cellValue}
                              onChange={(e) => handleCellChange(day, periodIndex, e.target.value)}
                              placeholder="-"
                              style={{
                                width: '100%',
                                height: '100%',
                                padding: '0.75rem 0.5rem',
                                border: isActive ? '2px solid var(--primary)' : 'none',
                                background: 'transparent',
                                outline: 'none',
                                textAlign: 'center',
                                fontSize: '0.85rem',
                                fontWeight: cellValue ? 600 : 400,
                                color: cellValue ? 'var(--text-primary)' : 'var(--text-muted)'
                              }}
                            />
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Suggestions Datalist for Autocomplete */}
            <datalist id={`subjects-list-${selectedClassId}`}>
              <option value="Break" />
              <option value="Lunch Break" />
              <option value="No Class" />
              <option value="Assembly" />
              <option value="Games / PE" />
              <option value="Library" />
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.name} />
              ))}
            </datalist>
          </div>
        )}
      </div>

      {/* Print Only Layout (Triggered via print stylesheet) */}
      <div className="print-only print-container">
        <div className="print-header">
          {schoolLogo ? (
            <img src={schoolLogo} alt="School Logo" className="print-school-logo" />
          ) : (
            <div style={{ fontSize: '28px' }}>🏫</div>
          )}
          <div className="print-title">
            <div>{schoolName}</div>
            <div style={{ fontSize: '12pt', fontWeight: 600, color: '#333333', marginTop: '5px' }}>
              WEEKLY CLASS TIMETABLE — GRADE {getSelectedClassName()}
            </div>
          </div>
          <div className="print-meta">
            <div>Academic Session: 2026</div>
            <div style={{ marginTop: '3px' }}>Printed on: {new Date().toLocaleDateString()}</div>
          </div>
        </div>

        <table className="print-excel-table">
          <thead>
            <tr>
              <th style={{ width: '150px' }}>Day / Period</th>
              {periods.map((p, idx) => (
                <th key={idx}>
                  <div>{p.name || `Period ${idx + 1}`}</div>
                  {p.time && <div style={{ fontSize: '8pt', fontWeight: 500, color: '#444444', marginTop: '2px' }}>({p.time})</div>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DEFAULT_DAYS.map((day) => (
              <tr key={day}>
                <td style={{ fontWeight: 'bold', backgroundColor: '#f9fafb' }}>{day}</td>
                {periods.map((_, periodIndex) => {
                  const val = grid[day]?.[periodIndex] || '-'
                  return (
                    <td key={periodIndex}>
                      <div className="print-cell-subject">{val}</div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        
        <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-between', fontSize: '9pt', color: '#444444' }}>
          <div>Generated by: EduManage Portal</div>
          <div style={{ borderTop: '1px solid #000000', width: '200px', textAlign: 'center', paddingTop: '5px', marginTop: '20px' }}>
            Principal Signature
          </div>
        </div>
      </div>
    </div>
  )
}
