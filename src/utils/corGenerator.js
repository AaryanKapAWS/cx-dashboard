import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import TEST_TEMPLATES from '../data/test_templates.json'

// ═══════════════════════════════════════════════════════════════
// COR GENERATOR — Professional Excel export with full formatting
// ═══════════════════════════════════════════════════════════════

const COLORS = {
  darkHeader: '232F3E',
  lightHeader: '37475A',
  orange: 'FF9900',
  feederBg: 'FFF3E0',
  L1: 'E8F5E9',
  L2: 'E3F2FD',
  L3: 'FFF8E1',
  L4: 'FCE4EC',
  L5: 'F3E5F5',
  equipmentBg: 'F5F5F5',
}

const THIN_BORDER = {
  top: { style: 'thin', color: { argb: 'CCCCCC' } },
  bottom: { style: 'thin', color: { argb: 'CCCCCC' } },
  left: { style: 'thin', color: { argb: 'CCCCCC' } },
  right: { style: 'thin', color: { argb: 'CCCCCC' } },
}

const COL_WIDTHS = [24, 20, 12, 40, 14, 14, 14, 14, 14, 14, 18, 14, 20, 14, 22]

const HEADERS = [
  'Feeder Reference',
  'Equipment',
  'Level Of Testing',
  'Test',
  'Planned Start',
  'Planned Finish',
  'Actual Start',
  'Actual Finish',
  'SAT Completed',
  'SAT Witnessed',
  'Reports on Procore',
  'Reports Reviewed',
  'Observations',
  'Status Closed',
  'Comments',
]

function styleHeaderRow(row) {
  row.eachCell((cell) => {
    cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.darkHeader } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = THIN_BORDER
  })
  row.height = 28
}

function styleSubHeaderRow(row) {
  row.eachCell((cell) => {
    cell.font = { name: 'Calibri', bold: true, size: 9, color: { argb: 'FFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.lightHeader } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = THIN_BORDER
  })
  row.height = 18
}

function styleFeederRow(row) {
  row.eachCell((cell) => {
    cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: '000000' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.orange } }
    cell.border = THIN_BORDER
  })
  row.height = 22
}

function styleEquipmentRow(row) {
  row.eachCell((cell, colNum) => {
    cell.border = THIN_BORDER
    if (colNum === 2) {
      cell.font = { name: 'Calibri', bold: true, size: 9, color: { argb: '1E293B' } }
    } else {
      cell.font = { name: 'Calibri', size: 9 }
    }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.equipmentBg } }
  })
}

function styleTestRow(row, level) {
  const color = COLORS[level] || 'FFFFFF'
  row.eachCell((cell, colNum) => {
    cell.border = THIN_BORDER
    cell.font = { name: 'Calibri', size: 9 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } }
    if (colNum === 3) {
      cell.font = { name: 'Calibri', bold: true, size: 9 }
      cell.alignment = { horizontal: 'center' }
    }
  })
}

/**
 * Generate a professionally formatted COR Excel workbook and trigger download
 */
export async function generateCOR(equipmentData, projectName = 'HV Substation') {
  if (!equipmentData || equipmentData.length === 0) return null

  const wb = new ExcelJS.Workbook()
  wb.creator = 'ACx Commissioning Tool'
  wb.created = new Date()

  // Group equipment by switchgear
  const groups = {}
  for (const item of equipmentData) {
    const ref = item.feeder_ref || 'Unassigned'
    const parts = ref.split(' \u2014 ')
    const switchgear = parts.length > 1 ? parts[0] : 'Equipment'
    const feeder = parts.length > 1 ? parts[1] : ref

    if (!groups[switchgear]) groups[switchgear] = {}
    if (!groups[switchgear][feeder]) groups[switchgear][feeder] = []
    groups[switchgear][feeder].push(item)
  }

  let grandFeeders = 0, grandItems = 0, grandTests = 0

  // --- SUMMARY SHEET ---
  const wsSummary = wb.addWorksheet('Summary')
  wsSummary.columns = [
    { width: 32 }, { width: 12 }, { width: 16 }, { width: 14 },
  ]

  // Title
  const titleRow = wsSummary.addRow(['COMMISSIONING OPERATIONS RECORD'])
  titleRow.getCell(1).font = { name: 'Calibri', bold: true, size: 16 }
  wsSummary.addRow([`Project: ${projectName}`]).getCell(1).font = { name: 'Calibri', size: 11 }
  wsSummary.addRow([`Generated: ${new Date().toISOString().split('T')[0]}`]).getCell(1).font = { name: 'Calibri', size: 9, italic: true }
  wsSummary.addRow([])

  // Summary table header
  const sumHeaderRow = wsSummary.addRow(['Sheet', 'Feeders', 'Equipment', 'Total Tests'])
  sumHeaderRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.darkHeader } }
    cell.border = THIN_BORDER
    cell.alignment = { horizontal: 'center' }
  })

  // Per-switchgear stats
  for (const [sgName, feeders] of Object.entries(groups)) {
    const nF = Object.keys(feeders).length
    const nI = Object.values(feeders).reduce((s, items) => s + items.length, 0)
    const nT = Object.values(feeders).reduce((s, items) =>
      s + items.reduce((ts, item) => ts + (TEST_TEMPLATES[item.type] || [['L3', 'Test']]).length, 0), 0
    )
    const dataRow = wsSummary.addRow([sgName, nF, nI, nT])
    dataRow.eachCell((cell) => { cell.border = THIN_BORDER; cell.font = { name: 'Calibri', size: 10 } })
    grandFeeders += nF; grandItems += nI; grandTests += nT
  }

  // Totals
  const totalRow = wsSummary.addRow(['TOTAL', grandFeeders, grandItems, grandTests])
  totalRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', bold: true, size: 10 }
    cell.border = THIN_BORDER
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F5F5F5' } }
  })

  // Legend
  wsSummary.addRow([])
  wsSummary.addRow(['LEVEL LEGEND']).getCell(1).font = { name: 'Calibri', bold: true, size: 11 }
  const legends = [
    ['L1', 'Factory Acceptance Test (FAT)', COLORS.L1],
    ['L2', 'Site Delivery & Installation Verification', COLORS.L2],
    ['L3', 'Individual Equipment Testing (SAT)', COLORS.L3],
    ['L4', 'Integrated System Testing (IST)', COLORS.L4],
    ['L5', 'Energization & Functional Performance', COLORS.L5],
  ]
  for (const [level, desc, color] of legends) {
    const legRow = wsSummary.addRow([level, desc])
    legRow.getCell(1).font = { name: 'Calibri', bold: true, size: 10 }
    legRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } }
    legRow.getCell(1).border = THIN_BORDER
    legRow.getCell(2).font = { name: 'Calibri', size: 10 }
  }

  // --- EQUIPMENT SHEETS ---
  for (const [sgName, feeders] of Object.entries(groups)) {
    const sheetName = sgName.slice(0, 31).replace(/[/\\?*[\]]/g, '-')
    const ws = wb.addWorksheet(sheetName)

    // Column widths
    ws.columns = COL_WIDTHS.map(w => ({ width: w }))

    // Title row
    const sheetTitle = ws.addRow([`COMMISSIONING OPERATIONS RECORD \u2014 ${sgName}`])
    sheetTitle.getCell(1).font = { name: 'Calibri', bold: true, size: 13 }
    ws.mergeCells(1, 1, 1, 15)

    // Project info
    const infoRow = ws.addRow([`Project: ${projectName}`, '', '', '', `Generated: ${new Date().toISOString().split('T')[0]}`])
    infoRow.getCell(1).font = { name: 'Calibri', size: 9, italic: true }
    infoRow.getCell(5).font = { name: 'Calibri', size: 9, italic: true }

    // Blank row
    ws.addRow([])

    // Header row
    const headerRow = ws.addRow(HEADERS)
    styleHeaderRow(headerRow)

    // Sub-header row
    const subData = Array(15).fill('')
    subData[4] = 'Start Date'
    subData[5] = 'Finish Date'
    subData[6] = 'Start Date'
    subData[7] = 'Finish Date'
    const subRow = ws.addRow(subData)
    styleSubHeaderRow(subRow)

    // Freeze panes
    ws.views = [{ state: 'frozen', ySplit: 5 }]

    // Data rows
    for (const [feederRef, items] of Object.entries(feeders)) {
      // Feeder separator
      const feederData = Array(15).fill('')
      feederData[0] = feederRef
      const fRow = ws.addRow(feederData)
      styleFeederRow(fRow)

      for (const item of items) {
        const tests = TEST_TEMPLATES[item.type] || [['L3', `${item.type} Test`]]
        const eqName = item.name || item.type
        let isFirst = true

        for (const [level, testName] of tests) {
          const rowData = Array(15).fill('')
          if (isFirst) {
            rowData[1] = eqName
            isFirst = false
          }
          rowData[2] = level
          rowData[3] = testName
          rowData[13] = 'Open'

          const testRow = ws.addRow(rowData)

          if (rowData[1]) {
            // Equipment row (first test of equipment)
            styleTestRow(testRow, level)
            testRow.getCell(2).font = { name: 'Calibri', bold: true, size: 9, color: { argb: '1E293B' } }
          } else {
            styleTestRow(testRow, level)
          }
        }
      }

      // Blank separator
      ws.addRow([])
    }
  }

  // Generate and download
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const fileName = `COR_${projectName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`
  saveAs(blob, fileName)

  return {
    fileName,
    sheets: Object.keys(groups).length + 1,
    feeders: grandFeeders,
    items: grandItems,
    tests: grandTests,
  }
}
