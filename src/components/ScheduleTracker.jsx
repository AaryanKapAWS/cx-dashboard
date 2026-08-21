import { useState, useMemo, useCallback } from 'react'
import testTemplates from '../data/test_templates.json'

const STORAGE_KEY = 'test_schedule'

const SECTION_COLOURS = {
  transformer_bay: '#f59e0b', line_bay: '#3b82f6', bus_section: '#6366f1',
  switchgear: '#22c55e', hv_switchgear_gis: '#22c55e', protection: '#a855f7',
  cables: '#64748b', battery_dc: '#f97316', earthing: '#14b8a6',
  substation: '#6b7280', aux_transformer: '#f97316', panel_board: '#8b5cf6'
}

function loadSchedule() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function saveSchedule(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function makeScheduleKey(item) {
  return `${(item.feeder_ref || 'unknown').replace(/\s/g, '_')}_${(item.displayName || item.name || item.type).replace(/\s/g, '_')}`
}

function getTestCount(item) {
  if (item.customTests) return item.customTests.filter(t => t.enabled).length
  return (testTemplates[item.type] || []).length
}

function daysBetween(start, end) {
  if (!start || !end) return null
  const d1 = new Date(start)
  const d2 = new Date(end)
  const diff = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24))
  return diff
}

function getStatus(sched) {
  if (!sched || (!sched.plannedStart && !sched.plannedFinish && !sched.actualStart && !sched.actualFinish)) {
    return 'not_scheduled'
  }
  if (sched.actualFinish) return 'complete'
  if (sched.actualStart && !sched.actualFinish) return 'in_progress'
  const today = new Date().toISOString().split('T')[0]
  if (sched.plannedFinish && sched.plannedFinish < today && !sched.actualFinish) return 'delayed'
  if (sched.plannedStart) {
    const daysUntil = daysBetween(today, sched.plannedStart)
    if (daysUntil !== null && daysUntil <= 7 && daysUntil >= 0) return 'upcoming'
  }
  return 'scheduled'
}

function StatusBadge({ status }) {
  const config = {
    complete: { emoji: '🟢', label: 'Complete', bg: '#dcfce7', color: '#166534' },
    in_progress: { emoji: '🔵', label: 'In Progress', bg: '#dbeafe', color: '#1e40af' },
    upcoming: { emoji: '🟡', label: 'Upcoming', bg: '#fef9c3', color: '#854d0e' },
    delayed: { emoji: '🔴', label: 'Delayed', bg: '#fee2e2', color: '#991b1b' },
    not_scheduled: { emoji: '⚪', label: 'Not Scheduled', bg: '#f3f4f6', color: '#6b7280' },
    scheduled: { emoji: '📅', label: 'Scheduled', bg: '#e0e7ff', color: '#3730a3' },
  }
  const c = config[status] || config.not_scheduled
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600,
      background: c.bg, color: c.color, whiteSpace: 'nowrap'
    }}>
      {c.emoji} {c.label}
    </span>
  )
}

function MiniProgressBar({ current, total, colour }) {
  const pct = total > 0 ? (current / total) * 100 : 0
  return (
    <div style={{ width: 80, height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: colour || '#22c55e', borderRadius: 4 }} />
    </div>
  )
}

function StatCard({ value, label, accent }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
      padding: '14px 16px', textAlign: 'center', minWidth: 0,
      borderTop: accent ? `3px solid ${accent}` : undefined
    }}>
      <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1f2937' }}>{value}</div>
      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>{label}</div>
    </div>
  )
}

export default function ScheduleTracker({ equipment }) {
  const [schedule, setSchedule] = useState(loadSchedule)
  const [expandedSections, setExpandedSections] = useState({})
  const [statusFilter, setStatusFilter] = useState('All')
  const [sectionFilter, setSectionFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAutoSchedule, setShowAutoSchedule] = useState(false)
  const [autoStartDate, setAutoStartDate] = useState('')
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const updateSchedule = useCallback((key, field, value) => {
    setSchedule(prev => {
      const updated = {
        ...prev,
        [key]: {
          ...(prev[key] || { plannedStart: '', plannedFinish: '', actualStart: '', actualFinish: '' }),
          [field]: value
        }
      }
      saveSchedule(updated)
      return updated
    })
  }, [])

  // Build structured data: group by section
  const structured = useMemo(() => {
    if (!equipment || !equipment.length) return { sections: {}, sectionList: [] }
    const secs = {}
    equipment.forEach(item => {
      const testCount = getTestCount(item)
      if (testCount === 0) return
      const feederParts = (item.feeder_ref || '').split(' — ')
      const sectionName = feederParts[0] || item.section || 'Other'
      if (!secs[sectionName]) secs[sectionName] = []
      secs[sectionName].push(item)
    })
    return { sections: secs, sectionList: Object.keys(secs).sort() }
  }, [equipment])

  // Stats
  const stats = useMemo(() => {
    let total = 0, scheduled = 0, unscheduled = 0
    let onTrack = 0, delayed = 0, complete = 0, inProgress = 0
    if (equipment) {
      equipment.forEach(item => {
        if (getTestCount(item) === 0) return
        total++
        const key = makeScheduleKey(item)
        const sched = schedule[key]
        const status = getStatus(sched)
        if (status === 'not_scheduled') unscheduled++
        else scheduled++
        if (status === 'complete') complete++
        else if (status === 'delayed') delayed++
        else if (status === 'in_progress') inProgress++
        else if (status !== 'not_scheduled') onTrack++
      })
    }
    const pctScheduled = total > 0 ? Math.round((scheduled / total) * 100) : 0
    return { total, scheduled, unscheduled, onTrack, delayed, complete, inProgress, pctScheduled }
  }, [equipment, schedule])

  // Filtering
  const matchesFilters = useCallback((item) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const name = (item.displayName || item.name || '').toLowerCase()
      const type = (item.type || '').toLowerCase()
      if (!name.includes(q) && !type.includes(q)) return false
    }
    if (statusFilter !== 'All') {
      const key = makeScheduleKey(item)
      const sched = schedule[key]
      const status = getStatus(sched)
      if (statusFilter === 'Scheduled' && status === 'not_scheduled') return false
      if (statusFilter === 'Unscheduled' && status !== 'not_scheduled') return false
      if (statusFilter === 'Delayed' && status !== 'delayed') return false
      if (statusFilter === 'Complete' && status !== 'complete') return false
    }
    return true
  }, [searchQuery, statusFilter, schedule])

  const toggleSection = (key) => setExpandedSections(p => ({ ...p, [key]: !p[key] }))

  // Auto-schedule
  const handleAutoSchedule = useCallback(() => {
    if (!autoStartDate) return
    const newSchedule = { ...schedule }
    let currentDate = new Date(autoStartDate)

    for (const sectionName of structured.sectionList) {
      const items = structured.sections[sectionName]
      let sectionStart = new Date(currentDate)
      let maxFinish = new Date(currentDate)

      items.forEach(item => {
        const testCount = getTestCount(item)
        if (testCount === 0) return
        const key = makeScheduleKey(item)
        const start = new Date(sectionStart)
        const finish = new Date(start)
        finish.setDate(finish.getDate() + testCount)

        newSchedule[key] = {
          plannedStart: start.toISOString().split('T')[0],
          plannedFinish: finish.toISOString().split('T')[0],
          actualStart: newSchedule[key]?.actualStart || '',
          actualFinish: newSchedule[key]?.actualFinish || '',
        }

        if (finish > maxFinish) maxFinish = finish
      })

      // Next section starts after this one finishes
      currentDate = new Date(maxFinish)
      currentDate.setDate(currentDate.getDate() + 1)
    }

    setSchedule(newSchedule)
    saveSchedule(newSchedule)
    setShowAutoSchedule(false)
    setAutoStartDate('')
  }, [autoStartDate, schedule, structured])

  // Clear all
  const handleClearAll = useCallback(() => {
    setSchedule({})
    saveSchedule({})
    setShowClearConfirm(false)
  }, [])

  // Section date range
  const getSectionDateRange = useCallback((items) => {
    let earliest = null, latest = null
    items.forEach(item => {
      const key = makeScheduleKey(item)
      const sched = schedule[key]
      if (sched?.plannedStart) {
        if (!earliest || sched.plannedStart < earliest) earliest = sched.plannedStart
      }
      if (sched?.plannedFinish) {
        if (!latest || sched.plannedFinish > latest) latest = sched.plannedFinish
      }
    })
    return { earliest, latest }
  }, [schedule])

  const getSectionScheduledCount = useCallback((items) => {
    let scheduled = 0
    items.forEach(item => {
      const key = makeScheduleKey(item)
      const sched = schedule[key]
      if (sched && (sched.plannedStart || sched.plannedFinish)) scheduled++
    })
    return scheduled
  }, [schedule])

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '16px 24px'
    }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 'bold', color: '#1f2937' }}>
          Schedule & Timeline
        </h2>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>
          Set planned and actual dates for equipment commissioning. Dates populate the COR export.
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginBottom: 20 }}>
        <StatCard value={stats.total} label="Total Equipment" />
        <StatCard value={stats.scheduled} label="Scheduled" accent="#3b82f6" />
        <StatCard value={stats.unscheduled} label="Unscheduled" accent="#9ca3af" />
        <StatCard value={stats.onTrack} label="On Track" accent="#22c55e" />
        <StatCard value={stats.delayed} label="Delayed" accent="#ef4444" />
        <StatCard value={stats.complete} label="Complete" accent="#10b981" />
        <StatCard value={`${stats.pctScheduled}%`} label="% Scheduled" accent="#6366f1" />
      </div>

      {/* Filter Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16,
        padding: 12, background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb',
        flexWrap: 'wrap'
      }}>
        {/* Status filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 11, color: '#6b7280', marginRight: 4 }}>Status:</span>
          {['All', 'Scheduled', 'Unscheduled', 'Delayed', 'Complete'].map((opt, i, arr) => (
            <button key={opt} onClick={() => setStatusFilter(opt)}
              style={{
                padding: '4px 10px', fontSize: 10, fontWeight: 'bold', cursor: 'pointer',
                border: '1px solid #d1d5db', background: statusFilter === opt ? '#1f2937' : '#fff',
                color: statusFilter === opt ? '#fff' : '#6b7280',
                borderRadius: i === 0 ? '4px 0 0 4px' : i === arr.length - 1 ? '0 4px 4px 0' : 0,
                marginLeft: i > 0 ? -1 : 0
              }}>
              {opt}
            </button>
          ))}
        </div>

        {/* Section filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 11, color: '#6b7280' }}>Section:</span>
          <select value={sectionFilter} onChange={e => setSectionFilter(e.target.value)}
            style={{ fontSize: 11, padding: '4px 8px', borderRadius: 4, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' }}>
            <option value="All">All</option>
            {structured.sectionList.map(s => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, minWidth: 150 }}>
          <span style={{ fontSize: 13 }}>🔍</span>
          <input type="text" placeholder="Search equipment..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ fontSize: 12, padding: '4px 8px', borderRadius: 4, border: '1px solid #d1d5db', flex: 1, outline: 'none' }} />
        </div>

        {/* Bulk actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowAutoSchedule(true)}
            style={{
              padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
              border: '1px solid #3b82f6', background: '#eff6ff', color: '#1d4ed8',
              borderRadius: 5
            }}>
            ⚡ Auto-Schedule
          </button>
          <button onClick={() => setShowClearConfirm(true)}
            style={{
              padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
              border: '1px solid #ef4444', background: '#fef2f2', color: '#dc2626',
              borderRadius: 5
            }}>
            🗑 Clear All
          </button>
        </div>
      </div>

      {/* Auto-Schedule Dialog */}
      {showAutoSchedule && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.4)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: '#fff', borderRadius: 12, padding: 24, minWidth: 320,
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: '#1f2937' }}>
              ⚡ Auto-Schedule
            </h3>
            <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 16px' }}>
              Auto-fill planned dates sequentially: 1 day per test, sections sequential, items within a section parallel.
            </p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Start Date</label>
              <input type="date" value={autoStartDate} onChange={e => setAutoStartDate(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, width: '100%' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowAutoSchedule(false); setAutoStartDate('') }}
                style={{ padding: '8px 16px', fontSize: 12, fontWeight: 600, border: '1px solid #d1d5db', background: '#fff', color: '#374151', borderRadius: 6, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleAutoSchedule} disabled={!autoStartDate}
                style={{
                  padding: '8px 16px', fontSize: 12, fontWeight: 600, border: 'none',
                  background: autoStartDate ? '#3b82f6' : '#94a3b8', color: '#fff',
                  borderRadius: 6, cursor: autoStartDate ? 'pointer' : 'not-allowed'
                }}>
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Confirmation Dialog */}
      {showClearConfirm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.4)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: '#fff', borderRadius: 12, padding: 24, minWidth: 320,
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: '#dc2626' }}>
              🗑 Clear All Dates?
            </h3>
            <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 16px' }}>
              This will remove all planned and actual dates for every equipment item. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowClearConfirm(false)}
                style={{ padding: '8px 16px', fontSize: 12, fontWeight: 600, border: '1px solid #d1d5db', background: '#fff', color: '#374151', borderRadius: 6, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleClearAll}
                style={{ padding: '8px 16px', fontSize: 12, fontWeight: 600, border: 'none', background: '#dc2626', color: '#fff', borderRadius: 6, cursor: 'pointer' }}>
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content: Sections */}
      {structured.sectionList
        .filter(sec => sectionFilter === 'All' || sec === sectionFilter)
        .map(sectionName => {
          const items = structured.sections[sectionName]
          const filteredItems = items.filter(matchesFilters)
          if (filteredItems.length === 0) return null

          const isExpanded = expandedSections[sectionName] === true
          const sectionType = items[0]?.section || ''
          const borderColour = SECTION_COLOURS[sectionType] || '#6b7280'
          const { earliest, latest } = getSectionDateRange(items)
          const scheduledCount = getSectionScheduledCount(items)

          return (
            <div key={sectionName} style={{ marginBottom: 12 }}>
              {/* Section Header */}
              <div onClick={(e) => { e.stopPropagation(); toggleSection(sectionName); }} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', background: '#f9fafb', borderRadius: 8,
                border: '1px solid #e5e7eb', cursor: 'pointer',
                borderLeft: `4px solid ${borderColour}`
              }}>
                <span style={{ fontSize: 11, color: '#6b7280' }}>
                  {isExpanded ? '▼' : '▶'}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1f2937', flex: 1 }}>
                  {sectionName.replace(/_/g, ' ')}
                </span>
                <span style={{ fontSize: 10, color: '#6b7280' }}>
                  {filteredItems.length} items
                </span>
                <MiniProgressBar current={scheduledCount} total={items.length} colour={borderColour} />
                {earliest && latest && (
                  <span style={{ fontSize: 10, color: '#6b7280', whiteSpace: 'nowrap' }}>
                    {earliest} → {latest}
                  </span>
                )}
              </div>

              {/* Section Content */}
              {isExpanded && (
                <div style={{ marginTop: 4, overflowX: 'auto' }}>
                  <table style={{
                    width: '100%', borderCollapse: 'collapse', fontSize: 12,
                    background: '#fff', borderRadius: 6, overflow: 'hidden',
                    border: '1px solid #e5e7eb'
                  }}>
                    <thead>
                      <tr style={{ background: '#f9fafb' }}>
                        <th style={thStyle}>Equipment</th>
                        <th style={{ ...thStyle, width: 50 }}>Tests</th>
                        <th style={{ ...thStyle, width: 110 }}>Planned Start</th>
                        <th style={{ ...thStyle, width: 110 }}>Planned Finish</th>
                        <th style={{ ...thStyle, width: 110 }}>Actual Start</th>
                        <th style={{ ...thStyle, width: 110 }}>Actual Finish</th>
                        <th style={{ ...thStyle, width: 60 }}>Duration</th>
                        <th style={{ ...thStyle, width: 110 }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map((item, idx) => {
                        const key = makeScheduleKey(item)
                        const sched = schedule[key] || { plannedStart: '', plannedFinish: '', actualStart: '', actualFinish: '' }
                        const status = getStatus(sched)
                        const testCount = getTestCount(item)
                        const duration = daysBetween(sched.plannedStart, sched.plannedFinish)

                        return (
                          <tr key={key + idx} style={{
                            borderBottom: '1px solid #f3f4f6',
                            background: idx % 2 === 0 ? '#fff' : '#fafbfc'
                          }}>
                            <td style={tdStyle}>
                              <span style={{ fontWeight: 500, color: '#1f2937' }}>
                                {item.displayName || item.name || item.type}
                              </span>
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'center' }}>
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                width: 24, height: 20, borderRadius: 4, fontSize: 10, fontWeight: 700,
                                background: '#e5e7eb', color: '#374151'
                              }}>
                                {testCount}
                              </span>
                            </td>
                            <td style={tdStyle}>
                              <input type="date" value={sched.plannedStart || ''}
                                onChange={e => updateSchedule(key, 'plannedStart', e.target.value)}
                                style={dateInputStyle} />
                            </td>
                            <td style={tdStyle}>
                              <input type="date" value={sched.plannedFinish || ''}
                                onChange={e => updateSchedule(key, 'plannedFinish', e.target.value)}
                                style={dateInputStyle} />
                            </td>
                            <td style={tdStyle}>
                              <input type="date" value={sched.actualStart || ''}
                                onChange={e => updateSchedule(key, 'actualStart', e.target.value)}
                                style={{ ...dateInputStyle, borderColor: sched.actualStart ? '#86efac' : '#e5e7eb' }} />
                            </td>
                            <td style={tdStyle}>
                              <input type="date" value={sched.actualFinish || ''}
                                onChange={e => updateSchedule(key, 'actualFinish', e.target.value)}
                                style={{ ...dateInputStyle, borderColor: sched.actualFinish ? '#86efac' : '#e5e7eb' }} />
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'center' }}>
                              {duration !== null ? (
                                <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>
                                  {duration}d
                                </span>
                              ) : (
                                <span style={{ fontSize: 10, color: '#9ca3af' }}>—</span>
                              )}
                            </td>
                            <td style={tdStyle}>
                              <StatusBadge status={status} />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}

      {/* Empty State */}
      {(!equipment || equipment.length === 0) && (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: '#6b7280' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📅</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1f2937', marginBottom: 8 }}>No Equipment to Schedule</div>
          <div style={{ fontSize: 12 }}>Add equipment in the Scope & Export tab to begin scheduling.</div>
        </div>
      )}
    </div>
  )
}

// Styles
const thStyle = {
  padding: '8px 10px', fontSize: 10, fontWeight: 700, color: '#6b7280',
  textAlign: 'left', borderBottom: '2px solid #e5e7eb', whiteSpace: 'nowrap'
}

const tdStyle = {
  padding: '6px 10px', verticalAlign: 'middle'
}

const dateInputStyle = {
  padding: '4px 6px', border: '1px solid #e5e7eb', borderRadius: 4,
  fontSize: 11, width: '100%', outline: 'none', color: '#374151',
  background: '#fff'
}
