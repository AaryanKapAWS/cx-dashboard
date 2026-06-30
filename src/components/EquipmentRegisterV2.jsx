import { useState } from 'react'
import testTemplates from '../data/test_templates.json'

const TYPE_LABELS = {
  CT: 'CT', NCT: 'NCT', VT: 'VT', TRANSFORMER: 'Transformer',
  BUSBAR: 'Busbar', PQM: 'PQM', EPMS: 'EPMS', RELAY: 'Relay',
  ENERGIZATION: 'Energ.', SURGE_ARRESTER: 'Surge Arr.',
  NER: 'NER', NER_CT: 'NER CT', CUBICLE: 'Cubicle',
  PROTECTION_PANEL: 'Protection', STABILITY_TEST: 'Stability',
  MV_CABLE: 'MV Cable', HV_CABLE: 'HV Cable', CABLE_DIFF: 'Cable Diff',
  SYNCH_CHECK: 'Synch', SWITCHGEAR_OVERALL: 'Overall',
  AC_DC_CHECKS: 'AC/DC', SCADA: 'SCADA', CT_HV: 'CT', VT_HV: 'VT',
  SUBSTATION_CHECKS: 'Sub Checks', ESB_INTERFACE: 'Grid Interface',
}

const TYPE_COLORS = {
  CT: '#3b82f6', NCT: '#3b82f6', VT: '#8b5cf6', TRANSFORMER: '#dc2626',
  BUSBAR: '#64748b', PQM: '#06b6d4', EPMS: '#0891b2', RELAY: '#f59e0b',
  ENERGIZATION: '#16a34a', SURGE_ARRESTER: '#ea580c', NER: '#7c3aed',
  NER_CT: '#6d28d9', CUBICLE: '#475569', CABLE_DIFF: '#334155',
  SYNCH_CHECK: '#0891b2', SWITCHGEAR_OVERALL: '#1e293b',
  AC_DC_CHECKS: '#475569', SCADA: '#059669', CT_HV: '#3b82f6',
  VT_HV: '#8b5cf6', PROTECTION_PANEL: '#be185d', STABILITY_TEST: '#be185d',
  MV_CABLE: '#475569', HV_CABLE: '#334155',
  SUBSTATION_CHECKS: '#059669', ESB_INTERFACE: '#059669',
}

function getTestCount(item) {
  const tmpl = testTemplates[item.type]
  return tmpl ? tmpl.length : 0
}

function Badge({ type }) {
  const label = TYPE_LABELS[type] || type
  const color = TYPE_COLORS[type] || '#64748b'
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, color: '#fff',
      background: color, padding: '2px 6px',
      borderRadius: 10, whiteSpace: 'nowrap',
    }}>{label}</span>
  )
}

export default function EquipmentRegisterV2({ equipment, selectedIndex, onSelect, onRemove }) {
  const [expanded, setExpanded] = useState(null)

  // Group: Section → Feeder → Items
  const sections = {}
  equipment.forEach((item, idx) => {
    const ref = item.feeder_ref || 'Unassigned'
    const parts = ref.split(' \u2014 ')
    const sectionName = parts[0] || 'Unassigned'
    const feederName = parts.length > 1 ? parts[1] : parts[0]

    if (!sections[sectionName]) sections[sectionName] = {}
    if (!sections[sectionName][feederName]) sections[sectionName][feederName] = []
    sections[sectionName][feederName].push({ ...item, _idx: idx })
  })

  const totalTests = equipment.reduce((sum, item) => sum + getTestCount(item), 0)

  if (equipment.length === 0) {
    return (
      <div style={{ margin: '16px 32px', padding: '40px', textAlign: 'center', color: '#94a3b8', border: '2px dashed #e2e8f0', borderRadius: 10 }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>No equipment added yet</div>
        <div style={{ fontSize: 11, marginTop: 4 }}>Add sections above to populate the register</div>
      </div>
    )
  }

  return (
    <div style={{ margin: '16px 32px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>Equipment Register</span>
          <span style={{ fontSize: 12, color: '#64748b' }}>{equipment.length} items · {totalTests} tests</span>
        </div>
        {onRemove && (
          <button onClick={() => { if (confirm('Clear all equipment?')) onRemove('all') }} style={{
            background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 4,
            padding: '4px 10px', fontSize: 10, color: '#dc2626', cursor: 'pointer', fontWeight: 600
          }}>Clear All</button>
        )}
      </div>

      {/* Sections */}
      {Object.entries(sections).map(([sectionName, feeders]) => {
        const sectionTests = Object.values(feeders).flat().reduce((s, i) => s + getTestCount(i), 0)
        const sectionItems = Object.values(feeders).flat().length

        return (
          <div key={sectionName} style={{ marginBottom: 16 }}>
            {/* Section header */}
            <div style={{
              padding: '8px 16px', background: '#1e293b', borderRadius: '8px 8px 0 0',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{sectionName}</span>
              <span style={{ fontSize: 10, color: '#94a3b8' }}>{sectionItems} items · {sectionTests} tests</span>
            </div>

            {/* Feeder cards */}
            <div style={{ border: '1px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
              {Object.entries(feeders).map(([feederName, items], fi) => {
                const feederKey = `${sectionName}__${feederName}`
                const isExpanded = expanded === feederKey
                const feederTests = items.reduce((s, i) => s + getTestCount(i), 0)
                const hasSelected = items.some(i => i._idx === selectedIndex)

                return (
                  <div key={feederKey}>
                    {/* Feeder row */}
                    <div
                      onClick={() => setExpanded(isExpanded ? null : feederKey)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 16px', cursor: 'pointer',
                        background: hasSelected ? '#fffbeb' : (fi % 2 === 0 ? '#fff' : '#fafbfc'),
                        borderBottom: '1px solid #f1f5f9',
                        borderLeft: hasSelected ? '3px solid #FF9900' : '3px solid transparent',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = hasSelected ? '#fffbeb' : (fi % 2 === 0 ? '#fff' : '#fafbfc')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 10, color: '#94a3b8', width: 12 }}>{isExpanded ? '▾' : '▸'}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', minWidth: 100 }}>{feederName}</span>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {items.map((item, i) => <Badge key={i} type={item.type} />)}
                        </div>
                      </div>
                      <span style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap', marginLeft: 12 }}>{feederTests} tests</span>
                    </div>

                    {/* Expanded items */}
                    {isExpanded && (
                      <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        {items.map(item => {
                          const isSelected = item._idx === selectedIndex
                          const testCount = getTestCount(item)
                          return (
                            <div
                              key={item._idx}
                              onClick={() => onSelect(isSelected ? null : item._idx)}
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '8px 16px 8px 44px', cursor: 'pointer',
                                background: isSelected ? '#FFF8F0' : 'transparent',
                                borderLeft: isSelected ? '3px solid #FF9900' : '3px solid transparent',
                                borderBottom: '1px solid #f1f5f9',
                              }}
                              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f1f5f9' }}
                              onMouseLeave={e => { e.currentTarget.style.background = isSelected ? '#FFF8F0' : 'transparent' }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Badge type={item.type} />
                                <span style={{ fontSize: 12, color: '#475569' }}>{item.name || TYPE_LABELS[item.type] || item.type}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: 11, color: '#94a3b8' }}>{testCount} tests</span>
                                {onRemove && (
                                  <button
                                    onClick={e => { e.stopPropagation(); onRemove(item._idx) }}
                                    style={{ background: 'none', border: 'none', color: '#cbd5e1', fontSize: 14, cursor: 'pointer', padding: '0 4px' }}
                                    onMouseEnter={e => e.target.style.color = '#dc2626'}
                                    onMouseLeave={e => e.target.style.color = '#cbd5e1'}
                                  >×</button>
                                )}
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
          </div>
        )
      })}
    </div>
  )
}
