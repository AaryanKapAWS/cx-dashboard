import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import TEST_TEMPLATES from '../data/test_templates.json'

// ─── COLOURS ────────────────────────────────────────────────────────
const C = {
  navy:     'FF232F3E',  // Amazon dark navy
  orange:   'FFFF9900',  // Amazon orange
  white:    'FFFFFFFF',
  black:    'FF000000',
  // Level colours (distinct, easy to scan)
  L1:       'FFD6EAF8',  // Blue tint (FAT)
  L2:       'FFD5F5E3',  // Green tint (Pre-SAT)
  L3:       'FFFEF9E7',  // Amber tint (SAT)
  L4:       'FFE8DAEF',  // Purple tint (Integration)
  L5:       'FFD1F2EB',  // Cyan tint (Energization)
  // Status
  green:    'FF27AE60',
  yellow:   'FFF39C12',
  orangeP:  'FFE67E22',
  red:      'FFC0392B',
  grey:     'FFD5D8DC',
  lightGrey:'FFF8F9FA',
}

const LEVEL_LABELS = {
  L1: 'L1 - FAT', L2: 'L2 - Pre-SAT', L3: 'L3 - SAT',
  L4: 'L4 - Integration', L5: 'L5 - Energization',
}

const THIN_BORDER = {
  top: { style: 'thin', color: { argb: 'FFD5D8DC' } },
  bottom: { style: 'thin', color: { argb: 'FFD5D8DC' } },
  left: { style: 'thin', color: { argb: 'FFD5D8DC' } },
  right: { style: 'thin', color: { argb: 'FFD5D8DC' } },
}

// ─── HELPERS ────────────────────────────────────────────────────────
function getTests(item) {
  if (item.customTests) return item.customTests.filter(t => t.enabled).map(t => [t.level, t.name])
  const tmpl = TEST_TEMPLATES[item.type]
  if (!tmpl) return [['L3', `${item.type} Test`]]
  return tmpl.map(t => [t[0], t[1]])
}

function getEquipName(item) {
  return item.displayName || item.name || item.type
}

function truncate(name) {
  return name.replace(/[\\/*?[\]:]/g, '').substring(0, 31)
}

function styleHeader(row, color = C.navy) {
  row.eachCell((cell) => {
    cell.font = { name: 'Calibri', bold: true, size: 9, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = THIN_BORDER
  })
}

// ─── MAIN EXPORT ────────────────────────────────────────────────────
export async function generateCOR(equipmentData, projectName) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'HV Substation Commissioning Tool'
  wb.created = new Date()
  wb.calcProperties = { fullCalcOnLoad: true }

  // Group equipment into sheets (one sheet per feeder, overall items grouped together)
  const sections = {}
  const feederGroups = {}  // feeder_ref → [items]
  
  for (const item of equipmentData) {
    const ref = item.feeder_ref || 'Unassigned'
    if (!feederGroups[ref]) feederGroups[ref] = []
    feederGroups[ref].push(item)
  }
  
  // Split into: multi-item groups (real feeders → own sheet) vs single-item groups (overall → merged)
  for (const [ref, items] of Object.entries(feederGroups)) {
    const sectionName = ref.split(' \u2014 ')[0] || 'Unassigned'
    const feederName = ref.split(' \u2014 ')[1] || ''
    
    if (items.length > 1) {
      // Real feeder — gets its own sheet
      const feederType = items[0]?.feeder_type ? items[0].feeder_type.replace(/_/g, ' ') : ''
      const displayFeeder = feederName ? feederName.toUpperCase() : ''
      const typeLabel = feederType ? ` ${feederType.charAt(0).toUpperCase() + feederType.slice(1)}` : ''
      const sheetLabel = feederName ? `${sectionName} - ${displayFeeder}${typeLabel}` : sectionName
      sections[sheetLabel] = items
    } else {
      // Single item — merge into "SectionName (Overall)" sheet
      const overallLabel = `${sectionName}`
      if (!sections[overallLabel]) sections[overallLabel] = []
      sections[overallLabel].push(items[0])
    }
  }

  // Pre-calculate stats
  let grandTotal = 0
  const overallLevels = { L1: 0, L2: 0, L3: 0, L4: 0, L5: 0 }
  const allStats = []

  for (const [name, items] of Object.entries(sections)) {
    const levels = { L1: 0, L2: 0, L3: 0, L4: 0, L5: 0 }
    let total = 0
    for (const item of items) {
      for (const [level] of getTests(item)) {
        total++
        if (levels[level] !== undefined) levels[level]++
        if (overallLevels[level] !== undefined) overallLevels[level]++
      }
    }
    grandTotal += total
    allStats.push({ name, total, levels, items: items.length })
  }

  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  // ═══════════════════════════════════════════════════════════════════
  // SHEET 1: COVER PAGE
  // ═══════════════════════════════════════════════════════════════════
  const wsCover = wb.addWorksheet('Project Overview', { properties: { tabColor: { argb: 'FF232F3E' } } })

  wsCover.getColumn(1).width = 2
  wsCover.getColumn(2).width = 2.43
  wsCover.getColumn(3).width = 20
  wsCover.getColumn(4).width = 26.71
  wsCover.getColumn(5).width = 17.86
  wsCover.getColumn(6).width = 25
  wsCover.getColumn(7).width = 21.29

  const FIELD_BORDER = { bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } } }
  const SECTION_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.navy } }
  const LABEL_FONT = { name: 'Calibri', bold: true, size: 10, color: { argb: '555555' } }
  const VALUE_FONT = { name: 'Calibri', size: 10, color: { argb: '000000' } }

  // Row 1: Empty row ABOVE the box (ensures top border is visible)
  const r1 = wsCover.addRow([])
  r1.height = 8

  // Row 2: Padding inside box (top breathing room)  
  const padTop = wsCover.addRow([])
  padTop.height = 25

  // Row 3: Logo + Title
  const logoRow1 = wsCover.addRow([])
  logoRow1.height = 33
  logoRow1.getCell(5).value = 'Commissioning Outstanding Register (COR)'
  logoRow1.getCell(5).font = { name: 'Calibri', bold: true, size: 16, color: { argb: C.navy.slice(2) } }
  wsCover.mergeCells(logoRow1.number, 5, logoRow1.number, 7)
  logoRow1.getCell(5).alignment = { horizontal: 'center', vertical: 'bottom' }

  // Row 4: Logo continues + Subtitle
  const logoRow2 = wsCover.addRow([])
  logoRow2.height = 18
  logoRow2.getCell(5).value = 'HV / MV Substation Commissioning'
  logoRow2.getCell(5).font = { name: 'Calibri', size: 10, color: { argb: '999999' } }
  wsCover.mergeCells(logoRow2.number, 5, logoRow2.number, 7)
  logoRow2.getCell(5).alignment = { horizontal: 'center', vertical: 'top' }

  // Row 5: Bottom padding in header area
  const padBot = wsCover.addRow([])
  padBot.height = 10

  // Embed AWS logo (left side, base64 encoded)
  try {
    const logoB64 = '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'
    const logoBytes = Uint8Array.from(atob(logoB64), c => c.charCodeAt(0))
    const logoId = wb.addImage({ buffer: logoBytes.buffer, extension: 'png' })
    wsCover.addImage(logoId, 'C3:D4')
  } catch (e) { console.error('Logo embed failed:', e) }

  // Spacer before PROJECT DETAILS
  const spBeforeDetails = wsCover.addRow([])
  spBeforeDetails.height = 6

  // Row 5: spacer
  const sp1 = wsCover.addRow([])
  sp1.height = 10

  // ─── PROJECT DETAILS section header (navy bar) ───
  const infoHeader = wsCover.addRow(['', '', 'PROJECT DETAILS', '', '', '', ''])
  infoHeader.height = 20
  infoHeader.eachCell((cell, col) => {
    if (col >= 2) {
      cell.fill = SECTION_FILL
      cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FFFFFF' } }
      cell.alignment = { vertical: 'middle' }
    }
  })

  // Info rows (label: value pairs, 2 columns)
  const infoData = [
    ['Project Name:', projectName, 'Generated:', dateStr],
    ['Site / Location:', '', 'Energisation Date:', ''],
    ['Voltage Level:', '', 'Region:', ''],
    ['Cx Region:', '', 'Procore Project ID:', ''],
  ]
  for (const [lbl1, val1, lbl2, val2] of infoData) {
    const r = wsCover.addRow(['', '', lbl1, val1, '', lbl2 || '', val2 || ''])
    r.height = 20
    r.getCell(3).font = LABEL_FONT
    r.getCell(4).font = VALUE_FONT
    r.getCell(4).border = FIELD_BORDER
    r.getCell(6).font = LABEL_FONT
    r.getCell(7).font = VALUE_FONT
    r.getCell(7).border = FIELD_BORDER
    r.eachCell((cell, col) => { if (col >= 2) cell.alignment = { vertical: 'middle' } })
  }

  // Spacer
  const sp2a = wsCover.addRow([])
  sp2a.height = 6

  // Team roles
  const teamHeader = wsCover.addRow(['', '', 'TEAM', '', '', '', ''])
  teamHeader.height = 20
  teamHeader.eachCell((cell, col) => {
    if (col >= 2) {
      cell.fill = SECTION_FILL
      cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FFFFFF' } }
      cell.alignment = { vertical: 'middle' }
    }
  })
  const teamData = [
    ['CxA Engineer:', '', 'General Contractor:', ''],
    ['Site CxA:', '', 'Protection Engineer:', ''],
  ]
  for (const [lbl1, val1, lbl2, val2] of teamData) {
    const r = wsCover.addRow(['', '', lbl1, val1, '', lbl2 || '', val2 || ''])
    r.height = 20
    r.getCell(3).font = LABEL_FONT
    r.getCell(4).font = VALUE_FONT
    r.getCell(4).border = FIELD_BORDER
    r.getCell(6).font = LABEL_FONT
    r.getCell(7).font = VALUE_FONT
    r.getCell(7).border = FIELD_BORDER
    r.eachCell((cell, col) => { if (col >= 2) cell.alignment = { vertical: 'middle' } })
  }

  // Spacer
  const sp3 = wsCover.addRow([])
  sp3.height = 14

  // ─── COMMISSIONING SCOPE ───
  const scopeHeader = wsCover.addRow(['', '', 'COMMISSIONING SCOPE', '', '', '', ''])
  scopeHeader.height = 20
  scopeHeader.eachCell((cell, col) => {
    if (col >= 2) {
      cell.fill = SECTION_FILL
      cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FFFFFF' } }
      cell.alignment = { vertical: 'middle' }
    }
  })

  const scopeHeaders = wsCover.addRow(['', '', 'Section', 'Equipment', 'Tests', 'L3 (SAT)', 'L4/L5'])
  scopeHeaders.height = 18
  scopeHeaders.eachCell((cell, col) => {
    if (col >= 2) {
      cell.font = { name: 'Calibri', bold: true, size: 9, color: { argb: '666666' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = { bottom: { style: 'thin', color: { argb: C.navy } } }
    }
  })
  scopeHeaders.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' }

  for (const stat of allStats) {
    const r = wsCover.addRow(['', '', stat.name, stat.items, stat.total, stat.levels.L3, stat.levels.L4 + stat.levels.L5])
    r.height = 18
    r.eachCell((cell, col) => {
      if (col >= 2) {
        cell.font = { name: 'Calibri', size: 10 }
        cell.alignment = { horizontal: col === 3 ? 'left' : 'center', vertical: 'middle' }
        cell.border = FIELD_BORDER
      }
    })
  }
  const scopeTotal = wsCover.addRow(['', '', 'TOTAL', equipmentData.length, grandTotal, overallLevels.L3, overallLevels.L4 + overallLevels.L5])
  scopeTotal.height = 18
  scopeTotal.eachCell((cell, col) => {
    if (col >= 2) {
      cell.font = { name: 'Calibri', bold: true, size: 10 }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F3F4' } }
      cell.alignment = { horizontal: col === 2 ? 'left' : 'center', vertical: 'middle' }
      cell.border = { top: { style: 'thin', color: { argb: C.navy } }, bottom: { style: 'thin', color: { argb: C.navy } } }
    }
  })

  // Spacer
  const sp4 = wsCover.addRow([])
  sp4.height = 14

  // ─── PROJECT DOCUMENTATION ───
  const docsHeader = wsCover.addRow(['', '', 'KEY DOCUMENTS', '', '', '', ''])
  docsHeader.height = 20
  docsHeader.eachCell((cell, col) => {
    if (col >= 2) {
      cell.fill = SECTION_FILL
      cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FFFFFF' } }
      cell.alignment = { vertical: 'middle' }
    }
  })

  const docsSubHeader = wsCover.addRow(['', '', 'Document', 'Reference / Title', '', 'Document', 'Reference / Title'])
  docsSubHeader.height = 18
  docsSubHeader.eachCell((cell, col) => {
    if (col >= 2) {
      cell.font = { name: 'Calibri', bold: true, size: 9, color: { argb: '666666' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } }
      cell.alignment = { vertical: 'middle' }
      cell.border = { bottom: { style: 'thin', color: { argb: C.navy } } }
    }
  })

  const docsData = [
    ['SLD (Single Line Diagram)', '', 'Protection Settings File', ''],
    ['Commissioning Programme', '', 'SOW / Scope of Work', ''],
    ['Test Scripts Folder', '', 'Arc Flash Study', ''],
  ]
  for (const [lbl1, val1, lbl2, val2] of docsData) {
    const r = wsCover.addRow(['', '', lbl1, val1, '', lbl2, val2])
    r.height = 18
    r.getCell(3).font = { name: 'Calibri', bold: true, size: 9, color: { argb: '444444' } }
    r.getCell(4).font = VALUE_FONT
    r.getCell(4).border = FIELD_BORDER
    r.getCell(6).font = { name: 'Calibri', bold: true, size: 9, color: { argb: '444444' } }
    r.getCell(7).font = VALUE_FONT
    r.getCell(7).border = FIELD_BORDER
    r.eachCell((cell, col) => { if (col >= 2) cell.alignment = { vertical: 'middle' } })
  }

  // Spacer
  const sp5 = wsCover.addRow([])
  sp5.height = 14

  // ─── TESTING LEVELS ───
  const legendHeader = wsCover.addRow(['', '', 'TESTING LEVELS', '', '', '', ''])
  legendHeader.height = 20
  legendHeader.eachCell((cell, col) => {
    if (col >= 2) {
      cell.fill = SECTION_FILL
      cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FFFFFF' } }
      cell.alignment = { vertical: 'middle' }
    }
  })

  const legends = [
    ['L1 - FAT', 'Factory Acceptance Test review', C.L1],
    ['L2 - Pre-SAT', 'Receiving Inspection & Installation Verification', C.L2],
    ['L3 - SAT', 'Site Acceptance Testing (individual equipment)', C.L3],
    ['L4 - Integration', 'Integrated system testing (end-to-end)', C.L4],
    ['L5 - Energization', 'Pre/Post energization & soak testing', C.L5],
  ]
  for (const [level, desc, color] of legends) {
    const r = wsCover.addRow(['', '', level, desc])
    r.height = 18
    r.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } }
    r.getCell(3).font = { name: 'Calibri', bold: true, size: 10 }
    r.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } }
    r.getCell(3).alignment = { vertical: 'middle' }
    r.getCell(4).font = { name: 'Calibri', size: 10, color: { argb: '555555' } }
    r.getCell(4).alignment = { vertical: 'middle' }
    wsCover.mergeCells(r.number, 4, r.number, 7)
  }

  // ─── Outer border box around entire content ───
  const lastRow = wsCover.lastRow.number
  const BOX_BORDER = { style: 'medium', color: { argb: C.navy } }
  
  for (let r = 2; r <= lastRow; r++) {
    const row = wsCover.getRow(r)
    // Left edge (col B)
    const cellB = row.getCell(2)
    cellB.border = { ...cellB.border, left: BOX_BORDER }
    // Right edge (col F)
    const cellG = row.getCell(7)
    cellG.border = { ...cellG.border, right: BOX_BORDER }
  }
  // Top edge (row 2, cols B-F)
  for (let c = 2; c <= 7; c++) {
    const cell = wsCover.getRow(2).getCell(c)
    cell.border = { ...cell.border, top: BOX_BORDER }
  }
  // Bottom edge (last row, cols B-F)
  for (let c = 2; c <= 7; c++) {
    const cell = wsCover.getRow(lastRow).getCell(c)
    cell.border = { ...cell.border, bottom: BOX_BORDER }
  }

  // Print settings
  wsCover.pageSetup = { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 1 }
  wsCover.views = [{ showGridLines: false }]

  // ═══════════════════════════════════════════════════════════════════
  // SHEET 2: COMMISSIONING PROGRAMME (combined progress + schedule)
  // ═══════════════════════════════════════════════════════════════════
  const wsProg = wb.addWorksheet('Cx Programme', { properties: { tabColor: { argb: 'FFFF9900' } } })

  // Column widths (same indent approach as Project Overview)
  wsProg.getColumn(1).width = 2    // A: gutter
  wsProg.getColumn(2).width = 2.43 // B: indent
  wsProg.getColumn(3).width = 26   // C: System/Equipment name
  wsProg.getColumn(4).width = 7    // D: Total/Tests
  wsProg.getColumn(5).width = 7    // E: Done/L3
  wsProg.getColumn(6).width = 10   // F: In Prog/L4/% Complete
  wsProg.getColumn(7).width = 7    // G: Pending/L5
  wsProg.getColumn(8).width = 11   // H: % Complete/Planned Start
  wsProg.getColumn(9).width = 11   // I: L1/Planned Finish
  wsProg.getColumn(10).width = 7   // J: L2/Duration
  wsProg.getColumn(11).width = 9   // K: L3(lvl)/Status
  wsProg.getColumn(12).width = 7   // L: L4(lvl)
  wsProg.getColumn(13).width = 7   // M: L5(lvl)

  const PROG_BOX_BORDER = { style: 'medium', color: { argb: C.navy } }
  const SECTION_BAR = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.navy } }
  const SECTION_FONT = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FFFFFF' } }

  // Row 1: gutter above box
  wsProg.addRow([]).height = 8

  // Row 2: Title
  const progTitle = wsProg.addRow(['', '', `${projectName} — Cx Programme`])
  progTitle.getCell(3).font = { name: 'Calibri', bold: true, size: 14, color: { argb: C.navy.slice(2) } }
  wsProg.mergeCells(progTitle.number, 3, progTitle.number, 13)
  progTitle.height = 22

  // Row 3: spacer
  wsProg.addRow([]).height = 8

  // ────────────────────────────────────────────────────────────────
  // SECTION 1: COMMISSIONING PROGRESS
  // ────────────────────────────────────────────────────────────────
  const sec1Header = wsProg.addRow(['', '', 'COMMISSIONING PROGRESS', '', '', '', '', '', '', '', '', '', ''])
  sec1Header.height = 20
  sec1Header.eachCell((cell, col) => {
    if (col >= 2) { cell.fill = SECTION_BAR; cell.font = SECTION_FONT; cell.alignment = { vertical: 'middle' } }
  })

  // Progress table headers
  const progHdr = wsProg.addRow(['', '', 'System', 'Total', 'Done', 'In Prog', 'Pending', '% Complete', 'L1', 'L2', 'L3', 'L4', 'L5'])
  progHdr.height = 18
  progHdr.eachCell((cell, col) => {
    if (col >= 2) {
      cell.font = { name: 'Calibri', bold: true, size: 9, color: { argb: '555555' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } }
      cell.alignment = { horizontal: col === 3 ? 'left' : 'center', vertical: 'middle' }
      cell.border = { bottom: { style: 'thin', color: { argb: C.navy } } }
    }
  })

  // Progress data rows
  const dataStartRow = progHdr.number + 1
  for (let i = 0; i < allStats.length; i++) {
    const stat = allStats[i]
    const lv = stat.levels
    const r = wsProg.addRow(['', '', stat.name, stat.total, 0, 0, stat.total, 0, lv.L1, lv.L2, lv.L3, lv.L4, lv.L5])
    r.height = 18
    r.eachCell((cell, col) => {
      if (col >= 3) {
        cell.font = { name: 'Calibri', size: 10 }
        cell.alignment = { horizontal: col === 3 ? 'left' : 'center', vertical: 'middle' }
        cell.border = { bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } } }
        if (col === 8) cell.numFmt = '0.00%'
      }
      // Level column colours
      const lvColors = { 9: C.L1, 10: C.L2, 11: C.L3, 12: C.L4, 13: C.L5 }
      if (lvColors[col]) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lvColors[col] } }
    })
  }

  // OVERALL row
  const overallRow = wsProg.addRow(['', '', 'OVERALL', grandTotal, 0, 0, grandTotal, 0, overallLevels.L1, overallLevels.L2, overallLevels.L3, overallLevels.L4, overallLevels.L5])
  overallRow.height = 20
  overallRow.eachCell((cell, col) => {
    if (col >= 3) {
      cell.font = { name: 'Calibri', bold: true, size: 10 }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F3F4' } }
      cell.alignment = { horizontal: col === 3 ? 'left' : 'center', vertical: 'middle' }
      cell.border = { top: { style: 'thin', color: { argb: C.navy } }, bottom: { style: 'thin', color: { argb: C.navy } } }
      if (col === 8) cell.numFmt = '0.00%'
    }
  })

  // Spacer
  wsProg.addRow([]).height = 12

  // ────────────────────────────────────────────────────────────────
  // SECTION 2: DOCUMENTATION STATUS (Pipeline)
  // ────────────────────────────────────────────────────────────────
  const sec2Header = wsProg.addRow(['', '', 'DOCUMENTATION STATUS', '', '', '', '', '', '', '', '', '', ''])
  sec2Header.height = 20
  sec2Header.eachCell((cell, col) => {
    if (col >= 2) { cell.fill = SECTION_BAR; cell.font = SECTION_FONT; cell.alignment = { vertical: 'middle' } }
  })

  const pipeHdr = wsProg.addRow(['', '', 'Stage', 'Total', 'Done', '% Complete', '', '', '', '', '', '', ''])
  pipeHdr.height = 18
  pipeHdr.eachCell((cell, col) => {
    if (col >= 2) {
      cell.font = { name: 'Calibri', bold: true, size: 9, color: { argb: '555555' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } }
      cell.alignment = { horizontal: col === 3 ? 'left' : 'center', vertical: 'middle' }
      cell.border = { bottom: { style: 'thin', color: { argb: C.navy } } }
    }
  })

  const stages = ['SAT Completed', 'CxA Witnessed', 'Completed', 'Report Received', 'Report on Procore', 'Report Reviewed', 'Report Closed']
  for (const stage of stages) {
    const r = wsProg.addRow(['', '', stage, grandTotal, 0, 0, '', '', '', '', '', '', ''])
    r.height = 18
    r.eachCell((cell, col) => {
      if (col >= 3) {
        cell.font = { name: 'Calibri', size: 10 }
        cell.alignment = { horizontal: col === 3 ? 'left' : 'center', vertical: 'middle' }
        cell.border = { bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } } }
        if (col === 6) cell.numFmt = '0.00%'
      }
    })
  }

  // Spacer
  wsProg.addRow([]).height = 12

  // ────────────────────────────────────────────────────────────────
  // SECTION 3: LEVEL COMPLETION
  // ────────────────────────────────────────────────────────────────
  const sec3Header = wsProg.addRow(['', '', 'LEVEL COMPLETION', '', '', '', '', '', '', '', '', '', ''])
  sec3Header.height = 20
  sec3Header.eachCell((cell, col) => {
    if (col >= 2) { cell.fill = SECTION_BAR; cell.font = SECTION_FONT; cell.alignment = { vertical: 'middle' } }
  })

  const lvlHdr = wsProg.addRow(['', '', 'Section', 'L1 Total', 'L1 Done', 'L2 Total', 'L2 Done', 'L3 Total', 'L3 Done', 'L4 Total', 'L4 Done', 'L5 Total', 'L5 Done'])
  lvlHdr.height = 18
  lvlHdr.eachCell((cell, col) => {
    if (col >= 2) {
      cell.font = { name: 'Calibri', bold: true, size: 9, color: { argb: '555555' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = { bottom: { style: 'thin', color: { argb: C.navy } } }
    }
    if (col === 3) cell.alignment = { horizontal: 'left', vertical: 'middle' }
  })

  const lvCompRows = []
  for (const stat of allStats) {
    const lv = stat.levels
    const r = wsProg.addRow(['', '', stat.name, lv.L1, 0, lv.L2, 0, lv.L3, 0, lv.L4, 0, lv.L5, 0])
    lvCompRows.push(r.number)
    r.height = 18
    r.eachCell((cell, col) => {
      if (col >= 3) {
        cell.font = { name: 'Calibri', size: 10 }
        cell.alignment = { horizontal: col === 3 ? 'left' : 'center', vertical: 'middle' }
        cell.border = { bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } } }
      }
      // Colour the "Total" columns with light level tint
      const lvTotCols = { 4: C.L1, 6: C.L2, 8: C.L3, 10: C.L4, 12: C.L5 }
      if (lvTotCols[col]) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lvTotCols[col] } }
    })
  }

  // Spacer
  wsProg.addRow([]).height = 12

  // ────────────────────────────────────────────────────────────────
  // SECTION 4: COMMISSIONING SCHEDULE (Gantt-style)
  // ────────────────────────────────────────────────────────────────
  const sec4Header = wsProg.addRow(['', '', 'COMMISSIONING SCHEDULE', '', '', '', '', '', '', '', '', '', ''])
  sec4Header.height = 20
  sec4Header.eachCell((cell, col) => {
    if (col >= 2) { cell.fill = SECTION_BAR; cell.font = SECTION_FONT; cell.alignment = { vertical: 'middle' } }
  })

  const ganttHdr = wsProg.addRow(['', '', 'Equipment', 'Tests', 'L3', 'L4', 'L5', 'Planned Start', 'Planned Finish', 'Duration', 'Status', '', ''])
  ganttHdr.height = 18
  ganttHdr.eachCell((cell, col) => {
    if (col >= 2) {
      cell.font = { name: 'Calibri', bold: true, size: 9, color: { argb: '555555' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } }
      cell.alignment = { horizontal: col === 3 ? 'left' : 'center', vertical: 'middle' }
      cell.border = { bottom: { style: 'thin', color: { argb: C.navy } } }
    }
  })

  // Compute actual dates: programme starts today, each item gets duration from test count
  // Items within same section run in parallel; sections run sequentially
  const scheduleRowMap = []  // Tracks {name, section, progRow} for Cx Charts linking
  const programmeStart = new Date()
  programmeStart.setHours(0, 0, 0, 0)
  let sectionStartDate = new Date(programmeStart)

  for (const [sectionName, items] of Object.entries(sections)) {
    // Section separator (dark blue-grey bar)
    const sep = wsProg.addRow(['', '', sectionName, '', '', '', '', '', '', '', '', '', ''])
    sep.height = 20
    sep.eachCell((cell, col) => {
      if (col >= 2) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF37474F' } }
        cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FFFFFFFF' } }
        cell.alignment = { vertical: 'middle' }
        cell.border = { bottom: { style: 'thin', color: { argb: C.orange } } }
      }
    })

    let sectionMaxEnd = new Date(sectionStartDate)

    for (const item of items) {
      const tests = getTests(item)
      const levels = { L3: 0, L4: 0, L5: 0 }
      for (const [lv] of tests) { if (levels[lv] !== undefined) levels[lv]++ }

      // Duration: 1 day per 3 tests, minimum 2 days
      const duration = Math.max(2, Math.ceil(tests.length / 3))
      const itemStart = new Date(sectionStartDate)
      const itemEnd = new Date(itemStart)
      itemEnd.setDate(itemEnd.getDate() + duration)

      // Track max end date in section
      if (itemEnd > sectionMaxEnd) sectionMaxEnd = new Date(itemEnd)

      const r = wsProg.addRow(['', '', getEquipName(item), tests.length, levels.L3 || '', levels.L4 || '', levels.L5 || '', itemStart, itemEnd, '', '', '', ''])
      r.height = 18
      // Duration formula: Planned Finish - Planned Start & "d"
      r.getCell(10).value = { formula: `INT(I${r.number}-H${r.number})&"d"` }
      // Status formula: based on whether dates have passed
      r.getCell(11).value = { formula: `IF(AND(H${r.number}="",I${r.number}=""),"Pending",IF(I${r.number}<=TODAY(),"Complete",IF(H${r.number}<=TODAY(),"In Progress","Pending")))` }
      r.getCell(11).font = { name: 'Calibri', size: 9, italic: true }
      scheduleRowMap.push({ name: getEquipName(item), section: sectionName, progRow: r.number })
      r.eachCell((cell, col) => {
        if (col >= 3) {
          cell.font = { name: 'Calibri', size: 9 }
          cell.alignment = { horizontal: col === 3 ? 'left' : 'center', vertical: 'middle' }
          cell.border = { bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } } }
          if (col === 8 || col === 9) cell.numFmt = 'DD-MMM-YY'
        }
        if (col === 11) {
          cell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF999999' } }
        }
      })

      // Stagger items within section (60% overlap)
      sectionStartDate.setDate(sectionStartDate.getDate() + Math.ceil(duration * 0.6))
    }

    // Next section starts after current section ends
    sectionStartDate = new Date(sectionMaxEnd)
  }// ── Border box around entire content ──
  const progLastRow = wsProg.lastRow.number
  for (let r = 2; r <= progLastRow; r++) {
    const row = wsProg.getRow(r)
    row.getCell(2).border = { ...row.getCell(2).border, left: PROG_BOX_BORDER }
    row.getCell(13).border = { ...row.getCell(13).border, right: PROG_BOX_BORDER }
  }
  for (let c = 2; c <= 13; c++) {
    const cellTop = wsProg.getRow(2).getCell(c)
    cellTop.border = { ...cellTop.border, top: PROG_BOX_BORDER }
    const cellBot = wsProg.getRow(progLastRow).getCell(c)
    cellBot.border = { ...cellBot.border, bottom: PROG_BOX_BORDER }
  }

  // Settings
  wsProg.views = [{ showGridLines: false, state: 'frozen', ySplit: 3, topLeftCell: 'B4' }]
  wsProg.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1 }

  // Track sheet ranges for formula references
  const sheetInfo = []

  // ═══════════════════════════════════════════════════════════════════
  // SHEETS 4+: SECTION DATA SHEETS
  // ═══════════════════════════════════════════════════════════════════
  const DATA_HEADERS = [
    'S.No', 'Feeder Ref', 'Equipment', 'Level', 'Test Description',
    'Planned Start', 'Planned Finish', 'Actual Start', 'Actual Finish',
    'SAT Completed', 'CxA Witnessed', 'Completed',
    'Report Received', 'Report on Procore', 'Report Reviewed',
    'Reviewed (Y/N/NA)', 'Outstanding Obs', 'Report Closed',
    'Comments', '% Complete'
  ]
  const COL_WIDTHS = [5, 22, 15, 5, 38, 12, 12, 12, 12, 13, 13, 11, 14, 15, 14, 14, 14, 13, 22, 11]

  const yesNoValidation = {
    type: 'list', allowBlank: true, formulae: ['"YES,NO,N/A"'],
    showErrorMessage: true, errorTitle: 'Invalid', error: 'Select YES, NO, or N/A',
  }

  for (const [sectionName, items] of Object.entries(sections)) {
    const ws = wb.addWorksheet(truncate(sectionName), { properties: { tabColor: { argb: 'FF2E86AB' } } })

    // Title
    ws.addRow([`${projectName} — ${sectionName}`]).getCell(1).font = { name: 'Calibri', bold: true, size: 12, color: { argb: C.navy.slice(2) } }
    ws.mergeCells(1, 1, 1, 20)
    ws.addRow([])

    // Headers
    const hRow = ws.addRow(DATA_HEADERS)
    hRow.height = 30
    styleHeader(hRow)
    for (let i = 0; i < COL_WIDTHS.length; i++) ws.getColumn(i + 1).width = COL_WIDTHS[i]

    // Data rows
    let sNo = 1
    let lastEquipName = ''
    const dataStartRow = 4

    for (const item of items) {
      const equipName = getEquipName(item)
      const tests = getTests(item)

      // Orange separator with equipment name between groups
      if (equipName !== lastEquipName) {
        const sep = ws.addRow(['', equipName, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''])
        sep.height = 22
        const sepRowNum = sep.number
        ws.mergeCells(sepRowNum, 2, sepRowNum, 5)
        sep.getCell(2).font = { name: 'Calibri', bold: true, size: 11, color: { argb: 'FF000000' } }
        sep.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' }
        sep.eachCell(cell => { 
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.orange } }
          cell.border = THIN_BORDER
        })
      }
      lastEquipName = equipName

      for (const [level, testName] of tests) {
        const levelLabel = LEVEL_LABELS[level] || level
        const rowNum = ws.lastRow ? ws.lastRow.number + 1 : dataStartRow

        const row = ws.addRow([
          sNo, '', levelLabel, level, testName,
          '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
        ])

        row.eachCell((cell, col) => {
          cell.font = { name: 'Calibri', size: 9 }
          cell.border = THIN_BORDER
          cell.alignment = { vertical: 'middle', horizontal: col === 5 ? 'left' : 'center', wrapText: col === 5 }
          if (col >= 6 && col <= 9) cell.numFmt = 'DD-MMM-YY'
        })

        // Level colour
        const levelColor = C[level] || C.L3
        row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: levelColor } }
        row.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: levelColor } }

        // % Complete FORMULA: counts YES in tracking columns / 5
        // Tracking cols: J(10), K(11), L(12), N(14), R(18)  = SAT, CxA, Completed, Procore, Closed
        const r = row.number
        row.getCell(20).value = { formula: `(COUNTIF(J${r},"YES")+COUNTIF(K${r},"YES")+COUNTIF(L${r},"YES")+COUNTIF(N${r},"YES")+COUNTIF(R${r},"YES"))/5` }
        row.getCell(20).numFmt = '0%'

        // Alternating row shade
        if (sNo % 2 === 0) {
          for (let col = 1; col <= 20; col++) {
            if (col !== 3 && col !== 4) {
              row.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.lightGrey } }
            }
          }
        }

        sNo++
      }
    }

    // Data validation on YES/NO columns
    const lastRow = ws.lastRow ? ws.lastRow.number : dataStartRow
    const yesNoCols = [10, 11, 12, 14, 15, 16, 18]
    for (const col of yesNoCols) {
      for (let r = dataStartRow; r <= lastRow; r++) {
        ws.getCell(r, col).dataValidation = yesNoValidation
      }
    }

    // Freeze panes
    ws.views = [{ state: 'frozen', xSplit: 5, ySplit: 3 }]

    // Track range for summary formulas
    sheetInfo.push({ sheetName: truncate(sectionName), dataStart: 4, dataEnd: ws.lastRow ? ws.lastRow.number : 4 })
  }

  // ═══════════════════════════════════════════════════════════════════
  // POST-PROCESS: Add formulas to Commissioning Status sheet
  // ═══════════════════════════════════════════════════════════════════
  // Progress table starts at row 5 (row 3=title, 4=headers, 5+=data)
  const statusDataStart = 6
  for (let i = 0; i < sheetInfo.length; i++) {
    const si = sheetInfo[i]
    const sn = si.sheetName.includes(' ') ? `'${si.sheetName}'` : si.sheetName
    const range = `T${si.dataStart}:T${si.dataEnd}`
    const row = statusDataStart + i

    // Done = count of 100% complete rows
    wsProg.getCell(row, 5).value = { formula: `COUNTIF(${sn}!${range},1)` }
    // In Progress = rows with >0% but <100%
    wsProg.getCell(row, 6).value = { formula: `COUNTIF(${sn}!${range},">0")-COUNTIF(${sn}!${range},1)` }
    // Pending = Total - Done - InProgress
    wsProg.getCell(row, 7).value = { formula: `D${row}-E${row}-F${row}` }
    // % Complete = Done / Total
    wsProg.getCell(row, 8).value = { formula: `IF(D${row}=0,0,E${row}/D${row})` }
    wsProg.getCell(row, 8).numFmt = '0.00%'
  }

  // OVERALL row formulas
  const overallFormulaRow = statusDataStart + sheetInfo.length
  wsProg.getCell(overallFormulaRow, 5).value = { formula: `SUM(E${statusDataStart}:E${overallFormulaRow-1})` }
  wsProg.getCell(overallFormulaRow, 6).value = { formula: `SUM(F${statusDataStart}:F${overallFormulaRow-1})` }
  wsProg.getCell(overallFormulaRow, 7).value = { formula: `D${overallFormulaRow}-E${overallFormulaRow}-F${overallFormulaRow}` }
  wsProg.getCell(overallFormulaRow, 8).value = { formula: `IF(D${overallFormulaRow}=0,0,E${overallFormulaRow}/D${overallFormulaRow})` }
  wsProg.getCell(overallFormulaRow, 8).numFmt = '0.00%'

  // Documentation Status formulas (pipeline section)
  // Pipeline starts: overallFormulaRow + spacer(1) + sec2Header(1) + pipeHdr(1) + 1
  const pipeStart = overallFormulaRow + 4
  // Cols on data sheets: J=10(SAT), K=11(CxA), L=12(Completed), M=13(Received), N=14(Procore), O=15(Reviewed), R=18(Closed)
  const pipeCols = ['J', 'K', 'L', 'M', 'N', 'O', 'R']
  for (let p = 0; p < 7; p++) {
    const pRow = pipeStart + p
    const col = pipeCols[p]
    const parts = sheetInfo.map(si => {
      const sn = si.sheetName.includes(' ') ? `'${si.sheetName}'` : si.sheetName
      return `COUNTIF(${sn}!${col}${si.dataStart}:${col}${si.dataEnd},"YES")`
    })
    if (parts.length > 0) {
      wsProg.getCell(pRow, 5).value = { formula: parts.join('+') }
      wsProg.getCell(pRow, 6).value = { formula: `IF(D${pRow}=0,0,E${pRow}/D${pRow})` }
      wsProg.getCell(pRow, 6).numFmt = '0.00%'
    }
  }

  // ─── Level Completion "Done" formulas ───
  // For each section row in Level Completion, count tests at each level that are 100% complete
  for (let i = 0; i < Math.min(sheetInfo.length, lvCompRows.length); i++) {
    const si = sheetInfo[i]
    const sn = si.sheetName.includes(' ') ? `'${si.sheetName}'` : si.sheetName
    const lvRow = lvCompRows[i]
    const dRange = `$D$${si.dataStart}:$D$${si.dataEnd}`   // Level column
    const tRange = `$T$${si.dataStart}:$T$${si.dataEnd}`   // % Complete column
    
    // L1 Done (col 5), L2 Done (col 7), L3 Done (col 9), L4 Done (col 11), L5 Done (col 13)
    const levels = ['L1', 'L2', 'L3', 'L4', 'L5']
    const doneCols = [5, 7, 9, 11, 13]
    for (let lv = 0; lv < 5; lv++) {
      wsProg.getCell(lvRow, doneCols[lv]).value = { 
        formula: `COUNTIFS(${sn}!${dRange},"${levels[lv]}*",${sn}!${tRange},1)` 
      }
    }
  }


  // ═══════════════════════════════════════════════════════════════════
  // CX CHARTS SHEET — Cell-based Gantt (LIVE — updates when you edit dates)
  // ═══════════════════════════════════════════════════════════════════
  const wsCharts = wb.addWorksheet('Cx Charts', {
    properties: { tabColor: { argb: 'FFFF9900' } }
  })
  
  // ─── Calculate programme date range ───
  const progStart = new Date()
  progStart.setHours(0, 0, 0, 0)
  let progEnd = new Date(progStart)
  
  // Collect all equipment with dates for the Gantt
  const ganttItems = []  // [{name, section, start, end}]
  let ganttCalcStart = new Date(progStart)
  
  for (const [sectionName, items] of Object.entries(sections)) {
    let sectionMax = new Date(ganttCalcStart)
    for (const item of items) {
      const tests = getTests(item)
      const duration = Math.max(2, Math.ceil(tests.length / 3))
      const itemStart = new Date(ganttCalcStart)
      const itemEnd = new Date(itemStart)
      itemEnd.setDate(itemEnd.getDate() + duration)
      if (itemEnd > sectionMax) sectionMax = new Date(itemEnd)
      if (itemEnd > progEnd) progEnd = new Date(itemEnd)
      
      ganttItems.push({ name: getEquipName(item), section: sectionName, start: itemStart, end: itemEnd })
      ganttCalcStart.setDate(ganttCalcStart.getDate() + Math.ceil(duration * 0.6))
    }
    ganttCalcStart = new Date(sectionMax)
  }
  
  // Add 5 days padding to end
  progEnd.setDate(progEnd.getDate() + 5)
  
  // Calculate total days for columns
  const totalDays = Math.ceil((progEnd - progStart) / (1000 * 60 * 60 * 24))
  const maxCols = Math.max(180, Math.min(totalDays, 365))  // Minimum 6 months, max 1 year
  
  // ─── Row 1: Title ───
  wsCharts.getCell('A1').value = 'Commissioning Programme'
  wsCharts.getCell('A1').font = { name: 'Calibri', bold: true, size: 14, color: { argb: '232F3E' } }
  wsCharts.mergeCells(1, 1, 1, 5)
  wsCharts.getRow(1).height = 24
  
  // ─── Row 3: Date headers (one column per day starting from col D) ───
  // Col A = Equipment, Col B = Start, Col C = End, Col D+ = dates
  wsCharts.getCell('A3').value = 'Equipment'
  wsCharts.getCell('B3').value = 'Start'
  wsCharts.getCell('C3').value = 'Finish'
  wsCharts.getCell('A3').font = { name: 'Calibri', bold: true, size: 9, color: { argb: 'FFFFFF' } }
  wsCharts.getCell('B3').font = { name: 'Calibri', bold: true, size: 9, color: { argb: 'FFFFFF' } }
  wsCharts.getCell('C3').font = { name: 'Calibri', bold: true, size: 9, color: { argb: 'FFFFFF' } }
  wsCharts.getCell('A3').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.navy } }
  wsCharts.getCell('B3').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.navy } }
  wsCharts.getCell('C3').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.navy } }
  
  // Write date headers
  for (let d = 0; d < maxCols; d++) {
    const date = new Date(progStart)
    date.setDate(date.getDate() + d)
    const col = d + 4  // col D = index 4
    const cell = wsCharts.getCell(3, col)
    cell.value = date
    cell.numFmt = 'DD'
    cell.font = { name: 'Calibri', size: 7, color: { argb: '555555' } }
    cell.alignment = { horizontal: 'center', textRotation: 90 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } }
    wsCharts.getColumn(col).width = 2.8
  }
  
  // ─── Row 2: Month headers (merged across date columns) ───
  let currentMonth = -1
  let monthStartCol = 4
  for (let d = 0; d <= maxCols; d++) {
    const date = new Date(progStart)
    date.setDate(date.getDate() + d)
    const month = date.getMonth()
    
    if (month !== currentMonth || d === maxCols) {
      if (currentMonth >= 0 && monthStartCol < d + 4) {
        const endCol = d + 3
        if (endCol > monthStartCol) {
          wsCharts.mergeCells(2, monthStartCol, 2, endCol)
        }
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const prevDate = new Date(progStart)
        prevDate.setDate(prevDate.getDate() + d - 1)
        wsCharts.getCell(2, monthStartCol).value = monthNames[currentMonth] + ' ' + prevDate.getFullYear()
        wsCharts.getCell(2, monthStartCol).font = { name: 'Calibri', bold: true, size: 9, color: { argb: '232F3E' } }
        wsCharts.getCell(2, monthStartCol).alignment = { horizontal: 'center' }
      }
      currentMonth = month
      monthStartCol = d + 4
    }
  }
  
  // ─── Equipment rows with formulas ───
  let currentSection = ''
  let ganttRow = 4
  
  for (const item of ganttItems) {
    // Section separator
    if (item.section !== currentSection) {
      currentSection = item.section
      const sepRow = wsCharts.getRow(ganttRow)
      wsCharts.getCell(ganttRow, 1).value = item.section
      wsCharts.getCell(ganttRow, 1).font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FFFFFF' } }
      for (let c = 1; c <= maxCols + 3; c++) {
        wsCharts.getCell(ganttRow, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF37474F' } }
      }
      sepRow.height = 20
      ganttRow++
    }
    
    // Equipment row
    const row = wsCharts.getRow(ganttRow)
    row.height = 18
    
    // Col A: Name
    wsCharts.getCell(ganttRow, 1).value = item.name
    wsCharts.getCell(ganttRow, 1).font = { name: 'Calibri', bold: true, size: 9, color: { argb: '000000' } }
    wsCharts.getCell(ganttRow, 1).alignment = { vertical: 'middle' }
    
    // Col B: Start date (linked to Cx Programme)
    const schedEntry = scheduleRowMap.find(s => s.name === item.name && s.section === item.section)
    if (schedEntry) {
      wsCharts.getCell(ganttRow, 2).value = { formula: `'Cx Programme'!H${schedEntry.progRow}` }
      wsCharts.getCell(ganttRow, 3).value = { formula: `'Cx Programme'!I${schedEntry.progRow}` }
    } else {
      wsCharts.getCell(ganttRow, 2).value = item.start
      wsCharts.getCell(ganttRow, 3).value = item.end
    }
    wsCharts.getCell(ganttRow, 2).numFmt = 'DD-MMM'
    wsCharts.getCell(ganttRow, 2).font = { name: 'Calibri', size: 8 }
    wsCharts.getCell(ganttRow, 3).numFmt = 'DD-MMM'
    wsCharts.getCell(ganttRow, 3).font = { name: 'Calibri', size: 8 }
    
    // Cols D+: Formula-based bars
    // Formula: =IF(AND(D$3>=$B{row}, D$3<=$C{row}), 1, "")
    for (let d = 0; d < maxCols; d++) {
      const col = d + 4
      const colLetter = wsCharts.getColumn(col).letter
      const cell = wsCharts.getCell(ganttRow, col)
      cell.value = { formula: `IF(AND(${colLetter}$3>=$B${ganttRow},${colLetter}$3<=$C${ganttRow}),1,"")` }
      cell.font = { size: 1, color: { argb: 'FFFFFFFF' } }
      cell.numFmt = ';;;'  // Custom format hides all values
    }
    
    // Alternating row background (very light)
    if (ganttRow % 2 === 0) {
      wsCharts.getCell(ganttRow, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFAFA' } }
    }
    
    ganttRow++
  }
  
  // ─── Conditional formatting: orange fill where formula = 1 ───
  const lastGanttRow = ganttRow - 1
  const firstDateCol = wsCharts.getColumn(4).letter
  const lastDateCol = wsCharts.getColumn(maxCols + 3).letter
  const cfRange = `${firstDateCol}4:${lastDateCol}${lastGanttRow}`
  
  wsCharts.addConditionalFormatting({
    ref: cfRange,
    rules: [{
      type: 'cellIs',
      operator: 'equal',
      formulae: ['1'],
      style: {
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF9900' }, bgColor: { argb: 'FFFF9900' } }
      },
      priority: 1
    }]
  })
  
  // ─── Column widths ───
  wsCharts.getColumn(1).width = 28  // Equipment name
  wsCharts.getColumn(2).width = 10  // Start
  wsCharts.getColumn(3).width = 10  // End
  
  // ─── Freeze panes (freeze equipment name + dates header) ───
  wsCharts.views = [{ state: 'frozen', xSplit: 3, ySplit: 3, showGridLines: false, topLeftCell: 'D4' }]
  wsCharts.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1 }
  // ═══════════════════════════════════════════════════════════════════
  const wsSign = wb.addWorksheet('Certificate of Readiness', { properties: { tabColor: { argb: 'FF27AE60' } } })
  wsSign.getColumn(1).width = 5
  wsSign.getColumn(2).width = 22
  wsSign.getColumn(3).width = 30
  wsSign.getColumn(4).width = 5
  wsSign.getColumn(5).width = 22
  wsSign.getColumn(6).width = 30

  wsSign.addRow([])
  wsSign.addRow(['', 'Certificate of Readiness']).getCell(2).font = { name: 'Calibri', bold: true, size: 16, color: { argb: C.navy.slice(2) } }
  wsSign.mergeCells(2, 2, 2, 6)
  wsSign.addRow([])

  const signInfo = [
    ['', 'Project:', projectName, '', 'Date:', ''],
    ['', 'Build ID:', '', '', 'H2C Date:', ''],
    ['', 'Cluster/Site:', '', '', 'Region:', ''],
  ]
  for (const row of signInfo) {
    const r = wsSign.addRow(row)
    r.getCell(2).font = { name: 'Calibri', bold: true, size: 10 }
    r.getCell(5).font = { name: 'Calibri', bold: true, size: 10 }
    r.eachCell(cell => { cell.border = THIN_BORDER })
  }

  wsSign.addRow([])
  wsSign.addRow(['', 'AUTHORISATION']).getCell(2).font = { name: 'Calibri', bold: true, size: 11 }

  const roles = ['CxA Engineer', 'Site CxA', 'Construction Manager', 'Project Manager', 'Field Engineer']
  const signH = wsSign.addRow(['', 'Role', 'Name', '', 'Signature', 'Date'])
  signH.eachCell((cell, col) => {
    if (col >= 2) {
      cell.font = { name: 'Calibri', bold: true, size: 9, color: { argb: 'FFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.navy } }
      cell.border = THIN_BORDER
    }
  })

  for (const role of roles) {
    const r = wsSign.addRow(['', role, '', '', '', ''])
    r.height = 25
    r.eachCell((cell, col) => { if (col >= 2) { cell.border = THIN_BORDER; cell.font = { name: 'Calibri', size: 10 } } })
  }

  wsSign.addRow([])
  wsSign.addRow([])
  const disclaimer = wsSign.addRow(['', 'This Certificate of Readiness (COR) confirms that all equipment, systems and controls listed herein have been commissioned in accordance with the project commissioning specification. All required test documentation has been received, reviewed and uploaded to Procore. The substation is confirmed ready for energization and handover.'])
  disclaimer.getCell(2).font = { name: 'Calibri', size: 9, italic: true, color: { argb: '666666' } }
  disclaimer.getCell(2).alignment = { wrapText: true }
  wsSign.mergeCells(disclaimer.number, 2, disclaimer.number, 6)

  // ═══════════════════════════════════════════════════════════════════
  // SHEET N: REVISION LOG
  // ═══════════════════════════════════════════════════════════════════
  const wsRev = wb.addWorksheet('Revision History', { properties: { tabColor: { argb: 'FF95A5A6' } } })
  wsRev.addRow(['Revision History']).getCell(1).font = { name: 'Calibri', bold: true, size: 13, color: { argb: C.navy.slice(2) } }
  wsRev.addRow([])

  const revH = wsRev.addRow(['Rev', 'Date', 'Author', 'Description'])
  styleHeader(revH)
  wsRev.addRow(['0', dateStr, '', 'Initial issue — COR generated from commissioning tool'])
  wsRev.addRow(['', '', '', ''])
  wsRev.addRow(['', '', '', ''])
  wsRev.addRow(['', '', '', ''])

  wsRev.getColumn(1).width = 6
  wsRev.getColumn(2).width = 14
  wsRev.getColumn(3).width = 20
  wsRev.getColumn(4).width = 50


  // ═══════════════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════════// EXPORT
  // ═══════════════════════════════════════════════════════════════════
  const buffer = await wb.xlsx.writeBuffer()
  
  const finalBuffer = buffer
  
  const blob = new Blob([finalBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const date = new Date().toISOString().split('T')[0]
  const filename = `COR_${projectName.replace(/[^a-zA-Z0-9]/g, '_')}_${date}.xlsx`
  saveAs(blob, filename)

  return { filename, totalTests: grandTotal, sections: Object.keys(sections).length }
}
