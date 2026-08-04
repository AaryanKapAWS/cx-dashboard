import { useState, useEffect } from 'react'
import EquipmentTable from './components/EquipmentTable'
import SectionBuilder from './components/SectionBuilder'
import BayBuilder from './components/BayBuilder'
import DocsReference from './components/DocsReference'
import SLDViewer from './components/SLDViewer'
import { generateCOR } from './utils/corGenerator'
import { generateInspectionUpload } from './utils/inspectionUploadGenerator'

// ─── TOP-LEVEL MODES ────────────────────────────────────────────────────────
const MODES = {
  bay: { label: 'Option 1: Bay Builder', desc: 'Topology-based — add bays to busbar', colour: '#8e44ad' },
  section: { label: 'Option 2: Section Builder', desc: 'Section-based — auto-populated defaults', colour: '#FF9900' },
}

export default function App() {
  const [mode, setMode] = useState(() => localStorage.getItem('app_mode') || 'bay')
  const [tab, setTab] = useState('builder')

  // ── Section Builder state (Option 2) ──
  const [equipment, setEquipment] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cor_equipment')) || [] } catch { return [] }
  })
  const [selectedRow, setSelectedRow] = useState(null)

  // ── Bay Builder state (Option 1) ──
  const [bayEquipment, setBayEquipment] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bay_equipment')) || [] } catch { return [] }
  })
  const [baySelectedRow, setBaySelectedRow] = useState(null)
  const [uploadMode, setUploadMode] = useState('section') // 'section' or 'individual'
  const [bayActiveSection, setBayActiveSection] = useState(null) // name of selected section for filtering register

  // ── Shared state ──
  const [toast, setToast] = useState(null)
  const [projectLocation, setProjectLocation] = useState(() => localStorage.getItem('cor_location') || '')
  const [projectFbnId, setProjectFbnId] = useState(() => localStorage.getItem('cor_fbnId') || '')
  const [projectName, setProjectName] = useState(() => localStorage.getItem('cor_projectName') || '')
  const [projectRegion, setProjectRegion] = useState(() => localStorage.getItem('cor_region') || 'EMEA')

  // Auto-save
  useEffect(() => { localStorage.setItem('app_mode', mode) }, [mode])
  useEffect(() => { localStorage.setItem('cor_equipment', JSON.stringify(equipment)) }, [equipment])
  useEffect(() => { localStorage.setItem('bay_equipment', JSON.stringify(bayEquipment)) }, [bayEquipment])
  useEffect(() => { localStorage.setItem('cor_location', projectLocation) }, [projectLocation])
  useEffect(() => { localStorage.setItem('cor_fbnId', projectFbnId) }, [projectFbnId])
  useEffect(() => { localStorage.setItem('cor_projectName', projectName) }, [projectName])
  useEffect(() => { localStorage.setItem('cor_region', projectRegion) }, [projectRegion])

  // Get active equipment based on mode
  const activeEquipment = mode === 'bay'
    ? (bayActiveSection
      ? bayEquipment.filter(item => {
          // Show items that:
          // 1. Are top-level items of this section (no parent, feeder_ref starts with section name)
          // 2. ARE this section (child_section matches — these are the section's own items when it's a child)
          // 3. Are direct children of this section (parent_section === bayActiveSection)
          const isTopLevelOwn = !item.parent_section && (item.feeder_ref || '').split(' \u2014 ')[0] === bayActiveSection
          const isThisSection = item.child_section === bayActiveSection
          const isDirectChild = item.parent_section === bayActiveSection
          return isTopLevelOwn || isThisSection || isDirectChild
        })
      : bayEquipment)
    : equipment
  const setActiveEquipment = mode === 'bay' ? setBayEquipment : setEquipment
  const activeSelectedRow = mode === 'bay' ? baySelectedRow : selectedRow
  const setActiveSelectedRow = mode === 'bay' ? setBaySelectedRow : setSelectedRow

  function handleRename(equipIdx, newName) {
    setActiveEquipment(prev => prev.map((item, i) =>
      i === equipIdx ? { ...item, displayName: newName } : item
    ))
  }

  function handleUpdateTests(equipIdx, newTests) {
    setActiveEquipment(prev => prev.map((item, i) =>
      i === equipIdx ? { ...item, customTests: newTests } : item
    ))
  }

  async function handleGenerateCOR() {
    if (activeEquipment.length === 0) {
      setToast({ message: '⚠ No equipment to export — add items first' })
      setTimeout(() => setToast(null), 4000)
      return
    }
    const result = await generateCOR(activeEquipment, projectName || 'HV Substation')
    setToast({ message: `✓ COR exported — ${result.totalTests} tests across ${result.sections} sections` })
    setTimeout(() => setToast(null), 5000)
  }

  async function handleGenerateUpload() {
    if (activeEquipment.length === 0) {
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
    const result = await generateInspectionUpload(activeEquipment, projectConfig)
    setToast({ message: `✓ Upload file exported — ${result.inspections} inspections` })
    setTimeout(() => setToast(null), 5000)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>
      {/* ═══ TOP BAR ═══ */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 1000,
        background: '#0f172a', borderBottom: '1px solid #1e293b',
      }}>
        {/* Mode selector row */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 24px', height: 44, borderBottom: '1px solid #1e293b', gap: 16 }}>
          <div style={{ display: 'flex', gap: 0, background: '#1e293b', borderRadius: 6, padding: 3 }}>
            {Object.entries(MODES).map(([key, m]) => (
              <button key={key} onClick={() => { setMode(key); setTab('builder') }}
                style={{
                  padding: '6px 20px', fontSize: 12, fontWeight: 700,
                  border: 'none',
                  borderRadius: 4, background: mode === key ? m.colour : 'transparent',
                  color: mode === key ? '#fff' : '#94a3b8',
                  cursor: 'pointer', transition: 'all 0.2s',
                  whiteSpace: 'nowrap'
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div style={{ marginLeft: 'auto', color: '#475569', fontSize: 10 }}>
            HV Substation Commissioning Tool
          </div>
        </div>

        {/* Sub-tabs row */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 24px', height: 40 }}>
          <div style={{ display: 'flex', gap: 2 }}>
            <button onClick={() => setTab('builder')} style={{
              padding: '8px 20px', fontSize: 12, fontWeight: 600,
              border: 'none', borderBottom: tab === 'builder' ? `2px solid ${MODES[mode].colour}` : '2px solid transparent',
              background: 'transparent', color: tab === 'builder' ? '#fff' : '#94a3b8',
              cursor: 'pointer'
            }}>⚡ Scope & Export</button>
            <button onClick={() => setTab('sld')} style={{
              padding: '8px 20px', fontSize: 12, fontWeight: 600,
              border: 'none', borderBottom: tab === 'sld' ? '2px solid #27ae60' : '2px solid transparent',
              background: 'transparent', color: tab === 'sld' ? '#fff' : '#94a3b8',
              cursor: 'pointer'
            }}>⚡ SLD View</button>
            <button onClick={() => setTab('docs')} style={{
              padding: '8px 20px', fontSize: 12, fontWeight: 600,
              border: 'none', borderBottom: tab === 'docs' ? '2px solid #38bdf8' : '2px solid transparent',
              background: 'transparent', color: tab === 'docs' ? '#fff' : '#94a3b8',
              cursor: 'pointer'
            }}>📖 Docs</button>
          </div>
        </div>
      </div>

      {/* ═══ TOAST ═══ */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: '#1e293b', color: '#fff', padding: '12px 20px',
          borderRadius: 8, fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}>{toast.message}</div>
      )}

      {/* ═══ SCOPE & EXPORT TAB ═══ */}
      {tab === 'builder' && (
        <>
          {/* Project Config */}
          <div style={{
            margin: '16px 24px 0', padding: '12px 20px',
            background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0',
            display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap'
          }}>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#64748b', marginBottom: 3 }}>Location</label>
              <input value={projectLocation} onChange={(e) => setProjectLocation(e.target.value)}
                placeholder="e.g. DUB69" style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 5, fontSize: 12, width: 120 }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#64748b', marginBottom: 3 }}>FBN Build ID</label>
              <input value={projectFbnId} onChange={(e) => setProjectFbnId(e.target.value)}
                placeholder="e.g. DUB069HV4T.001" style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 5, fontSize: 12, width: 160 }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#64748b', marginBottom: 3 }}>Project Name</label>
              <input value={projectName} onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g. DUB069HV - Substation" style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 5, fontSize: 12, width: 220 }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#64748b', marginBottom: 3 }}>Region</label>
              <select value={projectRegion} onChange={(e) => setProjectRegion(e.target.value)}
                style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 5, fontSize: 12 }}>
                <option>EMEA</option><option>APAC</option><option>AMER</option>
              </select>
            </div>
          </div>

          {/* Builder + Equipment Table */}
          <div style={{ display: 'flex', margin: '16px 24px 16px 24px', gap: 16 }}>
            {/* Left: Builder */}
            <div style={{ flex: '1 1 50%', minWidth: 0, overflow: 'hidden' }}>
              {mode === 'section' ? (
                <SectionBuilder onSubmit={(items) => { setEquipment(items); setSelectedRow(null) }} />
              ) : (
                <BayBuilder onSubmit={(items) => { setBayEquipment(items); setBaySelectedRow(null) }} onSectionChange={setBayActiveSection} />
              )}
            </div>

            {/* Right: Equipment Register + Export */}
            <div style={{ flex: '1 1 35%', minWidth: 0, overflow: 'hidden' }}>
              <EquipmentTable
                equipment={activeEquipment}
                sectionName={mode === 'bay' ? bayActiveSection : null}
                selectedIndex={activeSelectedRow}
                onSelect={setActiveSelectedRow}
                onUpdateTests={handleUpdateTests}
                onRename={mode === 'section' ? handleRename : null}
                onRemove={mode === 'section' ? (idx) => setActiveEquipment(prev => prev.filter((_, i) => i !== idx)) : null}
              />

              {/* Export buttons */}
              <div style={{
                marginTop: 16, padding: 16, background: '#fff', borderRadius: 8,
                border: '1px solid #e2e8f0', display: 'flex', gap: 12, flexWrap: 'wrap'
              }}>
                <button onClick={handleGenerateCOR} style={{
                  padding: '10px 20px', fontSize: 12, fontWeight: 700,
                  background: '#FF9900', color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer'
                }}>📋 Generate COR</button>
                <button onClick={handleGenerateUpload} style={{
                  padding: '10px 20px', fontSize: 12, fontWeight: 700,
                  background: '#2c3e50', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer'
                }}>📤 Procore Upload File</button>
                {/* Upload mode toggle switch */}
                <div onClick={() => setUploadMode(uploadMode === 'section' ? 'individual' : 'section')}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginLeft: 8 }}>
                  <span style={{ fontSize: 11, color: uploadMode === 'section' ? '#1e293b' : '#94a3b8', fontWeight: 600 }}>Section</span>
                  <div style={{
                    width: 40, height: 22, borderRadius: 11, padding: 2,
                    background: uploadMode === 'individual' ? '#FF9900' : '#e2e8f0',
                    transition: 'background 0.2s', position: 'relative'
                  }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%', background: '#fff',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'transform 0.2s',
                      transform: uploadMode === 'individual' ? 'translateX(18px)' : 'translateX(0)'
                    }} />
                  </div>
                  <span style={{ fontSize: 11, color: uploadMode === 'individual' ? '#1e293b' : '#94a3b8', fontWeight: 600 }}>Equipment</span>
                </div>

              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══ SLD VIEW TAB ═══ */}
      {tab === 'sld' && (
        <SLDViewer equipment={activeEquipment} />
      )}

      {/* ═══ DOCS TAB ═══ */}
      {tab === 'docs' && (
        <DocsReference />
      )}
    </div>
  )
}
