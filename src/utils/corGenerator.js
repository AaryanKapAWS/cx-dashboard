import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import JSZip from 'jszip'
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
  top: { style: 'thin', color: { argb: 'FFB0B8C0' } },
  bottom: { style: 'thin', color: { argb: 'FFB0B8C0' } },
  left: { style: 'thin', color: { argb: 'FFB0B8C0' } },
  right: { style: 'thin', color: { argb: 'FFB0B8C0' } },
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
    cell.font = { name: 'Times New Roman', bold: true, size: 9, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = THIN_BORDER
  })
}

// ─── MAIN EXPORT ────────────────────────────────────────────────────
export async function generateCOR(equipmentData, projectName) {
  console.log('%c[COR] Using FIXED formula build — v2026-09-10', 'color: lime; font-size: 14px; font-weight: bold')
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
      const feederType = items[0]?.feeder_type_label || (items[0]?.feeder_type ? items[0].feeder_type.replace(/_/g, ' ') : '')
      const displayFeeder = feederName ? feederName.toUpperCase() : ''
      const typeLabel = feederType ? ` ${feederType}` : ''
      // If feederName is "Overall", use the section name instead of generic "OVERALL"
      let sheetLabel = (!feederName || feederName.toLowerCase() === 'overall') ? sectionName : `${displayFeeder}${typeLabel}`
      // Prevent duplicate sheet names — prepend section name if clash, add counter if still clashing
      if (sections[sheetLabel]) {
        sheetLabel = `${sectionName} - ${sheetLabel}`
      }
      // Final safety: if STILL duplicate (e.g. same section name used twice), add counter
      let finalLabel = sheetLabel
      let counter = 2
      while (sections[finalLabel]) {
        finalLabel = `${sheetLabel} (${counter})`
        counter++
      }
      sections[finalLabel] = items
    } else {
      // Single item — merge into "SectionName (Overall)" sheet
      // If sectionName is generic "OVERALL", find the actual parent section name
      // by looking at other feeder_refs that share the same section preset
      let overallLabel
      if (sectionName === 'OVERALL' || sectionName === 'Overall') {
        // Look through all feederGroups for a multi-item group with the same section preset
        const itemSection = items[0]?.section || ''
        let foundParent = ''
        for (const [otherRef, otherItems] of Object.entries(feederGroups)) {
          if (otherItems.length > 1 && otherItems[0]?.section === itemSection) {
            foundParent = otherRef.split(' \u2014 ')[0]
            break
          }
        }
        overallLabel = foundParent ? `${foundParent} - Overall` : (items[0]?.parent_section || sectionName)
      } else {
        overallLabel = sectionName
      }
      // If overall label already exists AND belongs to a different section type, make unique
      if (sections[overallLabel] && sections[overallLabel][0]?.section !== items[0]?.section) {
        let oCounter = 2
        while (sections[`${overallLabel} ${oCounter}`]) oCounter++
        overallLabel = `${overallLabel} ${oCounter}`
      }
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

  // Load schedule and progress data from localStorage (used across multiple sections)
  const scheduleData = JSON.parse(localStorage.getItem('test_schedule') || '{}')
  const progressData = JSON.parse(localStorage.getItem('test_progress') || '{}')

  // ─── UNIVERSAL EQUIPMENT-LEVEL N/A ────────────────────────────────
  // If majority (>= half) of an equipment's tests are N/A, treat the
  // ENTIRE equipment as N/A across ALL sections (data sheets, Cx Programme,
  // Cx Schedule, Contractor Deliverables, SAT Report Tracking).
  const equipNaSet = new Set()
  for (const item of equipmentData) {
    const tests = getTests(item)
    if (tests.length === 0) continue
    const eqKey = `${(item.feeder_ref || 'unknown').replace(/\s/g, '_')}_${(item.displayName || item.name || item.type).replace(/\s/g, '_')}`
    let naCount = 0
    for (let ti = 0; ti < tests.length; ti++) {
      const pk = `${eqKey}_${ti}`
      const pr = progressData[pk]
      if (pr && (pr.completed === 'NA' || pr.completed === 'N/A')) naCount++
    }
    if (naCount > 0 && naCount >= tests.length / 2) equipNaSet.add(eqKey)
  }
  if (equipNaSet.size > 0) console.log('%c[COR] Equipment-level N/A:', 'color: orange', [...equipNaSet])

  // ═══════════════════════════════════════════════════════════════════
  // SHEET 1: COVER PAGE
  // ═══════════════════════════════════════════════════════════════════
  const wsCover = wb.addWorksheet('Project Overview', { properties: { tabColor: { argb: 'FF232F3E' } } })

  wsCover.getColumn(1).width = 2
  wsCover.getColumn(2).width = 2.43
  wsCover.getColumn(3).width = 32
  wsCover.getColumn(4).width = 24
  wsCover.getColumn(5).width = 8
  wsCover.getColumn(6).width = 22
  wsCover.getColumn(7).width = 18
  wsCover.getColumn(8).width = 12
  wsCover.getColumn(9).width = 12

  const FIELD_BORDER = { bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } } }
  const SECTION_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.navy } }
  const LABEL_FONT = { name: 'Times New Roman', bold: true, size: 10, color: { argb: '555555' } }
  const VALUE_FONT = { name: 'Times New Roman', size: 10, color: { argb: '000000' } }

  // Row 1: Empty row ABOVE the box (ensures top border is visible)
  const r1 = wsCover.addRow([])
  r1.height = 8

  // Row 2: Padding inside box (top breathing room)  
  const padTop = wsCover.addRow([])
  padTop.height = 25

  // Row 3: Logo + Title
  const logoRow1 = wsCover.addRow([])
  logoRow1.height = 33
  logoRow1.getCell(4).value = 'Commissioning Outstanding Register (COR)'
  logoRow1.getCell(4).font = { name: 'Times New Roman', bold: true, size: 24, color: { argb: C.navy.slice(2) } }
  wsCover.mergeCells(logoRow1.number, 4, logoRow1.number, 9)
  logoRow1.getCell(4).alignment = { horizontal: 'center', vertical: 'bottom' }

  // Row 4: Logo continues + Subtitle
  const logoRow2 = wsCover.addRow([])
  logoRow2.height = 18
  logoRow2.getCell(4).value = 'HV / MV Substation Commissioning'
  logoRow2.getCell(4).font = { name: 'Times New Roman', size: 10, color: { argb: '999999' } }
  wsCover.mergeCells(logoRow2.number, 4, logoRow2.number, 9)
  logoRow2.getCell(4).alignment = { horizontal: 'center', vertical: 'top' }

  // Row 5: Bottom padding in header area
  const padBot = wsCover.addRow([])
  padBot.height = 10

  // Embed AWS logo (left side, base64 encoded)
  try {
    const logoB64 = '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'
    const logoBytes = Uint8Array.from(atob(logoB64), c => c.charCodeAt(0))
    const logoId = wb.addImage({ buffer: logoBytes.buffer, extension: 'png' })
    wsCover.addImage(logoId, 'C3:C4')
  } catch (e) { console.error('Logo embed failed:', e) }

  // Spacer before PROJECT DETAILS
  const spBeforeDetails = wsCover.addRow([])
  spBeforeDetails.height = 6

  // Row 5: spacer
  const sp1 = wsCover.addRow([])
  sp1.height = 10

  // ─── PROJECT DETAILS section header (navy bar) ───
  const infoHeader = wsCover.addRow(['', '', 'PROJECT DETAILS', '', '', '', '', '', ''])
  infoHeader.height = 20
  infoHeader.eachCell((cell, col) => {
    if (col >= 2) {
      cell.fill = SECTION_FILL
      cell.font = { name: 'Times New Roman', bold: true, size: 10, color: { argb: 'FFFFFF' } }
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
  const teamHeader = wsCover.addRow(['', '', 'TEAM', '', '', '', '', '', ''])
  teamHeader.height = 20
  teamHeader.eachCell((cell, col) => {
    if (col >= 2) {
      cell.fill = SECTION_FILL
      cell.font = { name: 'Times New Roman', bold: true, size: 10, color: { argb: 'FFFFFF' } }
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
  const scopeHeader = wsCover.addRow(['', '', 'COMMISSIONING SCOPE', '', '', '', '', '', ''])
  scopeHeader.height = 20
  scopeHeader.eachCell((cell, col) => {
    if (col >= 2) {
      cell.fill = SECTION_FILL
      cell.font = { name: 'Times New Roman', bold: true, size: 10, color: { argb: 'FFFFFF' } }
      cell.alignment = { vertical: 'middle' }
    }
  })

  const scopeHeaders = wsCover.addRow(['', '', 'Section', 'Equipment', 'Tests', 'L1', 'L2', 'L3 (SAT)', 'L4/L5'])
  scopeHeaders.height = 18
  scopeHeaders.eachCell((cell, col) => {
    if (col >= 2) {
      cell.font = { name: 'Times New Roman', bold: true, size: 9, color: { argb: '666666' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = { bottom: { style: 'thin', color: { argb: C.navy } } }
    }
  })
  scopeHeaders.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' }

  for (const stat of allStats) {
    const r = wsCover.addRow(['', '', stat.name, stat.items, stat.total, stat.levels.L1, stat.levels.L2, stat.levels.L3, stat.levels.L4 + stat.levels.L5])
    r.height = 18
    r.eachCell((cell, col) => {
      if (col >= 2) {
        cell.font = { name: 'Times New Roman', size: 10 }
        cell.alignment = { horizontal: col === 3 ? 'left' : 'center', vertical: 'middle' }
        cell.border = FIELD_BORDER
      }
    })
  }
  const scopeTotal = wsCover.addRow(['', '', 'TOTAL', equipmentData.length, grandTotal, overallLevels.L1, overallLevels.L2, overallLevels.L3, overallLevels.L4 + overallLevels.L5])
  scopeTotal.height = 18
  scopeTotal.eachCell((cell, col) => {
    if (col >= 2) {
      cell.font = { name: 'Times New Roman', bold: true, size: 10 }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F3F4' } }
      cell.alignment = { horizontal: col === 2 ? 'left' : 'center', vertical: 'middle' }
      cell.border = { top: { style: 'thin', color: { argb: C.navy } }, bottom: { style: 'thin', color: { argb: C.navy } } }
    }
  })

  // Spacer
  const sp4 = wsCover.addRow([])
  sp4.height = 14

  // ─── PROJECT DOCUMENTATION ───
  const docsHeader = wsCover.addRow(['', '', 'KEY DOCUMENTS', '', '', '', '', '', ''])
  docsHeader.height = 20
  docsHeader.eachCell((cell, col) => {
    if (col >= 2) {
      cell.fill = SECTION_FILL
      cell.font = { name: 'Times New Roman', bold: true, size: 10, color: { argb: 'FFFFFF' } }
      cell.alignment = { vertical: 'middle' }
    }
  })

  const docsSubHeader = wsCover.addRow(['', '', 'Document', 'Reference / Title', '', 'Document', 'Reference / Title'])
  docsSubHeader.height = 18
  docsSubHeader.eachCell((cell, col) => {
    if (col >= 2) {
      cell.font = { name: 'Times New Roman', bold: true, size: 9, color: { argb: '666666' } }
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
    r.getCell(3).font = { name: 'Times New Roman', bold: true, size: 9, color: { argb: '444444' } }
    r.getCell(4).font = VALUE_FONT
    r.getCell(4).border = FIELD_BORDER
    r.getCell(6).font = { name: 'Times New Roman', bold: true, size: 9, color: { argb: '444444' } }
    r.getCell(7).font = VALUE_FONT
    r.getCell(7).border = FIELD_BORDER
    r.eachCell((cell, col) => { if (col >= 2) cell.alignment = { vertical: 'middle' } })
  }

  // Spacer
  const sp5 = wsCover.addRow([])
  sp5.height = 14

  // ─── TESTING LEVELS ───
  const legendHeader = wsCover.addRow(['', '', 'TESTING LEVELS', '', '', '', '', '', ''])
  legendHeader.height = 20
  legendHeader.eachCell((cell, col) => {
    if (col >= 2) {
      cell.fill = SECTION_FILL
      cell.font = { name: 'Times New Roman', bold: true, size: 10, color: { argb: 'FFFFFF' } }
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
    r.getCell(3).font = { name: 'Times New Roman', bold: true, size: 10 }
    r.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } }
    r.getCell(3).alignment = { vertical: 'middle' }
    r.getCell(4).font = { name: 'Times New Roman', size: 10, color: { argb: '555555' } }
    r.getCell(4).alignment = { vertical: 'middle' }
    wsCover.mergeCells(r.number, 4, r.number, 9)
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
    const cellG = row.getCell(9)
    cellG.border = { ...cellG.border, right: BOX_BORDER }
  }
  // Top edge (row 2, cols B-F)
  for (let c = 2; c <= 9; c++) {
    const cell = wsCover.getRow(2).getCell(c)
    cell.border = { ...cell.border, top: BOX_BORDER }
  }
  // Bottom edge (last row, cols B-F)
  for (let c = 2; c <= 9; c++) {
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
  wsProg.getColumn(3).width = 40   // C: System/Equipment name (wider for long bay names)
  wsProg.getColumn(4).width = 13   // D: Total/Tests
  wsProg.getColumn(5).width = 13   // E: Done/L3
  wsProg.getColumn(6).width = 13   // F: In Prog/L4
  wsProg.getColumn(7).width = 13   // G: Pending/L5
  wsProg.getColumn(8).width = 16   // H: % Complete/Planned Start
  wsProg.getColumn(9).width = 14   // I: Planned Finish
  wsProg.getColumn(10).width = 14  // J: Duration
  wsProg.getColumn(11).width = 14  // K: Status
  wsProg.getColumn(12).width = 14  // L: L4(lvl)
  wsProg.getColumn(13).width = 14  // M: L5(lvl)

  const PROG_BOX_BORDER = { style: 'medium', color: { argb: C.navy } }
  const SECTION_BAR = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.navy } }
  const SECTION_FONT = { name: 'Times New Roman', bold: true, size: 10, color: { argb: 'FFFFFF' } }

  // Row 1: gutter above box
  wsProg.addRow([]).height = 8

  // Row 2: Title
  const progTitle = wsProg.addRow(['', '', `${projectName} — Cx Programme`])
  progTitle.getCell(3).font = { name: 'Times New Roman', bold: true, size: 14, color: { argb: C.navy.slice(2) } }
  wsProg.mergeCells(progTitle.number, 3, progTitle.number, 13)
  progTitle.height = 22

  // Row 3: spacer
  wsProg.addRow([]).height = 8

  // ────────────────────────────────────────────────────────────────
  // SECTION 1: COMMISSIONING PROGRESS
  // ────────────────────────────────────────────────────────────────
  const sec1Header = wsProg.addRow(['', '', 'COMMISSIONING PROGRESS', '', '', '', '', '', '', '', '', '', ''])
  sec1Header.height = 28
  sec1Header.eachCell((cell, col) => {
    if (col >= 2) { cell.fill = SECTION_BAR; cell.font = SECTION_FONT; cell.alignment = { vertical: 'middle' } }
  })

  // Progress table headers
  const progHdr = wsProg.addRow(['', '', 'System', 'Total', 'Done', 'In Prog', 'Pending', '% Complete', 'L1', 'L2', 'L3', 'L4', 'L5'])
  progHdr.height = 26
  progHdr.eachCell((cell, col) => {
    if (col >= 2) {
      cell.font = { name: 'Times New Roman', bold: true, size: 9, color: { argb: '555555' } }
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
    r.height = 24
    r.eachCell((cell, col) => {
      if (col >= 3) {
        cell.font = { name: 'Times New Roman', size: 10 }
        cell.alignment = { horizontal: col === 3 ? 'left' : 'center', vertical: 'middle' }
        cell.border = { bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } } }
        if (col === 8) cell.numFmt = '0.0%'
      }
      // Level column colours
      const lvColors = { 9: C.L1, 10: C.L2, 11: C.L3, 12: C.L4, 13: C.L5 }
      if (lvColors[col]) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lvColors[col] } }
    })
  }

  // OVERALL row
  const overallRow = wsProg.addRow(['', '', 'OVERALL', grandTotal, 0, 0, grandTotal, 0, overallLevels.L1, overallLevels.L2, overallLevels.L3, overallLevels.L4, overallLevels.L5])
  overallRow.height = 24
  overallRow.eachCell((cell, col) => {
    if (col >= 3) {
      cell.font = { name: 'Times New Roman', bold: true, size: 10 }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F3F4' } }
      cell.alignment = { horizontal: col === 3 ? 'left' : 'center', vertical: 'middle' }
      cell.border = { top: { style: 'thin', color: { argb: C.navy } }, bottom: { style: 'thin', color: { argb: C.navy } } }
      if (col === 8) cell.numFmt = '0.0%'
    }
  })

  // Spacer

  wsProg.addRow([]).height = 8

  // ────────────────────────────────────────────────────────────────
  // SECTION 2: COMMISSIONING & REPORTING STATUS
  // ────────────────────────────────────────────────────────────────
  const sec2Header = wsProg.addRow(['', '', 'COMMISSIONING & REPORTING STATUS', '', '', '', '', '', '', '', '', '', ''])
  sec2Header.height = 28
  sec2Header.eachCell((cell, col) => {
    if (col >= 2) { cell.fill = SECTION_BAR; cell.font = SECTION_FONT; cell.alignment = { vertical: 'middle' } }
  })

  const pipeHdr = wsProg.addRow(['', '', 'System / Feeder', 'Total', 'SAT Completed', 'SAT Pending', 'Report Received', 'Report Pending', 'Report Reviewed', 'Review Pending', 'Report Closed', '% Completed', '% Pending'])
  pipeHdr.height = 26
  pipeHdr.eachCell((cell, col) => {
    if (col >= 2) {
      cell.font = { name: 'Times New Roman', bold: true, size: 9, color: { argb: '555555' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } }
      cell.alignment = { horizontal: col === 3 ? 'left' : 'center', vertical: 'middle', wrapText: true }
      cell.border = { bottom: { style: 'thin', color: { argb: C.navy } } }
    }
  })

  // Per-section rows — formulas injected after sheetInfo is populated
  const docStatusRows = []
  for (const stat of allStats) {
    const r = wsProg.addRow(['', '', stat.name, stat.total, 0, 0, 0, 0, 0, 0, 0, 0, 0])
    docStatusRows.push(r.number)
    r.height = 24
    r.eachCell((cell, col) => {
      if (col >= 3) {
        cell.font = { name: 'Times New Roman', size: 10 }
        cell.alignment = { horizontal: col === 3 ? 'left' : 'center', vertical: 'middle' }
        cell.border = { bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } } }
      }
      if (col === 12) { cell.numFmt = '0.0%'; cell.font = { name: 'Times New Roman', size: 10, color: { argb: 'FF27AE60' } } }
      if (col === 13) { cell.numFmt = '0.0%'; cell.font = { name: 'Times New Roman', size: 10, color: { argb: 'FFE67E22' } } }
    })
  }

  // OVERALL row
  const docOverall = wsProg.addRow(['', '', 'OVERALL', grandTotal, 0, 0, 0, 0, 0, 0, 0, 0, 0])
  docOverall.height = 24
  const docOverallRowNum = docOverall.number
  docOverall.eachCell((cell, col) => {
    if (col >= 3) {
      cell.font = { name: 'Times New Roman', bold: true, size: 10 }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F3F4' } }
      cell.alignment = { horizontal: col === 3 ? 'left' : 'center', vertical: 'middle' }
      cell.border = { top: { style: 'thin', color: { argb: C.navy } }, bottom: { style: 'thin', color: { argb: C.navy } } }
    }
    if (col === 12) { cell.numFmt = '0.0%'; cell.font = { name: 'Times New Roman', bold: true, size: 10, color: { argb: 'FF27AE60' } } }
    if (col === 13) { cell.numFmt = '0.0%'; cell.font = { name: 'Times New Roman', bold: true, size: 10, color: { argb: 'FFE67E22' } } }
  })

  // Metric rows (formulas injected post-sheetInfo)
  const turnaroundRow = wsProg.addRow(['', '', 'Avg Report Turnaround', '', '', '', '', '', '', '', '', '', ''])
  turnaroundRow.height = 22
  turnaroundRow.getCell(3).font = { name: 'Times New Roman', size: 9, italic: true, color: { argb: '555555' } }
  turnaroundRow.getCell(5).font = { name: 'Times New Roman', size: 9, italic: true, color: { argb: '1565C0' } }
  turnaroundRow.getCell(5).alignment = { horizontal: 'left', vertical: 'middle' }

  const oldestRow = wsProg.addRow(['', '', 'Awaiting Reports', '', '', '', '', '', '', '', '', '', ''])
  oldestRow.height = 22
  oldestRow.getCell(3).font = { name: 'Times New Roman', size: 9, italic: true, color: { argb: '555555' } }
  oldestRow.getCell(5).font = { name: 'Times New Roman', size: 9, italic: true, color: { argb: 'FFC0392B' } }
  oldestRow.getCell(5).alignment = { horizontal: 'left', vertical: 'middle' }


  // Spacer
  wsProg.addRow([]).height = 8

  // ────────────────────────────────────────────────────────────────
  // SECTION 3: LEVEL COMPLETION
  // ────────────────────────────────────────────────────────────────
  const sec3Header = wsProg.addRow(['', '', 'LEVEL COMPLETION', '', '', '', '', '', '', '', '', '', ''])
  sec3Header.height = 28
  sec3Header.eachCell((cell, col) => {
    if (col >= 2) { cell.fill = SECTION_BAR; cell.font = SECTION_FONT; cell.alignment = { vertical: 'middle' } }
  })

  const lvlHdr = wsProg.addRow(['', '', 'Section', 'L1 Total', 'L1 Done', 'L2 Total', 'L2 Done', 'L3 Total', 'L3 Done', 'L4 Total', 'L4 Done', 'L5 Total', 'L5 Done'])
  lvlHdr.height = 26
  lvlHdr.eachCell((cell, col) => {
    if (col >= 2) {
      cell.font = { name: 'Times New Roman', bold: true, size: 10, color: { argb: '555555' } }
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
    r.height = 24
    r.eachCell((cell, col) => {
      if (col >= 3) {
        cell.font = { name: 'Times New Roman', size: 10 }
        cell.alignment = { horizontal: col === 3 ? 'left' : 'center', vertical: 'middle' }
        cell.border = { bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } } }
      }
      // Colour the "Total" columns with light level tint
      const lvTotCols = { 4: C.L1, 6: C.L2, 8: C.L3, 10: C.L4, 12: C.L5 }
      if (lvTotCols[col]) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lvTotCols[col] } }
    })
  }

  
  // Level Completion OVERALL row
  const lvOverallRow2 = wsProg.addRow(['', '', 'OVERALL', overallLevels.L1, 0, overallLevels.L2, 0, overallLevels.L3, 0, overallLevels.L4, 0, overallLevels.L5, 0])
  lvOverallRow2.height = 24
  const lvOverallRowNum = lvOverallRow2.number
  lvOverallRow2.eachCell((cell, col) => {
    if (col >= 3) {
      cell.font = { name: 'Times New Roman', bold: true, size: 10 }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F3F4' } }
      cell.alignment = { horizontal: col === 3 ? 'left' : 'center', vertical: 'middle' }
      cell.border = { top: { style: 'thin', color: { argb: C.navy } }, bottom: { style: 'thin', color: { argb: C.navy } } }
    }
  })


  // Spacer
  wsProg.addRow([]).height = 8


  // Track sheet ranges for formula references
  const sheetInfo = []
  const equipRanges = [] // Track per-equipment row ranges for Cx Schedule formulas

  // Pre-create tabs for correct tab order (content populated later after equipment data is available)
  const wsSched = wb.addWorksheet('Cx Schedule', { properties: { tabColor: { argb: 'FF3498DB' } } })
  const wsTrack = wb.addWorksheet('SAT Report Tracking', { properties: { tabColor: { argb: 'FFE67E22' } } })

  // ═══════════════════════════════════════════════════════════════════
  // SHEETS 4+: SECTION DATA SHEETS
  // ═══════════════════════════════════════════════════════════════════
  // Read schedule data from localStorage
  // scheduleData and progressData already loaded at function scope above

  const DATA_HEADERS = [
    'S.No', 'Feeder Ref', 'Critical for Energisation', 'Level', 'Test Description',
    'Planned Start', 'Planned Finish', 'Actual Start', 'Actual Finish',
    'SAT Completed', 'CxA Witnessed', 'Completed',
    'Report Received', 'Report on Procore', 'Report Reviewed',
    'Reviewed (Y/N/NA)', 'Outstanding Obs', 'Report Closed',
    'Comments', '% Complete'
  ]
  const COL_WIDTHS = [6, 16, 14, 20, 48, 16, 16, 16, 16, 14, 14, 14, 16, 18, 16, 14, 14, 14, 30, 14]

  const yesNoValidation = {
    type: 'list', allowBlank: true, formulae: ['"YES,NO,N/A"'],
    showErrorMessage: true, errorTitle: 'Invalid', error: 'Select YES, NO, or N/A',
  }

  for (const [sectionName, items] of Object.entries(sections)) {
    const ws = wb.addWorksheet(truncate(sectionName), { properties: { tabColor: { argb: 'FF2E86AB' } } })

    // Title
    ws.addRow([`${projectName} — ${sectionName}`]).getCell(1).font = { name: 'Times New Roman', bold: true, size: 12, color: { argb: C.navy.slice(2) } }
    ws.mergeCells(1, 1, 1, 20)
    ws.addRow([])

    // Headers
    const hRow = ws.addRow(DATA_HEADERS)
    hRow.height = 22
    styleHeader(hRow)
    for (let i = 0; i < COL_WIDTHS.length; i++) ws.getColumn(i + 1).width = COL_WIDTHS[i]

    // Data rows
    let sNo = 1
    let lastEquipName = ''
    const dataStartRow = 4

    for (const item of items) {
      const equipName = getEquipName(item)
      const tests = getTests(item)
      const equipFirstRow = ws.lastRow ? ws.lastRow.number + 1 : dataStartRow

      // Orange separator with equipment name between groups
      if (equipName !== lastEquipName) {
        const sep = ws.addRow(['', equipName])
        sep.height = 22
        const sepRowNum = sep.number
        ws.mergeCells(sepRowNum, 2, sepRowNum, 5)
        sep.getCell(2).font = { name: 'Times New Roman', bold: true, size: 11, color: { argb: 'FF000000' } }
        sep.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' }
        for (let sc = 1; sc <= 20; sc++) {
          sep.getCell(sc).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.orange } }
          sep.getCell(sc).border = THIN_BORDER
        }
      }
      lastEquipName = equipName

      const eqNaKey = `${(item.feeder_ref || 'unknown').replace(/\s/g, '_')}_${(item.displayName || item.name || item.type).replace(/\s/g, '_')}`
      const isEquipNa = equipNaSet.has(eqNaKey)

      let testIdx = 0
      for (const [level, testName] of tests) {
        // Look up progress data for this test
        const progressKey = `${(item.feeder_ref || 'unknown').replace(/\s/g, '_')}_${(item.displayName || item.name || item.type).replace(/\s/g, '_')}_${testIdx}`
        const prog = progressData[progressKey] || {}
        // If equipment is universally N/A, force all test fields to N/A
        const satCompleted = isEquipNa ? '' : (prog.tested ? 'YES' : '')
        const cxaWitnessed = isEquipNa ? '' : (prog.witnessed ? 'YES' : '')
        const reportClosed = isEquipNa ? '' : (prog.closed ? 'YES' : '')
        const reportReceivedDate = isEquipNa ? null : (prog.reportReceivedDate ? new Date(prog.reportReceivedDate) : (prog.reportDate ? new Date(prog.reportDate) : null))
        const reportReviewedDate = isEquipNa ? null : (prog.reportReviewedDate ? new Date(prog.reportReviewedDate) : null)
        const completed = isEquipNa ? 'N/A' : (prog.completed === true ? 'YES' : prog.completed === 'NA' ? 'N/A' : '')
        const reportOnProcore = prog.reportOnProcore ? 'YES' : ''
        const reviewed = prog.reviewed === true ? 'YES' : prog.reviewed === 'NA' ? 'N/A' : ''
        const outstandingObs = prog.outstandingObs === true ? 'YES' : prog.outstandingObs === 'NA' ? 'N/A' : ''
        const progComments = prog.comments || null
        const levelLabel = LEVEL_LABELS[level] || level
        const rowNum = ws.lastRow ? ws.lastRow.number + 1 : dataStartRow

        // Look up schedule dates for this equipment
        const schedKey = `${(item.feeder_ref || 'unknown').replace(/\s/g, '_')}_${(item.displayName || item.name || item.type).replace(/\s/g, '_')}`
        const sched = scheduleData[schedKey] || {}
        const pStart = sched.plannedStart ? new Date(sched.plannedStart) : null
        const pFinish = sched.plannedFinish ? new Date(sched.plannedFinish) : null
        const aStart = sched.actualStart ? new Date(sched.actualStart) : null
        const aFinish = sched.actualFinish ? new Date(sched.actualFinish) : null

        const isCritical = (level === 'L5' || prog.critical) ? 'YES' : ''

        const row = ws.addRow([
          sNo, '', isCritical, levelLabel, testName,
          pStart, pFinish, aStart, aFinish,
          satCompleted, cxaWitnessed, completed,
          reportReceivedDate, reportOnProcore, reportReviewedDate,
          reviewed, outstandingObs, reportClosed,
          progComments, ''
        ])

        for (let c = 1; c <= 20; c++) {
          const cell = row.getCell(c)
          cell.font = { name: 'Times New Roman', size: 9 }
          cell.border = THIN_BORDER
          cell.alignment = { vertical: 'middle', horizontal: c === 5 ? 'left' : 'center', wrapText: c === 5 }
          if ([6,7,8,9,13,15].includes(c)) cell.numFmt = 'DD-MMM-YY'
        }

        row.height = 18

        // Level colour (D=levelLabel, E=level code)
        const levelColor = C[level] || C.L3
        row.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: levelColor } }

        // % Complete FORMULA (col U=21): weighted scoring
        // SAT(K) 60% + Report Received(N) 15% + Report Reviewed(P) 15% + Report Closed(S) 10%. NA = blank
        const r = row.number
        testIdx++
        row.getCell(20).value = { formula: `IF(OR(L${r}="N/A",L${r}="NA"),"N/A",IF(OR(J${r}="YES",L${r}="YES"),0.6,0)+IF(N${r}="YES",0.15,0)+IF(P${r}="YES",0.15,0)+IF(R${r}="YES",0.1,0))` }
        row.getCell(20).numFmt = '0%'

        // Critical for Energisation column (C, col 3)
        if (level === 'L5') {
          row.getCell(3).font = { name: 'Times New Roman', size: 9, bold: true, color: { argb: 'FF27AE60' } }
        }
        row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' }

        // Alternating row shade
        if (sNo % 2 === 0) {
          for (let col = 1; col <= 20; col++) {
            if (col !== 4) {
              row.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.lightGrey } }
            }
          }
        }

        
        // #11a N/A blackout: when Completed = N/A, grey out cols H(8) through R(18) per-cell
        if (completed === 'N/A') {
          const NA_GREY = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD5D8DC' }, bgColor: { argb: 'FFD5D8DC' } }
          const NA_FONT = { name: 'Times New Roman', size: 9, color: { argb: 'FFD5D8DC' } }
          for (let c = 8; c <= 18; c++) {
            row.getCell(c).fill = NA_GREY
            row.getCell(c).font = NA_FONT
          }
        }
        // #10 Drop-down validation per individual cell (not range-based to avoid ExcelJS merge bug)
        const ynValidation = { type: 'list', allowBlank: true, formulae: ['"YES,NO,N/A"'] }
        const ynCols = [10, 11, 12, 14, 16, 17, 18]  // J,K,L,N,P,Q,R
        for (const vc of ynCols) {
          row.getCell(vc).dataValidation = ynValidation
        }
        // Critical for Energisation (col C=3) gets YES/NO dropdown on all rows
        row.getCell(3).dataValidation = { type: 'list', allowBlank: true, formulae: ['"YES,NO"'] }

        // Black borders on % Complete column only
        const BLACK_BORDER = { top: { style: 'thin', color: { argb: 'FF000000' } }, bottom: { style: 'thin', color: { argb: 'FF000000' } }, left: { style: 'thin', color: { argb: 'FF000000' } }, right: { style: 'thin', color: { argb: 'FF000000' } } }
        row.getCell(20).border = BLACK_BORDER

sNo++
      }
      // Track equipment row range for Cx Schedule formulas
      const equipLastRow = ws.lastRow ? ws.lastRow.number : equipFirstRow
      const hasL5 = tests.some(([level]) => level === 'L5')
      equipRanges.push({ sheetName: truncate(sectionName), equipName, startRow: equipFirstRow, endRow: equipLastRow, hasL5, sectionName })
    }

    const lastRow = ws.lastRow ? ws.lastRow.number : dataStartRow

    // Date format on Report Received (N=14) and Report Reviewed (P=16)
    const dateCols = [13, 15]
    for (const col of dateCols) {
      for (let r = dataStartRow; r <= lastRow; r++) {
        ws.getCell(r, col).numFmt = 'DD-MMM-YY'
      }
    }

    
    // Conditional formatting — colour YES/NO cells and % Complete
    const cfLastRow = lastRow

    // YES/NO/N/A formatting on YES/NO columns (skip date cols M=13, O=15)
    const yesNoCols = [3, 10, 11, 12, 14, 16, 17, 18]
    for (const cfCol of yesNoCols) {
      const colLetter = ws.getColumn(cfCol).letter
      ws.addConditionalFormatting({
        ref: `${colLetter}${dataStartRow}:${colLetter}${cfLastRow}`,
        rules: [{
          type: 'cellIs', operator: 'equal', formulae: ['"YES"'], priority: 1,
          style: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' }, bgColor: { argb: 'FFC6EFCE' } }, font: { color: { argb: 'FF006100' } } }
        }]
      })
      // NO = pink/red background
      ws.addConditionalFormatting({
        ref: `${colLetter}${dataStartRow}:${colLetter}${cfLastRow}`,
        rules: [{
          type: 'cellIs', operator: 'equal', formulae: ['"NO"'], priority: 2,
          style: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' }, bgColor: { argb: 'FFFFC7CE' } }, font: { color: { argb: 'FF9C0006' } } }
        }]
      })
      // N/A = yellow background
      ws.addConditionalFormatting({
        ref: `${colLetter}${dataStartRow}:${colLetter}${cfLastRow}`,
        rules: [{
          type: 'cellIs', operator: 'equal', formulae: ['"N/A"'], priority: 2,
          style: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFCC' }, bgColor: { argb: 'FFFFFFCC' } }, font: { color: { argb: 'FF9C6500' } } }
        }]
      })
    }
    
    // % Complete column (U = col 21) — traffic light colours
    const pctCol = ws.getColumn(20).letter
    // 0% = pink
    ws.addConditionalFormatting({
      ref: `${pctCol}${dataStartRow}:${pctCol}${cfLastRow}`,
      rules: [{
        type: 'cellIs', operator: 'equal', formulae: ['0'], priority: 3,
        style: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' }, bgColor: { argb: 'FFFFC7CE' } } }
      }]
    })
    // >0% and <60% = yellow
    ws.addConditionalFormatting({
      ref: `${pctCol}${dataStartRow}:${pctCol}${cfLastRow}`,
      rules: [{
        type: 'cellIs', operator: 'between', formulae: ['0.01', '0.59'], priority: 4,
        style: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFCC' }, bgColor: { argb: 'FFFFFFCC' } } }
      }]
    })
    // >=60% = green
    ws.addConditionalFormatting({
      ref: `${pctCol}${dataStartRow}:${pctCol}${cfLastRow}`,
      rules: [{
        type: 'cellIs', operator: 'greaterThanOrEqual', formulae: ['0.6'], priority: 5,
        style: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' }, bgColor: { argb: 'FFC6EFCE' } } }
      }]
    })
    // N/A = pink background, NO visible text (font colour matches pink fill)
    ws.addConditionalFormatting({
      ref: `${pctCol}${dataStartRow}:${pctCol}${cfLastRow}`,
      rules: [{
        type: 'cellIs', operator: 'equal', formulae: ['"N/A"'], priority: 1,
        style: {
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' }, bgColor: { argb: 'FFFFC7CE' } },
          font: { name: 'Times New Roman', size: 9, color: { argb: 'FFFFC7CE' } }
        }
      }]
    })


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
    const sn = `'${si.sheetName}'`
    const tRange = `T${si.dataStart}:T${si.dataEnd}`
    const jRange = `J${si.dataStart}:J${si.dataEnd}`
    const lRange2 = `L${si.dataStart}:L${si.dataEnd}`
    const nRange2 = `N${si.dataStart}:N${si.dataEnd}`  // Report on Procore (YES/NO)
    const pRange2 = `P${si.dataStart}:P${si.dataEnd}`  // Reviewed (YES/NO)
    const rRange2 = `R${si.dataStart}:R${si.dataEnd}`  // Report Closed (YES/NO)
    const dRange4 = `D${si.dataStart}:D${si.dataEnd}`
    const row = statusDataStart + i

    // Total (col D) = test rows minus N/A
    wsProg.getCell(row, 4).value = { formula: `COUNTIF(${sn}!${dRange4},"L*")-COUNTIF(${sn}!${lRange2},"N/A")-COUNTIF(${sn}!${lRange2},"NA")` }
    // Done = SAT Completed (J) OR Completed (L) = YES
    wsProg.getCell(row, 5).value = { formula: `COUNTIF(${sn}!${jRange},"YES")+COUNTIFS(${sn}!${lRange2},"YES",${sn}!${jRange},"<>YES")` }
    // In Progress = has any progress (% > 0) but SAT not yet done
    wsProg.getCell(row, 6).value = { formula: `MAX(0,COUNTIF(${sn}!${tRange},">0")-COUNTIF(${sn}!${jRange},"YES"))` }
    // Pending = Total - Done - InProgress
    wsProg.getCell(row, 7).value = { formula: `D${row}-E${row}-F${row}` }
    // % Complete = weighted 60/15/15/10 aggregate formula
    wsProg.getCell(row, 8).value = { formula: `IF(D${row}=0,0,(E${row}/D${row})*0.6+(COUNTIF(${sn}!${nRange2},"YES")/D${row})*0.15+(COUNTIF(${sn}!${pRange2},"YES")/D${row})*0.15+(COUNTIF(${sn}!${rRange2},"YES")/D${row})*0.1)` }
    wsProg.getCell(row, 8).numFmt = '0.0%'
    // Formula explanation note on first data row
    if (i === 0) {
      wsProg.getCell(row, 8).note = 'Weighted completion: (SAT Done/Total)×60% + (Report on Procore/Total)×15% + (Reviewed/Total)×15% + (Report Closed/Total)×10%.\n% Complete + % Pending always = 100%.'
    }

    // L1-L5 counts (cols 9-13) — LIVE FORMULAS excluding N/A
    const lvNames = ['L1', 'L2', 'L3', 'L4', 'L5']
    const lvCols = [9, 10, 11, 12, 13]
    for (let lv = 0; lv < 5; lv++) {
      wsProg.getCell(row, lvCols[lv]).value = {
        formula: `COUNTIF(${sn}!${dRange4},"${lvNames[lv]}*")-COUNTIFS(${sn}!${dRange4},"${lvNames[lv]}*",${sn}!${lRange2},"N/A")-COUNTIFS(${sn}!${dRange4},"${lvNames[lv]}*",${sn}!${lRange2},"NA")`
      }
    }
  }

  // OVERALL row formulas
  const overallFormulaRow = statusDataStart + sheetInfo.length
  wsProg.getCell(overallFormulaRow, 4).value = { formula: `SUM(D${statusDataStart}:D${overallFormulaRow-1})` }
  wsProg.getCell(overallFormulaRow, 5).value = { formula: `SUM(E${statusDataStart}:E${overallFormulaRow-1})` }
  wsProg.getCell(overallFormulaRow, 6).value = { formula: `SUM(F${statusDataStart}:F${overallFormulaRow-1})` }
  wsProg.getCell(overallFormulaRow, 7).value = { formula: `D${overallFormulaRow}-E${overallFormulaRow}-F${overallFormulaRow}` }
  // % Complete = weighted average of section %s (each section's H weighted by its Total D)
  wsProg.getCell(overallFormulaRow, 8).value = { formula: `IF(D${overallFormulaRow}=0,0,SUMPRODUCT(D${statusDataStart}:D${overallFormulaRow-1},H${statusDataStart}:H${overallFormulaRow-1})/D${overallFormulaRow})` }
  wsProg.getCell(overallFormulaRow, 8).numFmt = '0.0%'
  // L1-L5 OVERALL = SUM of section rows
  for (let lv = 0; lv < 5; lv++) {
    const lvCol = [9, 10, 11, 12, 13][lv]
    const colL = wsProg.getColumn(lvCol).letter
    wsProg.getCell(overallFormulaRow, lvCol).value = { formula: `SUM(${colL}${statusDataStart}:${colL}${overallFormulaRow-1})` }
  }

// Commissioning & Reporting Status formulas (per-section table)
  for (let i = 0; i < sheetInfo.length; i++) {
    const si = sheetInfo[i]
    const sn = `'${si.sheetName}'`
    const jRange = `J${si.dataStart}:J${si.dataEnd}`  // SAT Completed
    const mRange = `M${si.dataStart}:M${si.dataEnd}`  // Report Received (date)
    const oRange = `O${si.dataStart}:O${si.dataEnd}`  // Report Reviewed (date)
    const nRange = `N${si.dataStart}:N${si.dataEnd}`  // Report on Procore (YES/NO)
    const pRange = `P${si.dataStart}:P${si.dataEnd}`  // Reviewed (YES/NO)
    const rRange = `R${si.dataStart}:R${si.dataEnd}`  // Report Closed
    const tRange = `T${si.dataStart}:T${si.dataEnd}`  // % Complete
    const dsRow = docStatusRows[i]

    // Total (col 4) — count rows with % Complete value
    // Total (col 4) — count test rows only (exclude equipment separators)
    const dRange2 = `D${si.dataStart}:D${si.dataEnd}`  // Level column
    wsProg.getCell(dsRow, 4).value = { formula: `COUNTIF(${sn}!${dRange2},"L*")-COUNTIF(${sn}!L${si.dataStart}:L${si.dataEnd},"N/A")-COUNTIF(${sn}!L${si.dataStart}:L${si.dataEnd},"NA")` }
    // SAT Completed (col 5) — includes Completed=YES where SAT not marked
    wsProg.getCell(dsRow, 5).value = { formula: `COUNTIF(${sn}!${jRange},"YES")+COUNTIFS(${sn}!L${si.dataStart}:L${si.dataEnd},"YES",${sn}!${jRange},"<>YES")` }
    // SAT Pending (col 6)
    wsProg.getCell(dsRow, 6).value = { formula: `D${dsRow}-E${dsRow}` }
    // Report Received (col 7) — count Report on Procore = YES (col N)
    wsProg.getCell(dsRow, 7).value = { formula: `COUNTIF(${sn}!${nRange},"YES")` }
    // Report Pending (col 8)
    wsProg.getCell(dsRow, 8).value = { formula: `MAX(0,E${dsRow}-G${dsRow})` }
    // Report Reviewed (col 9) — count Reviewed = YES (col P)
    wsProg.getCell(dsRow, 9).value = { formula: `COUNTIF(${sn}!${pRange},"YES")` }
    // Review Pending (col 10)
    wsProg.getCell(dsRow, 10).value = { formula: `MAX(0,G${dsRow}-I${dsRow})` }
    // Report Closed (col 11)
    wsProg.getCell(dsRow, 11).value = { formula: `COUNTIF(${sn}!${rRange},"YES")` }
    // % Completed (col 12)
    wsProg.getCell(dsRow, 12).value = { formula: `IF(D${dsRow}=0,0,(E${dsRow}/D${dsRow})*0.6+(G${dsRow}/D${dsRow})*0.15+(I${dsRow}/D${dsRow})*0.15+(K${dsRow}/D${dsRow})*0.1)` }
    wsProg.getCell(dsRow, 12).numFmt = '0.0%'
    // % Pending (col 13) = complement of % Completed (always sums to 100%)
    wsProg.getCell(dsRow, 13).value = { formula: `IF(D${dsRow}=0,0,1-L${dsRow})` }
    wsProg.getCell(dsRow, 13).numFmt = '0.0%'
  }

  // Documentation Status OVERALL row formulas
  for (let c = 4; c <= 11; c++) {
    const colLetter = wsProg.getColumn(c).letter
    const refs = docStatusRows.map(r => `${colLetter}${r}`)
    wsProg.getCell(docOverallRowNum, c).value = { formula: refs.join('+') }
  }
  wsProg.getCell(docOverallRowNum, 12).value = { formula: `IF(D${docOverallRowNum}=0,0,(E${docOverallRowNum}/D${docOverallRowNum})*0.6+(G${docOverallRowNum}/D${docOverallRowNum})*0.15+(I${docOverallRowNum}/D${docOverallRowNum})*0.15+(K${docOverallRowNum}/D${docOverallRowNum})*0.1)` }
  wsProg.getCell(docOverallRowNum, 12).numFmt = '0.0%'
  wsProg.getCell(docOverallRowNum, 13).value = { formula: `IF(D${docOverallRowNum}=0,0,1-L${docOverallRowNum})` }
  wsProg.getCell(docOverallRowNum, 13).numFmt = '0.0%'
  // ─── Level Completion "Done" formulas ───
  // For each section row in Level Completion, count tests at each level that are 100% complete
  for (let i = 0; i < Math.min(sheetInfo.length, lvCompRows.length); i++) {
    const si = sheetInfo[i]
    const sn = `'${si.sheetName}'`
    const lvRow = lvCompRows[i]
    const dRange = `$D$${si.dataStart}:$D$${si.dataEnd}`   // Level column
    const jRange = `$J$${si.dataStart}:$J$${si.dataEnd}`   // SAT Completed column
    
    // L1 Done (col 5), L2 Done (col 7), L3 Done (col 9), L4 Done (col 11), L5 Done (col 13)
    const levels = ['L1', 'L2', 'L3', 'L4', 'L5']
    const totalCols = [4, 6, 8, 10, 12]
    const doneCols = [5, 7, 9, 11, 13]
    const lRangeNA = `$L$${si.dataStart}:$L$${si.dataEnd}`   // Completed column for N/A check
    for (let lv = 0; lv < 5; lv++) {
      // Total = count at this level minus N/A at this level
      wsProg.getCell(lvRow, totalCols[lv]).value = {
        formula: `COUNTIF(${sn}!${dRange},"${levels[lv]}*")-COUNTIFS(${sn}!${dRange},"${levels[lv]}*",${sn}!${lRangeNA},"N/A")-COUNTIFS(${sn}!${dRange},"${levels[lv]}*",${sn}!${lRangeNA},"NA")`
      }
      // Done = SAT Completed OR Completed=YES at this level (consistent with Section 1)
      wsProg.getCell(lvRow, doneCols[lv]).value = {
        formula: `COUNTIFS(${sn}!${dRange},"${levels[lv]}*",${sn}!${jRange},"YES")+COUNTIFS(${sn}!${dRange},"${levels[lv]}*",${sn}!${lRangeNA},"YES",${sn}!${jRange},"<>YES")`
      }
    }
  }
  // Level Completion OVERALL row — SUM of Total and Done values
  const totalAndDoneCols = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13]  // L1Total, L1Done, L2Total, L2Done, ...
  for (const dc of totalAndDoneCols) {
    const colLetter = wsProg.getColumn(dc).letter
    const refs = lvCompRows.map(r => `${colLetter}${r}`)
    wsProg.getCell(lvOverallRowNum, dc).value = { formula: refs.join('+') }
  }

  // ─── Documentation Status metric formulas (turnaround + outstanding) ───
  const turnaroundParts = sheetInfo.map(si => {
    const sn = "'" + si.sheetName + "'"
    const nRange = `${sn}!M${si.dataStart}:M${si.dataEnd}`
    const jRange = `${sn}!I${si.dataStart}:I${si.dataEnd}`
    return `SUMPRODUCT((${nRange}<>"")*(${jRange}<>"")*(${nRange}-${jRange}))`
  })
  const countParts = sheetInfo.map(si => {
    const sn = "'" + si.sheetName + "'"
    return `SUMPRODUCT((${sn}!M${si.dataStart}:M${si.dataEnd}<>"")*(${sn}!I${si.dataStart}:I${si.dataEnd}<>""))`
  })
  if (turnaroundParts.length > 0) {
    wsProg.getCell(turnaroundRow.number, 5).value = { formula: `IFERROR(ROUND((${turnaroundParts.join('+')})/(MAX(1,${countParts.join('+')})),0)&" days","N/A")` }
  }

  const outstandingParts = sheetInfo.map(si => {
    const sn = "'" + si.sheetName + "'"
    return `COUNTIFS(${sn}!J${si.dataStart}:J${si.dataEnd},"YES",${sn}!M${si.dataStart}:M${si.dataEnd},"")`
  })
  if (outstandingParts.length > 0) {
    wsProg.getCell(oldestRow.number, 5).value = { formula: `IF(${outstandingParts.join('+')}=0,"None",${outstandingParts.join('+')}&" tests awaiting reports")` }
  }

  // ────────────────────────────────────────────────────────────────
  // SECTION 4: SAT LEVEL TRACKING (in Cx Programme)
  // ────────────────────────────────────────────────────────────────
  wsProg.addRow([]).height = 8
  const sec4Header = wsProg.addRow(['', '', 'SAT LEVEL TRACKING', '', '', '', '', '', '', '', '', '', ''])
  sec4Header.height = 28
  sec4Header.eachCell((cell, col) => {
    if (col >= 2) { cell.fill = SECTION_BAR; cell.font = SECTION_FONT; cell.alignment = { vertical: 'middle' } }
  })

  // Two-row header
  const satTopHdr = wsProg.addRow(['', '', 'System / Feeder', 'Level 1 (FAT)', '', 'Level 2 (Pre-SAT)', '', 'Level 3 (SAT)', '', 'Level 4 (Integration)', '', 'Level 5 (Energization)', ''])
  wsProg.mergeCells(satTopHdr.number, 4, satTopHdr.number, 5)
  wsProg.mergeCells(satTopHdr.number, 6, satTopHdr.number, 7)
  wsProg.mergeCells(satTopHdr.number, 8, satTopHdr.number, 9)
  wsProg.mergeCells(satTopHdr.number, 10, satTopHdr.number, 11)
  wsProg.mergeCells(satTopHdr.number, 12, satTopHdr.number, 13)
  satTopHdr.height = 26
  satTopHdr.eachCell((cell, col) => {
    if (col >= 2) {
      cell.font = { name: 'Times New Roman', bold: true, size: 10, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF37474F' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
    }
  })

  const satSubHdr = wsProg.addRow(['', '', '', 'Completed', 'Pending', 'Completed', 'Pending', 'Completed', 'Pending', 'Completed', 'Pending', 'Completed', 'Pending'])
  satSubHdr.height = 26
  satSubHdr.eachCell((cell, col) => {
    if (col >= 2) {
      cell.font = { name: 'Times New Roman', bold: true, size: 10, color: { argb: '555555' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = { bottom: { style: 'thin', color: { argb: C.navy } } }
    }
    if (col === 3) cell.alignment = { horizontal: 'left', vertical: 'middle' }
  })

  const satTrackRows = []
  for (let i = 0; i < sheetInfo.length; i++) {
    const si = sheetInfo[i]
    const sn = "'" + si.sheetName + "'"
    const dRange = `$D$${si.dataStart}:$D$${si.dataEnd}`
    const lRange = `$L$${si.dataStart}:$L$${si.dataEnd}`

    const satRow = wsProg.addRow(['', '', si.sheetName, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
    satTrackRows.push(satRow.number)

    const levels = ['L1', 'L2', 'L3', 'L4', 'L5']
    for (let lv = 0; lv < 5; lv++) {
      const compCol = 4 + lv * 2
      const pendCol = 5 + lv * 2
      wsProg.getCell(satRow.number, compCol).value = { formula: `COUNTIFS(${sn}!${dRange},"${levels[lv]}*",${sn}!${lRange},"YES")` }
      wsProg.getCell(satRow.number, pendCol).value = { formula: `COUNTIFS(${sn}!${dRange},"${levels[lv]}*",${sn}!${lRange},"<>YES")-COUNTIFS(${sn}!${dRange},"${levels[lv]}*",${sn}!${lRange},"N/A")-COUNTIFS(${sn}!${dRange},"${levels[lv]}*",${sn}!${lRange},"NA")` }
    }

    satRow.eachCell((cell, col) => {
      if (col >= 3) {
        cell.font = { name: 'Times New Roman', size: 10 }
        cell.alignment = { horizontal: col === 3 ? 'left' : 'center', vertical: 'middle' }
        cell.border = { bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } } }
      }
    })
    // Green for completed, red for pending
    for (let lv = 0; lv < 5; lv++) {
      wsProg.getCell(satRow.number, 4 + lv * 2).font = { name: 'Times New Roman', size: 10, color: { argb: 'FF27AE60' } }
      wsProg.getCell(satRow.number, 5 + lv * 2).font = { name: 'Times New Roman', size: 10, color: { argb: 'FFC0392B' } }
    }
  }

  // SAT Level OVERALL row
  const satOverall = wsProg.addRow(['', '', 'OVERALL', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
  satOverall.eachCell((cell, col) => {
    if (col >= 3) {
      cell.font = { name: 'Times New Roman', bold: true, size: 10 }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F3F4' } }
      cell.alignment = { horizontal: col === 3 ? 'left' : 'center', vertical: 'middle' }
      cell.border = { top: { style: 'thin', color: { argb: C.navy } }, bottom: { style: 'thin', color: { argb: C.navy } } }
    }
  })
  for (let c = 4; c <= 13; c++) {
    const colLetter = wsProg.getColumn(c).letter
    const refs = satTrackRows.map(r => `${colLetter}${r}`)
    wsProg.getCell(satOverall.number, c).value = { formula: refs.join('+') }
  }



  // ── Pre-compute run rate data for Contractor Deliverables (B3) ──
  const runRateData = []
  const sectionEntriesArr = Object.entries(sections)
  const rrToday = new Date()
  rrToday.setHours(0, 0, 0, 0)

  let overallSatDone = 0, overallEarliestStart = null, overallLatestPlannedFinish = null, overallTotalTests = 0

  for (let si2 = 0; si2 < sectionEntriesArr.length; si2++) {
    const [rrSecName, rrSecItems] = sectionEntriesArr[si2]
    let satDoneCount = 0
    let earliestActualStart = null
    let latestPlannedFinish = null
    let rrTotalTests = 0

    for (const rrItem of rrSecItems) {
      const rrTests = getTests(rrItem)
      // Count tests excluding N/A
      for (let nai = 0; nai < rrTests.length; nai++) {
        const naKey = `${(rrItem.feeder_ref || 'unknown').replace(/\s/g, '_')}_${(rrItem.displayName || rrItem.name || rrItem.type).replace(/\s/g, '_')}_${nai}`
        const naProg = progressData[naKey]
        if (naProg && (naProg.completed === 'NA' || naProg.completed === 'N/A')) continue
        rrTotalTests++
      }
      const rrSchedKey = `${(rrItem.feeder_ref || 'unknown').replace(/\s/g, '_')}_${(rrItem.displayName || rrItem.name || rrItem.type).replace(/\s/g, '_')}`
      const rrSched = scheduleData[rrSchedKey] || {}

      const rrEqKey = `${(rrItem.feeder_ref || 'unknown').replace(/\s/g, '_')}_${(rrItem.displayName || rrItem.name || rrItem.type).replace(/\s/g, '_')}`
      if (!equipNaSet.has(rrEqKey)) {
        for (let rrTIdx = 0; rrTIdx < rrTests.length; rrTIdx++) {
          const rrProgKey = `${rrEqKey}_${rrTIdx}`
          const rrProg = progressData[rrProgKey] || {}
          if (rrProg.tested || rrProg.completed === true) satDoneCount++
        }
      }

      if (rrSched.actualStart) {
        const d = new Date(rrSched.actualStart)
        if (!earliestActualStart || d < earliestActualStart) earliestActualStart = d
      }
      if (rrSched.plannedFinish) {
        const d = new Date(rrSched.plannedFinish)
        if (!latestPlannedFinish || d > latestPlannedFinish) latestPlannedFinish = d
      }
    }

    overallSatDone += satDoneCount
    overallTotalTests += rrTotalTests
    if (earliestActualStart && (!overallEarliestStart || earliestActualStart < overallEarliestStart)) overallEarliestStart = earliestActualStart
    if (latestPlannedFinish && (!overallLatestPlannedFinish || latestPlannedFinish > overallLatestPlannedFinish)) overallLatestPlannedFinish = latestPlannedFinish

    const weeksElapsed = earliestActualStart ? Math.max(1, Math.floor((rrToday - earliestActualStart) / (7 * 86400000))) : 0
    const weeklyRate = weeksElapsed > 0 ? +(satDoneCount / weeksElapsed).toFixed(1) : 0
    const remaining = rrTotalTests - satDoneCount
    let projectedCompletion = null
    let daysAheadBehind = null

    if (weeklyRate > 0 && remaining > 0) {
      const weeksToComplete = remaining / weeklyRate
      projectedCompletion = new Date(rrToday.getTime() + weeksToComplete * 7 * 86400000)
    } else if (remaining <= 0 && satDoneCount > 0) {
      projectedCompletion = new Date(rrToday)
    }

    if (projectedCompletion && latestPlannedFinish) {
      daysAheadBehind = Math.round((projectedCompletion - latestPlannedFinish) / 86400000)
    }

    runRateData.push({ weeklyRate, projectedCompletion, daysAheadBehind })
  }

  // Overall projection
  const overallWeeksElapsed = overallEarliestStart ? Math.max(1, Math.floor((rrToday - overallEarliestStart) / (7 * 86400000))) : 0
  const overallWeeklyRate = overallWeeksElapsed > 0 ? +(overallSatDone / overallWeeksElapsed).toFixed(1) : 0
  const overallRemaining = overallTotalTests - overallSatDone
  let overallProjectedCompletion = null
  let overallDaysAheadBehind = null
  if (overallWeeklyRate > 0 && overallRemaining > 0) {
    overallProjectedCompletion = new Date(rrToday.getTime() + (overallRemaining / overallWeeklyRate) * 7 * 86400000)
  } else if (overallRemaining <= 0 && overallSatDone > 0) {
    overallProjectedCompletion = new Date(rrToday)
  }
  if (overallProjectedCompletion && overallLatestPlannedFinish) {
    overallDaysAheadBehind = Math.round((overallProjectedCompletion - overallLatestPlannedFinish) / 86400000)
  }

  // ────────────────────────────────────────────────────────────────
  // SECTION 5: CONTRACTOR DELIVERABLES (in Cx Programme)
  // ────────────────────────────────────────────────────────────────
  wsProg.addRow([]).height = 8
  const sec5Header = wsProg.addRow(['', '', 'CONTRACTOR DELIVERABLES', '', '', '', '', '', '', '', '', '', ''])
  sec5Header.height = 28
  sec5Header.eachCell((cell, col) => {
    if (col >= 2) { cell.fill = SECTION_BAR; cell.font = SECTION_FONT; cell.alignment = { vertical: 'middle' } }
  })

  const conHdrProg = wsProg.addRow(['', '', 'System / Feeder', 'Total', 'SAT Done', 'SAT Pending', 'Report In', 'Report Pending', 'Doc Delay', '% SAT', 'Weekly Rate', 'Projected Completion', 'Days +/-'])
  conHdrProg.height = 26
  conHdrProg.eachCell((cell, col) => {
    if (col >= 2) {
      cell.font = { name: 'Times New Roman', bold: true, size: 9, color: { argb: '555555' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } }
      cell.alignment = { horizontal: col === 3 ? 'left' : 'center', vertical: 'middle', wrapText: true }
      cell.border = { bottom: { style: 'thin', color: { argb: C.navy } } }
    }
  })

  const conProgRows = []
  for (let i = 0; i < sheetInfo.length; i++) {
    const si = sheetInfo[i]
    const sn = "'" + si.sheetName + "'"
    const jRange = `J${si.dataStart}:J${si.dataEnd}`
    const mRange = `M${si.dataStart}:M${si.dataEnd}`
    const tRange = `T${si.dataStart}:T${si.dataEnd}`

    const cr = wsProg.addRow(['', '', si.sheetName, 0, 0, 0, 0, 0, 0, 0, 0, '', ''])
    conProgRows.push(cr.number)

    const dRange3 = `D${si.dataStart}:D${si.dataEnd}`
    cr.getCell(4).value = { formula: `COUNTIF(${sn}!${dRange3},"L*")-COUNTIF(${sn}!L${si.dataStart}:L${si.dataEnd},"N/A")-COUNTIF(${sn}!L${si.dataStart}:L${si.dataEnd},"NA")` }
    cr.getCell(5).value = { formula: `COUNTIF(${sn}!${jRange},"YES")+COUNTIFS(${sn}!L${si.dataStart}:L${si.dataEnd},"YES",${sn}!${jRange},"<>YES")` }
    cr.getCell(6).value = { formula: `D${cr.number}-E${cr.number}` }
    cr.getCell(7).value = { formula: `SUMPRODUCT((${sn}!${mRange}<>"")*1*(${sn}!${mRange}>40000)*1)` }
    cr.getCell(8).value = { formula: `D${cr.number}-G${cr.number}` }
    cr.getCell(9).value = { formula: `MAX(0,E${cr.number}-G${cr.number})` }
    cr.getCell(10).value = { formula: `IF(D${cr.number}=0,0,E${cr.number}/D${cr.number})` }
    cr.getCell(10).numFmt = '0.0%'

    // Weekly Rate, Projected Completion, Days +/- — LIVE FORMULAS
    const hRange = `H${si.dataStart}:H${si.dataEnd}`  // Actual Start dates
    const gRange = `G${si.dataStart}:G${si.dataEnd}`  // Planned Finish dates
    const rn = cr.number
    // Weekly Rate = SAT Done / weeks elapsed since earliest actual start (blank cells ignored by MIN)
    cr.getCell(11).value = { formula: `IF(OR(E${rn}=0,COUNT(${sn}!${hRange})=0),0,ROUND(E${rn}/MAX(1,INT((TODAY()-MIN(${sn}!${hRange}))/7)),1))` }
    cr.getCell(11).numFmt = '0.0'
    if (i === 0) cr.getCell(11).note = 'Weekly Rate = SAT Done ÷ weeks elapsed since earliest Actual Start date.\nProjected Completion = Today + (SAT Pending ÷ Weekly Rate) × 7 days.\nDays +/- = Projected Completion − latest Planned Finish (positive = behind schedule).'
    // Projected Completion = today + (SAT Pending / Weekly Rate) * 7
    cr.getCell(12).value = { formula: `IF(OR(K${rn}=0,K${rn}=""),"-",TODAY()+INT((F${rn}/K${rn})*7))` }
    cr.getCell(12).numFmt = 'DD-MMM-YY'
    // Days +/- = Projected Completion - latest Planned Finish (positive = behind)
    cr.getCell(13).value = { formula: `IF(OR(L${rn}="-",L${rn}="",COUNT(${sn}!${gRange})=0),"-",INT(L${rn}-MAX(${sn}!${gRange})))` }
    cr.getCell(13).numFmt = '0'

    cr.eachCell((cell, col) => {
      if (col >= 3) {
        cell.font = { name: 'Times New Roman', size: 10 }
        cell.alignment = { horizontal: col === 3 ? 'left' : 'center', vertical: 'middle' }
        cell.border = { bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } } }
      }
    })
    cr.getCell(9).font = { name: 'Times New Roman', size: 10, color: { argb: 'FFC0392B' } }
  }

  // Contractor OVERALL row
  const conOverallProg = wsProg.addRow(['', '', 'OVERALL', 0, 0, 0, 0, 0, 0, 0, 0, '', ''])
  conOverallProg.eachCell((cell, col) => {
    if (col >= 3) {
      cell.font = { name: 'Times New Roman', bold: true, size: 10 }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F3F4' } }
      cell.alignment = { horizontal: col === 3 ? 'left' : 'center', vertical: 'middle' }
      cell.border = { top: { style: 'thin', color: { argb: C.navy } }, bottom: { style: 'thin', color: { argb: C.navy } } }
    }
  })
  for (let c = 4; c <= 9; c++) {
    const colLetter = wsProg.getColumn(c).letter
    const refs = conProgRows.map(r => `${colLetter}${r}`)
    wsProg.getCell(conOverallProg.number, c).value = { formula: refs.join('+') }
  }
  wsProg.getCell(conOverallProg.number, 10).value = { formula: `IF(D${conOverallProg.number}=0,0,E${conOverallProg.number}/D${conOverallProg.number})` }
  wsProg.getCell(conOverallProg.number, 10).numFmt = '0.0%'

  // OVERALL rate columns — LIVE FORMULAS
  const orn = conOverallProg.number
  const allMinParts = sheetInfo.map(si => {
    const sn2 = "'" + si.sheetName + "'"
    return `IF(COUNT(${sn2}!H${si.dataStart}:H${si.dataEnd})=0,9999999,MIN(${sn2}!H${si.dataStart}:H${si.dataEnd}))`
  })
  const allMaxParts = sheetInfo.map(si => {
    const sn2 = "'" + si.sheetName + "'"
    return `IF(COUNT(${sn2}!G${si.dataStart}:G${si.dataEnd})=0,0,MAX(${sn2}!G${si.dataStart}:G${si.dataEnd}))`
  })
  conOverallProg.getCell(11).value = { formula: `IF(E${orn}=0,0,ROUND(E${orn}/MAX(1,INT((TODAY()-MIN(${allMinParts.join(',')}))/7)),1))` }
  conOverallProg.getCell(11).numFmt = '0.0'
  conOverallProg.getCell(12).value = { formula: `IF(OR(K${orn}=0,K${orn}=""),"-",TODAY()+INT((F${orn}/K${orn})*7))` }
  conOverallProg.getCell(12).numFmt = 'DD-MMM-YY'
  conOverallProg.getCell(13).value = { formula: `IF(OR(L${orn}="-",L${orn}=""),"-",INT(L${orn}-MAX(${allMaxParts.join(',')})))` }
  conOverallProg.getCell(13).numFmt = '0'

  // ────────────────────────────────────────────────────────────────
  // B4: PROJECT PROJECTION row
  // ────────────────────────────────────────────────────────────────
  // PROJECT PROJECTION — all formulas referencing OVERALL row
  const projRow = wsProg.addRow(['', '', 'PROJECT PROJECTION', '', '', '', '', '', '', '', '', '', ''])
  projRow.height = 26
  const prn = projRow.number
  const ovr = conOverallProg.number
  wsProg.mergeCells(prn, 3, prn, 10)
  projRow.getCell(3).font = { name: 'Times New Roman', bold: true, size: 10, color: { argb: C.navy.slice(2) } }
  projRow.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' }
  // Status formula: based on Days +/- from OVERALL
  projRow.getCell(11).value = { formula: `IF(OR(M${ovr}="-",M${ovr}=""),"N/A",IF(M${ovr}<=0,"On Track",IF(M${ovr}<=14,"At Risk","Behind")))` }
  projRow.getCell(11).font = { name: 'Times New Roman', bold: true, size: 10 }
  projRow.getCell(11).alignment = { horizontal: 'center', vertical: 'middle' }
  // Projected Completion from OVERALL
  projRow.getCell(12).value = { formula: `IF(OR(L${ovr}="-",L${ovr}=""),"-",L${ovr})` }
  projRow.getCell(12).numFmt = 'DD-MMM-YY'
  projRow.getCell(12).alignment = { horizontal: 'center', vertical: 'middle' }
  // Days +/- from OVERALL
  projRow.getCell(13).value = { formula: `IF(OR(M${ovr}="-",M${ovr}=""),"-",M${ovr})` }
  projRow.getCell(13).numFmt = '0'
  projRow.getCell(13).alignment = { horizontal: 'center', vertical: 'middle' }
  projRow.eachCell((cell, col) => {
    if (col >= 2) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } }
      cell.border = { top: { style: 'medium', color: { argb: C.navy } }, bottom: { style: 'medium', color: { argb: C.navy } } }
      if (!cell.alignment) cell.alignment = { vertical: 'middle' }
    }
  })


  // ────────────────────────────────────────────────────────────────
  // SECTION 6: CRITICAL FOR ENERGISATION (B2)
  // ────────────────────────────────────────────────────────────────
  wsProg.addRow([]).height = 8
  const sec6Header = wsProg.addRow(['', '', 'CRITICAL FOR ENERGISATION', '', '', '', '', '', '', '', '', '', ''])
  sec6Header.height = 28
  sec6Header.eachCell((cell, col) => {
    if (col >= 2) { cell.fill = SECTION_BAR; cell.font = SECTION_FONT; cell.alignment = { vertical: 'middle' } }
  })

  const critHdr = wsProg.addRow(['', '', 'System / Feeder', 'Total Critical', 'Critical Done', 'Critical Pending', 'Critical % Complete', '', '', '', '', '', ''])
  critHdr.height = 26
  critHdr.eachCell((cell, col) => {
    if (col >= 2) {
      cell.font = { name: 'Times New Roman', bold: true, size: 9, color: { argb: '555555' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } }
      cell.alignment = { horizontal: col === 3 ? 'left' : 'center', vertical: 'middle', wrapText: true }
      cell.border = { bottom: { style: 'thin', color: { argb: C.navy } } }
    }
  })

  const critRows = []
  for (let ci = 0; ci < sheetInfo.length; ci++) {
    const csi = sheetInfo[ci]
    const csn = "'" + csi.sheetName + "'"
    const ccRange = `C${csi.dataStart}:C${csi.dataEnd}`
    const cjRange = `J${csi.dataStart}:J${csi.dataEnd}`

    const critR = wsProg.addRow(['', '', csi.sheetName, 0, 0, 0, 0, '', '', '', '', '', ''])
    critRows.push(critR.number)

    critR.getCell(4).value = { formula: `COUNTIF(${csn}!${ccRange},"YES")` }
    critR.getCell(5).value = { formula: `COUNTIFS(${csn}!${ccRange},"YES",${csn}!${cjRange},"YES")` }
    critR.getCell(6).value = { formula: `D${critR.number}-E${critR.number}` }
    critR.getCell(7).value = { formula: `IF(D${critR.number}=0,0,E${critR.number}/D${critR.number})` }
    critR.getCell(7).numFmt = '0.0%'

    critR.eachCell((cell, col) => {
      if (col >= 3) {
        cell.font = { name: 'Times New Roman', size: 10 }
        cell.alignment = { horizontal: col === 3 ? 'left' : 'center', vertical: 'middle' }
        cell.border = { bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } } }
      }
    })
  }

  // Critical OVERALL row
  const critOverall = wsProg.addRow(['', '', 'OVERALL', 0, 0, 0, 0, '', '', '', '', '', ''])
  critOverall.eachCell((cell, col) => {
    if (col >= 3) {
      cell.font = { name: 'Times New Roman', bold: true, size: 10 }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F3F4' } }
      cell.alignment = { horizontal: col === 3 ? 'left' : 'center', vertical: 'middle' }
      cell.border = { top: { style: 'thin', color: { argb: C.navy } }, bottom: { style: 'thin', color: { argb: C.navy } } }
    }
  })
  for (let cc = 4; cc <= 6; cc++) {
    const ccLetter = wsProg.getColumn(cc).letter
    const ccRefs = critRows.map(r => `${ccLetter}${r}`)
    wsProg.getCell(critOverall.number, cc).value = { formula: ccRefs.join('+') }
  }
  wsProg.getCell(critOverall.number, 7).value = { formula: `IF(D${critOverall.number}=0,0,E${critOverall.number}/D${critOverall.number})` }
  wsProg.getCell(critOverall.number, 7).numFmt = '0.0%'

  // ────────────────────────────────────────────────────────────────
  // FORMULA KEY — visible reference for all Cx Programme metrics
  // ────────────────────────────────────────────────────────────────
  wsProg.addRow([]).height = 8
  const fkHeader = wsProg.addRow(['', '', 'FORMULA KEY', '', '', '', '', '', '', '', '', '', ''])
  fkHeader.height = 28
  fkHeader.eachCell((cell, col) => {
    if (col >= 2) { cell.fill = SECTION_BAR; cell.font = SECTION_FONT; cell.alignment = { vertical: 'middle' } }
  })

  const fkSubHdr = wsProg.addRow(['', '', 'Section', 'Metric', '', '', '', 'How It Is Calculated', '', '', '', '', ''])
  fkSubHdr.height = 24
  wsProg.mergeCells(fkSubHdr.number, 4, fkSubHdr.number, 7)
  wsProg.mergeCells(fkSubHdr.number, 8, fkSubHdr.number, 13)
  fkSubHdr.eachCell((cell, col) => {
    if (col >= 2) {
      cell.font = { name: 'Times New Roman', bold: true, size: 9, color: { argb: '555555' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } }
      cell.alignment = { horizontal: 'left', vertical: 'middle' }
      cell.border = { bottom: { style: 'thin', color: { argb: C.navy } } }
    }
  })

  const FK_FONT = { name: 'Times New Roman', size: 9 }
  const FK_FONT_B = { name: 'Times New Roman', size: 9, bold: true }
  const FK_THIN = { bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } } }
  const FK_SHADE = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9F9F9' } }

  const fkRows = [
    ['Commissioning Progress', '% Complete', '(SAT Done ÷ Total) × 60%  +  (Report on Procore ÷ Total) × 15%  +  (Reviewed ÷ Total) × 15%  +  (Report Closed ÷ Total) × 10%'],
    ['', 'Done', 'SAT Completed (J = YES)  or  Completed (L = YES)'],
    ['', 'In Progress', 'Has any test progress (% > 0) but SAT not yet marked YES'],
    ['', 'Pending', 'Total − Done − In Progress'],
    ['', 'Total', 'Count of test rows (L* levels) minus N/A items'],
    ['Comm. & Reporting Status', '% Completed', 'Same weighted formula as above: (SAT ÷ Total) × 60% + (Procore ÷ Total) × 15% + (Reviewed ÷ Total) × 15% + (Closed ÷ Total) × 10%'],
    ['', '% Pending', '1 − % Completed  (always sums to 100%).  100% requires all 4 milestones complete for every test'],
    ['', 'Report Pending', 'SAT Completed − Report Received  (tests done but report not yet in)'],
    ['Level Completion', 'Done', 'SAT Completed (J = YES)  or  Completed (L = YES) at that level.  N/A excluded from totals'],
    ['SAT Level Tracking', 'Completed', 'Completed column (L) = YES at that level'],
    ['', 'Pending', 'Total at level − Completed − N/A'],
    ['Contractor Deliverables', 'Weekly Rate', 'SAT Done ÷ weeks elapsed since the earliest Actual Start date for that section'],
    ['', 'Projected Completion', 'Today  +  (SAT Pending ÷ Weekly Rate) × 7 days'],
    ['', 'Days +/−', 'Projected Completion − latest Planned Finish.  Positive = behind schedule, negative = ahead'],
    ['', 'Doc Delay', 'Max(0, SAT Done − Reports In).  Reports In counts only valid date entries (>40000)'],
    ['', '% SAT', 'SAT Done ÷ Total'],
    ['Critical for Energisation', 'Critical Done', 'Tests marked Critical (C = YES) where SAT is also YES'],
    ['', 'Critical % Complete', 'Critical Done ÷ Total Critical'],
    ['N/A Handling', 'All sections', 'N/A items excluded from Total denominators.  On data sheets, N/A rows are greyed out (cols H–R).  Cx Schedule shows "N/A" status when all tests for an equipment are N/A'],
  ]

  for (let fki = 0; fki < fkRows.length; fki++) {
    const [sec, metric, formula] = fkRows[fki]
    const fkr = wsProg.addRow(['', '', sec, metric, '', '', '', formula, '', '', '', '', ''])
    wsProg.mergeCells(fkr.number, 4, fkr.number, 7)
    wsProg.mergeCells(fkr.number, 8, fkr.number, 13)
    fkr.height = Math.max(sec ? 26 : 22, Math.ceil(formula.length / 80) * 16)
    fkr.getCell(3).font = sec ? FK_FONT_B : FK_FONT
    fkr.getCell(4).font = { name: 'Times New Roman', size: 9, bold: true, color: { argb: 'FF2C3E50' } }
    fkr.getCell(8).font = FK_FONT
    for (let c = 3; c <= 13; c++) {
      fkr.getCell(c).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true }
      fkr.getCell(c).border = FK_THIN
    }
    // Shade section-start rows
    if (sec) {
      for (let c = 3; c <= 13; c++) fkr.getCell(c).fill = FK_SHADE
    }
  }

  // ── Border box around entire Cx Programme content ──
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
  wsProg.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1 }




  // ═══════════════════════════════════════════════════════════════════
  // NEW TAB: COMMISSIONING SCHEDULE (moved from Cx Programme)
  // ═══════════════════════════════════════════════════════════════════
  // wsSched already created above for tab ordering
  
  wsSched.getColumn(1).width = 2
  wsSched.getColumn(2).width = 2.43
  wsSched.getColumn(3).width = 44   // C: Equipment
  wsSched.getColumn(4).width = 10   // D: Tests
  wsSched.getColumn(5).width = 8    // E: L3
  wsSched.getColumn(6).width = 8    // F: L4
  wsSched.getColumn(7).width = 8    // G: L5
  wsSched.getColumn(8).width = 16   // H: Planned Start
  wsSched.getColumn(9).width = 16   // I: Planned Finish
  wsSched.getColumn(10).width = 16  // J: Actual Start
  wsSched.getColumn(11).width = 16  // K: Actual Finish
  wsSched.getColumn(12).width = 12  // L: Duration
  wsSched.getColumn(13).width = 12  // M: Variance
  wsSched.getColumn(14).width = 12  // N: % Progress
  wsSched.getColumn(15).width = 16  // O: Status

  wsSched.addRow([]).height = 8
  const schedTitle = wsSched.addRow(['', '', `${projectName} — Cx Schedule`])
  schedTitle.getCell(3).font = { name: 'Times New Roman', bold: true, size: 14, color: { argb: C.navy.slice(2) } }
  wsSched.mergeCells(schedTitle.number, 3, schedTitle.number, 15)
  schedTitle.height = 22
  wsSched.addRow([]).height = 8

  // Using SECTION_BAR and SECTION_FONT for consistency with Cx Programme

  const schedHdr = wsSched.addRow(['', '', 'Equipment', 'Tests', 'L3', 'L4', 'L5', 'Planned Start', 'Planned Finish', 'Actual Start', 'Actual Finish', 'Duration', 'Variance', '% Progress', 'Status'])
  schedHdr.height = 26
  schedHdr.eachCell((cell, col) => {
    if (col >= 2) {
      cell.font = { name: 'Times New Roman', bold: true, size: 9, color: { argb: '555555' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } }
      cell.alignment = { horizontal: col === 3 ? 'left' : 'center', vertical: 'middle' }
      cell.border = { bottom: { style: 'thin', color: { argb: C.navy } } }
    }
  })

  // Using scheduleData already loaded at function scope
  const schedStart = new Date()
  schedStart.setHours(0, 0, 0, 0)
  let schedSectionStart = new Date(schedStart)
  let schedEquipIdx = 0   // tracks equipRanges index to match data sheet rows

  for (const [sectionName, items] of Object.entries(sections)) {
    const sep = wsSched.addRow(['', '', sectionName, '', '', '', '', '', '', '', '', '', '', '', ''])
    sep.height = 28
    sep.eachCell((cell, col) => {
      if (col >= 2) {
        cell.fill = SECTION_BAR
        cell.font = SECTION_FONT
        cell.alignment = { vertical: 'middle' }
      }
    })
    wsSched.mergeCells(sep.number, 3, sep.number, 15)

    let schedSecMaxEnd = new Date(schedSectionStart)

    for (const item of items) {
      const tests = getTests(item)
      // Count N/A tests to exclude from totals
      let schedNaCount = 0
      const levels = { L3: 0, L4: 0, L5: 0 }
      for (let ti = 0; ti < tests.length; ti++) {
        const [lv] = tests[ti]
        const pk = `${(item.feeder_ref || 'unknown').replace(/\s/g, '_')}_${(item.displayName || item.name || item.type).replace(/\s/g, '_')}_${ti}`
        const pr = progressData[pk]
        if (pr && (pr.completed === 'NA' || pr.completed === 'N/A')) { schedNaCount++; continue }
        if (levels[lv] !== undefined) levels[lv]++
      }
      const schedTestCount = tests.length - schedNaCount
      // Skip equipment entirely if majority of tests are N/A (universal equipment-level N/A)
      const schedEqKey = `${(item.feeder_ref || 'unknown').replace(/\s/g, '_')}_${(item.displayName || item.name || item.type).replace(/\s/g, '_')}`
      if (schedTestCount === 0 || equipNaSet.has(schedEqKey)) { schedEquipIdx++; continue }

      const schedKey = `${(item.feeder_ref || 'unknown').replace(/\s/g, '_')}_${(item.displayName || item.name || item.type).replace(/\s/g, '_')}`
      const sched = scheduleData[schedKey] || {}

      const duration = Math.max(2, Math.ceil(schedTestCount / 3))
      let itemStart, itemEnd
      if (sched.plannedStart) { itemStart = new Date(sched.plannedStart); itemStart.setHours(0,0,0,0) } else { itemStart = new Date(schedSectionStart) }
      if (sched.plannedFinish) { itemEnd = new Date(sched.plannedFinish); itemEnd.setHours(0,0,0,0) } else { itemEnd = new Date(itemStart); itemEnd.setDate(itemEnd.getDate() + duration) }
      if (itemEnd > schedSecMaxEnd) schedSecMaxEnd = new Date(itemEnd)

      // Actual dates for schedule
      const schAStart = sched.actualStart ? new Date(sched.actualStart) : null
      const schAFinish = sched.actualFinish ? new Date(sched.actualFinish) : null
      // Get matching data sheet row range for live formula
      const schEr = equipRanges[schedEquipIdx] || {}
      const schSn = schEr.sheetName ? (`'${schEr.sheetName}'`) : null

      const r = wsSched.addRow(['', '', getEquipName(item), schedTestCount, levels.L3 || '', levels.L4 || '', levels.L5 || '', itemStart, itemEnd, schAStart, schAFinish, '', '', '', ''])
      r.height = 24

      // Apply styles to ALL cells col 3-15 explicitly (eachCell skips null cells like empty Actual dates)
      for (let col = 3; col <= 15; col++) {
        const cell = r.getCell(col)
        cell.font = { name: 'Times New Roman', size: 10 }
        cell.alignment = { horizontal: col === 3 ? 'left' : 'center', vertical: 'middle' }
        cell.border = { bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } } }
        if ([8, 9, 10, 11].includes(col)) cell.numFmt = 'DD-MMM-YY'
      }

      // Individual cell overrides AFTER eachCell
      // Duration formula (col L=12): Planned Finish - Planned Start
      r.getCell(12).value = { formula: `IFERROR(INT(I${r.number}-H${r.number})&"d","")` }

      // Status formula (col O=15) — #8 N/A check: if ALL tests for this equipment are N/A, show "N/A"
      if (schSn && schEr.startRow && schEr.endRow) {
        const naCheck = `COUNTIF(${schSn}!L${schEr.startRow}:L${schEr.endRow},"N/A")+COUNTIF(${schSn}!L${schEr.startRow}:L${schEr.endRow},"NA")`
        const totalCheck = `COUNTIF(${schSn}!D${schEr.startRow}:D${schEr.endRow},"L*")`
        r.getCell(15).value = { formula: `IF(AND(${totalCheck}>0,${naCheck}>=${totalCheck}),"N/A",IF(AND(H${r.number}="",I${r.number}=""),"Pending",IF(I${r.number}<=TODAY(),"Complete",IF(H${r.number}<=TODAY(),"In Progress","Pending"))))` }
      } else {
        r.getCell(15).value = { formula: `IF(AND(H${r.number}="",I${r.number}=""),"Pending",IF(I${r.number}<=TODAY(),"Complete",IF(H${r.number}<=TODAY(),"In Progress","Pending")))` }
      }
      r.getCell(15).font = { name: 'Times New Roman', size: 10, italic: true }

      // Variance (col M=13): Actual Finish - Planned Finish
      r.getCell(13).value = { formula: `IF(OR(K${r.number}="",I${r.number}=""),"",INT(K${r.number}-I${r.number}))` }
      r.getCell(13).alignment = { horizontal: 'center', vertical: 'middle' }

      // % Progress (col N=14)
      if (schSn && schEr.startRow && schEr.endRow) {
        r.getCell(14).value = { formula: `IF(COUNTIF(${schSn}!D${schEr.startRow}:D${schEr.endRow},"L*")=0,0,SUM(${schSn}!T${schEr.startRow}:T${schEr.endRow})/COUNTIF(${schSn}!D${schEr.startRow}:D${schEr.endRow},"L*"))` }
      }
      r.getCell(14).numFmt = '0.0%'
      r.getCell(14).font = { name: 'Times New Roman', size: 9 }

      schedEquipIdx++
      r.getCell(14).alignment = { horizontal: 'center', vertical: 'middle' }

      schedSectionStart.setDate(schedSectionStart.getDate() + Math.ceil(duration * 0.6))
    }
    schedSectionStart = new Date(schedSecMaxEnd)
  }

  // Status conditional formatting — col O (col 15)
  const schedLastRow = wsSched.lastRow.number
  wsSched.addConditionalFormatting({ ref: `O6:O${schedLastRow}`, rules: [{ type: 'cellIs', operator: 'equal', formulae: ['"Complete"'], priority: 1, style: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' }, bgColor: { argb: 'FFC6EFCE' } }, font: { name: 'Times New Roman', size: 9, italic: true, color: { argb: 'FF006100' } } } }] })
  wsSched.addConditionalFormatting({ ref: `O6:O${schedLastRow}`, rules: [{ type: 'cellIs', operator: 'equal', formulae: ['"In Progress"'], priority: 2, style: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFCC' }, bgColor: { argb: 'FFFFFFCC' } }, font: { name: 'Times New Roman', size: 9, italic: true, color: { argb: 'FF9C6500' } } } }] })
  wsSched.addConditionalFormatting({ ref: `O6:O${schedLastRow}`, rules: [{ type: 'cellIs', operator: 'equal', formulae: ['"Pending"'], priority: 3, style: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' }, bgColor: { argb: 'FFFFC7CE' } }, font: { name: 'Times New Roman', size: 9, italic: true, color: { argb: 'FF9C0006' } } } }] })
  wsSched.addConditionalFormatting({ ref: `O6:O${schedLastRow}`, rules: [{ type: 'cellIs', operator: 'equal', formulae: ['"N/A"'], priority: 0, style: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD5D8DC' } }, font: { name: 'Times New Roman', size: 10, italic: true, color: { argb: 'FF888888' } } } }] })
  // Variance conditional formatting (col M)
  wsSched.addConditionalFormatting({ ref: `M6:M${schedLastRow}`, rules: [{ type: 'cellIs', operator: 'lessThanOrEqual', formulae: ['0'], priority: 4, style: { font: { name: 'Times New Roman', size: 9, color: { argb: 'FF27AE60' } } } }] })
  wsSched.addConditionalFormatting({ ref: `M6:M${schedLastRow}`, rules: [{ type: 'cellIs', operator: 'greaterThan', formulae: ['0'], priority: 5, style: { font: { name: 'Times New Roman', size: 9, color: { argb: 'FFC0392B' } } } }] })


  // Box border around entire Cx Schedule content
  for (let r = 2; r <= schedLastRow; r++) {
    const row = wsSched.getRow(r)
    row.getCell(2).border = { ...row.getCell(2).border, left: PROG_BOX_BORDER }
    row.getCell(15).border = { ...row.getCell(15).border, right: PROG_BOX_BORDER }
  }
  for (let c = 2; c <= 15; c++) {
    const cellTop = wsSched.getRow(2).getCell(c)
    cellTop.border = { ...cellTop.border, top: PROG_BOX_BORDER }
    const cellBot = wsSched.getRow(schedLastRow).getCell(c)
    cellBot.border = { ...cellBot.border, bottom: PROG_BOX_BORDER }
  }
  wsSched.views = [{ showGridLines: false, state: 'frozen', ySplit: 4, topLeftCell: 'B5' }]
  wsSched.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1 }

  // ═══════════════════════════════════════════════════════════════════
  // NEW TAB: DETAILED COMMISSIONING BREAKDOWN
  // ═══════════════════════════════════════════════════════════════════
  
  // ═══════════════════════════════════════════════════════════════════


  // ═══════════════════════════════════════════════════════════════════
  // #9 SAT vs REPORT TRACKING — new sheet
  // Tracks SAT completion date vs report received date, flags gap and overdue days
  // ═══════════════════════════════════════════════════════════════════
  // wsTrack already created above for tab ordering

  // ─── SAT REPORT TRACKING — sections side by side ───
  const TRK_COLS = 6  // Equipment, Test, SAT Date, Report Received, Gap, Status
  const TRK_GAP = 1   // spacer column between sections
  const TRK_BLOCK = TRK_COLS + TRK_GAP  // 7 cols per section block
  const TRK_START_COL = 2  // first data column (B)

  // Collect all section data first
  const trkSections = []
  for (const [sectionName, items] of Object.entries(sections)) {
    const rows = []
    for (const item of items) {
      const tests = getTests(item)
      const trkEqKey = `${(item.feeder_ref || 'unknown').replace(/\s/g, '_')}_${(item.displayName || item.name || item.type).replace(/\s/g, '_')}`
      if (equipNaSet.has(trkEqKey)) continue  // Universal equipment-level N/A
      const sched = scheduleData[trkEqKey] || {}
      for (let trkIdx = 0; trkIdx < tests.length; trkIdx++) {
        const [level, testName] = tests[trkIdx]
        const progressKey = `${trkEqKey}_${trkIdx}`
        const prog = progressData[progressKey] || {}
        const isDone = prog.tested || prog.completed === true
        if (!isDone) continue
        if (prog.completed === 'NA') continue
        const satDate = prog.satDate ? new Date(prog.satDate) : (sched.actualFinish ? new Date(sched.actualFinish) : (sched.actualStart ? new Date(sched.actualStart) : ''))
        const reportDate = prog.reportReceivedDate ? new Date(prog.reportReceivedDate) : (prog.reportDate ? new Date(prog.reportDate) : '')
        const equipName = item.displayName || item.name || item.type
        rows.push({ equipName, testName, satDate, reportDate })
      }
    }
    if (rows.length > 0) trkSections.push({ name: sectionName, rows })
  }

  const maxTrkRows = Math.max(...trkSections.map(s => s.rows.length), 0)

  // Title row
  wsTrack.addRow([]).height = 8
  const trkTitle = wsTrack.addRow([])
  trkTitle.getCell(TRK_START_COL).value = `${projectName} — SAT vs Report Tracking`
  trkTitle.getCell(TRK_START_COL).font = { name: 'Times New Roman', bold: true, size: 14, color: { argb: C.navy.slice(2) } }
  const trkTitleEnd = TRK_START_COL + trkSections.length * TRK_BLOCK - 2
  wsTrack.mergeCells(trkTitle.number, TRK_START_COL, trkTitle.number, Math.max(trkTitleEnd, TRK_START_COL + 6))
  trkTitle.height = 22
  wsTrack.addRow([]).height = 8

  // Section name row (navy bar per block)
  const trkSecRow = wsTrack.addRow([])
  trkSecRow.height = 26
  for (let si = 0; si < trkSections.length; si++) {
    const col = TRK_START_COL + si * TRK_BLOCK
    trkSecRow.getCell(col).value = trkSections[si].name
    for (let c = col; c < col + TRK_COLS; c++) {
      trkSecRow.getCell(c).fill = SECTION_BAR
      trkSecRow.getCell(c).font = SECTION_FONT
      trkSecRow.getCell(c).alignment = { vertical: 'middle' }
    }
    wsTrack.mergeCells(trkSecRow.number, col, trkSecRow.number, col + TRK_COLS - 1)
    trkSecRow.getCell(col).border = { ...trkSecRow.getCell(col).border, left: { style: 'medium', color: { argb: C.navy } } }
    trkSecRow.getCell(col + TRK_COLS - 1).border = { ...trkSecRow.getCell(col + TRK_COLS - 1).border, right: { style: 'medium', color: { argb: C.navy } } }
  }

  // Header row (repeated per block)
  const trkHdr = wsTrack.addRow([])
  trkHdr.height = 24
  const trkHdrLabels = ['Equipment', 'Test', 'SAT Date', 'Report Rcvd', 'Gap', 'Status']
  for (let si = 0; si < trkSections.length; si++) {
    const col = TRK_START_COL + si * TRK_BLOCK
    for (let h = 0; h < trkHdrLabels.length; h++) {
      const cell = trkHdr.getCell(col + h)
      cell.value = trkHdrLabels[h]
      cell.font = { name: 'Times New Roman', bold: true, size: 9, color: { argb: '555555' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } }
      cell.alignment = { horizontal: h <= 1 ? 'left' : 'center', vertical: 'middle', wrapText: true }
      const isFirst = h === 0
      const isLast = h === trkHdrLabels.length - 1
      cell.border = { bottom: { style: 'thin', color: { argb: C.navy } }, ...(isFirst ? { left: { style: 'medium', color: { argb: C.navy } } } : {}), ...(isLast ? { right: { style: 'medium', color: { argb: C.navy } } } : {}) }
    }
  }

  // Set column widths for all blocks
  for (let si = 0; si < trkSections.length; si++) {
    const col = TRK_START_COL + si * TRK_BLOCK
    wsTrack.getColumn(col).width = 26      // Equipment
    wsTrack.getColumn(col + 1).width = 22  // Test
    wsTrack.getColumn(col + 2).width = 13  // SAT Date
    wsTrack.getColumn(col + 3).width = 13  // Report Received
    wsTrack.getColumn(col + 4).width = 8   // Gap
    wsTrack.getColumn(col + 5).width = 11  // Status
    if (si < trkSections.length - 1) {
      wsTrack.getColumn(col + 6).width = 2 // spacer
    }
  }

  // Data rows
  for (let r = 0; r < maxTrkRows; r++) {
    const dataRow = wsTrack.addRow([])
    dataRow.height = 18
    for (let si = 0; si < trkSections.length; si++) {
      const col = TRK_START_COL + si * TRK_BLOCK
      const sec = trkSections[si]
      if (r >= sec.rows.length) continue
      const d = sec.rows[r]
      const rn = dataRow.number

      dataRow.getCell(col).value = d.equipName
      dataRow.getCell(col + 1).value = d.testName
      dataRow.getCell(col + 2).value = d.satDate
      dataRow.getCell(col + 3).value = d.reportDate

      // Gap formula
      const satCol = wsTrack.getColumn(col + 2).letter
      const rptCol = wsTrack.getColumn(col + 3).letter
      const gapCol = wsTrack.getColumn(col + 4).letter
      const statCol = wsTrack.getColumn(col + 5).letter
      dataRow.getCell(col + 4).value = { formula: `IF(OR(${satCol}${rn}="",${rptCol}${rn}=""),"",INT(${rptCol}${rn}-${satCol}${rn}))` }
      // Status formula
      dataRow.getCell(col + 5).value = { formula: `IF(${rptCol}${rn}<>"","Received",IF(${satCol}${rn}<>"",IF(TODAY()-${satCol}${rn}>14,"Overdue","Awaiting"),""))` }

      // Styling
      for (let c = col; c < col + TRK_COLS; c++) {
        const cell = dataRow.getCell(c)
        cell.font = { name: 'Times New Roman', size: 9 }
        cell.alignment = { horizontal: (c - col) <= 1 ? 'left' : 'center', vertical: 'middle' }
        const isFirstCol = (c - col) === 0
        const isLastCol = (c - col) === TRK_COLS - 1
        cell.border = { bottom: { style: 'thin', color: { argb: 'FFEEEEEE' } }, ...(isFirstCol ? { left: { style: 'medium', color: { argb: C.navy } } } : {}), ...(isLastCol ? { right: { style: 'medium', color: { argb: C.navy } } } : {}) }
        if ((c - col) === 2 || (c - col) === 3) cell.numFmt = 'DD-MMM-YY'
      }
      // Alternating shade
      if (r % 2 === 1) {
        for (let c = col; c < col + TRK_COLS; c++) {
          dataRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.lightGrey } }
        }
      }
    }
  }

  // Conditional formatting per block (Status + Gap)
  const trkDataStart = trkHdr.number + 1
  const trkDataEnd = trkHdr.number + maxTrkRows
  for (let si = 0; si < trkSections.length; si++) {
    const col = TRK_START_COL + si * TRK_BLOCK
    const statLetter = wsTrack.getColumn(col + 5).letter
    const gapLetter = wsTrack.getColumn(col + 4).letter
    const ref = `${statLetter}${trkDataStart}:${statLetter}${trkDataEnd}`
    const gapRef = `${gapLetter}${trkDataStart}:${gapLetter}${trkDataEnd}`
    wsTrack.addConditionalFormatting({ ref, rules: [{ type: 'cellIs', operator: 'equal', formulae: ['"Received"'], priority: 1, style: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } }, font: { name: 'Times New Roman', size: 9, color: { argb: 'FF006100' } } } }] })
    wsTrack.addConditionalFormatting({ ref, rules: [{ type: 'cellIs', operator: 'equal', formulae: ['"Overdue"'], priority: 2, style: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } }, font: { name: 'Times New Roman', size: 9, bold: true, color: { argb: 'FF9C0006' } } } }] })
    wsTrack.addConditionalFormatting({ ref, rules: [{ type: 'cellIs', operator: 'equal', formulae: ['"Awaiting"'], priority: 3, style: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFCC' } }, font: { name: 'Times New Roman', size: 9, color: { argb: 'FF9C6500' } } } }] })
    wsTrack.addConditionalFormatting({ ref: gapRef, rules: [{ type: 'cellIs', operator: 'greaterThan', formulae: ['14'], priority: 1, style: { font: { name: 'Times New Roman', size: 9, bold: true, color: { argb: 'FFC0392B' } } } }] })
  }

  wsTrack.views = [{ showGridLines: false, state: 'frozen', xSplit: 1, ySplit: trkHdr.number, topLeftCell: `B${trkHdr.number + 1}` }]
  wsTrack.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1 }

  // ═══════════════════════════════════════════════════════════════════


  // SHEET N: REVISION LOG
  // ═══════════════════════════════════════════════════════════════════
  const wsRev = wb.addWorksheet('Revision History', { properties: { tabColor: { argb: 'FF95A5A6' } } })
  
  // Column layout (matching Project Overview)
  wsRev.getColumn(1).width = 2      // gutter
  wsRev.getColumn(2).width = 2.43   // indent
  wsRev.getColumn(3).width = 8      // Rev
  wsRev.getColumn(4).width = 14     // Date
  wsRev.getColumn(5).width = 20     // Author
  wsRev.getColumn(6).width = 45     // Description
  wsRev.getColumn(7).width = 5      // right padding

  const REV_BOX = { style: 'medium', color: { argb: C.navy } }

  // Row 1: small gutter
  wsRev.addRow([]).height = 8

  // Row 2: padding
  wsRev.addRow([]).height = 20

  // Row 3: Title
  const revTitle = wsRev.addRow(['', '', 'Revision History'])
  revTitle.height = 28
  revTitle.getCell(3).font = { name: 'Times New Roman', bold: true, size: 16, color: { argb: C.navy.slice(2) } }
  revTitle.getCell(3).alignment = { vertical: 'middle' }
  wsRev.mergeCells(revTitle.number, 3, revTitle.number, 6)

  wsRev.addRow([]).height = 12

  // ─── REVISION LOG section ───
  const revSec = wsRev.addRow(['', '', 'REVISION LOG', '', '', ''])
  revSec.height = 20
  revSec.eachCell((cell, col) => {
    if (col >= 2) { cell.fill = SECTION_FILL; cell.font = { name: 'Times New Roman', bold: true, size: 10, color: { argb: 'FFFFFF' } }; cell.alignment = { vertical: 'middle' } }
  })

  // Table header
  const revHdr = wsRev.addRow(['', '', 'Rev', 'Date', 'Author', 'Description'])
  revHdr.height = 20
  revHdr.eachCell((cell, col) => {
    if (col >= 3) {
      cell.font = { name: 'Times New Roman', bold: true, size: 9, color: { argb: '555555' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } }
      cell.border = { bottom: { style: 'thin', color: { argb: C.navy } } }
      cell.alignment = { vertical: 'middle' }
    }
  })

  // Data rows
  const revData = [
    ['0', dateStr, '', 'Initial issue — COR generated from commissioning tool'],
    ['', '', '', ''],
    ['', '', '', ''],
    ['', '', '', ''],
    ['', '', '', ''],
  ]
  for (const [rev, date, author, desc] of revData) {
    const r = wsRev.addRow(['', '', rev, date, author, desc])
    r.height = 20
    r.getCell(3).font = { name: 'Times New Roman', size: 10 }
    r.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' }
    r.getCell(4).font = { name: 'Times New Roman', size: 10 }
    r.getCell(5).font = { name: 'Times New Roman', size: 10 }
    r.getCell(6).font = { name: 'Times New Roman', size: 10 }
    for (let c = 3; c <= 6; c++) {
      r.getCell(c).border = { bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } } }
    }
  }

  wsRev.addRow([]).height = 8

  // ─── Border box ───
  const revLastRow = wsRev.lastRow.number
  for (let r = 2; r <= revLastRow; r++) {
    const row = wsRev.getRow(r)
    row.getCell(2).border = { ...row.getCell(2).border, left: REV_BOX }
    row.getCell(7).border = { ...row.getCell(7).border, right: REV_BOX }
  }
  for (let c = 2; c <= 7; c++) {
    wsRev.getRow(2).getCell(c).border = { ...wsRev.getRow(2).getCell(c).border, top: REV_BOX }
    wsRev.getRow(revLastRow).getCell(c).border = { ...wsRev.getRow(revLastRow).getCell(c).border, bottom: REV_BOX }
  }

  wsRev.views = [{ showGridLines: false, topLeftCell: 'A1' }]
  wsRev.pageSetup = { orientation: 'portrait', fitToPage: true, fitToWidth: 1 }

  // ═══════════════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════════// EXPORT
  // ═══════════════════════════════════════════════════════════════════
  
  // ─── SAT Milestone chart helper data (row 210+, for chart2 reference) ───
  const satChartRow = 210
  const milestoneLabels = ['SAT Completed', 'Report Received', 'Report Reviewed', 'Report Closed']
  const milestoneDoneCols = [5, 7, 9, 11]  // E, G, I, K on Cx Programme OVERALL row
  for (let m = 0; m < 4; m++) {
    wsProg.getCell(satChartRow + m, 3).value = milestoneLabels[m]
    // Red bar = Remaining = Total - Completed (not Total itself)
    wsProg.getCell(satChartRow + m, 4).value = { formula: `D${docOverallRowNum}-${wsProg.getColumn(milestoneDoneCols[m]).letter}${docOverallRowNum}` }
    wsProg.getCell(satChartRow + m, 5).value = { formula: `${wsProg.getColumn(milestoneDoneCols[m]).letter}${docOverallRowNum}` }
  }

  // ─── Level chart helper data (row 200+, for chart3 reference) ───
  const lvChartRow = 200
  wsProg.getCell(lvChartRow, 3).value = 'L1'
  wsProg.getCell(lvChartRow, 4).value = 'L2'
  wsProg.getCell(lvChartRow, 5).value = 'L3'
  wsProg.getCell(lvChartRow, 6).value = 'L4'
  wsProg.getCell(lvChartRow, 7).value = 'L5'
  wsProg.getCell(lvChartRow + 1, 3).value = { formula: `E${lvOverallRowNum}` }
  wsProg.getCell(lvChartRow + 1, 4).value = { formula: `G${lvOverallRowNum}` }
  wsProg.getCell(lvChartRow + 1, 5).value = { formula: `I${lvOverallRowNum}` }
  wsProg.getCell(lvChartRow + 1, 6).value = { formula: `K${lvOverallRowNum}` }
  wsProg.getCell(lvChartRow + 1, 7).value = { formula: `M${lvOverallRowNum}` }
  wsProg.getCell(lvChartRow + 2, 3).value = { formula: `D${lvOverallRowNum}-E${lvOverallRowNum}` }
  wsProg.getCell(lvChartRow + 2, 4).value = { formula: `F${lvOverallRowNum}-G${lvOverallRowNum}` }
  wsProg.getCell(lvChartRow + 2, 5).value = { formula: `H${lvOverallRowNum}-I${lvOverallRowNum}` }
  wsProg.getCell(lvChartRow + 2, 6).value = { formula: `J${lvOverallRowNum}-K${lvOverallRowNum}` }
  wsProg.getCell(lvChartRow + 2, 7).value = { formula: `L${lvOverallRowNum}-M${lvOverallRowNum}` }

const buffer = await wb.xlsx.writeBuffer()
  
  
  // ═══════════════════════════════════════════════════════════════════
  // INJECT PROGRESS CHARTS (via JSZip)
  // ═══════════════════════════════════════════════════════════════════
  let finalBuffer = buffer
  try {
    const zip = await JSZip.loadAsync(buffer)
    const sn = 'Cx Programme'
    const fr = statusDataStart
    const lr = statusDataStart + allStats.length - 1

    // Chart 1: Progress by Section
    const c1 = '<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><c:chart><c:title><c:tx><c:rich><a:bodyPr/><a:p><a:pPr><a:defRPr sz="1100" b="1"/></a:pPr><a:r><a:rPr lang="en-US" sz="1100" b="1"/><a:t>Commissioning Progress by Section</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title><c:plotArea><c:layout/><c:barChart><c:barDir val="bar"/><c:grouping val="stacked"/><c:varyColors val="0"/><c:ser><c:idx val="0"/><c:order val="0"/><c:tx><c:strRef><c:f>' + "'" + sn + "'" + '!$E$' + (fr-1) + '</c:f></c:strRef></c:tx><c:spPr><a:solidFill><a:srgbClr val="27AE60"/></a:solidFill></c:spPr><c:cat><c:strRef><c:f>' + "'" + sn + "'" + '!$C$' + fr + ':$C$' + lr + '</c:f></c:strRef></c:cat><c:val><c:numRef><c:f>' + "'" + sn + "'" + '!$E$' + fr + ':$E$' + lr + '</c:f></c:numRef></c:val></c:ser><c:ser><c:idx val="1"/><c:order val="1"/><c:tx><c:strRef><c:f>' + "'" + sn + "'" + '!$F$' + (fr-1) + '</c:f></c:strRef></c:tx><c:spPr><a:solidFill><a:srgbClr val="FF9900"/></a:solidFill></c:spPr><c:cat><c:strRef><c:f>' + "'" + sn + "'" + '!$C$' + fr + ':$C$' + lr + '</c:f></c:strRef></c:cat><c:val><c:numRef><c:f>' + "'" + sn + "'" + '!$F$' + fr + ':$F$' + lr + '</c:f></c:numRef></c:val></c:ser><c:ser><c:idx val="2"/><c:order val="2"/><c:tx><c:strRef><c:f>' + "'" + sn + "'" + '!$G$' + (fr-1) + '</c:f></c:strRef></c:tx><c:spPr><a:solidFill><a:srgbClr val="C0392B"/></a:solidFill></c:spPr><c:cat><c:strRef><c:f>' + "'" + sn + "'" + '!$C$' + fr + ':$C$' + lr + '</c:f></c:strRef></c:cat><c:val><c:numRef><c:f>' + "'" + sn + "'" + '!$G$' + fr + ':$G$' + lr + '</c:f></c:numRef></c:val></c:ser><c:gapWidth val="150"/><c:overlap val="100"/><c:axId val="111"/><c:axId val="222"/></c:barChart><c:catAx><c:axId val="111"/><c:scaling><c:orientation val="maxMin"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:crossAx val="222"/></c:catAx><c:valAx><c:axId val="222"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:crossAx val="111"/></c:valAx></c:plotArea><c:legend><c:legendPos val="b"/></c:legend><c:plotVisOnly val="1"/></c:chart></c:chartSpace>'

    // Chart 2: SAT Milestone  
    const pfr = 210
    const plr = 213
    const c2 = '<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><c:chart><c:title><c:tx><c:rich><a:bodyPr/><a:p><a:pPr><a:defRPr sz="1100" b="1"/></a:pPr><a:r><a:rPr lang="en-US" sz="1100" b="1"/><a:t>SAT and Reports Milestone Tracking</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title><c:plotArea><c:layout/><c:barChart><c:barDir val="bar"/><c:grouping val="stacked"/><c:varyColors val="0"/><c:ser><c:idx val="0"/><c:order val="0"/><c:tx><c:strRef><c:f>' + "'" + sn + "'" + '!$E$' + (pfr-1) + '</c:f></c:strRef></c:tx><c:spPr><a:solidFill><a:srgbClr val="27AE60"/></a:solidFill></c:spPr><c:cat><c:strRef><c:f>' + "'" + sn + "'" + '!$C$' + pfr + ':$C$' + plr + '</c:f></c:strRef></c:cat><c:val><c:numRef><c:f>' + "'" + sn + "'" + '!$E$' + pfr + ':$E$' + plr + '</c:f></c:numRef></c:val></c:ser><c:ser><c:idx val="1"/><c:order val="1"/><c:tx><c:v>Remaining</c:v></c:tx><c:spPr><a:solidFill><a:srgbClr val="C0392B"/></a:solidFill></c:spPr><c:cat><c:strRef><c:f>' + "'" + sn + "'" + '!$C$' + pfr + ':$C$' + plr + '</c:f></c:strRef></c:cat><c:val><c:numRef><c:f>' + "'" + sn + "'" + '!$D$' + pfr + ':$D$' + plr + '</c:f></c:numRef></c:val></c:ser><c:gapWidth val="150"/><c:overlap val="100"/><c:axId val="333"/><c:axId val="444"/></c:barChart><c:catAx><c:axId val="333"/><c:scaling><c:orientation val="maxMin"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:crossAx val="444"/></c:catAx><c:valAx><c:axId val="444"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:crossAx val="333"/></c:valAx></c:plotArea><c:legend><c:legendPos val="b"/></c:legend><c:plotVisOnly val="1"/></c:chart></c:chartSpace>'

    // Chart 3: Level Completion
    const c3 = '<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><c:chart><c:title><c:tx><c:rich><a:bodyPr/><a:p><a:pPr><a:defRPr sz="1100" b="1"/></a:pPr><a:r><a:rPr lang="en-US" sz="1100" b="1"/><a:t>Level Completion Overview</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title><c:plotArea><c:layout/><c:barChart><c:barDir val="col"/><c:grouping val="stacked"/><c:varyColors val="0"/><c:ser><c:idx val="0"/><c:order val="0"/><c:tx><c:v>Completed</c:v></c:tx><c:spPr><a:solidFill><a:srgbClr val="27AE60"/></a:solidFill></c:spPr><c:cat><c:strRef><c:f>' + "'" + sn + "'" + '!$C$200:$G$200</c:f></c:strRef></c:cat><c:val><c:numRef><c:f>' + "'" + sn + "'" + '!$C$201:$G$201</c:f></c:numRef></c:val></c:ser><c:ser><c:idx val="1"/><c:order val="1"/><c:tx><c:v>Remaining</c:v></c:tx><c:spPr><a:solidFill><a:srgbClr val="C0392B"/></a:solidFill></c:spPr><c:cat><c:strRef><c:f>' + "'" + sn + "'" + '!$C$200:$G$200</c:f></c:strRef></c:cat><c:val><c:numRef><c:f>' + "'" + sn + "'" + '!$C$202:$G$202</c:f></c:numRef></c:val></c:ser><c:overlap val="100"/><c:axId val="555"/><c:axId val="666"/></c:barChart><c:catAx><c:axId val="555"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:crossAx val="666"/></c:catAx><c:valAx><c:axId val="666"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:crossAx val="555"/></c:valAx></c:plotArea><c:legend><c:legendPos val="r"/></c:legend><c:plotVisOnly val="1"/></c:chart></c:chartSpace>'

    // Drawing with 3 charts
    const d2 = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><xdr:twoCellAnchor><xdr:from><xdr:col>14</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>4</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>26</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>18</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="2" name="Chart 1"/><xdr:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></xdr:cNvGraphicFramePr></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" r:id="rId1"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor><xdr:twoCellAnchor><xdr:from><xdr:col>14</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>20</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>26</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>40</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="3" name="Chart 2"/><xdr:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></xdr:cNvGraphicFramePr></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" r:id="rId2"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor><xdr:twoCellAnchor><xdr:from><xdr:col>14</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>42</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>26</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>58</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="4" name="Chart 3"/><xdr:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></xdr:cNvGraphicFramePr></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" r:id="rId3"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor></xdr:wsDr>'

    const d2Rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart3.xml"/></Relationships>'

    zip.file('xl/charts/chart1.xml', c1)
    zip.file('xl/charts/chart2.xml', c2)
    zip.file('xl/charts/chart3.xml', c3)
    zip.file('xl/drawings/drawing2.xml', d2)
    zip.file('xl/drawings/_rels/drawing2.xml.rels', d2Rels)

    // Link to Cx Programme (sheet2)
    var s2r = 'xl/worksheets/_rels/sheet2.xml.rels'
    var s2v = zip.file(s2r) ? await zip.file(s2r).async('string') : null
    if (s2v) { s2v = s2v.replace('</Relationships>', '<Relationship Id="rId99" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing2.xml"/></Relationships>') }
    else { s2v = '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId99" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing2.xml"/></Relationships>' }
    zip.file(s2r, s2v)

    var s2x = await zip.file('xl/worksheets/sheet2.xml').async('string')
    if (s2x && !s2x.includes('<drawing ')) {
      // OOXML schema requires <drawing> BEFORE <legacyDrawing>. If cell notes exist,
      // ExcelJS writes <legacyDrawing> near the end — insert <drawing> before it.
      if (s2x.includes('<legacyDrawing')) {
        s2x = s2x.replace('<legacyDrawing', '<drawing r:id="rId99"/><legacyDrawing')
      } else {
        s2x = s2x.replace('</worksheet>', '<drawing r:id="rId99"/></worksheet>')
      }
      zip.file('xl/worksheets/sheet2.xml', s2x)
    }

    var ct = await zip.file('[Content_Types].xml').async('string')
    if (!ct.includes('chart1.xml')) { ct = ct.replace('</Types>', '<Override PartName="/xl/charts/chart1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/><Override PartName="/xl/charts/chart2.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/><Override PartName="/xl/charts/chart3.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/><Override PartName="/xl/drawings/drawing2.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>') }
    zip.file('[Content_Types].xml', ct)

    finalBuffer = await zip.generateAsync({ type: 'arraybuffer' })
  } catch (e) {
    console.warn('Chart injection failed:', e)
    finalBuffer = buffer
  }
  
  const blob = new Blob([finalBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const date = new Date().toISOString().split('T')[0]
  const filename = `COR_${projectName.replace(/[^a-zA-Z0-9]/g, '_')}_${date}.xlsx`
  saveAs(blob, filename)

  return { filename, totalTests: grandTotal, sections: Object.keys(sections).length }
}