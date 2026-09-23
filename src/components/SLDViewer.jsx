import { useState, useMemo } from 'react'
import testTemplates from '../data/test_templates.json'

// ════════════════════════════════════════════════════════════
// SLDViewer v8 — Redesigned with category detection + grid layout
// ════════════════════════════════════════════════════════════

const LEVEL_COLORS = {
  L1: '#a78bfa', L2: '#fbbf24', L3: '#34d399', L4: '#60a5fa', L5: '#f472b6'
}
const LEVEL_NAMES = { L1: 'FWT', L2: 'IVF', L3: 'SAT', L4: 'FPT', L5: 'SEZ' }

// ── Theme definitions ──
const THEMES = {
  dark: {
    id: 'dark', label: '🌑', bg: 'linear-gradient(180deg, #070b14 0%, #0c1220 100%)',
    card: '#0d1320', cardBorder: '#1a2234', chip: '#111827', chipHover: '#131b2e',
    chipBorder: '#1e293b', badge: '#1a2234',
    text: '#e2e8f0', textSub: '#94a3b8', textMuted: '#475569',
    headerBg: '#070b14', headerBorder: '#1e293b',
    toggleBg: '#1e293b', toggleActiveBg: 'linear-gradient(135deg, #3b82f6, #6366f1)',
    panelBg: '#0d1320', panelBorder: '#1a2234', panelShadow: '-8px 0 30px rgba(0,0,0,0.5)',
  },
  midnight: {
    id: 'midnight', label: '🌊', bg: 'linear-gradient(180deg, #0c1631 0%, #111d42 100%)',
    card: '#132044', cardBorder: '#1e3060', chip: '#162248', chipHover: '#1a2a58',
    chipBorder: '#1e3060', badge: '#1e3060',
    text: '#e2e8f0', textSub: '#8babd8', textMuted: '#5678a8',
    headerBg: '#0c1631', headerBorder: '#1e3060',
    toggleBg: '#1e3060', toggleActiveBg: 'linear-gradient(135deg, #2563eb, #4f46e5)',
    panelBg: '#0f1a38', panelBorder: '#1e3060', panelShadow: '-8px 0 30px rgba(0,0,20,0.5)',
  },
  light: {
    id: 'light', label: '☀️', bg: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
    card: '#ffffff', cardBorder: '#e2e8f0', chip: '#f8fafc', chipHover: '#f1f5f9',
    chipBorder: '#e2e8f0', badge: '#f1f5f9',
    text: '#0f172a', textSub: '#334155', textMuted: '#94a3b8',
    headerBg: '#f8fafc', headerBorder: '#e2e8f0',
    toggleBg: '#e2e8f0', toggleActiveBg: 'linear-gradient(135deg, #3b82f6, #6366f1)',
    panelBg: '#ffffff', panelBorder: '#e2e8f0', panelShadow: '-8px 0 30px rgba(0,0,0,0.08)',
  },
  charcoal: {
    id: 'charcoal', label: '🪨', bg: 'linear-gradient(180deg, #1a1a1a 0%, #222222 100%)',
    card: '#2a2a2a', cardBorder: '#3a3a3a', chip: '#262626', chipHover: '#303030',
    chipBorder: '#3a3a3a', badge: '#333333',
    text: '#e5e5e5', textSub: '#a0a0a0', textMuted: '#666666',
    headerBg: '#1a1a1a', headerBorder: '#333333',
    toggleBg: '#333333', toggleActiveBg: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    panelBg: '#222222', panelBorder: '#3a3a3a', panelShadow: '-8px 0 30px rgba(0,0,0,0.6)',
  },
}

// ── Category detection from display name ──
const CAT_RULES = [
  [/^HIS PASS/i, 'gis', '⬡', '#22c55e'],
  [/^CB\b/i, 'breaker', '⊠', '#ef4444'],
  [/^DS\/ES|^Earth Switch/i, 'switch', '⟋', '#818cf8'],
  [/^Ring CT/i, 'ct', '◎', '#3b82f6'],
  [/^CT\b|^NCT\b/i, 'ct', '◎', '#3b82f6'],
  [/^VT\b/i, 'vt', '◉', '#a855f7'],
  [/^SA\b|Surge Arrester/i, 'arrester', '⚡', '#f59e0b'],
  [/Cable/i, 'cable', '┄', '#64748b'],
  [/^LCC|^Cubicle$/i, 'cubicle', '▣', '#94a3b8'],
  [/^IED/i, 'protection', '◈', '#c084fc'],
  [/^EPMS|^PQM|SCADA/i, 'metering', '◇', '#06b6d4'],
  [/Energization/i, 'energization', '⚡', '#eab308'],
  [/Stability|^Busbar(?! )/i, 'test', '△', '#f97316'],
  [/^P\d|DCDB|PANEL|^P\d\d/i, 'panel', '▦', '#fb923c'],
  [/UPS/i, 'ups', '▤', '#10b981'],
  [/AST|SSVT/i, 'aux_tx', '⊚', '#f59e0b'],
  [/Generator|^DG\b/i, 'generator', '⊛', '#ef4444'],
  [/^LV-AST/i, 'aux_tx', '⊚', '#f59e0b'],
]

function detectCategory(name) {
  for (const [re, cat, icon, color] of CAT_RULES) {
    if (re.test(name)) return { cat, icon, color }
  }
  return { cat: 'other', icon: '○', color: '#6b7280' }
}

// ── Category groups for ordering within sections ──
const CAT_ORDER = ['gis','switch','breaker','ct','vt','arrester','cable','cubicle','protection','metering','test','energization','panel','ups','aux_tx','generator','other']

// ── Test resolution: customTests first, then testTemplates fallback ──
function getTests(item) {
  if (item.customTests && item.customTests.length > 0) {
    return item.customTests.filter(t => t.enabled !== false).map(t => [t.level, t.name, t.notes || ''])
  }
  return testTemplates[item.type] || []
}

function getTestCount(item) { return getTests(item).length }

function getLevels(item) {
  const tests = getTests(item)
  return [...new Set(tests.map(t => t[0] || t.level))].sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)))
}

// ── Short name: extract the key identifier from the full display name ──
function getShortLabel(item) {
  const n = item.displayName || item.name || item.type
  // Take everything before first '(' if present, trim
  const base = n.includes('(') ? n.slice(0, n.indexOf('(')).trim() : n
  return base.length > 28 ? base.slice(0, 26) + '…' : base
}

// ── IEC Symbols (compact, for chips) ──
function IECIcon({ category, color, size = 18 }) {
  const p = { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: color, strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }
  switch (category) {
    case 'gis':
      return <svg {...p}><polygon points="12,3 21,8 21,16 12,21 3,16 3,8" /><circle cx="12" cy="12" r="3" fill={color} stroke="none" /></svg>
    case 'breaker':
      return <svg {...p}><rect x="6" y="6" width="12" height="12" rx="1" /><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></svg>
    case 'switch':
      return <svg {...p}><line x1="4" y1="14" x2="10" y2="14" /><line x1="14" y1="14" x2="20" y2="14" /><line x1="10" y1="14" x2="16" y2="6" /><circle cx="10" cy="14" r="1.5" fill={color} stroke="none" /></svg>
    case 'ct':
      return <svg {...p}><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2" fill={color} stroke="none" /></svg>
    case 'vt':
      return <svg {...p}><circle cx="12" cy="9" r="5" /><circle cx="12" cy="17" r="4.5" /></svg>
    case 'arrester':
      return <svg {...p}><polyline points="9,5 15,8 9,11 15,14 9,17 15,20" /><line x1="7" y1="22" x2="17" y2="22" /></svg>
    case 'cable':
      return <svg {...p}><line x1="4" y1="12" x2="20" y2="12" strokeDasharray="3 2" /><rect x="3" y="9" width="5" height="6" rx="1" /><rect x="16" y="9" width="5" height="6" rx="1" /></svg>
    case 'cubicle':
      return <svg {...p}><rect x="5" y="4" width="14" height="16" rx="2" /><line x1="8" y1="8" x2="16" y2="8" /><line x1="8" y1="12" x2="16" y2="12" /></svg>
    case 'protection':
      return <svg {...p}><rect x="5" y="3" width="14" height="18" rx="2" /><circle cx="12" cy="10" r="3" /><line x1="8" y1="16" x2="16" y2="16" /></svg>
    case 'metering':
      return <svg {...p}><rect x="5" y="5" width="14" height="14" rx="2" /><polyline points="8,14 11,10 14,13 17,8" /></svg>
    case 'energization':
      return <svg {...p}><polygon points="13,2 7,13 12,13 11,22 17,11 12,11" fill={color} stroke="none" /></svg>
    case 'test':
      return <svg {...p}><circle cx="12" cy="12" r="8" strokeDasharray="3 2" /><line x1="12" y1="8" x2="12" y2="13" /><circle cx="12" cy="16" r="0.5" fill={color} /></svg>
    case 'panel':
      return <svg {...p}><rect x="4" y="3" width="16" height="18" rx="1" /><line x1="7" y1="7" x2="17" y2="7" /><rect x="7" y="10" width="4" height="3" rx="0.5" /><rect x="13" y="10" width="4" height="3" rx="0.5" /></svg>
    case 'ups':
      return <svg {...p}><rect x="5" y="6" width="14" height="12" rx="2" /><line x1="9" y1="10" x2="9" y2="14" /><line x1="7" y1="12" x2="11" y2="12" /><line x1="14" y1="10" x2="16" y2="14" /><line x1="14" y1="14" x2="16" y2="10" /></svg>
    case 'aux_tx':
      return <svg {...p}><circle cx="12" cy="9" r="5" /><circle cx="12" cy="17" r="5" /></svg>
    case 'generator':
      return <svg {...p}><circle cx="12" cy="12" r="8" /><text x="12" y="15" textAnchor="middle" fontSize="9" fill={color} stroke="none" fontWeight="bold">G</text></svg>
    default:
      return <svg {...p}><circle cx="12" cy="12" r="8" /></svg>
  }
}

// ════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════
export default function SLDViewer({ equipment }) {
  const [viewMode, setViewMode] = useState('flow')
  const [selectedEquipment, setSelectedEquipment] = useState(null)
  const [collapsedSections, setCollapsedSections] = useState({})
  const [themeId, setThemeId] = useState('light')

  const toggleSection = (name) => setCollapsedSections(p => ({ ...p, [name]: !p[name] }))
  const theme = THEMES[themeId] || THEMES.dark

  const topology = useMemo(() => {
    if (!equipment || equipment.length === 0) return { sections: [] }
    const sMap = {}
    equipment.forEach(item => {
      const parts = (item.feeder_ref || '').split(' \u2014 ')
      const sectionName = parts[0] || item.section || 'Unknown'
      if (!sMap[sectionName]) sMap[sectionName] = { name: sectionName, items: [] }
      sMap[sectionName].items.push(item)
    })
    // Sort items by category order within each section
    Object.values(sMap).forEach(s => {
      s.items.sort((a, b) => {
        const ca = detectCategory(a.displayName || a.name || '').cat
        const cb = detectCategory(b.displayName || b.name || '').cat
        return CAT_ORDER.indexOf(ca) - CAT_ORDER.indexOf(cb)
      })
      s.totalTests = s.items.reduce((sum, i) => sum + getTestCount(i), 0)
      // Detect section type from name
      if (/^H\d/.test(s.name)) s.type = 'hv'
      else if (/C&P|SW Yard|SSVT/i.test(s.name)) s.type = 'aux'
      else s.type = 'other'
    })
    // Sort sections: H1-H8 first (numerically), then aux
    const sections = Object.values(sMap).sort((a, b) => {
      if (a.type !== b.type) return a.type === 'hv' ? -1 : 1
      const na = parseInt((a.name.match(/H(\d+)/) || [])[1] || '99')
      const nb = parseInt((b.name.match(/H(\d+)/) || [])[1] || '99')
      return na - nb
    })
    return { sections }
  }, [equipment])

  if (!equipment || equipment.length === 0) {
    return (
      <div style={{ background: 'linear-gradient(135deg, #0a0f1a 0%, #111827 100%)', color: '#475569', minHeight: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, margin: '0 auto 16px', background: '#1e293b', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><circle cx="12" cy="16" r="0.5" fill="#334155" /></svg>
          </div>
          <p style={{ fontSize: '15px', fontWeight: 500, color: '#64748b' }}>No equipment data</p>
          <p style={{ fontSize: '12px', marginTop: '6px', color: '#334155' }}>Add equipment in Scope & Export to generate the SLD</p>
        </div>
      </div>
    )
  }

  const totalItems = equipment.length
  const totalTests = equipment.reduce((s, e) => s + getTestCount(e), 0)
  const totalLevels = [...new Set(equipment.flatMap(e => getLevels(e)))]

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", width: '100%', position: 'relative' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 24px', background: viewMode === 'flow' ? theme.headerBg : '#f1f5f9', borderBottom: viewMode === 'flow' ? '1px solid ' + theme.headerBorder : '1px solid #d1d5db', transition: 'all 0.3s' }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          {[['Equipment', totalItems], ['Tests', totalTests], ['Sections', topology.sections.length]].map(([label, val]) => (
            <span key={label} style={{ fontSize: 11, color: viewMode === 'flow' ? theme.textMuted : '#94a3b8' }}>
              <span style={{ fontWeight: 700, color: viewMode === 'flow' ? theme.text : '#111827', fontSize: 13 }}>{val}</span> {label.toLowerCase()}
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Theme picker (flow view only) */}
          {viewMode === 'flow' && (
            <div style={{ display: 'flex', gap: 2, background: theme.toggleBg, borderRadius: 8, padding: 2 }}>
              {Object.values(THEMES).map(t => (
                <button key={t.id} onClick={() => setThemeId(t.id)} title={t.id} style={{
                  width: 26, height: 26, borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: themeId === t.id ? theme.toggleActiveBg : 'transparent',
                  fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: themeId === t.id ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
                  transition: 'all 0.15s', opacity: themeId === t.id ? 1 : 0.5,
                }}>{t.label}</button>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', background: viewMode === 'flow' ? theme.toggleBg : '#e2e8f0', borderRadius: 10, padding: 3, gap: 2 }}>
          {['flow', 'drawing'].map(mode => (
            <button key={mode} onClick={() => setViewMode(mode)} style={{
              padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
              background: viewMode === mode ? (mode === 'flow' ? theme.toggleActiveBg : '#000') : 'transparent',
              color: viewMode === mode ? '#fff' : '#64748b',
              boxShadow: viewMode === mode ? '0 2px 8px rgba(99,102,241,0.25)' : 'none',
              transition: 'all 0.2s'
            }}>
              {mode === 'flow' ? '⚡ Flow View' : '📐 Drawing View'}
            </button>
          ))}
        </div>
        </div>
      </div>

      {/* Main content + side panel wrapper */}
      <div style={{ display: 'flex', position: 'relative' }}>
        <div style={{ flex: 1, minWidth: 0, transition: 'margin-right 0.3s', marginRight: selectedEquipment ? 380 : 0 }}>
          {viewMode === 'flow' ? (
            <FlowView topology={topology} onSelect={setSelectedEquipment} selectedId={selectedEquipment?.id} collapsed={collapsedSections} onToggle={toggleSection} theme={theme} />
          ) : (
            <DrawingView topology={topology} onSelect={setSelectedEquipment} selectedId={selectedEquipment?.id} />
          )}
        </div>

        {selectedEquipment && (
          <DetailPanel item={selectedEquipment} onClose={() => setSelectedEquipment(null)} theme={theme} />
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// FLOW VIEW — Grid of categorized equipment chips
// ════════════════════════════════════════════════════════════
function FlowView({ topology, onSelect, selectedId, collapsed, onToggle, theme }) {
  const T = theme
  return (
    <div style={{ background: T.bg, minHeight: 'calc(100vh - 160px)', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {topology.sections.map(section => {
        const isCollapsed = collapsed[section.name]
        const sectionColor = section.type === 'hv' ? '#f59e0b' : '#14b8a6'
        return (
          <div key={section.name} style={{ background: T.card, border: '1px solid ' + T.cardBorder, borderRadius: 12, overflow: 'hidden', transition: 'all 0.2s' }}>
            {/* Section header */}
            <div
              onClick={() => onToggle(section.name)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', cursor: 'pointer', borderBottom: isCollapsed ? 'none' : '1px solid ' + T.cardBorder, userSelect: 'none' }}
            >
              <div style={{ width: 4, height: 24, background: sectionColor, borderRadius: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: T.text, letterSpacing: '0.01em' }}>{section.name}</span>
              <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: T.textMuted, background: T.badge, padding: '3px 8px', borderRadius: 6 }}>
                  <span style={{ fontWeight: 700, color: T.textSub }}>{section.items.length}</span> equip
                </span>
                <span style={{ fontSize: 10, color: T.textMuted, background: T.badge, padding: '3px 8px', borderRadius: 6 }}>
                  <span style={{ fontWeight: 700, color: T.textSub }}>{section.totalTests}</span> tests
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth="2" style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0)', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9" /></svg>
              </div>
            </div>
            {/* Equipment grid */}
            {!isCollapsed && (
              <div style={{ padding: '14px 18px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {section.items.map((item, idx) => (
                  <EquipmentChip key={item.id || idx} item={item} onSelect={onSelect} isSelected={selectedId === item.id} theme={T} />
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* Legend */}
      <div style={{ background: T.card, border: '1px solid ' + T.cardBorder, borderRadius: 10, padding: '12px 18px' }}>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>Levels</span>
          {Object.entries(LEVEL_COLORS).map(([lv, col]) => (
            <div key={lv} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: col, boxShadow: '0 0 6px ' + col + '50' }} />
              <span style={{ fontWeight: 700, color: col }}>{lv}</span>
              <span style={{ color: T.textMuted }}>{LEVEL_NAMES[lv]}</span>
            </div>
          ))}
          <span style={{ fontSize: 9, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginLeft: 16 }}>Types</span>
          {[['gis','GIS','#22c55e'],['breaker','CB','#ef4444'],['switch','DS/ES','#818cf8'],['ct','CT','#3b82f6'],['vt','VT','#a855f7'],['protection','IED','#c084fc'],['cable','Cable','#64748b']].map(([cat, label, col]) => (
            <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <IECIcon category={cat} color={col} size={12} />
              <span style={{ fontSize: 10, color: T.textMuted }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Equipment Chip ──
function EquipmentChip({ item, onSelect, isSelected, theme }) {
  const T = theme
  const name = item.displayName || item.name || item.type
  const { cat, color } = detectCategory(name)
  const label = getShortLabel(item)
  const tc = getTestCount(item)
  const levels = getLevels(item)

  return (
    <div
      onClick={() => onSelect(item)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
        background: isSelected ? color + '15' : T.chip,
        border: '1px solid ' + (isSelected ? color : T.chipBorder),
        borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s',
        minWidth: 180, maxWidth: 320, flex: '1 1 auto',
        boxShadow: isSelected ? '0 0 12px ' + color + '20' : 'none',
      }}
      onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.borderColor = color + '60'; e.currentTarget.style.background = T.chipHover } }}
      onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.borderColor = T.chipBorder; e.currentTarget.style.background = T.chip } }}
    >
      {/* Icon */}
      <div style={{ width: 28, height: 28, background: color + '15', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <IECIcon category={cat} color={color} size={16} />
      </div>
      {/* Name + meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {label}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
          {levels.map(lv => (
            <div key={lv} style={{ width: 6, height: 6, borderRadius: '50%', background: LEVEL_COLORS[lv], boxShadow: '0 0 4px ' + LEVEL_COLORS[lv] + '60' }} />
          ))}
          {tc > 0 && <span style={{ fontSize: 9, color: T.textMuted, marginLeft: 2 }}>{tc}t</span>}
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// DRAWING VIEW — Engineering SLD
// ════════════════════════════════════════════════════════════
function DrawingSymbol({ type, x, y, category }) {
  const c = '#000', sw = 1.5
  const cat = category || 'other'
  switch (cat) {
    case 'gis':
      return <g><polygon points={[x,y-10,x+8,y-5,x+8,y+5,x,y+10,x-8,y+5,x-8,y-5].join(',')} fill="#fff" stroke={c} strokeWidth={sw} /><circle cx={x} cy={y} r="2" fill={c} /></g>
    case 'breaker':
      return <g><rect x={x-10} y={y-10} width="20" height="20" fill="#fff" stroke={c} strokeWidth={2} /><line x1={x-10} y1={y-10} x2={x+10} y2={y+10} stroke={c} strokeWidth={sw} /><line x1={x+10} y1={y-10} x2={x-10} y2={y+10} stroke={c} strokeWidth={sw} /></g>
    case 'switch':
      return <g><line x1={x-5} y1={y-6} x2={x+5} y2={y-6} stroke={c} strokeWidth={2} /><line x1={x} y1={y-6} x2={x-5} y2={y+6} stroke={c} strokeWidth={2} /><line x1={x-5} y1={y+6} x2={x+5} y2={y+6} stroke={c} strokeWidth={2} /></g>
    case 'ct':
      return <g><circle cx={x} cy={y} r="8" fill="#fff" stroke={c} strokeWidth={sw} /><circle cx={x} cy={y} r="2" fill={c} /></g>
    case 'vt':
      return <g><circle cx={x} cy={y-4} r="6" fill="#fff" stroke={c} strokeWidth={sw} /><circle cx={x} cy={y+5} r="5.5" fill="#fff" stroke={c} strokeWidth={sw} /></g>
    case 'arrester':
      return <g><polyline points={`${x-4},${y-10} ${x+4},${y-6} ${x-4},${y-2} ${x+4},${y+2} ${x-4},${y+6}`} fill="none" stroke={c} strokeWidth={sw} /><line x1={x-6} y1={y+9} x2={x+6} y2={y+9} stroke={c} strokeWidth={2} /></g>
    case 'cable':
      return <g><line x1={x} y1={y-10} x2={x} y2={y+10} stroke={c} strokeWidth={sw} strokeDasharray="3 2" /><rect x={x-5} y={y-12} width="10" height="5" rx="1" fill="#fff" stroke={c} strokeWidth={sw} /><rect x={x-5} y={y+7} width="10" height="5" rx="1" fill="#fff" stroke={c} strokeWidth={sw} /></g>
    case 'protection': case 'cubicle': case 'panel': case 'metering':
      return <g><rect x={x-8} y={y-10} width="16" height="20" rx="2" fill="#fff" stroke={c} strokeWidth={sw} /><text x={x} y={y+2} textAnchor="middle" fontSize="8" fontFamily="Consolas, monospace" fill={c}>{cat === 'protection' ? 'R' : cat === 'metering' ? 'M' : 'P'}</text></g>
    case 'energization':
      return <g><circle cx={x} cy={y} r="10" fill="none" stroke={c} strokeWidth={sw} strokeDasharray="3 2" /><polygon points={`${x+2},${y-6} ${x-3},${y+1} ${x},${y+1} ${x-2},${y+6} ${x+3},${y-1} ${x},${y-1}`} fill={c} /></g>
    case 'aux_tx': case 'generator':
      return <g><circle cx={x} cy={y-8} r="12" fill="#fff" stroke={c} strokeWidth={2} /><circle cx={x} cy={y+12} r="12" fill="#fff" stroke={c} strokeWidth={2} /></g>
    default:
      return <g><circle cx={x} cy={y} r="8" fill="#fff" stroke={c} strokeWidth={sw} /><text x={x} y={y+3} textAnchor="middle" fontSize="7" fontFamily="Consolas, monospace" fill={c}>?</text></g>
  }
}

function DrawingView({ topology, onSelect, selectedId }) {
  const hvSections = topology.sections.filter(s => s.type === 'hv')
  const auxSections = topology.sections.filter(s => s.type !== 'hv')
  if (hvSections.length === 0) return <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>Add equipment to see the Drawing View</div>

  const bayCount = Math.max(hvSections.length, 1)
  const svgWidth = 1360
  const maxItems = Math.max(...hvSections.map(s => s.items.length), 1)
  const baySpacing = Math.min(350, (svgWidth - 200) / bayCount)
  const bayContentH = maxItems * 50
  const auxH = auxSections.length > 0 ? 80 : 0
  const svgHeight = Math.max(900, 200 + bayContentH + auxH + 100)
  const bayBottomY = 120 + maxItems * 50 + 40
  const auxZoneY = bayBottomY + 40
  const legendY = auxSections.length > 0 ? auxZoneY + 60 + 30 : bayBottomY + 30

  return (
    <div style={{ background: '#e8e8e8', padding: 30, minHeight: 'calc(100vh - 160px)', display: 'flex', justifyContent: 'center' }}>
      <div style={{ background: '#fff', width: '100%', maxWidth: 1400, position: 'relative', boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(0,0,0,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.025) 1px, transparent 1px)', backgroundSize: '20px 20px', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 12, left: 12, right: 12, bottom: 12, border: '1.5px solid #000' }}>
          <div style={{ position: 'absolute', top: 4, left: 4, right: 4, bottom: 4, border: '0.5px solid #000' }} />
        </div>
        <div style={{ position: 'absolute', top: 20, left: 20, right: 20, bottom: 20 }}>
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: '100%' }} xmlns="http://www.w3.org/2000/svg">
            {/* HV Busbar */}
            <line x1="100" y1="100" x2={100 + bayCount * baySpacing} y2="100" stroke="#000" strokeWidth="4" strokeLinecap="square" />
            <text x={(100 + bayCount * baySpacing) / 2 + 50} y="80" style={{ fontFamily: 'Consolas, monospace', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' }} fill="#000">220kV BUSBAR</text>
            {/* Bay columns */}
            {hvSections.map((section, i) => {
              const bx = 200 + i * baySpacing
              return <g key={'bay-' + i}>
                <text x={bx} y="50" style={{ fontFamily: 'Consolas, monospace', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' }} fill="#000">{section.name.toUpperCase().slice(0, 24)}</text>
                <line x1={bx} y1="100" x2={bx} y2="120" stroke="#000" strokeWidth="1.5" />
                {section.items.map((item, idx) => {
                  const iy = 120 + idx * 50 + 25
                  const { cat, color } = detectCategory(item.displayName || item.name || '')
                  const isSel = selectedId === item.id
                  const levels = getLevels(item)
                  return <g key={item.id || idx} onClick={() => onSelect(item)} style={{ cursor: 'pointer' }}>
                    {idx > 0 && <line x1={bx} y1={iy - 50 + 14} x2={bx} y2={iy - 14} stroke="#000" strokeWidth="1.5" />}
                    {idx === 0 && <line x1={bx} y1="120" x2={bx} y2={iy - 14} stroke="#000" strokeWidth="1.5" />}
                    {isSel && <rect x={bx - 14} y={iy - 14} width="28" height="28" rx="3" fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="3 2" />}
                    <DrawingSymbol type={item.type} x={bx} y={iy} category={cat} />
                    <text x={bx + 20} y={iy - 2} style={{ fontFamily: 'Consolas, monospace', fontSize: 8 }} fill="#000">{getShortLabel(item).slice(0, 18)}</text>
                    {levels.slice(0, 4).map((lv, li) => <g key={lv}><rect x={bx + 20 + li * 16} y={iy + 4} width="14" height="8" rx="4" fill={LEVEL_COLORS[lv]} /><text x={bx + 27 + li * 16} y={iy + 8} style={{ fontFamily: 'Consolas, monospace', fontSize: 6, fontWeight: 'bold', textAnchor: 'middle', dominantBaseline: 'middle' }} fill="#fff">{lv}</text></g>)}
                  </g>
                })}
                {/* Ground symbol */}
                {section.items.length > 0 && (() => { const gy = 120 + (section.items.length - 1) * 50 + 40; return <g><line x1={bx} y1={gy} x2={bx} y2={gy + 8} stroke="#000" strokeWidth="1.5" /><line x1={bx - 6} y1={gy + 10} x2={bx + 6} y2={gy + 10} stroke="#000" strokeWidth="2" /><line x1={bx - 4} y1={gy + 13} x2={bx + 4} y2={gy + 13} stroke="#000" strokeWidth="1.5" /><line x1={bx - 2} y1={gy + 16} x2={bx + 2} y2={gy + 16} stroke="#000" strokeWidth="1" /></g> })()}
              </g>
            })}
            {/* Aux zone */}
            {auxSections.length > 0 && <g>
              <text x="100" y={auxZoneY - 10} style={{ fontFamily: 'Consolas, monospace', fontSize: 10, fontWeight: 'bold' }} fill="#000">AUXILIARY SYSTEMS</text>
              <line x1="100" y1={auxZoneY} x2={svgWidth - 400} y2={auxZoneY} stroke="#000" strokeWidth="0.5" />
              {auxSections.map((s, si) => s.items.map((item, ii) => {
                const ax = 150 + (si * 5 + ii) * 80, ay = auxZoneY + 30
                const { cat } = detectCategory(item.displayName || item.name || '')
                return <g key={'ax-' + si + '-' + ii} onClick={() => onSelect(item)} style={{ cursor: 'pointer' }}>
                  <DrawingSymbol type={item.type} x={ax} y={ay} category={cat} />
                  <text x={ax + 14} y={ay - 2} style={{ fontFamily: 'Consolas, monospace', fontSize: 7 }} fill="#000">{getShortLabel(item).slice(0, 14)}</text>
                </g>
              }))}
            </g>}
            {/* Legend */}
            <text x="50" y={legendY} style={{ fontFamily: 'Consolas, monospace', fontSize: 9, fontWeight: 'bold' }} fill="#000">COMMISSIONING LEVELS:</text>
            {Object.entries(LEVEL_COLORS).map(([lv, col], i) => <g key={lv}><rect x={50 + i * 70} y={legendY + 8} width="14" height="8" rx="4" fill={col} /><text x={50 + i * 70 + 7} y={legendY + 12} style={{ fontFamily: 'Consolas, monospace', fontSize: 6, fontWeight: 'bold', textAnchor: 'middle', dominantBaseline: 'middle' }} fill="#fff">{lv}</text><text x={50 + i * 70 + 20} y={legendY + 14} style={{ fontFamily: 'Consolas, monospace', fontSize: 7 }} fill="#444">{LEVEL_NAMES[lv]}</text></g>)}
          </svg>
        </div>
        {/* Title block */}
        <div style={{ position: 'absolute', bottom: 16, right: 16, width: 320, border: '1.5px solid #000', fontSize: 10, fontFamily: 'Consolas, monospace', background: '#fff' }}>
          <div style={{ background: '#000', color: '#fff', padding: '5px 8px', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 }}>SINGLE LINE DIAGRAM</div>
          <div style={{ padding: '3px 8px', borderBottom: '0.5px solid #000' }}><div style={{ fontSize: 7, color: '#666' }}>TITLE</div><div style={{ fontWeight: 'bold' }}>COMMISSIONING SLD</div></div>
          <div style={{ display: 'flex', borderBottom: '0.5px solid #000' }}><div style={{ flex: 1, padding: '3px 8px', borderRight: '0.5px solid #000' }}><div style={{ fontSize: 7, color: '#666' }}>DWG NO.</div><div style={{ fontWeight: 'bold' }}>SLD-CX-001</div></div><div style={{ width: 80, padding: '3px 8px' }}><div style={{ fontSize: 7, color: '#666' }}>REV</div><div style={{ fontWeight: 'bold' }}>A</div></div></div>
          <div style={{ display: 'flex' }}><div style={{ flex: 1, padding: '3px 8px', borderRight: '0.5px solid #000' }}><div style={{ fontSize: 7, color: '#666' }}>DATE</div><div style={{ fontWeight: 'bold' }}>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}</div></div><div style={{ width: 80, padding: '3px 8px' }}><div style={{ fontSize: 7, color: '#666' }}>SCALE</div><div style={{ fontWeight: 'bold' }}>NTS</div></div></div>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// DETAIL PANEL
// ════════════════════════════════════════════════════════════
function DetailPanel({ item, onClose, theme }) {
  const tests = getTests(item)
  const levels = getLevels(item)
  const name = item.displayName || item.name || item.type
  const { cat, color } = detectCategory(name)

  const bg = theme.panelBg
  const bdr = theme.panelBorder
  const tp = theme.text
  const ts = theme.textMuted
  const cbg = theme.chip

  // Group tests by level
  const byLevel = {}
  tests.forEach(t => {
    const lv = t[0] || t.level || 'L3'
    if (!byLevel[lv]) byLevel[lv] = []
    byLevel[lv].push(t)
  })

  return (
    <div style={{ position: 'absolute', top: 0, right: 0, width: 370, height: '100%', minHeight: '100vh', background: bg, borderLeft: '1px solid ' + bdr, padding: '16px 18px', overflowY: 'auto', zIndex: 50, boxShadow: theme.panelShadow }}>
      <button onClick={onClose} style={{ position: 'sticky', top: 0, float: 'right', width: 26, height: 26, borderRadius: 6, border: 'none', background: theme.badge, color: tp, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>✕</button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ width: 38, height: 38, background: color + '18', border: '1px solid ' + color + '30', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <IECIcon category={cat} color={color} size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: tp, margin: 0 }}>{name}</h3>
          <p style={{ fontSize: 10, color: ts, margin: '2px 0 0' }}>{item.feeder_ref || 'N/A'}</p>
        </div>
      </div>
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 14 }}>
          {levels.map(lv => (
            <span key={lv} style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: LEVEL_COLORS[lv] + '20', color: LEVEL_COLORS[lv], border: '1px solid ' + LEVEL_COLORS[lv] + '35' }}>{lv} {LEVEL_NAMES[lv]}</span>
          ))}
        </div>

      {/* Test list grouped by level */}
      {tests.length === 0 ? (
        <div style={{ padding: 16, textAlign: 'center', color: ts, fontSize: 12, background: cbg, borderRadius: 8 }}>No tests configured</div>
      ) : (
        <div>
          {Object.entries(byLevel).sort(([a],[b]) => parseInt(a.slice(1)) - parseInt(b.slice(1))).map(([lv, lvTests]) => (
            <div key={lv} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: LEVEL_COLORS[lv] }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: LEVEL_COLORS[lv] }}>{lv} — {LEVEL_NAMES[lv]}</span>
                <span style={{ fontSize: 9, color: ts }}>{lvTests.length} tests</span>
              </div>
              {lvTests.map((t, i) => (
                <div key={i} style={{ padding: '4px 0 4px 18px', fontSize: 11, color: tp, borderLeft: '2px solid ' + LEVEL_COLORS[lv] + '30', marginLeft: 2 }}>
                  {t[1] || t.name || 'Test ' + (i + 1)}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: 8, fontSize: 10, color: ts }}>{tests.length} test{tests.length !== 1 ? 's' : ''} · {levels.length} level{levels.length !== 1 ? 's' : ''}</div>
    </div>
  )
}
