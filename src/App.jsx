import { useState, useEffect } from 'react'
import EquipmentTable from './components/EquipmentTable'
// import TestDetail from './components/TestDetail' // replaced by inline TestCustomiser
import SectionBuilder from './components/SectionBuilder'
import DocsReference from './components/DocsReference'
import { generateCOR } from './utils/corGenerator'
import { generateInspectionUpload } from './utils/inspectionUploadGenerator'

export default function App() {
  const [tab, setTab] = useState('builder')
  const [equipment, setEquipment] = useState([])
  const [selectedRow, setSelectedRow] = useState(null)
  const [toast, setToast] = useState(null)
  const [projectLocation, setProjectLocation] = useState('')
  const [projectFbnId, setProjectFbnId] = useState('')
  const [projectName, setProjectName] = useState('')
  const [projectRegion, setProjectRegion] = useState('EMEA')
  const [uploadMode, setUploadMode] = useState('section') // 'section' or 'retro'

  function handleRename(equipIdx, newName) {
    setEquipment(prev => prev.map((item, i) => 
      i === equipIdx ? { ...item, displayName: newName } : item
    ))
  }

  function handleUpdateTests(equipIdx, newTests) {
    setEquipment(prev => prev.map((item, i) => 
      i === equipIdx ? { ...item, customTests: newTests } : item
    ))
  }

  async function handleGenerateCOR() {
    if (equipment.length === 0) {
      setToast({ message: '⚠ No equipment to export — add items first' })
      setTimeout(() => setToast(null), 4000)
      return
    }
    const result = await generateCOR(equipment, projectName || 'HV Substation')
    setToast({ message: `✓ COR exported — ${result.totalTests} tests across ${result.sections} sections` })
    setTimeout(() => setToast(null), 5000)
  }

  async function handleGenerateUpload() {
    if (equipment.length === 0) {
      setToast({ message: '⚠ No equipment to export — add items first' })
      setTimeout(() => setToast(null), 4000)
      return
    }
    const projectConfig = {
      name: projectName,
      location: projectLocation,
      fbnBuildId: projectFbnId,
      region: projectRegion,
      mode: uploadMode,
    }
    const result = await generateInspectionUpload(equipment, projectConfig)
    setToast({ message: `✓ Upload file exported — ${result.inspections} inspections` })
    setTimeout(() => setToast(null), 5000)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>
      {/* Tab Bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 1000,
        background: '#0f172a', borderBottom: '1px solid #1e293b',
        display: 'flex', alignItems: 'center', padding: '0 24px', height: 48
      }}>
        <div style={{ display: 'flex', gap: 2 }}>
          <button
            onClick={() => setTab('builder')}
            style={{
              padding: '10px 24px', fontSize: 13, fontWeight: 600,
              border: 'none', borderBottom: tab === 'builder' ? '2px solid #FF9900' : '2px solid transparent',
              background: 'transparent',
              color: tab === 'builder' ? '#fff' : '#94a3b8',
              cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            ⚡ Scope & Export
          </button>
          <button
            onClick={() => setTab('docs')}
            style={{
              padding: '10px 24px', fontSize: 13, fontWeight: 600,
              border: 'none', borderBottom: tab === 'docs' ? '2px solid #38bdf8' : '2px solid transparent',
              background: 'transparent',
              color: tab === 'docs' ? '#fff' : '#94a3b8',
              cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            📖 Docs / Reference
          </button>
        </div>
        <div style={{ marginLeft: 'auto', color: '#64748b', fontSize: 11 }}>
          HV Substation Commissioning Tool
        </div>
      </div>

      {/* ============ BUILDER TAB ============ */}
      {tab === 'builder' && (
        <>
          {/* Header */}
          <div style={{
            padding: '24px 32px 16px', background: '#1e293b',
            borderBottom: '1px solid #334155'
          }}>
            <h1 style={{ margin: 0, color: '#fff', fontSize: 20, fontWeight: 700 }}>
              ⚡ HV Substation Commissioning Tool
            </h1>
            <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: 13 }}>
              Build equipment scope, generate COR test sheets & Procore inspection upload
            </p>
          </div>

          {/* Step Indicators */}
          <div style={{
            display: 'flex', gap: 0, margin: '20px 32px 0',
            background: '#fff', borderRadius: 8, overflow: 'hidden',
            border: '1px solid #e2e8f0'
          }}>
            {[
              { num: '1', label: 'Build Equipment', desc: 'Define sections + tick equipment' },
              { num: '2', label: 'Review List', desc: `${equipment.length} items` },
              { num: '3', label: 'Export', desc: 'COR or Upload File' },
            ].map((step, i) => (
              <div key={i} style={{
                flex: 1, padding: '14px 16px',
                borderRight: i < 2 ? '1px solid #e2e8f0' : 'none',
                background: (i === 0 && equipment.length === 0) ? '#fffbeb' :
                             (i === 1 && equipment.length > 0) ? '#fffbeb' : '#fff'
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

          {/* Project Config Inputs */}
          <div style={{
            margin: '20px 32px 0', padding: '16px 20px',
            background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0',
            display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap'
          }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Location (Site Code)</label>
              <input
                value={projectLocation}
                onChange={(e) => setProjectLocation(e.target.value)}
                placeholder="e.g. AWS101, DUB69"
                style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, width: 160 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>FBN Build ID</label>
              <input
                value={projectFbnId}
                onChange={(e) => setProjectFbnId(e.target.value)}
                placeholder="e.g. DUB069HV4T.001"
                style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, width: 180 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Project Name</label>
              <input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g. DUB069HV - 4th Transformer"
                style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, width: 240 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Cx Region</label>
              <select
                value={projectRegion}
                onChange={(e) => setProjectRegion(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13, width: 160 }}
              >
                <option value="EMEA">EMEA</option>
                <option value="AMER-US EAST">AMER-US EAST</option>
                <option value="AMER-US WEST">AMER-US WEST</option>
                <option value="AMER-US CENTRAL">AMER-US CENTRAL</option>
                <option value="APAC">APAC</option>
              </select>
            </div>
          </div>

          {/* Section Builder */}
          <SectionBuilder onSubmit={(items) => { setEquipment(items); setSelectedRow(null) }} />

          {/* Equipment Table */}
          {equipment.length > 0 && (
            <>
              <EquipmentTable equipment={equipment} selectedIndex={selectedRow} onSelect={setSelectedRow} onUpdateTests={handleUpdateTests} onRename={handleRename}
                onRemove={(idx) => {
                  if (idx === 'all') { setEquipment([]); setSelectedRow(null) }
                  else { setEquipment(prev => prev.filter((_, i) => i !== idx)); setSelectedRow(null) }
                }} />
              
            </>
          )}

          {/* Export Buttons */}
          <div style={{ margin: '20px 32px', display: 'flex', gap: 12, alignItems: 'center' }}>
            <button onClick={handleGenerateCOR} style={{
              background: equipment.length > 0 ? '#16a34a' : '#94a3b8',
              color: '#fff', border: 'none', borderRadius: 8,
              padding: '14px 32px', fontSize: 14, fontWeight: 700,
              cursor: equipment.length > 0 ? 'pointer' : 'not-allowed',
              boxShadow: equipment.length > 0 ? '0 2px 8px rgba(22,163,74,0.3)' : 'none'
            }}>
              📋 Generate COR
            </button>
            <button onClick={handleGenerateUpload} style={{
              background: equipment.length > 0 ? '#2563eb' : '#94a3b8',
              color: '#fff', border: 'none', borderRadius: 8,
              padding: '14px 32px', fontSize: 14, fontWeight: 700,
              cursor: equipment.length > 0 ? 'pointer' : 'not-allowed',
              boxShadow: equipment.length > 0 ? '0 2px 8px rgba(37,99,235,0.3)' : 'none'
            }}>
              📤 Generate Upload File
            </button>

            {/* Upload Mode Toggle */}
            <div style={{
              marginLeft: 8, display: 'flex', alignItems: 'center', gap: 8,
              background: '#f1f5f9', padding: '8px 14px', borderRadius: 8,
              border: '1px solid #e2e8f0'
            }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>Mode:</span>
              <button onClick={() => setUploadMode('section')} style={{
                padding: '5px 12px', borderRadius: 5, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer',
                background: uploadMode === 'section' ? '#2563eb' : '#e2e8f0',
                color: uploadMode === 'section' ? '#fff' : '#64748b',
              }}>Section</button>
              <button onClick={() => setUploadMode('retro')} style={{
                padding: '5px 12px', borderRadius: 5, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer',
                background: uploadMode === 'retro' ? '#f59e0b' : '#e2e8f0',
                color: uploadMode === 'retro' ? '#fff' : '#64748b',
              }}>Per Equipment</button>
            </div>
          </div>

          {/* Empty State */}
          {equipment.length === 0 && (
            <div style={{
              margin: '20px 32px', padding: '40px', textAlign: 'center',
              border: '2px dashed #e2e8f0', borderRadius: 10, color: '#94a3b8'
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>⚡</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>No equipment yet</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Use the Section Builder above to add equipment by section type</div>
            </div>
          )}
        </>
      )}

      {/* ============ DOCS TAB ============ */}
      {tab === 'docs' && (
        <DocsReference />
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
