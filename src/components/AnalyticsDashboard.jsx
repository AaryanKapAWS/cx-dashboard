import { useState, useMemo } from 'react'
import testTemplates from '../data/test_templates.json'
import { getCustomTemplates } from '../utils/customTemplates'

const PROGRESS_KEY = 'test_progress'
const SCHEDULE_KEY = 'test_schedule'

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

function makeProgressKey(item, testIdx) {
  return `${(item.feeder_ref || 'unknown').replace(/\s/g, '_')}_${(item.displayName || item.name || item.type).replace(/\s/g, '_')}_${testIdx}`
}

function makeScheduleKey(item) {
  return `${(item.feeder_ref || 'unknown').replace(/\s/g, '_')}_${(item.displayName || item.name || item.type).replace(/\s/g, '_')}`
}

// ─── COLOURS ────────────────────────────────────────────────────────────────────
const AMBER = '#FF9900'
const BLUE = '#3b82f6'
const GREEN = '#10b981'
const RED = '#ef4444'
const PURPLE = '#a855f7'
const TEAL = '#14b8a6'
const PINK = '#ec4899'
const GREY = '#64748b'

// ─── SUB-COMPONENTS ─────────────────────────────────────────────────────────────

function DonutChart({ tested, witnessed, closed, total, t }) {
  const pct = total > 0 ? ((closed / total) * 100).toFixed(1) : 0
  const radius = 70, stroke = 16
  const circumference = 2 * Math.PI * radius
  const segments = [
    { value: closed, color: GREEN, label: 'Closed' },
    { value: witnessed - closed, color: BLUE, label: 'Witnessed' },
    { value: tested - witnessed, color: AMBER, label: 'SAT Only' },
    { value: total - tested, color: t.barBg, label: 'Not Started' },
  ].filter(s => s.value > 0)
  let offset = 0
  const arcs = segments.map(seg => {
    const len = (seg.value / total) * circumference
    const arc = { ...seg, dasharray: `${len} ${circumference - len}`, offset: -offset }
    offset += len
    return arc
  })
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width="170" height="170" viewBox="0 0 170 170">
        <circle cx="85" cy="85" r={radius} fill="none" stroke={t.barBg} strokeWidth={stroke} />
        {arcs.map((arc, i) => (
          <circle key={i} cx="85" cy="85" r={radius} fill="none"
            stroke={arc.color} strokeWidth={stroke}
            strokeDasharray={arc.dasharray} strokeDashoffset={arc.offset}
            strokeLinecap="round"
            transform="rotate(-90 85 85)" style={{ transition: 'all 0.5s' }} />
        ))}
        <text x="85" y="80" textAnchor="middle" fill={t.text} fontSize="24" fontWeight="800">{pct}%</text>
        <text x="85" y="100" textAnchor="middle" fill={t.muted} fontSize="11">Complete</text>
      </svg>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 8 }}>
        {segments.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: t.sec }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color }} />
            {s.label} ({s.value})
          </div>
        ))}
      </div>
    </div>
  )
}

function ProgressBars({ data, t }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {data.map((d, i) => (
        <div key={i}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontSize: 11, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }} title={d.label}>{d.label}</span>
            <span style={{ fontSize: 11, color: d.value > 75 ? GREEN : d.value > 40 ? AMBER : t.muted, fontWeight: 600 }}>{d.value}%</span>
          </div>
          <div style={{ height: 6, background: t.barBg, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${d.value}%`, height: '100%', background: `linear-gradient(90deg, ${d.color || BLUE}, ${d.colorEnd || TEAL})`, borderRadius: 3, transition: 'width 0.4s' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function GanttChart({ items, t }) {
  if (!items.length) return <p style={{ color: t.muted, fontSize: 12 }}>No schedule data — add planned/actual dates in the Schedule tab.</p>
  const allDates = items.flatMap(i => [i.plannedStart, i.plannedFinish, i.actualStart, i.actualFinish].filter(Boolean).map(d => new Date(d).getTime()))
  const minDate = Math.min(...allDates)
  const maxDate = Math.max(...allDates)
  const range = maxDate - minDate || 1
  const toP = (d) => ((new Date(d).getTime() - minDate) / range) * 100
  return (
    <div style={{ overflowY: 'auto', maxHeight: 320 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 0 6px', borderBottom: `1px solid ${t.border}`, marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: t.muted }}>{new Date(minDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
        <span style={{ fontSize: 10, color: t.muted }}>{new Date(minDate + range / 2).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
        <span style={{ fontSize: 10, color: t.muted }}>{new Date(maxDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
      </div>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '4px 0', borderBottom: `1px solid ${t.border}22` }}>
          <div style={{ width: 160, fontSize: 10, color: t.sec, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }} title={item.name}>{item.name}</div>
          <div style={{ flex: 1, position: 'relative', height: 20 }}>
            {item.plannedStart && item.plannedFinish && (
              <div style={{ position: 'absolute', top: 2, height: 7, borderRadius: 3, left: `${toP(item.plannedStart)}%`, width: `${Math.max(1, toP(item.plannedFinish) - toP(item.plannedStart))}%`, background: t.barBg, border: `1px solid ${t.muted}44` }} title={`Planned: ${item.plannedStart} → ${item.plannedFinish}`} />
            )}
            {item.actualStart && item.actualFinish && (
              <div style={{ position: 'absolute', top: 11, height: 7, borderRadius: 3, left: `${toP(item.actualStart)}%`, width: `${Math.max(1, toP(item.actualFinish) - toP(item.actualStart))}%`, background: item.isLate ? RED : GREEN }} title={`Actual: ${item.actualStart} → ${item.actualFinish}`} />
            )}
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 14, marginTop: 8, paddingLeft: 160 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: t.muted }}><div style={{ width: 16, height: 5, borderRadius: 2, background: t.barBg, border: `1px solid ${t.muted}44` }} />Planned</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: t.muted }}><div style={{ width: 16, height: 5, borderRadius: 2, background: GREEN }} />On time</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: t.muted }}><div style={{ width: 16, height: 5, borderRadius: 2, background: RED }} />Late</div>
      </div>
    </div>
  )
}

function VarianceChart({ data, t }) {
  if (!data.length) return <p style={{ color: t.muted, fontSize: 12 }}>No variance data — add planned and actual finish dates.</p>
  const maxVal = Math.max(...data.map(d => Math.abs(d.value)), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, overflowY: 'auto', maxHeight: 260 }}>
      {data.map((d, i) => {
        const pct = Math.max(6, (Math.abs(d.value) / maxVal) * 100)
        const isLate = d.value > 0
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 20 }}>
            <div style={{ width: 140, fontSize: 10, color: t.text, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }} title={d.label}>{d.label}</div>
            <div style={{ flex: 1, background: t.barBg, borderRadius: 3, height: 10, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: isLate ? RED : GREEN }} />
            </div>
            <span style={{ width: 36, fontSize: 10, color: isLate ? RED : GREEN, fontWeight: 700, textAlign: 'right', flexShrink: 0 }}>{isLate ? '+' : ''}{d.value}d</span>
          </div>
        )
      })}
      <div style={{ display: 'flex', gap: 14, marginTop: 4, paddingLeft: 148 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}><div style={{ width: 10, height: 6, borderRadius: 2, background: GREEN }} /><span style={{ color: t.muted }}>Early</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}><div style={{ width: 10, height: 6, borderRadius: 2, background: RED }} /><span style={{ color: t.muted }}>Late</span></div>
      </div>
    </div>
  )
}

function WeeklyVelocity({ weekData, t }) {
  if (!weekData.length) return <p style={{ color: t.muted, fontSize: 12 }}>No weekly data yet.</p>
  const maxVal = Math.max(...weekData.map(w => w.count), 1)
  const chartH = 250
  return (
    <div style={{ marginTop: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: chartH, position: 'relative' }}>
        {[0.5, 1].map(f => (
          <div key={f} style={{ position: 'absolute', bottom: (chartH - 20) * f, left: 0, right: 0, borderBottom: `1px dashed ${t.border}`, zIndex: 0 }} />
        ))}
        {weekData.map((w, i) => {
          const h = Math.max(4, (w.count / maxVal) * (chartH - 20))
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', zIndex: 1 }}>
              <div style={{ fontSize: 9, color: t.sec, marginBottom: 2, fontWeight: 600 }}>{w.count}</div>
              <div style={{ width: '80%', height: h, borderRadius: '2px 2px 0 0', background: `linear-gradient(180deg, ${AMBER}, ${AMBER}cc)`, minHeight: 4 }} />
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 1, marginTop: 4 }}>
        {weekData.map((w, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: t.muted, whiteSpace: 'nowrap' }}>{w.label}</div>
        ))}
      </div>
    </div>
  )
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────────

export default function AnalyticsDashboard({ equipment = [] }) {
  const [darkMode, setDarkMode] = useState(() => {
    const s = localStorage.getItem('analytics_theme')
    return s ? s === 'dark' : false
  })
  const toggleTheme = () => { const n = !darkMode; setDarkMode(n); localStorage.setItem('analytics_theme', n ? 'dark' : 'light') }

  const progress = useMemo(() => JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}'), [])
  const schedule = useMemo(() => JSON.parse(localStorage.getItem(SCHEDULE_KEY) || '{}'), [])

  // Theme
  const theme = darkMode
    ? { bg: '#0f172a', cardBg: '#111827', border: '#1f2937', text: '#f1f5f9', sec: '#94a3b8', muted: '#64748b', barBg: '#1e293b', shadow: '0 2px 8px rgba(0,0,0,0.3)' }
    : { bg: 'transparent', cardBg: '#ffffff', border: '#e2e8f0', text: '#1e293b', sec: '#334155', muted: '#64748b', barBg: '#e2e8f0', shadow: '0 1px 3px rgba(0,0,0,0.06)' }

  const card = { background: theme.cardBg, borderRadius: 10, border: `1px solid ${theme.border}`, padding: 20, boxShadow: theme.shadow }
  const title = (text) => <div style={{ fontSize: 13, fontWeight: 700, color: theme.text, marginBottom: 2 }}>{text}</div>
  const desc = (text) => <p style={{ fontSize: 11, color: theme.muted, margin: '0 0 10px' }}>{text}</p>

  // ── Stats ──
  const stats = useMemo(() => {
    let totalTests = 0, tested = 0, witnessed = 0, closed = 0
    const sectionData = {}, levelData = { L1: { total: 0, done: 0 }, L2: { total: 0, done: 0 }, L3: { total: 0, done: 0 }, L4: { total: 0, done: 0 }, L5: { total: 0, done: 0 } }
    equipment.forEach(item => {
      const tests = resolveTests(item)
      if (!tests.length) return
      const section = item.feeder_ref || item.section || 'Other'
      if (!sectionData[section]) sectionData[section] = { total: 0, tested: 0, witnessed: 0, closed: 0 }
      tests.forEach((test, idx) => {
        totalTests++; sectionData[section].total++
        const key = makeProgressKey(item, idx)
        const p = progress[key]
        const lvl = test[0]
        if (levelData[lvl]) levelData[lvl].total++
        if (p) {
          if (p.tested) { tested++; sectionData[section].tested++ }
          if (p.witnessed) { witnessed++; sectionData[section].witnessed++ }
          if (p.tested && p.witnessed && p.closed) { closed++; sectionData[section].closed++; if (levelData[lvl]) levelData[lvl].done++ }
        }
      })
    })
    return { totalTests, tested, witnessed, closed, sectionData, levelData }
  }, [equipment, progress])

  // ── Gantt ──
  const ganttItems = useMemo(() => {
    const items = []
    equipment.forEach(item => {
      const key = makeScheduleKey(item)
      const s = schedule[key]
      if (!s || (!s.plannedStart && !s.actualStart)) return
      const planned = s.plannedFinish ? new Date(s.plannedFinish) : null
      const actual = s.actualFinish ? new Date(s.actualFinish) : null
      items.push({ name: (item.displayName || item.name || item.type).substring(0, 30), plannedStart: s.plannedStart, plannedFinish: s.plannedFinish, actualStart: s.actualStart, actualFinish: s.actualFinish, isLate: planned && actual && actual > planned })
    })
    return items.slice(0, 40)
  }, [equipment, schedule])

  // ── Variance ──
  const scheduleVariance = useMemo(() => {
    const v = []
    equipment.forEach(item => {
      const key = makeScheduleKey(item)
      const s = schedule[key]
      if (!s || !s.plannedFinish || !s.actualFinish) return
      const planned = new Date(s.plannedFinish), actual = new Date(s.actualFinish)
      if (isNaN(planned) || isNaN(actual)) return
      v.push({ label: (item.displayName || item.name || item.type).substring(0, 30), value: Math.round((actual - planned) / 86400000) })
    })
    return v.sort((a, b) => b.value - a.value).slice(0, 15)
  }, [equipment, schedule])

  // ── Velocity ──
  const weeklyVelocity = useMemo(() => {
    const weeks = {}
    equipment.forEach(item => {
      const key = makeScheduleKey(item)
      const s = schedule[key]
      if (!s || !s.actualFinish) return
      const d = new Date(s.actualFinish)
      if (isNaN(d)) return
      const day = d.getDay()
      const mon = new Date(d); mon.setDate(d.getDate() - ((day + 6) % 7))
      const wk = mon.toISOString().slice(0, 10)
      weeks[wk] = (weeks[wk] || 0) + resolveTests(item).length
    })
    return Object.entries(weeks).sort((a, b) => a[0].localeCompare(b[0])).slice(-12).map(([wk, count]) => ({
      label: new Date(wk).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }), count
    }))
  }, [equipment, schedule])

  // ── Overdue ──
  const overdueItems = useMemo(() => {
    const today = new Date(), overdue = []
    equipment.forEach(item => {
      const tests = resolveTests(item)
      if (!tests.length) return
      const key = makeScheduleKey(item)
      const s = schedule[key]
      if (!s || !s.plannedFinish) return
      const planned = new Date(s.plannedFinish)
      if (isNaN(planned) || planned >= today) return
      let allDone = true
      tests.forEach((_, idx) => { const p = progress[makeProgressKey(item, idx)]; if (!p || !p.tested || !p.witnessed || !p.closed) allDone = false })
      if (!allDone) {
        const levels = [...new Set(tests.map(t => t[0]))].join('/')
        overdue.push({ name: item.displayName || item.name || item.type, section: item.feeder_ref || item.section || '', level: levels, daysLate: Math.round((today - planned) / 86400000), plannedStart: s.plannedStart || '', plannedFinish: s.plannedFinish })
      }
    })
    return overdue.sort((a, b) => b.daysLate - a.daysLate)
  }, [equipment, schedule, progress])

  // ── Derived bar data ──
  const sectionBars = useMemo(() => Object.entries(stats.sectionData).map(([name, d]) => ({ label: name.length > 28 ? name.substring(0, 28) + '…' : name, value: d.total > 0 ? Math.round((d.closed / d.total) * 100) : 0, color: BLUE, colorEnd: PURPLE })).sort((a, b) => b.value - a.value), [stats])
  const levelBars = useMemo(() => Object.entries(stats.levelData).filter(([, d]) => d.total > 0).map(([lvl, d]) => ({ label: `${lvl} (${d.done}/${d.total})`, value: d.total > 0 ? Math.round((d.done / d.total) * 100) : 0, color: { L1: GREEN, L2: BLUE, L3: AMBER, L4: PURPLE, L5: RED }[lvl], colorEnd: { L1: TEAL, L2: PURPLE, L3: '#f97316', L4: PINK, L5: '#f97316' }[lvl] })), [stats])

  if (equipment.length === 0) {
    return <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}><h2 style={{ color: '#1e293b' }}>📊 Analytics</h2><p>No equipment data. Add items in Bay Builder or import a COR.</p></div>
  }

  return (
    <div style={{ padding: '24px 28px', minHeight: '100vh', background: theme.bg }}>
      <div>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ color: theme.text, margin: 0, fontSize: 20, fontWeight: 800 }}>📊 Analytics & Metrics</h2>
            <p style={{ color: theme.muted, fontSize: 12, margin: '4px 0 0' }}>Real-time commissioning performance data.</p>
          </div>
          <button onClick={toggleTheme} style={{ padding: '5px 12px', fontSize: 11, fontWeight: 600, borderRadius: 5, cursor: 'pointer', background: darkMode ? '#1e293b' : '#f1f5f9', color: darkMode ? '#e2e8f0' : '#334155', border: `1px solid ${theme.border}` }}>{darkMode ? '☀️ Light' : '🌙 Dark'}</button>
        </div>

        {/* Row 1: Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 14 }}>
          {[
            { label: 'Total Tests', value: stats.totalTests, color: theme.text },
            { label: 'SAT Completed', value: stats.tested, color: AMBER },
            { label: 'CxA Witnessed', value: stats.witnessed, color: BLUE },
            { label: 'Fully Closed', value: stats.closed, color: GREEN },
            { label: 'Remaining', value: stats.totalTests - stats.closed, color: RED },
            { label: 'Overdue', value: overdueItems.length, color: overdueItems.length > 0 ? RED : GREEN },
          ].map((s, i) => (
            <div key={i} style={{ ...card, padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: theme.muted, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Row 2: Donut + Section + Level */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div style={card}>
            {title('Overall Completion')}
            {desc('Tests that passed all stages (SAT → Witnessed → Closed).')}
            <DonutChart tested={stats.tested} witnessed={stats.witnessed} closed={stats.closed} total={stats.totalTests} t={theme} />
          </div>
          <div style={card}>
            {title(`Progress by Section (${sectionBars.length})`)}
            {desc('Completion rate per feeder/bay.')}
            <div style={{ maxHeight: 240, overflowY: 'auto' }}><ProgressBars data={sectionBars} t={theme} /></div>
          </div>
          <div style={card}>
            {title('Completion by Level')}
            {desc('Closed tests per commissioning level (L1–L5).')}
            <div style={{ maxHeight: 240, overflowY: 'auto' }}><ProgressBars data={levelBars} t={theme} /></div>
          </div>
        </div>

        {/* Row 3: Gantt + Schedule Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 14, marginBottom: 14 }}>
          <div style={card}>
            {title('📅 Planned vs Actual Timeline')}
            {desc('Planned schedule vs actual — red = late, green = on time.')}
            <GanttChart items={ganttItems} t={theme} />
          </div>
          <div style={{ ...card, display: 'flex', flexDirection: 'column' }}>
            {title('Schedule Summary')}
            {desc('Equipment by schedule status.')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
              {[
                { label: 'On time', value: ganttItems.filter(i => i.actualFinish && !i.isLate).length, color: GREEN },
                { label: 'Late', value: ganttItems.filter(i => i.isLate).length, color: RED },
                { label: 'In progress', value: ganttItems.filter(i => i.plannedStart && !i.actualFinish).length, color: BLUE },
                { label: 'Not scheduled', value: equipment.length - ganttItems.length, color: theme.muted },
              ].map((s, i) => (
                <div key={i} style={{ padding: '8px 12px', background: theme.barBg, borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: theme.sec }}>{s.label}</span>
                  <span style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</span>
                </div>
              ))}
              <div style={{ marginTop: 8, padding: '10px 12px', background: theme.barBg, borderRadius: 6 }}>
                <div style={{ fontSize: 11, color: theme.muted, marginBottom: 8, fontWeight: 600 }}>Schedule Metrics</div>
                {(() => {
                  const scheduled = ganttItems.length
                  const total = equipment.length
                  const completedOnTime = ganttItems.filter(i => i.actualFinish && !i.isLate).length
                  const completed = ganttItems.filter(i => i.actualFinish).length
                  const onTimePct = completed > 0 ? Math.round((completedOnTime / completed) * 100) : 0
                  const lateItems = ganttItems.filter(i => i.isLate && i.plannedFinish && i.actualFinish)
                  const avgDelay = lateItems.length > 0 ? Math.round(lateItems.reduce((a, i) => a + Math.round((new Date(i.actualFinish) - new Date(i.plannedFinish)) / 86400000), 0) / lateItems.length) : 0
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12, color: theme.muted }}>Coverage</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: theme.text }}>{total > 0 ? Math.round((scheduled / total) * 100) : 0}%</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12, color: theme.muted }}>On-time rate</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: onTimePct > 70 ? GREEN : onTimePct > 40 ? AMBER : RED }}>{onTimePct}%</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12, color: theme.muted }}>Avg delay</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: avgDelay > 14 ? RED : avgDelay > 7 ? AMBER : theme.text }}>{avgDelay}d</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12, color: theme.muted }}>Total scheduled</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: theme.text }}>{scheduled}/{total}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12, color: theme.muted }}>Completed</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: theme.text }}>{completed}</span>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Row 4: Overdue + Risk */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 14, marginBottom: 14 }}>
          <div style={card}>
            {title(`⚠️ Overdue Items (${overdueItems.length})`)}
            {desc('Equipment past planned finish that hasn\'t been fully closed.')}
            {overdueItems.length > 0 ? (
              <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, tableLayout: 'fixed' }}>
                  <colgroup>
                    <col style={{ width: '22%' }} />
                    <col style={{ width: '20%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '9%' }} />
                    <col style={{ width: '9%' }} />
                  </colgroup>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                      <th style={{ textAlign: 'left', padding: '4px 6px', fontSize: 10, fontWeight: 600, color: theme.muted }}>Equipment</th>
                      <th style={{ textAlign: 'left', padding: '4px 6px', fontSize: 10, fontWeight: 600, color: theme.muted }}>Section</th>
                      <th style={{ textAlign: 'left', padding: '4px 6px', fontSize: 10, fontWeight: 600, color: theme.muted }}>Level</th>
                      <th style={{ textAlign: 'left', padding: '4px 6px', fontSize: 10, fontWeight: 600, color: theme.muted }}>Planned Start</th>
                      <th style={{ textAlign: 'left', padding: '4px 6px', fontSize: 10, fontWeight: 600, color: theme.muted }}>Planned Finish</th>
                      <th style={{ textAlign: 'center', padding: '4px 6px', fontSize: 10, fontWeight: 600, color: theme.muted }}>Late</th>
                      <th style={{ textAlign: 'center', padding: '4px 6px', fontSize: 10, fontWeight: 600, color: theme.muted }}>Severity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overdueItems.slice(0, 25).map((item, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${theme.border}22` }}>
                        <td style={{ padding: '4px 6px', color: theme.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.name}>{item.name}</td>
                        <td style={{ padding: '4px 6px', color: theme.sec, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.section}>{item.section}</td>
                        <td style={{ padding: '4px 6px', color: theme.muted, fontSize: 10 }}>{item.level || '—'}</td>
                        <td style={{ padding: '4px 6px', color: theme.sec, fontSize: 10, whiteSpace: 'nowrap' }}>{item.plannedStart || '—'}</td>
                        <td style={{ padding: '4px 6px', color: theme.sec, fontSize: 10, whiteSpace: 'nowrap' }}>{item.plannedFinish}</td>
                        <td style={{ padding: '4px 6px', textAlign: 'center' }}><span style={{ color: RED, fontWeight: 700, fontSize: 10 }}>+{item.daysLate}d</span></td>
                        <td style={{ padding: '4px 6px', textAlign: 'center' }}><span style={{ fontSize: 9, fontWeight: 600, padding: '2px 4px', borderRadius: 3, background: item.daysLate > 30 ? `${RED}15` : item.daysLate > 7 ? `${AMBER}15` : `${BLUE}15`, color: item.daysLate > 30 ? RED : item.daysLate > 7 ? AMBER : BLUE }}>{item.daysLate > 30 ? 'Critical' : item.daysLate > 7 ? 'Warning' : 'Minor'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p style={{ color: GREEN, fontSize: 12 }}>✓ All on track!</p>}
          </div>
          <div style={card}>
            {title('Risk Breakdown')}
            {desc('Overdue items by severity.')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ padding: '8px 10px', background: `${RED}08`, borderRadius: 6, borderLeft: `3px solid ${RED}` }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: RED }}>{overdueItems.filter(i => i.daysLate > 30).length}</div>
                <div style={{ fontSize: 10, color: theme.muted }}>Critical (&gt;30 days)</div>
              </div>
              <div style={{ padding: '8px 10px', background: `${AMBER}08`, borderRadius: 6, borderLeft: `3px solid ${AMBER}` }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: AMBER }}>{overdueItems.filter(i => i.daysLate > 7 && i.daysLate <= 30).length}</div>
                <div style={{ fontSize: 10, color: theme.muted }}>Warning (7–30 days)</div>
              </div>
              <div style={{ padding: '8px 10px', background: `${BLUE}08`, borderRadius: 6, borderLeft: `3px solid ${BLUE}` }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: BLUE }}>{overdueItems.filter(i => i.daysLate <= 7).length}</div>
                <div style={{ fontSize: 10, color: theme.muted }}>Minor (≤7 days)</div>
              </div>
              {overdueItems.length > 0 && (
                <div style={{ padding: '8px 10px', background: theme.barBg, borderRadius: 6, marginTop: 4 }}>
                  <div style={{ fontSize: 10, color: theme.muted }}>Most affected section</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: theme.text, marginTop: 2 }}>{(() => { const c = {}; overdueItems.forEach(i => { c[i.section] = (c[i.section] || 0) + 1 }); return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] || '—' })()}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 5: Variance + Pipeline + Health + Velocity */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div style={card}>
            {title('Schedule Variance')}
            {desc('Days ahead or behind plan. Red = late, green = early.')}
            <VarianceChart data={scheduleVariance} t={theme} />
          </div>
          <div style={card}>
            {title('Pipeline Bottlenecks')}
            {desc('Tests stuck at each stage — where work is stalling.')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 180 }}>
              <div style={{ padding: '8px 10px', background: theme.barBg, borderRadius: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: theme.sec }}>Not started</span>
                  <span style={{ fontSize: 22, fontWeight: 800, color: theme.muted }}>{stats.totalTests - stats.tested}</span>
                </div>
              </div>
              <div style={{ padding: '10px 12px', background: `${AMBER}08`, borderRadius: 6, borderLeft: `3px solid ${AMBER}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: theme.sec }}>Awaiting witness</span>
                  <span style={{ fontSize: 22, fontWeight: 800, color: AMBER }}>{stats.tested - stats.witnessed}</span>
                </div>
                <div style={{ fontSize: 10, color: theme.muted, marginTop: 3 }}>SAT done, CxA not witnessed</div>
              </div>
              <div style={{ padding: '10px 12px', background: `${BLUE}08`, borderRadius: 6, borderLeft: `3px solid ${BLUE}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: theme.sec }}>Awaiting close-out</span>
                  <span style={{ fontSize: 22, fontWeight: 800, color: BLUE }}>{stats.witnessed - stats.closed}</span>
                </div>
                <div style={{ fontSize: 10, color: theme.muted, marginTop: 3 }}>Witnessed, report not closed</div>
              </div>
              <div style={{ padding: '10px 12px', background: `${GREEN}08`, borderRadius: 6, borderLeft: `3px solid ${GREEN}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: theme.sec }}>Fully closed</span>
                  <span style={{ fontSize: 22, fontWeight: 800, color: GREEN }}>{stats.closed}</span>
                </div>
              </div>
            </div>
          </div>
          <div style={card}>
            {title('Commissioning Health')}
            {desc('Overall project readiness indicators.')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minHeight: 180 }}>
              {(() => {
                const completionPct = stats.totalTests > 0 ? Math.round((stats.closed / stats.totalTests) * 100) : 0
                const witnessPct = stats.tested > 0 ? Math.round((stats.witnessed / stats.tested) * 100) : 0
                const closeoutPct = stats.witnessed > 0 ? Math.round((stats.closed / stats.witnessed) * 100) : 0
                const scheduledPct = equipment.length > 0 ? Math.round((ganttItems.length / equipment.length) * 100) : 0
                const onTimePct = ganttItems.length > 0 ? Math.round((ganttItems.filter(i => i.actualFinish && !i.isLate).length / ganttItems.filter(i => i.actualFinish).length) * 100) || 0 : 0
                const metrics = [
                  { label: 'Completion Rate', value: completionPct, color: completionPct > 75 ? GREEN : completionPct > 40 ? AMBER : RED },
                  { label: 'Witness Rate', value: witnessPct, color: witnessPct > 80 ? GREEN : witnessPct > 50 ? AMBER : RED },
                  { label: 'Close-out Rate', value: closeoutPct, color: closeoutPct > 80 ? GREEN : closeoutPct > 50 ? AMBER : RED },
                  { label: 'Schedule Coverage', value: scheduledPct, color: scheduledPct > 70 ? GREEN : scheduledPct > 40 ? AMBER : RED },
                  { label: 'On-time Delivery', value: onTimePct, color: onTimePct > 80 ? GREEN : onTimePct > 50 ? AMBER : RED },
                ]
                return metrics.map((m, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, color: theme.sec }}>{m.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: m.color }}>{m.value}%</span>
                    </div>
                    <div style={{ height: 8, background: theme.barBg, borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${m.value}%`, height: '100%', borderRadius: 3, background: m.color, transition: 'width 0.4s' }} />
                    </div>
                  </div>
                ))
              })()}
              <div style={{ marginTop: 4, padding: '8px 10px', background: theme.barBg, borderRadius: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: theme.muted }}>Health Score</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: (() => {
                    const s = stats.totalTests > 0 ? Math.round(
                      ((stats.closed / stats.totalTests) * 40) +
                      ((stats.tested > 0 ? stats.witnessed / stats.tested : 0) * 20) +
                      ((stats.witnessed > 0 ? stats.closed / stats.witnessed : 0) * 20) +
                      ((ganttItems.length > 0 ? ganttItems.filter(i => i.actualFinish && !i.isLate).length / Math.max(ganttItems.filter(i => i.actualFinish).length, 1) : 0) * 20)
                    ) : 0
                    return s > 70 ? GREEN : s > 40 ? AMBER : RED
                  })() }}>{(() => {
                    const s = stats.totalTests > 0 ? Math.round(
                      ((stats.closed / stats.totalTests) * 40) +
                      ((stats.tested > 0 ? stats.witnessed / stats.tested : 0) * 20) +
                      ((stats.witnessed > 0 ? stats.closed / stats.witnessed : 0) * 20) +
                      ((ganttItems.length > 0 ? ganttItems.filter(i => i.actualFinish && !i.isLate).length / Math.max(ganttItems.filter(i => i.actualFinish).length, 1) : 0) * 20)
                    ) : 0
                    return s
                  })()}/100</span>
                </div>
              </div>
            </div>
          </div>
          <div style={{ ...card, display: 'flex', flexDirection: 'column' }}>
            {title('Weekly Velocity')}
            {desc('Tests completed per week — team momentum over time.')}
            <WeeklyVelocity weekData={weeklyVelocity} t={theme} />
          </div>
        </div>

      </div>
    </div>
  )
}
