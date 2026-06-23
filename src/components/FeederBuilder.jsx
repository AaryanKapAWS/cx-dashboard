import { useState } from 'react'

const EQUIPMENT_TYPES = [
  { id: 'CT', label: 'CT' },
  { id: 'VT', label: 'VT' },
  { id: 'TRANSFORMER', label: 'Transformer' },
  { id: 'BUSBAR', label: 'Busbar' },
  { id: 'PQM', label: 'PQM' },
  { id: 'EPMS', label: 'EPMS' },
  { id: 'RELAY', label: 'Relay' },
  { id: 'ENERGIZATION', label: 'Energization' },
]

const FEEDER_TYPES = [
  { id: 'incomer', label: 'Incomer', defaults: ['CT', 'VT', 'RELAY', 'BUSBAR', 'ENERGIZATION'] },
  { id: 'bus_coupler', label: 'Bus Coupler', defaults: ['CT', 'RELAY', 'BUSBAR'] },
  { id: 'ner', label: 'NER', defaults: ['CT', 'RELAY'] },
  { id: 'vt_panel', label: 'VT Panel', defaults: ['VT', 'PQM', 'RELAY'] },
  { id: 'outgoing', label: 'Outgoing Feeder', defaults: ['CT', 'RELAY', 'EPMS', 'ENERGIZATION'] },
  { id: 'xfmr', label: 'Transformer Feeder', defaults: ['CT', 'TRANSFORMER', 'RELAY', 'EPMS', 'ENERGIZATION'] },
  { id: 'custom', label: 'Custom', defaults: ['CT', 'RELAY'] },
]

function createFeederRow(ref = '', feederType = 'outgoing') {
  const type = FEEDER_TYPES.find(f => f.id === feederType) || FEEDER_TYPES[4]
  return { ref, feederType: type.id, equipment: [...type.defaults] }
}

export default function FeederBuilder({ onAddFeeders }) {
  const [switchgears, setSwitchgears] = useState([
    { name: '', feeders: [createFeederRow()] }
  ])
  const [expanded, setExpanded] = useState(false)

  // --- Switchgear management ---
  function addSwitchgear() {
    setSwitchgears(prev => [...prev, { name: '', feeders: [createFeederRow()] }])
  }

  function removeSwitchgear(sgIdx) {
    setSwitchgears(prev => prev.filter((_, i) => i !== sgIdx))
  }

  function updateSwitchgearName(sgIdx, val) {
    setSwitchgears(prev => prev.map((sg, i) => i === sgIdx ? { ...sg, name: val } : sg))
  }

  // --- Feeder management ---
  function addFeederRow(sgIdx) {
    setSwitchgears(prev => prev.map((sg, i) =>
      i === sgIdx ? { ...sg, feeders: [...sg.feeders, createFeederRow()] } : sg
    ))
  }

  function removeFeeder(sgIdx, fIdx) {
    setSwitchgears(prev => prev.map((sg, i) =>
      i === sgIdx ? { ...sg, feeders: sg.feeders.filter((_, j) => j !== fIdx) } : sg
    ))
  }

  function updateFeederRef(sgIdx, fIdx, val) {
    setSwitchgears(prev => prev.map((sg, i) =>
      i === sgIdx ? { ...sg, feeders: sg.feeders.map((f, j) => j === fIdx ? { ...f, ref: val } : f) } : sg
    ))
  }

  function updateFeederType(sgIdx, fIdx, typeId) {
    const type = FEEDER_TYPES.find(f => f.id === typeId) || FEEDER_TYPES[6]
    setSwitchgears(prev => prev.map((sg, i) =>
      i === sgIdx ? { ...sg, feeders: sg.feeders.map((f, j) =>
        j === fIdx ? { ...f, feederType: typeId, equipment: [...type.defaults] } : f
      ) } : sg
    ))
  }

  function toggleEquipment(sgIdx, fIdx, eqId) {
    setSwitchgears(prev => prev.map((sg, i) =>
      i === sgIdx ? { ...sg, feeders: sg.feeders.map((f, j) => {
        if (j !== fIdx) return f
        const has = f.equipment.includes(eqId)
        return { ...f, equipment: has ? f.equipment.filter(e => e !== eqId) : [...f.equipment, eqId] }
      }) } : sg
    ))
  }

  function handleQuickAdd(sgIdx) {
    const count = parseInt(prompt('How many feeders?') || '0')
    if (!count) return
    const typeId = prompt('Feeder type? (incomer / bus_coupler / ner / vt_panel / outgoing / xfmr)') || 'outgoing'
    const validType = FEEDER_TYPES.find(f => f.id === typeId) ? typeId : 'outgoing'
    const newFeeders = []
    for (let i = 1; i <= count; i++) {
      const num = String(i).padStart(2, '0')
      newFeeders.push(createFeederRow(`${num}A`, validType))
    }
    setSwitchgears(prev => prev.map((sg, i) =>
      i === sgIdx ? { ...sg, feeders: [...sg.feeders.filter(f => f.ref), ...newFeeders] } : sg
    ))
  }

  function handleSubmit() {
    const items = []
    for (const sg of switchgears) {
      if (!sg.name.trim()) {
        // If no name but has feeders with refs, use a default name
        const hasData = sg.feeders.some(f => f.ref.trim())
        if (hasData) {
          sg.name = 'Switchgear 1'
        } else {
          continue
        }
      }
      const validFeeders = sg.feeders.filter(f => f.ref.trim())
      if (validFeeders.length === 0) continue
      for (const feeder of validFeeders) {
        const feederRef = `${sg.name} — ${feeder.ref}`
        for (const eqId of feeder.equipment) {
          items.push({
            feeder_ref: feederRef,
            type: eqId,
            name: `${eqId}${eqId === 'CT' ? '-T1' : eqId === 'TRANSFORMER' ? ` (${sg.name} ${feeder.ref})` : ''}`,
            qty: 1,
            drawing: 'SLD (Manual)',
            feeder_type: feeder.feederType,
          })
        }
      }
    }

    if (items.length === 0) return
    onAddFeeders(items)

    // Reset
    setSwitchgears([{ name: '', feeders: [createFeederRow()] }])
    setExpanded(false)
  }

  const totalItems = switchgears.reduce((sum, sg) =>
    sum + sg.feeders.filter(f => f.ref).reduce((s, f) => s + f.equipment.length, 0), 0
  )

  if (!expanded) {
    return (
      <div style={{ margin: '16px 32px 0' }}>
        <button onClick={() => setExpanded(true)} style={{
          width: '100%', padding: '14px', border: '2px dashed #cbd5e1',
          borderRadius: 10, background: '#f8fafc', cursor: 'pointer',
          fontSize: 13, fontWeight: 600, color: '#475569',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 18 }}>⚡</span>
          Feeder Builder — Add equipment from SLD
        </button>
      </div>
    )
  }

  return (
    <div style={{
      margin: '16px 32px 0', background: 'var(--card-bg, #fff)',
      border: '1px solid var(--border, #e2e8f0)', borderRadius: 10, overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px', background: '#232F3E', color: '#fff',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>⚡ Feeder Builder</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
            Add switchgear → define feeders → tick equipment per feeder
          </div>
        </div>
        <button onClick={() => setExpanded(false)} style={{
          background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 18
        }}>✕</button>
      </div>

      <div style={{ padding: '16px 20px' }}>
        {/* Switchgear sections */}
        {switchgears.map((sg, sgIdx) => (
          <div key={sgIdx} style={{
            marginBottom: 20, padding: 16, borderRadius: 8,
            border: '1px solid #e2e8f0', background: '#fafbfc'
          }}>
            {/* Switchgear header */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%', background: '#FF9900',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: '#000', flexShrink: 0
              }}>{sgIdx + 1}</div>
              <input
                value={sg.name}
                onChange={e => updateSwitchgearName(sgIdx, e.target.value)}
                placeholder="Switchgear / Room name (e.g. MV SUB 2, 220kV Bay - T221)"
                style={{
                  flex: 1, padding: '10px 12px',
                  border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, fontWeight: 600
                }}
              />
              {switchgears.length > 1 && (
                <button onClick={() => removeSwitchgear(sgIdx)} style={{
                  background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 16
                }}>✕</button>
              )}
            </div>

            {/* Quick Add + feeder count */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                Feeders ({sg.feeders.length})
              </span>
              <button onClick={() => handleQuickAdd(sgIdx)} style={{
                background: 'none', border: '1px solid #d1d5db', borderRadius: 4,
                padding: '3px 10px', fontSize: 11, cursor: 'pointer', color: '#FF9900', fontWeight: 600
              }}>
                Quick Add (numbered)
              </button>
            </div>

            {/* Column headers */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '90px 120px repeat(8, 1fr) 30px',
              gap: 2, marginBottom: 4, padding: '0 4px'
            }}>
              <span style={{ fontSize: 9, fontWeight: 600, color: '#64748b' }}>REF</span>
              <span style={{ fontSize: 9, fontWeight: 600, color: '#64748b' }}>TYPE</span>
              {EQUIPMENT_TYPES.map(eq => (
                <span key={eq.id} style={{ fontSize: 9, fontWeight: 600, color: '#64748b', textAlign: 'center' }}>
                  {eq.label}
                </span>
              ))}
              <span></span>
            </div>

            {/* Feeder rows */}
            {sg.feeders.map((feeder, fIdx) => (
              <div key={fIdx} style={{
                display: 'grid',
                gridTemplateColumns: '90px 120px repeat(8, 1fr) 30px',
                gap: 2, marginBottom: 3, alignItems: 'center',
                padding: '4px', borderRadius: 4,
                background: fIdx % 2 === 0 ? '#f1f5f9' : 'transparent'
              }}>
                <input
                  value={feeder.ref}
                  onChange={e => updateFeederRef(sgIdx, fIdx, e.target.value)}
                  placeholder={`${String(fIdx + 1).padStart(2, '0')}A`}
                  style={{
                    padding: '5px 6px', border: '1px solid #d1d5db',
                    borderRadius: 4, fontSize: 11, width: '100%'
                  }}
                />
                <select
                  value={feeder.feederType}
                  onChange={e => updateFeederType(sgIdx, fIdx, e.target.value)}
                  style={{
                    padding: '5px 4px', border: '1px solid #d1d5db',
                    borderRadius: 4, fontSize: 10, width: '100%',
                    background: '#fff'
                  }}
                >
                  {FEEDER_TYPES.map(ft => (
                    <option key={ft.id} value={ft.id}>{ft.label}</option>
                  ))}
                </select>
                {EQUIPMENT_TYPES.map(eq => (
                  <div key={eq.id} style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={feeder.equipment.includes(eq.id)}
                      onChange={() => toggleEquipment(sgIdx, fIdx, eq.id)}
                      style={{ cursor: 'pointer', width: 15, height: 15, accentColor: '#FF9900' }}
                    />
                  </div>
                ))}
                <button onClick={() => removeFeeder(sgIdx, fIdx)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 13
                }}>×</button>
              </div>
            ))}

            <button onClick={() => addFeederRow(sgIdx)} style={{
              marginTop: 8, background: 'none', border: '1px dashed #cbd5e1',
              borderRadius: 4, padding: '6px 12px', fontSize: 11, cursor: 'pointer',
              color: '#64748b', width: '100%'
            }}>
              + Add feeder row
            </button>
          </div>
        ))}

        {/* Add another switchgear */}
        <button onClick={addSwitchgear} style={{
          width: '100%', padding: '10px', border: '2px dashed #FF9900',
          borderRadius: 8, background: '#fffbeb', cursor: 'pointer',
          fontSize: 12, fontWeight: 600, color: '#92400e',
          marginBottom: 16
        }}>
          + Add another switchgear (e.g. MV SUB 4)
        </button>

        {/* Submit */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#64748b' }}>
            {switchgears.length} switchgear × {switchgears.reduce((s, sg) => s + sg.feeders.filter(f => f.ref).length, 0)} feeders = ~{totalItems} items
          </span>
          <button onClick={handleSubmit} style={{
            background: '#FF9900', color: '#fff', border: 'none',
            borderRadius: 6, padding: '10px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer'
          }}>
            Add to Equipment List
          </button>
        </div>
      </div>
    </div>
  )
}
