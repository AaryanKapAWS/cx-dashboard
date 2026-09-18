import { useState, useEffect } from 'react'
import EquipmentTable from './components/EquipmentTable'
import BayBuilder from './components/BayBuilder'
import DocsReference from './components/DocsReference'
import SLDViewer from './components/SLDViewer'
import { generateCOR } from './utils/corGenerator'
import { weightedScore, isNA } from './utils/progressMetrics'
import { generateInspectionUpload } from './utils/inspectionUploadGenerator'
import { generateAsanaCSV } from './utils/asanaExporter'
import { buildAsanaProject } from './utils/asanaProjectBuilder'
import { isAuthenticated, startOAuthFlow, setToken, exchangeCodeForToken } from './utils/asanaAPI'
import SettingsPanel from './components/SettingsPanel'
import ProgressTracker from './components/ProgressTracker'
import ScheduleTracker from './components/ScheduleTracker'
import ExportHistory from './components/ExportHistory'
import LandingPage from './components/LandingPage'
import AnalyticsDashboard from './components/AnalyticsDashboard'

export default function App() {
  const [tab, setTab] = useState('home')

  // ── Equipment state ──
  const [equipment, setEquipment] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('bay_equipment')) || []
      return Array.isArray(raw) ? raw : Object.values(raw)
    } catch { return [] }
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

  // ── OAuth callback handler ──
  const [asanaConnected, setAsanaConnected] = useState(isAuthenticated())
  useEffect(() => {
    // Authorization Code flow: code comes back as query param
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (code) {
      // Clean URL immediately so we don't re-process on refresh
      window.history.replaceState({}, '', window.location.pathname)
      // Exchange code for token
      exchangeCodeForToken(code)
        .then(token => {
          setToken(token)
          setAsanaConnected(true)
          setToast({ message: '\u2713 Connected to Asana!' })
          setTimeout(() => setToast(null), 5000)
        })
        .catch(err => {
          setToast({ message: `Asana auth failed: ${err.message}`, type: 'error' })
          setTimeout(() => setToast(null), 5000)
        })
    }
  }, [])

  // Get active equipment filtered by selected section
  const activeEquipment = equipment.map((item, i) => ({ ...item, _globalIdx: i })).filter(item => {
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
    // Log to export history
    const history = JSON.parse(localStorage.getItem('export_history') || '[]')
    const startTime = Date.now()
    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    // Progress snapshot — count completed entries from progress tracker
    const pd = JSON.parse(localStorage.getItem('test_progress') || '{}')
    const allKeys = Object.keys(pd)
    const relevantKeys = allKeys.filter(k => equipment.some(item => k.startsWith((item.feeder_ref || '').replace(/\s/g, '_'))))
    // Weighted progress: average of per-test weighted scores (60% SAT + 15% Report + 15% Reviewed + 10% Closed), excluding N/A
    const scorable = relevantKeys.filter(k => pd[k] && !isNA(pd[k]))
    const totalWeighted = scorable.reduce((sum, k) => sum + weightedScore(pd[k]), 0)
    const progressPct = scorable.length > 0 ? Math.round((totalWeighted / scorable.length) * 100) : 0
    history.unshift({ id: Date.now(), type: 'COR', timestamp: new Date().toISOString(), projectName: projectName || 'HV Substation', itemCount: equipment.length, testCount: result.totalTests, sections: result.sections, location: projectLocation || '-', region: projectRegion || 'EMEA', duration: `${duration}s`, progressPct, status: 'success' })
    localStorage.setItem('export_history', JSON.stringify(history.slice(0, 50)))
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
    // Log to export history
    const history = JSON.parse(localStorage.getItem('export_history') || '[]')
    history.unshift({ id: Date.now(), type: 'Procore', timestamp: new Date().toISOString(), projectName: projectName || 'HV Substation', itemCount: equipment.length, testCount: result.inspections, sections: Object.keys(result).length || '-', location: projectLocation || '-', duration: '-', status: 'success' })
    localStorage.setItem('export_history', JSON.stringify(history.slice(0, 50)))
  }

  // ─── ASANA INTEGRATION ───
  const [asanaProgress, setAsanaProgress] = useState(null)
  const [asanaCancelled, setAsanaCancelled] = useState(false)
  const [asanaAbort, setAsanaAbort] = useState(null)

  async function handleAsanaCreate() {
    setAsanaCancelled(false)
    const controller = new AbortController()
    setAsanaAbort(controller)

    // If not connected, redirect to OAuth
    if (!isAuthenticated()) {
      startOAuthFlow()
      return
    }

    if (equipment.length === 0) {
      setToast({ message: '⚠ No equipment to export — add items first' })
      setTimeout(() => setToast(null), 4000)
      return
    }

    try {
      setAsanaProgress({ step: 0, total: 10, message: 'Starting...' })
      const asanaStartTime = Date.now()
      const emails = []
      const result = await buildAsanaProject(
        equipment,
        projectName || 'HV Substation Commissioning',
        (progress) => setAsanaProgress(progress),
        controller.signal,
        emails
      )
      setAsanaProgress(null)
      setAsanaAbort(null)
      setToast({ message: `✓ Asana project created! ${result.totalTasks} tasks across ${result.sections} sections` })
      setTimeout(() => setToast(null), 8000)
      window.open(result.projectUrl, '_blank')
      // Log to export history
      const history = JSON.parse(localStorage.getItem('export_history') || '[]')
      history.unshift({ id: Date.now(), type: 'Asana', timestamp: new Date().toISOString(), projectName: projectName || 'HV Substation Commissioning', itemCount: equipment.length, testCount: result.totalTasks, sections: result.sections, location: projectLocation || '-', duration: `${((Date.now() - asanaStartTime) / 1000).toFixed(0)}s`, status: 'success' })
      localStorage.setItem('export_history', JSON.stringify(history.slice(0, 50)))
    } catch (err) {
      setAsanaProgress(null)
      setAsanaAbort(null)
      if (err.message === 'Cancelled') {
        setToast({ message: '⚠ Asana export cancelled' })
      } else {
        setToast({ message: `⚠ Asana error: ${err.message}` })
      }
      setTimeout(() => setToast(null), 6000)
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
        <div style={{ display: 'flex', padding: '0 24px' }}>
          <div style={{ display: 'flex', gap: 2 }}>
            <button onClick={() => setTab('home')} style={{
              padding: '8px 20px', fontSize: 12, fontWeight: 600,
              border: 'none', borderBottom: tab === 'home' ? '2px solid #FF9900' : '2px solid transparent',
              background: 'transparent', color: tab === 'home' ? '#fff' : '#94a3b8',
              cursor: 'pointer'
            }}>🏠 Home</button>
            <button onClick={() => setTab('builder')} style={{
              padding: '8px 20px', fontSize: 12, fontWeight: 600,
              border: 'none', borderBottom: tab === 'builder' ? '2px solid #FF9900' : '2px solid transparent',
              background: 'transparent', color: tab === 'builder' ? '#fff' : '#94a3b8',
              cursor: 'pointer'
            }}>⚡ Scope & Export</button>
            <button onClick={() => setTab('progress')} style={{
              padding: '8px 20px', fontSize: 12, fontWeight: 600,
              border: 'none', borderBottom: tab === 'progress' ? '2px solid #3b82f6' : '2px solid transparent',
              background: 'transparent', color: tab === 'progress' ? '#fff' : '#94a3b8',
              cursor: 'pointer'
            }}>📊 Progress</button>
            <button onClick={() => setTab('schedule')} style={{
              padding: '8px 20px', fontSize: 12, fontWeight: 600,
              border: 'none', borderBottom: tab === 'schedule' ? '2px solid #14b8a6' : '2px solid transparent',
              background: 'transparent', color: tab === 'schedule' ? '#fff' : '#94a3b8',
              cursor: 'pointer'
            }}>📅 Schedule</button>
            <button onClick={() => setTab('analytics')} style={{
              padding: '8px 20px', fontSize: 12, fontWeight: 600,
              border: 'none', borderBottom: tab === 'analytics' ? '2px solid #f59e0b' : '2px solid transparent',
              background: 'transparent', color: tab === 'analytics' ? '#fff' : '#94a3b8',
              cursor: 'pointer'
            }}>📊 Analytics</button>
            <button onClick={() => setTab('sld')} style={{
              padding: '8px 20px', fontSize: 12, fontWeight: 600,
              border: 'none', borderBottom: tab === 'sld' ? '2px solid #27ae60' : '2px solid transparent',
              background: 'transparent', color: tab === 'sld' ? '#fff' : '#94a3b8',
              cursor: 'pointer'
            }}>🔌 SLD View</button>
            <button onClick={() => setTab('history')} style={{
              padding: '8px 20px', fontSize: 12, fontWeight: 600,
              border: 'none', borderBottom: tab === 'history' ? '2px solid #64748b' : '2px solid transparent',
              background: 'transparent', color: tab === 'history' ? '#fff' : '#94a3b8',
              cursor: 'pointer'
            }}>📋 History</button>
            <button onClick={() => setTab('settings')} style={{
              padding: '8px 20px', fontSize: 12, fontWeight: 600,
              border: 'none', borderBottom: tab === 'settings' ? '2px solid #a855f7' : '2px solid transparent',
              background: 'transparent', color: tab === 'settings' ? '#fff' : '#94a3b8',
              cursor: 'pointer'
            }}>⚙️ Settings</button>
            <button onClick={() => setTab('docs')} style={{
              padding: '8px 20px', fontSize: 12, fontWeight: 600,
              border: 'none', borderBottom: tab === 'docs' ? '2px solid #38bdf8' : '2px solid transparent',
              background: 'transparent', color: tab === 'docs' ? '#fff' : '#94a3b8',
              cursor: 'pointer'
            }}>📖 Docs</button>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
            <a href="https://github.com/AaryanKapAWS/cx-dashboard" target="_blank" rel="noopener noreferrer"
              style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, textDecoration: 'none', padding: '6px 12px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 6 }}
              onMouseOver={e => e.currentTarget.style.color = '#fff'}
              onMouseOut={e => e.currentTarget.style.color = '#94a3b8'}
              title="View on GitHub"
            ><svg height="16" width="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg> GitHub</a>
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

      {tab === 'analytics' && (
        <AnalyticsDashboard equipment={equipment} />
      )}

      {/* ═══ HOME / LANDING TAB ═══ */}
      {tab === 'home' && (
        <LandingPage onNavigate={setTab} />
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
              <BayBuilder onSubmit={(items) => {
                setEquipment(prev => {
                  // Build lookup of previous customTests by type+feeder_ref+displayName
                  const lookup = {}
                  prev.forEach(e => {
                    if (e.customTests) {
                      const key = `${e.type}||${e.feeder_ref}||${e.displayName || e.name}`
                      lookup[key] = e.customTests
                    }
                  })
                  // Merge: carry over customTests for items that match exactly
                  return items.map(item => {
                    const key = `${item.type}||${item.feeder_ref}||${item.displayName || item.name}`
                    if (lookup[key]) return { ...item, customTests: lookup[key] }
                    // Fallback for duplicated sections: match by type+displayName only
                    const fallbackKey = Object.keys(lookup).find(k =>
                      k.startsWith(item.type + '||') && k.endsWith('||' + (item.displayName || item.name))
                    )
                    return fallbackKey ? { ...item, customTests: [...lookup[fallbackKey]] } : item
                  })
                })
                setSelectedRow(null)
              }} onSectionChange={setActiveSection} onFeederChange={setActiveFeederTab} />
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
                {/* Asana integration */}
                <button onClick={handleAsanaCreate} disabled={!!asanaProgress} style={{
                  padding: '10px 20px', fontSize: 12, fontWeight: 700,
                  background: asanaProgress ? '#6b21a8' : '#4a148c', color: '#fff', border: 'none',
                  borderRadius: 6, cursor: asanaProgress ? 'wait' : 'pointer', opacity: asanaProgress ? 0.8 : 1,
                }}>{asanaProgress ? `⏳ ${asanaProgress.message}` : asanaConnected ? '📊 Create Asana Project' : '🔗 Connect & Create Asana Project'}</button>
                {asanaProgress && (
                  <button onClick={() => { if (asanaAbort) asanaAbort.abort(); setAsanaCancelled(true); setAsanaProgress(null) }} style={{
                    padding: '8px 12px', fontSize: 11, fontWeight: 600,
                    background: '#dc2626', color: '#fff', border: 'none',
                    borderRadius: 6, cursor: 'pointer',
                  }}>✕ Cancel</button>
                )}

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
        <SLDViewer equipment={equipment} />
      )}

      {/* ═══ DOCS TAB ═══ */}
      {tab === 'docs' && (
        <DocsReference />
      )}

      {/* ═══ PROGRESS TAB ═══ */}
      {tab === 'progress' && (
        <ProgressTracker equipment={equipment} />
      )}

      {/* ═══ SETTINGS TAB ═══ */}
      {tab === 'settings' && (
        <SettingsPanel />
      )}

      {/* ═══ SCHEDULE TAB ═══ */}
      {tab === 'schedule' && (
        <ScheduleTracker equipment={equipment} />
      )}

      {/* ═══ HISTORY TAB ═══ */}
      {tab === 'history' && (
        <ExportHistory />
      )}

    </div>
  )
}
