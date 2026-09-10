import React, { useState, useMemo, useCallback } from 'react'
import testTemplates from '../data/test_templates.json'
import { getCustomTemplates } from '../utils/customTemplates'

// Resolve tests for any equipment item (built-in, custom, or imported)
function resolveTests(item) {
  if (item.customTests && item.customTests.length > 0) {
    return item.customTests.filter(t => t.enabled !== false).map(t => [t.level || 'L3', t.name, ''])
  }
  const builtin = testTemplates[item.type]
  if (builtin && builtin.length > 0) return builtin
  const ct = getCustomTemplates().find(t => t.id === item.type)
  if (ct) return ct.tests.map(t => [t[0], t[1], ''])
  return []
}

const STORAGE_KEY = 'test_progress'

// ── Full default progress object for every test ──────────────────────────────
const PROGRESS_DEFAULTS = {
  tested: false,         // SAT Completed        – checkbox green
  witnessed: false,      // CxA Witnessed         – checkbox blue
  completed: false,      // Completed             – 3-state purple (false|true|'NA')
  reportReceivedDate: null,  // Report Received   – date
  reportOnProcore: false,    // On Procore        – checkbox orange
  reportReviewedDate: null,  // Report Reviewed   – date
  reviewed: false,       // Reviewed              – 3-state teal (false|true|'NA')
  outstandingObs: false, // Obs                   – 3-state red  (false|true|'NA')
  closed: false,         // Report Closed         – checkbox dark-green
  comments: '',          // Comments              – free text
  critical: false        // Critical              – auto for L5, manual edit
}

const SECTION_COLOURS = {
  transformer_bay: '#f59e0b', line_bay: '#3b82f6', bus_section: '#6366f1',
  switchgear: '#22c55e', hv_switchgear_gis: '#22c55e', protection: '#a855f7',
  cables: '#64748b', battery_dc: '#f97316', earthing: '#14b8a6',
  substation: '#6b7280', aux_transformer: '#f97316', panel_board: '#8b5cf6'
}

const LEVEL_COLOURS = {
  L1: '#7c3aed', L2: '#d97706', L3: '#059669', L4: '#2563eb', L5: '#db2777'
}

// ── Helpers ──────────────────────────────────────────────────────────────────

// Stable key for progress tracking - uses feeder_ref + type + instance count
function makeProgressKey(item, testIdx) {
  return `${(item.feeder_ref || 'unknown').replace(/\s/g, '_')}_${(item.displayName || item.name || item.type).replace(/\s/g, '_')}_${testIdx}`
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function saveProgress(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

/** The 4 core completion gates (administrative fields like dates/procore are NOT gates). */
function isFullyDone(p) {
  return p && p.tested && p.witnessed && (p.completed === true) && p.closed
}

/** Weighted COR score per-test: SAT 60 %, report-in 15 %, report-reviewed 15 %, closed 10 %. */
function weightedScore(p) {
  if (!p) return 0
  let s = 0
  if (p.tested) s += 0.6
  if (p.reportReceivedDate) s += 0.15
  if (p.reportReviewedDate) s += 0.15
  if (p.closed) s += 0.1
  return s
}

// ── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ value, total, colour, height = 6 }) {
  const pct = total > 0 ? (value / total) * 100 : 0
  return (
    <div style={{ width: '100%', height, background: '#e5e7eb', borderRadius: height/2, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: colour, borderRadius: height/2, transition: 'width 0.3s' }} />
    </div>
  )
}

function Checkbox({ checked, colour, onChange }) {
  return (
    <div onClick={onChange} style={{ width: 24, height: 24, borderRadius: 4,
      border: checked ? 'none' : '2px solid #d1d5db', cursor: 'pointer',
      background: checked ? colour : '#fff', display: 'flex',
      alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {checked && <span style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>✓</span>}
    </div>
  )
}

/** YES → NO → N/A → YES  (false | true | 'NA') */
function ThreeStateToggle({ value, colour, onChange }) {
  const cycle = () => {
    if (value === false) onChange(true)
    else if (value === true) onChange('NA')
    else onChange(false)
  }
  return (
    <div onClick={cycle} style={{
      width: 24, height: 24, borderRadius: 4,
      border: value ? 'none' : `2px solid ${value === 'NA' ? '#9ca3af' : '#d1d5db'}`,
      background: value === 'NA' ? '#e5e7eb' : value ? colour : 'transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', fontSize: 9, fontWeight: 700,
      color: value === 'NA' ? '#6b7280' : '#fff'
    }}>
      {value === 'NA' ? 'NA' : value ? '✓' : ''}
    </div>
  )
}

function LevelBadge({ level }) {
  const colour = LEVEL_COLOURS[level] || '#6b7280'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 22, height: 18, borderRadius: 3, fontSize: 9, fontWeight: 'bold',
      color: '#fff', background: colour, marginRight: 2 }}>
      {level}
    </span>
  )
}

function MiniProgressBar({ current, total }) {
  const pct = total > 0 ? (current / total) * 100 : 0
  return (
    <div style={{ width: 80, height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: '#22c55e', borderRadius: 4 }} />
    </div>
  )
}

/** Compact date <input> with green tint when filled */
function CompactDateInput({ value, onChange }) {
  return (
    <input type="date" value={value || ''}
      onChange={e => onChange(e.target.value || null)}
      onClick={e => e.stopPropagation()}
      style={{ fontSize: 11, padding: '2px 4px', borderRadius: 4,
        border: '1px solid #d1d5db', background: value ? '#f0fdf4' : '#fff',
        color: '#374151', width: '100%', height: 26 }} />
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export default function ProgressTracker({ equipment }) {
  const [progress, setProgress] = useState(loadProgress)
  const [expandedSections, setExpandedSections] = useState({})
  const [expandedItems, setExpandedItems] = useState({})
  const [expandedTests, setExpandedTests] = useState({})
  const [levelFilter, setLevelFilter] = useState('All')
  const [sectionFilter, setSectionFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [completionFilter, setCompletionFilter] = useState('All')

  // ── Progress mutators ────────────────────────────────────────────────────

  const updateProgress = useCallback((key, field, value) => {
    setProgress(prev => {
      const entry = { ...(prev[key] || PROGRESS_DEFAULTS), [field]: value }
      const today = new Date().toISOString().split('T')[0]

      // Auto-fill Report Received date when Procore is checked
      if (field === 'reportOnProcore' && value && !entry.reportReceivedDate) {
        entry.reportReceivedDate = today
      }
      // Auto-fill Report Reviewed date when Reviewed is checked
      if (field === 'reviewed' && value === true && !entry.reportReviewedDate) {
        entry.reportReviewedDate = today
      }
      const updated = { ...prev, [key]: entry }
      saveProgress(updated)
      return updated
    })
  }, [])

  const markAllTest = useCallback((key) => {
    setProgress(prev => {
      const prevP = prev[key] || PROGRESS_DEFAULTS
      const updated = { ...prev, [key]: {
        tested: true, witnessed: true, completed: true,
        reportOnProcore: true, reviewed: true, closed: true,
        outstandingObs: false,
        critical: prevP.critical || false,
        reportReceivedDate: prevP.reportReceivedDate || new Date().toISOString().split('T')[0],
        reportReviewedDate: prevP.reportReviewedDate || new Date().toISOString().split('T')[0],
        comments: prevP.comments || ''
      }}
      saveProgress(updated)
      return updated
    })
  }, [])

  const clearTest = useCallback((key) => {
    setProgress(prev => {
      const prevP = prev[key] || PROGRESS_DEFAULTS
      const updated = { ...prev, [key]: {
        tested: false, witnessed: false, completed: false,
        reportReceivedDate: null, reportOnProcore: false,
        reportReviewedDate: null, reviewed: false,
        outstandingObs: false, closed: false,
        comments: '', critical: prevP.critical || false
      }}
      saveProgress(updated)
      return updated
    })
  }, [])

  const markAllEquipment = useCallback((item, tests) => {
    // Toggle: if every test fully done → clear all, otherwise mark all.
    const allDone = tests.every((_, idx) => {
      const key = makeProgressKey(item, idx)
      return isFullyDone(progress[key])
    })
    setProgress(prev => {
      const updated = { ...prev }
      tests.forEach((_, idx) => {
        const key = makeProgressKey(item, idx)
        const prevP = prev[key] || PROGRESS_DEFAULTS
        if (allDone) {
          updated[key] = {
            tested: false, witnessed: false, completed: false,
            reportReceivedDate: null, reportOnProcore: false,
            reportReviewedDate: null, reviewed: false,
            outstandingObs: false, closed: false,
            comments: '', critical: prevP.critical || false
          }
        } else {
          updated[key] = {
            tested: true, witnessed: true, completed: true,
            reportOnProcore: true, reviewed: true, closed: true,
            outstandingObs: false,
            critical: prevP.critical || false,
            reportReceivedDate: prevP.reportReceivedDate || new Date().toISOString().split('T')[0],
            reportReviewedDate: prevP.reportReviewedDate || new Date().toISOString().split('T')[0],
            comments: prevP.comments || ''
          }
        }
      })
      saveProgress(updated)
      return updated
    })
  }, [progress])

  // ── Derived data ─────────────────────────────────────────────────────────

  // Flat section grouping - group equipment by feeder_ref (section/sheet name)
  const structured = useMemo(() => {
    if (!equipment || !equipment.length) return { sections: {}, sectionList: [] }
    const sections = {}
    for (const item of equipment) {
      const tests = resolveTests(item)
      if (!tests.length) continue
      const sectionName = item.feeder_ref || item.section || 'Other'
      if (!sections[sectionName]) sections[sectionName] = []
      sections[sectionName].push({ ...item, _tests: tests })
    }
    return { sections, sectionList: Object.keys(sections).sort() }
  }, [equipment])

  const stats = useMemo(() => {
    let totalTests = 0, tested = 0, witnessed = 0, completed = 0,
        reportsIn = 0, onProcore = 0, closed = 0, complete = 0,
        wSum = 0
    const sectionSet = new Set()
    let eqCount = 0
    if (equipment) {
      equipment.forEach(item => {
        const tests = resolveTests(item)
        if (!tests.length) return
        eqCount++
        sectionSet.add(item.section || item.type)
        tests.forEach((_, idx) => {
          const key = makeProgressKey(item, idx)
          const p = progress[key]
          // Skip N/A tests from all counts
          if (p && p.completed === 'NA') return
          totalTests++
          if (p) {
            if (p.tested) tested++
            if (p.witnessed) witnessed++
            if (p.completed === true) completed++
            if (p.reportReceivedDate) reportsIn++
            if (p.reportOnProcore) onProcore++
            if (p.closed) closed++
            wSum += weightedScore(p)
          }
          if (isFullyDone(p)) complete++
        })
      })
    }
    const overallPct = totalTests > 0 ? (wSum / totalTests) * 100 : 0
    return {
      sections: sectionSet.size, equipment: eqCount, totalTests,
      tested, witnessed, completed, reportsIn, onProcore, closed,
      complete, overallPct
    }
  }, [equipment, progress])

  const levelStats = useMemo(() => {
    const levels = { L1: { total: 0, done: 0 }, L2: { total: 0, done: 0 }, L3: { total: 0, done: 0 },
      L4: { total: 0, done: 0 }, L5: { total: 0, done: 0 } }
    if (equipment) {
      equipment.forEach(item => {
        const tests = resolveTests(item)
        tests.forEach((test, idx) => {
          const lvl = test[0]
          if (levels[lvl]) {
            const key = makeProgressKey(item, idx)
            const p = progress[key]
            if (p && p.completed === 'NA') return  // Skip N/A
            levels[lvl].total++
            if (isFullyDone(p)) levels[lvl].done++
          }
        })
      })
    }
    return levels
  }, [equipment, progress])

  const getEquipmentProgress = useCallback((item) => {
    const tests = resolveTests(item)
    let done = 0
    let naCount = 0
    tests.forEach((_, idx) => {
      const k = makeProgressKey(item, idx)
      const p = progress[k]
      if (p && p.completed === 'NA') { naCount++; return }
      if (isFullyDone(p)) done++
    })
    return { done, total: tests.length - naCount }
  }, [progress])

  const getSectionProgress = useCallback((items) => {
    let total = 0, done = 0
    items.forEach(item => {
      const tests = item._tests || resolveTests(item)
      tests.forEach((_, idx) => {
        const k = makeProgressKey(item, idx)
        const p = progress[k]
        if (p && p.completed === 'NA') return  // Skip N/A
        total++
        if (isFullyDone(p)) done++
      })
    })
    return { done, total }
  }, [progress])

  const matchesFilters = useCallback((item, tests) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const name = (item.displayName || item.name || '').toLowerCase()
      const type = (item.type || '').toLowerCase()
      if (!name.includes(q) && !type.includes(q)) return false
    }
    if (levelFilter !== 'All') {
      const hasLevel = tests.some(t => t[0] === levelFilter)
      if (!hasLevel) return false
    }
    return true
  }, [searchQuery, levelFilter])

  const isItemDimmed = useCallback((item) => {
    if (completionFilter === 'All') return false
    const { done, total } = getEquipmentProgress(item)
    const isComplete = done === total && total > 0
    if (completionFilter === 'Complete') return !isComplete
    if (completionFilter === 'Incomplete') return isComplete
    return false
  }, [completionFilter, getEquipmentProgress])

  const toggleSection = (key) => setExpandedSections(p => ({ ...p, [key]: !p[key] }))
  const toggleItem = (id) => setExpandedItems(p => ({ ...p, [id]: !p[id] }))
  const toggleTestDetail = (key) => setExpandedTests(p => ({ ...p, [key]: !p[key] }))

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '16px 24px' }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 'bold', color: '#1f2937' }}>
          Commissioning Progress Tracker
        </h2>
      </div>

      {/* ── Dashboard Header ─────────────────────────────────────────── */}
      {/* ── Stats Overview ─────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 10 }}>
        {[
          { label: 'Sections', value: stats.sections },
          { label: 'Equipment', value: stats.equipment },
          { label: 'Total Tests', value: stats.totalTests },
        ].map(c => (
          <div key={c.label} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            padding: '24px 22px', minHeight: 90 }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: '#1f2937' }}>{c.value}</div>
            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginTop: 6 }}>{c.label}</div>
          </div>
        ))}
        {/* Overall % with mini ring */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          padding: '24px 22px', minHeight: 90, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
            <svg width={56} height={56} style={{ transform: 'rotate(-90deg)' }}>
              <circle cx={28} cy={28} r={23} fill="none" stroke="#e5e7eb" strokeWidth={6} />
              <circle cx={28} cy={28} r={23} fill="none"
                stroke={stats.overallPct >= 60 ? '#22c55e' : stats.overallPct > 0 ? '#f59e0b' : '#ef4444'}
                strokeWidth={6} strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 20}`}
                strokeDashoffset={`${2 * Math.PI * 20 * (1 - stats.overallPct / 100)}`} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: '#1f2937' }}>
              {Math.round(stats.overallPct)}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: 36, fontWeight: 700, color: stats.overallPct >= 60 ? '#059669' : stats.overallPct > 0 ? '#d97706' : '#dc2626' }}>
              {stats.complete}/{stats.totalTests}
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginTop: 4 }}>Overall Complete</div>
          </div>
        </div>
      </div>

      {/* ── Commissioning Pipeline ────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 10 }}>
        {[
          { label: 'SAT Tested', value: stats.tested, colour: '#22c55e' },
          { label: 'CxA Witnessed', value: stats.witnessed, colour: '#3b82f6' },
          { label: 'Completed', value: stats.completed, colour: '#7c3aed' },
          { label: 'Reports In', value: stats.reportsIn, colour: '#f59e0b' },
          { label: 'On Procore', value: stats.onProcore, colour: '#f97316' },
          { label: 'Closed', value: stats.closed, colour: '#065f46' },
        ].map(step => {
          const pct = stats.totalTests > 0 ? Math.round(step.value / stats.totalTests * 100) : 0
          return (
            <div key={step.label} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              padding: '16px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: step.colour }}>
                {step.value}<span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>/{stats.totalTests}</span>
              </div>
              <div style={{ fontSize: 9, color: '#6b7280', fontWeight: 600, margin: '4px 0 8px' }}>{step.label}</div>
              <div style={{ width: '100%', height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: step.colour, borderRadius: 3 }} />
              </div>
              <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4, fontWeight: 600 }}>{pct}%</div>
            </div>
          )
        })}
      </div>

      {/* ── Level Completion ──────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
        {Object.entries(levelStats).map(([lvl, data]) => {
          const pct = data.total > 0 ? Math.round((data.done / data.total) * 100) : 0
          return (
            <div key={lvl} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '14px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: LEVEL_COLOURS[lvl] }}>{lvl}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>{data.done}/{data.total}</span>
              </div>
              <div style={{ width: '100%', height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: LEVEL_COLOURS[lvl], borderRadius: 3 }} />
              </div>
              <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4, textAlign: 'right' }}>{pct}%</div>
            </div>
          )
        })}
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16,
        padding: 12, background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb',
        flexWrap: 'wrap' }}>

        {/* Level Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 11, color: '#6b7280', marginRight: 4 }}>Level:</span>
          {['All', 'L1', 'L2', 'L3', 'L4', 'L5'].map(lvl => (
            <button key={lvl} onClick={() => setLevelFilter(lvl)}
              style={{ padding: '3px 8px', fontSize: 10, fontWeight: 'bold', cursor: 'pointer',
                border: '1px solid', borderRadius: 10,
                borderColor: lvl === 'All' ? '#6b7280' : (LEVEL_COLOURS[lvl] || '#6b7280'),
                background: levelFilter === lvl ? (lvl === 'All' ? '#1f2937' : LEVEL_COLOURS[lvl]) : '#fff',
                color: levelFilter === lvl ? '#fff' : (lvl === 'All' ? '#6b7280' : LEVEL_COLOURS[lvl]) }}>
              {lvl}
            </button>
          ))}
        </div>

        {/* Section Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 11, color: '#6b7280' }}>Section:</span>
          <select value={sectionFilter} onChange={e => setSectionFilter(e.target.value)}
            style={{ fontSize: 11, padding: '4px 8px', borderRadius: 4, border: '1px solid #d1d5db',
              background: '#fff', cursor: 'pointer' }}>
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
            style={{ fontSize: 12, padding: '4px 8px', borderRadius: 4, border: '1px solid #d1d5db',
              flex: 1, outline: 'none' }} />
        </div>

        {/* Completion Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          <span style={{ fontSize: 11, color: '#6b7280', marginRight: 6 }}>Show:</span>
          {['All', 'Incomplete', 'Complete'].map(opt => (
            <button key={opt} onClick={() => setCompletionFilter(opt)}
              style={{ padding: '4px 8px', fontSize: 10, fontWeight: 'bold', cursor: 'pointer',
                border: '1px solid #d1d5db', background: completionFilter === opt ? '#1f2937' : '#fff',
                color: completionFilter === opt ? '#fff' : '#6b7280',
                borderRadius: opt === 'All' ? '4px 0 0 4px' : opt === 'Complete' ? '0 4px 4px 0' : 0 }}>
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Content: Sections → Equipment → Tests ──────────────────── */}
      {structured.sectionList
        .filter(sectionName => sectionFilter === 'All' || sectionName === sectionFilter)
        .map(sectionName => {
          const items = structured.sections[sectionName]
          const filteredItems = items.filter(item => matchesFilters(item, item._tests))
          if (!filteredItems.length) return null

          const isSecExpanded = expandedSections[sectionName] === true
          const { done: secDone, total: secTotal } = getSectionProgress(filteredItems)
          const testCount = filteredItems.reduce((sum, item) => sum + (item._tests || []).length, 0)

          const firstItem = items[0]
          const borderColour = SECTION_COLOURS[firstItem?.section] || '#3b82f6'

          return (
            <div key={sectionName} style={{ marginBottom: 8,
              borderLeft: `3px solid ${borderColour}`, paddingLeft: 12 }}>
              {/* Section Header */}
              <div onClick={() => toggleSection(sectionName)} style={{ display: 'flex',
                alignItems: 'center', gap: 8, padding: '10px 12px', background: '#f9fafb',
                borderRadius: 6, cursor: 'pointer', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: '#6b7280' }}>
                  {isSecExpanded ? '▼' : '▶'}
                </span>
                <span style={{ fontSize: 14, fontWeight: 'bold', color: '#374151' }}>
                  {sectionName.replace(/_/g, ' ')}
                </span>
                <span style={{ fontSize: 10, color: '#9ca3af', marginLeft: 8 }}>
                  {filteredItems.length} equipment
                </span>
                <span style={{ fontSize: 10, color: '#9ca3af' }}>
                  · {testCount} tests
                </span>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: '#6b7280' }}>{secDone}/{secTotal}</span>
                  <MiniProgressBar current={secDone} total={secTotal} />
                </div>
              </div>

              {/* Expanded Section: Equipment List */}
              {isSecExpanded && filteredItems.map((item, idx) => {
                const tests = item._tests
                const { done, total } = getEquipmentProgress(item)
                const expandKey = `${sectionName}_${item.id || idx}`
                const isExpanded = expandedItems[expandKey]
                const dimmed = isItemDimmed(item)
                const hasL5 = tests.some(t => t[0] === 'L5')

                return (
                  <div key={item.id || idx} style={{ marginLeft: 8, marginBottom: 4,
                    opacity: dimmed ? 0.4 : 1 }}>
                    {/* Equipment Row (collapsed) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 10px', background: '#fff', borderRadius: 6,
                      border: '1px solid #e5e7eb', cursor: 'pointer' }}
                      onClick={(e) => { e.stopPropagation(); toggleItem(expandKey); }}>
                      <span style={{ fontSize: 12, color: '#6b7280' }}>
                        {isExpanded ? '▼' : '▶'}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: '500', color: '#1f2937', flex: 1 }}>
                        {item.displayName || item.name}
                      </span>
                      {/* Level badges */}
                      <div style={{ display: 'flex', gap: 1 }}>
                        {[...new Set(tests.map(t => t[0]))].sort().map(lvl => (
                          <LevelBadge key={lvl} level={lvl} />
                        ))}
                      </div>
                      {hasL5 && (
                        <span style={{ fontSize: 9, fontWeight: 'bold', color: '#fff',
                          background: '#ef4444', borderRadius: 3, padding: '1px 5px' }}>CRIT</span>
                      )}
                      <span style={{ fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap' }}>
                        {done}/{total}
                      </span>
                      <MiniProgressBar current={done} total={total} />
                      <button onClick={e => { e.stopPropagation(); markAllEquipment(item, tests) }}
                        style={{ padding: '2px 8px', fontSize: 10, fontWeight: 'bold',
                          height: 28, borderRadius: 4, cursor: 'pointer',
                          border: done === total && total > 0 ? 'none' : '1.5px solid #22c55e',
                          background: done === total && total > 0 ? '#22c55e' : '#fff',
                          color: done === total && total > 0 ? '#fff' : '#22c55e',
                          whiteSpace: 'nowrap' }}>
                        ✓ All
                      </button>
                    </div>

                    {/* ── Expanded: Test Rows ───────────────────────────── */}
                    {isExpanded && (
                      <div style={{ marginTop: 2, marginLeft: 20 }}>
                        {/* Column Headers — Row 1 core fields */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10,
                          padding: '4px 10px', borderBottom: '1px solid #e5e7eb' }}>
                          <div style={{ width: 24, flexShrink: 0 }} />
                          <div style={{ flex: 1, fontSize: 11, fontWeight: 'bold', color: '#6b7280' }}>Test</div>
                          <div style={{ width: 124, flexShrink: 0, textAlign: 'center', fontSize: 9, fontWeight: 600, color: '#9ca3af' }}>Report Rcvd</div>
                          <div style={{ width: 24, flexShrink: 0, textAlign: 'center', fontSize: 9, fontWeight: 600, color: '#f97316' }}>Proc</div>
                          <div style={{ width: 124, flexShrink: 0, textAlign: 'center', fontSize: 9, fontWeight: 600, color: '#9ca3af' }}>Reviewed</div>
                          <div style={{ width: 24, flexShrink: 0, textAlign: 'center', fontSize: 9, fontWeight: 600, color: '#14b8a6' }}>Rev</div>
                          <div style={{ width: 24, flexShrink: 0, textAlign: 'center', fontSize: 9, fontWeight: 600, color: '#ef4444' }}>Obs</div>
                          <div style={{ width: 13, flexShrink: 0 }} />
                          <div style={{ width: 36, flexShrink: 0, textAlign: 'center', fontSize: 9, fontWeight: 'bold', color: '#22c55e' }}>SAT</div>
                          <div style={{ width: 36, flexShrink: 0, textAlign: 'center', fontSize: 9, fontWeight: 'bold', color: '#3b82f6' }}>CxA</div>
                          <div style={{ width: 36, flexShrink: 0, textAlign: 'center', fontSize: 9, fontWeight: 'bold', color: '#7c3aed' }}>Done</div>
                          <div style={{ width: 36, flexShrink: 0, textAlign: 'center', fontSize: 9, fontWeight: 'bold', color: '#065f46' }}>Closed</div>
                          <div style={{ width: 56, flexShrink: 0 }} />
                        </div>

                        {tests.map((test, testIdx) => {
                          const key = makeProgressKey(item, testIdx)
                          const p = progress[key] || PROGRESS_DEFAULTS
                          const lvl = test[0]
                          const testName = test[1]
                          const isTestExpanded = expandedTests[key]

                          if (levelFilter !== 'All' && lvl !== levelFilter) return null

                          return (
                            <div key={key} style={{ display: 'flex', alignItems: 'center',
                              gap: 10, padding: '5px 10px',
                              borderBottom: '1px solid #f3f4f6',
                              background: testIdx % 2 === 0 ? '#fafafa' : '#fff',
                              flexWrap: 'nowrap', minHeight: 36 }}>
                                <LevelBadge level={lvl} />
                                <span style={{ flex: 1, fontSize: 13, color: '#374151',
                                  display: 'flex', alignItems: 'center', gap: 6,
                                  minWidth: 140, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {testName}
                                  {lvl === 'L5' && (
                                    <span style={{ fontSize: 8, fontWeight: 'bold', color: '#fff',
                                      background: '#ef4444', borderRadius: 3, padding: '1px 4px',
                                      lineHeight: '12px' }}>L5</span>
                                  )}
                                </span>

                                {/* Report Received Date */}
                                <div style={{ width: 124, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                                  <CompactDateInput value={p.reportReceivedDate}
                                    onChange={v => updateProgress(key, 'reportReceivedDate', v)} />
                                </div>

                                {/* Procore — checkbox orange */}
                                <div style={{ width: 24, flexShrink: 0, display: 'flex', justifyContent: 'center' }} title="On Procore">
                                  <Checkbox checked={p.reportOnProcore} colour="#f97316"
                                    onChange={() => updateProgress(key, 'reportOnProcore', !p.reportOnProcore)} />
                                </div>

                                {/* Report Reviewed Date */}
                                <div style={{ width: 124, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                                  <CompactDateInput value={p.reportReviewedDate}
                                    onChange={v => updateProgress(key, 'reportReviewedDate', v)} />
                                </div>

                                {/* Reviewed — 3-state teal */}
                                <div style={{ width: 24, flexShrink: 0, display: 'flex', justifyContent: 'center' }} title="Reviewed Y/N/NA">
                                  <ThreeStateToggle value={p.reviewed} colour="#14b8a6"
                                    onChange={v => updateProgress(key, 'reviewed', v)} />
                                </div>

                                {/* Obs — 3-state red */}
                                <div style={{ width: 24, flexShrink: 0, display: 'flex', justifyContent: 'center' }} title="Outstanding Observations">
                                  <ThreeStateToggle value={p.outstandingObs} colour="#ef4444"
                                    onChange={v => updateProgress(key, 'outstandingObs', v)} />
                                </div>

                                {/* Divider */}
                                <div style={{ width: 1, height: 20, background: '#d1d5db', marginLeft: 6, marginRight: 6, flexShrink: 0 }} />

                                {/* SAT */}
                                <div style={{ width: 36, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                                  <Checkbox checked={p.tested} colour="#22c55e"
                                    onChange={() => updateProgress(key, 'tested', !p.tested)} />
                                </div>
                                {/* CxA */}
                                <div style={{ width: 36, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                                  <Checkbox checked={p.witnessed} colour="#3b82f6"
                                    onChange={() => updateProgress(key, 'witnessed', !p.witnessed)} />
                                </div>
                                {/* Done */}
                                <div style={{ width: 36, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                                  <ThreeStateToggle value={p.completed} colour="#7c3aed"
                                    onChange={v => updateProgress(key, 'completed', v)} />
                                </div>
                                {/* Closed */}
                                <div style={{ width: 36, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                                  <Checkbox checked={p.closed} colour="#065f46"
                                    onChange={() => updateProgress(key, 'closed', !p.closed)} />
                                </div>
                                {/* Quick actions */}
                                <div style={{ width: 56, flexShrink: 0, display: 'flex', gap: 3, alignItems: 'center' }}>
                                  <button onClick={() => markAllTest(key)}
                                    style={{ padding: '2px 4px', fontSize: 9, fontWeight: 'bold',
                                      height: 22, border: '1.5px solid #22c55e', borderRadius: 3,
                                      background: '#fff', color: '#22c55e', cursor: 'pointer', lineHeight: 1 }}>
                                    ✓All
                                  </button>
                                  <button onClick={() => clearTest(key)}
                                    style={{ padding: '2px 4px', fontSize: 9, fontWeight: 'bold',
                                      height: 22, border: '1.5px solid #9ca3af', borderRadius: 3,
                                      background: '#fff', color: '#9ca3af', cursor: 'pointer', lineHeight: 1 }}>
                                    ✗
                                  </button>
                                </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}

      {/* Empty state */}
      {(!equipment || !equipment.length) && (
        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
          <p style={{ fontSize: 14 }}>No equipment loaded. Import topology data to begin tracking.</p>
        </div>
      )}
    </div>
  )
}
