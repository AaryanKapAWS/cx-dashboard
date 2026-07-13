import JSZip from 'jszip'
import { saveAs } from 'file-saver'

// Equipment type → CxHV inspection template mapping
const TEMPLATE_MAP = {
  TRANSFORMER: 'CxHV-Power Transformer',
  CT: 'CxHV-Current Transformer',
  CT_HV: 'CxHV-Current Transformer',
  NCT: 'CxHV-Current Transformer',
  NER_CT: 'CxHV-Current Transformer',
  VT: 'CxHV-Voltage Transformer',
  VT_HV: 'CxHV-Voltage Transformer',
  SURGE_ARRESTER: 'CxHV-Surge Arrester',
  NER: 'CxHV-Neutral Earthing Transformer/Resistor',
  BUSBAR: 'CxHV-AIS Main Busbar',
  PROTECTION_PANEL: 'CxHV-Relay Panels',
  STABILITY_TEST: 'CxHV-Relay Panels',
  HV_CABLE: 'CxHV-HV & MV Cable',
  MV_CABLE: 'CxHV-HV & MV Cable',
  SUBSTATION_CHECKS: 'CxHV-HV Substation',
  ESB_INTERFACE: 'CxHV-Blank',
  SWITCHGEAR_OVERALL: 'CxHV-Air Insulated Switchgear (AIS)',
  AC_DC_CHECKS: 'CxHV-Battery & Charger',
  SCADA: 'CxHV-Blank',
  RELAY: 'CxHV-Relay Panels',
  CUBICLE: 'CxHV-Circuit Breaker',
  ENERGIZATION: 'CxHV-HV Substation',
  PQM: 'CxHV-Blank',
  EPMS: 'CxHV-Blank',
  SYNCH_CHECK: 'CxHV-Relay Panels',
  CABLE_DIFF: 'CxHV-Relay Panels',
}

// Template → Trade mapping
const TRADE_MAP = {
  'CxHV-Power Transformer': 'Electrical',
  'CxHV-Current Transformer': 'Electrical',
  'CxHV-Voltage Transformer': 'Electrical',
  'CxHV-Surge Arrester': 'Electrical',
  'CxHV-Neutral Earthing Transformer/Resistor': 'Electrical',
  'CxHV-AIS Main Busbar': 'Electrical',
  'CxHV-Relay Panels': 'Electrical',
  'CxHV-HV & MV Cable': 'Electrical',
  'CxHV-HV Substation': 'Commissioning',
  'CxHV-Air Insulated Switchgear (AIS)': 'Electrical',
  'CxHV-Battery & Charger': 'Electrical',
  'CxHV-Circuit Breaker': 'Electrical',
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

  if (mode === 'retro') {
    // RETRO MODE: One row per equipment item, using individual CxHV templates
    for (const item of equipmentData) {
      const equipType = item.type || item.equipmentType || ''
      const templateName = TEMPLATE_MAP[equipType] || 'CxHV-Blank'
      const trade = TRADE_MAP[templateName] || 'Electrical'
      const assetTag = item.name || item.displayName || item.feeder_ref || `${equipType}-${dataRows.length + 1}`
      const description = `${assetTag}-${templateName}-${fbnBuildId}`

      dataRows.push([
        revision, 'Commissioning', templateName, 'Open', trade, location,
        '', '', '', description, assetTag, '', fbnBuildId,
        '', '', region, '', '', '', '', '', '', '', '', '', '', '', '', ''
      ])
    }
  } else {
    // SECTION MODE: One row per section (grouped)
    for (const item of equipmentData) {
      const section = item.section || ''
      if (section && section !== 'custom') {
        if (!sections[section]) sections[section] = []
        sections[section].push(item)
      } else {
        standalone.push(item)
      }
    }

    // Section-level rows
    for (const [sectionKey, items] of Object.entries(sections)) {
      const templateName = SECTION_TEMPLATE[sectionKey] || 'CxHV-Blank'
      const trade = TRADE_MAP[templateName] || 'Electrical'
      const assetTag = SECTION_LABEL[sectionKey] || sectionKey
      const description = `${assetTag}-${templateName}-${fbnBuildId}`

      dataRows.push([
        revision, 'Commissioning', templateName, 'Open', trade, location,
        '', '', '', description, assetTag, '', fbnBuildId,
        '', '', region, '', '', '', '', '', '', '', '', '', '', '', '', ''
      ])
    }

    // Standalone items
    for (const item of standalone) {
      const equipType = item.type || item.equipmentType || ''
      const templateName = TEMPLATE_MAP[equipType] || 'CxHV-Blank'
      const trade = TRADE_MAP[templateName] || 'Electrical'
      const assetTag = item.name || item.displayName || `${equipType}-${dataRows.length + 1}`
      const description = `${assetTag}-${templateName}-${fbnBuildId}`

      dataRows.push([
        revision, 'Commissioning', templateName, 'Open', trade, location,
        '', '', '', description, assetTag, '', fbnBuildId,
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
    /ref="[^"]*"/,
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

  return { inspections: dataRows.length }
}
