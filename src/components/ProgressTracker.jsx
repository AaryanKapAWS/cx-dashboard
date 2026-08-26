import { useState, useMemo, useCallback } from 'react'
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

const SECTION_COLOURS = {
  transformer_bay: '#f59e0b', line_bay: '#3b82f6', bus_section: '#6366f1',
  switchgear: '#22c55e', hv_switchgear_gis: '#22c55e', protection: '#a855f7',
  cables: '#64748b', battery_dc: '#f97316', earthing: '#14b8a6',
  substation: '#6b7280', aux_transformer: '#f97316', panel_board: '#8b5cf6'
}

const LEVEL_COLOURS = {
  L1: '#7c3aed', L2: '#d97706', L3: '#059669', L4: '#2563eb', L5: '#db2777'
}

// Stable key for progress tracking - uses feeder_ref + type + instance count
// This ensures keys don't collide across sections and survive equipment re-creation
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

function DonutGauge({ size, strokeWidth, percent, fontSize, colour }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percent / 100) * circumference
  return (
    <svg width={size} height={size} style={{ display: 'block' }}>
      <circle cx={size/2} cy={size/2} r={radius} fill="none"
        stroke="#e5e7eb" strokeWidth={strokeWidth} />
      <circle cx={size/2} cy={size/2} r={radius} fill="none"
        stroke={colour || '#22c55e'} strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        fontSize={fontSize} fontWeight="bold" fill="#1f2937">
        {Math.round(percent)}%
      </text>
    </svg>
  )
}

function StatCard({ value, label }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
      padding: 16, textAlign: 'center', minWidth: 0 }}>
      <div style={{ fontSize: 28, fontWeight: 'bold', color: '#1f2937' }}>{value}</div>
      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>{label}</div>
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

export default function ProgressTracker({ equipment }) {
  const [progress, setProgress] = useState(loadProgress)
  const [expandedSections, setExpandedSections] = useState({})
  const [expandedItems, setExpandedItems] = useState({})
  const [levelFilter, setLevelFilter] = useState('All')
  const [sectionFilter, setSectionFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [completionFilter, setCompletionFilter] = useState('All')

  const updateProgress = useCallback((key, field, value) => {
    setProgress(prev => {
      const updated = { ...prev, [key]: { ...(prev[key] || { tested: false, witnessed: false, closed: false }), [field]: value } }
      saveProgress(updated)
      return updated
    })
  }, [])

  const markAllTest = useCallback((key) => {
    setProgress(prev => {
      const updated = { ...prev, [key]: { tested: true, witnessed: true, closed: true } }
      saveProgress(updated)
      return updated
    })
  }, [])

  const clearTest = useCallback((key) => {
    setProgress(prev => {
      const updated = { ...prev, [key]: { tested: false, witnessed: false, closed: false } }
      saveProgress(updated)
      return updated
    })
  }, [])

  const markAllEquipment = useCallback((item, tests) => {
    // Toggle: if all already complete, clear them. Otherwise mark all.
    const allDone = tests.every((_, idx) => {
      const key = makeProgressKey(item, idx)
      const s = progress[key]
      return s && s.tested && s.witnessed && s.closed
    })
    setProgress(prev => {
      const updated = { ...prev }
      tests.forEach((_, idx) => {
        const key = makeProgressKey(item, idx)
        updated[key] = allDone ? { tested: false, witnessed: false, closed: false } : { tested: true, witnessed: true, closed: true }
      })
      saveProgress(updated)
      return updated
    })
  }, [progress])

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
    let totalTests = 0, tested = 0, witnessed = 0, closed = 0
    const sectionSet = new Set()
    let eqCount = 0
    if (equipment) {
      equipment.forEach(item => {
        const tests = resolveTests(item)
        if (!tests.length) return
        eqCount++
        sectionSet.add(item.section || item.type)
        tests.forEach((_, idx) => {
          totalTests++
          const key = makeProgressKey(item, idx)
          const p = progress[key]
          if (p) {
            if (p.tested) tested++
            if (p.witnessed) witnessed++
            if (p.closed) closed++
          }
        })
      })
    }
    let complete = 0
    if (equipment) {
      equipment.forEach(item => {
        const tests = resolveTests(item)
        tests.forEach((_, idx) => {
          const key = makeProgressKey(item, idx)
          const p = progress[key]
          if (p && p.tested && p.witnessed && p.closed) complete++
        })
      })
    }
    const overallPct = totalTests > 0 ? (complete / totalTests) * 100 : 0
    return { sections: sectionSet.size, equipment: eqCount, totalTests, tested, witnessed, closed, complete, overallPct }
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
            levels[lvl].total++
            const key = makeProgressKey(item, idx)
            const p = progress[key]
            if (p && p.tested && p.witnessed && p.closed) levels[lvl].done++
          }
        })
      })
    }
    return levels
  }, [equipment, progress])

  const getEquipmentProgress = useCallback((item) => {
    const tests = resolveTests(item)
    let done = 0
    tests.forEach((_, idx) => { const k = makeProgressKey(item, idx); const p = progress[k]; if (p && p.tested && p.witnessed && p.closed) done++ })
    return { done, total: tests.length }
  }, [progress])

  const getSectionProgress = useCallback((items) => {
    let total = 0, done = 0
    items.forEach(item => {
      const tests = item._tests || resolveTests(item)
      tests.forEach((_, idx) => {
        total++
        const k = makeProgressKey(item, idx)
        const p = progress[k]
        if (p && p.tested && p.witnessed && p.closed) done++
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

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '16px 24px' }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 'bold', color: '#1f2937' }}>
          Commissioning Progress Tracker
        </h2>
      </div>

      {/* Stats Section: Gauges LEFT, Cards RIGHT */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 20, flexWrap: 'wrap' }}>
        {/* Gauges */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <DonutGauge size={140} strokeWidth={10} percent={stats.overallPct}
            fontSize={24} colour="#22c55e" />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {Object.entries(levelStats).map(([lvl, data]) => {
              const pct = data.total > 0 ? (data.done / data.total) * 100 : 0
              return (
                <div key={lvl} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <DonutGauge size={72} strokeWidth={6} percent={pct}
                    fontSize={14} colour={LEVEL_COLOURS[lvl]} />
                  <span style={{ fontSize: 9, fontWeight: 'bold', color: LEVEL_COLOURS[lvl], marginTop: 2 }}>{lvl}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Stat Cards Grid */}
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <StatCard value={stats.sections} label="Sections" />
            <StatCard value={stats.equipment} label="Equipment" />
            <StatCard value={stats.totalTests} label="Total Tests" />
            <StatCard value={`${stats.tested}/${stats.totalTests}`} label="Tested" />
            <StatCard value={`${stats.witnessed}/${stats.totalTests}`} label="Witnessed" />
            <StatCard value={`${stats.closed}/${stats.totalTests}`} label="Closed" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
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

      {/* Main Content: Flat Sections → Equipment → Tests */}
      {structured.sectionList
        .filter(sectionName => sectionFilter === 'All' || sectionName === sectionFilter)
        .map(sectionName => {
          const items = structured.sections[sectionName]
          const filteredItems = items.filter(item => matchesFilters(item, item._tests))
          if (!filteredItems.length) return null

          const isSecExpanded = expandedSections[sectionName] === true
          const { done: secDone, total: secTotal } = getSectionProgress(filteredItems)
          const testCount = filteredItems.reduce((sum, item) => sum + (item._tests || []).length, 0)

          // Determine border colour: check SECTION_COLOURS by item.section, or default
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

                    {/* Expanded: Test Rows */}
                    {isExpanded && (
                      <div style={{ marginTop: 2, marginLeft: 20 }}>
                        {/* Column Headers */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8,
                          padding: '4px 10px', borderBottom: '1px solid #e5e7eb' }}>
                          <span style={{ width: 28 }} />
                          <span style={{ flex: 1, fontSize: 11, fontWeight: 'bold', color: '#6b7280' }}>
                            Test
                          </span>
                          <span style={{ width: 60, textAlign: 'center', fontSize: 11,
                            fontWeight: 'bold', color: '#22c55e' }}>Tested</span>
                          <span style={{ width: 60, textAlign: 'center', fontSize: 11,
                            fontWeight: 'bold', color: '#3b82f6' }}>Witnessed</span>
                          <span style={{ width: 60, textAlign: 'center', fontSize: 11,
                            fontWeight: 'bold', color: '#065f46' }}>Closed</span>
                          <span style={{ width: 60 }} />
                        </div>

                        {tests.map((test, testIdx) => {
                          const key = makeProgressKey(item, testIdx)
                          const p = progress[key] || { tested: false, witnessed: false, closed: false }
                          const lvl = test[0]
                          const testName = test[1]

                          if (levelFilter !== 'All' && lvl !== levelFilter) return null

                          return (
                            <div key={key} style={{ display: 'flex', alignItems: 'center',
                              gap: 8, padding: '5px 10px', borderBottom: '1px solid #f3f4f6',
                              background: testIdx % 2 === 0 ? '#fafafa' : '#fff' }}>
                              <LevelBadge level={lvl} />
                              <span style={{ flex: 1, fontSize: 13, color: '#374151' }}>
                                {testName}
                              </span>
                              <div style={{ width: 60, display: 'flex', justifyContent: 'center' }}>
                                <Checkbox checked={p.tested} colour="#22c55e"
                                  onChange={() => updateProgress(key, 'tested', !p.tested)} />
                              </div>
                              <div style={{ width: 60, display: 'flex', justifyContent: 'center' }}>
                                <Checkbox checked={p.witnessed} colour="#3b82f6"
                                  onChange={() => updateProgress(key, 'witnessed', !p.witnessed)} />
                              </div>
                              <div style={{ width: 60, display: 'flex', justifyContent: 'center' }}>
                                <Checkbox checked={p.closed} colour="#065f46"
                                  onChange={() => updateProgress(key, 'closed', !p.closed)} />
                              </div>
                              <div style={{ width: 60, display: 'flex', gap: 4, justifyContent: 'center' }}>
                                <button onClick={() => markAllTest(key)}
                                  style={{ padding: '2px 6px', fontSize: 10, fontWeight: 'bold',
                                    height: 26, border: '1.5px solid #22c55e', borderRadius: 4,
                                    background: '#fff', color: '#22c55e', cursor: 'pointer' }}>
                                  ✓All
                                </button>
                                <button onClick={() => clearTest(key)}
                                  style={{ padding: '2px 6px', fontSize: 10, fontWeight: 'bold',
                                    height: 26, border: '1.5px solid #9ca3af', borderRadius: 4,
                                    background: '#fff', color: '#9ca3af', cursor: 'pointer' }}>
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
