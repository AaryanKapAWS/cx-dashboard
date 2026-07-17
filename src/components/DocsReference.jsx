import { useState } from 'react'

const SECTIONS = [
  {
    id: 'overview',
    title: 'What This Tool Does',
    content: `
**The HV Substation Commissioning Tool automates COR (Commissioning Outstanding Register) generation.**

You define your scope → the tool generates a complete, formatted Excel COR in one click.

**Core Workflow:**

1. **Add Sections** — Transformer Bay, Switchgear, Panel Board, Cables, etc.
2. **Configure Equipment** — Select feeder types, tick/untick equipment per feeder
3. **Customise Tests** — Click any item to expand and enable/disable individual tests
4. **Generate COR** — Downloads a formatted .xlsx with all sheets, formulas, and a live Gantt

**What the COR Contains:**

| Sheet | Purpose |
|-------|---------|
| Project Overview | Project info, team, key documents, scope summary |
| Cx Programme | Progress tracking, documentation status, commissioning schedule |
| Cx Charts | Live cell-based Gantt (auto-updates when you edit dates) |
| [Per-section sheets] | Full 20-column test register per feeder/equipment group |
| Certificate of Readiness | Formal sign-off page |
| Revision History | Version tracking |

**Secondary Goal:** Generate the Procore inspection upload file from the same equipment scope (in development).
    `
  },
  {
    id: 'sections',
    title: 'Section Types & Equipment',
    content: `
**Available Section Types:**

| Section | Equipment Included | Use For |
|---------|-------------------|---------|
| Transformer Bay | Power Transformer, CTs, VTs, Surge Arrester, NER, NER CT, Busbar, MK/OLTC Panel, Energization | HV/MV power transformer bays |
| Switchgear | Per-feeder: CT, CT-M, NCT, CB, VT, ES, PQM, EPMS, Relay, Cubicle, L4 Integration, Energization + Overall tests | MV switchgear boards (20-33kV) |
| Protection & Stability | Protection Panel, Stability Tests | Relay panels, 87T/64 schemes |
| Cable Testing | MV Cable, HV Cable | HV/MV cable commissioning |
| Substation Checks | ESB Interface, SCADA/SAS, DOF, AC/DC Distribution | System-level checks |
| Panel Board | Per-feeder CTs, Busbar, protection | LV/MV panel boards |
| Custom | User-defined | Anything else |

**Feeder Types (Switchgear):**

| Type | Default Equipment |
|------|-------------------|
| Incomer | CT, CT-M, CB, VT, ES, PQM, EPMS, Relay, Cubicle, L4, Energization |
| Bus Coupler | CT, CB, VT, PQM, Relay, Cubicle, Synch Check, L4, Energization |
| Outgoing Feeder | CT, CT-M, NCT, CB, VT, ES, PQM, EPMS, Relay, Cubicle, Cable Diff, L4, Energization |
| Transformer Feeder | CT, CT-M, NCT, CB, VT, ES, PQM, EPMS, Relay, Cubicle, L4, Energization |
| VT Panel/Metering | VT, PQM |
| NER | CT, Relay, Cubicle |
| Spare | (empty — user configures) |
| Custom | (user chooses) |

**Multiple Instances:** You can add the same section type multiple times (e.g. 3× Switchgear for 3 boards). Each gets auto-numbered.
    `
  },
  {
    id: 'tests',
    title: 'Test Templates & Levels',
    content: `
**Testing Levels (per IEC/IEEE standards):**

| Level | Name | Description |
|-------|------|-------------|
| L1 | FAT (Factory Acceptance Test) | Manufacturer testing before delivery |
| L2 | Pre-SAT | Receiving inspection, RIF, IVF |
| L3 | SAT (Site Acceptance Test) | On-site commissioning (the main scope) |
| L4 | Integration | System integration testing (trips, SCADA, interlocks) |
| L5 | Energization | Pre-energization checks, soak test, post-energization |

**Key Equipment Types & Test Counts:**

| Equipment | Tests | Key Tests |
|-----------|-------|-----------|
| Power Transformer | 33 | OLTC, DGA, Winding R, Ratio, IR, Cooling, Buchholz |
| CT - Protection | 9 | Visual, IR, Polarity, Saturation, Winding R, CRM, Ratio, Burden, Primary Inj |
| CT - Metering | 6 | Visual, IR, Polarity, Winding R, Ratio & Burden, Primary Inj |
| Circuit Breaker | 12 | SF6, Timing, Coil R, Motor, Min Voltage, Castell, Contact R |
| Relay | 13 | FAT, Equipment Details, DC Supply, Measurement, Protection Function, Trip, SCCS |
| Cubicle | 10 | AC/DC Scheme, Inter-panel Wiring, Voltage Detector, MCB, Heater/Lighting |
| VT | 5 | Visual, IR, Winding R, Polarity, Ratio |
| Earth Switch | 3 | Contact R, Operation, Interlock |
| PQM | 5 | Current, Voltage, Frequency, Power, Energy |
| L4 Integration | 12 | Local/Remote CB, Primary Inj, Trip Supervision, Lockout, SCADA DI/DO, EPMS |
| Energization | 5 | Pre-Energization, FOD, Energization, Post-Energization, Soak Test |
| NER | 5 | RIF, IVF, Visual, IR, Ohmic Resistance |
| Surge Arrester | 9 | Visual through After Energization |
| MK & OLTC Panel | 12 | Marshalling kiosk & OLTC panel functional |

**Customisation:** Click any equipment row → expand → tick/untick individual tests. Add custom tests with level selection.
    `
  },
  {
    id: 'cor',
    title: 'COR Format & Features',
    content: `
**20-Column Data Sheet Format (per NCL060HV standard):**

| # | Column | Purpose |
|---|--------|---------|
| 1 | S.No | Sequential number |
| 2 | Feeder Ref | Feeder reference from SLD |
| 3 | Equipment | Equipment type/name |
| 4 | Level | L1-L5 code |
| 5 | Test Description | Individual test name |
| 6 | Planned Start | Date (DD-MMM-YY) |
| 7 | Planned Finish | Date (DD-MMM-YY) |
| 8 | Actual Start | Date (DD-MMM-YY) |
| 9 | Actual Finish | Date (DD-MMM-YY) |
| 10 | SAT Completed | YES/NO/N/A dropdown |
| 11 | CxA Witnessed | YES/NO/N/A dropdown |
| 12 | Completed | YES/NO/N/A dropdown |
| 13 | Report Received | YES/NO/N/A dropdown |
| 14 | Report on Procore | YES/NO/N/A dropdown |
| 15 | Report Reviewed | YES/NO/N/A dropdown |
| 16 | Reviewed (Y/N/NA) | YES/NO/N/A dropdown |
| 17 | Outstanding Obs | Free text |
| 18 | Report Closed | YES/NO/N/A dropdown |
| 19 | Comments | Free text |
| 20 | % Complete | LIVE FORMULA (auto-calculates from cols 10-18) |

**Key Features:**

• **Live Formulas** — % Complete auto-calculates as you fill in YES/NO
• **Data Validation** — Dropdowns on all tracking columns (YES/NO/N/A)
• **Orange Separators** — Equipment groups separated by orange header rows
• **Level Colouring** — L1=Blue, L2=Green, L3=Amber, L4=Purple, L5=Cyan
• **Frozen Panes** — Equipment names + headers always visible when scrolling
• **Cx Charts** — Cell-based Gantt that updates live when you edit start/finish dates
    `
  },
  {
    id: 'gantt',
    title: 'Cx Charts — Live Gantt',
    content: `
**The Cx Charts sheet is a live, cell-based Gantt chart.**

Unlike a static Excel chart object, this Gantt is built from formulas in the cells themselves:

• **Column A** — Equipment names (with dark section separators)
• **Column B** — Planned Start date (editable)
• **Column C** — Planned Finish date (editable)
• **Columns D+** — One column per day, formula: =IF(AND(date>=start, date<=end), 1, "")
• **Conditional Formatting** — Cells with value 1 get orange fill → creates the bar

**How to use it:**

1. Open the COR in Excel
2. Go to "Cx Charts" tab
3. Orange bars show the planned timeline for each equipment item
4. **To change a schedule:** Edit the date in column B or C → bar moves instantly
5. Month headers are merged across the top for easy reading
6. Panes are frozen — scroll right to see future dates while keeping equipment names visible

**Note:** The Gantt dates are initially estimated from test count (1 day per 3 tests, min 2 days). Update them with your actual programme dates after generation.
    `
  },
  {
    id: 'upload',
    title: 'Procore Upload (In Development)',
    content: `
**Status: Under Development — functional but awaiting Procore bot activation on sandbox.**

**What it does:**
Takes your equipment scope and generates a .xlsm upload file in the Procore bulk import format (27 columns, matching the Standard Inspection Generator V6.33 template).

**How it works:**

1. Equipment from Section Builder → mapped to CxHV template names
2. One row per equipment item (or one per section in full-substation mode)
3. Downloads .xlsm file with all required columns pre-filled
4. Upload via Procore Correspondence tool → bulk creates inspections

**Template Mapping:**

| Section | Maps To |
|---------|---------|
| Transformer Bay | CxHV-Air Insulated Switchgear (AIS) |
| Switchgear | CxHV-Air Insulated Switchgear (AIS) |
| Protection | CxHV-Relay Panels |
| Cables | CxHV-HV & MV Cable |
| Substation Checks | CxHV-HV Substation |
| Panel Board | CxHV-Battery & Charger |
| Custom | Individual per item |

**Current Blockers:**
• Procore sandbox bot not processing uploads (SDE bulk-import service not triggered)
• Switchgear & Relay foundational scripts still being developed by CxP team
• Option 2 (extend Cx-MV templates) killed — lease team pushed back
• Waiting on Glen/Zarina for HV-specific inspection approach

**Process (confirmed by Glen Crowley, CxP):**
1. Download existing prep file from Procore (HVSS-Cx folder)
2. Mark additions in yellow highlight
3. Mark removals with strikethrough
4. Submit to CxP general intake SIM
5. Regional SMEs review → publish to Procore
    `
  },
  {
    id: 'reading-slds',
    title: 'Reading SLDs — Quick Guide',
    content: `
**MV Switchgear SLD Structure (20-33kV boards):**

• **Busbar** at top — rated voltage, frequency, current, fault level
• **Incomer (01A)** — highest CT rating, VT, PQM+, main relay, labelled "INCOMER"
• **Bus Coupler (02A/03A)** — labelled "COUPLER", CT at bus capacity, VT + Synch Check
• **Outgoing Feeder (04A+)** — labelled "FEEDER XXA/B", cable to other board, has NCT (BC91)
• **VT Panel (06A/07A)** — labelled "BUS BAR VT", VT + PQM only
• **Spare** — hardware installed but nothing connected

**Key Equipment Identifiers:**
• CT (BC1) — Current Transformer, shows ratio (e.g. 3150/1A)
• NCT (BC91) — Neutral/Core Balance CT, at cable end
• VT — Voltage Transformer, shows ratio (e.g. 20kV/√3 : 100/√3)
• CB (QA1) — Circuit Breaker, shows rated current
• Relay — Protection relay, shows function codes (51, 50N, 87, etc.)
• PQM — Power Quality Meter
• EPMS — Energy & Power Monitoring System

**HV Switchyard (110-400kV) — Additional equipment:**
• Disconnectors (DA/DB) — busbar/line isolation, rated ~1250A
• Earth Switches (DEM1-4) — maintenance and high-speed earthing
• Sectionalisers — bus section breakers
• Surge Arresters — rated voltage and discharge current
• Teleprotection — fibre/comms links between substations

**What covers ~80% of equipment:** The SLD
**What needs manual input:** UPS, DC chargers, generators, fire systems, auxiliary items
    `
  },
  {
    id: 'contacts',
    title: 'Key Contacts & Process',
    content: `
**CxP Team (Template owners):**

| Person | Role | Area |
|--------|------|------|
| Jim Dyer | Mgr, Global Cx Programs | Overall |
| Glen Crowley | Cx Technical Manager | EMEA / Electrical / LV Systems |
| Zarina Akhmetzhanova | Cx Technical Manager | APAC / Electrical / HV/MV Systems |
| Alex Sarris | Procore Lead | AMER / Metrics / Process |
| Jake Riddick | Electrical SME | AMER / ACS & As-Left Settings |
| Sarath | HV Commissioning Scripts | Weekly sync (Thu 4:15pm) |

**ACx Team:**

| Person | Role |
|--------|------|
| Paul Du Plessis | Manager, ACx |
| Ovais Ali Tariq | CxA (Mentor) |
| Ali Raza | Site CxA, DUB069HV |

**Process for Template Changes:**
1. Download prep file from Glen's Procore folder (HVSS-Cx)
2. Yellow highlight = additions, strikethrough = removals
3. Submit CxP general intake SIM
4. Glen/Zarina review (regional) → SME alignment (global)
5. Published to Procore

**Process for New Templates:**
Same as above but start from blank prep file format (Fieldsets, Prerequisites, L3-SAT, L4-FPT, CxA Review, Revision)

**Key Decision (confirmed):**
CxHV templates are "admin wrappers" — they track L3/L4/CxA completion.
Detailed test results live in attached .xlsx foundational scripts (filled on site by GC).
    `
  },
  {
    id: 'changelog',
    title: 'Changelog & Known Issues',
    content: `
**Latest Changes:**

• Cell-based Gantt (replaces static chart objects) — live formula-driven bars
• Test customisation — tick/untick individual tests per equipment
• Editable equipment names inline
• Multiple section instances (add 3× Switchgear etc.)
• COR format matched to NCL060HV standard (20 columns)
• Procore upload generator (functional, .xlsm output)
• Section-based feeder defaults auto-tick

**Known Issues / TODO:**

• Gantt chart titles may show numeric indices instead of section names (shared string resolution)
• Procore sandbox bot not processing uploaded .xlsm files
• Switchgear/Relay foundational scripts not yet finalised by CxP
• Panel Board section templates need validation (IB-ROOM-A style)
• Dashboard app styling needs professional colour pass
• Git PAT may have expired (check before pushing)

**Test Template Sources:**

| Source | Location |
|--------|----------|
| DUB058 COR | C:\\Downloads\\DUB058HV\\DUB058_4th_Transformer_-20kV__COR_21-01-2026.xlsx |
| DUB069 COR | C:\\Downloads\\DUB069HV\\DUB069 4th Transformer 15-06-2026.xlsx |
| NCL060HV COR | C:\\Downloads\\COR-Examples\\NCL060HV_COR_13.07.26.xlsx |
| ZAZ062HV COR | C:\\Downloads\\COR-Examples\\COR_ZAZ062HV_Future-Bay-&-Bus-Section-03-07-26.xlsm |
| Commissioning Scripts | C:\\Downloads\\CommissioningScripts\\ (T224, Protection Panel, MV-SUB-2) |
| HVSS Prep Files | C:\\Downloads\\HVSS-Cx\\ (17 files) |
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
          HV Substation Commissioning Tool — Technical Reference
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
              if (line.startsWith('**') && line.endsWith('**')) {
                return <div key={i} style={{ fontWeight: 700, marginTop: 12, marginBottom: 4 }}>{line.replace(/\*\*/g, '')}</div>
              }
              if (line.startsWith('• ')) {
                return <div key={i} style={{ paddingLeft: 16 }}>{line}</div>
              }
              if (line.startsWith('| ') && i > 0) {
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
              if (line.startsWith('```')) return null
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
