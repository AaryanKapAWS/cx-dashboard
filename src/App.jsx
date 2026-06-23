import { useState, useEffect } from 'react'
import TopBar from './components/TopBar'
import Pipeline from './components/Pipeline'
import StatsRow from './components/StatsRow'
import Charts from './components/Charts'
import Timeline from './components/Timeline'
import EquipmentTable from './components/EquipmentTable'
import TestDetail from './components/TestDetail'
import UploadPanel from './components/UploadPanel'
import FeederBuilder from './components/FeederBuilder'
import SectionBuilder from './components/SectionBuilder'
import projects from './data/projects.json'
import { generateCOR } from './utils/corGenerator'

export default function App() {
  const [version, setVersion] = useState('v3')
  const [selectedProject, setSelectedProject] = useState(projects[0])
  const [equipment, setEquipment] = useState([])
  const [selectedRow, setSelectedRow] = useState(null)
  const [toast, setToast] = useState(null)

  // V2 state (clean equipment list, independent of project data)
  const [v2Equipment, setV2Equipment] = useState([])
  const [v2SelectedRow, setV2SelectedRow] = useState(null)

  // V3 state (manual feeder builder only)
  const [v3Equipment, setV3Equipment] = useState([])
  const [v3SelectedRow, setV3SelectedRow] = useState(null)

  useEffect(() => {
    setSelectedRow(null)
  }, [selectedProject])

  function handleAdd(newItems, filename) {
    if (version === 'v1') {
      setEquipment(prev => [...prev, ...newItems])
    } else {
      setV2Equipment(prev => [...prev, ...newItems])
    }
    setToast({ message: `Added ${newItems.length} item${newItems.length !== 1 ? 's' : ''} from ${filename}` })
    setTimeout(() => setToast(null), 4000)
  }

  function handleFeederAdd(items) {
    if (version === 'v2') {
      setV2Equipment(prev => [...prev, ...items])
    } else {
      setV3Equipment(prev => [...prev, ...items])
    }
    const count = items.length
    setToast({ message: `Added ${count} equipment items from Feeder Builder` })
    setTimeout(() => setToast(null), 4000)
  }

  async function handleGenerateCOR() {
    if (v2Equipment.length === 0) {
      setToast({ message: '⚠ No equipment to export — add items first' })
      setTimeout(() => setToast(null), 4000)
      return
    }
    const result = await generateCOR(v2Equipment, selectedProject?.name || 'HV Substation')
    setToast({ message: `✓ COR exported — ${result.tests} tests across ${result.items} items (${result.sheets} sheets)` })
    setTimeout(() => setToast(null), 5000)
  }

  async function handleGenerateCORv3() {
    if (v3Equipment.length === 0) {
      setToast({ message: '⚠ No equipment to export — add items first' })
      setTimeout(() => setToast(null), 4000)
      return
    }
    const result = await generateCOR(v3Equipment, 'HV Substation')
    setToast({ message: `✓ COR exported — ${result.tests} tests across ${result.items} items (${result.sheets} sheets)` })
    setTimeout(() => setToast(null), 5000)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>
      {/* Version Toggle */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 1000,
        background: '#0f172a', borderBottom: '1px solid #1e293b',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '8px 0', gap: 4
      }}>
        <button
          onClick={() => setVersion('v1')}
          style={{
            padding: '6px 18px', borderRadius: 6, fontSize: 12, fontWeight: 700,
            border: version === 'v1' ? '2px solid #FF9900' : '1px solid #475569',
            background: version === 'v1' ? '#FF9900' : 'transparent',
            color: version === 'v1' ? '#000' : '#94a3b8',
            cursor: 'pointer', transition: 'all 0.2s'
          }}
        >
          v1 — Demo / Exploration
        </button>
        <span style={{ color: '#475569', fontSize: 18, margin: '0 8px' }}>→</span>
        <button
          onClick={() => setVersion('v2')}
          style={{
            padding: '6px 18px', borderRadius: 6, fontSize: 12, fontWeight: 700,
            border: version === 'v2' ? '2px solid #FF9900' : '1px solid #475569',
            background: version === 'v2' ? '#FF9900' : 'transparent',
            color: version === 'v2' ? '#000' : '#94a3b8',
            cursor: 'pointer', transition: 'all 0.2s'
          }}
        >
          v2 — Dev Tool (SLD → COR)
        </button>
        <span style={{ color: '#475569', fontSize: 18, margin: '0 8px' }}>→</span>
        <button
          onClick={() => setVersion('v3')}
          style={{
            padding: '6px 18px', borderRadius: 6, fontSize: 12, fontWeight: 700,
            border: version === 'v3' ? '2px solid #FF9900' : '1px solid #475569',
            background: version === 'v3' ? '#FF9900' : 'transparent',
            color: version === 'v3' ? '#000' : '#94a3b8',
            cursor: 'pointer', transition: 'all 0.2s'
          }}
        >
          v3 — Manual Entry → COR
        </button>
      </div>

      {/* ============ V1: FULL DEMO ============ */}
      {version === 'v1' && (
        <>
          <TopBar projects={projects} selectedProject={selectedProject} onProjectChange={setSelectedProject} />
          <Pipeline />
          <UploadPanel onAdd={handleAdd} />
          <StatsRow equipment={equipment} />
          <Charts equipment={equipment} />
          <Timeline equipment={equipment} />
          <EquipmentTable equipment={equipment} selectedIndex={selectedRow} onSelect={setSelectedRow} />
          {selectedRow !== null && <TestDetail equipment={equipment[selectedRow]} />}
        </>
      )}

      {/* ============ V2: DEV TOOL ============ */}
      {version === 'v2' && (
        <>
          {/* Header */}
          <div style={{
            padding: '24px 32px 16px', background: '#1e293b',
            borderBottom: '1px solid #334155'
          }}>
            <h1 style={{ margin: 0, color: '#fff', fontSize: 20, fontWeight: 700 }}>
              ⚡ SLD → Equipment List → COR
            </h1>
            <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: 13 }}>
              Parse SLD or manually build feeder equipment list, then generate Commissioning Operations Record
            </p>
          </div>

          {/* Step Indicators */}
          <div style={{
            display: 'flex', gap: 0, margin: '20px 32px 0',
            background: '#fff', borderRadius: 8, overflow: 'hidden',
            border: '1px solid #e2e8f0'
          }}>
            {[
              { num: '1', label: 'Upload SLD / Build Feeders', desc: 'Input equipment data' },
              { num: '2', label: 'Review Equipment List', desc: `${v2Equipment.length} items` },
              { num: '3', label: 'Generate COR', desc: 'Export to Excel' },
            ].map((step, i) => (
              <div key={i} style={{
                flex: 1, padding: '14px 16px',
                borderRight: i < 2 ? '1px solid #e2e8f0' : 'none',
                background: (i === 0 && v2Equipment.length === 0) ? '#fffbeb' :
                             (i === 1 && v2Equipment.length > 0) ? '#fffbeb' : '#fff'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: '#FF9900', color: '#000',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700
                  }}>{step.num}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{step.label}</span>
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 3, marginLeft: 30 }}>{step.desc}</div>
              </div>
            ))}
          </div>

          {/* Upload SLD */}
          <UploadPanel onAdd={handleAdd} />

          {/* Feeder Builder */}
          <SectionBuilder onSubmit={(items, projName) => { setV3Equipment(prev => [...prev, ...items]); setToast({ message: `Added ${items.length} equipment items` }); setTimeout(() => setToast(null), 4000) }} />

          {/* Equipment Table */}
          {v2Equipment.length > 0 && (
            <>
              <EquipmentTable equipment={v2Equipment} selectedIndex={v2SelectedRow} onSelect={setV2SelectedRow} />
              {v2SelectedRow !== null && v2Equipment[v2SelectedRow] && <TestDetail equipment={v2Equipment[v2SelectedRow]} />}
            </>
          )}

          {/* Generate COR Button */}
          <div style={{ margin: '20px 32px', display: 'flex', gap: 12, alignItems: 'center' }}>
            <button onClick={handleGenerateCOR} style={{
              background: v2Equipment.length > 0 ? '#16a34a' : '#94a3b8',
              color: '#fff', border: 'none', borderRadius: 8,
              padding: '14px 32px', fontSize: 14, fontWeight: 700,
              cursor: v2Equipment.length > 0 ? 'pointer' : 'not-allowed',
              boxShadow: v2Equipment.length > 0 ? '0 2px 8px rgba(22,163,74,0.3)' : 'none'
            }}>
              📋 Generate COR
            </button>
            <button disabled style={{
              background: 'transparent', color: '#94a3b8', border: '1px solid #cbd5e1',
              borderRadius: 8, padding: '14px 24px', fontSize: 13, fontWeight: 600,
              cursor: 'not-allowed', opacity: 0.5
            }}>
              🔄 Generate RFQ (coming soon)
            </button>
            <button disabled style={{
              background: 'transparent', color: '#94a3b8', border: '1px solid #cbd5e1',
              borderRadius: 8, padding: '14px 24px', fontSize: 13, fontWeight: 600,
              cursor: 'not-allowed', opacity: 0.5
            }}>
              ☁️ Bulk Upload to Procore (coming soon)
            </button>
          </div>

          {/* Empty State */}
          {v2Equipment.length === 0 && (
            <div style={{
              margin: '20px 32px', padding: '40px', textAlign: 'center',
              border: '2px dashed #e2e8f0', borderRadius: 10, color: '#94a3b8'
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📐</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>No equipment yet</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Upload an SLD PDF or use the Feeder Builder above to add equipment</div>
            </div>
          )}
        </>
      )}

      {/* ============ V3: MANUAL ENTRY ============ */}
      {version === 'v3' && (
        <>
          {/* Header */}
          <div style={{
            padding: '24px 32px 16px', background: '#1e293b',
            borderBottom: '1px solid #334155'
          }}>
            <h1 style={{ margin: 0, color: '#fff', fontSize: 20, fontWeight: 700 }}>
              📋 Manual Equipment Entry → COR
            </h1>
            <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: 13 }}>
              Manually define switchgear feeders and tick equipment per feeder, then generate COR
            </p>
          </div>

          {/* Step Indicators */}
          <div style={{
            display: 'flex', gap: 0, margin: '20px 32px 0',
            background: '#fff', borderRadius: 8, overflow: 'hidden',
            border: '1px solid #e2e8f0'
          }}>
            {[
              { num: '1', label: 'Build Feeders', desc: 'Define switchgear + tick equipment' },
              { num: '2', label: 'Review Equipment List', desc: `${v3Equipment.length} items` },
              { num: '3', label: 'Generate COR', desc: 'Export to Excel/CSV' },
            ].map((step, i) => (
              <div key={i} style={{
                flex: 1, padding: '14px 16px',
                borderRight: i < 2 ? '1px solid #e2e8f0' : 'none',
                background: (i === 0 && v3Equipment.length === 0) ? '#fffbeb' :
                             (i === 1 && v3Equipment.length > 0) ? '#fffbeb' : '#fff'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: '#FF9900', color: '#000',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700
                  }}>{step.num}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{step.label}</span>
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 3, marginLeft: 30 }}>{step.desc}</div>
              </div>
            ))}
          </div>

          {/* Feeder Builder */}
          <SectionBuilder onSubmit={(items) => { setV3Equipment(prev => [...prev, ...items]); setToast({ message: `Added ${items.length} equipment items` }); setTimeout(() => setToast(null), 4000) }} />

          {/* Equipment Table */}
          {v3Equipment.length > 0 && (
            <>
              <EquipmentTable equipment={v3Equipment} selectedIndex={v3SelectedRow} onSelect={setV3SelectedRow} />
              {v3SelectedRow !== null && v3Equipment[v3SelectedRow] && <TestDetail equipment={v3Equipment[v3SelectedRow]} />}
            </>
          )}

          {/* Generate COR Button */}
          <div style={{ margin: '20px 32px', display: 'flex', gap: 12, alignItems: 'center' }}>
            <button onClick={handleGenerateCORv3} style={{
              background: v3Equipment.length > 0 ? '#16a34a' : '#94a3b8',
              color: '#fff', border: 'none', borderRadius: 8,
              padding: '14px 32px', fontSize: 14, fontWeight: 700,
              cursor: v3Equipment.length > 0 ? 'pointer' : 'not-allowed',
              boxShadow: v3Equipment.length > 0 ? '0 2px 8px rgba(22,163,74,0.3)' : 'none'
            }}>
              📋 Generate COR
            </button>
          </div>

          {/* Empty State */}
          {v3Equipment.length === 0 && (
            <div style={{
              margin: '20px 32px', padding: '40px', textAlign: 'center',
              border: '2px dashed #e2e8f0', borderRadius: 10, color: '#94a3b8'
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>⚡</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>No equipment yet</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Use the Feeder Builder above — name your switchgear, add feeders, tick equipment per feeder</div>
            </div>
          )}
        </>
      )}

      <div style={{ height: 40 }} />

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 32,
          background: '#1e293b', color: '#fff',
          padding: '12px 20px', borderRadius: 8,
          fontSize: 13, fontWeight: 500,
          borderLeft: '4px solid #FF9900',
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          animation: 'slideUp 0.2s ease',
        }}>
          <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }`}</style>
          {toast.message}
        </div>
      )}
    </div>
  )
}
