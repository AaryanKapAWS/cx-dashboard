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

  // ══════════════════════════════════════════════════════════
  // PROJECT PRESET FUNCTIONS
  // ══════════════════════════════════════════════════════════
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
    if (preset.testSchedule) localStorage.setItem('test_schedule', JSON.stringify(preset.testSchedule))
    if (preset.testProgress) localStorage.setItem('test_progress', JSON.stringify(preset.testProgress))
    if (preset.customTemplates) localStorage.setItem('cx_custom_templates', JSON.stringify(preset.customTemplates))
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

    function handleDownloadTemplate() {
    const template = "{\n  \"_README\": \"CX DASHBOARD \\u2014 PROJECT IMPORT TEMPLATE\",\n  \"_instructions\": [\n    \"This template defines the JSON format for importing a commissioning project\",\n    \"into the HV Substation Cx Dashboard (https://aaryankapaws.github.io/cx-dashboard/).\",\n    \"\",\n    \"HOW TO USE:\",\n    \"1. Download this template from the Dashboard (Settings \\u2192 Download Template)\",\n    \"2. Give this template + your COR Excel file(s) to Amazon Quick\",\n    \"3. Say: 'Parse my COR files using this template and give me the JSON'\",\n    \"4. Amazon Quick will extract all equipment, tests, and progress data\",\n    \"5. Upload the resulting .json to Dashboard \\u2192 Settings \\u2192 Import JSON \\u2192 Load\",\n    \"\",\n    \"WHAT THE DASHBOARD DOES:\",\n    \"- Tracks commissioning test progress (SAT, witnessing, reports, close-out)\",\n    \"- Generates a consolidated COR Excel file with live formulas\",\n    \"- Shows analytics: completion rates, level breakdowns, schedule tracking\",\n    \"- Exports to Procore inspection format and Asana project boards\",\n    \"- All data stored in browser localStorage \\u2014 no server/login needed\",\n    \"\",\n    \"DELETE all keys starting with '_' before importing.\"\n  ],\n  \"_field_guide\": {\n    \"bayTree_node\": {\n      \"id\": \"Unique string ID (e.g. 'sec_0'). Any unique string.\",\n      \"name\": \"Section display name \\u2014 appears in Scope sidebar. Use the COR sheet/tab name (e.g. 'H1 - Incomer from Utility 1').\",\n      \"preset\": \"Always 'custom' for imported data.\",\n      \"colour\": \"Hex colour for section badge (e.g. '#2980b9').\",\n      \"subtype\": \"null\",\n      \"feeders\": \"Empty array [].\",\n      \"children\": \"Empty array [].\",\n      \"equipment\": \"Array of refs [{id, type, qty, name}]. Each 'type' must match an entry in the top-level equipment array.\"\n    },\n    \"equipment_item\": {\n      \"type\": \"Unique string per equipment (e.g. 'custom_import_H1_HIS_PASS'). Must match bayTree ref.\",\n      \"name\": \"Equipment display name from the COR.\",\n      \"displayName\": \"Same as name.\",\n      \"feeder_ref\": \"Section name \\u2014 must match bayTree node 'name'.\",\n      \"feeder_type\": \"Always 'custom'.\",\n      \"feeder_type_label\": \"Same as feeder_ref.\",\n      \"section\": \"Always 'custom'.\",\n      \"child_section\": \"null\",\n      \"parent_section\": \"null\",\n      \"customTests\": \"Array [{level, name, enabled}]. level = L1-L5, enabled = true.\"\n    },\n    \"test_levels\": {\n      \"L1\": \"FAT (Factory Acceptance Test)\",\n      \"L2\": \"Pre-SAT (RIF, IVF)\",\n      \"L3\": \"SAT (Site Acceptance Test) \\u2014 most tests are L3\",\n      \"L4\": \"Integration testing\",\n      \"L5\": \"Energization checks\"\n    },\n    \"testProgress_key_format\": \"SECTION_NAME_EQUIPMENT_NAME_INDEX \\u2014 spaces\\u2192underscores, index is 0-based matching customTests order.\",\n    \"testProgress_fields\": {\n      \"tested\": \"true if SAT completed (Completed=YES or Witnessed=YES)\",\n      \"completed\": \"true / false / 'NA'\",\n      \"witnessed\": \"true / false\",\n      \"closed\": \"true / false\",\n      \"reportOnProcore\": \"true / false\",\n      \"reviewed\": \"true / false / 'NA'\",\n      \"outstandingObs\": \"true / false / 'NA'\",\n      \"reportReceivedDate\": \"ISO date string or omit if blank\",\n      \"reportReviewedDate\": \"ISO date string or omit if blank\",\n      \"satDate\": \"ISO date string or omit if blank\",\n      \"comments\": \"String or omit if blank\"\n    },\n    \"testSchedule_key_format\": \"SECTION_NAME_EQUIPMENT_NAME \\u2014 one per equipment (no test index).\",\n    \"testSchedule_fields\": {\n      \"plannedStart\": \"ISO date or omit\",\n      \"plannedFinish\": \"ISO date or omit\",\n      \"actualStart\": \"ISO date or omit\",\n      \"actualFinish\": \"ISO date or omit\"\n    },\n    \"common_COR_columns\": {\n      \"_note\": \"Most COR Excel files use this layout (first 2 rows are headers):\",\n      \"A\": \"Feeder Reference (only on first row of each equipment group)\",\n      \"B\": \"Equipment name (only on first row of each equipment group)\",\n      \"C\": \"Level (L1-L5)\",\n      \"D\": \"Test name\",\n      \"E-F\": \"Planned Start / Finish dates\",\n      \"G-H\": \"Actual Start / Finish dates\",\n      \"I\": \"SAT Completed Date\",\n      \"J\": \"CxA SAT Witnessed (YES/NO)\",\n      \"K\": \"Completed? (YES/NO/N/A)\",\n      \"L\": \"Report Received Date\",\n      \"M\": \"Report on Procore (YES/NO)\",\n      \"N\": \"Report Reviewed Date\",\n      \"O\": \"Report Reviewed (YES/NO)\",\n      \"P\": \"Close Out Observations (YES/NO/N/A)\",\n      \"Q\": \"Report Status Closed (YES/NO)\",\n      \"R\": \"Comments\"\n    }\n  },\n  \"name\": \"YOUR PROJECT NAME\",\n  \"projectName\": \"Same as name\",\n  \"location\": \"Site code (e.g. ZAZ062)\",\n  \"fbnId\": \"FBN Build ID (e.g. ZAZ062HV)\",\n  \"region\": \"EU\",\n  \"bayTree\": [\n    {\n      \"id\": \"sec_0\",\n      \"name\": \"Section Name (COR sheet name)\",\n      \"preset\": \"custom\",\n      \"colour\": \"#2980b9\",\n      \"subtype\": null,\n      \"feeders\": [],\n      \"children\": [],\n      \"equipment\": [\n        {\n          \"id\": \"eq_0_0\",\n          \"type\": \"custom_import_Section_Equipment\",\n          \"qty\": 1,\n          \"name\": \"Equipment Name\"\n        }\n      ]\n    }\n  ],\n  \"equipment\": [\n    {\n      \"type\": \"custom_import_Section_Equipment\",\n      \"name\": \"Equipment Name\",\n      \"displayName\": \"Equipment Name\",\n      \"feeder_ref\": \"Section Name\",\n      \"feeder_type\": \"custom\",\n      \"feeder_type_label\": \"Section Name\",\n      \"section\": \"custom\",\n      \"child_section\": null,\n      \"parent_section\": null,\n      \"customTests\": [\n        {\n          \"level\": \"L1\",\n          \"name\": \"FAT report on Procore\",\n          \"enabled\": true\n        },\n        {\n          \"level\": \"L1\",\n          \"name\": \"FAT Observation\",\n          \"enabled\": true\n        },\n        {\n          \"level\": \"L2\",\n          \"name\": \"RIF\",\n          \"enabled\": true\n        },\n        {\n          \"level\": \"L2\",\n          \"name\": \"IVF\",\n          \"enabled\": true\n        },\n        {\n          \"level\": \"L3\",\n          \"name\": \"Visual Inspection\",\n          \"enabled\": true\n        }\n      ]\n    }\n  ],\n  \"testProgress\": {\n    \"Section_Name_Equipment_Name_0\": {\n      \"tested\": true,\n      \"completed\": true,\n      \"witnessed\": false,\n      \"closed\": false,\n      \"reportOnProcore\": true,\n      \"reviewed\": true,\n      \"outstandingObs\": false,\n      \"reportReceivedDate\": \"2026-03-25T00:00:00.000Z\"\n    },\n    \"Section_Name_Equipment_Name_1\": {\n      \"tested\": false,\n      \"completed\": false,\n      \"witnessed\": false,\n      \"closed\": false,\n      \"reportOnProcore\": false,\n      \"reviewed\": false,\n      \"outstandingObs\": false\n    }\n  },\n  \"testSchedule\": {\n    \"Section_Name_Equipment_Name\": {\n      \"plannedStart\": \"2026-07-01T00:00:00.000Z\",\n      \"plannedFinish\": \"2026-07-15T00:00:00.000Z\"\n    }\n  },\n  \"customTemplates\": {}\n}";
    const blob = new Blob([template], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'cx_dashboard_import_template.json'
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

  // ══════════════════════════════════════════════════════════
  // COR IMPORT FUNCTIONS
  // ══════════════════════════════════════════════════════════
  async function handleCorUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setCorImportStatus('Parsing...')
    setCorParsedData(null)

    try {
      const buffer = await file.arrayBuffer()
      const wb = new ExcelJS.Workbook()
      await wb.xlsx.load(buffer)

      // ── Extract project name from "Project Overview" sheet ──
      let projectName = file.name.replace(/\.(xlsx|xlsm)$/i, '')
      const overviewSheet = wb.getWorksheet('Project Overview')
      if (overviewSheet) {
        for (let r = 1; r <= 20; r++) {
          const row = overviewSheet.getRow(r)
          const cellC = row.getCell(3).value
          const cellD = row.getCell(4).value
          if (cellC && String(cellC).includes('Project Name') && cellD) {
            projectName = String(cellD).trim()
            break
          }
        }
      }

      const parsed = {}
      parsed.__projectName = projectName
      let totalTests = 0
      let sheetsWithData = 0

      for (const ws of wb.worksheets) {
        // Skip non-data sheets
        if (['Project Overview', 'Cx Programme', 'Cx Schedule', 'Detailed Breakdown', 'Cx Charts', 'Certificate of Readiness', 'Revision History'].includes(ws.name)) continue

        const equipmentGroups = []
        let currentGroup = null
        const rowCount = ws.rowCount || 500

        for (let rowNum = 4; rowNum <= rowCount; rowNum++) {
          const row = ws.getRow(rowNum)

          // Helper to extract cell text
          function getCellText(col) {
            let v = row.getCell(col).value
            if (!v) return ''
            if (typeof v === 'object') {
              if (v.richText) return v.richText.map(r => r.text).join('').trim()
              if (v.result !== undefined) return String(v.result).trim()
              return String(v).trim()
            }
            return String(v).trim()
          }

          const colA = getCellText(1) // S.No
          const colB = getCellText(2) // Equipment name (separator) or feeder ref
          const colD = getCellText(4) // Level code (e.g. "L3")
          const colE = getCellText(5) // Test name

          // ── Detect equipment separator row ──
          // A row is an equipment separator if col A is NOT a number and col B has text
          const isNumericSNo = /^\d+$/.test(colA)

          if (!isNumericSNo && colB) {
            currentGroup = { name: colB, tests: [] }
            equipmentGroups.push(currentGroup)
            continue
          }

          // ── Test data row ──
          // Must have a numeric S.No in col A
          if (!isNumericSNo) continue

          // DEBUG: log first 3 test rows per sheet to console
          if (currentGroup && currentGroup.tests.length < 3) console.log(`[COR Import] Sheet "${ws.name}" Row ${rowNum}: colA="${colA}" colD="${colD}" colE="${colE}"`, row.getCell(5).value)

          // If no equipment group has been started yet, create a default one
          if (!currentGroup) {
            currentGroup = { name: ws.name, tests: [] }
            equipmentGroups.push(currentGroup)
          }

          const detectedLevel = colD.match(/L([1-5])/) ? colD.match(/L([1-5])/)[0] : 'L3'
          const rowData = { test: colE, row: rowNum, level: detectedLevel }

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
          const reviewed = cellStr(16)
          const outstandingObs = cellStr(17)
          const reportClosed = cellStr(18)
          const comments = cellStr(19)
          const critical = cellStr(3)

          if (satCompleted) rowData.satCompleted = satCompleted.toUpperCase()
          if (witnessed) rowData.witnessed = witnessed.toUpperCase()
          if (completed) rowData.completed = completed.toUpperCase()
          if (reportReceived) rowData.reportReceived = reportReceived.toUpperCase()
          if (reportProcore) rowData.reportProcore = reportProcore.toUpperCase()
          if (reportReviewed) rowData.reportReviewed = reportReviewed.toUpperCase()
          if (reportClosed) rowData.reportClosed = reportClosed.toUpperCase()
          if (reviewed) rowData.reviewed = reviewed.toUpperCase()
          if (outstandingObs) rowData.outstandingObs = outstandingObs.toUpperCase()
          if (critical) rowData.critical = critical.toUpperCase()
          if (comments) rowData.comments = String(comments)

          // Date columns — store raw Date values for report dates (cols 13, 15)
          const reportReceivedRaw = row.getCell(13).value
          const reportReviewedRaw = row.getCell(15).value
          if (reportReceivedRaw instanceof Date && !isNaN(reportReceivedRaw.getTime())) rowData.reportReceivedDate = reportReceivedRaw
          else if (typeof reportReceivedRaw === 'number' && reportReceivedRaw > 1000) { const d = new Date((reportReceivedRaw - 25569) * 86400 * 1000); if (!isNaN(d.getTime())) rowData.reportReceivedDate = d }
          if (reportReviewedRaw instanceof Date && !isNaN(reportReviewedRaw.getTime())) rowData.reportReviewedDate = reportReviewedRaw
          else if (typeof reportReviewedRaw === 'number' && reportReviewedRaw > 1000) { const d = new Date((reportReviewedRaw - 25569) * 86400 * 1000); if (!isNaN(d.getTime())) rowData.reportReviewedDate = d }

          currentGroup.tests.push(rowData)
          totalTests++
        }

        if (equipmentGroups.length > 0) {
          parsed[ws.name] = { equipmentGroups }
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

    // Check if there's existing data and warn
    const existingTree = localStorage.getItem('bay_tree_v5')
    const hasExistingData = existingTree && JSON.parse(existingTree).length > 0
    const msg = hasExistingData
      ? '⚠️ You have existing project data in Scope & Export.\n\nThis will DELETE all current sections, equipment, tests, progress, and schedule data and replace it with the COR file.\n\nContinue?'
      : 'This will load the COR data as your current project. Continue?'
    if (!confirm(msg)) return

    try {
    console.log('[COR Import] Loading project from parsed COR data...')

    // Clear all existing project data first
    localStorage.removeItem('bay_tree_v5')
    localStorage.removeItem('bay_equipment')
    localStorage.removeItem('test_schedule')
    localStorage.removeItem('test_progress')
    localStorage.removeItem('cx_custom_templates')

    function toISO(v) {
      if (!v) return ''
      if (v instanceof Date) {
        if (isNaN(v.getTime())) return ''
        return v.toISOString().slice(0, 10)
      }
      if (typeof v === 'number') {
        const d = new Date((v - 25569) * 86400 * 1000)
        return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
      }
      const s = String(v).slice(0, 10)
      const test = new Date(s)
      return isNaN(test.getTime()) ? '' : s
    }

    const projectName = corParsedData.__projectName || 'Imported Project'
    let totalTests = 0

    // ── Step 1: Build bay_tree_v5 ──
    const bayTree = Object.keys(corParsedData)
      .filter(k => k !== '__projectName')
      .map((sheetName, idx) => ({
        id: `ln_${Date.now()}_${idx}`,
        name: sheetName,
        preset: 'custom',
        colour: '#2980b9',
        subtype: null,
        equipment: corParsedData[sheetName].equipmentGroups.map((eq, eqIdx) => ({
          id: `eq_${Date.now()}_${idx}_${eqIdx}`,
          type: `custom_import_${sheetName}_${eq.name}`.replace(/[^a-zA-Z0-9]/g, '_'),
          qty: 1,
          name: eq.name,
        })),
        feeders: [],
        children: [],
      }))

    // ── Step 2: Build bay_equipment ──
    const bayEquipment = []
    for (const [sheetName, sheetData] of Object.entries(corParsedData)) {
      if (sheetName === '__projectName') continue
      for (const eq of sheetData.equipmentGroups) {
        const eqType = `custom_import_${sheetName}_${eq.name}`.replace(/[^a-zA-Z0-9]/g, '_')
        bayEquipment.push({
          type: eqType,
          name: eq.name,
          displayName: eq.name,
          feeder_ref: sheetName,
          feeder_type: 'custom',
          feeder_type_label: sheetName,
          section: 'custom',
          child_section: null,
          parent_section: null,
          customTests: eq.tests.map(t => ({
            level: t.level || 'L3',
            name: t.test,
            enabled: true,
          })),
        })
        totalTests += eq.tests.length
      }
    }

    // ── Step 3: Build test_schedule ──
    const testSchedule = {}
    for (const [sheetName, sheetData] of Object.entries(corParsedData)) {
      if (sheetName === '__projectName') continue
      for (const eq of sheetData.equipmentGroups) {
        const firstWithDates = eq.tests.find(t => t.plannedStart || t.actualStart)
        if (firstWithDates) {
          const key = `${sheetName.replace(/\s/g, '_')}_${eq.name.replace(/\s/g, '_')}`
          testSchedule[key] = {
            plannedStart: toISO(firstWithDates.plannedStart),
            plannedFinish: toISO(firstWithDates.plannedFinish),
            actualStart: toISO(firstWithDates.actualStart),
            actualFinish: toISO(firstWithDates.actualFinish),
          }
        }
      }
    }

    // ── Step 4: Build test_progress ──
    const testProgress = {}
    for (const [sheetName, sheetData] of Object.entries(corParsedData)) {
      if (sheetName === '__projectName') continue
      for (const eq of sheetData.equipmentGroups) {
        eq.tests.forEach((t, idx) => {
          const key = `${sheetName.replace(/\s/g, '_')}_${eq.name.replace(/\s/g, '_')}_${idx}`
          const tested = t.satCompleted === 'YES'
          const witnessed = t.witnessed === 'YES'
          const completedVal = t.completed === 'YES' ? true : (t.completed === 'N/A' || t.completed === 'NA') ? 'NA' : false
          let reportReceivedDate = null
          try {
            if (t.reportReceivedDate instanceof Date && !isNaN(t.reportReceivedDate.getTime())) reportReceivedDate = t.reportReceivedDate.toISOString().split('T')[0]
            else if (typeof t.reportReceivedDate === 'number') { const d = new Date((t.reportReceivedDate - 25569) * 86400000); if (!isNaN(d.getTime())) reportReceivedDate = d.toISOString().split('T')[0] }
            else if (typeof t.reportReceivedDate === 'string' && t.reportReceivedDate) reportReceivedDate = t.reportReceivedDate.slice(0, 10)
          } catch { /* skip bad date */ }
          const reportOnProcore = t.reportProcore === 'YES'
          let reportReviewedDate = null
          try {
            if (t.reportReviewedDate instanceof Date && !isNaN(t.reportReviewedDate.getTime())) reportReviewedDate = t.reportReviewedDate.toISOString().split('T')[0]
            else if (typeof t.reportReviewedDate === 'number') { const d = new Date((t.reportReviewedDate - 25569) * 86400000); if (!isNaN(d.getTime())) reportReviewedDate = d.toISOString().split('T')[0] }
            else if (typeof t.reportReviewedDate === 'string' && t.reportReviewedDate) reportReviewedDate = t.reportReviewedDate.slice(0, 10)
          } catch { /* skip bad date */ }
          const reviewedVal = t.reviewed === 'YES' ? true : (t.reviewed === 'N/A' || t.reviewed === 'NA') ? 'NA' : false
          const outstandingObsVal = t.outstandingObs === 'YES' ? true : (t.outstandingObs === 'N/A' || t.outstandingObs === 'NA') ? 'NA' : false
          const closed = t.reportClosed === 'YES'
          const commentsVal = t.comments || ''
          const criticalVal = t.critical === 'YES'

          // Only store entries with at least one non-default value (keeps localStorage clean)
          const hasValue = tested || witnessed || completedVal !== false || reportReceivedDate || reportOnProcore || reportReviewedDate || reviewedVal !== false || outstandingObsVal !== false || closed || commentsVal || criticalVal
          if (hasValue) {
            testProgress[key] = {
              tested, witnessed, closed,
              completed: completedVal,
              reportReceivedDate: reportReceivedDate,
              reportOnProcore,
              reportReviewedDate,
              reviewed: reviewedVal,
              outstandingObs: outstandingObsVal,
              comments: commentsVal,
              critical: criticalVal,
            }
          }
        })
      }
    }

    // ── Step 5: Save all to localStorage and reload ──
    localStorage.setItem('bay_tree_v5', JSON.stringify(bayTree))
    localStorage.setItem('bay_equipment', JSON.stringify(bayEquipment))
    localStorage.setItem('test_schedule', JSON.stringify(testSchedule))
    localStorage.setItem('test_progress', JSON.stringify(testProgress))
    localStorage.setItem('cor_projectName', projectName)

    // Also save as custom templates so BayBuilder's getTestCount/getLabel can find them
    const customTemplates = bayEquipment.map(eq => ({
      id: eq.type,
      label: eq.name,
      tests: (eq.customTests || []).map(t => [t.level, t.name]),
      createdAt: new Date().toISOString(),
    }))
    localStorage.setItem('cx_custom_templates', JSON.stringify(customTemplates))

    const sections = Object.keys(corParsedData).filter(k => k !== '__projectName').length
    console.log(`[COR Import] ✅ Saved: ${bayEquipment.length} equipment, ${totalTests} tests, ${sections} sections`)
    setCorImportStatus(`✓ Full project loaded! ${bayEquipment.length} equipment items, ${totalTests} tests across ${sections} sections.`)
    setTimeout(() => window.location.reload(), 1500)

    } catch (err) {
      console.error('[COR Import] Load failed:', err)
      setCorImportStatus(`Error loading: ${err.message}`)
      alert(`COR Load failed: ${err.message}\n\nCheck the browser console (F12) for details.`)
    }
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

  // ══════════════════════════════════════════════════════════
  // STYLES
  // ══════════════════════════════════════════════════════════
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
          <button onClick={handleDownloadTemplate} style={{ ...btnSecondary, borderColor: '#6366f1', color: '#6366f1' }}>
            📋 Download Template
          </button>
          <input
            ref={importFileRef}
            type="file"
            accept=".json"
            onChange={handleImportProject}
            style={{ display: 'none' }}
          />
        </div>

        {/* COR Import Instructions */}
        <div style={{ marginTop: 14, padding: '12px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, color: '#475569', lineHeight: 1.6 }}>
          <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 13, color: '#1e293b' }}>{'📖'} Import an existing project</div>
          <div>Have existing CORs, commissioning programmes, or other project documents? Amazon Quick can convert them into a dashboard project:</div>
          <ol style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
            <li><strong>Download the template</strong> above ({'📋'} Download Template)</li>
            <li><strong>Open Amazon Quick</strong> and attach the template + your project files (CORs, commissioning programmes, test sheets, etc.)</li>
            <li>Say: <em>"Parse my project files using this template and give me the JSON"</em></li>
            <li><strong>Upload the JSON</strong> Quick gives you using {'📁'} Import JSON, then click Load</li>
          </ol>
          <div style={{ marginTop: 6, color: '#94a3b8', fontSize: 11 }}>Works with any Excel-based project data — CORs, commissioning programmes, test scripts, equipment lists.</div>
        </div>
      </div>

      {/* ═══ COR DATA IMPORT ═══ */}
      <div style={cardStyle}>
        <div style={sectionHeaderStyle}>COR DATA IMPORT</div>
        <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 16px' }}>
          Upload a COR (.xlsx) exported from this tool to fully load the project — sections, equipment, tests, dates, and progress.
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
              ⚡ Load Full Project
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
