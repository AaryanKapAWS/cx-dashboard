import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

const EQUIPMENT_PATTERNS = [
  { regex: /(\d+)\s*[\/x]\s*(\d+)\s*kV.*?(\d+)\s*MVA.*?(POWER TRANSFORMER|TRANSFORMER)/i, type: 'Power Transformer' },
  { regex: /(SURGE ARRESTER|LIGHTNING ARRESTER).*?(SIEMENS|ABB|GE)/i, type: 'Surge Arrester' },
  { regex: /(COMBINED.*?INSTRUMENT.*?TRANSFORMER|COMBINED.*?CT.*?VT|CT\/VT).*?(ARTECHE|ABB|SIEMENS)/i, type: 'Combined CT/VT' },
  { regex: /(CABLE SEALING END|CSE).*?(PFISTERER|3M|NEXANS)/i, type: 'HV Cable Termination' },
  { regex: /(POST INSULATOR).*?(LAPP|ABB|SIEMENS)/i, type: 'Post Insulator' },
  { regex: /(NEUTRAL EARTHING|NER).*?(CRESSAL|MEGAVAR)/i, type: 'Neutral Earthing Resistor' },
  { regex: /(SWITCHGEAR|UNIGEAR|ZS1).*?(ABB|SIEMENS|SCHNEIDER)/i, type: 'MV Switchgear' },
  { regex: /(\d+)\s*mm.*?(XLPE|CABLE).*?(\d+)\s*kV/i, type: 'Cable' },
  { regex: /(EARTH GRID|EARTHING LAYOUT|EARTH.*?CONDUCTOR)/i, type: 'Earthing System' },
  { regex: /(LINK BOX).*?(NKT|NEXANS)/i, type: 'Cable Accessory' },
  { regex: /(RELAY PANEL|PROTECTION PANEL)/i, type: 'Relay Panel' },
  { regex: /(EPMS|SCADA|COM600)/i, type: 'EPMS/SCADA' },
  { regex: /(LIGHTNING ROD|LIGHTNING PROTECTION|LPS)/i, type: 'Lightning Protection' },
  { regex: /(CIRCUIT BREAKER|CB).*?(\d+)\s*kV/i, type: 'Circuit Breaker' },
  { regex: /(CURRENT TRANSFORMER|CT).*?(\d+)\s*kV/i, type: 'Current Transformer' },
  { regex: /(VOLTAGE TRANSFORMER|VT|CVT).*?(\d+)\s*kV/i, type: 'Voltage Transformer' },
]

const TEST_TEMPLATES = {
  'Power Transformer': [
    { name: 'DGA (Dissolved Gas Analysis)', standard: 'IEC 60599 / IEEE C57.104', level: 3, status: 'Pending' },
    { name: 'Oil Quality (moisture, BDV, acidity)', standard: 'IEC 60422', level: 2, status: 'Pending' },
    { name: 'Insulation Resistance (Megger)', standard: 'IEC 60076-3', level: 2, status: 'Pending' },
    { name: 'Winding Resistance (all phases)', standard: 'IEC 60076-1', level: 2, status: 'Pending' },
    { name: 'Turns Ratio Test', standard: 'IEC 60076-1', level: 2, status: 'Pending' },
    { name: 'SFRA (Sweep Frequency Response)', standard: 'IEC 60076-18', level: 3, status: 'Pending' },
    { name: 'Tap Changer Operation', standard: 'IEC 60214', level: 4, status: 'Pending' },
    { name: 'Cooling System Verification', standard: 'IEC 60076-2', level: 4, status: 'Pending' },
    { name: 'Protection Relay Trip Test', standard: 'IEC 60255', level: 4, status: 'Pending' },
    { name: 'First Energisation', standard: 'Cx-HV v1.0 Sec 7', level: 5, status: 'Pending' },
  ],
  'Surge Arrester': [
    { name: 'Visual Inspection', standard: 'IEC 60099-4', level: 2, status: 'Pending' },
    { name: 'Leakage Current Test', standard: 'IEC 60099-4', level: 3, status: 'Pending' },
    { name: 'Insulation Resistance', standard: 'IEC 60099-4', level: 3, status: 'Pending' },
    { name: 'Surge Counter Verification', standard: 'Manufacturer spec', level: 3, status: 'Pending' },
    { name: 'Earthing Connection Check', standard: 'IEC 62305', level: 2, status: 'Pending' },
  ],
  'Combined CT/VT': [
    { name: 'Ratio Test (CT & VT)', standard: 'IEC 61869-2/3', level: 2, status: 'Pending' },
    { name: 'Polarity Test', standard: 'IEC 61869-2/3', level: 2, status: 'Pending' },
    { name: 'Insulation Resistance', standard: 'IEC 61869-1', level: 2, status: 'Pending' },
    { name: 'Burden Test', standard: 'IEC 61869-2', level: 3, status: 'Pending' },
    { name: 'Secondary Injection Test', standard: 'IEC 60255', level: 4, status: 'Pending' },
  ],
  'HV Cable Termination': [
    { name: 'Visual Inspection', standard: 'IEC 60840', level: 2, status: 'Pending' },
    { name: 'Insulation Resistance', standard: 'IEC 60840', level: 3, status: 'Pending' },
    { name: 'Partial Discharge Test', standard: 'IEC 60840', level: 3, status: 'Pending' },
    { name: 'Hi-Pot Test', standard: 'IEC 60840', level: 4, status: 'Pending' },
  ],
  'MV Switchgear': [
    { name: 'Insulation Resistance', standard: 'IEC 62271-200', level: 2, status: 'Pending' },
    { name: 'Contact Resistance', standard: 'IEC 62271-200', level: 3, status: 'Pending' },
    { name: 'Circuit Breaker Timing Test', standard: 'IEC 62271-100', level: 3, status: 'Pending' },
    { name: 'Protection Relay Settings', standard: 'IEC 60255', level: 4, status: 'Pending' },
    { name: 'Trip Test', standard: 'IEC 60255', level: 4, status: 'Pending' },
  ],
  'Cable': [
    { name: 'Insulation Resistance (Megger)', standard: 'IEC 60502-2', level: 2, status: 'Pending' },
    { name: 'Hi-Pot / VLF Test', standard: 'IEC 60502-2', level: 3, status: 'Pending' },
    { name: 'Partial Discharge Test', standard: 'IEC 60502-2', level: 3, status: 'Pending' },
  ],
  'Earthing System': [
    { name: 'Earth Resistance Test', standard: 'IEC 60364', level: 2, status: 'Pending' },
    { name: 'Step & Touch Potential', standard: 'IEC 60364', level: 3, status: 'Pending' },
    { name: 'Continuity Test', standard: 'IEC 60364', level: 2, status: 'Pending' },
  ],
  'Neutral Earthing Resistor': [
    { name: 'Resistance Measurement', standard: 'IEEE C57.32', level: 2, status: 'Pending' },
    { name: 'Insulation Resistance', standard: 'IEEE C57.32', level: 2, status: 'Pending' },
    { name: 'Protection Trip Test', standard: 'IEC 60255', level: 4, status: 'Pending' },
  ],
  'EPMS/SCADA': [
    { name: 'Point-to-Point Signal Verification', standard: 'IEC 61850', level: 3, status: 'Pending' },
    { name: 'Alarm Annunciation Test', standard: 'Amazon Cx spec', level: 4, status: 'Pending' },
    { name: 'Remote Control Test', standard: 'IEC 61850', level: 4, status: 'Pending' },
  ],
  'Relay Panel': [
    { name: 'Settings Verification', standard: 'IEC 60255', level: 3, status: 'Pending' },
    { name: 'Injection Test', standard: 'IEC 60255', level: 4, status: 'Pending' },
    { name: 'Communication Test', standard: 'IEC 61850', level: 4, status: 'Pending' },
  ],
  'Lightning Protection': [
    { name: 'Earth Resistance Test', standard: 'IEC 62305-3', level: 2, status: 'Pending' },
    { name: 'Continuity Test', standard: 'IEC 62305-3', level: 2, status: 'Pending' },
  ],
  'Cable Accessory': [
    { name: 'SVL Test', standard: 'IEC 60840', level: 3, status: 'Pending' },
    { name: 'Bonding Resistance', standard: 'IEC 60840', level: 3, status: 'Pending' },
  ],
  'Post Insulator': [
    { name: 'Visual Inspection', standard: 'IEC 60168', level: 2, status: 'Pending' },
    { name: 'Insulation Resistance', standard: 'IEC 60168', level: 3, status: 'Pending' },
  ],
  'Circuit Breaker': [
    { name: 'Timing Test', standard: 'IEC 62271-100', level: 3, status: 'Pending' },
    { name: 'Contact Resistance', standard: 'IEC 62271-100', level: 3, status: 'Pending' },
    { name: 'Insulation Resistance', standard: 'IEC 62271-100', level: 2, status: 'Pending' },
    { name: 'Trip/Close Coil Test', standard: 'IEC 62271-100', level: 4, status: 'Pending' },
  ],
  'Current Transformer': [
    { name: 'Ratio Test', standard: 'IEC 61869-2', level: 2, status: 'Pending' },
    { name: 'Polarity Test', standard: 'IEC 61869-2', level: 2, status: 'Pending' },
    { name: 'Insulation Resistance', standard: 'IEC 61869-1', level: 2, status: 'Pending' },
  ],
  'Voltage Transformer': [
    { name: 'Ratio Test', standard: 'IEC 61869-3', level: 2, status: 'Pending' },
    { name: 'Polarity Test', standard: 'IEC 61869-3', level: 2, status: 'Pending' },
    { name: 'Insulation Resistance', standard: 'IEC 61869-1', level: 2, status: 'Pending' },
  ],
}

async function extractTextFromPdf(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pages = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    pages.push(content.items.map(item => item.str).join(' '))
  }
  return { text: pages.join('\n'), pageCount: pdf.numPages }
}

function cleanEquipmentName(rawMatch, type, manufacturer) {
  // Try to extract voltage
  const voltageMatch = rawMatch.match(/(\d+)\s*(?:\/\s*\d+\s*)?kV/i)
  const voltage = voltageMatch ? voltageMatch[0].replace(/\s+/g, '') : ''

  // Try to extract model number (alphanumeric with hyphens, 4+ chars)
  const noiseWords = ['ITEM', 'SYMBOL', 'DESCRIPTION', 'SCHEDULE', 'KEYNOTES', 'LEGEND', 'NOTES', 'REFER']
  const modelMatch = rawMatch.match(/\b([A-Z]{1,4}[\-]?[A-Z0-9]{2,}[\-]?[A-Z0-9]*)\b/)
  const model = modelMatch && modelMatch[1].length >= 4 && !noiseWords.includes(modelMatch[1])
    ? modelMatch[1] : ''

  // Build descriptive name
  let name = ''
  if (voltage) name += voltage + ' '
  name += type
  if (manufacturer && manufacturer !== 'TBC') name += ' - ' + manufacturer
  if (model) name += ' ' + model

  return name.trim()
}

function extractQty(line) {
  const patterns = [
    /\bQTY\s*[:\-]?\s*(\d+)/i,
    /\b(\d+)\s*No\b/i,
    /\b(\d+)\s*No\./i,
    /\bx\s*(\d+)\b/i,
    /\b(\d+)\s*(?:off|pcs|units)\b/i,
  ]
  for (const p of patterns) {
    const m = line.match(p)
    if (m) return parseInt(m[1], 10)
  }
  return 1
}

function extractManufacturer(line) {
  const known = ['ABB', 'SIEMENS', 'ARTECHE', 'PFISTERER', 'LAPP', 'CRESSAL', 'NKT', 'NEXANS', 'GE', 'SCHNEIDER', 'MEGAVAR', '3M']
  for (const m of known) {
    if (line.toUpperCase().includes(m)) return m.charAt(0) + m.slice(1).toLowerCase()
  }
  return 'TBC'
}

function extractDrawingRef(filename) {
  const match = filename.match(/DR-E-(\d+)/i);
  if (match) return `DR-E-${match[1]}`;
  return filename.substring(0, 15);
}

// === LOOKAHEAD PARSER ===
const LOOKAHEAD_TEST_TEMPLATES = {
  'CT': { type: 'Current Transformer', standard: 'IEC 61869-2' },
  'VT': { type: 'Voltage Transformer', standard: 'IEC 61869-3' },
  'Circuit Breaker': { type: 'Circuit Breaker', standard: 'IEC 62271-100' },
  'Manual Earth': { type: 'Earth Switch', standard: 'IEC 62271-102' },
  'Relay': { type: 'Protection Relay', standard: 'IEC 60255' },
  'EPMS': { type: 'EPMS/SCADA', standard: 'IEC 61850' },
  'Busbar': { type: 'MV Busbar', standard: 'IEC 62271-200' },
  'Cubicle': { type: 'MV Switchgear Cubicle', standard: 'IEC 62271-200' },
  'PM': { type: 'Power Meter', standard: 'Manufacturer spec' },
}

function parseLookahead(text, fileName) {
  const lines = text.split('\n')
  const equipmentMap = {}
  
  // Extract header info
  const cxMatch = text.match(/Cx\.\s*Completion.*?(\d+)%/i)
  const energMatch = text.match(/Planned Energisation.*?(\d+\/\d+\/\d+)/i)
  
  for (const line of lines) {
    // Match lines with L3/L4 and percentage
    const testMatch = line.match(/L([2-5])\s+(.+?)(?:\s{2,}|\d{2}\/\d{2}\/\d{2})/)
    const pctMatch = line.match(/(\d+)%/)
    
    if (!testMatch) continue
    
    const level = parseInt(testMatch[1])
    let testName = testMatch[2].trim()
    const pct = pctMatch ? parseInt(pctMatch[1]) : 0
    
    // Clean test name
    testName = testName.replace(/\s{2,}/g, ' ').trim()
    if (testName.length < 4 || testName.length > 80) continue
    
    // Determine equipment type from context
    let equipType = 'General'
    if (/CT\s*-\s*T/i.test(line)) equipType = 'CT'
    else if (/\bVT\b/i.test(line) && !/SVL/.test(line)) equipType = 'VT'
    else if (/Circuit\s*Breaker/i.test(line)) equipType = 'Circuit Breaker'
    else if (/Manual\s*Earth/i.test(line)) equipType = 'Manual Earth'
    else if (/Relay\s*testing/i.test(line)) equipType = 'Relay'
    else if (/EPMS/i.test(line)) equipType = 'EPMS'
    else if (/Busbar/i.test(line)) equipType = 'Busbar'
    else if (/Cubicle/i.test(line)) equipType = 'Cubicle'
    else if (/PM\s+L[34]/i.test(line) || /PQM/i.test(line)) equipType = 'PM'
    
    if (!equipmentMap[equipType]) {
      equipmentMap[equipType] = { tests: new Map(), maxLevel: 0 }
    }
    
    // Deduplicate tests by name
    if (!equipmentMap[equipType].tests.has(testName)) {
      equipmentMap[equipType].tests.set(testName, { level, pct })
    }
    if (level > equipmentMap[equipType].maxLevel) {
      equipmentMap[equipType].maxLevel = level
    }
  }
  
  // Convert to equipment array
  const drawingRef = extractDrawingRef(fileName)
  const found = []
  
  for (const [eqType, data] of Object.entries(equipmentMap)) {
    if (eqType === 'General' || data.tests.size === 0) continue
    
    const template = LOOKAHEAD_TEST_TEMPLATES[eqType] || { type: eqType, standard: 'Site Test Script' }
    const tests = []
    let passCount = 0
    
    for (const [tName, tData] of data.tests) {
      const status = tData.pct >= 100 ? 'Pass' : tData.pct > 0 ? 'In Progress' : 'Pending'
      if (tData.pct >= 100) passCount++
      tests.push({
        name: tName,
        standard: template.standard,
        level: tData.level,
        status: status,
      })
    }
    
    const allDone = passCount === tests.length
    const someDone = passCount > 0
    const equipLevel = allDone ? data.maxLevel : someDone ? data.maxLevel - 1 : 0
    const equipStatus = allDone ? 'Complete' : someDone ? 'In Progress' : 'Not Started'
    
    found.push({
      name: template.type,
      qty: 1,
      drawing: drawingRef,
      item_ref: eqType.substring(0, 4).toUpperCase(),
      type: template.type,
      manufacturer: 'TBC',
      level: equipLevel,
      status: equipStatus,
      tests: tests,
    })
  }
  
  return {
    type: 'lookahead',
    equipment: found,
    meta: {
      cxCompletion: cxMatch ? parseInt(cxMatch[1]) : null,
      plannedEnergisation: energMatch ? energMatch[1] : null,
    }
  }
}

function detectDocType(text) {
  // Lookahead indicators
  const lookaheadScore = (
    (text.match(/L[34]\s+/g) || []).length +
    (text.match(/\d+%/g) || []).length +
    (text.includes('Cx. Completion') ? 10 : 0) +
    (text.includes('Planned Energisation') ? 10 : 0) +
    (text.includes('lookahead') ? 10 : 0) +
    (text.match(/Mon|Tue|Wed|Thu|Fri/g) || []).length
  )
  
  // SLD indicators
  const sldScore = (
    (text.includes('SCHEDULE OF EQUIPMENT') ? 20 : 0) +
    (text.match(/kV/g) || []).length +
    (text.match(/POWER TRANSFORMER|SURGE ARRESTER|SWITCHGEAR|CABLE SEALING/gi) || []).length * 5 +
    (text.includes('ELEVATION') ? 5 : 0) +
    (text.includes('PLAN VIEW') ? 5 : 0)
  )
  
  return lookaheadScore > sldScore ? 'lookahead' : 'sld'
}

export async function parsePdf(file) {
  const { text, pageCount } = await extractTextFromPdf(file)
  
  // Auto-detect document type
  const docType = detectDocType(text)
  
  if (docType === 'lookahead') {
    const result = parseLookahead(text, file.name)
    return { ...result, pageCount }
  }
  
  // SLD parsing (existing logic)
  const lines = text.split(/\n/)
  const found = []
  const seenTypes = new Set()

  for (const line of lines) {
    for (const { regex, type } of EQUIPMENT_PATTERNS) {
      if (regex.test(line) && !seenTypes.has(type)) {
        seenTypes.add(type)
        const manufacturer = extractManufacturer(line)
        found.push({
          name: cleanEquipmentName(line.trim(), type, manufacturer),
          qty: extractQty(line),
          drawing: extractDrawingRef(file.name),
          item_ref: 'auto',
          type,
          manufacturer,
          level: 0,
          status: 'Not Started',
          tests: (TEST_TEMPLATES[type] || []).map(t => ({ ...t })),
        })
        break
      }
    }
  }

  return { type: 'sld', equipment: found, pageCount }
}
