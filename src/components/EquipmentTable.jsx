import { useState, useEffect } from 'react'
import testTemplates from '../data/test_templates.json'
import TestCustomiser from './TestCustomiser'

const TYPE_LABELS = {
  CT: 'CT', CT2: 'CT-T2', VT: 'VT', TRANSFORMER: 'Oil Transformer', DRY_TRANSFORMER: 'Dry Transformer',
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
  CT: '#3b82f6', CT2: '#3b82f6', VT: '#8b5cf6', TRANSFORMER: '#dc2626', DRY_TRANSFORMER: '#e11d48',
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

export default function EquipmentTable({ equipment, sectionName: sectionNameProp, activeFeederTab, selectedIndex, onSelect, onRemove, onUpdateTests, onRename }) {
  const [activeFeeder, setActiveFeeder] = useState({})

  // Sync active tab when parent tells us which feeder was selected in scope tree
  useEffect(() => {
    if (activeFeederTab && sectionNameProp) {
      setActiveFeeder(prev => ({ ...prev, [sectionNameProp]: activeFeederTab }))
    }
  }, [activeFeederTab, sectionNameProp])

  // ─── GROUPING LOGIC ───────────────────────────────────────────────────────────
  // Determine the "root" section — the common parent of all items in the list.
  // Then group items into:
  //   1. "overall" — items whose child_section matches the root (they ARE the root's own items)
  //                  OR items with no child_section that belong to this root
  //   2. "tabs" — items whose child_section is a DIRECT child of the root
  //
  // The root section is determined by finding items that have NO child_section (top-level)
  // or where child_section matches parent_section of other items.
  //
  // Simple rule: 
  //   - Items with child_section === null → "overall" (parent's own equipment)
  //   - Items with child_section !== null → grouped into tabs by child_section name
  //   - Items from feeders (feeder_ref has " — " but child_section is null, e.g. MV Switchgear feeders)
  //     → grouped into tabs by the feeder part of feeder_ref

  // Section header — use prop if provided, otherwise derive from first item's feeder_ref
  const sectionHeader = sectionNameProp || (equipment.length > 0
    ? (equipment[0].feeder_ref || '').split(' \u2014 ')[0] || 'Equipment'
    : 'Equipment')

  // Split items into overall (flat) and tabs
  const overall = []
  const tabGroups = {}

  equipment.forEach((item, idx) => {
    const enriched = { ...item, _idx: idx }
    
    // If child_section matches the section we're viewing, this IS the section's own item → always flat
    if (item.child_section === sectionHeader) {
      overall.push(enriched)
      return
    }

    // If no child_section, determine if it's flat (overall) or a tab (feeder)
    if (!item.child_section) {
      const ref = item.feeder_ref || ''
      const dashIdx = ref.indexOf(' \u2014 ')
      const feederPart = dashIdx >= 0 ? ref.slice(dashIdx + 3) : ''

      if (feederPart) {
        // "Overall" items belong flat under the section header, not as a tab
        if (feederPart === 'Overall') {
          overall.push(enriched)
        } else {
          if (!tabGroups[feederPart]) tabGroups[feederPart] = []
          tabGroups[feederPart].push(enriched)
        }
      } else {
        // Pure parent item, no sub-group
        overall.push(enriched)
      }
    } else {
      // Has child_section — this belongs to a child tab
      const tabName = item.child_section
      if (!tabGroups[tabName]) tabGroups[tabName] = []
      tabGroups[tabName].push(enriched)
    }
  })

  const tabNames = Object.keys(tabGroups)
  const totalTests = equipment.reduce((sum, item) => sum + getTestCount(item), 0)
  const currentTab = activeFeeder[sectionHeader] || tabNames[0]
  const currentTabItems = (currentTab && tabGroups[currentTab]) || []

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
              {isSelected && onRename ? (
                <input type="text"
                  value={item.displayName || displayName}
                  onChange={(e) => onRename(item._idx, e.target.value)}
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
              >&times;</button>
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
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, margin: 0, overflow: 'hidden' }}>
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

      {/* Sections — group overall items by their section name */}
      {(() => {
        const secs = {}
        overall.forEach(item => {
          const sn = (item.feeder_ref || '').split(' \u2014 ')[0] || sectionHeader
          if (!secs[sn]) secs[sn] = []
          secs[sn].push(item)
        })
        return Object.entries(secs).map(([sn, items]) => (
          <div key={sn}>
            <div style={{ padding: '8px 20px', background: '#1B3A5C', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{sn}</span>
              <span style={{ fontSize: 10, color: '#93BEDC' }}>{items.length} items · {items.reduce((s, it) => s + getTestCount(it), 0)} tests</span>
            </div>
            {items.map((item, i) => renderRow(item, i))}
          </div>
        ))
      })()}

      {/* Tab bar — for feeders AND child sections (unified) */}
      {tabNames.length > 0 && (
        <div style={{ padding: '6px 20px', background: '#EDF2F7', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 2, overflowX: 'auto' }}>
          {tabNames.map(tabName => {
            const tabItems = tabGroups[tabName]
            const type = (tabItems[0]?.feeder_type || '').replace(/_/g, ' ')
            const isActive = tabName === currentTab
            return (
              <button key={tabName} onClick={() => setActiveFeeder(prev => ({ ...prev, [sectionHeader]: tabName }))}
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
                {tabName}{type && <span style={{ fontSize: 9, marginLeft: 6, fontWeight: 400, textTransform: 'capitalize', color: isActive ? '#2E86AB' : '#94a3b8' }}>{type}</span>}
              </button>
            )
          })}
        </div>
      )}

      {/* Active tab items */}
      {tabNames.length > 0 && currentTabItems.map((item, i) => renderRow(item, i))}

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
