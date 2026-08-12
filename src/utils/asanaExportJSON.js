/**
 * Asana JSON Exporter
 * 
 * Generates a JSON file containing the full project structure
 * ready for the CLI push script (scripts/push-to-asana.js).
 * 
 * This runs in the browser — no secrets involved.
 * The actual API calls happen locally via the CLI script.
 */

import TEST_TEMPLATES from '../data/test_templates.json'

const DISPLAY_NAMES = {
  CT: 'CT - Protection', CT_HV: 'CT (HV/Outdoor)', CT_METER: 'CT - Metering',
  NCT: 'NCT / CBCT', NER_CT: 'NER CT', VT: 'VT', VT_HV: 'VT (HV/Outdoor)',
  CIRCUIT_BREAKER: 'Circuit Breaker', EARTH_SWITCH: 'Earth Switch',
  SURGE_ARRESTER: 'Surge Arrester', TRANSFORMER: 'Oil Transformer',
  DRY_TRANSFORMER: 'Dry Transformer', NER: 'NER',
  BUSBAR: 'Busbar', HV_CABLE: 'HV Cable', MV_CABLE: 'MV Cable',
  PQM: 'Power Quality Meter', EPMS: 'EPMS', RELAY: 'Relay / IED',
  CUBICLE: 'Cubicle', PROTECTION_PANEL: 'Protection Panel',
  MK_OLTC_PANEL: 'MK & OLTC Panel', STABILITY_TEST: 'Stability Test',
  SYNCH_CHECK: 'Synch Check', CABLE_DIFF: 'Cable Diff (87L)',
  L4_INTEGRATION: 'L4 Integration', ENERGIZATION: 'Energization',
  SWITCHGEAR_OVERALL: 'Switchgear Overall', AC_DC_CHECKS: 'AC/DC Distribution',
  SCADA: 'SCADA / SAS', ESB_INTERFACE: 'Grid Interface',
  SUBSTATION_CHECKS: 'Substation Checks',
  BATTERY_BANK: 'Battery Bank', BATTERY_CHARGER: 'Charger / Rectifier',
  DC_DISTRIBUTION: 'DC Distribution', UPS: 'UPS',
  DC_EARTH_FAULT: 'DC Earth Fault Monitor',
  EARTH_GRID: 'Earth Grid', EARTH_ELECTRODE: 'Earth Electrode',
  CB_GIS: 'Circuit Breaker (GIS)', DS_ES_GIS: 'Disconnector/ES (GIS)',
  ES_GIS: 'Earth Switch (GIS)', GIS_BAY: 'GIS Bay Overall',
  CT_GIS: 'CT (GIS)', VT_GIS: 'VT (GIS)', RING_CT_GIS: 'Ring CT (GIS)',
  SA_GIS: 'Surge Arrester (GIS)', HV_CABLE_GIS: 'HV Cable (GIS)',
  CUBICLE_GIS: 'Cubicle (GIS)', LCC_GIS: 'Local Control Cabinet (GIS)',
  IED_OC_GIS: 'IED O/C (GIS)', IED_87T_GIS: 'IED 87T (GIS)',
  IED_87B_GIS: 'IED 87B (GIS)', STABILITY_GIS: 'Stability (GIS)',
  ENERGIZATION_GIS: 'Energization (GIS)', EPMS_GIS: 'EPMS (GIS)',
}

function getEquipName(item) {
  return item.displayName || item.name || DISPLAY_NAMES[item.type] || item.type.replace(/_/g, ' ')
}

function getTests(item) {
  if (item.customTests) return item.customTests.filter(t => t.enabled).map(t => [t.level, t.name])
  const tmpl = TEST_TEMPLATES[item.type]
  if (!tmpl) return [['L3', `${item.type} Test`]]
  return tmpl.map(t => [t[0], t[1]])
}

/**
 * Generate Asana export JSON and trigger browser download.
 * 
 * @param {Array} equipment - Equipment list from BayBuilder
 * @param {string} projectName - Project name (e.g. "DUB069HV - 4th Transformer")
 * @returns {{ filename: string, itemCount: number, sectionCount: number }}
 */
export function exportAsanaJSON(equipment, projectName) {
  if (!equipment || equipment.length === 0) {
    throw new Error('No equipment to export')
  }

  // Group by feeder_ref (section)
  const sections = {}
  for (const item of equipment) {
    const ref = item.feeder_ref || 'Unassigned'
    const dashIdx = ref.indexOf(' — ')
    const sectionName = dashIdx >= 0 ? ref.slice(dashIdx + 3) : ref

    // "Overall" feeders group under their parent
    const key = sectionName === 'Overall'
      ? `${dashIdx >= 0 ? ref.slice(0, dashIdx) : ref} — Overall`
      : sectionName

    if (!sections[key]) sections[key] = []

    const tests = getTests(item)
    sections[key].push({
      name: getEquipName(item),
      type: item.type,
      tests: tests, // [level, testName] pairs
    })
  }

  // Build the export object
  const exportData = {
    projectName: projectName || 'HV Substation Commissioning',
    exportedAt: new Date().toISOString(),
    equipment: equipment.map(item => ({
      name: getEquipName(item),
      type: item.type,
      feeder_ref: item.feeder_ref,
    })),
    sections,
  }

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16)
  const safeName = projectName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40)
  const filename = `asana_${safeName}_${timestamp}.json`

  // Trigger browser download
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  return {
    filename,
    itemCount: equipment.length,
    sectionCount: Object.keys(sections).length,
  }
}
