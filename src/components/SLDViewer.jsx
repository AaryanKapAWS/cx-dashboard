import { useState, useMemo, useRef, useEffect } from 'react'
import testTemplates from '../data/test_templates.json'

// IEC Single Line Diagram with proper schematic symbols
// Layout: HV Busbar -> Vertical bay columns -> MV Busbar -> Switchgear feeders -> Aux panel

const COLOURS = {
  bg: '#0a0f1a',
  canvas: '#111827',
  busbar_hv: '#f59e0b',
  busbar_mv: '#22c55e',
  wire: '#475569',
  wire_active: '#94a3b8',
  text: '#e2e8f0',
  text_dim: '#64748b',
  panel_bg: '#0f172a',
  border: '#1e293b',
  highlight: '#fbbf24',
}

const SECTION_COLOURS = {
  transformer_bay: '#f59e0b', line_bay: '#3b82f6', bus_section: '#6366f1',
  switchgear: '#22c55e', hv_switchgear_gis: '#22c55e', protection: '#a855f7',
  cables: '#64748b', battery_dc: '#f97316', earthing: '#14b8a6',
  substation: '#6b7280', aux_transformer: '#f97316', panel_board: '#8b5cf6',
  blank: '#94a3b8', custom: '#94a3b8',
}

const LEVEL_COLOURS = {
  L1: '#7c3aed', L2: '#d97706', L3: '#059669', L4: '#2563eb', L5: '#db2777',
}

const SWITCHGEAR_PRESETS = new Set(['switchgear', 'hv_switchgear_gis', 'panel_board'])
const AUX_PRESETS = new Set(['battery_dc', 'earthing', 'substation', 'protection'])

// IEC SVG SYMBOL COMPONENTS
// All symbols draw within a 40x40 viewBox, centred at (20, 20)

function SymbolCB({ colour = '#ef5350' }) {
  return (
    <g>
      <rect x="10" y="10" width="20" height="20" rx="1" fill="none" stroke={colour} strokeWidth="1.8"/>
      <line x1="12" y1="12" x2="28" y2="28" stroke={colour} strokeWidth="1.5"/>
      <line x1="28" y1="12" x2="12" y2="28" stroke={colour} strokeWidth="1.5"/>
    </g>
  )
}

function SymbolCT({ colour = '#26c6da' }) {
  return (
    <g>
      <circle cx="20" cy="20" r="8" fill="none" stroke={colour} strokeWidth="1.8"/>
      <circle cx="20" cy="20" r="3" fill={colour}/>
    </g>
  )
}

function SymbolVT({ colour = '#7c4dff' }) {
  return (
    <g>
      <circle cx="16" cy="20" r="7" fill="none" stroke={colour} strokeWidth="1.5"/>
      <circle cx="24" cy="20" r="7" fill="none" stroke={colour} strokeWidth="1.5"/>
    </g>
  )
}

function SymbolES({ colour = '#66bb6a' }) {
  return (
    <g>
      <line x1="12" y1="26" x2="28" y2="26" stroke={colour} strokeWidth="2"/>
      <line x1="20" y1="26" x2="28" y2="14" stroke={colour} strokeWidth="1.8"/>
      <circle cx="20" cy="26" r="2.5" fill={colour}/>
    </g>
  )
}

function SymbolSA({ colour = '#ffa726' }) {
  return (
    <g>
      <polyline points="20,10 14,16 26,20 14,24 26,28 20,34" fill="none" stroke={colour} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="14" y1="34" x2="26" y2="34" stroke={colour} strokeWidth="1.5"/>
    </g>
  )
}

function SymbolTransformer({ colour = '#ff7043' }) {
  return (
    <g>
      <circle cx="20" cy="15" r="9" fill="none" stroke={colour} strokeWidth="1.8"/>
      <circle cx="20" cy="25" r="9" fill="none" stroke={colour} strokeWidth="1.8"/>
    </g>
  )
}

function SymbolNER({ colour = '#ab47bc' }) {
  return (
    <g>
      <polyline points="20,8 14,12 26,16 14,20 26,24 20,28" fill="none" stroke={colour} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="14" y1="32" x2="26" y2="32" stroke={colour} strokeWidth="1.5"/>
      <line x1="16" y1="34" x2="24" y2="34" stroke={colour} strokeWidth="1"/>
      <line x1="18" y1="36" x2="22" y2="36" stroke={colour} strokeWidth="0.8"/>
      <line x1="20" y1="28" x2="20" y2="32" stroke={colour} strokeWidth="1.2"/>
    </g>
  )
}

function SymbolCable({ colour = '#90a4ae' }) {
  return (
    <g>
      <line x1="20" y1="10" x2="20" y2="30" stroke={colour} strokeWidth="2" strokeDasharray="3,2"/>
      <rect x="15" y="28" width="10" height="6" fill="none" stroke={colour} strokeWidth="1.2" rx="1"/>
    </g>
  )
}

function SymbolBusbar({ colour = '#b0bec5' }) {
  return (
    <g>
      <rect x="8" y="17" width="24" height="6" fill={colour} rx="1" opacity="0.8"/>
    </g>
  )
}

function SymbolEnergization({ colour = '#ffd54f' }) {
  return (
    <g>
      <circle cx="20" cy="20" r="10" fill="none" stroke={colour} strokeWidth="1.2" strokeDasharray="3,2"/>
      <polygon points="20,12 22,19 26,19 21,23 23,30 20,25 17,30 19,23 14,19 18,19" fill={colour} opacity="0.8"/>
    </g>
  )
}

function SymbolRelay({ colour = '#9fa8da' }) {
  return (
    <g>
      <rect x="10" y="10" width="20" height="20" rx="2" fill="none" stroke={colour} strokeWidth="1.5"/>
      <text x="20" y="24" textAnchor="middle" fill={colour} fontSize="10" fontWeight="bold">R</text>
    </g>
  )
}

function SymbolGeneric({ colour = '#64748b', label = '?' }) {
  return (
    <g>
      <circle cx="20" cy="20" r="9" fill="none" stroke={colour} strokeWidth="1.5"/>
      <text x="20" y="24" textAnchor="middle" fill={colour} fontSize="9" fontWeight="600">{label}</text>
    </g>
  )
}

// SYMBOL MAPPER
const SYMBOL_MAP = {
  CIRCUIT_BREAKER: { Component: SymbolCB, colour: '#ef5350', label: 'CB' },
  CB_GIS: { Component: SymbolCB, colour: '#ef5350', label: 'CB' },
  CT_HV: { Component: SymbolCT, colour: '#26c6da', label: 'CT' },
  CT: { Component: SymbolCT, colour: '#26c6da', label: 'CT' },
  CT_METER: { Component: SymbolCT, colour: '#00bcd4', label: 'CT-M' },
  NCT: { Component: SymbolCT, colour: '#00acc1', label: 'NCT' },
  CT_GIS: { Component: SymbolCT, colour: '#26c6da', label: 'CT' },
  RING_CT_GIS: { Component: SymbolCT, colour: '#26c6da', label: 'Ring CT' },
  NER_CT: { Component: SymbolCT, colour: '#ce93d8', label: 'NER CT' },
  VT_HV: { Component: SymbolVT, colour: '#7c4dff', label: 'VT' },
  VT: { Component: SymbolVT, colour: '#7c4dff', label: 'VT' },
  VT_GIS: { Component: SymbolVT, colour: '#7c4dff', label: 'VT' },
  EARTH_SWITCH: { Component: SymbolES, colour: '#66bb6a', label: 'ES' },
  DS_ES_GIS: { Component: SymbolES, colour: '#66bb6a', label: 'DS/ES' },
  ES_GIS: { Component: SymbolES, colour: '#66bb6a', label: 'ES' },
  SURGE_ARRESTER: { Component: SymbolSA, colour: '#ffa726', label: 'SA' },
  SA_GIS: { Component: SymbolSA, colour: '#ffa726', label: 'SA' },
  TRANSFORMER: { Component: SymbolTransformer, colour: '#ff7043', label: 'Tx' },
  DRY_TRANSFORMER: { Component: SymbolTransformer, colour: '#a1887f', label: 'Tx' },
  NER: { Component: SymbolNER, colour: '#ab47bc', label: 'NER' },
  HV_CABLE: { Component: SymbolCable, colour: '#90a4ae', label: 'Cable' },
  MV_CABLE: { Component: SymbolCable, colour: '#78909c', label: 'MV Cable' },
  HV_CABLE_GIS: { Component: SymbolCable, colour: '#90a4ae', label: 'Cable' },
  BUSBAR: { Component: SymbolBusbar, colour: '#b0bec5', label: 'Busbar' },
  GIS_BAY: { Component: SymbolBusbar, colour: '#b0bec5', label: 'GIS Bay' },
  PROTECTION_PANEL: { Component: SymbolRelay, colour: '#9fa8da', label: 'Prot' },
  MK_OLTC_PANEL: { Component: SymbolRelay, colour: '#80cbc4', label: 'OLTC' },
  RELAY: { Component: SymbolRelay, colour: '#9fa8da', label: 'IED' },
  ENERGIZATION: { Component: SymbolEnergization, colour: '#ffd54f', label: 'Ener.' },
  ENERGIZATION_GIS: { Component: SymbolEnergization, colour: '#ffd54f', label: 'Ener.' },
  CUBICLE: { Component: SymbolRelay, colour: '#90a4ae', label: 'Cub' },
  CUBICLE_GIS: { Component: SymbolRelay, colour: '#90a4ae', label: 'Cub' },
  IED_OC_GIS: { Component: SymbolRelay, colour: '#9fa8da', label: 'O/C' },
  IED_87T_GIS: { Component: SymbolRelay, colour: '#9fa8da', label: '87T' },
  IED_87B_GIS: { Component: SymbolRelay, colour: '#9fa8da', label: '87B' },
  LCC_GIS: { Component: SymbolRelay, colour: '#80cbc4', label: 'LCC' },
  STABILITY_GIS: { Component: SymbolGeneric, colour: '#ce93d8', label: 'STB' },
  STABILITY_TEST: { Component: SymbolGeneric, colour: '#ce93d8', label: 'STB' },
  SYNCH_CHECK: { Component: SymbolGeneric, colour: '#ce93d8', label: 'SYN' },
  CABLE_DIFF: { Component: SymbolGeneric, colour: '#ce93d8', label: '87L' },
  L4_INTEGRATION: { Component: SymbolGeneric, colour: '#64b5f6', label: 'L4' },
  EPMS_GIS: { Component: SymbolGeneric, colour: '#4db6ac', label: 'EPM' },
  EPMS: { Component: SymbolGeneric, colour: '#4db6ac', label: 'EPM' },
  PQM: { Component: SymbolGeneric, colour: '#4db6ac', label: 'PQM' },
  SCADA: { Component: SymbolGeneric, colour: '#4db6ac', label: 'SCA' },
  SWITCHGEAR_OVERALL: { Component: SymbolGeneric, colour: '#78909c', label: 'SW' },
  AC_DC_CHECKS: { Component: SymbolGeneric, colour: '#78909c', label: 'AC' },
  SUBSTATION_CHECKS: { Component: SymbolGeneric, colour: '#78909c', label: 'SUB' },
  ESB_INTERFACE: { Component: SymbolGeneric, colour: '#4db6ac', label: 'GI' },
  BATTERY_BANK: { Component: SymbolGeneric, colour: '#ffa726', label: 'BAT' },
  BATTERY_CHARGER: { Component: SymbolGeneric, colour: '#ff8a65', label: 'CHG' },
  DC_DISTRIBUTION: { Component: SymbolGeneric, colour: '#ffab40', label: 'DC' },
  UPS: { Component: SymbolGeneric, colour: '#ce93d8', label: 'UPS' },
  DC_EARTH_FAULT: { Component: SymbolGeneric, colour: '#ef5350', label: 'DEF' },
  EARTH_GRID: { Component: SymbolES, colour: '#4db6ac', label: 'EG' },
  EARTH_ELECTRODE: { Component: SymbolES, colour: '#4db6ac', label: 'EE' },
}

function getSymbolForType(type) {
  return SYMBOL_MAP[type] || { Component: SymbolGeneric, colour: '#64748b', label: type?.slice(0,3) || '?' }
}

function getTestsForType(type) { return testTemplates[type] || [] }
function getTestLevels(type) {
  const tests = getTestsForType(type)
  const levels = new Set()
  tests.forEach(t => { if (t[0]) levels.add(t[0]) })
  return [...levels].sort()
}

// Equipment ordering (IEC standard top-to-bottom in a bay)
const BAY_ORDER = [
  'SURGE_ARRESTER', 'SA_GIS',
  'EARTH_SWITCH', 'DS_ES_GIS', 'ES_GIS',
  'CT_HV', 'CT', 'CT_GIS', 'CT_METER', 'NCT', 'RING_CT_GIS',
  'VT_HV', 'VT', 'VT_GIS',
  'CIRCUIT_BREAKER', 'CB_GIS',
  'BUSBAR', 'GIS_BAY',
  'TRANSFORMER', 'DRY_TRANSFORMER',
  'NER_CT', 'NER',
  'MK_OLTC_PANEL', 'PROTECTION_PANEL', 'RELAY',
  'HV_CABLE', 'MV_CABLE', 'HV_CABLE_GIS',
  'ENERGIZATION', 'ENERGIZATION_GIS',
]

function sortByBayOrder(items) {
  const orderMap = {}
  BAY_ORDER.forEach((t, i) => orderMap[t] = i)
  return [...items].sort((a, b) => (orderMap[a.type] ?? 99) - (orderMap[b.type] ?? 99))
}

// MAIN COMPONENT
export default function SLDViewer({ equipment }) {
  const [selectedItem, setSelectedItem] = useState(null)
  const [hoveredItem, setHoveredItem] = useState(null)

  const topology = useMemo(() => {
    if (!equipment || !equipment.length) return null

    const sectionMap = {}
    equipment.forEach(item => {
      const ref = item.feeder_ref || 'Unassigned'
      const dashIdx = ref.indexOf(' \u2014 ')
      const sectionName = dashIdx >= 0 ? ref.slice(0, dashIdx) : ref
      const feederName = dashIdx >= 0 ? ref.slice(dashIdx + 3) : ''
      if (!sectionMap[sectionName]) sectionMap[sectionName] = { name: sectionName, overall: [], feeders: {}, sectionType: '' }
      if (item.section && (!sectionMap[sectionName].sectionType || !feederName)) sectionMap[sectionName].sectionType = item.section
      if (feederName && feederName !== 'Overall') {
        if (!sectionMap[sectionName].feeders[feederName]) sectionMap[sectionName].feeders[feederName] = []
        sectionMap[sectionName].feeders[feederName].push(item)
      } else {
        sectionMap[sectionName].overall.push(item)
      }
    })

    const sections = Object.values(sectionMap)
    const hvBays = []
    const mvSections = []
    const auxSections = []

    sections.forEach(sec => {
      if (SWITCHGEAR_PRESETS.has(sec.sectionType) && Object.keys(sec.feeders).length > 0) {
        mvSections.push(sec)
      } else if (AUX_PRESETS.has(sec.sectionType)) {
        auxSections.push(sec)
      } else {
        hvBays.push(sec)
      }
    })

    return { hvBays, mvSections, auxSections, totalItems: equipment.length }
  }, [equipment])

  if (!topology) {
    return (
      <div style={{ background: COLOURS.bg, borderRadius: 10, padding: 40, textAlign: 'center', color: COLOURS.text_dim, fontSize: 13 }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>{'\u26A1'}</div>
        Add equipment in the Scope panel to see the SLD
      </div>
    )
  }

  const totalTests = equipment.reduce((s, i) => s + getTestsForType(i.type).length, 0)

  return (
    <div style={{ background: COLOURS.bg, borderRadius: 10, padding: 16, minHeight: 400 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, padding: '0 8px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: COLOURS.text, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: COLOURS.busbar_hv }}>{'\u26A1'}</span> Single Line Diagram
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 11, color: COLOURS.text_dim }}>
          <span><b style={{ color: COLOURS.text }}>{topology.hvBays.length + topology.mvSections.length + topology.auxSections.length}</b> sections</span>
          <span><b style={{ color: COLOURS.text }}>{topology.totalItems}</b> equipment</span>
          <span><b style={{ color: COLOURS.text }}>{totalTests}</b> tests</span>
        </div>
      </div>

      {/* SLD Canvas */}
      <div style={{
        background: COLOURS.canvas,
        border: `1px solid ${COLOURS.border}`,
        borderRadius: 10,
        padding: '20px 24px',
        overflowX: 'auto',
        position: 'relative',
      }}>
        {/* HV ZONE */}
        {topology.hvBays.length > 0 && (
          <>
            <ZoneLabel label="HV Zone (110/132 kV)" colour={COLOURS.busbar_hv} />
            <BusbarLine colour={COLOURS.busbar_hv} label="HV BUSBAR" />
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 4,
              padding: '0 20px',
              minHeight: 100,
            }}>
              {topology.hvBays.map((bay, i) => (
                <BayColumn
                  key={i}
                  section={bay}
                  selectedItem={selectedItem}
                  setSelectedItem={setSelectedItem}
                  hoveredItem={hoveredItem}
                  setHoveredItem={setHoveredItem}
                />
              ))}
            </div>
          </>
        )}

        {/* MV ZONE */}
        {topology.mvSections.length > 0 && (
          <>
            <ZoneLabel label="MV Zone (10/20 kV Switchgear)" colour={COLOURS.busbar_mv} />
            <BusbarLine colour={COLOURS.busbar_mv} label="MV BUSBAR" />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '12px 0' }}>
              {topology.mvSections.map((sec, i) => (
                <SwitchgearPanel
                  key={i}
                  section={sec}
                  selectedItem={selectedItem}
                  setSelectedItem={setSelectedItem}
                />
              ))}
            </div>
          </>
        )}

        {/* AUX ZONE */}
        {topology.auxSections.length > 0 && (
          <>
            <ZoneLabel label="Auxiliary Systems" colour="#64748b" />
            <div style={{
              display: 'flex', gap: 8, flexWrap: 'wrap',
              padding: 12, background: COLOURS.panel_bg,
              border: `1px dashed ${COLOURS.border}`, borderRadius: 8,
            }}>
              {topology.auxSections.map((sec, i) => (
                <AuxPanel key={i} section={sec} selectedItem={selectedItem} setSelectedItem={setSelectedItem} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Test Detail Panel */}
      {selectedItem && (
        <TestDetailPanel item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}

      {/* Legend */}
      <Legend />
    </div>
  )
}

// ZONE LABEL
function ZoneLabel({ label, colour }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0 6px 0' }}>
      <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: colour }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: COLOURS.border }} />
    </div>
  )
}

// BUSBAR LINE
function BusbarLine({ colour, label }) {
  return (
    <div style={{ position: 'relative', height: 20, margin: '4px 0 8px 0' }}>
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 8,
        height: 4, borderRadius: 2,
        background: `linear-gradient(90deg, transparent 0%, ${colour} 5%, ${colour} 95%, transparent 100%)`,
        boxShadow: `0 0 8px ${colour}50`,
      }} />
      <div style={{
        position: 'relative', display: 'inline-block', marginLeft: 12,
        fontSize: 8, fontWeight: 700, letterSpacing: 0.5,
        padding: '2px 8px', borderRadius: 3,
        background: COLOURS.canvas, border: `1px solid ${colour}44`, color: colour,
      }}>{label}</div>
    </div>
  )
}

// BAY COLUMN (HV bays: Transformer, Line, Bus Section)
function BayColumn({ section, selectedItem, setSelectedItem, hoveredItem, setHoveredItem }) {
  const items = sortByBayOrder(section.overall)
  const colour = SECTION_COLOURS[section.sectionType] || '#64748b'
  const nodeHeight = 44
  const svgHeight = items.length * nodeHeight + 20
  const svgWidth = 80

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 90 }}>
      {/* Connection dot to busbar */}
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLOURS.busbar_hv, border: `2px solid ${COLOURS.canvas}`, marginBottom: -4, zIndex: 2 }} />

      {/* SVG bay with equipment stacked vertically */}
      <svg width={svgWidth} height={svgHeight} style={{ display: 'block' }}>
        {/* Vertical spine */}
        <line x1={svgWidth/2} y1="0" x2={svgWidth/2} y2={svgHeight} stroke={COLOURS.wire} strokeWidth="1.2" />

        {/* Equipment nodes */}
        {items.map((item, idx) => {
          const y = idx * nodeHeight + 10
          const sym = getSymbolForType(item.type)
          const isSelected = selectedItem && (selectedItem.id === item.id || (selectedItem.name === item.name && selectedItem.type === item.type))
          const nodeKey = `${section.name}-${idx}`
          const isHovered = hoveredItem === nodeKey
          return (
            <g
              key={idx}
              transform={`translate(${svgWidth/2 - 20}, ${y})`}
              onClick={() => setSelectedItem(item)}
              onMouseEnter={() => setHoveredItem(nodeKey)}
              onMouseLeave={() => setHoveredItem(null)}
              style={{ cursor: 'pointer' }}
            >
              {/* Hover/select highlight */}
              {(isSelected || isHovered) && (
                <rect x="-2" y="-2" width="44" height="44" rx="6" fill={`${sym.colour}15`} stroke={sym.colour} strokeWidth="0.8" strokeDasharray={isSelected ? "0" : "2,2"} />
              )}
              <sym.Component colour={sym.colour} />
              {/* Label to the right */}
              <text x="42" y="24" fill={COLOURS.text_dim} fontSize="7" fontWeight="500">{sym.label}</text>
            </g>
          )
        })}
      </svg>

      {/* Bay label */}
      <div style={{
        fontSize: 9, fontWeight: 700, color: colour,
        textAlign: 'center', marginTop: 4, maxWidth: 100,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {section.name}
      </div>
      <div style={{ fontSize: 8, color: COLOURS.text_dim }}>
        {items.length} items
      </div>
    </div>
  )
}

// SWITCHGEAR PANEL
function SwitchgearPanel({ section, selectedItem, setSelectedItem }) {
  const colour = SECTION_COLOURS[section.sectionType] || '#22c55e'
  const feederNames = Object.keys(section.feeders)

  return (
    <div style={{
      flex: 1, minWidth: 280,
      background: COLOURS.panel_bg,
      border: `1px solid ${COLOURS.border}`,
      borderRadius: 8, padding: 12,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: colour, marginBottom: 8 }}>
        {section.name}
        <span style={{ color: COLOURS.text_dim, fontWeight: 400, marginLeft: 8 }}>
          {feederNames.length} feeders
        </span>
      </div>

      {/* Feeder cubicles grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: 4 }}>
        {feederNames.map((fName, fIdx) => {
          const items = section.feeders[fName]
          const testCount = items.reduce((s, i) => s + getTestsForType(i.type).length, 0)
          return (
            <div
              key={fIdx}
              onClick={() => setSelectedItem(items[0])}
              style={{
                padding: '8px 6px', borderRadius: 4,
                background: COLOURS.canvas,
                border: `1px solid ${COLOURS.border}`,
                textAlign: 'center', cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
              onMouseOver={e => e.currentTarget.style.borderColor = colour}
              onMouseOut={e => e.currentTarget.style.borderColor = COLOURS.border}
            >
              <div style={{ fontSize: 8, fontWeight: 600, color: COLOURS.text, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {fName}
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: colour, fontFamily: 'SF Mono, Consolas, monospace' }}>
                {items.length}
              </div>
              <div style={{ fontSize: 7, color: COLOURS.text_dim }}>{testCount}t</div>
              {/* Mini icons */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 1, marginTop: 4, flexWrap: 'wrap' }}>
                {items.slice(0, 5).map((item, i) => {
                  const sym = getSymbolForType(item.type)
                  return (
                    <svg key={i} width="12" height="12" viewBox="0 0 40 40" style={{ opacity: 0.7 }}>
                      <sym.Component colour={sym.colour} />
                    </svg>
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

// AUX PANEL
function AuxPanel({ section, selectedItem, setSelectedItem }) {
  const colour = SECTION_COLOURS[section.sectionType] || '#64748b'
  const items = section.overall
  const totalTests = items.reduce((s, i) => s + getTestsForType(i.type).length, 0)

  return (
    <div style={{
      padding: '8px 12px', borderRadius: 6,
      border: `1px solid ${colour}40`,
      background: `${colour}08`,
      minWidth: 120,
    }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: colour, marginBottom: 6 }}>
        {section.name}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {items.map((item, i) => {
          const sym = getSymbolForType(item.type)
          return (
            <div
              key={i}
              onClick={() => setSelectedItem(item)}
              style={{
                display: 'flex', alignItems: 'center', gap: 3,
                padding: '2px 6px', borderRadius: 3,
                background: `${sym.colour}15`,
                border: `1px solid ${sym.colour}30`,
                cursor: 'pointer', fontSize: 8, color: sym.colour,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 40 40">
                <sym.Component colour={sym.colour} />
              </svg>
              {sym.label}
            </div>
          )
        })}
      </div>
      <div style={{ fontSize: 7, color: COLOURS.text_dim, marginTop: 4 }}>
        {items.length} items {'\u00B7'} {totalTests} tests
      </div>
    </div>
  )
}

// TEST DETAIL PANEL
function TestDetailPanel({ item, onClose }) {
  const tests = getTestsForType(item.type)
  const levels = getTestLevels(item.type)
  const sym = getSymbolForType(item.type)

  return (
    <div style={{
      marginTop: 12, padding: 16,
      background: COLOURS.canvas,
      border: `1px solid ${sym.colour}40`,
      borderRadius: 10,
      borderLeft: `3px solid ${sym.colour}`,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="28" height="28" viewBox="0 0 40 40">
            <sym.Component colour={sym.colour} />
          </svg>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: COLOURS.text }}>
              {item.displayName || item.name || sym.label}
            </div>
            <div style={{ fontSize: 10, color: COLOURS.text_dim }}>
              {item.type} {'\u00B7'} {tests.length} tests {'\u00B7'} Levels: {levels.join(', ') || 'None'}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: '1px solid #334155', borderRadius: 4,
            color: '#64748b', padding: '3px 8px', cursor: 'pointer', fontSize: 11,
          }}
        >{'\u2715'}</button>
      </div>

      {/* Level badges */}
      {levels.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {levels.map(l => (
            <span key={l} style={{
              fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
              background: `${LEVEL_COLOURS[l] || '#475569'}30`, color: LEVEL_COLOURS[l] || '#e2e8f0',
              border: `1px solid ${LEVEL_COLOURS[l] || '#475569'}50`,
              fontFamily: 'SF Mono, Consolas, monospace',
            }}>{l}</span>
          ))}
        </div>
      )}

      {/* Test list */}
      {tests.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 3,
          maxHeight: 200, overflowY: 'auto',
        }}>
          {tests.map((t, i) => {
            const level = t[0] || ''
            const name = t[1] || ''
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 8px', borderRadius: 4,
                fontSize: 10, color: '#cbd5e1',
                background: i % 2 === 0 ? 'transparent' : '#1e293b40',
              }}>
                {level && (
                  <span style={{
                    fontSize: 8, fontWeight: 700, padding: '1px 4px', borderRadius: 3,
                    background: `${LEVEL_COLOURS[level] || '#475569'}40`,
                    color: LEVEL_COLOURS[level] || '#e2e8f0',
                    fontFamily: 'SF Mono, Consolas, monospace', flexShrink: 0,
                  }}>{level}</span>
                )}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ fontSize: 10, color: COLOURS.text_dim, fontStyle: 'italic' }}>No tests defined for this equipment type</div>
      )}
    </div>
  )
}

// LEGEND
function Legend() {
  const symbols = [
    { label: 'Circuit Breaker', Component: SymbolCB, colour: '#ef5350' },
    { label: 'Current Transformer', Component: SymbolCT, colour: '#26c6da' },
    { label: 'Voltage Transformer', Component: SymbolVT, colour: '#7c4dff' },
    { label: 'Earth Switch / Disc.', Component: SymbolES, colour: '#66bb6a' },
    { label: 'Surge Arrester', Component: SymbolSA, colour: '#ffa726' },
    { label: 'Transformer', Component: SymbolTransformer, colour: '#ff7043' },
    { label: 'NER (Earthing Resistor)', Component: SymbolNER, colour: '#ab47bc' },
    { label: 'Cable', Component: SymbolCable, colour: '#90a4ae' },
    { label: 'Relay / Protection', Component: SymbolRelay, colour: '#9fa8da' },
  ]

  return (
    <div style={{
      marginTop: 14, padding: 12,
      background: COLOURS.panel_bg,
      border: `1px solid ${COLOURS.border}`, borderRadius: 8,
    }}>
      <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: COLOURS.text_dim, marginBottom: 8 }}>
        IEC Symbol Legend
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 4 }}>
        {symbols.map(({ label, Component, colour }, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, color: '#94a3b8' }}>
            <svg width="20" height="20" viewBox="0 0 40 40">
              <Component colour={colour} />
            </svg>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
