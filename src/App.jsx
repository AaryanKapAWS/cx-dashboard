import { useState, useEffect } from 'react'
import EquipmentTable from './components/EquipmentTable'
import BayBuilder from './components/BayBuilder'
import DocsReference from './components/DocsReference'
import SLDViewer from './components/SLDViewer'
import { generateCOR } from './utils/corGenerator'
import { generateInspectionUpload } from './utils/inspectionUploadGenerator'
import { generateAsanaCSV } from './utils/asanaExporter'
import { isConnected, openAsanaAuth, exchangeCode, clearToken, getStoredToken } from './utils/asanaAPI'
import { buildAsanaProject } from './utils/asanaProjectBuilder'

export default function App() {
  const [tab, setTab] = useState('builder')

  // ── Equipment state ──
  const [equipment, setEquipment] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bay_equipment')) || [] } catch { return [] }
  })
  const [selectedRow, setSelectedRow] = useState(null)
  const [uploadMode, setUploadMode] = useState('section') // 'section' or 'individual'
  const [activeSection, setActiveSection] = useState(null) // name of selected section for filtering register
  const [activeFeederTab, setActiveFeederTab] = useState(null) // feeder tab to sync in Equipment Register

  // ── Shared state ──
  const [toast, setToast] = useState(null)
  const [projectLocation, setProjectLocation] = useState(() => localStorage.getItem('cor_location') || '')
  const [projectFbnId, setProjectFbnId] = useState(() => localStorage.getItem('cor_fbnId') || '')
  const [projectName, setProjectName] = useState(() => localStorage.getItem('cor_projectName') || '')
  const [projectRegion, setProjectRegion] = useState(() => localStorage.getItem('cor_region') || 'EMEA')

  // Auto-save
  useEffect(() => { localStorage.setItem('bay_equipment', JSON.stringify(equipment)) }, [equipment])
  useEffect(() => { localStorage.setItem('cor_location', projectLocation) }, [projectLocation])
  useEffect(() => { localStorage.setItem('cor_fbnId', projectFbnId) }, [projectFbnId])
  useEffect(() => { localStorage.setItem('cor_projectName', projectName) }, [projectName])
  useEffect(() => { localStorage.setItem('cor_region', projectRegion) }, [projectRegion])

  // Get active equipment filtered by selected section
  const activeEquipment = equipment.filter(item => {
    if (!activeSection) return false
    const sectionPart = (item.feeder_ref || '').split(' \u2014 ')[0]
    return sectionPart === activeSection || item.child_section === activeSection
  })

  function handleUpdateTests(equipIdx, newTests) {
    setEquipment(prev => prev.map((item, i) =>
      i === equipIdx ? { ...item, customTests: newTests } : item
    ))
  }

  async function handleGenerateCOR() {
    if (equipment.length === 0) {
      setToast({ message: '\u26a0 No equipment to export \u2014 add items first' })
      setTimeout(() => setToast(null), 4000)
      return
    }
    const result = await generateCOR(equipment, projectName || 'HV Substation')
    setToast({ message: `\u2713 COR exported \u2014 ${result.totalTests} tests across ${result.sections} sections` })
    setTimeout(() => setToast(null), 5000)
  }

  async function handleGenerateUpload() {
    if (equipment.length === 0) {
      setToast({ message: '\u26a0 No equipment to export \u2014 add items first' })
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
    setToast({ message: `\u2713 Upload file exported \u2014 ${result.inspections} inspections` })
    setTimeout(() => setToast(null), 5000)
  }

  // ─── ASANA INTEGRATION ───
  const [asanaConnected, setAsanaConnected] = useState(() => isConnected())
  const [asanaProgress, setAsanaProgress] = useState(null)

  function handleAsanaConnect() {
    localStorage.removeItem('asana_auth_code')
    openAsanaAuth()
    setToast({ message: '\ud83d\udd17 Asana auth opened \u2014 approve and return here' })
    setTimeout(() => setToast(null), 5000)
    const pollInterval = setInterval(async () => {
      const code = localStorage.getItem('asana_auth_code')
      if (code) {
        clearInterval(pollInterval)
        localStorage.removeItem('asana_auth_code')
        try {
          await exchangeCode(code)
          setAsanaConnected(true)
          setToast({ message: '\u2713 Connected to Asana!' })
          setTimeout(() => setToast(null), 4000)
        } catch (err) {
          setToast({ message: `\u26a0 Asana auth failed: ${err.message}` })
          setTimeout(() => setToast(null), 6000)
        }
      }
    }, 1000)
    setTimeout(() => clearInterval(pollInterval), 300000)
  }

  function handleAsanaDisconnect() {
    clearToken()
    setAsanaConnected(false)
    setToast({ message: 'Disconnected from Asana' })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleAsanaCreateProject() {
    if (equipment.length === 0) {
      setToast({ message: '\u26a0 No equipment to export \u2014 add items first' })
      setTimeout(() => setToast(null), 4000)
      return
    }
    if (!isConnected()) {
      setToast({ message: '\u26a0 Connect to Asana first' })
      setTimeout(() => setToast(null), 4000)
      return
    }
    try {
      setAsanaProgress({ step: 0, total: 8, message: 'Starting...' })
      const result = await buildAsanaProject(
        equipment,
        projectName || 'HV Substation Commissioning',
        (progress) => setAsanaProgress(progress)
      )
      setAsanaProgress(null)
      setToast({ message: `\u2713 Asana project created! ${result.totalTasks} tasks, ${result.sections} sections` })
      setTimeout(() => setToast(null), 8000)
      window.open(result.projectUrl, '_blank')
    } catch (err) {
      setAsanaProgress(null)
      setToast({ message: `\u26a0 Asana error: ${err.message}` })
      setTimeout(() => setToast(null), 8000)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>
      {/* ═══ TOP BAR ═══ */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 1000,
        background: '#0f172a', borderBottom: '1px solid #1e293b',
      }}>
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 24px', height: 44, borderBottom: '1px solid #1e293b' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>HV Substation Commissioning Tool</div>
        </div>

        {/* Sub-tabs row */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 24px', height: 40 }}>
          <div style={{ display: 'flex', gap: 2 }}>
            <button onClick={() => setTab('builder')} style={{
              padding: '8px 20px', fontSize: 12, fontWeight: 600,
              border: 'none', borderBottom: tab === 'builder' ? '2px solid #FF9900' : '2px solid transparent',
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
              <BayBuilder onSubmit={(items) => { setEquipment(items); setSelectedRow(null) }} onSectionChange={setActiveSection} onFeederChange={setActiveFeederTab} />
            </div>

            {/* Right: Equipment Register + Export */}
            <div style={{ flex: '1 1 35%', minWidth: 0, overflow: 'hidden' }}>
              <EquipmentTable
                equipment={activeEquipment}
                sectionName={activeSection}
                activeFeederTab={activeFeederTab}
                selectedIndex={selectedRow}
                onSelect={setSelectedRow}
                onUpdateTests={handleUpdateTests}
                onRename={null}
                onRemove={null}
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
                {/* Asana integration */}
                {!asanaConnected ? (
                  <button onClick={handleAsanaConnect} style={{
                    padding: '8px 16px', fontSize: 12, fontWeight: 600,
                    background: '#6a1b9a', color: '#fff', border: 'none',
                    borderRadius: 6, cursor: 'pointer',
                  }}>🔗 Connect Asana</button>
                ) : (
                  <button onClick={handleAsanaCreateProject} style={{
                    padding: '8px 16px', fontSize: 12, fontWeight: 600,
                    background: '#4a148c', color: '#fff', border: 'none',
                    borderRadius: 6, cursor: 'pointer',
                  }}>{asanaProgress ? `⏳ ${asanaProgress.message}` : '📊 Create Asana Project'}</button>
                )}
                {asanaConnected && (
                  <button onClick={handleAsanaDisconnect} style={{
                    padding: '6px 10px', fontSize: 10, fontWeight: 500,
                    background: 'transparent', color: '#94a3b8', border: '1px solid #e2e8f0',
                    borderRadius: 4, cursor: 'pointer',
                  }}>✕</button>
                )}
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
        <SLDViewer equipment={equipment} />
      )}

      {/* ═══ DOCS TAB ═══ */}
      {tab === 'docs' && (
        <DocsReference />
      )}
    </div>
  )
}
