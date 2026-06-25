import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import TEST_TEMPLATES from '../data/test_templates.json'

const COLORS = {
  darkHeader: '232F3E',
  lightHeader: '37475A',
  orange: 'FF9900',
  L1: 'E8F5E9',
  L2: 'E3F2FD',
  L3: 'FFF8E1',
  L4: 'FCE4EC',
  L5: 'F3E5F5',
}

const THIN_BORDER = {
  top: { style: 'thin', color: { argb: 'CCCCCC' } },
  bottom: { style: 'thin', color: { argb: 'CCCCCC' } },
  left: { style: 'thin', color: { argb: 'CCCCCC' } },
  right: { style: 'thin', color: { argb: 'CCCCCC' } },
}

const COL_WIDTHS = [24, 20, 12, 40, 14, 14, 14, 14, 14, 14, 18, 14, 20, 14, 22, 30]

const HEADERS = [
  'Feeder Reference',
  'Equipment',
  'Level',
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
  'Status',
  'Comments',
  'Test Sheet',
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

function styleFeederRow(row) {
  row.eachCell((cell) => {
    cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: '000000' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.orange } }
    cell.border = THIN_BORDER
  })
  row.height = 22
}

function styleTestRow(row, level) {
  const color = COLORS[level] || 'FFFFFF'
  row.eachCell((cell, colNum) => {
    cell.border = THIN_BORDER
    cell.font = { name: 'Calibri', size: 9 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } }
    if (colNum === 4) {
      cell.font = { name: 'Calibri', bold: true, size: 9 }
      cell.alignment = { horizontal: 'center' }
    }
  })
}

export async function generateCOR(equipmentData, projectName = 'HV Substation') {
  if (!equipmentData || equipmentData.length === 0) return null

  const wb = new ExcelJS.Workbook()
  wb.creator = 'ACx Commissioning Tool'
  wb.created = new Date()

  // Group by switchgear
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

  // Summary sheet
  const wsSummary = wb.addWorksheet('Summary')
  wsSummary.columns = [{ width: 32 }, { width: 12 }, { width: 16 }, { width: 14 }]
  wsSummary.addRow(['COMMISSIONING OPERATIONS RECORD']).getCell(1).font = { name: 'Calibri', bold: true, size: 16 }
  wsSummary.addRow([`Project: ${projectName}`]).getCell(1).font = { name: 'Calibri', size: 11 }
  wsSummary.addRow([`Generated: ${new Date().toISOString().split('T')[0]}`]).getCell(1).font = { name: 'Calibri', size: 9, italic: true }
  wsSummary.addRow([])

  const sumHeaderRow = wsSummary.addRow(['Sheet', 'Feeders', 'Equipment', 'Total Tests'])
  sumHeaderRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.darkHeader } }
    cell.border = THIN_BORDER
    cell.alignment = { horizontal: 'center' }
  })

  for (const [sgName, feeders] of Object.entries(groups)) {
    const nF = Object.keys(feeders).length
    const nI = Object.values(feeders).reduce((s, items) => s + items.length, 0)
    const nT = Object.values(feeders).reduce((s, items) =>
      s + items.reduce((ts, item) => ts + (TEST_TEMPLATES[item.type] || [['L3', 'Test', '']]).length, 0), 0)
    const dataRow = wsSummary.addRow([sgName, nF, nI, nT])
    dataRow.eachCell((cell) => { cell.border = THIN_BORDER; cell.font = { name: 'Calibri', size: 10 } })
    grandFeeders += nF; grandItems += nI; grandTests += nT
  }

  const totalRow = wsSummary.addRow(['TOTAL', grandFeeders, grandItems, grandTests])
  totalRow.eachCell((cell) => { cell.font = { name: 'Calibri', bold: true, size: 10 }; cell.border = THIN_BORDER })

  wsSummary.addRow([])
  wsSummary.addRow(['LEVEL LEGEND']).getCell(1).font = { name: 'Calibri', bold: true, size: 11 }
  for (const [level, desc, color] of [
    ['L1', 'Factory Acceptance Test (FAT)', COLORS.L1],
    ['L2', 'Site Delivery & Installation Verification', COLORS.L2],
    ['L3', 'Individual Equipment Testing (SAT)', COLORS.L3],
    ['L4', 'Integrated System Testing (IST)', COLORS.L4],
    ['L5', 'Energization & Functional Performance', COLORS.L5],
  ]) {
    const legRow = wsSummary.addRow([level, desc])
    legRow.getCell(1).font = { name: 'Calibri', bold: true, size: 10 }
    legRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } }
    legRow.getCell(1).border = THIN_BORDER
  }

  // Equipment sheets
  for (const [sgName, feeders] of Object.entries(groups)) {
    const sheetName = sgName.slice(0, 31).replace(/[/\\?*[\]]/g, '-')
    const ws = wb.addWorksheet(sheetName)

    ws.columns = COL_WIDTHS.map(w => ({ width: w }))

    // Title
    const sheetTitle = ws.addRow([`COMMISSIONING OPERATIONS RECORD \u2014 ${sgName}`])
    sheetTitle.getCell(1).font = { name: 'Calibri', bold: true, size: 13 }
    ws.mergeCells(1, 1, 1, 16)

    // Project info
    const infoRow = ws.addRow([`Project: ${projectName}`, '', '', '', `Generated: ${new Date().toISOString().split('T')[0]}`])
    infoRow.getCell(1).font = { name: 'Calibri', size: 9, italic: true }
    infoRow.getCell(5).font = { name: 'Calibri', size: 9, italic: true }

    ws.addRow([])

    // Headers
    const headerRow = ws.addRow(HEADERS)
    styleHeaderRow(headerRow)

    // Freeze
    ws.views = [{ state: 'frozen', ySplit: 4 }]

    // Data
    for (const [feederRef, items] of Object.entries(feeders)) {
      // Feeder separator
      const feederData = Array(16).fill('')
      feederData[0] = feederRef
      const fRow = ws.addRow(feederData)
      styleFeederRow(fRow)

      for (const item of items) {
        const tests = TEST_TEMPLATES[item.type] || [['L3', `${item.type} Test`, '']]
        const eqName = item.name || item.type
        let isFirst = true

        for (const testEntry of tests) {
          const level = testEntry[0] || 'L3'
          const testName = testEntry[1] || ''
          const testSheet = testEntry[2] || ''

          const rowData = Array(16).fill('')
          if (isFirst) {
            rowData[1] = eqName
            isFirst = false
          }
          rowData[2] = level
          rowData[3] = testName
          rowData[14] = 'Open'
          rowData[15] = testSheet

          const testRow = ws.addRow(rowData)
          styleTestRow(testRow, level)

          if (rowData[1]) {
            testRow.getCell(2).font = { name: 'Calibri', bold: true, size: 9, color: { argb: '1E293B' } }
          }
        }
      }

      ws.addRow([])
    }
  }

  // Download
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
