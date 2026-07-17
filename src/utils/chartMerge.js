import JSZip from 'jszip'

// ─── COLOUR PALETTE ───
const COLOURS = {
  navy: '232F3E',
  orange: 'FF9900',
  green: '27AE60',
  grey: 'D5D8DC',
  darkGrey: '666666',
  lightGrey: 'F2F2F2',
  white: 'FFFFFF',
  steelBlue: '2E86AB',
}

/**
 * Extract a numeric cell value from OOXML sheet XML.
 */
function extractCellValue(sheetXml, cellRef) {
  const regex = new RegExp(`<c r="${cellRef}"[^>]*>(?:<[^v][^>]*>)*<v>([^<]+)</v>`)
  const match = sheetXml.match(regex)
  return match ? parseFloat(match[1]) : null
}

/**
 * Parse the shared strings table from the workbook ZIP.
 * Returns an array where index = shared string index, value = string text.
 */
async function loadSharedStrings(zip) {
  const ssXml = await zip.file('xl/sharedStrings.xml')?.async('string')
  if (!ssXml) return []
  const strings = []
  // Split by <si> elements and extract all <t> text within each
  const siBlocks = ssXml.split('<si>')
  for (let i = 1; i < siBlocks.length; i++) {
    const block = siBlocks[i].split('</si>')[0]
    let text = ''
    const tMatches = block.matchAll(/<t[^>]*>([^<]*)<\/t>/g)
    for (const m of tMatches) {
      text += m[1]
    }
    strings.push(text)
  }
  return strings
}

/**
 * Build a Gantt chart XML for a specific section.
 * Professional styling: navy title, clean date axis, orange bars, subtle gridlines.
 */
function buildGanttChartXml(sectionName, startRow, endRow, axisMin, axisMax, itemCount) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <c:chart>
    <c:title>
      <c:tx><c:rich>
        <a:bodyPr/>
        <a:lstStyle/>
        <a:p>
          <a:pPr><a:defRPr sz="1200" b="1"><a:solidFill><a:srgbClr val="${COLOURS.navy}"/></a:solidFill><a:latin typeface="Calibri"/></a:defRPr></a:pPr>
          <a:r><a:rPr lang="en-US" sz="1200" b="1"><a:solidFill><a:srgbClr val="${COLOURS.navy}"/></a:solidFill><a:latin typeface="Calibri"/></a:rPr><a:t>${sectionName}  (${itemCount} items)</a:t></a:r>
        </a:p>
      </c:rich></c:tx>
      <c:overlay val="0"/>
    </c:title>
    <c:autoTitleDeleted val="0"/>
    <c:plotArea>
      <c:layout/>
      <c:barChart>
        <c:barDir val="bar"/>
        <c:grouping val="stacked"/>
        <c:varyColors val="0"/>
        <c:ser>
          <c:idx val="0"/><c:order val="0"/>
          <c:tx><c:strRef><c:f>'_ChartData'!$B$${startRow - 1}</c:f></c:strRef></c:tx>
          <c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>
          <c:cat><c:strRef><c:f>'_ChartData'!$A$${startRow}:$A$${endRow}</c:f></c:strRef></c:cat>
          <c:val><c:numRef><c:f>'_ChartData'!$B$${startRow}:$B$${endRow}</c:f></c:numRef></c:val>
        </c:ser>
        
        <c:ser>
          <c:idx val="1"/><c:order val="1"/>
          <c:tx><c:strRef><c:f>'_ChartData'!$C$${startRow - 1}</c:f></c:strRef></c:tx>
          <c:spPr>
            <a:solidFill><a:srgbClr val="${COLOURS.orange}"/></a:solidFill>
            <a:ln w="0"><a:noFill/></a:ln>
          </c:spPr>
          <c:cat><c:strRef><c:f>'_ChartData'!$A$${startRow}:$A$${endRow}</c:f></c:strRef></c:cat>
          <c:val><c:numRef><c:f>'_ChartData'!$C$${startRow}:$C$${endRow}</c:f></c:numRef></c:val>
        </c:ser>
        <c:gapWidth val="50"/>
        <c:overlap val="100"/>
        <c:axId val="10"/><c:axId val="100"/>
      </c:barChart>
      <c:catAx>
        <c:axId val="10"/>
        <c:scaling><c:orientation val="maxMin"/></c:scaling>
        <c:delete val="0"/>
        <c:axPos val="l"/>
        <c:majorTickMark val="none"/>
        <c:minorTickMark val="none"/>
        <c:tickLblPos val="nextTo"/>
        <c:spPr><a:ln w="6350"><a:solidFill><a:srgbClr val="${COLOURS.grey}"/></a:solidFill></a:ln></c:spPr>
        <c:crossAx val="100"/>
        <c:auto val="1"/>
        <c:lblOffset val="100"/>
        <c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="900"><a:solidFill><a:srgbClr val="${COLOURS.darkGrey}"/></a:solidFill><a:latin typeface="Calibri"/></a:defRPr></a:pPr><a:endParaRPr/></a:p></c:txPr>
      </c:catAx>
      <c:valAx>
        <c:axId val="100"/>
        <c:scaling>
          <c:orientation val="minMax"/>
          <c:max val="${axisMax}"/>
          <c:min val="${axisMin}"/>
        </c:scaling>
        <c:delete val="0"/>
        <c:axPos val="b"/>
        <c:majorGridlines>
          <c:spPr><a:ln w="3175"><a:solidFill><a:srgbClr val="E8E8E8"/></a:solidFill><a:prstDash val="dash"/></a:ln></c:spPr>
        </c:majorGridlines>
        <c:numFmt formatCode="DD-MMM" sourceLinked="0"/>
        <c:majorTickMark val="out"/>
        <c:minorTickMark val="none"/>
        <c:tickLblPos val="nextTo"/>
        <c:spPr><a:ln w="6350"><a:solidFill><a:srgbClr val="${COLOURS.grey}"/></a:solidFill></a:ln></c:spPr>
        <c:crossAx val="10"/>
        <c:crosses val="autoZero"/>
        <c:crossBetween val="between"/>
        <c:majorUnit val="7"/>
        <c:txPr><a:bodyPr rot="-2700000"/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="800"><a:solidFill><a:srgbClr val="${COLOURS.darkGrey}"/></a:solidFill><a:latin typeface="Calibri"/></a:defRPr></a:pPr><a:endParaRPr/></a:p></c:txPr>
      </c:valAx>
      <c:spPr>
        <a:solidFill><a:srgbClr val="${COLOURS.white}"/></a:solidFill>
        <a:ln w="6350"><a:solidFill><a:srgbClr val="E0E0E0"/></a:solidFill></a:ln>
      </c:spPr>
    </c:plotArea>
    <c:plotVisOnly val="1"/>
    <c:dispBlanksAs val="gap"/>
  </c:chart>
  <c:spPr>
    <a:solidFill><a:srgbClr val="${COLOURS.white}"/></a:solidFill>
    <a:ln w="9525"><a:solidFill><a:srgbClr val="D0D0D0"/></a:solidFill></a:ln>
    <a:effectLst/>
  </c:spPr>
</c:chartSpace>`
}

/**
 * Build the Progress chart XML (stacked horizontal bar).
 * Professional: green/orange/grey, navy title, clean axis.
 */
function buildProgressChartXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <c:chart>
    <c:title>
      <c:tx><c:rich>
        <a:bodyPr/>
        <a:lstStyle/>
        <a:p>
          <a:pPr><a:defRPr sz="1300" b="1"><a:solidFill><a:srgbClr val="${COLOURS.navy}"/></a:solidFill><a:latin typeface="Calibri"/></a:defRPr></a:pPr>
          <a:r><a:rPr lang="en-US" sz="1300" b="1"><a:solidFill><a:srgbClr val="${COLOURS.navy}"/></a:solidFill><a:latin typeface="Calibri"/></a:rPr><a:t>Commissioning Progress by Section</a:t></a:r>
        </a:p>
      </c:rich></c:tx>
      <c:overlay val="0"/>
    </c:title>
    <c:autoTitleDeleted val="0"/>
    <c:plotArea>
      <c:layout/>
      <c:barChart>
        <c:barDir val="bar"/>
        <c:grouping val="stacked"/>
        <c:varyColors val="0"/>
        <c:ser>
          <c:idx val="0"/><c:order val="0"/>
          <c:tx><c:strRef><c:f>'_ChartData'!$B$2</c:f></c:strRef></c:tx>
          <c:spPr><a:solidFill><a:srgbClr val="${COLOURS.green}"/></a:solidFill><a:ln w="0"><a:noFill/></a:ln></c:spPr>
          <c:cat><c:strRef><c:f>'_ChartData'!$A$3:$A$10</c:f></c:strRef></c:cat>
          <c:val><c:numRef><c:f>'_ChartData'!$B$3:$B$10</c:f></c:numRef></c:val>
        </c:ser>
        <c:ser>
          <c:idx val="1"/><c:order val="1"/>
          <c:tx><c:strRef><c:f>'_ChartData'!$C$2</c:f></c:strRef></c:tx>
          <c:spPr><a:solidFill><a:srgbClr val="${COLOURS.orange}"/></a:solidFill><a:ln w="0"><a:noFill/></a:ln></c:spPr>
          <c:cat><c:strRef><c:f>'_ChartData'!$A$3:$A$10</c:f></c:strRef></c:cat>
          <c:val><c:numRef><c:f>'_ChartData'!$C$3:$C$10</c:f></c:numRef></c:val>
        </c:ser>
        <c:ser>
          <c:idx val="2"/><c:order val="2"/>
          <c:tx><c:strRef><c:f>'_ChartData'!$D$2</c:f></c:strRef></c:tx>
          <c:spPr><a:solidFill><a:srgbClr val="${COLOURS.grey}"/></a:solidFill><a:ln w="0"><a:noFill/></a:ln></c:spPr>
          <c:cat><c:strRef><c:f>'_ChartData'!$A$3:$A$10</c:f></c:strRef></c:cat>
          <c:val><c:numRef><c:f>'_ChartData'!$D$3:$D$10</c:f></c:numRef></c:val>
        </c:ser>
        <c:gapWidth val="80"/>
        <c:axId val="10"/><c:axId val="100"/>
      </c:barChart>
      <c:catAx>
        <c:axId val="10"/>
        <c:scaling><c:orientation val="maxMin"/></c:scaling>
        <c:delete val="0"/>
        <c:axPos val="l"/>
        <c:majorTickMark val="none"/>
        <c:minorTickMark val="none"/>
        <c:tickLblPos val="nextTo"/>
        <c:spPr><a:ln w="6350"><a:solidFill><a:srgbClr val="${COLOURS.grey}"/></a:solidFill></a:ln></c:spPr>
        <c:crossAx val="100"/>
        <c:auto val="1"/>
        <c:lblOffset val="100"/>
        <c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="950"><a:solidFill><a:srgbClr val="${COLOURS.darkGrey}"/></a:solidFill><a:latin typeface="Calibri"/></a:defRPr></a:pPr><a:endParaRPr/></a:p></c:txPr>
      </c:catAx>
      <c:valAx>
        <c:axId val="100"/>
        <c:scaling><c:orientation val="minMax"/></c:scaling>
        <c:delete val="0"/>
        <c:axPos val="b"/>
        <c:majorGridlines>
          <c:spPr><a:ln w="3175"><a:solidFill><a:srgbClr val="E8E8E8"/></a:solidFill><a:prstDash val="dash"/></a:ln></c:spPr>
        </c:majorGridlines>
        <c:title>
          <c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="900"><a:solidFill><a:srgbClr val="${COLOURS.darkGrey}"/></a:solidFill><a:latin typeface="Calibri"/></a:defRPr></a:pPr><a:r><a:rPr lang="en-US" sz="900"/><a:t>Number of Tests</a:t></a:r></a:p></c:rich></c:tx>
          <c:overlay val="0"/>
        </c:title>
        <c:numFmt formatCode="General" sourceLinked="1"/>
        <c:majorTickMark val="out"/>
        <c:minorTickMark val="none"/>
        <c:tickLblPos val="nextTo"/>
        <c:spPr><a:ln w="6350"><a:solidFill><a:srgbClr val="${COLOURS.grey}"/></a:solidFill></a:ln></c:spPr>
        <c:crossAx val="10"/>
        <c:crosses val="autoZero"/>
        <c:crossBetween val="between"/>
        <c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="850"><a:solidFill><a:srgbClr val="${COLOURS.darkGrey}"/></a:solidFill><a:latin typeface="Calibri"/></a:defRPr></a:pPr><a:endParaRPr/></a:p></c:txPr>
      </c:valAx>
      <c:spPr>
        <a:solidFill><a:srgbClr val="${COLOURS.white}"/></a:solidFill>
        <a:ln w="6350"><a:solidFill><a:srgbClr val="E0E0E0"/></a:solidFill></a:ln>
      </c:spPr>
    </c:plotArea>
    <c:legend>
      <c:legendPos val="b"/>
      <c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="900"><a:solidFill><a:srgbClr val="${COLOURS.darkGrey}"/></a:solidFill><a:latin typeface="Calibri"/></a:defRPr></a:pPr><a:endParaRPr/></a:p></c:txPr>
    </c:legend>
    <c:plotVisOnly val="1"/>
    <c:dispBlanksAs val="gap"/>
  </c:chart>
  <c:spPr>
    <a:solidFill><a:srgbClr val="${COLOURS.white}"/></a:solidFill>
    <a:ln w="9525"><a:solidFill><a:srgbClr val="D0D0D0"/></a:solidFill></a:ln>
    <a:effectLst/>
  </c:spPr>
</c:chartSpace>`
}

/**
 * Build drawing XML with multiple charts — tall, full-width.
 * Progress chart: rows 2-22 (20 rows tall)
 * Each Gantt: proportional to item count, minimum 20 rows, ~2 rows per item
 */
function buildDrawingXml(numCharts, sectionItemCounts) {
  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">`

  // Chart 1: Progress (rows 2-22, cols 0-15 — nice and wide)
  xml += `
  <xdr:twoCellAnchor>
    <xdr:from><xdr:col>0</xdr:col><xdr:colOff>76200</xdr:colOff><xdr:row>2</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>
    <xdr:to><xdr:col>15</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>22</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>
    <xdr:graphicFrame>
      <xdr:nvGraphicFramePr><xdr:cNvPr id="2" name="Progress Chart"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr>
      <xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>
      <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">
        <c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" r:id="rId1"/>
      </a:graphicData></a:graphic>
    </xdr:graphicFrame>
    <xdr:clientData/>
  </xdr:twoCellAnchor>`

  // Per-section Gantt charts — stacked vertically with gaps
  let currentRow = 25  // Start after Progress chart + 3 row gap
  for (let i = 0; i < sectionItemCounts.length; i++) {
    // Height: 2 rows per item, minimum 20, maximum 50
    const chartHeight = Math.min(50, Math.max(20, Math.ceil(sectionItemCounts[i] * 2.2) + 4))
    const endRow = currentRow + chartHeight
    const rIdNum = i + 2

    xml += `
  <xdr:twoCellAnchor>
    <xdr:from><xdr:col>0</xdr:col><xdr:colOff>76200</xdr:colOff><xdr:row>${currentRow}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>
    <xdr:to><xdr:col>15</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${endRow}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>
    <xdr:graphicFrame>
      <xdr:nvGraphicFramePr><xdr:cNvPr id="${i + 3}" name="Gantt ${i + 1}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr>
      <xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>
      <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">
        <c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" r:id="rId${rIdNum}"/>
      </a:graphicData></a:graphic>
    </xdr:graphicFrame>
    <xdr:clientData/>
  </xdr:twoCellAnchor>`

    currentRow = endRow + 3  // 3-row gap between charts
  }

  xml += `
</xdr:wsDr>`
  return xml
}

/**
 * Build drawing rels for N charts.
 */
function buildDrawingRels(numCharts) {
  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
  for (let i = 1; i <= numCharts; i++) {
    xml += `
  <Relationship Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="/xl/charts/chart${i}.xml" Id="rId${i}"/>`
  }
  xml += `
</Relationships>`
  return xml
}

/**
 * Merges dynamically-generated chart XML into the COR workbook.
 * Creates one Progress chart + one Gantt per section on the "Cx Charts" sheet.
 * All charts styled with consistent navy/orange/grey palette.
 */
export async function mergeChartsIntoWorkbook(corBuffer) {
  const corZip = await JSZip.loadAsync(corBuffer)
  
  // ─── 1. Read _ChartData to get section metadata ───
  const workbookXml = await corZip.file('xl/workbook.xml')?.async('string')
  const wbRels = await corZip.file('xl/_rels/workbook.xml.rels')?.async('string')
  
  const chartDataMatch = workbookXml.match(/<sheet[^>]*name="_ChartData"[^>]*r:id="(rId\d+)"/)
  if (!chartDataMatch) {
    console.warn('_ChartData sheet not found')
    return corBuffer
  }
  
  const cdRId = chartDataMatch[1]
  const cdRelRegex = new RegExp(`Id="${cdRId}"[^>]*Target="([^"]+)"|Target="([^"]+)"[^>]*Id="${cdRId}"`)
  const cdTarget = wbRels.match(cdRelRegex)
  if (!cdTarget) return corBuffer
  
  const cdPath = (cdTarget[1] || cdTarget[2]).startsWith('/') 
    ? (cdTarget[1] || cdTarget[2]).slice(1) 
    : 'xl/' + (cdTarget[1] || cdTarget[2])
  const cdXml = await corZip.file(cdPath)?.async('string')
  if (!cdXml) return corBuffer

  // Load shared strings table for resolving string cell values
  const sharedStrings = await loadSharedStrings(corZip)

  // Read number of sections from B199
  const numSections = extractCellValue(cdXml, 'B199') || 0
  if (numSections === 0) {
    console.warn('No section data found in _ChartData')
    return corBuffer
  }
  
  // Read section ranges from rows 200+
  const sections = []
  for (let i = 0; i < numSections; i++) {
    const row = 200 + i
    const startRow = extractCellValue(cdXml, `B${row}`)
    const endRow = extractCellValue(cdXml, `C${row}`)
    const axisMin = extractCellValue(cdXml, `D${row}`)
    const axisMax = extractCellValue(cdXml, `E${row}`)
    const itemCount = extractCellValue(cdXml, `F${row}`)
    
    // Get section name — resolve shared string index if needed
    const nameRegex = new RegExp(`<c r="A${row}"[^>]*(?:t="inlineStr"[^>]*><is><t>([^<]+)</t>|t="s"[^>]*><v>(\\d+)</v>|><v>([^<]+)</v>)`)
    const nameMatch = cdXml.match(nameRegex)
    let name = `Section ${i + 1}`
    if (nameMatch) {
      if (nameMatch[1]) {
        name = nameMatch[1]  // inline string
      } else if (nameMatch[2] && sharedStrings[parseInt(nameMatch[2])]) {
        name = sharedStrings[parseInt(nameMatch[2])]  // shared string lookup
      } else if (nameMatch[3]) {
        name = nameMatch[3]  // plain value
      }
    }
    
    if (startRow && endRow) {
      sections.push({ name, startRow, endRow, axisMin: axisMin || 46220, axisMax: axisMax || 46280, itemCount: itemCount || 10 })
    }
  }
  
  if (sections.length === 0) {
    console.warn('Could not parse section ranges')
    return corBuffer
  }

  // ─── 2. Generate chart XML files ───
  const totalCharts = 1 + sections.length
  
  // Chart 1: Progress
  corZip.file('xl/charts/chart1.xml', buildProgressChartXml())
  
  // Charts 2+: Per-section Gantts
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i]
    const chartXml = buildGanttChartXml(s.name, s.startRow, s.endRow, s.axisMin, s.axisMax, s.itemCount)
    corZip.file(`xl/charts/chart${i + 2}.xml`, chartXml)
  }

  // ─── 3. Create drawing2.xml ───
  const sectionItemCounts = sections.map(s => s.itemCount)
  corZip.file('xl/drawings/drawing2.xml', buildDrawingXml(totalCharts, sectionItemCounts))
  corZip.file('xl/drawings/_rels/drawing2.xml.rels', buildDrawingRels(totalCharts))

  // ─── 4. Attach drawing2 to "Cx Charts" sheet ───
  let sheetMatch = workbookXml.match(/<sheet[^>]*name="Cx Charts"[^>]*r:id="(rId\d+)"/)
  if (!sheetMatch) {
    sheetMatch = workbookXml.match(/<sheet[^>]*name="Cx Programme"[^>]*r:id="(rId\d+)"/)
  }
  if (!sheetMatch) {
    console.warn('Chart target sheet not found')
    return corBuffer
  }
  
  const rId = sheetMatch[1]
  const relRegex = new RegExp(`Id="${rId}"[^>]*Target="([^"]+)"|Target="([^"]+)"[^>]*Id="${rId}"`)
  const targetMatch = wbRels.match(relRegex)
  if (!targetMatch) return corBuffer
  
  const rawTarget = targetMatch[1] || targetMatch[2]
  const sheetFile = rawTarget.startsWith('/') ? rawTarget.slice(1) : 'xl/' + rawTarget

  const sheetRelsPath = sheetFile.replace('worksheets/', 'worksheets/_rels/').replace('.xml', '.xml.rels')
  let sheetRels = await corZip.file(sheetRelsPath)?.async('string')
  
  const drawingRel = '<Relationship Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="/xl/drawings/drawing2.xml" Id="rId99"/>'
  if (sheetRels) {
    sheetRels = sheetRels.replace('</Relationships>', drawingRel + '</Relationships>')
  } else {
    sheetRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${drawingRel}
</Relationships>`
  }
  corZip.file(sheetRelsPath, sheetRels)

  let sheetXml = await corZip.file(sheetFile)?.async('string')
  if (sheetXml && !sheetXml.includes('<drawing')) {
    sheetXml = sheetXml.replace('</worksheet>', '<drawing r:id="rId99"/></worksheet>')
    corZip.file(sheetFile, sheetXml)
  }

  // ─── 5. Patch [Content_Types].xml ───
  let contentTypes = await corZip.file('[Content_Types].xml')?.async('string')
  let newTypes = '<Override PartName="/xl/drawings/drawing2.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>'
  for (let i = 1; i <= totalCharts; i++) {
    newTypes += `<Override PartName="/xl/charts/chart${i}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`
  }
  contentTypes = contentTypes.replace('</Types>', newTypes + '</Types>')
  corZip.file('[Content_Types].xml', contentTypes)

  // ─── 6. Generate final buffer ───
  return await corZip.generateAsync({ 
    type: 'arraybuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  })
}
