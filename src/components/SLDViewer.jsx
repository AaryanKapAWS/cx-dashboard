import { useState, useMemo } from 'react'
import testTemplates from '../data/test_templates.json'

// ============================================================
// SLDViewer v6 — Dual-View SLD Component
// Flow View (Option A) + Drawing View (Option C)
// ============================================================

// --- Constants ---
const LEVEL_COLORS = {
  L1: '#7c3aed', L2: '#d97706', L3: '#059669', L4: '#2563eb', L5: '#db2777'
}

const LEVEL_NAMES = {
  L1: 'FWT', L2: 'IVF', L3: 'SAT', L4: 'FPT', L5: 'SEZ'
}

const SECTION_COLORS = {
  transformer_bay: '#f59e0b', line_bay: '#3b82f6', bus_section: '#6366f1',
  switchgear: '#22c55e', hv_switchgear_gis: '#22c55e', protection: '#a855f7',
  cables: '#64748b', battery_dc: '#f97316', earthing: '#14b8a6',
  substation: '#6b7280', aux_transformer: '#f97316', panel_board: '#8b5cf6'
}

const EQUIPMENT_ORDER = [
  'SURGE_ARRESTER', 'SA_GIS', 'EARTH_SWITCH', 'DS_ES_GIS', 'ES_GIS',
  'CT_HV', 'CT', 'CT_GIS', 'CT_METER', 'NCT', 'RING_CT_GIS',
  'VT_HV', 'VT', 'VT_GIS', 'CIRCUIT_BREAKER', 'CB_GIS', 'BUSBAR', 'GIS_BAY',
  'TRANSFORMER', 'DRY_TRANSFORMER', 'NER_CT', 'NER',
  'MK_OLTC_PANEL', 'PROTECTION_PANEL', 'RELAY',
  'HV_CABLE', 'MV_CABLE', 'HV_CABLE_GIS', 'ENERGIZATION', 'ENERGIZATION_GIS'
]

const SWITCHGEAR_TYPES = ['switchgear', 'hv_switchgear_gis', 'panel_board']
const AUX_TYPES = ['battery_dc', 'earthing', 'substation', 'protection']

// --- Helper Functions ---
function getTestsForType(type) {
  return testTemplates[type] || []
}

function getTestLevels(type) {
  const tests = getTestsForType(type)
  const levels = [...new Set(tests.map(t => t[0]))]
  levels.sort((a, b) => {
    const numA = parseInt(a.replace('L', ''))
    const numB = parseInt(b.replace('L', ''))
    return numA - numB
  })
  return levels
}

function getEquipmentOrder(type) {
  const idx = EQUIPMENT_ORDER.indexOf(type)
  return idx === -1 ? 999 : idx
}

function getShortName(type) {
  const map = {
    SURGE_ARRESTER: 'SA', SA_GIS: 'SA', EARTH_SWITCH: 'ES',
    DS_ES_GIS: 'ES', ES_GIS: 'ES', CT_HV: 'CT', CT: 'CT',
    CT_GIS: 'CT', CT_METER: 'CT', NCT: 'NCT', RING_CT_GIS: 'CT',
    VT_HV: 'VT', VT: 'VT', VT_GIS: 'VT',
    CIRCUIT_BREAKER: 'CB', CB_GIS: 'CB', BUSBAR: 'Bus',
    GIS_BAY: 'GIS', TRANSFORMER: 'Tx', DRY_TRANSFORMER: 'Tx',
    NER_CT: 'NER CT', NER: 'NER', MK_OLTC_PANEL: 'OLTC',
    PROTECTION_PANEL: 'Prot', RELAY: 'Relay',
    HV_CABLE: 'Cable', MV_CABLE: 'Cable', HV_CABLE_GIS: 'Cable',
    ENERGIZATION: 'Enrg', ENERGIZATION_GIS: 'Enrg'
  }
  return map[type] || type
}

// --- IEC Symbol SVGs ---
function IECSymbol({ type, color = '#22c55e', size = 28 }) {
  const vb = '0 0 40 40'
  const sw = 2
  const props = { xmlns: 'http://www.w3.org/2000/svg', viewBox: vb, width: size, height: size, fill: 'none', stroke: color, strokeWidth: sw, strokeLinecap: 'round', strokeLinejoin: 'round' }

  switch (type) {
    case 'SURGE_ARRESTER':
    case 'SA_GIS':
      return (<svg {...props}><polyline points="15,8 25,12 15,16 25,20 15,24 25,28 15,32" /><line x1="20" y1="4" x2="20" y2="8" /><line x1="12" y1="34" x2="28" y2="34" /></svg>)
    case 'EARTH_SWITCH':
    case 'DS_ES_GIS':
    case 'ES_GIS':
      return (<svg {...props}><line x1="8" y1="20" x2="16" y2="20" /><line x1="24" y1="20" x2="32" y2="20" /><line x1="16" y1="20" x2="24" y2="10" /><circle cx="16" cy="20" r="2" fill={color} /></svg>)
    case 'CT_HV':
    case 'CT':
    case 'CT_GIS':
    case 'CT_METER':
    case 'NCT':
    case 'RING_CT_GIS':
      return (<svg {...props}><circle cx="20" cy="20" r="10" /><circle cx="20" cy="20" r="3" fill={color} stroke="none" /><line x1="6" y1="20" x2="10" y2="20" /><line x1="30" y1="20" x2="34" y2="20" /></svg>)
    case 'VT_HV':
    case 'VT':
    case 'VT_GIS':
      return (<svg {...props}><circle cx="20" cy="15" r="8" /><circle cx="20" cy="26" r="7" /></svg>)
    case 'CIRCUIT_BREAKER':
    case 'CB_GIS':
      return (<svg {...props}><rect x="12" y="12" width="16" height="16" rx="1" /><line x1="12" y1="12" x2="28" y2="28" /><line x1="28" y1="12" x2="12" y2="28" /><line x1="20" y1="4" x2="20" y2="12" /><line x1="20" y1="28" x2="20" y2="36" /></svg>)
    case 'BUSBAR':
    case 'GIS_BAY':
      return (<svg {...props}><line x1="4" y1="20" x2="36" y2="20" strokeWidth="4" /><line x1="4" y1="16" x2="4" y2="24" /><line x1="36" y1="16" x2="36" y2="24" /></svg>)
    case 'TRANSFORMER':
    case 'DRY_TRANSFORMER':
      return (<svg {...props}><circle cx="15" cy="20" r="9" /><circle cx="25" cy="20" r="9" /></svg>)
    case 'NER_CT':
      return (<svg {...props}><circle cx="20" cy="20" r="10" /><circle cx="20" cy="20" r="3" fill={color} stroke="none" /><line x1="20" y1="4" x2="20" y2="10" /><line x1="20" y1="30" x2="20" y2="36" /></svg>)
    case 'NER':
      return (<svg {...props}><polyline points="15,8 25,11 15,14 25,17 15,20 25,23 15,26" /><line x1="20" y1="4" x2="20" y2="8" /><line x1="20" y1="26" x2="20" y2="30" /><line x1="13" y1="32" x2="27" y2="32" strokeWidth="2.5" /><line x1="15" y1="35" x2="25" y2="35" strokeWidth="1.5" /><line x1="17" y1="38" x2="23" y2="38" strokeWidth="1" /></svg>)
    case 'MK_OLTC_PANEL':
      return (<svg {...props}><rect x="10" y="6" width="20" height="28" rx="2" /><line x1="14" y1="14" x2="26" y2="14" /><line x1="14" y1="20" x2="26" y2="20" /><circle cx="20" cy="28" r="2.5" /></svg>)
    case 'PROTECTION_PANEL':
    case 'RELAY':
      return (<svg {...props}><rect x="9" y="5" width="22" height="30" rx="2" /><circle cx="20" cy="15" r="4" /><line x1="13" y1="24" x2="27" y2="24" /><line x1="13" y1="29" x2="27" y2="29" /></svg>)
    case 'HV_CABLE':
    case 'MV_CABLE':
    case 'HV_CABLE_GIS':
      return (<svg {...props}><line x1="6" y1="20" x2="34" y2="20" strokeDasharray="4 3" /><rect x="6" y="14" width="8" height="12" rx="2" /><rect x="26" y="14" width="8" height="12" rx="2" /></svg>)
    case 'ENERGIZATION':
    case 'ENERGIZATION_GIS':
      return (<svg {...props}><circle cx="20" cy="20" r="12" strokeDasharray="4 3" /><polygon points="22,8 14,22 20,22 18,32 26,18 20,18" fill={color} stroke="none" /></svg>)
    default:
      return (<svg {...props}><circle cx="20" cy="20" r="12" /><text x="20" y="24" textAnchor="middle" fontSize="9" fill={color} stroke="none" fontFamily="monospace">{getShortName(type).slice(0, 3)}</text></svg>)
  }
}

// --- Drawing View IEC Symbol (black, vertical orientation) ---
function DrawingSymbol({ type, x, y }) {
  const color = '#000'
  const sw = 1.5

  switch (type) {
    case 'SURGE_ARRESTER':
    case 'SA_GIS':
      return (<g>
        <polyline points={`${x-5},${y-12} ${x+5},${y-8} ${x-5},${y-4} ${x+5},${y} ${x-5},${y+4} ${x+5},${y+8}`} fill="none" stroke={color} strokeWidth={sw} />
        <line x1={x} y1={y-16} x2={x} y2={y-12} stroke={color} strokeWidth={sw} />
        <line x1={x-8} y1={y+10} x2={x+8} y2={y+10} stroke={color} strokeWidth={2} />
      </g>)
    case 'EARTH_SWITCH':
    case 'DS_ES_GIS':
    case 'ES_GIS':
      return (<g>
        <line x1={x-5} y1={y-8} x2={x+5} y2={y-8} stroke={color} strokeWidth={2} />
        <line x1={x} y1={y-8} x2={x-6} y2={y+8} stroke={color} strokeWidth={2} />
        <line x1={x-5} y1={y+8} x2={x+5} y2={y+8} stroke={color} strokeWidth={2} />
      </g>)
    case 'CT_HV':
    case 'CT':
    case 'CT_GIS':
    case 'CT_METER':
    case 'NCT':
    case 'RING_CT_GIS':
    case 'NER_CT':
      return (<g>
        <circle cx={x} cy={y} r="10" fill="#fff" stroke={color} strokeWidth={sw} />
        <circle cx={x} cy={y} r="2" fill={color} />
      </g>)
    case 'VT_HV':
    case 'VT':
    case 'VT_GIS':
      return (<g>
        <circle cx={x} cy={y-4} r="8" fill="#fff" stroke={color} strokeWidth={sw} />
        <circle cx={x} cy={y-4} r="2" fill={color} />
        <line x1={x} y1={y+4} x2={x} y2={y+10} stroke={color} strokeWidth={sw} />
        <line x1={x-6} y1={y+10} x2={x+6} y2={y+10} stroke={color} strokeWidth={sw} />
        <line x1={x-4} y1={y+13} x2={x+4} y2={y+13} stroke={color} strokeWidth={1} />
      </g>)
    case 'CIRCUIT_BREAKER':
    case 'CB_GIS':
      return (<g>
        <rect x={x-12} y={y-12} width="24" height="24" fill="#fff" stroke={color} strokeWidth={2} />
        <line x1={x-12} y1={y-12} x2={x+12} y2={y+12} stroke={color} strokeWidth={sw} />
        <line x1={x+12} y1={y-12} x2={x-12} y2={y+12} stroke={color} strokeWidth={sw} />
      </g>)
    case 'TRANSFORMER':
    case 'DRY_TRANSFORMER':
      return (<g>
        <circle cx={x} cy={y-12} r="18" fill="#fff" stroke={color} strokeWidth={2} />
        <circle cx={x} cy={y+18} r="18" fill="#fff" stroke={color} strokeWidth={2} />
        <circle cx={x} cy={y-20} r="2.5" fill={color} />
        <circle cx={x} cy={y+26} r="2.5" fill={color} />
      </g>)
    case 'NER':
      return (<g>
        <polyline points={`${x-5},${y-12} ${x+5},${y-8} ${x-5},${y-4} ${x+5},${y} ${x-5},${y+4} ${x+5},${y+8} ${x-5},${y+12}`} fill="none" stroke={color} strokeWidth={sw} />
        <line x1={x} y1={y+12} x2={x} y2={y+18} stroke={color} strokeWidth={sw} />
        <line x1={x-8} y1={y+18} x2={x+8} y2={y+18} stroke={color} strokeWidth={2} />
        <line x1={x-5} y1={y+21} x2={x+5} y2={y+21} stroke={color} strokeWidth={1.5} />
        <line x1={x-3} y1={y+24} x2={x+3} y2={y+24} stroke={color} strokeWidth={1} />
      </g>)
    case 'MK_OLTC_PANEL':
    case 'PROTECTION_PANEL':
    case 'RELAY':
      return (<g>
        <rect x={x-10} y={y-12} width="20" height="24" rx="2" fill="#fff" stroke={color} strokeWidth={sw} />
        <text x={x} y={y+2} textAnchor="middle" fontSize="10" fontFamily="Consolas, monospace" fill={color}>R</text>
      </g>)
    case 'HV_CABLE':
    case 'MV_CABLE':
    case 'HV_CABLE_GIS':
      return (<g>
        <line x1={x} y1={y-12} x2={x} y2={y+12} stroke={color} strokeWidth={sw} strokeDasharray="4 3" />
        <rect x={x-6} y={y-14} width="12" height="6" rx="1" fill="#fff" stroke={color} strokeWidth={sw} />
        <rect x={x-6} y={y+8} width="12" height="6" rx="1" fill="#fff" stroke={color} strokeWidth={sw} />
      </g>)
    case 'ENERGIZATION':
    case 'ENERGIZATION_GIS':
      return (<g>
        <circle cx={x} cy={y} r="12" fill="none" stroke={color} strokeWidth={sw} strokeDasharray="4 3" />
        <polygon points={`${x+2},${y-8} ${x-4},${y+2} ${x},${y+2} ${x-2},${y+8} ${x+4},${y-2} ${x},${y-2}`} fill={color} />
      </g>)
    case 'BUSBAR':
    case 'GIS_BAY':
      return (<g>
        <line x1={x-10} y1={y} x2={x+10} y2={y} stroke={color} strokeWidth={4} />
      </g>)
    default:
      return (<g>
        <circle cx={x} cy={y} r="10" fill="#fff" stroke={color} strokeWidth={sw} />
        <text x={x} y={y+3} textAnchor="middle" fontSize="8" fontFamily="Consolas, monospace" fill={color}>{getShortName(type).slice(0, 3)}</text>
      </g>)
  }
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function SLDViewer({ equipment }) {
  const [viewMode, setViewMode] = useState('flow') // 'flow' or 'drawing'
  const [selectedEquipment, setSelectedEquipment] = useState(null)

  // --- Parse topology ---
  const topology = useMemo(() => {
    if (!equipment || equipment.length === 0) return { hvSections: [], swSections: [], auxSections: [] }

    const sectionMap = {}

    equipment.forEach(item => {
      const parts = (item.feeder_ref || '').split(' \u2014 ')
      const sectionName = parts[0] || item.section || 'Unknown'
      const feederName = parts[1] || 'Overall'

      if (!sectionMap[sectionName]) {
        sectionMap[sectionName] = {
          name: sectionName,
          sectionType: item.section || 'unknown',
          color: SECTION_COLORS[item.section] || '#6b7280',
          feeders: {}
        }
      }
      if (!sectionMap[sectionName].feeders[feederName]) {
        sectionMap[sectionName].feeders[feederName] = []
      }
      sectionMap[sectionName].feeders[feederName].push(item)
    })

    // Sort items within each feeder by equipment order
    Object.values(sectionMap).forEach(section => {
      Object.keys(section.feeders).forEach(feeder => {
        section.feeders[feeder].sort((a, b) => getEquipmentOrder(a.type) - getEquipmentOrder(b.type))
      })
    })

    const hvSections = []
    const swSections = []
    const auxSections = []

    Object.values(sectionMap).forEach(section => {
      if (SWITCHGEAR_TYPES.includes(section.sectionType)) {
        swSections.push(section)
      } else if (AUX_TYPES.includes(section.sectionType)) {
        auxSections.push(section)
      } else {
        hvSections.push(section)
      }
    })

    return { hvSections, swSections, auxSections }
  }, [equipment])

  // --- Empty state ---
  if (!equipment || equipment.length === 0) {
    return (
      <div style={{ background: '#0a0f1a', color: '#64748b', minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', border: '1px solid #1e293b', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12" y2="16"/></svg>
          <p style={{ marginTop: '12px', fontSize: '14px' }}>No equipment data available</p>
          <p style={{ fontSize: '12px', marginTop: '4px', color: '#475569' }}>Add equipment to see the SLD diagram</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", width: '100%' }}>
      {/* Toggle Switch */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 0', background: viewMode === 'flow' ? '#0a0f1a' : '#e8e8e8', borderBottom: viewMode === 'flow' ? '1px solid #1e293b' : '1px solid #d1d5db' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0', background: viewMode === 'flow' ? '#1e293b' : '#fff', borderRadius: '8px', padding: '3px', border: viewMode === 'flow' ? '1px solid #334155' : '1px solid #d1d5db' }}>
          <button
            onClick={() => setViewMode('flow')}
            style={{ padding: '6px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, transition: 'all 0.2s', background: viewMode === 'flow' ? 'linear-gradient(135deg, #3b82f6, #6366f1)' : 'transparent', color: viewMode === 'flow' ? '#fff' : '#64748b' }}
          >
            Flow View
          </button>
          <button
            onClick={() => setViewMode('drawing')}
            style={{ padding: '6px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, transition: 'all 0.2s', background: viewMode === 'drawing' ? '#000' : 'transparent', color: viewMode === 'drawing' ? '#fff' : '#64748b' }}
          >
            Drawing View (Beta)
          </button>
        </div>
      </div>

      {/* View Container */}
      {viewMode === 'flow' ? (
        <FlowView topology={topology} onSelect={setSelectedEquipment} selectedId={selectedEquipment?.id} />
      ) : (
        <DrawingView topology={topology} onSelect={setSelectedEquipment} selectedId={selectedEquipment?.id} />
      )}

      {/* Detail Panel */}
      {selectedEquipment && (
        <DetailPanel item={selectedEquipment} onClose={() => setSelectedEquipment(null)} darkMode={viewMode === 'flow'} />
      )}
    </div>
  )
}

// ============================================================
// FLOW VIEW (Option A)
// ============================================================
function FlowView({ topology, onSelect, selectedId }) {
  const { hvSections, swSections, auxSections } = topology

  return (
    <div style={{ background: '#0a0f1a', minHeight: 'calc(100vh - 120px)', padding: '0' }}>
      <div style={{ background: '#111827', margin: '24px', borderRadius: '12px', border: '1px solid #1e293b', padding: '32px' }}>
        {/* HV Primary Sections */}
        {hvSections.map((section, idx) => (
          <FlowSection key={`hv-${idx}`} section={section} onSelect={onSelect} selectedId={selectedId} />
        ))}

        {/* Switchgear Sections */}
        {swSections.map((section, idx) => (
          <SwitchgearSection key={`sw-${idx}`} section={section} onSelect={onSelect} selectedId={selectedId} />
        ))}

        {/* Auxiliary Sections */}
        {auxSections.length > 0 && (
          <div style={{ marginBottom: '48px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', paddingBottom: '12px', borderBottom: '1px solid #1e293b' }}>
              <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #14b8a620, #14b8a610)', border: '1px solid #14b8a640', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2"><rect x="3" y="6" width="18" height="12" rx="2"/><line x1="7" y1="10" x2="7" y2="14"/><line x1="17" y1="10" x2="17" y2="14"/></svg>
              </div>
              <span style={{ fontSize: '16px', fontWeight: 600, color: '#f1f5f9' }}>Auxiliary Systems</span>
            </div>
            {auxSections.map((section, idx) => (
              <AuxSection key={`aux-${idx}`} section={section} onSelect={onSelect} selectedId={selectedId} />
            ))}
          </div>
        )}

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '32px', paddingTop: '20px', borderTop: '1px solid #1e293b', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Legend:</span>
          {Object.entries(LEVEL_COLORS).map(([level, color]) => (
            <div key={level} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#94a3b8' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: color }} />
              {level} {LEVEL_NAMES[level]}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// --- Flow Section (HV Primary) ---
function FlowSection({ section, onSelect, selectedId }) {
  const allItems = Object.values(section.feeders).flat()
  const totalTests = allItems.reduce((sum, item) => sum + getTestsForType(item.type).length, 0)

  return (
    <div style={{ marginBottom: '48px' }}>
      {/* Section Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', paddingBottom: '12px', borderBottom: '1px solid #1e293b', flexWrap: 'wrap' }}>
        <div style={{ width: '32px', height: '32px', background: `linear-gradient(135deg, ${section.color}20, ${section.color}10)`, border: `1px solid ${section.color}40`, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={section.color} strokeWidth="2"><circle cx="8" cy="12" r="4"/><circle cx="16" cy="12" r="4"/></svg>
        </div>
        <span style={{ fontSize: '16px', fontWeight: 600, color: '#f1f5f9' }}>{section.name}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '16px' }}>
          <div style={{ width: '120px', height: '6px', background: '#1e293b', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: '3px', background: 'linear-gradient(90deg, #22c55e, #16a34a)', width: '50%' }} />
          </div>
          <span style={{ fontSize: '11px', color: '#64748b' }}>{allItems.length} items</span>
        </div>
        <span style={{ fontSize: '12px', color: '#64748b', marginLeft: 'auto' }}>{totalTests} tests total</span>
      </div>

      {/* Horizontal Power Flow */}
      <div style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '20px 0', overflowX: 'auto' }}>
        {allItems.map((item, idx) => (
          <FlowNodeWithConnector key={item.id || idx} item={item} isLast={idx === allItems.length - 1} onSelect={onSelect} isSelected={selectedId === item.id} sectionColor={section.color} />
        ))}
      </div>
    </div>
  )
}

// --- Flow Node + Connector ---
function FlowNodeWithConnector({ item, isLast, onSelect, isSelected, sectionColor }) {
  const levels = getTestLevels(item.type)
  const testCount = getTestsForType(item.type).length

  return (
    <>
      <div
        onClick={() => onSelect(item)}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '90px', flex: 1, cursor: 'pointer', position: 'relative' }}
      >
        <div style={{
          width: '56px', height: '56px', background: '#1e293b',
          border: `1.5px solid ${isSelected ? '#f59e0b' : sectionColor + '60'}`,
          borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: isSelected ? `0 0 12px ${sectionColor}40` : 'none',
          transition: 'all 0.2s'
        }}>
          <IECSymbol type={item.type} color={sectionColor} size={28} />
        </div>
        <span style={{ fontSize: '10px', fontWeight: 500, color: '#cbd5e1', marginTop: '8px', textAlign: 'center', whiteSpace: 'nowrap', maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.displayName || item.name || getShortName(item.type)}
        </span>
        <div style={{ display: 'flex', gap: '2px', marginTop: '5px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {levels.map(level => (
            <span key={level} style={{ fontSize: '8px', fontWeight: 700, padding: '2px 5px', borderRadius: '4px', letterSpacing: '0.3px', background: LEVEL_COLORS[level] + '30', color: LEVEL_COLORS[level], border: `1px solid ${LEVEL_COLORS[level]}50` }}>
              {level}
            </span>
          ))}
        </div>
        <span style={{ fontSize: '9px', color: '#64748b', marginTop: '4px' }}>
          <span style={{ color: '#94a3b8', fontWeight: 600 }}>{testCount}</span> tests
        </span>
      </div>
      {!isLast && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '32px', flex: 0.3 }}>
          <div style={{ height: '2px', width: '100%', background: `linear-gradient(90deg, ${sectionColor}40, ${sectionColor}80, ${sectionColor}40)`, position: 'relative' }}>
            <div style={{ position: 'absolute', right: '-1px', top: '-4px', width: 0, height: 0, borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderLeft: `7px solid ${sectionColor}80` }} />
          </div>
        </div>
      )}
    </>
  )
}

// --- Switchgear Section ---
function SwitchgearSection({ section, onSelect, selectedId }) {
  const feederEntries = Object.entries(section.feeders)

  return (
    <div style={{ marginBottom: '48px' }}>
      {/* Section Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', paddingBottom: '12px', borderBottom: '1px solid #1e293b', flexWrap: 'wrap' }}>
        <div style={{ width: '32px', height: '32px', background: `linear-gradient(135deg, ${section.color}20, ${section.color}10)`, border: `1px solid ${section.color}40`, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={section.color} strokeWidth="2"><rect x="3" y="6" width="18" height="12" rx="2"/><line x1="9" y1="6" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="18"/></svg>
        </div>
        <span style={{ fontSize: '16px', fontWeight: 600, color: '#f1f5f9' }}>{section.name}</span>
        <span style={{ fontSize: '12px', color: '#64748b', marginLeft: 'auto' }}>{feederEntries.length} Feeders</span>
      </div>

      {/* Feeder Rows */}
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        {feederEntries.map(([feederName, items], idx) => (
          <div key={feederName} style={{ flex: '1 1 300px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '20px', minWidth: '280px' }}>
            {/* Feeder Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: section.color, boxShadow: `0 0 6px ${section.color}60` }} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0' }}>{feederName}</span>
            </div>
            {/* Feeder Flow — BUG FIX #5: added flexWrap: 'wrap' */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap' }}>
              {items.map((item, i) => (
                <FeederNodeWithConnector key={item.id || i} item={item} isLast={i === items.length - 1} onSelect={onSelect} isSelected={selectedId === item.id} color={section.color} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// --- Feeder Node + Connector ---
function FeederNodeWithConnector({ item, isLast, onSelect, isSelected, color }) {
  const levels = getTestLevels(item.type)
  const testCount = getTestsForType(item.type).length

  return (
    <>
      <div onClick={() => onSelect(item)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, cursor: 'pointer' }}>
        <div style={{ width: '42px', height: '42px', background: '#1e293b', border: `1px solid ${isSelected ? '#f59e0b' : '#334155'}`, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
          <IECSymbol type={item.type} color={color} size={22} />
        </div>
        <span style={{ fontSize: '9px', color: '#94a3b8', marginTop: '5px', textAlign: 'center' }}>
          {item.displayName || item.name || getShortName(item.type)}
        </span>
        <div style={{ display: 'flex', gap: '2px', marginTop: '3px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {levels.map(level => (
            <span key={level} style={{ fontSize: '7px', fontWeight: 700, padding: '1px 4px', borderRadius: '3px', background: LEVEL_COLORS[level] + '30', color: LEVEL_COLORS[level], border: `1px solid ${LEVEL_COLORS[level]}50` }}>
              {level}
            </span>
          ))}
        </div>
        <span style={{ fontSize: '8px', color: '#64748b', marginTop: '2px' }}>
          <span style={{ color: '#94a3b8', fontWeight: 600 }}>{testCount}</span>t
        </span>
      </div>
      {!isLast && (
        <div style={{ minWidth: '24px', flex: 0.4, display: 'flex', alignItems: 'center' }}>
          <div style={{ height: '1.5px', width: '100%', background: `linear-gradient(90deg, #334155, #475569, #334155)` }} />
        </div>
      )}
    </>
  )
}

// --- Aux Section ---
function AuxSection({ section, onSelect, selectedId }) {
  const allItems = Object.values(section.feeders).flat()

  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '16px', marginBottom: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: section.color }} />
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0' }}>{section.name}</span>
        <span style={{ fontSize: '10px', color: '#64748b', marginLeft: 'auto' }}>{allItems.length} items</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0', flexWrap: 'wrap' }}>
        {allItems.map((item, idx) => (
          <FeederNodeWithConnector key={item.id || idx} item={item} isLast={idx === allItems.length - 1} onSelect={onSelect} isSelected={selectedId === item.id} color={section.color} />
        ))}
      </div>
    </div>
  )
}

// ============================================================
// DRAWING VIEW (Option C)
// ============================================================
function DrawingView({ topology, onSelect, selectedId }) {
  const { hvSections, swSections, auxSections } = topology

  if (hvSections.length === 0 && swSections.length === 0) {
    return <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>Add equipment to see the Drawing View</div>
  }

  // BUG FIX #7: allBays is ONLY hvSections (switchgear gets its own zone)
  const allBays = hvSections

  const bayCount = Math.max(allBays.length, 1)
  const svgWidth = 1360

  // BUG FIX #1 & #6: Calculate maxItemsInBay correctly using feeders object
  const maxItemsInBay = Math.max(...allBays.map(b => Object.values(b.feeders).flat().length), 1)

  // BUG FIX #6: SVG height accounts for bay content + switchgear zone + aux zone + legend
  const bayContentHeight = maxItemsInBay * 48
  const switchgearZoneHeight = swSections.length > 0 ? 100 : 0
  const auxZoneHeight = auxSections.length > 0 ? 80 : 0
  const legendAndTitleHeight = 150
  const calculatedHeight = 120 + bayContentHeight + switchgearZoneHeight + auxZoneHeight + legendAndTitleHeight
  const svgHeight = Math.max(1100, calculatedHeight)

  const baySpacing = Math.min(350, (svgWidth - 200) / bayCount)

  // BUG FIX #3: Calculate content bottom for legend positioning
  const bayBottomY = 120 + maxItemsInBay * 65 + 50 // startY + items + ground symbol
  const swZoneY = bayBottomY + 40
  const swZoneBottomY = swSections.length > 0 ? swZoneY + 90 : bayBottomY
  const auxZoneY = swZoneBottomY + 30
  const auxZoneBottomY = auxSections.length > 0 ? auxZoneY + 60 : swZoneBottomY
  const legendY = auxZoneBottomY + 40

  return (
    <div style={{ background: '#e8e8e8', padding: '30px', minHeight: 'calc(100vh - 120px)', display: 'flex', justifyContent: 'center' }}>
      <div style={{ background: '#ffffff', width: '100%', maxWidth: '1400px', position: 'relative', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', minHeight: '700px' }}>
        {/* Grid background */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)', backgroundSize: '20px 20px', pointerEvents: 'none' }} />

        {/* Drawing border */}
        <div style={{ position: 'absolute', top: '12px', left: '12px', right: '12px', bottom: '12px', border: '1.5px solid #000' }}>
          <div style={{ position: 'absolute', top: '4px', left: '4px', right: '4px', bottom: '4px', border: '0.5px solid #000' }} />
        </div>

        {/* Drawing reference */}
        <div style={{ position: 'absolute', top: '24px', left: '28px', fontSize: '9px', color: '#999', fontFamily: "Consolas, 'Courier New', monospace", letterSpacing: '0.5px' }}>
          ZONE: A1 &nbsp;&nbsp; SHEET 1 OF 1
        </div>

        {/* SVG Canvas */}
        <div style={{ position: 'absolute', top: '20px', left: '20px', right: '20px', bottom: '20px' }}>
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: '100%' }} xmlns="http://www.w3.org/2000/svg">
            {/* HV Busbar */}
            <line x1="100" y1="100" x2={100 + bayCount * baySpacing} y2="100" stroke="#000" strokeWidth="4" strokeLinecap="square" />
            <text x={(100 + bayCount * baySpacing) / 2 + 50} y="80" style={{ fontFamily: "Consolas, monospace", fontSize: '12px', fontWeight: 'bold', textAnchor: 'middle' }} fill="#000">BUSBAR</text>

            {/* Bay Columns — ONLY hvSections */}
            {allBays.map((section, bayIdx) => {
              const bayX = 200 + bayIdx * baySpacing
              const items = Object.values(section.feeders).flat()
              return (
                <BayColumn key={`bay-${bayIdx}`} x={bayX} section={section} items={items} onSelect={onSelect} selectedId={selectedId} />
              )
            })}

            {/* BUG FIX #2: Switchgear rendered as separate MV zone below HV bays */}
            {swSections.length > 0 && (
              <g>
                {/* MV Busbar label */}
                <text x="100" y={swZoneY - 10} style={{ fontFamily: "Consolas, monospace", fontSize: '11px', fontWeight: 'bold' }} fill="#16a34a">MV SWITCHGEAR</text>
                {/* Green MV busbar line */}
                <line x1="100" y1={swZoneY} x2={svgWidth - 400} y2={swZoneY} stroke="#22c55e" strokeWidth="3" strokeLinecap="square" />

                {/* Feeder boxes underneath */}
                {swSections.map((section, sIdx) => {
                  const feederEntries = Object.entries(section.feeders)
                  let feederOffset = 0
                  return feederEntries.map(([feederName, items], fIdx) => {
                    const fX = 150 + (sIdx * feederEntries.length + fIdx) * 160 + feederOffset
                    feederOffset += 0
                    const boxY = swZoneY + 10
                    return (
                      <g key={`sw-${sIdx}-${fIdx}`}>
                        {/* Vertical drop from MV busbar */}
                        <line x1={fX + 40} y1={swZoneY} x2={fX + 40} y2={boxY} stroke="#22c55e" strokeWidth="1.5" />
                        {/* Feeder box */}
                        <rect x={fX} y={boxY} width="120" height="65" rx="3" fill="#f0fdf4" stroke="#22c55e" strokeWidth="1.5" />
                        {/* Feeder name */}
                        <text x={fX + 60} y={boxY + 14} style={{ fontFamily: "Consolas, monospace", fontSize: '9px', fontWeight: 'bold', textAnchor: 'middle' }} fill="#166534">
                          {feederName.length > 16 ? feederName.slice(0, 16) + '\u2026' : feederName}
                        </text>
                        {/* Equipment items inside the feeder box */}
                        {items.map((item, iIdx) => {
                          const itemX = fX + 8 + (iIdx % 4) * 28
                          const itemY = boxY + 24 + Math.floor(iIdx / 4) * 22
                          const levels = getTestLevels(item.type)
                          return (
                            <g key={item.id || `swi-${iIdx}`} onClick={() => onSelect(item)} style={{ cursor: 'pointer' }}>
                              <rect x={itemX} y={itemY} width="24" height="18" rx="3" fill="#fff" stroke={selectedId === item.id ? '#f59e0b' : '#86efac'} strokeWidth={selectedId === item.id ? 1.5 : 0.75} />
                              <text x={itemX + 12} y={itemY + 11} style={{ fontFamily: "Consolas, monospace", fontSize: '7px', textAnchor: 'middle', dominantBaseline: 'middle' }} fill="#166534">
                                {getShortName(item.type)}
                              </text>
                            </g>
                          )
                        })}
                      </g>
                    )
                  })
                })}
              </g>
            )}

            {/* Aux items (below switchgear zone if present) */}
            {auxSections.length > 0 && (
              <g>
                <text x="100" y={auxZoneY - 10} style={{ fontFamily: "Consolas, monospace", fontSize: '11px', fontWeight: 'bold' }} fill="#000">AUXILIARY SYSTEMS</text>
                <line x1="100" y1={auxZoneY} x2={svgWidth - 400} y2={auxZoneY} stroke="#000" strokeWidth="0.5" />
                {auxSections.map((section, idx) => {
                  const auxItems = Object.values(section.feeders).flat()
                  return auxItems.map((item, itemIdx) => {
                    const auxX = 150 + (idx * 4 + itemIdx) * 100
                    const auxY = auxZoneY + 30
                    const levels = getTestLevels(item.type)
                    const testCount = getTestsForType(item.type).length
                    return (
                      <g key={`aux-${idx}-${itemIdx}`} onClick={() => onSelect(item)} style={{ cursor: 'pointer' }}>
                        <DrawingSymbol type={item.type} x={auxX} y={auxY} />
                        <text x={auxX + 18} y={auxY - 4} style={{ fontFamily: "Consolas, monospace", fontSize: '9px' }} fill="#000">
                          {item.displayName || item.name || getShortName(item.type)}
                        </text>
                        {levels.map((level, li) => (
                          <g key={level}>
                            <rect x={auxX + 18 + li * 22} y={auxY + 4} width="18" height="10" rx="5" ry="5" fill={LEVEL_COLORS[level]} />
                            <text x={auxX + 27 + li * 22} y={auxY + 9} style={{ fontFamily: "Consolas, monospace", fontSize: '7px', fontWeight: 'bold', textAnchor: 'middle', dominantBaseline: 'middle' }} fill="#fff">{level}</text>
                          </g>
                        ))}
                        <text x={auxX + 18 + levels.length * 22 + 4} y={auxY + 11} style={{ fontFamily: "Consolas, monospace", fontSize: '8px' }} fill="#888">{testCount}t</text>
                      </g>
                    )
                  })
                })}
              </g>
            )}

            {/* BUG FIX #3: Legend positioned AFTER all content */}
            <g transform={`translate(50, ${legendY})`}>
              <text x="0" y="0" style={{ fontFamily: "Consolas, monospace", fontSize: '10px', fontWeight: 'bold' }} fill="#000">COMMISSIONING LEVELS:</text>
              {Object.entries(LEVEL_COLORS).map(([level, color], idx) => (
                <g key={level}>
                  <rect x={idx * 80} y="10" width="18" height="10" rx="5" ry="5" fill={color} />
                  <text x={idx * 80 + 9} y="15" style={{ fontFamily: "Consolas, monospace", fontSize: '7px', fontWeight: 'bold', textAnchor: 'middle', dominantBaseline: 'middle' }} fill="#fff">{level}</text>
                  <text x={idx * 80 + 24} y="17" style={{ fontFamily: "Consolas, monospace", fontSize: '8px', dominantBaseline: 'middle' }} fill="#444">{LEVEL_NAMES[level]}</text>
                </g>
              ))}
            </g>
          </svg>
        </div>

        {/* Title Block */}
        <div style={{ position: 'absolute', bottom: '16px', right: '16px', width: '340px', border: '1.5px solid #000', fontSize: '10px', lineHeight: 1.4, fontFamily: "Consolas, 'Courier New', monospace", background: '#fff' }}>
          <div style={{ background: '#000', color: '#fff', padding: '6px 8px', fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px' }}>
            SINGLE LINE DIAGRAM
          </div>
          <div style={{ display: 'flex', borderBottom: '0.5px solid #000' }}>
            <div style={{ flex: 1, padding: '4px 8px' }}>
              <div style={{ fontSize: '7px', textTransform: 'uppercase', color: '#666', letterSpacing: '0.5px' }}>Project</div>
              <div style={{ fontSize: '10px', fontWeight: 'bold' }}>HV SUBSTATION</div>
            </div>
          </div>
          <div style={{ display: 'flex', borderBottom: '0.5px solid #000' }}>
            <div style={{ flex: 1, padding: '4px 8px' }}>
              <div style={{ fontSize: '7px', textTransform: 'uppercase', color: '#666' }}>Title</div>
              <div style={{ fontSize: '10px', fontWeight: 'bold' }}>COMMISSIONING SLD</div>
            </div>
          </div>
          <div style={{ display: 'flex', borderBottom: '0.5px solid #000' }}>
            <div style={{ flex: 1, padding: '4px 8px', borderRight: '0.5px solid #000' }}>
              <div style={{ fontSize: '7px', textTransform: 'uppercase', color: '#666' }}>Drawing No.</div>
              <div style={{ fontSize: '10px', fontWeight: 'bold' }}>SLD-CX-001</div>
            </div>
            <div style={{ width: '80px', padding: '4px 8px' }}>
              <div style={{ fontSize: '7px', textTransform: 'uppercase', color: '#666' }}>Revision</div>
              <div style={{ fontSize: '10px', fontWeight: 'bold' }}>A</div>
            </div>
          </div>
          <div style={{ display: 'flex' }}>
            <div style={{ flex: 1, padding: '4px 8px', borderRight: '0.5px solid #000' }}>
              <div style={{ fontSize: '7px', textTransform: 'uppercase', color: '#666' }}>Date</div>
              <div style={{ fontSize: '10px', fontWeight: 'bold' }}>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}</div>
            </div>
            <div style={{ width: '80px', padding: '4px 8px', borderRight: '0.5px solid #000' }}>
              <div style={{ fontSize: '7px', textTransform: 'uppercase', color: '#666' }}>Scale</div>
              <div style={{ fontSize: '10px', fontWeight: 'bold' }}>NTS</div>
            </div>
            <div style={{ width: '80px', padding: '4px 8px' }}>
              <div style={{ fontSize: '7px', textTransform: 'uppercase', color: '#666' }}>Size</div>
              <div style={{ fontSize: '10px', fontWeight: 'bold' }}>A3</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Bay Column for Drawing View ---
function BayColumn({ x, section, items, onSelect, selectedId }) {
  const symbolSpacing = 65
  const startY = 120

  return (
    <g>
      {/* Bay label */}
      <text x={x} y="50" style={{ fontFamily: "Consolas, monospace", fontSize: '12px', fontWeight: 'bold', textAnchor: 'middle' }} fill="#000">
        {section.name.toUpperCase().slice(0, 20)}
      </text>
      <text x={x} y="65" style={{ fontFamily: "Consolas, monospace", fontSize: '9px', textAnchor: 'middle' }} fill="#666">
        {section.sectionType.replace(/_/g, ' ')}
      </text>

      {/* Vertical conductor from busbar */}
      <line x1={x} y1="100" x2={x} y2={startY} stroke="#000" strokeWidth="1.5" fill="none" />

      {/* Equipment along the conductor */}
      {items.map((item, idx) => {
        const itemY = startY + idx * symbolSpacing + 30
        const levels = getTestLevels(item.type)
        const testCount = getTestsForType(item.type).length
        const isSelected = selectedId === item.id

        return (
          <g key={item.id || idx} onClick={() => onSelect(item)} style={{ cursor: 'pointer' }}>
            {/* Conductor segment */}
            {idx > 0 && (
              <line x1={x} y1={itemY - symbolSpacing + 20} x2={x} y2={itemY - 16} stroke="#000" strokeWidth="1.5" fill="none" />
            )}
            {idx === 0 && (
              <line x1={x} y1={startY} x2={x} y2={itemY - 16} stroke="#000" strokeWidth="1.5" fill="none" />
            )}

            {/* Selection highlight */}
            {isSelected && (
              <rect x={x - 18} y={itemY - 18} width="36" height="36" rx="4" fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4 2" />
            )}

            {/* Symbol */}
            <DrawingSymbol type={item.type} x={x} y={itemY} />

            {/* Label to the right */}
            <text x={x + 25} y={itemY - 2} style={{ fontFamily: "Consolas, monospace", fontSize: '10px' }} fill="#000">
              {item.displayName || item.name || getShortName(item.type)}
            </text>

            {/* Level badges */}
            {levels.map((level, li) => (
              <g key={level}>
                <rect x={x + 25 + li * 22} y={itemY + 5} width="18" height="10" rx="5" ry="5" fill={LEVEL_COLORS[level]} />
                <text x={x + 34 + li * 22} y={itemY + 10} style={{ fontFamily: "Consolas, monospace", fontSize: '7px', fontWeight: 'bold', textAnchor: 'middle', dominantBaseline: 'middle' }} fill="#fff">{level}</text>
              </g>
            ))}

            {/* Test count */}
            <text x={x + 25 + levels.length * 22 + 6} y={itemY + 12} style={{ fontFamily: "Consolas, monospace", fontSize: '8px' }} fill="#888">{testCount}t</text>

            {/* Conductor after symbol */}
            {idx < items.length - 1 && (
              <line x1={x} y1={itemY + 16} x2={x} y2={itemY + 20} stroke="#000" strokeWidth="1.5" fill="none" />
            )}
          </g>
        )
      })}

      {/* Ground termination at bottom */}
      {items.length > 0 && (() => {
        const lastY = startY + (items.length - 1) * symbolSpacing + 30 + 20
        return (
          <g>
            <line x1={x} y1={lastY} x2={x} y2={lastY + 10} stroke="#000" strokeWidth="1.5" />
            <line x1={x - 8} y1={lastY + 12} x2={x + 8} y2={lastY + 12} stroke="#000" strokeWidth="2" />
            <line x1={x - 5} y1={lastY + 15} x2={x + 5} y2={lastY + 15} stroke="#000" strokeWidth="1.5" />
            <line x1={x - 3} y1={lastY + 18} x2={x + 3} y2={lastY + 18} stroke="#000" strokeWidth="1" />
          </g>
        )
      })()}
    </g>
  )
}

// ============================================================
// DETAIL PANEL
// ============================================================
function DetailPanel({ item, onClose, darkMode }) {
  const tests = getTestsForType(item.type)
  const levels = getTestLevels(item.type)

  const bg = darkMode ? '#0f172a' : '#ffffff'
  const border = darkMode ? '#1e293b' : '#e5e7eb'
  const textPrimary = darkMode ? '#f1f5f9' : '#111827'
  const textSecondary = darkMode ? '#94a3b8' : '#6b7280'
  const cardBg = darkMode ? '#1e293b' : '#f9fafb'

  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: '12px', margin: '0 24px 24px', padding: '24px', position: 'relative', boxShadow: darkMode ? '0 -4px 20px rgba(0,0,0,0.3)' : '0 -4px 20px rgba(0,0,0,0.08)' }}>
      {/* Close button */}
      <button
        onClick={onClose}
        style={{ position: 'absolute', top: '12px', right: '12px', width: '28px', height: '28px', borderRadius: '6px', border: 'none', background: darkMode ? '#334155' : '#e5e7eb', color: textPrimary, cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        \u2715
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
        <div style={{ width: '48px', height: '48px', background: cardBg, border: `1px solid ${border}`, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <IECSymbol type={item.type} color={darkMode ? '#60a5fa' : '#3b82f6'} size={24} />
        </div>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: textPrimary, margin: 0 }}>
            {item.displayName || item.name || getShortName(item.type)}
          </h3>
          <p style={{ fontSize: '12px', color: textSecondary, margin: '2px 0 0' }}>
            Type: {item.type} &nbsp;|&nbsp; Section: {item.section || 'N/A'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
          {levels.map(level => (
            <span key={level} style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: LEVEL_COLORS[level] + (darkMode ? '30' : '20'), color: LEVEL_COLORS[level], border: `1px solid ${LEVEL_COLORS[level]}50` }}>
              {level}
            </span>
          ))}
        </div>
      </div>

      {/* Test List */}
      {tests.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', color: textSecondary, fontSize: '13px', background: cardBg, borderRadius: '8px' }}>
          No tests configured for this type
        </div>
      ) : (
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${border}` }}>
                <th style={{ textAlign: 'left', padding: '8px', color: textSecondary, fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Level</th>
                <th style={{ textAlign: 'left', padding: '8px', color: textSecondary, fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Test Name</th>
                <th style={{ textAlign: 'left', padding: '8px', color: textSecondary, fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((test, idx) => (
                <tr key={idx} style={{ borderBottom: `1px solid ${darkMode ? '#1e293b' : '#f3f4f6'}` }}>
                  <td style={{ padding: '6px 8px' }}>
                    <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: LEVEL_COLORS[test[0]] + (darkMode ? '30' : '20'), color: LEVEL_COLORS[test[0]] }}>
                      {test[0]}
                    </span>
                  </td>
                  <td style={{ padding: '6px 8px', color: textPrimary }}>{test[1]}</td>
                  <td style={{ padding: '6px 8px', color: textSecondary, fontSize: '11px' }}>{test[2] || '\u2014'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: '12px', fontSize: '11px', color: textSecondary }}>
        Total: {tests.length} test{tests.length !== 1 ? 's' : ''} across {levels.length} level{levels.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
