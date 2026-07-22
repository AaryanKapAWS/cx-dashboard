import { useState, useEffect } from 'react'
import sectionTemplates from '../data/section_templates.json'
import testTemplates from '../data/test_templates.json'

const DISPLAY_NAMES = {
  CT: 'CT - Protection', CT2: 'CT - Metering', NCT: 'NCT (CBCT)',
  VT: 'VT', PQM: 'Power Quality Meter', EPMS: 'EPMS',
  RELAY: 'Relay', CUBICLE: 'Cubicle', ENERGIZATION: 'Energization',
  SYNCH_CHECK: 'Synch Check Relay', CABLE_DIFF: 'Cable Differential',
  TRANSFORMER: 'Transformer', SURGE_ARRESTER: 'Surge Arrester',
  NER: 'NER', NER_CT: 'NER CT', BUSBAR: 'Busbar',
  PROTECTION_PANEL: 'Protection Panel', STABILITY_TEST: 'Stability Test',
  MV_CABLE: 'MV Cable', HV_CABLE: 'HV Cable',
  SWITCHGEAR_OVERALL: 'Switchgear (Overall)', AC_DC_CHECKS: 'AC/DC Distribution',
  SCADA: 'SAS/SCADA', SUBSTATION_CHECKS: 'Substation Checks', ESB_INTERFACE: 'ESB Interface',
  CT_METER: 'CT - Metering', CIRCUIT_BREAKER: 'Circuit Breaker',
  EARTH_SWITCH: 'Earth Switch', MK_OLTC_PANEL: 'MK & OLTC Panel',
  L4_INTEGRATION: 'L4 Integration',
}

const GRID_LABELS = {
  CT: 'CT', CT2: 'CT-M', NCT: 'NCT', CT_METER: 'CT-M',
  VT: 'VT', PQM: 'PQM', EPMS: 'EPMS',
  RELAY: 'Relay', CUBICLE: 'Cubicle', ENERGIZATION: 'Energization',
  SYNCH_CHECK: 'Synch Chk', CABLE_DIFF: 'Cable Diff',
  CIRCUIT_BREAKER: 'CB', EARTH_SWITCH: 'ES',
  L4_INTEGRATION: 'L4 Integ.',
}

const SECTION_TYPES = Object.entries(sectionTemplates).map(([id, config]) => ({
  id, ...config
}))

// Equipment-list section (Transformer Bay, Protection, Cables, Substation Checks)
function EquipmentSection({ section, onUpdate, onRemove }) {
  const template = sectionTemplates[section.type]
  
  function toggleEquipment(eqId) {
    const items = [...section.items]
    const idx = items.findIndex(i => i.id === eqId)
    if (idx >= 0) {
      items.splice(idx, 1)
    } else {
      const tmplItem = template.equipment.find(e => e.id === eqId)
      items.push({ id: eqId, label: tmplItem.label, qty: tmplItem.qty || 1, name: '' })
    }
    onUpdate({ ...section, items })
  }

  function updateQty(eqId, qty) {
    const items = section.items.map(i => i.id === eqId ? { ...i, qty: parseInt(qty) || 1 } : i)
    onUpdate({ ...section, items })
  }

  function updateName(eqId, name) {
    const items = section.items.map(i => i.id === eqId ? { ...i, name } : i)
    onUpdate({ ...section, items })
  }

  function updateNames(eqId, names) {
    const items = section.items.map(i => i.id === eqId ? { ...i, names } : i)
    onUpdate({ ...section, items })
  }

  return (
    <div style={{ padding: '12px 16px' }}>
      <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 12px' }}>{template.description}</p>
      
      {/* Equipment checklist */}
      <div style={{ display: 'grid', gap: 6 }}>
        {template.equipment.map(eq => {
          const active = section.items.some(i => i.id === eq.id)
          const item = section.items.find(i => i.id === eq.id)
          return (
            <div key={eq.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px', borderRadius: 6,
              background: active ? '#fffbeb' : '#f8fafc',
              border: active ? '1px solid #FF9900' : '1px solid #e2e8f0'
            }}>
              <input
                type="checkbox"
                checked={active}
                onChange={() => toggleEquipment(eq.id)}
                style={{ width: 16, height: 16, accentColor: '#FF9900' }}
              />
              <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, flex: 1 }}>
                {eq.label}
              </span>
              {active && (
                <>
                  <label style={{ fontSize: 10, color: '#64748b' }}>Qty:</label>
                  <input
                    type="number" min="1" max="10"
                    value={item?.qty || 1}
                    onChange={e => updateQty(eq.id, e.target.value)}
                    style={{ width: 40, padding: '3px 6px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12, textAlign: 'center' }}
                  />
                  {(item?.qty || 1) === 1 ? (
                    <input
                      value={item?.name || ''}
                      onChange={e => updateName(eq.id, e.target.value)}
                      placeholder="Custom name (optional)"
                      style={{ width: 180, padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 11 }}
                    />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {Array.from({ length: item.qty }, (_, idx) => (
                        <input
                          key={idx}
                          value={(item?.names || [])[idx] || ''}
                          onChange={e => {
                            const names = [...(item?.names || [])]
                            names[idx] = e.target.value
                            updateNames(eq.id, names)
                          }}
                          placeholder={`${eq.label} ${idx + 1}`}
                          style={{ width: 180, padding: '3px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 11 }}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Feeder-grid section (MV Switchgear, Panel Board)
function FeederSection({ section, onUpdate }) {
  const template = sectionTemplates[section.type]
  const feederTypes = template.feeder_types
  const eqTypes = template.equipment_types

  function addFeeder() {
    const defaultType = feederTypes.find(f => f.id === 'outgoing') || feederTypes[0]
    onUpdate({ ...section, feeders: [...section.feeders, { ref: '', type: defaultType.id, equipment: [...defaultType.defaults] }] })
  }

  function removeFeeder(idx) {
    onUpdate({ ...section, feeders: section.feeders.filter((_, i) => i !== idx) })
  }

  function updateRef(idx, ref) {
    const feeders = section.feeders.map((f, i) => i === idx ? { ...f, ref } : f)
    onUpdate({ ...section, feeders })
  }

  function updateType(idx, typeId) {
    const type = feederTypes.find(f => f.id === typeId) || feederTypes[0]
    const feeders = section.feeders.map((f, i) => i === idx ? { ...f, type: typeId, equipment: [...type.defaults] } : f)
    onUpdate({ ...section, feeders })
  }

  function toggleEquipment(fIdx, eqId) {
    const feeders = section.feeders.map((f, i) => {
      if (i !== fIdx) return f
      const has = f.equipment.includes(eqId)
      return { ...f, equipment: has ? f.equipment.filter(e => e !== eqId) : [...f.equipment, eqId] }
    })
    onUpdate({ ...section, feeders })
  }

  function handleQuickAdd() {
    const count = parseInt(prompt('How many feeders?') || '0')
    if (!count) return
    const type = feederTypes.find(f => f.id === 'outgoing') || feederTypes[0]
    const newFeeders = []
    for (let i = 1; i <= count; i++) {
      newFeeders.push({ ref: `${String(i).padStart(2, '0')}A`, type: type.id, equipment: [...type.defaults] })
    }
    onUpdate({ ...section, feeders: [...section.feeders.filter(f => f.ref), ...newFeeders] })
  }

  return (
    <div style={{ padding: '12px 16px' }}>
      <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 8px' }}>{template.feeder_description || template.description}</p>


      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>FEEDERS ({section.feeders.length})</span>
        <button onClick={() => handleQuickAdd()} style={{
          background: 'none', border: '1px solid #d1d5db', borderRadius: 4,
          padding: '2px 10px', fontSize: 10, cursor: 'pointer', color: '#FF9900', fontWeight: 600,
        }}>Quick Add</button>
      </div>

      {/* Scrollable grid container */}
      <div style={{ overflowX: 'auto', marginBottom: 8 }}>
      {/* Column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: `80px 110px repeat(${eqTypes.length}, minmax(70px, 1fr)) 28px`, gap: 2, marginBottom: 4, minWidth: `${190 + eqTypes.length * 75 + 28}px`, alignItems: 'center' }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: '#64748b', justifySelf: 'center' }}>REF</span>
        <span style={{ fontSize: 10, fontWeight: 600, color: '#64748b', justifySelf: 'center' }}>TYPE</span>
        {eqTypes.map(eq => (
          <span key={eq} style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textAlign: 'center', width: '100%' }}>
            {GRID_LABELS[eq] || eq}
          </span>
        ))}
        <span></span>
      </div>

      {/* Feeder rows */}
      {section.feeders.map((feeder, idx) => (
        <div key={idx} style={{
          display: 'grid', gridTemplateColumns: `80px 110px repeat(${eqTypes.length}, minmax(70px, 1fr)) 28px`, minWidth: `${190 + eqTypes.length * 75 + 28}px`,
          gap: 2, marginBottom: 2, alignItems: 'center', padding: '3px 4px', borderRadius: 4,
          background: idx % 2 === 0 ? '#f8fafc' : 'transparent'
        }}>
          <input value={feeder.ref} onChange={e => updateRef(idx, e.target.value)}
            placeholder={`${String(idx+1).padStart(2,'0')}A`}
            style={{ padding: '4px 6px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 11, width: '100%' }}
          />
          <select value={feeder.type} onChange={e => updateType(idx, e.target.value)}
            style={{ padding: '4px 3px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 10, width: '100%' }}
          >
            {feederTypes.map(ft => <option key={ft.id} value={ft.id}>{ft.label}</option>)}
          </select>
          {eqTypes.map(eq => (
            <div key={eq} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <input type="checkbox" checked={feeder.equipment.includes(eq)}
                onChange={() => toggleEquipment(idx, eq)}
                style={{ width: 14, height: 14, accentColor: '#FF9900', cursor: 'pointer' }}
              />
            </div>
          ))}
          <button onClick={() => removeFeeder(idx)} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 13
          }}>×</button>
        </div>
      ))}

      </div>{/* end scrollable container */}
      <button onClick={addFeeder} style={{
        marginTop: 6, width: '100%', padding: '5px', border: '1px dashed #cbd5e1',
        borderRadius: 4, fontSize: 11, cursor: 'pointer', color: '#64748b', background: 'none'
      }}>+ Add feeder</button>
    </div>
  )
}


export default function SectionBuilder({ onSubmit }) {
  const [sections, setSections] = useState([])
  const [projectName, setProjectName] = useState('')

  // Live sync — update parent whenever sections change
  useEffect(() => {
    handleSubmit()
  }, [JSON.stringify(sections)])

  function addSection(typeId) {
    const template = sectionTemplates[typeId]
    // Auto-name with instance number if same type already exists
    const existingCount = sections.filter(s => s.type === typeId).length
    const autoName = existingCount > 0 ? `${template.label} ${existingCount + 1}` : ''
    
    const newSection = {
      id: Date.now(),
      type: typeId,
      name: autoName,
    }
    
    // Equipment-list types
    if (template.equipment) {
      newSection.items = template.equipment.filter(e => e.default).map(e => ({
        id: e.id, label: e.label, qty: e.qty || 1, name: ''
      }))
    }
    // Feeder-grid types
    if (template.feeder_types) {
      newSection.feeders = []
    }
    
    setSections(prev => [...prev, newSection])
  }

  function updateSection(idx, updated) {
    setSections(prev => prev.map((s, i) => i === idx ? updated : s))
  }

  function removeSection(idx) {
    setSections(prev => prev.filter((_, i) => i !== idx))
  }

  function handleSubmit() {
    const allItems = []
    
    for (const section of sections) {
      const sectionName = section.name || sectionTemplates[section.type].label
      
      if (section.items) {
        // Equipment-list section
        for (const item of section.items) {
          const typeId = item.testType || item.id  // custom items use testType
          for (let q = 0; q < (item.qty || 1); q++) {
            const suffix = item.qty > 1 ? ` ${q + 1}` : ''
            allItems.push({
              feeder_ref: `${sectionName} \u2014 ${item.name || item.label}${suffix}`,
              type: typeId,
              name: item.name || `${item.label}${suffix}`,
              qty: 1,
              drawing: 'SLD (Manual)',
              section: section.type,
            })
          }
        }
      }
      
      if (section.feeders) {
        // Feeder-grid section
        // Add overall switchgear tests first
        for (const feeder of section.feeders) {
          if (!feeder.ref.trim()) continue
          const feederRef = `${sectionName} \u2014 ${feeder.ref}`
          for (const eqId of feeder.equipment) {
            allItems.push({
              feeder_ref: feederRef,
              type: eqId,
              name: DISPLAY_NAMES[eqId] || eqId,
              qty: 1,
              drawing: 'SLD (Manual)',
              feeder_type: feeder.type,
              section: section.type,
            })
          }
        }
      }
    }

    onSubmit(allItems, projectName || 'HV Substation')
  }

  return (
    <div style={{
      margin: '16px 32px 0', background: '#fff',
      border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px', background: '#232F3E', color: '#fff',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}> 
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>📋 Scope Builder</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
            Define your substation sections & equipment — drives COR sheets + Procore inspections
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 20px' }}>
        {/* Project name */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Project Name</label>
          <input value={projectName} onChange={e => setProjectName(e.target.value)}
            placeholder="e.g. DUB069HV - 4th Transformer"
            style={{ width: '100%', marginTop: 4, padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, fontWeight: 600 }}
          />
        </div>

        {/* Sections */}
        {sections.map((section, idx) => {
          const template = sectionTemplates[section.type]
          return (
            <div key={section.id} style={{
              marginBottom: 12, borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden'
            }}>
              {/* Section header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0'
              }}>
                <span style={{
                  width: 22, height: 22, borderRadius: '50%', background: '#FF9900',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: '#000', flexShrink: 0
                }}>{idx + 1}</span>
                <input value={section.name} onChange={e => updateSection(idx, { ...section, name: e.target.value })}
                  placeholder={template.label}
                  style={{ flex: 1, padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, fontWeight: 600 }}
                />
                <span style={{ fontSize: 10, color: '#94a3b8', background: '#e2e8f0', padding: '2px 8px', borderRadius: 4 }}>
                  {template.label}
                </span>
                <button onClick={() => removeSection(idx)} style={{
                  background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 16
                }}>✕</button>
              </div>

              {/* Section content */}
              {section.items && <EquipmentSection section={section} onUpdate={s => updateSection(idx, s)} onRemove={() => removeSection(idx)} />}
              {section.feeders && <FeederSection section={section} onUpdate={s => updateSection(idx, s)} />}
            </div>
          )
        })}

        {/* Add section buttons */}
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>
            + ADD SECTION
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {SECTION_TYPES.map(st => {
              const count = sections.filter(s => s.type === st.id).length
              return (
              <button key={st.id} onClick={() => addSection(st.id)} style={{
                padding: '8px 14px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                border: '1px solid #d1d5db',
                background: '#fff',
                cursor: 'pointer',
                color: '#475569',
                transition: 'all 0.15s',
                position: 'relative',
              }}
                onMouseEnter={e => { if (!alreadyAdded) { e.target.style.borderColor = '#FF9900'; e.target.style.background = '#fffbeb' } }}
                onMouseLeave={e => { if (!alreadyAdded) { e.target.style.borderColor = '#d1d5db'; e.target.style.background = '#fff' } }}
              >
                {st.label}{st.id === 'panel_board' && <span style={{ marginLeft: 5, fontSize: 8, background: '#fef3c7', color: '#92400e', borderRadius: 3, padding: '1px 4px', fontWeight: 700, letterSpacing: '0.3px' }}>BETA</span>}{count > 0 && <span style={{ marginLeft: 6, fontSize: 9, background: '#FF9900', color: '#fff', borderRadius: 10, padding: '1px 5px', fontWeight: 700 }}>{count}</span>}
              </button>
              )
            })}
          </div>
        </div>

        {/* Submit */}
        {sections.length > 0 && (
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 12, paddingTop: 12, borderTop: '1px solid #e2e8f0' }}>
            {sections.length} section{sections.length !== 1 ? 's' : ''} · Equipment Register updates live below ↓
          </div>
        )}
      </div>
    </div>
  )
}
