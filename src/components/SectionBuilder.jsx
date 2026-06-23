import { useState } from 'react'
import sectionTemplates from '../data/section_templates.json'

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
                  <input
                    value={item?.name || ''}
                    onChange={e => updateName(eq.id, e.target.value)}
                    placeholder="Custom name (optional)"
                    style={{ width: 160, padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 11 }}
                  />
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
    const typeId = prompt(`Type? (${feederTypes.map(f => f.id).join(' / ')})`) || 'outgoing'
    const type = feederTypes.find(f => f.id === typeId) || feederTypes.find(f => f.id === 'outgoing') || feederTypes[0]
    const newFeeders = []
    for (let i = 1; i <= count; i++) {
      newFeeders.push({ ref: `${String(i).padStart(2, '0')}A`, type: type.id, equipment: [...type.defaults] })
    }
    onUpdate({ ...section, feeders: [...section.feeders.filter(f => f.ref), ...newFeeders] })
  }

  return (
    <div style={{ padding: '12px 16px' }}>
      <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 8px' }}>{template.description}</p>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>FEEDERS ({section.feeders.length})</span>
        <button onClick={handleQuickAdd} style={{
          background: 'none', border: '1px solid #d1d5db', borderRadius: 4,
          padding: '2px 10px', fontSize: 10, cursor: 'pointer', color: '#FF9900', fontWeight: 600
        }}>Quick Add</button>
      </div>

      {/* Column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: `80px 110px repeat(${eqTypes.length}, 1fr) 28px`, gap: 2, marginBottom: 4 }}>
        <span style={{ fontSize: 9, fontWeight: 600, color: '#64748b' }}>REF</span>
        <span style={{ fontSize: 9, fontWeight: 600, color: '#64748b' }}>TYPE</span>
        {eqTypes.map(eq => (
          <span key={eq} style={{ fontSize: 9, fontWeight: 600, color: '#64748b', textAlign: 'center' }}>{eq}</span>
        ))}
        <span></span>
      </div>

      {/* Feeder rows */}
      {section.feeders.map((feeder, idx) => (
        <div key={idx} style={{
          display: 'grid', gridTemplateColumns: `80px 110px repeat(${eqTypes.length}, 1fr) 28px`,
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
            <div key={eq} style={{ textAlign: 'center' }}>
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

  function addSection(typeId) {
    const template = sectionTemplates[typeId]
    const newSection = {
      id: Date.now(),
      type: typeId,
      name: '',
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
          for (let q = 0; q < (item.qty || 1); q++) {
            const suffix = item.qty > 1 ? ` ${q + 1}` : ''
            allItems.push({
              feeder_ref: `${sectionName} \u2014 ${item.name || item.label}${suffix}`,
              type: item.id,
              name: item.name || `${item.label}${suffix}`,
              qty: 1,
              drawing: 'SLD (Manual)',
            })
          }
        }
      }
      
      if (section.feeders) {
        // Feeder-grid section
        for (const feeder of section.feeders) {
          if (!feeder.ref.trim()) continue
          const feederRef = `${sectionName} \u2014 ${feeder.ref}`
          for (const eqId of feeder.equipment) {
            allItems.push({
              feeder_ref: feederRef,
              type: eqId,
              name: eqId === 'CT2' ? 'CT-T2' : eqId,
              qty: 1,
              drawing: 'SLD (Manual)',
              feeder_type: feeder.type,
            })
          }
        }
      }
    }

    if (allItems.length === 0) return
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
          <div style={{ fontSize: 14, fontWeight: 700 }}>📋 COR Section Builder</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
            Add sections matching your COR scope — each section becomes a sheet in the Excel output
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
            {SECTION_TYPES.map(st => (
              <button key={st.id} onClick={() => addSection(st.id)} style={{
                padding: '8px 14px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer',
                color: '#475569', transition: 'all 0.15s'
              }}
                onMouseEnter={e => { e.target.style.borderColor = '#FF9900'; e.target.style.background = '#fffbeb' }}
                onMouseLeave={e => { e.target.style.borderColor = '#d1d5db'; e.target.style.background = '#fff' }}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        {sections.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              {sections.length} section{sections.length !== 1 ? 's' : ''} configured
            </span>
            <button onClick={handleSubmit} style={{
              background: '#FF9900', color: '#fff', border: 'none',
              borderRadius: 6, padding: '10px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer'
            }}>
              Add to Equipment List
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
