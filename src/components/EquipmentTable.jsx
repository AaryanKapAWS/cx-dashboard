import testTemplates from '../data/test_templates.json'

const TYPE_LABELS = {
  CT: 'CT', CT2: 'CT', VT: 'VT', TRANSFORMER: 'Transformer',
  BUSBAR: 'Busbar', PQM: 'PQM', EPMS: 'EPMS', RELAY: 'Relay',
  ENERGIZATION: 'Energization', SURGE_ARRESTER: 'Surge Arrester',
  NER: 'NER', NER_CT: 'NER CT', NER_CT_SBEF: 'NER CT',
  PROTECTION_PANEL: 'Protection Panel', STABILITY_TEST: 'Stability Test',
  MV_CABLE: 'MV Cable', HV_CABLE: 'HV Cable',
  SUBSTATION_CHECKS: 'Sub. Checks', ESB_INTERFACE: 'Grid Interface',
}

const TYPE_COLORS = {
  CT: '#3b82f6', VT: '#8b5cf6', TRANSFORMER: '#dc2626',
  BUSBAR: '#64748b', PQM: '#06b6d4', EPMS: '#0891b2',
  RELAY: '#f59e0b', ENERGIZATION: '#16a34a', SURGE_ARRESTER: '#ea580c',
  NER: '#7c3aed', NER_CT: '#6d28d9', PROTECTION_PANEL: '#be185d',
  STABILITY_TEST: '#be185d', MV_CABLE: '#475569', HV_CABLE: '#334155',
  SUBSTATION_CHECKS: '#059669', ESB_INTERFACE: '#059669',
  CT2: '#3b82f6', NER_CT_SBEF: '#6d28d9',
}

function getTestCount(item) {
  if (item.tests && item.tests.length > 0) return item.tests.length
  const tmpl = testTemplates[item.type]
  return tmpl ? tmpl.length : 0
}

function getSection(feederRef) {
  if (!feederRef) return 'Unassigned'
  const parts = feederRef.split(' \u2014 ')
  return parts[0] || 'Unassigned'
}

function getEquipmentName(feederRef) {
  if (!feederRef) return ''
  const parts = feederRef.split(' \u2014 ')
  return parts[1] || ''
}

export default function EquipmentTable({ equipment, selectedIndex, onSelect }) {
  // Group by section
  const sections = {}
  equipment.forEach((item, idx) => {
    const section = getSection(item.feeder_ref)
    if (!sections[section]) sections[section] = []
    sections[section].push({ ...item, _idx: idx })
  })

  const totalTests = equipment.reduce((sum, item) => sum + getTestCount(item), 0)

  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0',
      borderRadius: 10, margin: '16px 32px 0', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px', borderBottom: '1px solid #e2e8f0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>Equipment Register</span>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>Click a row to view test details</span>
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
          <span style={{ color: '#64748b' }}>
            <strong style={{ color: '#1e293b' }}>{equipment.length}</strong> items
          </span>
          <span style={{ color: '#64748b' }}>
            <strong style={{ color: '#1e293b' }}>{totalTests}</strong> tests
          </span>
        </div>
      </div>

      {/* Grouped content */}
      {Object.entries(sections).map(([sectionName, items]) => (
        <div key={sectionName}>
          {/* Section header */}
          <div style={{
            padding: '10px 20px', background: '#1e293b',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{sectionName}</span>
            <span style={{ fontSize: 10, color: '#94a3b8' }}>
              {items.length} items · {items.reduce((s, i) => s + getTestCount(i), 0)} tests
            </span>
          </div>

          {/* Equipment rows */}
          {items.map((item, i) => {
            const testCount = getTestCount(item)
            const typeLabel = TYPE_LABELS[item.type] || item.type
            const typeColor = TYPE_COLORS[item.type] || '#64748b'
            const isSelected = item._idx === selectedIndex

            return (
              <div
                key={item._idx}
                onClick={() => onSelect(item._idx === selectedIndex ? null : item._idx)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 80px 60px',
                  alignItems: 'center',
                  padding: '10px 20px',
                  borderBottom: '1px solid #f1f5f9',
                  cursor: 'pointer',
                  background: isSelected ? '#FFF8F0' : (i % 2 === 0 ? '#fff' : '#fafbfc'),
                  borderLeft: isSelected ? '4px solid #FF9900' : '4px solid transparent',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8fafc' }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafbfc' }}
              >
                {/* Name + type badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    fontSize: 9, fontWeight: 700, color: typeColor,
                    background: typeColor + '15', padding: '2px 7px',
                    borderRadius: 3, whiteSpace: 'nowrap', minWidth: 50, textAlign: 'center'
                  }}>
                    {typeLabel}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#1e293b' }}>
                    {item.name}
                  </span>
                </div>

                {/* Test count */}
                <div style={{ textAlign: 'center' }}>
                  <span style={{
                    fontSize: 12, fontWeight: 600,
                    color: testCount > 0 ? '#475569' : '#cbd5e1'
                  }}>
                    {testCount} tests
                  </span>
                </div>

                {/* Status indicator */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: item.status === 'Complete' ? '#16a34a' :
                               item.status === 'In Progress' ? '#FF9900' : '#e2e8f0'
                  }} />
                </div>
              </div>
            )
          })}
        </div>
      ))}

      {/* Empty state */}
      {equipment.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>No equipment added yet</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>Use the Section Builder above to add equipment</div>
        </div>
      )}
    </div>
  )
}
