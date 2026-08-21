import { useState, useRef } from 'react'
import ExcelJS from 'exceljs'
import ExportHistory from './ExportHistory'
import TemplateManager from './TemplateManager'
import TEST_TEMPLATES from '../data/test_templates.json'

export default function SettingsPanel() {
  // ── Asana connection ──
  const [asanaToken, setAsanaToken] = useState(() => localStorage.getItem('asana_token') || '')
  const [asanaEmail, setAsanaEmail] = useState(() => localStorage.getItem('asana_email') || '')

  // ── Project defaults ──
  const [defaultLocation, setDefaultLocation] = useState(() => localStorage.getItem('cor_location') || '')
  const [defaultFbnId, setDefaultFbnId] = useState(() => localStorage.getItem('cor_fbnId') || '')
  const [defaultRegion, setDefaultRegion] = useState(() => localStorage.getItem('cor_region') || 'EMEA')

  // ── Save feedback ──
  const [saved, setSaved] = useState(false)

  // ── Sub-section toggle ──
  const [showExportHistory, setShowExportHistory] = useState(false)
  const [showTemplateManager, setShowTemplateManager] = useState(false)

  // ── Project Presets ──
  const [presets, setPresets] = useState(() => {
    try { return JSON.parse(localStorage.getItem('saved_projects')) || [] } catch { return [] }
  })
  const importFileRef = useRef(null)

  // ── COR Import ──
  const corFileRef = useRef(null)
  const [corImportStatus, setCorImportStatus] = useState(null)
  const [corParsedData, setCorParsedData] = useState(null)

  function handleDisconnect() {
    localStorage.removeItem('asana_token')
    localStorage.removeItem('asana_email')
    setAsanaToken('')
    setAsanaEmail('')
  }

  function handleSaveDefaults() {
    localStorage.setItem('cor_location', defaultLocation)
    localStorage.setItem('cor_fbnId', defaultFbnId)
    localStorage.setItem('cor_region', defaultRegion)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  // ════════════════════════════════════════════════════
  // PROJECT PRESET FUNCTIONS
  // ════════════════════════════════════════════════════
  function handleSaveProject() {
    const defaultName = localStorage.getItem('cor_projectName') || localStorage.getItem('bay_project_name') || 'Untitled Project'
    const name = prompt('Save project as:', defaultName)
    if (!name) return

    const bayTree = localStorage.getItem('bay_tree_v5') || '[]'
    const equipment = localStorage.getItem('bay_equipment') || '[]'

    let treeData, equipData
    try { treeData = JSON.parse(bayTree) } catch { treeData = [] }
    try { equipData = JSON.parse(equipment) } catch { equipData = [] }

    const preset = {
      id: Date.now(),
      name,
      bayTree: treeData,
      equipment: equipData,
      projectName: defaultName,
      location: localStorage.getItem('cor_location') || '',
      fbnId: localStorage.getItem('cor_fbnId') || '',
      region: localStorage.getItem('cor_region') || 'EMEA',
      savedAt: new Date().toISOString(),
    }

    const updated = [...presets, preset]
    setPresets(updated)
    localStorage.setItem('saved_projects', JSON.stringify(updated))
    alert(`Project "${name}" saved! (${treeData.length} sections, ${equipData.length} equipment items)`)
  }

  function handleLoadProject(preset) {
    if (!confirm(`Load "${preset.name}"? This will replace your current scope.`)) return
    localStorage.setItem('bay_tree_v5', JSON.stringify(preset.bayTree))
    localStorage.setItem('bay_equipment', JSON.stringify(preset.equipment))
    if (preset.location) localStorage.setItem('cor_location', preset.location)
    if (preset.fbnId) localStorage.setItem('cor_fbnId', preset.fbnId)
    if (preset.region) localStorage.setItem('cor_region', preset.region)
    if (preset.projectName) localStorage.setItem('cor_projectName', preset.projectName)
    window.location.reload()
  }

  function handleDeleteProject(id) {
    if (!confirm('Delete this saved project?')) return
    const updated = presets.filter(p => p.id !== id)
    setPresets(updated)
    localStorage.setItem('saved_projects', JSON.stringify(updated))
  }

  function handleExportProject(preset) {
    const json = JSON.stringify(preset, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${preset.name.replace(/[^a-zA-Z0-9]/g, '_')}_preset.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImportProject(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const preset = JSON.parse(reader.result)
        if (!preset.bayTree || !preset.equipment) {
          alert('Invalid preset file — missing bayTree or equipment data.')
          return
        }
        preset.id = Date.now()
        preset.savedAt = new Date().toISOString()
        const updated = [...presets, preset]
        setPresets(updated)
        localStorage.setItem('saved_projects', JSON.stringify(updated))
        alert(`Imported "${preset.name}" successfully!`)
      } catch (err) {
        alert('Failed to parse JSON file: ' + err.message)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // ════════════════════════════════════════════════════
  // COR IMPORT FUNCTIONS
  // ════════════════════════════════════════════════════
  async function handleCorUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setCorImportStatus('Parsing...')
    setCorParsedData(null)

    try {
      const buffer = await file.arrayBuffer()
      const wb = new ExcelJS.Workbook()
      await wb.xlsx.load(buffer)

      const parsed = {}
      let totalTests = 0
      let sheetsWithData = 0

      for (const ws of wb.worksheets) {
        // Skip non-data sheets
        if (['Project Overview', 'Cx Programme', 'Cx Charts', 'Certificate of Readiness', 'Revision History'].includes(ws.name)) continue

        const sheetData = []
        const rowCount = ws.rowCount || 500
        for (let rowNum = 4; rowNum <= rowCount; rowNum++) {
          const row = ws.getRow(rowNum)
          let testName = row.getCell(5).value // Col E: Test Description
          if (!testName) continue
          // Handle ExcelJS rich text objects, formulas, etc.
          if (typeof testName === 'object') {
            if (testName.richText) testName = testName.richText.map(r => r.text).join('')
            else if (testName.result) testName = String(testName.result)
            else testName = String(testName)
          } else {
            testName = String(testName)
          }
          if (!testName.trim()) continue

          const rowData = { test: testName.trim(), row: rowNum }

          // Dates (cols F-I = 6-9)
          const plannedStart = row.getCell(6).value
          const plannedFinish = row.getCell(7).value
          const actualStart = row.getCell(8).value
          const actualFinish = row.getCell(9).value
          if (plannedStart) rowData.plannedStart = plannedStart
          if (plannedFinish) rowData.plannedFinish = plannedFinish
          if (actualStart) rowData.actualStart = actualStart
          if (actualFinish) rowData.actualFinish = actualFinish

          // YES/NO columns
          function cellStr(col) {
            const v = row.getCell(col).value
            if (!v) return ''
            if (typeof v === 'object') {
              if (v.richText) return v.richText.map(r => r.text).join('').trim()
              if (v.result !== undefined) return String(v.result).trim()
              return String(v).trim()
            }
            return String(v).trim()
          }
          const satCompleted = cellStr(10)
          const witnessed = cellStr(11)
          const completed = cellStr(12)
          const reportReceived = cellStr(13)
          const reportProcore = cellStr(14)
          const reportReviewed = cellStr(15)
          const reportClosed = cellStr(18)

          if (satCompleted) rowData.satCompleted = satCompleted.toUpperCase()
          if (witnessed) rowData.witnessed = witnessed.toUpperCase()
          if (completed) rowData.completed = completed.toUpperCase()
          // Only write report columns if SAT is confirmed
          if (satCompleted === 'YES') {
            if (reportReceived) rowData.reportReceived = reportReceived.toUpperCase()
            if (reportProcore) rowData.reportProcore = reportProcore.toUpperCase()
            if (reportReviewed) rowData.reportReviewed = reportReviewed.toUpperCase()
            if (reportClosed) rowData.reportClosed = reportClosed.toUpperCase()
          }

          // Text columns
          const obs = row.getCell(17).value
          const comments = row.getCell(19).value
          if (obs) rowData.obs = String(obs)
          if (comments) rowData.comments = String(comments)

          sheetData.push(rowData)
          totalTests++
        }

        if (sheetData.length > 0) {
          parsed[ws.name] = sheetData
          sheetsWithData++
        }
      }

      setCorParsedData(parsed)
      setCorImportStatus(`Found ${totalTests} tests with data across ${sheetsWithData} sheets`)
    } catch (err) {
      setCorImportStatus(`Error: ${err.message}`)
      setCorParsedData(null)
    }
    e.target.value = ''
  }

  function handleCorLoadNow() {
    if (!corParsedData) return
    
    // Build test_progress directly from parsed COR data
    // Since the COR was generated by this tool, we can build progress keys
    // from the sheet structure: sheet name → feeder_ref, equipment separators → displayName
    const progress = JSON.parse(localStorage.getItem('test_progress') || '{}')
    let matched = 0
    let total = 0

    // For each sheet in parsed COR data
    for (const [sheetName, sheetTests] of Object.entries(corParsedData)) {
      // Track current equipment group (from separator rows)
      let currentEquipment = sheetName
      let testIdx = 0
      
      for (const corTest of sheetTests) {
        const testName = (corTest.test || '').trim()
        if (!testName) continue
        
        // Check if this is an equipment separator row (no level, typically bold equipment name)
        // Equipment separators don't have satCompleted/witnessed/etc and have no level
        if (!corTest.satCompleted && !corTest.witnessed && !corTest.completed && 
            !corTest.plannedStart && !corTest.plannedFinish && !corTest.actualStart && !corTest.actualFinish &&
            !corTest.reportReceived && !corTest.reportClosed) {
          // This might be an equipment separator — use as current equipment name
          currentEquipment = testName
          testIdx = 0
          continue
        }
        
        total++
        const tested = corTest.satCompleted === 'YES'
        const witnessed = corTest.witnessed === 'YES'
        const closed = corTest.reportClosed === 'YES'
        
        if (tested || witnessed || closed) {
          // Build progress key: feeder_ref_equipmentName_testIdx
          // Use sheetName as a proxy for feeder_ref, currentEquipment for displayName
          const key = `${sheetName.replace(/\s/g, '_')}_${currentEquipment.replace(/\s/g, '_')}_${testIdx}`
          progress[key] = { tested, witnessed, closed }
          matched++
        }
        testIdx++
      }
    }
    
    // Save to localStorage
    localStorage.setItem('test_progress', JSON.stringify(progress))
    localStorage.setItem('cor_imported_data', JSON.stringify(corParsedData))
    
    setCorImportStatus(`✓ Loaded! ${matched} tests with progress data saved (${total} total parsed). Check the Progress tab.`)
  }

  function handleCorSaveWithProject() {
    if (!corParsedData) return
    const defaultName = localStorage.getItem('cor_projectName') || 'Untitled'
    const bayTree = localStorage.getItem('bay_tree_v5') || '[]'
    const equipment = localStorage.getItem('bay_equipment') || '[]'

    let treeData, equipData
    try { treeData = JSON.parse(bayTree) } catch { treeData = [] }
    try { equipData = JSON.parse(equipment) } catch { equipData = [] }

    const preset = {
      id: Date.now(),
      name: defaultName + ' (with COR data)',
      bayTree: treeData,
      equipment: equipData,
      corData: corParsedData,
      projectName: defaultName,
      location: localStorage.getItem('cor_location') || '',
      fbnId: localStorage.getItem('cor_fbnId') || '',
      region: localStorage.getItem('cor_region') || 'EMEA',
      savedAt: new Date().toISOString(),
    }

    const updated = [...presets, preset]
    setPresets(updated)
    localStorage.setItem('saved_projects', JSON.stringify(updated))
    setCorImportStatus(`✓ Saved as "${preset.name}"`)
  }

  // ════════════════════════════════════════════════════
  // STYLES
  // ════════════════════════════════════════════════════
  const cardStyle = {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    padding: '28px 32px',
    marginBottom: 24,
  }

  const labelStyle = {
    display: 'block',
    fontSize: 10,
    fontWeight: 600,
    color: '#64748b',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  }

  const inputStyle = {
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    fontSize: 12,
    width: '100%',
    maxWidth: 360,
    color: '#0f172a',
  }

  const sectionHeaderStyle = {
    background: '#232F3E',
    color: '#fff',
    padding: '12px 20px',
    borderRadius: '6px 6px 0 0',
    fontSize: 13,
    fontWeight: 700,
    margin: '-28px -32px 20px -32px',
    fontFamily: 'Times New Roman, serif',
    letterSpacing: '0.5px',
  }

  const btnPrimary = {
    padding: '8px 16px', fontSize: 11, fontWeight: 600,
    background: '#FF9900', color: '#000', border: 'none',
    borderRadius: 6, cursor: 'pointer',
  }

  const btnSecondary = {
    padding: '7px 14px', fontSize: 11, fontWeight: 600,
    background: '#f8fafc', color: '#334155', border: '1px solid #e2e8f0',
    borderRadius: 6, cursor: 'pointer',
  }

  const btnDanger = {
    padding: '6px 10px', fontSize: 10, fontWeight: 600,
    background: '#fff', color: '#dc2626', border: '1px solid #fecaca',
    borderRadius: 4, cursor: 'pointer',
  }

  return (
    <div style={{ padding: '40px 60px', maxWidth: 1000, margin: '0 auto' }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: '0 0 32px' }}>⚙️ Settings</h2>

      {/* ═══ ASANA CONNECTION ═══ */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0 }}>Asana Connection</h3>
          {asanaToken ? (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
              background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
              Connected{asanaEmail ? ` as ${asanaEmail}` : ''}
            </span>
          ) : (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
              background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />
              Not Connected
            </span>
          )}
        </div>
        <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 12px' }}>
          {asanaToken
            ? 'Your Asana account is connected. You can create projects directly from the Scope & Export tab.'
            : 'Connect Asana from the Scope & Export tab to push commissioning tasks directly to your workspace.'}
        </p>
        {asanaToken && (
          <button onClick={handleDisconnect} style={{
            padding: '7px 14px', fontSize: 11, fontWeight: 600,
            background: '#fff', color: '#dc2626', border: '1px solid #fecaca',
            borderRadius: 6, cursor: 'pointer',
          }}>
            Disconnect Asana
          </button>
        )}
      </div>

      {/* ═══ PROJECT DEFAULTS ═══ */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 14px' }}>Project Defaults</h3>
        <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 16px' }}>
          These values pre-fill the project config bar on the Scope & Export tab.
        </p>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={labelStyle}>Default Location</label>
            <input
              value={defaultLocation}
              onChange={(e) => setDefaultLocation(e.target.value)}
              placeholder="e.g. DUB069"
              style={inputStyle}
            />
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label style={labelStyle}>FBN Build ID</label>
            <input
              value={defaultFbnId}
              onChange={(e) => setDefaultFbnId(e.target.value)}
              placeholder="e.g. DUB069HV4T.001"
              style={inputStyle}
            />
          </div>
          <div style={{ flex: '1 1 140px' }}>
            <label style={labelStyle}>Region</label>
            <select
              value={defaultRegion}
              onChange={(e) => setDefaultRegion(e.target.value)}
              style={{ ...inputStyle, width: 140 }}
            >
              <option value="EMEA">EMEA</option>
              <option value="APAC">APAC</option>
              <option value="AMER">AMER</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={handleSaveDefaults} style={{
            padding: '8px 18px', fontSize: 12, fontWeight: 600,
            background: '#0f172a', color: '#fff', border: 'none',
            borderRadius: 6, cursor: 'pointer',
          }}>
            Save Defaults
          </button>
          {saved && (
            <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>✓ Saved</span>
          )}
        </div>
      </div>

      {/* ═══ PROJECT PRESETS ═══ */}
      <div style={cardStyle}>
        <div style={sectionHeaderStyle}>PROJECT PRESETS</div>
        <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 16px' }}>
          Save your current scope (sections, feeders, equipment, custom tests) as a named preset. Load it back anytime.
        </p>

        {/* Preset List */}
        {presets.length > 0 && (
          <div style={{ marginBottom: 16, border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
            {presets.map((p, idx) => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderBottom: idx < presets.length - 1 ? '1px solid #f1f5f9' : 'none',
                background: idx % 2 === 0 ? '#fff' : '#fafbfc',
              }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{p.name}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                    {p.bayTree?.length || 0} sections · {p.equipment?.length || 0} items · {new Date(p.savedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    {p.corData ? ' · 📊 COR data' : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => handleLoadProject(p)} style={btnPrimary}>Load</button>
                  <button onClick={() => handleExportProject(p)} style={btnSecondary} title="Export as JSON">⬇</button>
                  <button onClick={() => handleDeleteProject(p.id)} style={btnDanger}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {presets.length === 0 && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: 12, border: '1px dashed #e2e8f0', borderRadius: 6, marginBottom: 16 }}>
            No saved projects yet. Save your current scope below.
          </div>
        )}

        {/* Save / Import buttons */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={handleSaveProject} style={btnPrimary}>
            💾 Save Current Project
          </button>
          <button onClick={() => importFileRef.current?.click()} style={btnSecondary}>
            📁 Import JSON
          </button>
          <input
            ref={importFileRef}
            type="file"
            accept=".json"
            onChange={handleImportProject}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {/* ═══ COR DATA IMPORT ═══ */}
      <div style={cardStyle}>
        <div style={sectionHeaderStyle}>COR DATA IMPORT</div>
        <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 16px' }}>
          Upload an existing COR (.xlsx) to import dates, checkmarks, and comments. Matches tests by name and populates your scope.
        </p>

        {/* Upload button */}
        <div style={{ marginBottom: 16 }}>
          <button onClick={() => corFileRef.current?.click()} style={btnSecondary}>
            📄 Upload COR File (.xlsx / .xlsm)
          </button>
          <input
            ref={corFileRef}
            type="file"
            accept=".xlsx,.xlsm"
            onChange={handleCorUpload}
            style={{ display: 'none' }}
          />
        </div>

        {/* Status */}
        {corImportStatus && (
          <div style={{
            padding: '10px 14px', borderRadius: 6, fontSize: 12, marginBottom: 16,
            background: corImportStatus.startsWith('Error') ? '#fef2f2' : corImportStatus.startsWith('✓') ? '#f0fdf4' : '#f8fafc',
            color: corImportStatus.startsWith('Error') ? '#991b1b' : corImportStatus.startsWith('✓') ? '#166534' : '#334155',
            border: `1px solid ${corImportStatus.startsWith('Error') ? '#fecaca' : corImportStatus.startsWith('✓') ? '#bbf7d0' : '#e2e8f0'}`,
          }}>
            {corImportStatus}
          </div>
        )}

        {/* Action buttons (shown after successful parse) */}
        {corParsedData && !corImportStatus?.startsWith('✓') && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleCorLoadNow} style={btnPrimary}>
              ⚡ Load Now
            </button>
            <button onClick={handleCorSaveWithProject} style={btnSecondary}>
              💾 Save with Project
            </button>
          </div>
        )}
      </div>

      {/* ═══ CUSTOM EQUIPMENT TEMPLATES ═══ */}
      <div style={cardStyle}>
        <div
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
          onClick={() => setShowTemplateManager(!showTemplateManager)}
        >
          <h3 style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0 }}>⚙️ Custom Equipment Templates</h3>
          <span style={{ fontSize: 12, color: '#64748b', transform: showTemplateManager ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
            ▼
          </span>
        </div>
        {showTemplateManager && (
          <div style={{ marginTop: 16 }}>
            <TemplateManager />
          </div>
        )}
      </div>

      {/* ═══ EXPORT HISTORY (sub-section) ═══ */}
      <div style={cardStyle}>
        <div
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
          onClick={() => setShowExportHistory(!showExportHistory)}
        >
          <h3 style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0 }}>Export History</h3>
          <span style={{ fontSize: 12, color: '#64748b', transform: showExportHistory ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
            ▼
          </span>
        </div>
        {showExportHistory && (
          <div style={{ marginTop: 16 }}>
            <ExportHistory />
          </div>
        )}
      </div>

      {/* ═══ ABOUT ═══ */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 12px' }}>About</h3>
        <table style={{ fontSize: 12, color: '#334155', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ padding: '4px 16px 4px 0', fontWeight: 600, color: '#64748b' }}>Version</td>
              <td style={{ padding: '4px 0' }}>v1.0</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 16px 4px 0', fontWeight: 600, color: '#64748b' }}>Tool</td>
              <td style={{ padding: '4px 0' }}>HV Substation Commissioning Dashboard</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 16px 4px 0', fontWeight: 600, color: '#64748b' }}>Author</td>
              <td style={{ padding: '4px 0' }}>Commissioning Engineering Team</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 16px 4px 0', fontWeight: 600, color: '#64748b' }}>GitHub</td>
              <td style={{ padding: '4px 0' }}>
                <a
                  href="https://github.com/AaryanKapAWS/cx-dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#2563eb', textDecoration: 'none' }}
                >
                  github.com/AaryanKapAWS/cx-dashboard
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
