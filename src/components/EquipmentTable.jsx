import { useState } from 'react'
import testTemplates from '../data/test_templates.json'
import TestCustomiser from './TestCustomiser'

const TYPE_LABELS = {
  CT: 'CT', CT2: 'CT-T2', VT: 'VT', TRANSFORMER: 'Transformer',
  BUSBAR: 'Busbar', PQM: 'PQM', EPMS: 'EPMS', RELAY: 'Relay',
  ENERGIZATION: 'Energization', SURGE_ARRESTER: 'Surge Arrester',
  NER: 'NER', NER_CT: 'NER CT', NER_CT_SBEF: 'NER CT',
  PROTECTION_PANEL: 'Protection', STABILITY_TEST: 'Stability',
  MV_CABLE: 'MV Cable', HV_CABLE: 'HV Cable',
  SUBSTATION_CHECKS: 'Sub. Checks', ESB_INTERFACE: 'Grid Interface',
  CT_METER: 'CT - Metering', CIRCUIT_BREAKER: 'Circuit Breaker',
  EARTH_SWITCH: 'Earth Switch', MK_OLTC_PANEL: 'MK/OLTC Panel',
  L4_INTEGRATION: 'L4 Integration', NCT: 'NCT',
  SWITCHGEAR_OVERALL: 'Switchgear', AC_DC_CHECKS: 'AC/DC',
  SCADA: 'SCADA', SYNCH_CHECK: 'Synch Check', CABLE_DIFF: 'Cable Diff',
  CUBICLE: 'Cubicle',
}

const TYPE_COLORS = {
  CT: '#3b82f6', CT2: '#3b82f6', VT: '#8b5cf6', TRANSFORMER: '#dc2626',
  BUSBAR: '#64748b', PQM: '#06b6d4', EPMS: '#0891b2',
  RELAY: '#f59e0b', ENERGIZATION: '#16a34a', SURGE_ARRESTER: '#ea580c',
  NER: '#7c3aed', NER_CT: '#6d28d9', NER_CT_SBEF: '#6d28d9',
  PROTECTION_PANEL: '#be185d', STABILITY_TEST: '#be185d',
  MV_CABLE: '#475569', HV_CABLE: '#334155',
  SUBSTATION_CHECKS: '#059669', ESB_INTERFACE: '#059669',
  CT_METER: '#2563eb', CIRCUIT_BREAKER: '#b91c1c',
  EARTH_SWITCH: '#065f46', MK_OLTC_PANEL: '#92400e',
  L4_INTEGRATION: '#7c2d12', NCT: '#0e7490',
  SWITCHGEAR_OVERALL: '#374151', AC_DC_CHECKS: '#4338ca',
  SCADA: '#0f766e', SYNCH_CHECK: '#6366f1', CABLE_DIFF: '#44403c',
  CUBICLE: '#525252',
}

function getTestCount(item) {
  if (item.customTests) return item.customTests.filter(t => t.enabled).length
  const tmpl = testTemplates[item.type]
  return tmpl ? tmpl.length : 0
}

function getDisplayName(item) {
  if (item.displayName) return item.displayName
  return item.name || TYPE_LABELS[item.type] || item.type
}

function getSection(feederRef) {
  if (!feederRef) return 'Unassigned'
  return feederRef.split(' \u2014 ')[0] || 'Unassigned'
}

function getFeeder(feederRef) {
  if (!feederRef) return ''
  const parts = feederRef.split(' \u2014 ')
  return parts.length > 1 ? parts[1] : ''
}

export default function EquipmentTable({ equipment, selectedIndex, onSelect, onRemove, onUpdateTests, onRename }) {
  const [activeFeeder, setActiveFeeder] = useState({})

  // Group: section \u2192 feeder \u2192 items
  const sections = {}
  equipment.forEach((item, idx) => {
    const section = getSection(item.feeder_ref)
    const feeder = item.feeder_ref || section
    if (!sections[section]) sections[section] = {}
    if (!sections[section][feeder]) sections[section][feeder] = []
    sections[section][feeder].push({ ...item, _idx: idx })
  })

  const totalTests = equipment.reduce((sum, item) => sum + getTestCount(item), 0)

  function renderRow(item, i) {
    const testCount = getTestCount(item)
    const typeLabel = TYPE_LABELS[item.type] || item.type
    const typeColor = TYPE_COLORS[item.type] || '#64748b'
    const isSelected = item._idx === selectedIndex
    const displayName = getDisplayName(item)

    return (
      <div key={item._idx}>
        <div
          onClick={() => onSelect(item._idx === selectedIndex ? null : item._idx)}
          style={{
            display: 'grid', gridTemplateColumns: '1fr 80px 36px',
            alignItems: 'center', padding: '9px 20px',
            borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
            background: isSelected ? '#FFF8F0' : (i % 2 === 0 ? '#fff' : '#fafbfc'),
            borderLeft: isSelected ? '4px solid #2E86AB' : '4px solid transparent',
            transition: 'background 0.1s',
          }}
          onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8fafc' }}
          onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafbfc' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              fontSize: 9, fontWeight: 700, color: typeColor,
              background: typeColor + '18', padding: '2px 7px',
              borderRadius: 3, whiteSpace: 'nowrap', minWidth: 55, textAlign: 'center'
            }}>
              {typeLabel}
            </span>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#1e293b' }}>
              {isSelected ? (
                <input type="text"
                  value={item.displayName || displayName}
                  onChange={(e) => onRename && onRename(item._idx, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  style={{ fontSize: 13, fontWeight: 500, color: '#1e293b', border: '1px solid #e2e8f0', borderRadius: 4, padding: '2px 8px', width: '100%', maxWidth: 300 }}
                />
              ) : (item.displayName || displayName)}
            </span>
          </div>
          <div style={{ textAlign: 'right', fontSize: 12, color: '#64748b' }}>{testCount} tests</div>
          {onRemove && (
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={e => { e.stopPropagation(); onRemove(item._idx) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', fontSize: 14, padding: '0 4px', transition: 'color 0.15s' }}
                onMouseEnter={e => e.target.style.color = '#dc2626'}
                onMouseLeave={e => e.target.style.color = '#cbd5e1'}
              >×</button>
            </div>
          )}
        </div>
        {isSelected && (
          <TestCustomiser
            equipmentType={item.type}
            selectedTests={item.customTests || null}
            onUpdate={(newTests) => onUpdateTests && onUpdateTests(item._idx, newTests)}
          />
        )}
      </div>
    )
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, margin: '16px 32px 0', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>Equipment Register</span>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>Click row for tests</span>
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
          <span><strong>{equipment.length}</strong> items</span>
          <span><strong>{totalTests}</strong> tests</span>
        </div>
      </div>

      {/* Sections */}
      {Object.entries(sections).map(([sectionName, feeders]) => {
        const sectionItems = Object.values(feeders).flat()
        const sectionTests = sectionItems.reduce((s, item) => s + getTestCount(item), 0)
        const feederKeys = Object.keys(feeders)

        // Split: single-item feeders (overall equipment) vs multi-item feeders (per-feeder)
        const overallKeys = feederKeys.filter(k => feeders[k].length <= 1)
        const multiKeys = feederKeys.filter(k => feeders[k].length > 1)

        const currentFeeder = activeFeeder[sectionName] || multiKeys[0]
        const currentItems = (currentFeeder && feeders[currentFeeder]) || []

        return (
          <div key={sectionName}>
            {/* Section header */}
            <div style={{ padding: '8px 20px', background: '#1B3A5C', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{sectionName}</span>
              <span style={{ fontSize: 10, color: '#93BEDC' }}>{sectionItems.length} items · {sectionTests} tests</span>
            </div>

            {/* Overall items (not per-feeder) */}
            {overallKeys.map(fk => feeders[fk].map((item, i) => renderRow(item, i)))}

            {/* Feeder tab bar */}
            {multiKeys.length > 0 && (
              <div style={{ padding: '6px 20px', background: '#EDF2F7', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 2, overflowX: 'auto' }}>
                {multiKeys.map(fk => {
                  const name = getFeeder(fk)
                  const type = (feeders[fk][0]?.feeder_type || '').replace(/_/g, ' ')
                  const isActive = fk === currentFeeder
                  return (
                    <button key={fk} onClick={() => setActiveFeeder(prev => ({ ...prev, [sectionName]: fk }))}
                      style={{
                        padding: '6px 14px', fontSize: 11, fontWeight: isActive ? 700 : 500,
                        color: isActive ? '#1B3A5C' : '#64748b',
                        background: isActive ? '#fff' : 'transparent',
                        border: isActive ? '1px solid #d1d5db' : '1px solid transparent',
                        borderBottom: isActive ? '2px solid #2E86AB' : '2px solid transparent',
                        borderRadius: '6px 6px 0 0', cursor: 'pointer',
                        textTransform: 'uppercase', letterSpacing: '0.3px',
                        transition: 'all 0.15s', whiteSpace: 'nowrap',
                      }}
                    >
                      {name}{type && <span style={{ fontSize: 9, marginLeft: 6, fontWeight: 400, textTransform: 'capitalize', color: isActive ? '#2E86AB' : '#94a3b8' }}>{type}</span>}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Active feeder items */}
            {multiKeys.length > 0 && currentItems.map((item, i) => renderRow(item, i))}
          </div>
        )
      })}

      {/* Empty state */}
      {equipment.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>📋</div>
          <div style={{ fontSize: 13 }}>No equipment added yet</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>Use the Scope Builder above to add sections</div>
        </div>
      )}
    </div>
  )
}
