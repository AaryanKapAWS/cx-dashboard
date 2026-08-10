import { useState, useMemo } from 'react'
import testTemplates from '../data/test_templates.json'

// ─── SECTION COLOURS (matching BayBuilder presets) ────────────────────────────
const SECTION_COLOURS = {
  transformer_bay: '#d35400', line_bay: '#2980b9', bus_section: '#1a5276',
  switchgear: '#27ae60', hv_switchgear_gis: '#27ae60', protection: '#8e44ad',
  cables: '#2c3e50', battery_dc: '#f39c12', earthing: '#16a085',
  substation: '#34495e', aux_transformer: '#e67e22', panel_board: '#7f8c8d',
  blank: '#95a5a6', custom: '#95a5a6',
}

// ─── EQUIPMENT ICONS (FontAwesome class names are not available, using unicode/emoji) ──
const TYPE_ICONS = {
  TRANSFORMER: '⚡', DRY_TRANSFORMER: '⚡',
  CT_HV: '◎', CT: '◎', CT_METER: '◎', NCT: '◎', CT_GIS: '◎', RING_CT_GIS: '◎', NER_CT: '◎',
  VT_HV: '∿', VT: '∿', VT_GIS: '∿',
  CIRCUIT_BREAKER: '⊗', CB_GIS: '⊗',
  EARTH_SWITCH: '⏚', DS_ES_GIS: '⏚', ES_GIS: '⏚',
  SURGE_ARRESTER: '↯', SA_GIS: '↯',
  NER: '⊘', HV_CABLE: '━', MV_CABLE: '━', HV_CABLE_GIS: '━',
  BUSBAR: '▬', GIS_BAY: '▬',
  PROTECTION_PANEL: '🛡', MK_OLTC_PANEL: '⚙', RELAY: '🛡', CUBICLE: '▫',
  STABILITY_TEST: '⇌', SYNCH_CHECK: '⇌', CABLE_DIFF: '⇌', L4_INTEGRATION: '⇌',
  ENERGIZATION: '⚡', ENERGIZATION_GIS: '⚡',
  SWITCHGEAR_OVERALL: '⬡', AC_DC_CHECKS: '⬡', SCADA: '📡', SUBSTATION_CHECKS: '✓', ESB_INTERFACE: '↔',
  CUBICLE_GIS: '▫', IED_OC_GIS: '🛡', IED_87T_GIS: '🛡', IED_87B_GIS: '🛡', LCC_GIS: '▫',
  STABILITY_GIS: '⇌', EPMS_GIS: '📊', EPMS: '📊', PQM: '📊',
  BATTERY_BANK: '🔋', BATTERY_CHARGER: '🔌', DC_DISTRIBUTION: '⊞', UPS: '⚡', DC_EARTH_FAULT: '⚠',
  EARTH_GRID: '⏚', EARTH_ELECTRODE: '⏚',
}

const TYPE_COLOUR = {
  CT: '#006064', CT_HV: '#006064', CT_METER: '#0097a7', NCT: '#00838f', NER_CT: '#4a148c',
  CT_GIS: '#006064', RING_CT_GIS: '#006064',
  VT: '#1a237e', VT_HV: '#1a237e', VT_GIS: '#1a237e',
  CIRCUIT_BREAKER: '#c62828', CB_GIS: '#c62828',
  EARTH_SWITCH: '#1b5e20', DS_ES_GIS: '#1b5e20', ES_GIS: '#1b5e20',
  SURGE_ARRESTER: '#e65100', SA_GIS: '#e65100',
  TRANSFORMER: '#bf360c', DRY_TRANSFORMER: '#4e342e',
  NER: '#6a1b9a', NER_CT: '#4a148c',
  HV_CABLE: '#37474F', MV_CABLE: '#455a64', HV_CABLE_GIS: '#37474F',
  BUSBAR: '#263238', GIS_BAY: '#263238',
  PROTECTION_PANEL: '#5c6bc0', MK_OLTC_PANEL: '#546e7a', RELAY: '#5c6bc0',
  CUBICLE: '#78909c', CUBICLE_GIS: '#78909c',
  STABILITY_TEST: '#8e44ad', SYNCH_CHECK: '#8e44ad', CABLE_DIFF: '#8e44ad',
  L4_INTEGRATION: '#1565c0', ENERGIZATION: '#f59e0b', ENERGIZATION_GIS: '#f59e0b',
  SWITCHGEAR_OVERALL: '#34495e', AC_DC_CHECKS: '#34495e', SCADA: '#00695c',
  SUBSTATION_CHECKS: '#34495e', ESB_INTERFACE: '#00695c',
  IED_OC_GIS: '#5c6bc0', IED_87T_GIS: '#5c6bc0', IED_87B_GIS: '#5c6bc0', LCC_GIS: '#546e7a',
  STABILITY_GIS: '#8e44ad', EPMS_GIS: '#00695c', EPMS: '#00695c', PQM: '#00695c',
  BATTERY_BANK: '#f39c12', BATTERY_CHARGER: '#e67e22', DC_DISTRIBUTION: '#d35400',
  UPS: '#8e44ad', DC_EARTH_FAULT: '#c0392b',
  EARTH_GRID: '#16a085', EARTH_ELECTRODE: '#16a085',
}

const TYPE_LABELS = {
  TRANSFORMER: 'Oil Transformer', DRY_TRANSFORMER: 'Dry Transformer',
  CT_HV: 'CT (HV/Outdoor)', CT: 'CT - Protection', CT_METER: 'CT - Metering',
  NCT: 'NCT/CBCT', CT_GIS: 'CT (GIS)', RING_CT_GIS: 'Ring CT (GIS)', NER_CT: 'NER CT',
  VT_HV: 'VT (HV/Outdoor)', VT: 'VT', VT_GIS: 'VT (GIS)',
  CIRCUIT_BREAKER: 'Circuit Breaker', CB_GIS: 'Circuit Breaker (GIS)',
  EARTH_SWITCH: 'Earth Switch / Disconnector', DS_ES_GIS: 'DS/ES (GIS)', ES_GIS: 'Earth Switch (GIS)',
  SURGE_ARRESTER: 'Surge Arrester', SA_GIS: 'Surge Arrester (GIS)',
  NER: 'Neutral Earth Resistor', HV_CABLE: 'HV Cable', MV_CABLE: 'MV Cable', HV_CABLE_GIS: 'HV Cable (GIS)',
  BUSBAR: 'Busbar', GIS_BAY: 'GIS Bay Overall',
  PROTECTION_PANEL: 'Protection Panel', MK_OLTC_PANEL: 'MK & OLTC Panel',
  RELAY: 'Relay/IED', CUBICLE: 'Cubicle', CUBICLE_GIS: 'Cubicle (GIS)',
  STABILITY_TEST: 'Stability Test', SYNCH_CHECK: 'Synch Check',
  CABLE_DIFF: 'Cable Differential (87L)', L4_INTEGRATION: 'L4 Integration/FPT',
  ENERGIZATION: 'Energization', ENERGIZATION_GIS: 'Energization (GIS)',
  SWITCHGEAR_OVERALL: 'Switchgear Overall', AC_DC_CHECKS: 'AC/DC Distribution',
  SCADA: 'SCADA/SAS', SUBSTATION_CHECKS: 'Substation Checks', ESB_INTERFACE: 'Grid Interface',
  IED_OC_GIS: 'IED O/C (GIS)', IED_87T_GIS: 'IED 87T (GIS)', IED_87B_GIS: 'IED 87B (GIS)',
  LCC_GIS: 'LCC (GIS)', STABILITY_GIS: 'Stability (GIS)',
  EPMS_GIS: 'EPMS (GIS)', EPMS: 'EPMS', PQM: 'PQM',
  BATTERY_BANK: 'Battery Bank', BATTERY_CHARGER: 'Charger/Rectifier',
  DC_DISTRIBUTION: 'DC Distribution', UPS: 'UPS', DC_EARTH_FAULT: 'DC Earth Fault Monitor',
  EARTH_GRID: 'Earth Grid', EARTH_ELECTRODE: 'Earth Electrode',
}

const LEVEL_COLOURS = {
  L1: { bg: '#4c1d95', text: '#c4b5fd' },
  L2: { bg: '#92400e', text: '#fde68a' },
  L3: { bg: '#065f46', text: '#6ee7b7' },
  L4: { bg: '#1e40af', text: '#93c5fd' },
  L5: { bg: '#831843', text: '#f9a8d4' },
}

function getTestsForType(type) {
  return testTemplates[type] || []
}

function getTestLevels(type) {
  const tests = getTestsForType(type)
  const levels = new Set()
  tests.forEach(t => { if (t[0]) levels.add(t[0]) })
  return [...levels].sort()
}

// ─── SWITCHGEAR DETECTION ─────────────────────────────────────────────────────
const SWITCHGEAR_PRESETS = new Set(['switchgear', 'hv_switchgear_gis', 'panel_board'])

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function SLDViewer({ equipment }) {
  const [openSections, setOpenSections] = useState({})
  const [expandedItems, setExpandedItems] = useState({})

  const data = useMemo(() => {
    if (!equipment || !equipment.length) return null

    // Group all items by section (no filtering — show everything)
    const sectionMap = {}
    equipment.forEach(item => {
      const ref = item.feeder_ref || 'Unassigned'
      const dashIdx = ref.indexOf(' \u2014 ')
      const sectionName = dashIdx >= 0 ? ref.slice(0, dashIdx) : ref
      const feederName = dashIdx >= 0 ? ref.slice(dashIdx + 3) : ''

      if (!sectionMap[sectionName]) {
        sectionMap[sectionName] = { name: sectionName, overall: [], feeders: {}, sectionType: '' }
      }
      if (item.section && (!sectionMap[sectionName].sectionType || !feederName)) {
        sectionMap[sectionName].sectionType = item.section
      }

      if (feederName && feederName !== 'Overall') {
        if (!sectionMap[sectionName].feeders[feederName]) sectionMap[sectionName].feeders[feederName] = []
        sectionMap[sectionName].feeders[feederName].push(item)
      } else {
        sectionMap[sectionName].overall.push(item)
      }
    })

    // Classify sections
    const sections = Object.values(sectionMap).map(sec => {
      const preset = sec.sectionType || ''
      const isSwitchgear = SWITCHGEAR_PRESETS.has(preset) && Object.keys(sec.feeders).length > 0
      const allItems = [...sec.overall, ...Object.values(sec.feeders).flat()]
      const testCount = allItems.reduce((sum, item) => sum + getTestsForType(item.type).length, 0)
      const levels = new Set()
      allItems.forEach(item => getTestLevels(item.type).forEach(l => levels.add(l)))
      return { ...sec, isSwitchgear, totalItems: allItems.length, testCount, levels: [...levels].sort() }
    })

    return sections
  }, [equipment])

  if (!data || data.length === 0) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📐</div>
        Add equipment in the Scope panel to see the SLD view
      </div>
    )
  }

  const toggleSection = (name) => {
    setOpenSections(prev => ({ ...prev, [name]: !prev[name] }))
  }

  const toggleItem = (key) => {
    setExpandedItems(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Start with first section open
  if (Object.keys(openSections).length === 0 && data.length > 0) {
    const first = data[0].name
    setOpenSections({ [first]: true })
  }

  const totalItems = data.reduce((s, sec) => s + sec.totalItems, 0)
  const totalTests = data.reduce((s, sec) => s + sec.testCount, 0)

  return (
    <div style={{ padding: '12px 16px' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0',
        borderRadius: '8px 8px 0 0', borderBottom: 'none',
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
          ⚡ Single Line Diagram
        </span>
        <div style={{ display: 'flex', gap: 14, fontSize: 11, color: '#64748b' }}>
          <span><b style={{ color: '#1e293b' }}>{data.length}</b> sections</span>
          <span><b style={{ color: '#1e293b' }}>{totalItems}</b> items</span>
          <span><b style={{ color: '#1e293b' }}>{totalTests}</b> tests</span>
        </div>
      </div>

      {/* Sections */}
      <div style={{
        background: '#fff', border: '1px solid #e2e8f0', borderRadius: '0 0 8px 8px',
        overflow: 'hidden',
      }}>
        {data.map((section, sIdx) => {
          const isOpen = openSections[section.name]
          const colour = SECTION_COLOURS[section.sectionType] || '#64748b'

          return (
            <div key={sIdx} style={{ borderBottom: sIdx < data.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
              {/* Section header — clickable */}
              <div
                onClick={() => toggleSection(section.name)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', cursor: 'pointer',
                  background: isOpen ? '#f8fafc' : '#fff',
                  transition: 'background 0.15s',
                }}
              >
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: colour, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', flex: 1 }}>{section.name}</span>
                <span style={{ fontSize: 10, color: '#94a3b8', background: '#f1f5f9', padding: '2px 8px', borderRadius: 10 }}>
                  {section.totalItems} items
                </span>
                <span style={{ fontSize: 10, color: '#94a3b8', background: '#f1f5f9', padding: '2px 8px', borderRadius: 10 }}>
                  {section.testCount} tests
                </span>
                {section.levels.length > 0 && (
                  <span style={{ fontSize: 10, color: '#94a3b8', background: '#f1f5f9', padding: '2px 8px', borderRadius: 10 }}>
                    {section.levels[0]}-{section.levels[section.levels.length - 1]}
                  </span>
                )}
                <span style={{
                  fontSize: 10, color: '#94a3b8',
                  transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
                  transition: 'transform 0.2s',
                }}>▼</span>
              </div>

              {/* Section body */}
              {isOpen && (
                <div style={{ padding: '4px 14px 14px' }}>
                  {section.isSwitchgear ? (
                    <SwitchgearBody section={section} colour={colour} expandedItems={expandedItems} toggleItem={toggleItem} />
                  ) : (
                    <SpineBody section={section} colour={colour} expandedItems={expandedItems} toggleItem={toggleItem} />
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── SPINE BODY (Transformer Bay, Line Bay, Battery, Earthing, etc.) ──────────
function SpineBody({ section, colour, expandedItems, toggleItem }) {
  const items = section.overall

  return (
    <div style={{ position: 'relative', paddingLeft: 16 }}>
      {/* Vertical power flow line */}
      <div style={{
        position: 'absolute', left: 20, top: 0, bottom: 0,
        width: 2, background: `linear-gradient(180deg, ${colour}30, ${colour})`,
        borderRadius: 1,
      }} />

      {items.map((item, i) => {
        const key = `${section.name}-${i}`
        const isExpanded = expandedItems[key]
        const c = TYPE_COLOUR[item.type] || '#64748b'
        const tests = getTestsForType(item.type)
        const levels = getTestLevels(item.type)
        const icon = TYPE_ICONS[item.type] || '●'

        return (
          <div key={i}>
            <div
              onClick={() => toggleItem(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 12px', marginLeft: 14, marginBottom: 3,
                background: isExpanded ? '#f0f9ff' : '#f8fafc',
                border: `1px solid ${isExpanded ? colour + '40' : '#e2e8f0'}`,
                borderRadius: 6, cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {/* Node dot on the line */}
              <div style={{
                position: 'absolute', left: 15, width: 12, height: 12, borderRadius: '50%',
                background: c, border: '2px solid #fff', boxShadow: `0 0 0 1px ${c}40`,
              }} />

              {/* Icon */}
              <span style={{
                width: 30, height: 30, borderRadius: 6,
                background: c + '15', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, flexShrink: 0,
              }}>
                {icon}
              </span>

              {/* Name + type */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.displayName || item.name || TYPE_LABELS[item.type] || item.type}
                </div>
                <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>
                  {TYPE_LABELS[item.type] || item.type}
                </div>
              </div>

              {/* Level badges */}
              <div style={{ display: 'flex', gap: 3 }}>
                {levels.map(l => {
                  const lc = LEVEL_COLOURS[l] || { bg: '#475569', text: '#e2e8f0' }
                  return (
                    <span key={l} style={{
                      fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
                      background: lc.bg, color: lc.text, fontFamily: 'SF Mono, Consolas, monospace',
                    }}>{l}</span>
                  )
                })}
              </div>

              {/* Test count */}
              <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600, minWidth: 50, textAlign: 'right' }}>
                {tests.length} tests
              </span>

              {/* Expand arrow */}
              <span style={{
                fontSize: 9, color: '#94a3b8',
                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
                transition: 'transform 0.2s',
              }}>▼</span>
            </div>

            {/* Expanded test details */}
            {isExpanded && tests.length > 0 && (
              <TestDetailPanel tests={tests} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── SWITCHGEAR BODY (Busbar + Feeder cards) ──────────────────────────────────
function SwitchgearBody({ section, colour, expandedItems, toggleItem }) {
  const feederNames = Object.keys(section.feeders)

  return (
    <div>
      {/* Overall items (if any) */}
      {section.overall.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <SpineBody section={{ ...section, overall: section.overall }} colour={colour} expandedItems={expandedItems} toggleItem={toggleItem} />
        </div>
      )}

      {/* Busbar */}
      <div style={{ position: 'relative', margin: '8px 0' }}>
        <div style={{ height: 5, background: colour, borderRadius: 3, opacity: 0.8 }} />
        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: -4 }}>
          {feederNames.map((_, i) => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: colour, border: '2px solid #fff' }} />
          ))}
        </div>
      </div>

      {/* Feeder grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fill, minmax(200px, 1fr))`,
        gap: 8, marginTop: 10,
      }}>
        {feederNames.map((fName, fIdx) => {
          const items = section.feeders[fName]
          const feederTests = items.reduce((s, i) => s + getTestsForType(i.type).length, 0)
          return (
            <div key={fIdx} style={{
              background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6,
              overflow: 'hidden',
            }}>
              {/* Feeder header */}
              <div style={{
                padding: '6px 10px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#1e293b' }}>{fName}</span>
                <span style={{ fontSize: 9, color: '#94a3b8' }}>{items.length}eq · {feederTests}t</span>
              </div>

              {/* Equipment list */}
              <div style={{ padding: '6px 8px' }}>
                {items.map((item, i) => {
                  const c = TYPE_COLOUR[item.type] || '#64748b'
                  const icon = TYPE_ICONS[item.type] || '●'
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0' }}>
                      <span style={{
                        width: 18, height: 18, borderRadius: 4, fontSize: 10,
                        background: c + '15', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>{icon}</span>
                      <span style={{ fontSize: 10, color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {TYPE_LABELS[item.type] || item.displayName || item.name || item.type}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── TEST DETAIL PANEL (shown when equipment row is expanded) ─────────────────
function TestDetailPanel({ tests }) {
  return (
    <div style={{
      marginLeft: 30, marginBottom: 6, padding: '8px 12px',
      background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6,
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 3,
      }}>
        {tests.map((t, i) => {
          const level = t[0] || ''
          const name = t[1] || ''
          const lc = LEVEL_COLOURS[level] || { bg: '#475569', text: '#e2e8f0' }
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '3px 6px', borderRadius: 4, fontSize: 10, color: '#475569',
            }}>
              {level && (
                <span style={{
                  fontSize: 8, fontWeight: 700, padding: '1px 4px', borderRadius: 3,
                  background: lc.bg, color: lc.text, fontFamily: 'SF Mono, Consolas, monospace',
                  flexShrink: 0,
                }}>{level}</span>
              )}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {name}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
