/**
 * Asana CSV Exporter v2
 * 
 * Generates a well-structured CSV for Asana import with:
 *   - Clean human-readable names (no raw type keys)
 *   - Milestone tasks for key commissioning gates
 *   - Auto-generated timeline dates (L1→L2→L3→L4→L5 sequencing)
 *   - Task dependencies (later levels depend on earlier)
 *   - Proper custom field values
 *   - Project description as first task
 */

import TEST_TEMPLATES from '../data/test_templates.json'

// ─── DISPLAY NAMES ───────────────────────────────────────────────────────────
const DISPLAY_NAMES = {
  CT: 'CT - Protection', CT_HV: 'CT (HV/Outdoor)', CT_METER: 'CT - Metering',
  NCT: 'NCT / CBCT', NER_CT: 'NER CT', VT: 'VT', VT_HV: 'VT (HV/Outdoor)',
  CIRCUIT_BREAKER: 'Circuit Breaker', EARTH_SWITCH: 'Earth Switch / Disconnector',
  SURGE_ARRESTER: 'Surge Arrester', TRANSFORMER: 'Oil Transformer',
  DRY_TRANSFORMER: 'Dry Transformer', NER: 'NER (Neutral Earth Resistor)',
  BUSBAR: 'Busbar', HV_CABLE: 'HV Cable', MV_CABLE: 'MV Cable',
  PQM: 'Power Quality Meter', EPMS: 'EPMS', RELAY: 'Relay / IED',
  CUBICLE: 'Cubicle / Switchgear Panel', PROTECTION_PANEL: 'Protection Panel',
  MK_OLTC_PANEL: 'MK & OLTC Panel', STABILITY_TEST: 'Stability Test',
  SYNCH_CHECK: 'Synch Check Relay', CABLE_DIFF: 'Cable Differential (87L)',
  L4_INTEGRATION: 'L4 Integration / FPT', ENERGIZATION: 'Energization',
  SWITCHGEAR_OVERALL: 'Switchgear Overall', AC_DC_CHECKS: 'AC/DC Distribution',
  SCADA: 'SCADA / SAS', ESB_INTERFACE: 'Grid Interface',
  SUBSTATION_CHECKS: 'Substation Checks',
  // GIS
  CT_GIS: 'CT (GIS)', VT_GIS: 'VT (GIS)', CB_GIS: 'Circuit Breaker (GIS)',
  DS_ES_GIS: 'Disconnector / ES (GIS)', ES_GIS: 'Earth Switch (GIS)',
  SA_GIS: 'Surge Arrester (GIS)', RING_CT_GIS: 'Ring CT (GIS)',
  HV_CABLE_GIS: 'HV Cable (GIS)', GIS_BAY: 'GIS Bay (Overall)',
  CUBICLE_GIS: 'Cubicle (GIS)', IED_OC_GIS: 'IED O/C (GIS)',
  IED_87T_GIS: 'IED 87T (GIS)', IED_87B_GIS: 'IED 87B (GIS)',
  LCC_GIS: 'Local Control Cabinet (GIS)', STABILITY_GIS: 'Stability Test (GIS)',
  EPMS_GIS: 'EPMS (GIS)', ENERGIZATION_GIS: 'Energization (GIS)',
  // Battery/DC
  BATTERY_BANK: 'Battery Bank', BATTERY_CHARGER: 'Charger / Rectifier',
  DC_DISTRIBUTION: 'DC Distribution', UPS: 'UPS', DC_EARTH_FAULT: 'DC Earth Fault Monitor',
  EARTH_GRID: 'Earth Grid', EARTH_ELECTRODE: 'Earth Electrode',
}

const LEVEL_LABELS = {
  L1: 'L1 - Factory Testing',
  L2: 'L2 - Installation & Pre-SAT',
  L3: 'L3 - Site Acceptance Testing',
  L4: 'L4 - Functional Performance Testing',
  L5: 'L5 - Energization',
}

const LEVEL_SHORT = { L1: 'L1', L2: 'L2', L3: 'L3', L4: 'L4', L5: 'L5' }

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function getTests(item) {
  if (item.customTests) return item.customTests.filter(t => t.enabled).map(t => [t.level, t.name, t.testSheet || ''])
  const tmpl = TEST_TEMPLATES[item.type]
  if (!tmpl) return [['L3', `${item.type} Test`, '']]
  return tmpl.map(t => [t[0], t[1], t[2] || ''])
}

function getEquipName(item) {
  return item.displayName || item.name || DISPLAY_NAMES[item.type] || item.type
}

function getTypeName(type) {
  return DISPLAY_NAMES[type] || type
}

function escapeCsv(val) {
  if (val == null) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

// Generate date string offset from a base date
function dateOffset(baseDate, days) {
  const d = new Date(baseDate)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]  // YYYY-MM-DD format for Asana
}

// ─── SECTION NAME CLEANUP ────────────────────────────────────────────────────
function cleanSectionName(feederRef) {
  // "MV Switchgear — 01A Incomer" → "01A Incomer"
  // "Transformer Bay" → "Transformer Bay"
  // "MV Switchgear — Overall" → "Switchgear Overall"
  const dashIdx = feederRef.indexOf(' \u2014 ')
  if (dashIdx >= 0) {
    const section = feederRef.slice(0, dashIdx)
    const sub = feederRef.slice(dashIdx + 3)
    if (sub === 'Overall') return `${section} - Overall`
    return sub
  }
  return feederRef
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────
export function generateAsanaCSV(equipmentData, projectName, projectConfig = {}) {
  if (!equipmentData || equipmentData.length === 0) return null

  const baseDate = new Date()  // Start from today
  
  // Group equipment by feeder_ref
  const feederGroups = {}
  for (const item of equipmentData) {
    const ref = item.feeder_ref || 'Unassigned'
    if (!feederGroups[ref]) feederGroups[ref] = []
    feederGroups[ref].push(item)
  }

  // Headers
  const headers = [
    'Name',
    'Description',
    'Section/Column',
    'Assignee',
    'Start Date',
    'Due Date',
    'Parent Task',
    'Level',
    'Priority',
    'Status',
    'Equipment',
    'Section Group',
  ]

  const rows = []
  let totalTests = 0
  let totalEquipment = 0
  let dayOffset = 0  // Rolling day offset for timeline

  // ─── MILESTONES (at top) ───
  const milestones = [
    { name: '🏁 Commissioning Kickoff', dayOffset: 0 },
    { name: '📋 All L2 Documentation Complete', dayOffset: 14 },
    { name: '⚡ L3 SAT Complete', dayOffset: 56 },
    { name: '🔗 L4 Integration Complete', dayOffset: 70 },
    { name: '🟢 Ready for Energization (C2E)', dayOffset: 77 },
    { name: '⚡ ENERGIZATION', dayOffset: 84 },
    { name: '✅ Declaration of Fitness (DOF)', dayOffset: 91 },
  ]

  // Add milestones section
  for (const ms of milestones) {
    rows.push({
      name: ms.name,
      description: '',
      section: 'Milestones',
      assignee: '',
      startDate: '',
      dueDate: dateOffset(baseDate, ms.dayOffset),
      parentTask: '',
      level: '',
      priority: 'High',
      status: 'Not Started',
      equipment: '',
      sectionGroup: 'Milestones',
    })
  }

  // ─── EQUIPMENT TASKS ───
  for (const [feederRef, items] of Object.entries(feederGroups)) {
    const sectionName = cleanSectionName(feederRef)
    
    // Determine section group (top-level section name before " — ")
    const dashIdx = feederRef.indexOf(' \u2014 ')
    const sectionGroup = dashIdx >= 0 ? feederRef.slice(0, dashIdx) : feederRef

    // Level offsets for this section (stagger across timeline)
    const levelStartDay = {
      L1: dayOffset,
      L2: dayOffset + 7,
      L3: dayOffset + 14,
      L4: dayOffset + 42,
      L5: dayOffset + 56,
    }

    for (const item of items) {
      const equipName = getEquipName(item)
      const tests = getTests(item)
      const typeName = getTypeName(item.type)
      totalEquipment++

      // Count tests per level for duration calculation
      const levelCounts = {}
      for (const [lvl] of tests) {
        levelCounts[lvl] = (levelCounts[lvl] || 0) + 1
      }

      // Parent task (equipment item)
      const parentStartDay = Math.min(...Object.keys(levelCounts).map(l => levelStartDay[l] || dayOffset))
      const parentEndDay = Math.max(...Object.keys(levelCounts).map(l => (levelStartDay[l] || dayOffset) + (levelCounts[l] || 1) * 2))

      rows.push({
        name: equipName,
        description: `${typeName} — ${tests.length} tests across ${Object.keys(levelCounts).length} levels\nSection: ${sectionGroup}\nFeeder: ${sectionName}`,
        section: sectionName,
        assignee: '',
        startDate: dateOffset(baseDate, parentStartDay),
        dueDate: dateOffset(baseDate, parentEndDay),
        parentTask: '',
        level: '',
        priority: 'Medium',
        status: 'Not Started',
        equipment: typeName,
        sectionGroup: sectionGroup,
      })

      // Subtasks (individual tests)
      let testIdx = 0
      for (const [level, testName, testSheet] of tests) {
        totalTests++
        const testStartDay = (levelStartDay[level] || dayOffset) + testIdx * 2
        const testDueDay = testStartDay + 1

        rows.push({
          name: `${LEVEL_SHORT[level] || level} │ ${testName}`,
          description: testSheet ? `Test sheet: ${testSheet}` : '',
          section: sectionName,
          assignee: '',
          startDate: dateOffset(baseDate, testStartDay),
          dueDate: dateOffset(baseDate, testDueDay),
          parentTask: equipName,
          level: LEVEL_LABELS[level] || level,
          priority: level === 'L5' ? 'High' : level === 'L4' ? 'Medium' : 'Low',
          status: 'Not Started',
          equipment: typeName,
          sectionGroup: sectionGroup,
        })
        testIdx++
      }
    }

    // Offset next section forward in timeline
    dayOffset += 7
  }

  // ─── BUILD CSV ───
  const csvLines = [headers.map(escapeCsv).join(',')]
  for (const row of rows) {
    csvLines.push([
      escapeCsv(row.name),
      escapeCsv(row.description),
      escapeCsv(row.section),
      escapeCsv(row.assignee),
      escapeCsv(row.startDate),
      escapeCsv(row.dueDate),
      escapeCsv(row.parentTask),
      escapeCsv(row.level),
      escapeCsv(row.priority),
      escapeCsv(row.status),
      escapeCsv(row.equipment),
      escapeCsv(row.sectionGroup),
    ].join(','))
  }

  const csvContent = csvLines.join('\n')

  // Download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `Asana_${projectName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  return {
    totalEquipment,
    totalTests,
    totalRows: rows.length,
    sections: Object.keys(feederGroups).length,
    milestones: milestones.length,
  }
}
