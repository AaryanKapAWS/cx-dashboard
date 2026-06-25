import { useState } from 'react'

const SECTIONS = [
  {
    id: 'overview',
    title: 'How Procore Inspections Work',
    content: `
**One inspection = one piece of equipment** (not one per test).

The inspection template is a pre-built tracking envelope with ~19 checklist items inside:

• **Revision Number** — Version tracking
• **L3-SAT (Site Acceptance Test)** — Planned start/end, actual start/end, attach test scripts, SAT complete ✓
• **L4-FPT (Functional Performance Test)** — Same pattern as L3
• **CxA Review** — L3 witnessed, L3 docs reviewed, L4 witnessed, L4 docs reviewed, observations closed, CxA closes inspection

The individual tests (IR, timing, ratio check, primary injection etc.) live in the test scripts (PDFs) that get **attached** to the inspection. The Procore inspection just tracks: did L3 happen? Did L4 happen? Did CxA sign off?
    `
  },
  {
    id: 'flow',
    title: 'Bulk Upload Flow',
    content: `
**The Pipeline:**

\`\`\`
1. Template exists at Procore Company level (e.g. "CxHV-Circuit Breaker")
       ↓
2. Import template onto your Project (Admin → Inspections → Import Company Templates)
       ↓
3. Generate Upload File (one row per equipment item)
       ↓
4. Upload via Procore Correspondence tool → bulk creates inspections
       ↓
5. Engineer opens inspection on-site → ticks off items → attaches test scripts
       ↓
6. CxA reviews and closes
\`\`\`

**Upload File Format (Key Columns):**

| Column | Description | Required |
|--------|-------------|----------|
| Inspection Type | "Commissioning" or "Quality" | ✅ |
| Inspection Template Name | e.g. "CxHV-Circuit Breaker" | ✅ |
| Status | "Open" | ✅ |
| Trade | "Electrical" / "Mechanical" | Optional |
| Location | Project code (e.g. "DUB069HV") | ✅ |
| Description | {AssetTag}-{TemplateName}-{FBN} | ✅ |
| Asset Tag Plate ID | Equipment tag from drawings | ✅ |
| FBN Build ID(s) | e.g. "DUB069XFHMV41.001" | Optional |
| Cx Region | e.g. "EMEA" | ✅ (Cx only) |
    `
  },
  {
    id: 'gap',
    title: 'The Gap — DC vs HV',
    content: `
**DC (Room Construction) — Fully Automated:**
• SOP Rev06 documented
• Generator V6.33 with Ref sheets (OPTDC, Tetris)
• ~70 equipment types mapped to templates
• Example: DUB069 Room Construction → 1.3M inspection items

**HV (Substations) — NOT automated:**
• No SOP for HV
• No Ref-HV sheet in Generator
• No template mapping exists
• Example: DUB069HV → 5 Safety inspections only (zero Cx/QC)

**Evidence from Procore BI:**
• DUB058HV (pilot) has CxHV inspections but 4,888 used "CxHV-Blank" (catch-all = gap)
• The pilot was abandoned — templates exist but no automation pipeline
    `
  },
  {
    id: 'templates',
    title: 'CxHV / QCHV Templates (18 Cx + 16 QC)',
    content: `
**Commissioning Templates (from Procore company level):**

| Template | Items | Usage Count |
|----------|-------|-------------|
| CxHV-Relay Panels | 19 | 88,047 |
| CxHV-Disconnector & Earth Switch | — | 78,983 |
| CxHV-Circuit Breaker | 19 | 50,330 |
| CxHV-Voltage Transformer | 19 | 32,164 |
| CxHV-Blank (catch-all) | — | 21,242 |
| CxHV-Power Transformer | 19 | 15,764 |
| CxHV-Lightning Arrester | — | 15,418 |
| CxHV-Gas Insulated Switchgear (GIS) | — | 11,505 |
| CxHV-Neutral Earthing Transformer/Resistor | 13 | 9,670 |
| CxHV-HV & MV Cable | 13 | 8,815 |
| CxHV-Battery & Charger | — | 8,649 |
| CxHV-Auxiliary Transformer | — | 8,054 |
| CxHV-AIS Main Busbar | 19 | 6,898 |
| CxHV-Grounding System | — | 4,621 |
| CxHV-Air Insulated Switchgear (AIS) | — | 4,228 |
| CxHV-Current Transformer | 19 | 3,696 |
| CxHV-HV Substation | 22 | 2,473 |
| CxHV-Post Insulator | — | 349 |

**Quality Templates (QCHV):** All equivalents exist except:
• No QCHV-Air Insulated Switchgear (AIS)
• No QCHV-HV Substation

**DC Templates also reused on HV projects:**
Cx-MV Switchgear, Cx-MV Cable, Cx-Controls-EPMS, Cx-SCCS, Cx-Panelboard, Cx-Battery System, Cx-LV Switchgear, Cx-UPS, Cx-ATS/ATSC
    `
  },
  {
    id: 'mapping',
    title: 'Equipment → Template Mapping (Ref-HV)',
    content: `
**This is the equivalent of the "Ref" sheet in the DC Generator, but for substation equipment:**

| Equipment Type (SLD) | Cx Template | QC Template | Match Keys |
|---|---|---|---|
| Voltage Transformer (VT) | CxHV-Voltage Transformer | QCHV-Voltage Transformer | VT, PT, CVT |
| Current Transformer (CT) | CxHV-Current Transformer | QCHV-Current Transformer | CT, CBCT, NCT |
| Circuit Breaker (CB) | CxHV-Circuit Breaker | QCHV-Circuit Breaker | CB, Breaker |
| Power Transformer | CxHV-Power Transformer | QCHV-Power Transformer | Transformer, T123, T224 |
| Auxiliary Transformer | CxHV-Auxiliary Transformer | QCHV-Auxiliary Transformer | Aux Transformer |
| AIS Main Busbar | CxHV-AIS Main Busbar | QCHV-AIS Main Busbar | Busbar, Main Bus |
| Air Insulated Switchgear | CxHV-Air Insulated Switchgear (AIS) | — | AIS |
| Gas Insulated Switchgear | CxHV-Gas Insulated Switchgear (GIS) | QCHV-GIS | GIS |
| Relay / Protection Panel | CxHV-Relay Panels | QCHV-Relay Panels | Relay, C&P Panel |
| HV/MV Cable | CxHV-HV & MV Cable | QCHV-HV & MV Cable | HV Cable, MV Cable |
| Disconnector / Earth Switch | CxHV-Disconnector & Earth Switch | QCHV-Disconnector & Earth Switch | Disconnector, Isolator |
| NER/NET | CxHV-Neutral Earthing Transformer/Resistor | QCHV-NER | NER, NET, Neutral Earthing |
| Lightning/Surge Arrester | CxHV-Lightning Arrester | QCHV-Lightning Arrester | Surge Arrester, LA |
| Post Insulator | CxHV-Post Insulator | QCHV-Post Insulator | Insulator |
| Grounding System | CxHV-Grounding System | QCHV-Grounding System | Grounding, Earthing |
| Battery & Charger | CxHV-Battery & Charger | QCHV-Battery & Charger | Battery, DC Supply |
| HV Substation (System) | CxHV-HV Substation | — | Substation, Energisation |

**Catch-alls:** CxHV-Blank / QCHV-Blank for unmatched equipment.
    `
  },
  {
    id: 'example',
    title: 'Example: DUB069HV 4th Transformer Upload',
    content: `
**Based on the DUB069 4th Transformer Commissioning Programme, the upload file would contain:**

| # | Template | Asset Tag | Description |
|---|---|---|---|
| 1 | CxHV-HV Substation | 110/21kV-Sub | 110/21kV-Sub-CxHV-HV Substation-DUB069XF... |
| 2 | CxHV-AIS Main Busbar | Busbar-H7 | Busbar-H7-CxHV-AIS Main Busbar-DUB069XF... |
| 3 | CxHV-Current Transformer | CT-01A | CT-01A-CxHV-Current Transformer-DUB069XF... |
| 4 | CxHV-Current Transformer | CT-02A | CT-02A-CxHV-Current Transformer-DUB069XF... |
| 5 | CxHV-Voltage Transformer | VT-01A | VT-01A-CxHV-Voltage Transformer-DUB069XF... |
| 6 | CxHV-Circuit Breaker | CB-01A | CB-01A-CxHV-Circuit Breaker-DUB069XF... |
| 7 | CxHV-Relay Panels | Relay-T123 | Relay-T123-CxHV-Relay Panels-DUB069XF... |
| 8 | CxHV-Power Transformer | T123 | T123-CxHV-Power Transformer-DUB069XF... |
| 9 | CxHV-Neutral Earthing Transformer/Resistor | NER | NER-CxHV-NER-DUB069XF... |
| 10 | CxHV-HV & MV Cable | MV-Cable | MV-Cable-CxHV-HV & MV Cable-DUB069XF... |
| 11 | CxHV-Lightning Arrester | SA-H7-FA1 | SA-H7-FA1-CxHV-Lightning Arrester-DUB069XF... |
| 12 | CxHV-Lightning Arrester | SA-H7-FA2 | SA-H7-FA2-CxHV-Lightning Arrester-DUB069XF... |
| 13 | Cx-MV Switchgear | MV-SUB3 | MV-SUB3-Cx-MV Switchgear-DUB069XF... |
| 14 | Cx-Controls-EPMS | EPMS | EPMS-Cx-Controls-EPMS-DUB069XF... |
| 15 | CxHV-Grounding System | Earth-H7 | Earth-H7-CxHV-Grounding System-DUB069XF... |

Plus matching QC rows (QCHV equivalents) for each.
    `
  },
  {
    id: 'questions',
    title: 'Open Questions (Martin Boyle)',
    content: `
**Templates:**
1. Are all 18 CxHV templates current and approved?
2. Is CxHV-Blank a valid catch-all or a gap indicator? (21k+ uses)
3. Any new templates in development?

**Naming & Structure:**
4. Asset tag naming convention for HV? (DC uses "ATS1.1A", HV uses feeder refs?)
5. FBN format for substations? (DC is "PDX083ROMP01.001")
6. Location structure? (DC uses building code "AWS101")

**Process:**
7. Was DUB058HV pilot abandoned or are lessons applicable?
8. Who maintains CxHV templates at company level?
9. Ancillary equipment — DC templates or HV-specific?

**Status:** Meeting requested for Thu/Fri this week.
    `
  },
  {
    id: 'architecture',
    title: 'Solution Architecture',
    content: `
**Target Pipeline:**

\`\`\`
SLD (PDF) → Equipment Parser → Template Mapper (Ref-HV) → Upload File Generator → Procore (Bulk Create)
\`\`\`

**Implementation Options:**

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A | Add Ref-HV to existing V6.33 Generator | Team-wide, single tool | Needs buy-in, Excel-based |
| B | Build HV generator in cx-dashboard | Full automation, integrated | Parallel system |
| C | Both A + B | Best of both | More work upfront |

**Recommended: Option C** — Update Generator for manual/fallback + build automated pipeline in cx-dashboard.

**Pre-requisites Checklist:**
- [ ] Confirm CxHV/QCHV template list with Martin
- [ ] Confirm asset tag naming convention
- [ ] Confirm FBN format for substations
- [ ] Import templates onto target project
- [ ] Verify FBNs in project Admin
- [ ] Verify Location setup
- [ ] Generate upload file
- [ ] Validate against commissioning programme
- [ ] Upload via Correspondence tool
    `
  }
]

export default function DocsReference() {
  const [activeSection, setActiveSection] = useState('overview')

  const active = SECTIONS.find(s => s.id === activeSection)

  return (
    <>
      {/* Header */}
      <div style={{
        padding: '24px 32px 16px', background: '#1e293b',
        borderBottom: '1px solid #334155'
      }}>
        <h1 style={{ margin: 0, color: '#fff', fontSize: 20, fontWeight: 700 }}>
          📖 Documentation & Reference
        </h1>
        <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: 13 }}>
          Bulk Inspections Upload to Procore — HV Substations
        </p>
      </div>

      {/* Layout: sidebar + content */}
      <div style={{ display: 'flex', margin: '20px 32px', gap: 20, minHeight: '60vh' }}>
        
        {/* Sidebar Nav */}
        <div style={{
          width: 240, flexShrink: 0,
          background: '#fff', borderRadius: 8,
          border: '1px solid #e2e8f0', padding: '12px 0',
          height: 'fit-content', position: 'sticky', top: 60
        }}>
          <div style={{ padding: '0 16px 8px', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Sections
          </div>
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '8px 16px', border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: activeSection === s.id ? 700 : 500,
                color: activeSection === s.id ? '#FF9900' : '#475569',
                background: activeSection === s.id ? '#fffbeb' : 'transparent',
                borderLeft: activeSection === s.id ? '3px solid #FF9900' : '3px solid transparent',
                transition: 'all 0.15s'
              }}
            >
              {s.title}
            </button>
          ))}

          {/* Status badge */}
          <div style={{
            margin: '16px 16px 8px', padding: '10px 12px',
            background: '#fef3c7', borderRadius: 6, border: '1px solid #fcd34d'
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#92400e' }}>STATUS</div>
            <div style={{ fontSize: 11, color: '#78350f', marginTop: 2 }}>
              ⚠️ DRAFT — Pending confirmation from Martin Boyle
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{
          flex: 1, background: '#fff', borderRadius: 8,
          border: '1px solid #e2e8f0', padding: '24px 32px'
        }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700, color: '#1e293b' }}>
            {active?.title}
          </h2>
          <div style={{
            fontSize: 13, lineHeight: 1.7, color: '#374151',
            whiteSpace: 'pre-wrap'
          }}>
            {active?.content?.trim().split('\n').map((line, i) => {
              // Basic markdown-like rendering
              if (line.startsWith('**') && line.endsWith('**')) {
                return <div key={i} style={{ fontWeight: 700, marginTop: 12, marginBottom: 4 }}>{line.replace(/\*\*/g, '')}</div>
              }
              if (line.startsWith('• ')) {
                return <div key={i} style={{ paddingLeft: 16 }}>{line}</div>
              }
              if (line.startsWith('| ') && i > 0) {
                // Table row
                const cells = line.split('|').filter(c => c.trim())
                const isHeader = line.includes('---')
                if (isHeader) return null
                return (
                  <div key={i} style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${cells.length}, 1fr)`,
                    borderBottom: '1px solid #f1f5f9',
                    padding: '4px 0',
                    fontSize: 11,
                    fontWeight: i <= 1 ? 700 : 400,
                    background: i <= 1 ? '#f8fafc' : 'transparent'
                  }}>
                    {cells.map((cell, j) => (
                      <span key={j} style={{ padding: '2px 6px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {cell.trim()}
                      </span>
                    ))}
                  </div>
                )
              }
              if (line.startsWith('```')) {
                return null // Skip code fence markers
              }
              if (line.startsWith('- [ ]')) {
                return <div key={i} style={{ paddingLeft: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="checkbox" disabled style={{ margin: 0 }} />
                  <span>{line.replace('- [ ] ', '')}</span>
                </div>
              }
              return <div key={i}>{line || <br />}</div>
            })}
          </div>
        </div>
      </div>
    </>
  )
}
