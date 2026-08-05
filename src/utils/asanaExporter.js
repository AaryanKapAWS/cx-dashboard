/**
 * Asana CSV Exporter v3
 * 
 * Exports equipment-level tasks (NOT individual tests as subtasks).
 * Tests become a checklist in the task Description field.
 * 
 * Key design decisions:
 *   - ~86 tasks instead of 577 (every task visible on Timeline/Board/Calendar)
 *   - 1-3 day durations per task (clean Gantt bars)
 *   - Milestones as diamonds (start date = due date)
 *   - Dependencies for sequencing (L1→L2→L3→L4→L5 flow)
 *   - Dates in MM/DD/YYYY (Asana requirement)
 *   - Custom fields: Level, Priority, Status, Equipment Type, Witness Required
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
  CT_GIS: 'CT (GIS)', VT_GIS: 'VT (GIS)', CB_GIS: 'Circuit Breaker (GIS)',
  DS_ES_GIS: 'Disconnector / ES (GIS)', ES_GIS: 'Earth Switch (GIS)',
  SA_GIS: 'Surge Arrester (GIS)', RING_CT_GIS: 'Ring CT (GIS)',
  HV_CABLE_GIS: 'HV Cable (GIS)', GIS_BAY: 'GIS Bay (Overall)',
  CUBICLE_GIS: 'Cubicle (GIS)', IED_OC_GIS: 'IED O/C (GIS)',
  IED_87T_GIS: 'IED 87T (GIS)', IED_87B_GIS: 'IED 87B (GIS)',
  LCC_GIS: 'Local Control Cabinet (GIS)', STABILITY_GIS: 'Stability Test (GIS)',
  EPMS_GIS: 'EPMS (GIS)', ENERGIZATION_GIS: 'Energization (GIS)',
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

// Equipment that requires CxA witnessing
const WITNESS_TYPES = new Set([
  'TRANSFORMER', 'DRY_TRANSFORMER', 'CIRCUIT_BREAKER', 'CB_GIS',
  'ENERGIZATION', 'ENERGIZATION_GIS', 'STABILITY_TEST', 'STABILITY_GIS',
  'L4_INTEGRATION', 'PROTECTION_PANEL',
])

// Duration (days) per equipment based on test complexity
function getDuration(item, testCount) {
  if (testCount <= 3) return 1
  if (testCount <= 8) return 2
  if (testCount <= 15) return 3
  if (testCount <= 25) return 4
  return 5  // Transformers (33+ tests)
}

// Priority based on equipment criticality
function getPriority(type) {
  if (['TRANSFORMER', 'DRY_TRANSFORMER', 'ENERGIZATION', 'ENERGIZATION_GIS'].includes(type)) return 'High'
  if (['CIRCUIT_BREAKER', 'CB_GIS', 'STABILITY_TEST', 'L4_INTEGRATION', 'PROTECTION_PANEL'].includes(type)) return 'High'
  if (['CT', 'CT_HV', 'VT', 'VT_HV', 'RELAY', 'CUBICLE'].includes(type)) return 'Medium'
  return 'Low'
}

// Determine dominant level for an equipment item
function getDominantLevel(tests) {
  const counts = {}
  for (const [level] of tests) {
    counts[level] = (counts[level] || 0) + 1
  }
  // Return level with most tests
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'L3'
}

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

// Format date as MM/DD/YYYY (Asana requirement)
function formatDate(date) {
  const d = new Date(date)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${mm}/${dd}/${yyyy}`
}

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

// Build test checklist for description field
function buildChecklist(tests, item) {
  const lines = []
  lines.push(`━━━ TESTS (${tests.length}) ━━━`)

  // Group by level
  const byLevel = {}
  for (const [level, name] of tests) {
    if (!byLevel[level]) byLevel[level] = []
    byLevel[level].push(name)
  }

  for (const level of ['L1', 'L2', 'L3', 'L4', 'L5']) {
    if (!byLevel[level]) continue
    lines.push('')
    lines.push(`${LEVEL_LABELS[level] || level}:`)
    for (const name of byLevel[level]) {
      lines.push(`☐ ${name}`)
    }
  }

  lines.push('')
  lines.push('━━━ INFO ━━━')
  lines.push(`Equipment Type: ${getTypeName(item.type)}`)
  if (WITNESS_TYPES.has(item.type)) lines.push('⚠️ CxA Witnessing Required')

  return lines.join('\n')
}

// Clean section name for Asana
function cleanSectionName(feederRef) {
  const dashIdx = feederRef.indexOf(' \u2014 ')
  if (dashIdx >= 0) {
    const sub = feederRef.slice(dashIdx + 3)
    if (sub === 'Overall') {
      const section = feederRef.slice(0, dashIdx)
      return `${section} — Overall`
    }
    return sub
  }
  return feederRef
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────
export function generateAsanaCSV(equipmentData, projectName, projectConfig = {}) {
  if (!equipmentData || equipmentData.length === 0) return null

  const startDate = new Date()  // Base: today
  startDate.setDate(startDate.getDate() + 1) // Start tomorrow

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
    'Dependents',
    'Level',
    'Priority',
    'Status',
    'Equipment Type',
    'Witness Required',
    '% Complete',
  ]

  const rows = []
  let totalEquipment = 0
  let totalTests = 0
  let currentDate = new Date(startDate)

  // ─── MILESTONES (first section) ───
  const msSection = 'Milestones'
  const milestones = [
    { name: '🏁 Commissioning Kickoff', offset: 0 },
    { name: '📋 L2 Pre-SAT Documentation Complete', offset: 14 },
    { name: '⚡ L3 SAT Testing Complete', offset: 49 },
    { name: '🔗 L4 Integration & FPT Complete', offset: 63 },
    { name: '🟢 C2E — Ready for Energization', offset: 70 },
    { name: '⚡ SUBSTATION ENERGIZED', offset: 77 },
    { name: '✅ Declaration of Fitness (DOF)', offset: 84 },
  ]

  for (const ms of milestones) {
    const msDate = addDays(startDate, ms.offset)
    rows.push({
      name: ms.name,
      description: '',
      section: msSection,
      assignee: '',
      startDate: formatDate(msDate),
      dueDate: formatDate(msDate),  // Same date = milestone diamond
      dependents: '',
      level: '',
      priority: 'High',
      status: 'Not Started',
      equipType: '',
      witness: '',
      percent: '0',
    })
  }

  // ─── EQUIPMENT TASKS (per section) ───
  let sectionDayOffset = 0

  for (const [feederRef, items] of Object.entries(feederGroups)) {
    const sectionName = cleanSectionName(feederRef)
    let taskDayOffset = sectionDayOffset

    for (const item of items) {
      const equipName = getEquipName(item)
      const tests = getTests(item)
      const testCount = tests.length
      const duration = getDuration(item, testCount)
      const dominantLevel = getDominantLevel(tests)
      totalEquipment++
      totalTests += testCount

      const taskStart = addDays(startDate, taskDayOffset)
      const taskEnd = addDays(startDate, taskDayOffset + duration)

      // Build rich description with test checklist
      const description = buildChecklist(tests, item)

      rows.push({
        name: equipName,
        description: description,
        section: sectionName,
        assignee: '',
        startDate: formatDate(taskStart),
        dueDate: formatDate(taskEnd),
        dependents: '',
        level: LEVEL_LABELS[dominantLevel] || dominantLevel,
        priority: getPriority(item.type),
        status: 'Not Started',
        equipType: getTypeName(item.type),
        witness: WITNESS_TYPES.has(item.type) ? 'Yes' : 'No',
        percent: '0',
      })

      // Stagger next task (overlap slightly for parallel work)
      taskDayOffset += Math.max(1, duration - 1)
    }

    // Next section starts after current one (with 1 day gap)
    sectionDayOffset = taskDayOffset + 1
  }

  // ─── Add dependencies between milestones ───
  // (Milestones depend on prior milestone — creates timeline flow)
  // Note: "Dependents" column = tasks that THIS task blocks (i.e. tasks below it that depend on it)
  // So milestone 1 has dependent = milestone 2's name
  for (let i = 0; i < milestones.length - 1; i++) {
    rows[i].dependents = milestones[i + 1].name
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
      escapeCsv(row.dependents),
      escapeCsv(row.level),
      escapeCsv(row.priority),
      escapeCsv(row.status),
      escapeCsv(row.equipType),
      escapeCsv(row.witness),
      escapeCsv(row.percent),
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
    timespan: `${sectionDayOffset} days`,
  }
}
