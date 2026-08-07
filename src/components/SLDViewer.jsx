import { useMemo } from 'react'

// ─── CLASSIFICATION ──────────────────────────────────────────────────────────
const INLINE_TYPES = new Set([
  'TRANSFORMER', 'DRY_TRANSFORMER', 'CT_HV', 'CT', 'CT_METER', 'NCT',
  'VT_HV', 'VT', 'CIRCUIT_BREAKER', 'EARTH_SWITCH', 'SURGE_ARRESTER',
  'NER', 'NER_CT', 'HV_CABLE', 'MV_CABLE', 'BUSBAR',
  'CB_GIS', 'DS_ES_GIS', 'ES_GIS', 'CT_GIS', 'VT_GIS', 'SA_GIS',
  'RING_CT_GIS', 'HV_CABLE_GIS', 'GIS_BAY',
])
const PANEL_TYPES = new Set([
  'PQM', 'EPMS', 'RELAY', 'CUBICLE', 'PROTECTION_PANEL', 'MK_OLTC_PANEL',
  'STABILITY_TEST', 'SYNCH_CHECK', 'CABLE_DIFF', 'L4_INTEGRATION',
  'ENERGIZATION', 'SWITCHGEAR_OVERALL', 'AC_DC_CHECKS', 'SCADA',
  'SUBSTATION_CHECKS', 'ESB_INTERFACE',
  'CUBICLE_GIS', 'IED_OC_GIS', 'IED_87T_GIS', 'IED_87B_GIS',
  'LCC_GIS', 'STABILITY_GIS', 'EPMS_GIS', 'ENERGIZATION_GIS',
  'BATTERY_BANK', 'BATTERY_CHARGER', 'DC_DISTRIBUTION', 'UPS', 'DC_EARTH_FAULT',
  'EARTH_GRID', 'EARTH_ELECTRODE',
])

const TYPE_COLOUR = {
  CT: '#006064', CT_HV: '#006064', CT_METER: '#0097a7', NCT: '#00838f', NER_CT: '#4a148c',
  CT_GIS: '#006064', RING_CT_GIS: '#006064',
  VT: '#1a237e', VT_HV: '#1a237e', VT_GIS: '#1a237e',
  CIRCUIT_BREAKER: '#c62828', CB_GIS: '#c62828',
  EARTH_SWITCH: '#1b5e20', DS_ES_GIS: '#1b5e20', ES_GIS: '#1b5e20',
  SURGE_ARRESTER: '#e65100', SA_GIS: '#e65100',
  TRANSFORMER: '#bf360c', DRY_TRANSFORMER: '#4e342e',
  NER: '#6a1b9a',
  HV_CABLE: '#37474F', MV_CABLE: '#455a64', HV_CABLE_GIS: '#37474F',
  BUSBAR: '#263238', GIS_BAY: '#263238',
}

function getShort(type) {
  const m = {
    CT: 'CT', CT_HV: 'CT', CT_METER: 'CTm', NCT: 'NCT', NER_CT: 'NCT',
    VT: 'VT', VT_HV: 'VT', VT_GIS: 'VT', CT_GIS: 'CT', RING_CT_GIS: 'RCT',
    CIRCUIT_BREAKER: 'CB', CB_GIS: 'CB',
    EARTH_SWITCH: 'ES', DS_ES_GIS: 'DS', ES_GIS: 'ES',
    SURGE_ARRESTER: 'SA', SA_GIS: 'SA',
    TRANSFORMER: 'Tx', DRY_TRANSFORMER: 'Tx',
    NER: 'NER', HV_CABLE: 'HVC', MV_CABLE: 'MVC', HV_CABLE_GIS: 'HVC',
    BUSBAR: 'BB', GIS_BAY: 'GIS',
  }
  return m[type] || type.slice(0, 3)
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
export default function SLDViewer({ equipment }) {
  const data = useMemo(() => {
    if (!equipment || !equipment.length) return null
    const sectionMap = {}
    const panelCounts = {}

    equipment.forEach(item => {
      const ref = item.feeder_ref || 'Unassigned'
      const dashIdx = ref.indexOf(' \u2014 ')
      const sectionName = dashIdx >= 0 ? ref.slice(0, dashIdx) : ref
      const feederName = dashIdx >= 0 ? ref.slice(dashIdx + 3) : ''

      if (PANEL_TYPES.has(item.type)) {
        panelCounts[sectionName] = (panelCounts[sectionName] || 0) + 1
        return
      }
      if (!INLINE_TYPES.has(item.type)) return

      if (!sectionMap[sectionName]) sectionMap[sectionName] = { name: sectionName, overall: [], feeders: {}, sectionType: '' }
      // Prefer section type from overall items; fall back to feeder items
      if (item.section && (!sectionMap[sectionName].sectionType || !feederName)) sectionMap[sectionName].sectionType = item.section

      if (feederName) {
        if (!sectionMap[sectionName].feeders[feederName]) sectionMap[sectionName].feeders[feederName] = []
        sectionMap[sectionName].feeders[feederName].push(item)
      } else {
        sectionMap[sectionName].overall.push(item)
      }
    })

    const spines = []
    const switchgears = []
    Object.values(sectionMap).forEach(sec => {
      const preset = sec.sectionType || ''
      const isSwitchgearType = preset === 'switchgear' || preset === 'hv_switchgear_gis' || preset === 'panel_board'
      // Switchgear-type sections with feeders → render as busbar + cubicles
      if (isSwitchgearType && Object.keys(sec.feeders).length > 0) switchgears.push(sec)
      // Everything with overall items → render as spine (transformer bays, line bays, standalone)
      if (sec.overall.length > 0) spines.push(sec)
    })
    return { spines, switchgears, panelCounts }
  }, [equipment])

  if (!data) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Add equipment to see the SLD view</div>
  }

  const { spines, switchgears, panelCounts } = data

  return (
    <div style={{ margin: '16px 24px' }}>
      <div style={{ background: '#fff', border: '1px solid #dce1e8', borderRadius: 8, overflow: 'hidden' }}>
        {/* Header */}
        <Header equipment={equipment} />

        {/* MAIN LAYOUT: Spines on left, Switchgear on right */}
        <div style={{ display: 'flex', alignItems: 'stretch', minHeight: 300 }}>
          {/* LEFT COLUMN: Transformer/Line Bays */}
          {spines.length > 0 && (
            <div style={{ display: 'flex', borderRight: '2px solid #e2e8f0' }}>
              {spines.map((sec, i) => (
                <SpineColumn key={i} section={sec} panelCount={panelCounts[sec.name] || 0} />
              ))}
            </div>
          )}

          {/* RIGHT: Switchgear sections */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {switchgears.map((sec, i) => (
              <SwitchgearSection key={i} section={sec} panelCount={panelCounts[sec.name] || 0} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── HEADER ──────────────────────────────────────────────────────────────────
function Header({ equipment }) {
  const inlineCount = equipment.filter(i => INLINE_TYPES.has(i.type)).length
  const panelCount = equipment.filter(i => PANEL_TYPES.has(i.type)).length
  return (
    <div style={{ padding: '7px 14px', borderBottom: '1px solid #e8ecf0', background: '#f5f7fa', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>📐 Single Line Diagram</span>
      <span style={{ fontSize: 10, color: '#64748b' }}>{inlineCount} power • {panelCount} panels</span>
    </div>
  )
}

// ─── SPINE COLUMN (Transformer Bay / Line Bay) ───────────────────────────────
// Vertical power flow: source at top → transformer → cable out at bottom
function SpineColumn({ section, panelCount }) {
  const items = section.overall.filter(i => INLINE_TYPES.has(i.type))
  if (items.length === 0) return null
  const colour = section.sectionType === 'line_bay' ? '#2980b9' : '#d35400'

  return (
    <div style={{ width: 185, padding: '10px 0', display: 'flex', flexDirection: 'column' }}>
      {/* Section header */}
      <div style={{ padding: '0 12px 8px', borderBottom: `2px solid ${colour}` }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: colour, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {section.name}
        </div>
        <div style={{ fontSize: 9, color: '#94a3b8' }}>{items.length} items{panelCount > 0 ? ` + ${panelCount} panels` : ''}</div>
      </div>

      {/* Equipment — vertical with connecting line */}
      <div style={{ flex: 1, padding: '8px 12px', position: 'relative' }}>
        {/* Vertical power line */}
        <div style={{
          position: 'absolute', left: 22, top: 8, bottom: 8,
          width: 2, background: `linear-gradient(180deg, ${colour}40, ${colour})`,
          borderRadius: 1,
        }} />

        {items.map((item, i) => {
          const c = TYPE_COLOUR[item.type] || '#64748b'
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 0', paddingLeft: 18, position: 'relative',
            }}>
              {/* Node on the line */}
              <div style={{
                position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)',
                width: 10, height: 10, borderRadius: '50%',
                background: c, border: '2px solid #fff',
                boxShadow: `0 0 0 1px ${c}40`,
              }} />
              {/* Badge */}
              <span style={{
                marginLeft: 12, fontSize: 8, fontWeight: 800, color: '#fff',
                background: c, borderRadius: 3,
                padding: '1px 4px', minWidth: 22, textAlign: 'center',
                fontFamily: 'SF Mono, monospace',
              }}>
                {getShort(item.type)}
              </span>
              {/* Name */}
              <span style={{ fontSize: 10, color: '#334155', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.displayName || item.name || item.type}
              </span>
            </div>
          )
        })}
      </div>

      {/* Cable out indicator */}
      <div style={{ padding: '4px 12px', textAlign: 'center' }}>
        <span style={{ fontSize: 8, color: '#94a3b8', fontStyle: 'italic' }}>▼ cable to busbar</span>
      </div>
    </div>
  )
}

// ─── SWITCHGEAR SECTION ──────────────────────────────────────────────────────
function SwitchgearSection({ section, panelCount }) {
  const feederNames = Object.keys(section.feeders)
  if (feederNames.length === 0) return null
  const colour = '#27ae60'

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header + Busbar */}
      <div style={{ padding: '8px 12px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: colour, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {section.name}
          </span>
          <span style={{ fontSize: 9, color: '#94a3b8' }}>{feederNames.length} feeders{panelCount > 0 ? ` • ${panelCount}p` : ''}</span>
        </div>

        {/* Busbar bar */}
        <div style={{ position: 'relative', margin: '0 8px' }}>
          <div style={{ height: 6, background: '#1e293b', borderRadius: 3 }} />
          {/* Drop connection marks */}
          <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: -3 }}>
            {feederNames.map((_, i) => (
              <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: '#1e293b', border: '2px solid #fff' }} />
            ))}
          </div>
        </div>
      </div>

      {/* Feeder cubicles — table-style grid filling available space */}
      <div style={{
        flex: 1, padding: '6px 12px 10px',
        display: 'grid',
        gridTemplateColumns: `repeat(${feederNames.length}, 1fr)`,
        gap: 4,
        alignItems: 'stretch',
      }}>
        {feederNames.map((fName, fIdx) => {
          const items = section.feeders[fName].filter(i => INLINE_TYPES.has(i.type))
          const panels = section.feeders[fName].filter(i => PANEL_TYPES.has(i.type))
          return (
            <div key={fIdx} style={{
              background: '#f8fafc', borderRadius: 4,
              border: '1px solid #e2e8f0',
              display: 'flex', flexDirection: 'column',
            }}>
              {/* Cubicle name */}
              <div style={{
                padding: '4px 6px',
                background: '#eef2f7', borderBottom: '1px solid #e2e8f0',
                borderRadius: '4px 4px 0 0',
              }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {fName}
                </div>
              </div>

              {/* Equipment list */}
              <div style={{ padding: '4px 5px', flex: 1 }}>
                {items.map((item, i) => {
                  const c = TYPE_COLOUR[item.type] || '#64748b'
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 0' }}>
                      <span style={{
                        fontSize: 7, fontWeight: 800, color: '#fff',
                        background: c, borderRadius: 2,
                        padding: '1px 3px', minWidth: 20, textAlign: 'center',
                        fontFamily: 'SF Mono, monospace', lineHeight: '12px',
                      }}>
                        {getShort(item.type)}
                      </span>
                      <span style={{ fontSize: 9, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.displayName || item.name || ''}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Panel count footer */}
              {panels.length > 0 && (
                <div style={{ padding: '3px 5px', borderTop: '1px dashed #e2e8f0', fontSize: 8, color: '#94a3b8' }}>
                  +{panels.length} panels
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
