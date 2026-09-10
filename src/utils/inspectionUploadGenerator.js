import JSZip from 'jszip'
import { saveAs } from 'file-saver'

const PROGRESS_KEY = 'test_progress'
const SCHEDULE_KEY = 'test_schedule'

// Equipment type → CxHV inspection template mapping
const TEMPLATE_MAP = {
  // ── Transformers ──
  TRANSFORMER: 'CxHV-Power Transformer',
  DRY_TRANSFORMER: 'CxHV-Power Transformer',
  AUX_TRANSFORMER_ENHANCED: 'CxHV-Auxiliary Transformer',
  MK_OLTC_PANEL: 'CxHV-Power Transformer',
  DGA_MONITOR: 'CxHV-Power Transformer',
  // ── Current Transformers ──
  CT: 'CxHV-Current Transformer',
  CT_HV: 'CxHV-Current Transformer',
  CT_GIS: 'CxHV-Current Transformer',
  CT_METER: 'CxHV-Current Transformer',
  NCT: 'CxHV-Current Transformer',
  NER_CT: 'CxHV-Current Transformer',
  RING_CT_GIS: 'CxHV-Current Transformer',
  // ── Voltage Transformers ──
  VT: 'CxHV-Voltage Transformer',
  VT_HV: 'CxHV-Voltage Transformer',
  VT_GIS: 'CxHV-Voltage Transformer',
  // ── Surge Arresters ──
  SURGE_ARRESTER: 'CxHV-Surge Arrester',
  SA_GIS: 'CxHV-Surge Arrester',
  // ── Neutral Earthing ──
  NER: 'CxHV-Neutral Earthing Transformer/Resistor',
  NER_STANDALONE: 'CxHV-Neutral Earthing Transformer/Resistor',
  // ── Busbar & AIS Switchgear ──
  BUSBAR: 'CxHV-AIS Main Busbar',
  SWITCHGEAR_OVERALL: 'CxHV-Air Insulated Switchgear (AIS)',
  CUBICLE: 'Cx-MV Switchgear',
  CIRCUIT_BREAKER: 'CxHV-Circuit Breaker',
  EARTH_SWITCH: 'CxHV-Disconnector & Earth Switch',
  // ── GIS Equipment ──
  GIS_BAY: 'CxHV-Gas Insulated Switchgear (GIS)',
  CB_GIS: 'CxHV-Gas Insulated Switchgear (GIS)',
  CUBICLE_GIS: 'CxHV-Gas Insulated Switchgear (GIS)',
  DS_ES_GIS: 'CxHV-Disconnector & Earth Switch',
  ES_GIS: 'CxHV-Disconnector & Earth Switch',
  ENERGIZATION_GIS: 'CxHV-HV Substation',
  EPMS_GIS: 'Cx-Controls-EPMS',
  STABILITY_GIS: 'CxHV-Relay Panels',
  B_WATCH_3: 'CxHV-Gas Insulated Switchgear (GIS)',
  VPIS: 'CxHV-Gas Insulated Switchgear (GIS)',
  // ── Cables ──
  HV_CABLE: 'CxHV-HV & MV Cable',
  HV_CABLE_GIS: 'CxHV-HV & MV Cable',
  MV_CABLE: 'CxHV-HV & MV Cable',
  LV_CONTROL_CABLE: 'Cx-LV Cable',
  LV_POWER_CABLE: 'Cx-LV Cable',
  // ── Protection & Relays ──
  PROTECTION_PANEL: 'CxHV-Relay Panels',
  RELAY: 'CxHV-Relay Panels',
  STABILITY_TEST: 'CxHV-Relay Panels',
  SYNCH_CHECK: 'CxHV-Relay Panels',
  CABLE_DIFF: 'CxHV-Relay Panels',
  LOCKOUT_RELAY: 'CxHV-Relay Panels',
  BUSBAR_PROTECTION_CENTRAL: 'CxHV-Relay Panels',
  BUSBAR_PROTECTION_RELAY: 'CxHV-Relay Panels',
  IED_87B_GIS: 'CxHV-Relay Panels',
  IED_87L: 'CxHV-Relay Panels',
  IED_87T: 'CxHV-Relay Panels',
  IED_87T_GIS: 'CxHV-Relay Panels',
  IED_AVR: 'CxHV-Relay Panels',
  IED_OC_GIS: 'CxHV-Relay Panels',
  IED_REF: 'CxHV-Relay Panels',
  ARC_FLASH_DETECTION: 'CxHV-Relay Panels',
  SAS_PANEL: 'CxHV-Relay Panels',
  LCC_GIS: 'CxHV-Relay Panels',
  // ── Panels ──
  BBP_PANEL: 'Cx-Panelboard',
  AC_POWER_PANEL: 'Cx-Panelboard',
  AC_UPS_PANEL: 'Cx-Panelboard',
  // ── Battery & DC ──
  BATTERY_BANK: 'CxHV-Battery & Charger',
  BATTERY_CHARGER: 'CxHV-Battery & Charger',
  AC_DC_CHECKS: 'CxHV-Battery & Charger',
  DC_DISTRIBUTION: 'CxHV-Battery & Charger',
  DC_EARTH_FAULT: 'CxHV-Battery & Charger',
  UPS: 'Cx-UPS',
  // ── Earthing ──
  EARTH_GRID: 'CxHV-Grounding System',
  EARTH_ELECTRODE: 'CxHV-Grounding System',
  // ── Substation / Integration ──
  SUBSTATION_CHECKS: 'CxHV-HV Substation',
  ENERGIZATION: 'CxHV-HV Substation',
  L4_INTEGRATION: 'CxHV-HV Substation',
  // ── Controls & Monitoring ──
  SCADA: 'Cx-SCCS',
  EPMS: 'Cx-Controls-EPMS',
  PQM: 'Cx-Controls-EPMS',
  // ── Other ──
  ESB_INTERFACE: 'CxHV-Blank',
  ATS: 'Cx-ATS',
  DIESEL_GENERATOR: 'CxHV-Blank',
}

// Template → Trade mapping
const TRADE_MAP = {
  'CxHV-Power Transformer': 'Electrical',
  'CxHV-Auxiliary Transformer': 'Electrical',
  'CxHV-Current Transformer': 'Electrical',
  'CxHV-Voltage Transformer': 'Electrical',
  'CxHV-Surge Arrester': 'Electrical',
  'CxHV-Neutral Earthing Transformer/Resistor': 'Electrical',
  'CxHV-AIS Main Busbar': 'Electrical',
  'CxHV-Relay Panels': 'Electrical',
  'CxHV-HV & MV Cable': 'Electrical',
  'CxHV-HV Substation': 'Commissioning',
  'CxHV-Air Insulated Switchgear (AIS)': 'Electrical',
  'CxHV-Gas Insulated Switchgear (GIS)': 'Electrical',
  'CxHV-Disconnector & Earth Switch': 'Electrical',
  'CxHV-Battery & Charger': 'Electrical',
  'CxHV-Circuit Breaker': 'Electrical',
  'CxHV-Grounding System': 'Electrical',
  'Cx-MV Switchgear': 'Electrical',
  'Cx-Panelboard': 'Electrical',
  'Cx-UPS': 'Electrical',
  'Cx-ATS': 'Electrical',
  'Cx-LV Cable': 'Electrical',
  'Cx-Controls-EPMS': 'Electrical',
  'Cx-SCCS': 'Electrical',
  'CxHV-Blank': 'Commissioning',
}

// Section → single inspection template (full substation mode)
const SECTION_TEMPLATE = {
  transformer_bay: 'CxHV-Air Insulated Switchgear (AIS)',
  switchgear: 'CxHV-Air Insulated Switchgear (AIS)',
  protection: 'CxHV-Relay Panels',
  cables: 'CxHV-HV & MV Cable',
  substation_checks: 'CxHV-HV Substation',
  panel_board: 'CxHV-Battery & Charger',
}
const SECTION_LABEL = {
  transformer_bay: 'Transformer Bay',
  switchgear: 'MV Switchgear',
  protection: 'Protection & Stability',
  cables: 'Cable Testing',
  substation_checks: 'HV Substation',
  panel_board: 'Panel Board',
}


// Display name → template fallback (for imported COR data where type is custom_import_*)
const NAME_MAP = {
  'transformer': 'CxHV-Power Transformer',
  'power transformer': 'CxHV-Power Transformer',
  'oil transformer': 'CxHV-Power Transformer',
  'dry transformer': 'CxHV-Power Transformer',
  'auxiliary transformer': 'CxHV-Auxiliary Transformer',
  'mk & oltc panel': 'CxHV-Power Transformer',
  'mk panel': 'CxHV-Power Transformer',
  'oltc panel': 'CxHV-Power Transformer',
  'dga monitor': 'CxHV-Power Transformer',
  'dga monitoring': 'CxHV-Power Transformer',
  'current transformer': 'CxHV-Current Transformer',
  'current transformers': 'CxHV-Current Transformer',
  'ct': 'CxHV-Current Transformer',
  'ner ct': 'CxHV-Current Transformer',
  'ring ct': 'CxHV-Current Transformer',
  'ct meter': 'CxHV-Current Transformer',
  'voltage transformer': 'CxHV-Voltage Transformer',
  'voltage transformers': 'CxHV-Voltage Transformer',
  'vt': 'CxHV-Voltage Transformer',
  'surge arrester': 'CxHV-Surge Arrester',
  'arresters': 'CxHV-Surge Arrester',
  'arrester': 'CxHV-Surge Arrester',
  'lightning arrester': 'CxHV-Surge Arrester',
  'ner': 'CxHV-Neutral Earthing Transformer/Resistor',
  'neutral earthing': 'CxHV-Neutral Earthing Transformer/Resistor',
  'neutral earthing resistor': 'CxHV-Neutral Earthing Transformer/Resistor',
  'neutral earthing transformer': 'CxHV-Neutral Earthing Transformer/Resistor',
  'busbar': 'CxHV-AIS Main Busbar',
  'main busbar': 'CxHV-AIS Main Busbar',
  'ais main busbar': 'CxHV-AIS Main Busbar',
  'circuit breaker': 'CxHV-Circuit Breaker',
  'breaker': 'CxHV-Circuit Breaker',
  'disconnector': 'CxHV-Disconnector & Earth Switch',
  'earth switch': 'CxHV-Disconnector & Earth Switch',
  'earthing switch': 'CxHV-Disconnector & Earth Switch',
  'fast earthing switch': 'CxHV-Disconnector & Earth Switch',
  'disconnector and earthing switch': 'CxHV-Disconnector & Earth Switch',
  'bus disconnector and earthing switches': 'CxHV-Disconnector & Earth Switch',
  'line disconnector and earthing switches': 'CxHV-Disconnector & Earth Switch',
  'gis': 'CxHV-Gas Insulated Switchgear (GIS)',
  'gas insulated switchgear': 'CxHV-Gas Insulated Switchgear (GIS)',
  'switchgear': 'CxHV-Air Insulated Switchgear (AIS)',
  'ais': 'CxHV-Air Insulated Switchgear (AIS)',
  'cubicle': 'Cx-MV Switchgear',
  'mv switchgear': 'Cx-MV Switchgear',
  'relay': 'CxHV-Relay Panels',
  'relay panel': 'CxHV-Relay Panels',
  'relay panels': 'CxHV-Relay Panels',
  'protection panel': 'CxHV-Relay Panels',
  'protection': 'CxHV-Relay Panels',
  'annunciator': 'CxHV-Relay Panels',
  'lockout relay': 'CxHV-Relay Panels',
  'busbar protection': 'CxHV-Relay Panels',
  'hv cable': 'CxHV-HV & MV Cable',
  'mv cable': 'CxHV-HV & MV Cable',
  'cable': 'CxHV-HV & MV Cable',
  'lv cable': 'Cx-LV Cable',
  'battery': 'CxHV-Battery & Charger',
  'battery bank': 'CxHV-Battery & Charger',
  'battery charger': 'CxHV-Battery & Charger',
  'charger': 'CxHV-Battery & Charger',
  'bcu': 'CxHV-Battery & Charger',
  'dc distribution': 'CxHV-Battery & Charger',
  'ups': 'Cx-UPS',
  'earth grid': 'CxHV-Grounding System',
  'earthing': 'CxHV-Grounding System',
  'grounding': 'CxHV-Grounding System',
  'earth electrode': 'CxHV-Grounding System',
  'panelboard': 'Cx-Panelboard',
  'panel board': 'Cx-Panelboard',
  'panel': 'Cx-Panelboard',
  'scada': 'Cx-SCCS',
  'sas': 'Cx-SCCS',
  'scada/sas': 'Cx-SCCS',
  'epms': 'Cx-Controls-EPMS',
  'pqm': 'Cx-Controls-EPMS',
  'ats': 'Cx-ATS',
  'diesel generator': 'CxHV-Blank',
  'generator': 'CxHV-Blank',
  'energization': 'CxHV-HV Substation',
  'energization check': 'CxHV-HV Substation',
  'substation checks': 'CxHV-HV Substation',
  'hv substation': 'CxHV-HV Substation',
  'esb interface': 'CxHV-Blank',
  'gis local interlock checks': 'CxHV-Gas Insulated Switchgear (GIS)',
  'sf6 gas test': 'CxHV-Gas Insulated Switchgear (GIS)',
  'high voltage test': 'CxHV-Gas Insulated Switchgear (GIS)',
  'visual inspection check': 'CxHV-HV Substation',
  'densimeter inspection': 'CxHV-Gas Insulated Switchgear (GIS)',
  'local control cubicle': 'CxHV-Gas Insulated Switchgear (GIS)',
  'lcc': 'CxHV-Gas Insulated Switchgear (GIS)',
  'l1 and l2': 'CxHV-HV Substation',
  'vpis': 'CxHV-Gas Insulated Switchgear (GIS)',
  'b-watch': 'CxHV-Gas Insulated Switchgear (GIS)',
  'b- watch 3_commissioning': 'CxHV-Gas Insulated Switchgear (GIS)',
  'pd monitoring': 'CxHV-Gas Insulated Switchgear (GIS)',
  'post insulator': 'CxHV-Post Insulator',
  'overhead conductor': 'CxHV-Over Head Conductor & Hardware',
}


/**
 * Resolve inspection status from test_progress data.
 * Reads test_progress from localStorage and determines the Procore inspection
 * status and relevant dates for a given equipment item.
 *
 * Returns { status, inspectionDate, closedDate } where:
 * - status: 'Open' | 'Ready for Review' | 'Complete'
 * - inspectionDate: the reportReceivedDate if available
 * - closedDate: the reportReviewedDate if available
 */
function resolveProgressStatus(item, progressData, scheduleData) {
  if (!progressData || !item) return { status: 'Open', inspectionDate: '', closedDate: '' }
  // Build the same progress key format as the dashboard uses
  const feederRef = (item.feeder_ref || 'unknown').replace(/\s/g, '_')
  const name = (item.displayName || item.name || item.type || '').replace(/\s/g, '_')
  // Check test index 0 (primary test) — if any test is completed, treat the equipment as done
  const baseKey = `${feederRef}_${name}`
  let bestStatus = 'Open', inspectionDate = '', closedDate = ''
  for (const [key, p] of Object.entries(progressData)) {
    if (!key.startsWith(baseKey)) continue
    if (!p) continue
    const isClosed = p.tested && p.witnessed && p.closed
    if (p.reportReceivedDate && !inspectionDate) inspectionDate = p.reportReceivedDate
    if (p.reportReviewedDate && !closedDate) closedDate = p.reportReviewedDate
    if ((p.completed || isClosed) && bestStatus !== 'Complete') bestStatus = 'Complete'
    else if ((p.reviewed || p.reportReviewedDate) && bestStatus === 'Open') bestStatus = 'Ready for Review'
    else if ((p.reportReceivedDate || p.witnessed) && bestStatus === 'Open') bestStatus = 'Ready for Review'
  }
  return { status: bestStatus, inspectionDate, closedDate }
}

// Resolve equipment type to Procore template — tries type ID first, then display name
function resolveTemplate(item) {
  const equipType = item.type || item.equipmentType || ''
  // Direct type match
  if (TEMPLATE_MAP[equipType]) return TEMPLATE_MAP[equipType]
  // Name-based fallback for imported/custom equipment
  const name = (item.displayName || item.name || '').toLowerCase().trim()
  if (NAME_MAP[name]) return NAME_MAP[name]
  // Partial match — check if any NAME_MAP key is contained in the name
  for (const [key, tmpl] of Object.entries(NAME_MAP)) {
    if (name.includes(key) || key.includes(name)) return tmpl
  }
  return 'CxHV-Blank'
}

// Style indices from row 6 of the reference template — maps each column to its style
const ROW6_STYLES = [
  '28','40','16','30','16','16','39','16','16','54','54','16','52',
  '16','16','16','16','16','52','19','39','16','39','20','16','25','43','23','23'
]

// Column letters A–AC (29 columns)
const COL_LETTERS = [
  'A','B','C','D','E','F','G','H','I','J','K','L','M',
  'N','O','P','Q','R','S','T','U','V','W','X','Y','Z','AA','AB','AC'
]

/**
 * Escape XML special characters
 */
function escapeXml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Build a single <row> XML string for a data row.
 * Uses inline strings (t="inlineStr") so we don't need to modify sharedStrings.xml.
 * Preserves the exact style indices from the original template's row 6.
 */
function buildRowXml(rowNum, dataArray) {
  let xml = `<row r="${rowNum}" spans="1:29" s="24" customFormat="1" ht="15.6" x14ac:dyDescent="0.3">`

  for (let c = 0; c < COL_LETTERS.length; c++) {
    const cellRef = COL_LETTERS[c] + rowNum
    const style = ROW6_STYLES[c] || '16'
    const value = dataArray[c] || ''

    if (value) {
      // Inline string — avoids touching sharedStrings.xml entirely
      xml += `<c r="${cellRef}" s="${style}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`
    } else {
      // Empty cell with style preserved
      xml += `<c r="${cellRef}" s="${style}"/>`
    }
  }

  xml += `</row>`
  return xml
}

/**
 * Generate inspection upload file by directly manipulating the .xlsm XML.
 * 
 * Approach:
 * 1. Open the template .xlsm as a ZIP (using JSZip)
 * 2. Extract xl/worksheets/sheet1.xml as text
 * 3. Keep rows 1–5 intact (all formatting, styles, heights preserved)
 * 4. Replace rows 6+ with new data rows (using correct style indices)
 * 5. Update the dimension and table range
 * 6. Re-zip everything else untouched (styles.xml, theme, VBA macros, etc.)
 * 7. Download
 * 
 * Result: EXACT formatting from the template, with only data rows changed.
 */
export async function generateInspectionUpload(equipmentData, projectConfig) {
  const { name, location, fbnBuildId, region = 'EMEA', mode = 'section' } = projectConfig
  const revision = '210906'

  // Load progress data for status-aware upload (new fields: completed, reportOnProcore, etc.)
  const progressData = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}')
  const skipUploaded = projectConfig.skipUploaded || false

  // 1. Fetch and open the template as a ZIP
  const response = await fetch(import.meta.env.BASE_URL + 'upload_template.xlsm')
  const templateBuffer = await response.arrayBuffer()
  const zip = await JSZip.loadAsync(templateBuffer)

  // 2. Read sheet1.xml
  let sheetXml = await zip.file('xl/worksheets/sheet1.xml').async('string')

  // 3. Build the new data rows
  const sections = {}
  const standalone = []

  const dataRows = []
  let skippedUploaded = 0

  if (mode === 'retro') {
    // RETRO MODE: One row per equipment item, using individual CxHV templates
    for (const item of equipmentData) {
      const equipType = item.type || item.equipmentType || ''
      const templateName = resolveTemplate(item)
      const trade = TRADE_MAP[templateName] || 'Electrical'

      // Build a meaningful asset tag:
      // - Feeder items: use "FeederRef-Type" (e.g. "01A-CT", "03A-RELAY")
      // - Equipment items with custom name: use the name
      // - Fallback: type + index
      let assetTag
      if (item.feeder_ref && item.feeder_ref.includes('—')) {
        // Feeder item: extract the feeder ref part and append the type
        const feederPart = item.feeder_ref.split('—').pop().trim()
        assetTag = `${feederPart}-${equipType}`
      } else {
        assetTag = item.name || item.displayName || `${equipType}-${dataRows.length + 1}`
      }
      const description = `${assetTag}-${templateName}-${fbnBuildId}`

      // Progress-aware status from test_progress localStorage
      const { status, inspectionDate, closedDate } = resolveProgressStatus(item, progressData)

      // Skip items already on Procore when skipUploaded is set
      if (skipUploaded && status === 'Complete' && Object.entries(progressData).some(([k, p]) =>
        k.startsWith(`${(item.feeder_ref || 'unknown').replace(/\s/g, '_')}_${(item.displayName || item.name || item.type || '').replace(/\s/g, '_')}`) && p && p.reportOnProcore
      )) { skippedUploaded++; continue }

      dataRows.push([
        revision, 'Commissioning', templateName, status, trade, location,
        '', inspectionDate, closedDate, description, assetTag, '', fbnBuildId,
        '', '', region, '', '', '', '', '', '', '', '', '', '', '', '', ''
      ])
    }
  } else {
    // SECTION MODE: One row per section (grouped)
    // Group by section type — but track unique instances via a counter
    // so duplicate section types (e.g. two Switchgear sections) each get their own row
    const sectionCounts = {}
    for (const item of equipmentData) {
      const section = item.section || ''
      if (section && section !== 'custom') {
        // Use feeder_ref to detect unique section instances
        const sectionInstance = item.feeder_ref ? item.feeder_ref.split('—')[0].trim() : section
        if (!sections[sectionInstance]) sections[sectionInstance] = { type: section, items: [] }
        sections[sectionInstance].items.push(item)
      } else {
        standalone.push(item)
      }
    }

    // Section-level rows
    for (const [sectionInstance, { type: sectionType, items }] of Object.entries(sections)) {
      const templateName = SECTION_TEMPLATE[sectionType] || 'CxHV-Blank'
      const trade = TRADE_MAP[templateName] || 'Electrical'
      const assetTag = SECTION_LABEL[sectionType] || sectionInstance
      const description = `${assetTag}-${templateName}-${fbnBuildId}`

      // Section-level status: best status across all items in the section
      let sectionStatus = 'Open', sectionInspDate = '', sectionCloseDate = ''
      for (const sItem of items) {
        const { status: s, inspectionDate: d, closedDate: c } = resolveProgressStatus(sItem, progressData)
        if (s === 'Complete') { sectionStatus = 'Complete'; sectionInspDate = d || sectionInspDate; sectionCloseDate = c || sectionCloseDate }
        else if (s === 'Ready for Review' && sectionStatus !== 'Complete') { sectionStatus = 'Ready for Review'; sectionInspDate = d || sectionInspDate }
      }

      dataRows.push([
        revision, 'Commissioning', templateName, sectionStatus, trade, location,
        '', sectionInspDate, sectionCloseDate, description, assetTag, '', fbnBuildId,
        '', '', region, '', '', '', '', '', '', '', '', '', '', '', '', ''
      ])
    }

    // Standalone items
    for (const item of standalone) {
      const equipType = item.type || item.equipmentType || ''
      const templateName = resolveTemplate(item)
      const trade = TRADE_MAP[templateName] || 'Electrical'
      const assetTag = item.name || item.displayName || `${equipType}-${dataRows.length + 1}`
      const description = `${assetTag}-${templateName}-${fbnBuildId}`

      // Progress-aware status
      const { status, inspectionDate, closedDate } = resolveProgressStatus(item, progressData)

      dataRows.push([
        revision, 'Commissioning', templateName, status, trade, location,
        '', inspectionDate, closedDate, description, assetTag, '', fbnBuildId,
        '', '', region, '', '', '', '', '', '', '', '', '', '', '', '', ''
      ])
    }
  }

  // 4. Build XML for all new data rows (starting at row 6)
  const newRowsXml = dataRows.map((data, idx) => buildRowXml(idx + 6, data)).join('')

  // 5. Replace rows 6+ in sheet1.xml
  // Strategy: find the end of row 5 (</row> for r="5"), keep everything before it,
  // insert new rows, then close </sheetData> and keep the rest of the XML after </sheetData>
  
  // Find the closing tag of row 5
  const row5EndRegex = /(<row\s[^>]*r="5"[^>]*>[\s\S]*?<\/row>)/
  const row5Match = sheetXml.match(row5EndRegex)
  
  if (!row5Match) {
    throw new Error('Could not find row 5 in template sheet1.xml')
  }

  const row5EndPos = sheetXml.indexOf(row5Match[0]) + row5Match[0].length
  
  // Find </sheetData> 
  const sheetDataEndPos = sheetXml.indexOf('</sheetData>')
  
  // Everything before row 6 data (includes rows 1-5)
  const beforeData = sheetXml.substring(0, row5EndPos)
  // Everything after </sheetData> (includes sheetProtection, pageMargins, etc.)
  const afterSheetData = sheetXml.substring(sheetDataEndPos) // includes </sheetData> itself

  // Rebuild: before rows + new data rows + </sheetData> + rest
  sheetXml = beforeData + newRowsXml + afterSheetData

  // 6. Update the dimension ref (A1:AC{lastRow})
  const lastRow = 5 + dataRows.length
  sheetXml = sheetXml.replace(
    /dimension ref="[^"]*"/,
    `dimension ref="A1:AC${lastRow}"`
  )

  // 7. Update table1.xml range to match new data extent
  let tableXml = await zip.file('xl/tables/table1.xml').async('string')
  // Table covers B5:AA{lastRow} (header at row 5, data rows 6+)
  tableXml = tableXml.replace(
    /ref="B5:AA\d+"/,
    `ref="B5:AA${lastRow}"`
  )
  zip.file('xl/tables/table1.xml', tableXml)

  // 8. Save modified sheet back into the zip
  zip.file('xl/worksheets/sheet1.xml', sheetXml)

  // 9. Generate output .xlsm blob (all other files are untouched)
  const outBuffer = await zip.generateAsync({ 
    type: 'blob',
    mimeType: 'application/vnd.ms-excel.sheet.macroEnabled.12',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  })

  saveAs(outBuffer, `Inspection Upload File - ${name}.xlsm`)

  return { inspections: dataRows.length, skippedUploaded }
}
