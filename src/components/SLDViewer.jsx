import { useMemo } from 'react'

// ─── EQUIPMENT CLASSIFICATION ────────────────────────────────────────────────
const INLINE_TYPES = new Set([
  'TRANSFORMER', 'DRY_TRANSFORMER', 'CT_HV', 'CT', 'CT_METER', 'NCT',
  'VT_HV', 'VT', 'CIRCUIT_BREAKER', 'EARTH_SWITCH', 'SURGE_ARRESTER',
  'NER', 'NER_CT', 'HV_CABLE', 'MV_CABLE', 'BUSBAR',
])

const TEE_TYPES = new Set(['VT_HV', 'VT', 'SURGE_ARRESTER', 'NER'])

const PANEL_TYPES = new Set([
  'PQM', 'EPMS', 'RELAY', 'CUBICLE', 'PROTECTION_PANEL', 'MK_OLTC_PANEL',
  'STABILITY_TEST', 'SYNCH_CHECK', 'CABLE_DIFF', 'L4_INTEGRATION',
  'ENERGIZATION', 'SWITCHGEAR_OVERALL', 'AC_DC_CHECKS', 'SCADA',
  'SUBSTATION_CHECKS', 'ESB_INTERFACE',
])

// ─── SVG SYMBOLS ─────────────────────────────────────────────────────────────
const SPC = 36

function drawCT(x, y) {
  return <g><circle cx={x} cy={y-4} r={5} fill="none" stroke="#006064" strokeWidth={1.5}/><circle cx={x} cy={y+4} r={5} fill="none" stroke="#006064" strokeWidth={1.5}/></g>
}
function drawVT(x, y) {
  return <g><circle cx={x} cy={y-4} r={5} fill="none" stroke="#1a5276" strokeWidth={1.5}/><circle cx={x} cy={y+4} r={5} fill="none" stroke="#1a5276" strokeWidth={1.5}/><line x1={x-3} y1={y-4} x2={x+3} y2={y-4} stroke="#1a5276" strokeWidth={1}/></g>
}
function drawCB(x, y) {
  return <g><rect x={x-6} y={y-6} width={12} height={12} fill="none" stroke="#b91c1c" strokeWidth={1.5}/><line x1={x-3} y1={y-3} x2={x+3} y2={y+3} stroke="#b91c1c" strokeWidth={1.5}/><line x1={x+3} y1={y-3} x2={x-3} y2={y+3} stroke="#b91c1c" strokeWidth={1.5}/></g>
}
function drawES(x, y) {
  return <g><line x1={x} y1={y-5} x2={x} y2={y+1} stroke="#065f46" strokeWidth={1.5}/><line x1={x-4} y1={y+3} x2={x+4} y2={y+3} stroke="#065f46" strokeWidth={2}/><line x1={x-2} y1={y+5} x2={x+2} y2={y+5} stroke="#065f46" strokeWidth={1}/></g>
}
function drawSA(x, y) {
  return <g><polyline points={`${x},${y-7} ${x-3},${y-2} ${x+3},${y+2} ${x},${y+7}`} fill="none" stroke="#ea580c" strokeWidth={1.5}/></g>
}
function drawTFR(x, y) {
  return <g><circle cx={x} cy={y-7} r={9} fill="none" stroke="#d35400" strokeWidth={2}/><circle cx={x} cy={y+7} r={9} fill="none" stroke="#d35400" strokeWidth={2}/></g>
}
function drawNER(x, y) {
  return <g><polyline points={`${x},${y-5} ${x-3},${y-2} ${x+3},${y+1} ${x-3},${y+4} ${x},${y+6}`} fill="none" stroke="#7c3aed" strokeWidth={1.5}/><line x1={x-4} y1={y+8} x2={x+4} y2={y+8} stroke="#7c3aed" strokeWidth={1.5}/></g>
}
function drawCable(x, y) {
  return <g><line x1={x-7} y1={y} x2={x+7} y2={y} stroke="#37474F" strokeWidth={2} strokeDasharray="3,2"/></g>
}

function getSymbol(type, x, y) {
  if (['CT_HV','CT','CT_METER','NCT','NER_CT'].includes(type)) return drawCT(x, y)
  if (['VT_HV','VT'].includes(type)) return drawVT(x, y)
  if (type === 'CIRCUIT_BREAKER') return drawCB(x, y)
  if (type === 'EARTH_SWITCH') return drawES(x, y)
  if (type === 'SURGE_ARRESTER') return drawSA(x, y)
  if (['TRANSFORMER','DRY_TRANSFORMER'].includes(type)) return drawTFR(x, y)
  if (type === 'NER') return drawNER(x, y)
  if (['HV_CABLE','MV_CABLE'].includes(type)) return drawCable(x, y)
  if (type === 'BUSBAR') return <g><line x1={x-6} y1={y} x2={x+6} y2={y} stroke="#1e293b" strokeWidth={3}/></g>
  return <circle cx={x} cy={y} r={3} fill="#64748b"/>
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────
export default function SLDViewer({ equipment }) {
  const topology = useMemo(() => {
    if (!equipment || !equipment.length) return { sections: [] }
    const sectionMap = {}
    equipment.forEach(item => {
      if (PANEL_TYPES.has(item.type)) return
      const ref = item.feeder_ref || 'Unassigned'
      const dashIdx = ref.indexOf(' \u2014 ')
      const sectionName = dashIdx >= 0 ? ref.slice(0, dashIdx) : ref
      const feederName = dashIdx >= 0 ? ref.slice(dashIdx + 3) : ''
      if (!sectionMap[sectionName]) sectionMap[sectionName] = { name: sectionName, feeders: {} }
      const fKey = feederName || '__overall__'
      if (!sectionMap[sectionName].feeders[fKey]) sectionMap[sectionName].feeders[fKey] = []
      sectionMap[sectionName].feeders[fKey].push(item)
    })
    return { sections: Object.values(sectionMap) }
  }, [equipment])

  if (!equipment || !equipment.length) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
        Add equipment to see the SLD view
      </div>
    )
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', background: '#fafbfc' }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>📐 SLD View</span>
        <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 10 }}>Auto-generated from equipment</span>
      </div>
      {/* Each section in its own card — side by side when possible, wrapping */}
      <div style={{ padding: 16, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
        {topology.sections.map((section, sIdx) => (
          <SectionCard key={sIdx} section={section} />
        ))}
      </div>
    </div>
  )
}

// ─── SECTION CARD ────────────────────────────────────────────────────────────
function SectionCard({ section }) {
  const feederKeys = Object.keys(section.feeders)
  const overallItems = (section.feeders['__overall__'] || []).filter(i => INLINE_TYPES.has(i.type))
  const feederList = feederKeys.filter(k => k !== '__overall__')
  const hasFeeders = feederList.length > 0

  // Calculate card dimensions
  const FEEDER_W = 110
  const spineH = overallItems.length * SPC + 30
  const maxFeederItems = hasFeeders ? Math.max(...feederList.map(f => section.feeders[f].filter(i => INLINE_TYPES.has(i.type)).length)) : 0
  const feederH = maxFeederItems * SPC + 30
  const cardW = hasFeeders ? Math.max(feederList.length * FEEDER_W + 60, 280) : 220
  const cardH = spineH + (hasFeeders ? 40 + feederH : 20)
  const centerX = hasFeeders ? cardW / 2 : 110
  const busbarY = spineH + 10

  return (
    <div style={{
      border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden',
      background: '#fafcff', minWidth: 200, flex: hasFeeders ? '1 1 100%' : '0 0 auto',
    }}>
      {/* Section header */}
      <div style={{ padding: '8px 14px', background: '#232F3E', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{section.name}</span>
        <span style={{ fontSize: 9, color: '#94a3b8' }}>
          {overallItems.length + feederList.reduce((s, f) => s + section.feeders[f].filter(i => INLINE_TYPES.has(i.type)).length, 0)} items
        </span>
      </div>

      {/* SVG */}
      <div style={{ padding: '12px 8px', overflowX: 'auto' }}>
        <svg width={cardW} height={cardH} style={{ display: 'block', margin: '0 auto' }}>
          {/* ═══ VERTICAL SPINE ═══ */}
          {overallItems.length > 0 && (
            <g>
              <line x1={centerX} y1={8} x2={centerX} y2={busbarY} stroke="#1e293b" strokeWidth={2}/>
              {overallItems.map((item, i) => {
                const eqY = 16 + i * SPC
                const isTee = TEE_TYPES.has(item.type)
                return (
                  <g key={i}>
                    {getSymbol(item.type, centerX, eqY)}
                    {isTee && <line x1={centerX} y1={eqY} x2={centerX + 22} y2={eqY} stroke="#64748b" strokeWidth={1}/>}
                    <text x={isTee ? centerX + 26 : centerX + 14} y={eqY + 3} fontSize={8} fill="#475569" fontFamily="sans-serif">
                      {(item.displayName || item.name || '').slice(0, 16)}
                    </text>
                  </g>
                )
              })}
            </g>
          )}

          {/* ═══ BUSBAR ═══ */}
          {hasFeeders && (
            <g>
              <line x1={20} y1={busbarY} x2={cardW - 20} y2={busbarY} stroke="#1e293b" strokeWidth={4} strokeLinecap="round"/>
              {overallItems.length > 0 && <circle cx={centerX} cy={busbarY} r={3.5} fill="#1e293b"/>}
            </g>
          )}

          {/* ═══ FEEDERS ═══ */}
          {feederList.map((fName, fIdx) => {
            const items = section.feeders[fName].filter(i => INLINE_TYPES.has(i.type))
            const fX = 40 + fIdx * FEEDER_W
            const fStartY = busbarY + 20

            return (
              <g key={fIdx}>
                <circle cx={fX} cy={busbarY} r={2.5} fill="#1e293b"/>
                <line x1={fX} y1={busbarY} x2={fX} y2={fStartY + items.length * SPC} stroke="#475569" strokeWidth={1.5}/>
                {/* Feeder name */}
                <text x={fX} y={busbarY - 6} fontSize={8} textAnchor="middle" fill="#334155" fontFamily="sans-serif" fontWeight={600}>
                  {fName.length > 12 ? fName.slice(0, 11) + '\u2026' : fName}
                </text>
                {/* Equipment */}
                {items.map((item, i) => {
                  const eqY = fStartY + i * SPC
                  const isTee = TEE_TYPES.has(item.type)
                  return (
                    <g key={i}>
                      {getSymbol(item.type, fX, eqY)}
                      {isTee && <line x1={fX} y1={eqY} x2={fX + 18} y2={eqY} stroke="#64748b" strokeWidth={1}/>}
                      <text x={isTee ? fX + 22 : fX + 12} y={eqY + 3} fontSize={7} fill="#64748b" fontFamily="sans-serif">
                        {(item.displayName || item.name || '').slice(0, 10)}
                      </text>
                    </g>
                  )
                })}
                {/* End bar */}
                <line x1={fX - 4} y1={fStartY + items.length * SPC} x2={fX + 4} y2={fStartY + items.length * SPC} stroke="#475569" strokeWidth={2}/>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
