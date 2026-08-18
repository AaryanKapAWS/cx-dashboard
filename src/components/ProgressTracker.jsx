import { useState, useMemo, useCallback } from 'react'
import testTemplates from '../data/test_templates.json'

// ─── Constants ────────────────────────────────────────────────────────────────
const LEVEL_COLORS = { L1: '#7c3aed', L2: '#d97706', L3: '#059669', L4: '#2563eb', L5: '#db2777' }
const STATUS_CONFIG = {
  pending:     { icon: '⬜', label: 'Pending',     color: '#94a3b8', bg: '#f1f5f9' },
  in_progress: { icon: '🔄', label: 'In Progress', color: '#3b82f6', bg: '#eff6ff' },
  witnessed:   { icon: '✅', label: 'Witnessed',   color: '#22c55e', bg: '#f0fdf4' },
  na:          { icon: '➖', label: 'N/A',         color: '#f59e0b', bg: '#fffbeb' }
}
const STATUS_CYCLE = ['pending', 'in_progress', 'witnessed', 'na']
const SECTION_COLORS = {
  transformer_bay: '#f59e0b', line_bay: '#3b82f6', bus_section: '#6366f1',
  switchgear: '#22c55e', hv_switchgear_gis: '#16a34a', panel_board: '#10b981',
  protection: '#a855f7', battery_dc: '#f97316', earthing: '#14b8a6', substation: '#6b7280'
}
const MV_TYPES = ['switchgear', 'hv_switchgear_gis', 'panel_board']
const AUX_TYPES = ['battery_dc', 'earthing', 'substation', 'protection']
const FEEDER_TYPES = ['switchgear', 'hv_switchgear_gis', 'panel_board']

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'test_progress'

function loadProgress() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }
  catch { return {} }
}

function saveProgress(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function getStatusKey(itemId, testIndex) {
  return `${itemId}_${testIndex}`
}

function getNextStatus(current) {
  const idx = STATUS_CYCLE.indexOf(current || 'pending')
  return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]
}

function parseFeederRef(feederRef) {
  if (!feederRef || !feederRef.includes(' — ')) return { section: null, feeder: null }
  const parts = feederRef.split(' — ')
  return { section: parts[0].trim(), feeder: parts.slice(1).join(' — ').trim() }
}

function classifyZone(sectionType) {
  if (MV_TYPES.includes(sectionType)) return 'MV'
  if (AUX_TYPES.includes(sectionType)) return 'Aux'
  return 'HV'
}

function calcProgress(items, tests, progress, levelFilters) {
  let witnessed = 0, inProgress = 0, total = 0, naCount = 0
  items.forEach(item => {
    const itemTests = tests[item.type] || []
    itemTests.forEach((test, idx) => {
      if (levelFilters.length > 0 && !levelFilters.includes(test[0])) return
      const key = getStatusKey(item.id, idx)
      const status = progress[key] || 'pending'
      if (status === 'na') { naCount++ }
      else if (status === 'witnessed') { witnessed++ }
      else if (status === 'in_progress') { inProgress++ }
      total++
    })
  })
  const denominator = total - naCount
  if (denominator === 0) return { percent: 0, witnessed, inProgress, total, naCount }
  return { percent: Math.round(((witnessed + inProgress) / denominator) * 100), witnessed, inProgress, total, naCount }
}

// ─── Sub-Components ───────────────────────────────────────────────────────────
function StatusButton({ status, onClick }) {
  const cfg = STATUS_CONFIG[status || 'pending']
  return (
    <button
      onClick={onClick}
      title={`${cfg.label} — click to cycle`}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 32, height: 28, border: `1.5px solid ${cfg.color}`,
        borderRadius: 6, background: cfg.bg, cursor: 'pointer',
        fontSize: 14, lineHeight: 1, transition: 'all 0.15s ease',
        flexShrink: 0
      }}
    >
      {cfg.icon}
    </button>
  )
}

function LevelBadge({ level }) {
  return (
    <span style={{
      display: 'inline-block', fontSize: 11, fontWeight: 600,
      padding: '2px 6px', borderRadius: 4, color: '#fff',
      background: LEVEL_COLORS[level] || '#6b7280', marginRight: 6
    }}>
      {level}
    </span>
  )
}

function ProgressBar({ percent, small }) {
  return (
    <div style={{
      flex: 1, height: small ? 6 : 8, background: '#e2e8f0',
      borderRadius: 4, overflow: 'hidden', minWidth: 60
    }}>
      <div style={{
        height: '100%', borderRadius: 4, transition: 'width 0.3s ease',
        width: `${percent}%`,
        background: percent === 100 ? '#22c55e' : percent > 50 ? '#3b82f6' : '#f59e0b'
      }} />
    </div>
  )
}

function TestRow({ test, testIndex, itemId, status, onCycle }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '4px 0', borderBottom: '1px solid #f1f5f9'
    }}>
      <StatusButton status={status} onClick={() => onCycle(itemId, testIndex)} />
      <LevelBadge level={test[0]} />
      <span style={{ fontSize: 13, color: '#334155', flex: 1 }}>{test[1]}</span>
    </div>
  )
}

function EquipmentBlock({ item, tests, progress, onCycle, levelFilters, statusFilter }) {
  const [expanded, setExpanded] = useState(false)
  const itemTests = tests[item.type] || []

  const filteredTests = useMemo(() => {
    return itemTests.map((test, idx) => ({ test, idx })).filter(({ test, idx }) => {
      if (levelFilters.length > 0 && !levelFilters.includes(test[0])) return false
      if (statusFilter !== 'all') {
        const s = progress[getStatusKey(item.id, idx)] || 'pending'
        if (s !== statusFilter) return false
      }
      return true
    })
  }, [itemTests, levelFilters, statusFilter, progress, item.id])

  if (filteredTests.length === 0) return null

  const doneCount = filteredTests.filter(({ idx }) => {
    const s = progress[getStatusKey(item.id, idx)] || 'pending'
    return s === 'witnessed' || s === 'in_progress'
  }).length
  const applicableCount = filteredTests.filter(({ idx }) => {
    return (progress[getStatusKey(item.id, idx)] || 'pending') !== 'na'
  }).length

  return (
    <div style={{ marginBottom: 4 }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
          background: '#f8fafc', borderRadius: 6, cursor: 'pointer',
          border: '1px solid #e2e8f0', userSelect: 'none'
        }}
      >
        <span style={{ fontSize: 12, color: '#64748b', width: 16 }}>{expanded ? '▾' : '▸'}</span>
        <span style={{ fontSize: 13, fontWeight: 500, color: '#1e293b', flex: 1 }}>
          {item.displayName || item.name || item.type}
        </span>
        <span style={{ fontSize: 11, color: '#64748b' }}>
          {doneCount}/{applicableCount}
        </span>
        <ProgressBar percent={applicableCount > 0 ? Math.round((doneCount / applicableCount) * 100) : 0} small />
      </div>
      {expanded && (
        <div style={{ padding: '4px 10px 4px 34px' }}>
          {filteredTests.map(({ test, idx }) => (
            <TestRow
              key={idx}
              test={test}
              testIndex={idx}
              itemId={item.id}
              status={progress[getStatusKey(item.id, idx)] || 'pending'}
              onCycle={onCycle}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function FeederGroup({ feederName, items, tests, progress, onCycle, levelFilters, statusFilter }) {
  const [expanded, setExpanded] = useState(false)

  const visibleItems = useMemo(() => {
    return items.filter(item => {
      const itemTests = tests[item.type] || []
      return itemTests.some((test, idx) => {
        if (levelFilters.length > 0 && !levelFilters.includes(test.level)) return false
        if (statusFilter !== 'all') {
          const s = progress[getStatusKey(item.id, idx)] || 'pending'
          if (s !== statusFilter) return false
        }
        return true
      })
    })
  }, [items, tests, levelFilters, statusFilter, progress])

  if (visibleItems.length === 0) return null

  return (
    <div style={{ marginBottom: 6 }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
          background: '#ecfdf5', borderRadius: 8, cursor: 'pointer',
          border: '1px solid #bbf7d0', userSelect: 'none'
        }}
      >
        <span style={{ fontSize: 13, color: '#16a34a', width: 16 }}>{expanded ? '▾' : '▸'}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#166534', flex: 1 }}>
          {feederName}
        </span>
        <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 500 }}>
          {visibleItems.length} items
        </span>
      </div>
      {expanded && (
        <div style={{ padding: '6px 0 2px 16px' }}>
          {visibleItems.map(item => (
            <EquipmentBlock
              key={item.id}
              item={item}
              tests={tests}
              progress={progress}
              onCycle={onCycle}
              levelFilters={levelFilters}
              statusFilter={statusFilter}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SectionCard({ sectionName, sectionType, feeders, items, tests, progress, onCycle, levelFilters, statusFilter }) {
  const [expanded, setExpanded] = useState(false)
  const isFeederSection = FEEDER_TYPES.includes(sectionType)
  const color = SECTION_COLORS[sectionType] || '#6b7280'

  const allItems = isFeederSection
    ? Object.values(feeders || {}).flat()
    : (items || [])

  const stats = useMemo(() => calcProgress(allItems, tests, progress, levelFilters), [allItems, tests, progress, levelFilters])

  const hasVisible = useMemo(() => {
    return allItems.some(item => {
      const itemTests = tests[item.type] || []
      return itemTests.some((test, idx) => {
        if (levelFilters.length > 0 && !levelFilters.includes(test.level)) return false
        if (statusFilter !== 'all') {
          const s = progress[getStatusKey(item.id, idx)] || 'pending'
          if (s !== statusFilter) return false
        }
        return true
      })
    })
  }, [allItems, tests, levelFilters, statusFilter, progress])

  if (!hasVisible) return null

  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
      overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
    }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
          cursor: 'pointer', borderBottom: expanded ? '1px solid #e2e8f0' : 'none',
          userSelect: 'none'
        }}
      >
        <div style={{
          width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0
        }} />
        <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', flex: 1 }}>
          {sectionName}
        </span>
        <span style={{ fontSize: 12, color: '#64748b', marginRight: 8 }}>
          {stats.percent}%
        </span>
        <ProgressBar percent={stats.percent} small={false} />
        <span style={{ fontSize: 14, color: '#64748b', marginLeft: 8 }}>{expanded ? '▾' : '▸'}</span>
      </div>
      {expanded && (
        <div style={{ padding: '10px 14px' }}>
          {isFeederSection ? (
            Object.entries(feeders || {}).sort(([a], [b]) => a.localeCompare(b)).map(([feederName, feederItems]) => (
              <FeederGroup
                key={feederName}
                feederName={feederName}
                items={feederItems}
                tests={tests}
                progress={progress}
                onCycle={onCycle}
                levelFilters={levelFilters}
                statusFilter={statusFilter}
              />
            ))
          ) : (
            (items || []).map(item => (
              <EquipmentBlock
                key={item.id}
                item={item}
                tests={tests}
                progress={progress}
                onCycle={onCycle}
                levelFilters={levelFilters}
                statusFilter={statusFilter}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProgressTracker({ equipment }) {
  const [progress, setProgress] = useState(loadProgress)
  const [levelFilters, setLevelFilters] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')

  // Build test lookup from templates
  const tests = useMemo(() => {
    const map = {}
    if (Array.isArray(testTemplates)) {
      testTemplates.forEach(t => {
        if (!map[t.equipment_type]) map[t.equipment_type] = []
        map[t.equipment_type].push(t)
      })
    } else if (testTemplates && typeof testTemplates === 'object') {
      Object.assign(map, testTemplates)
    }
    return map
  }, [])

  // Cycle status handler
  const handleCycle = useCallback((itemId, testIndex) => {
    setProgress(prev => {
      const key = getStatusKey(itemId, testIndex)
      const current = prev[key] || 'pending'
      const next = getNextStatus(current)
      const updated = { ...prev, [key]: next === 'pending' ? undefined : next }
      if (next === 'pending') delete updated[key]
      saveProgress(updated)
      return updated
    })
  }, [])

  // Toggle level filter
  const toggleLevel = useCallback((level) => {
    setLevelFilters(prev =>
      prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
    )
  }, [])

  // Build topology: zone → section → feeders/items
  const topology = useMemo(() => {
    if (!equipment || equipment.length === 0) return { HV: {}, MV: {}, Aux: {} }

    const zones = { HV: {}, MV: {}, Aux: {} }

    equipment.forEach(item => {
      const { section, feeder } = parseFeederRef(item.feeder_ref)
      const sectionType = item.section || 'substation'
      const zone = classifyZone(sectionType)
      const sectionName = section || item.feeder_ref || 'General'
      const isFeederType = FEEDER_TYPES.includes(sectionType)

      if (!zones[zone][sectionName]) {
        zones[zone][sectionName] = { type: sectionType, feeders: {}, items: [] }
      }

      if (isFeederType && feeder) {
        if (!zones[zone][sectionName].feeders[feeder]) {
          zones[zone][sectionName].feeders[feeder] = []
        }
        zones[zone][sectionName].feeders[feeder].push(item)
      } else {
        zones[zone][sectionName].items.push(item)
      }
    })

    return zones
  }, [equipment])

  // Overall progress
  const overallStats = useMemo(() => {
    if (!equipment) return { percent: 0 }
    return calcProgress(equipment, tests, progress, levelFilters)
  }, [equipment, tests, progress, levelFilters])

  // Empty state
  if (!equipment || equipment.length === 0) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: 300, color: '#64748b', fontSize: 15
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div>No equipment loaded. Import a topology to begin tracking.</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      width: '100%', maxWidth: 1400, margin: '0 auto', padding: 20,
      background: '#f1f5f9', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20, flexWrap: 'wrap', gap: 12
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
            Commissioning Progress
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
            {equipment.length} equipment items · {overallStats.percent}% complete
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginRight: 4 }}>Overall</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: overallStats.percent === 100 ? '#22c55e' : '#1e293b' }}>
            {overallStats.percent}%
          </span>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20,
        padding: '14px 16px', background: '#fff', borderRadius: 10,
        border: '1px solid #e2e8f0', alignItems: 'center'
      }}>
        {/* Level Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginRight: 4 }}>Level:</span>
          {Object.entries(LEVEL_COLORS).map(([level, color]) => (
            <button
              key={level}
              onClick={() => toggleLevel(level)}
              style={{
                padding: '4px 10px', fontSize: 12, fontWeight: 600,
                borderRadius: 5, cursor: 'pointer', transition: 'all 0.15s',
                border: `1.5px solid ${color}`,
                background: levelFilters.includes(level) ? color : '#fff',
                color: levelFilters.includes(level) ? '#fff' : color
              }}
            >
              {level}
            </button>
          ))}
          {levelFilters.length > 0 && (
            <button
              onClick={() => setLevelFilters([])}
              style={{
                padding: '4px 8px', fontSize: 11, borderRadius: 4,
                border: '1px solid #cbd5e1', background: '#f1f5f9',
                color: '#64748b', cursor: 'pointer'
              }}
            >
              Clear
            </button>
          )}
        </div>

        <div style={{ width: 1, height: 24, background: '#e2e8f0' }} />

        {/* Status Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginRight: 4 }}>Status:</span>
          {[
            { key: 'all', label: 'All', color: '#475569' },
            { key: 'witnessed', label: '✅ Witnessed', color: STATUS_CONFIG.witnessed.color },
            { key: 'in_progress', label: '🔄 In Progress', color: STATUS_CONFIG.in_progress.color },
            { key: 'pending', label: '⬜ Pending', color: STATUS_CONFIG.pending.color },
            { key: 'na', label: '➖ N/A', color: STATUS_CONFIG.na.color }
          ].map(opt => (
            <button
              key={opt.key}
              onClick={() => setStatusFilter(opt.key)}
              style={{
                padding: '4px 10px', fontSize: 12, fontWeight: 500,
                borderRadius: 5, cursor: 'pointer', transition: 'all 0.15s',
                border: `1.5px solid ${statusFilter === opt.key ? opt.color : '#e2e8f0'}`,
                background: statusFilter === opt.key ? opt.color + '18' : '#fff',
                color: statusFilter === opt.key ? opt.color : '#64748b'
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Zone Sections */}
      {['HV', 'MV', 'Aux'].map(zone => {
        const sections = topology[zone]
        const sectionEntries = Object.entries(sections)
        if (sectionEntries.length === 0) return null

        return (
          <div key={zone} style={{ marginBottom: 24 }}>
            <h3 style={{
              fontSize: 14, fontWeight: 700, color: '#475569',
              textTransform: 'uppercase', letterSpacing: '0.05em',
              margin: '0 0 10px 2px', paddingBottom: 6,
              borderBottom: '2px solid #e2e8f0'
            }}>
              {zone === 'HV' ? '⚡ HV Zone' : zone === 'MV' ? '🔌 MV Zone' : '🔧 Auxiliary Zone'}
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))',
              gap: 12
            }}>
              {sectionEntries.sort(([a], [b]) => a.localeCompare(b)).map(([name, data]) => (
                <SectionCard
                  key={name}
                  sectionName={name}
                  sectionType={data.type}
                  feeders={data.feeders}
                  items={data.items}
                  tests={tests}
                  progress={progress}
                  onCycle={handleCycle}
                  levelFilters={levelFilters}
                  statusFilter={statusFilter}
                />
              ))}
            </div>
          </div>
        )
      })}

      {/* Legend */}
      <div style={{
        marginTop: 24, padding: '12px 16px', background: '#fff',
        borderRadius: 10, border: '1px solid #e2e8f0',
        display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center'
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Legend:</span>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#475569' }}>
            <span style={{ fontSize: 14 }}>{cfg.icon}</span> {cfg.label}
          </span>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#94a3b8' }}>
          Click status buttons to cycle · Progress = (Witnessed + In Progress) / (Total − N/A)
        </span>
      </div>
    </div>
  )
}
