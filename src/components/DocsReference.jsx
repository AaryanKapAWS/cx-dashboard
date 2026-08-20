import { useState, useEffect } from 'react';

const sections = [
  { id: 'overview', icon: '🏠', title: 'Overview' },
  { id: 'quick-start', icon: '🚀', title: 'Quick Start' },
  { id: 'bay-builder', icon: '🏗️', title: 'Bay Builder', children: [
    { id: 'adding-bays', title: 'Adding Bays & Feeders' },
    { id: 'presets', title: 'Presets' },
    { id: 'sub-sections', title: 'Sub-Sections & Feeders' },
    { id: 'custom-equipment', title: 'Custom Equipment' },
  ]},
  { id: 'equipment-tests', icon: '⚡', title: 'Equipment & Tests', children: [
    { id: 'equipment-reference', title: 'Equipment Reference (77 Types)' },
    { id: 'levels', title: 'L1–L5 Commissioning Levels' },
    { id: 'template-structure', title: 'Template Structure' },
  ]},
  { id: 'progress-tracker', icon: '📊', title: 'Progress Tracker', children: [
    { id: 'status-columns', title: 'Status Columns' },
    { id: 'dates-checkboxes', title: 'Dates & Checkboxes' },
  ]},
  { id: 'cor-export', icon: '📤', title: 'COR Export', children: [
    { id: 'sheet-structure', title: 'Sheet Structure' },
    { id: 'cx-programme', title: 'Cx Programme & Charts' },
    { id: 'certificate', title: 'Certificate of Readiness' },
  ]},
  { id: 'sld-viewer', icon: '🔌', title: 'SLD Viewer' },
  { id: 'asana-integration', icon: '🔗', title: 'Asana Integration' },
  { id: 'faq', icon: '❓', title: 'FAQ' },
];

/* ─── Sidebar ─────────────────────────────────────────── */
function Sidebar({ activeSection, onNavigate }) {
  const [expanded, setExpanded] = useState({});

  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <nav style={styles.sidebar}>
      <div style={styles.sidebarHeader}>
        <span style={{ fontSize: 20 }}>📖</span>
        <span style={styles.sidebarTitle}>Documentation</span>
      </div>
      <div style={styles.sidebarNav}>
        {sections.map(section => (
          <div key={section.id}>
            <button
              onClick={() => {
                onNavigate(section.id);
                if (section.children) toggle(section.id);
              }}
              style={{
                ...styles.navItem,
                ...(activeSection === section.id ? styles.navItemActive : {}),
              }}
            >
              <span style={{ marginRight: 8 }}>{section.icon}</span>
              {section.title}
              {section.children && (
                <span style={styles.chevron}>
                  {expanded[section.id] ? '▾' : '▸'}
                </span>
              )}
            </button>
            {section.children && expanded[section.id] && (
              <div style={styles.subNav}>
                {section.children.map(child => (
                  <button
                    key={child.id}
                    onClick={() => onNavigate(child.id)}
                    style={{
                      ...styles.subNavItem,
                      ...(activeSection === child.id ? styles.subNavItemActive : {}),
                    }}
                  >
                    {child.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </nav>
  );
}

/* ─── Content Sections ─────────────────────────────────── */
function Callout({ type = 'info', children }) {
  const colors = {
    info: { bg: '#eff6ff', border: '#3b82f6', icon: 'ℹ️' },
    tip: { bg: '#f0fdf4', border: '#22c55e', icon: '💡' },
    warning: { bg: '#3a2f1a', border: '#f59e0b', icon: '⚠️' },
  };
  const c = colors[type];
  return (
    <div style={{ background: c.bg, borderLeft: `4px solid ${c.border}`, padding: '12px 16px', borderRadius: 6, margin: '16px 0' }}>
      <span style={{ marginRight: 8 }}>{c.icon}</span>
      {children}
    </div>
  );
}

function SectionHeader({ id, title }) {
  return <h2 id={id} style={styles.sectionHeader}>{title}</h2>;
}

function SubHeader({ id, title }) {
  return <h3 id={id} style={styles.subHeader}>{title}</h3>;
}

function Content() {
  return (
    <div style={styles.content}>
      {/* ═══ OVERVIEW ═══ */}
      <SectionHeader id="overview" title="🏠 Overview" />
      <p style={styles.p}>
        <strong>cx-dashboard</strong> is a commissioning automation tool for <strong>HV/MV substations</strong>.
        It generates comprehensive Commissioning Outstanding Registers (CORs) from your project scope,
        tracks testing progress in real-time, and exports production-ready Excel workbooks with charts,
        programme summaries, and certificates.
      </p>
      <Callout type="info">
        This tool is designed for <strong>HV/MV substation commissioning</strong> (220kV, 132kV, 20kV, etc.) —
        not data centre electrical systems. Equipment templates are tailored to GIS switchgear,
        oil transformers, MV switchgear, C&P panels, and auxiliary systems.
      </Callout>

      <h4 style={styles.h4}>Who is this for?</h4>
      <ul style={styles.ul}>
        <li>Commissioning Agents (CxA) managing site testing</li>
        <li>Commissioning Managers tracking programme-level progress</li>
        <li>Programme Managers needing COR documentation for handover</li>
      </ul>

      <h4 style={styles.h4}>End-to-End Pipeline</h4>
      <div style={styles.pipeline}>
        <div style={styles.pipelineStep}>📄 SLD PDF</div>
        <div style={styles.pipelineArrow}>→</div>
        <div style={styles.pipelineStep}>🏗️ Bay Builder<br/>(Equipment Scope)</div>
        <div style={styles.pipelineArrow}>→</div>
        <div style={styles.pipelineStep}>📊 Progress<br/>Tracker</div>
        <div style={styles.pipelineArrow}>→</div>
        <div style={styles.pipelineStep}>📤 COR Export<br/>(.xlsx)</div>
        <div style={styles.pipelineArrow}>→</div>
        <div style={styles.pipelineStep}>🔗 Procore<br/>Upload</div>
      </div>

      {/* ═══ QUICK START ═══ */}
      <SectionHeader id="quick-start" title="🚀 Quick Start" />
      <p style={styles.p}>Get from zero to a complete COR in 4 steps:</p>

      <div style={styles.stepCard}>
        <div style={styles.stepNumber}>1</div>
        <div>
          <strong>Create Your Project</strong>
          <p style={styles.stepDesc}>Enter project name (e.g. "ZAZ062 - 220kV Substation") and site code. This sets the header on all exported sheets.</p>
        </div>
      </div>

      <div style={styles.stepCard}>
        <div style={styles.stepNumber}>2</div>
        <div>
          <strong>Build Your Scope (Bay Builder)</strong>
          <p style={styles.stepDesc}>Add feeders/bays, select equipment presets (GIS Bay, Oil Transformer, MV Switchgear, etc.), and customize tests. Each preset auto-populates with the standard tests for that equipment type across all 5 commissioning levels.</p>
        </div>
      </div>

      <div style={styles.stepCard}>
        <div style={styles.stepNumber}>3</div>
        <div>
          <strong>Track Progress</strong>
          <p style={styles.stepDesc}>As testing completes on site, mark tests with dates, checkboxes, and status columns. Progress is calculated automatically per bay, per level, and overall.</p>
        </div>
      </div>

      <div style={styles.stepCard}>
        <div style={styles.stepNumber}>4</div>
        <div>
          <strong>Export COR</strong>
          <p style={styles.stepDesc}>Generate a complete .xlsx workbook with: Project Overview, Cx Programme (summary + charts), individual test sheets per bay, Certificate of Readiness, and Revision History.</p>
        </div>
      </div>

      {/* ═══ BAY BUILDER ═══ */}
      <SectionHeader id="bay-builder" title="🏗️ Bay Builder" />
      <p style={styles.p}>
        The Bay Builder is where you define your project scope — what equipment exists at the substation
        and what tests need to be performed. Think of it as building a tree:
      </p>
      <div style={styles.codeBlock}>
{`Project (e.g. ZAZ062 - 220kV Substation)
├── Section (e.g. 220kV GIS Switchgear)
│   ├── Feeder/Bay (e.g. H01 TR-1)
│   │   ├── Equipment Group (e.g. Circuit Breaker)
│   │   │   ├── Test 1 (CB Operating Timing Test)
│   │   │   ├── Test 2 (Contact Resistance)
│   │   │   └── ...
│   │   ├── Equipment Group (e.g. Current Transformer)
│   │   └── ...
│   ├── Feeder/Bay (e.g. H02 LINE-1)
│   └── ...
├── Section (e.g. Oil Transformers)
└── Section (e.g. Auxiliary Systems)`}
      </div>

      <SubHeader id="adding-bays" title="Adding Bays & Feeders" />
      <p style={styles.p}>
        Click <strong>"+ Add Bay"</strong> to create a new feeder/bay. Each bay represents a physical
        switchgear bay, transformer, panel, or system at the substation.
      </p>
      <ul style={styles.ul}>
        <li><strong>Bay Name</strong> — The display name (e.g. "H01 TR-1", "C02 INCOMER C")</li>
        <li><strong>Feeder Reference</strong> — The formal reference code used on drawings</li>
        <li><strong>Section</strong> — Which parent section it belongs to (GIS, Transformer, SWGR, C&P, Aux)</li>
      </ul>

      <SubHeader id="presets" title="Presets" />
      <p style={styles.p}>
        Presets are pre-configured equipment packages that auto-populate a bay with the standard
        tests for that equipment type. Available presets:
      </p>
      <table style={styles.table}>
        <thead>
          <tr style={styles.tableHeader}>
            <th style={styles.th}>Preset</th>
            <th style={styles.th}>Equipment Included</th>
            <th style={styles.th}>~Tests</th>
          </tr>
        </thead>
        <tbody>
          <tr style={styles.tr}><td style={styles.td}>GIS Bay (Transformer Feeder)</td><td style={styles.td}>CB, Bus DS, Line DS, Fast ES, CT, VT, Arresters, BCU, SF6, Densimeter, Local Cubicle, VPIS, AFD, Annunciator, Interlocks, HV Test, Energization</td><td style={styles.td}>~196</td></tr>
          <tr style={styles.tr}><td style={styles.td}>GIS Bay (Line Feeder)</td><td style={styles.td}>Same as above minus VT (line side), + PQM</td><td style={styles.td}>~176</td></tr>
          <tr style={styles.tr}><td style={styles.td}>GIS Bay (Bus Coupler)</td><td style={styles.td}>CB, 2x Bus DS, Fast ES, CT, BCU, Interlocks, HV Test</td><td style={styles.td}>~149</td></tr>
          <tr style={styles.tr}><td style={styles.td}>Oil Transformer</td><td style={styles.td}>Transformer Electrical Tests, MK & OLTC Panel, EPMS, SAS, Energization</td><td style={styles.td}>~87</td></tr>
          <tr style={styles.tr}><td style={styles.td}>MV Switchgear (Incomer/Feeder)</td><td style={styles.td}>VCB, CT, Manual ES, Relay (P139), AFD, VPIS, Terminal Blocks, EPMS, Energization</td><td style={styles.td}>~109-112</td></tr>
          <tr style={styles.tr}><td style={styles.td}>MV Switchgear (Coupler)</td><td style={styles.td}>VCB, CT, Manual ES, Relay, AFD, VPIS</td><td style={styles.td}>~95</td></tr>
          <tr style={styles.tr}><td style={styles.td}>MV Switchgear (Metering)</td><td style={styles.td}>VT, CT, Terminal Blocks, Signalling, SER Comms</td><td style={styles.td}>~51</td></tr>
          <tr style={styles.tr}><td style={styles.td}>C&P Panel (Tx Feeder)</td><td style={styles.td}>87T Diff, REF, AVR, Protection Panel, EPMS, SAS, Energization</td><td style={styles.td}>~101</td></tr>
          <tr style={styles.tr}><td style={styles.td}>C&P Panel (Line Feeder)</td><td style={styles.td}>87L Diff, Distance (7SL86), PQM, Protection Panel, EPMS, SAS</td><td style={styles.td}>~85</td></tr>
          <tr style={styles.tr}><td style={styles.td}>Busbar Protection (BBP)</td><td style={styles.td}>Central Unit, Bay Units (per feeder), EPMS, SAS, Energization</td><td style={styles.td}>~98-151</td></tr>
          <tr style={styles.tr}><td style={styles.td}>Auxiliary Systems</td><td style={styles.td}>Battery Banks, AC Panels, UPS, NER, Diesel Gen, ATS, DGA, MV Cables, SAS, Earth Grid</td><td style={styles.td}>~225</td></tr>
          <tr style={styles.tr}><td style={styles.td}>B-Watch 3 (PD Monitoring)</td><td style={styles.td}>Phase threshold tests (L1-3), sensors, alarms, HMI, SAS integration</td><td style={styles.td}>~60</td></tr>
        </tbody>
      </table>

      <Callout type="tip">
        Presets are starting points — you can always add, remove, or modify individual tests
        after applying a preset. Use custom equipment for site-specific items not covered by templates.
      </Callout>

      <SubHeader id="sub-sections" title="Sub-Sections & Feeders" />
      <p style={styles.p}>
        Large projects are organized into <strong>sections</strong> that group related bays:
      </p>
      <ul style={styles.ul}>
        <li><strong>220kV GIS Switchgear</strong> — All HV bays (H01-H06), Bus Coupler (H04)</li>
        <li><strong>Oil Transformers</strong> — Transformer 1, 2, 3 (each with MK/OLTC panel)</li>
        <li><strong>20kV Switchgear C</strong> — MV bays (C01-C06): Coupler, Incomer, Feeders, Metering, Spare</li>
        <li><strong>C&P Panels</strong> — Protection panels per HV bay (H1-H6), BBP-1, BBP-2</li>
        <li><strong>Auxiliary Systems</strong> — Site-wide support systems (batteries, AC, diesel gen, etc.)</li>
      </ul>
      <p style={styles.p}>
        Within each section, <strong>feeders</strong> are the individual bays/units. Each feeder
        gets its own sheet in the exported COR.
      </p>

      <SubHeader id="custom-equipment" title="Custom Equipment" />
      <p style={styles.p}>
        Not every substation is identical. Use <strong>Custom Equipment</strong> to add:
      </p>
      <ul style={styles.ul}>
        <li>Site-specific equipment not in the standard 77-type template library</li>
        <li>Additional tests required by local standards or project specifications</li>
        <li>Vendor-specific commissioning items (e.g. specific relay model tests)</li>
      </ul>
      <p style={styles.p}>
        Custom equipment is saved to your project and included in the COR export just like
        preset equipment.
      </p>

      {/* ═══ EQUIPMENT & TESTS ═══ */}
      <SectionHeader id="equipment-tests" title="⚡ Equipment & Tests" />

      <SubHeader id="levels" title="L1–L5 Commissioning Levels" />
      <p style={styles.p}>
        Every test in the COR is assigned to one of 5 commissioning levels, representing
        the stage at which that test is performed:
      </p>
      <table style={styles.table}>
        <thead>
          <tr style={styles.tableHeader}>
            <th style={styles.th}>Level</th>
            <th style={styles.th}>Name</th>
            <th style={styles.th}>Description</th>
            <th style={styles.th}>Typical Tests</th>
          </tr>
        </thead>
        <tbody>
          <tr style={styles.tr}><td style={styles.td}><strong>L1</strong></td><td style={styles.td}>FAT (Factory Acceptance)</td><td style={styles.td}>Tests performed at the manufacturer's factory before shipping</td><td style={styles.td}>FAT Report on Procore, FAT Observations</td></tr>
          <tr style={styles.tr}><td style={styles.td}><strong>L2</strong></td><td style={styles.td}>Pre-SAT</td><td style={styles.td}>Document checks before site testing begins</td><td style={styles.td}>RIF (Request for Inspection Form), IVF (Inspection Verification Form), Shock Recorders, Oil Reports</td></tr>
          <tr style={styles.tr}><td style={styles.td}><strong>L3</strong></td><td style={styles.td}>SAT (Site Acceptance)</td><td style={styles.td}>The bulk of commissioning — hands-on testing at site</td><td style={styles.td}>Visual Inspection, Insulation Resistance, Contact Resistance, Functional Checks, Protection Relay Testing, Operation Checks</td></tr>
          <tr style={styles.tr}><td style={styles.td}><strong>L4</strong></td><td style={styles.td}>Integration</td><td style={styles.td}>Inter-system tests, end-to-end signal verification</td><td style={styles.td}>CT Primary Injection, SCADA Signal Checks, Interlock Checks, Protection Scheme Integration, AFD Integration</td></tr>
          <tr style={styles.tr}><td style={styles.td}><strong>L5</strong></td><td style={styles.td}>Energization</td><td style={styles.td}>Final checks before and during first energization</td><td style={styles.td}>Pre-Energization Safety Checks, FOD (Foreign Object Debris), Energization, Post-Energization, Soak Test</td></tr>
        </tbody>
      </table>

      <Callout type="info">
        L3 (SAT) typically accounts for 60-70% of all tests in a COR. This is where the
        majority of site commissioning work happens.
      </Callout>

      <SubHeader id="equipment-reference" title="Equipment Reference (77 Types)" />
      <p style={styles.p}>
        The template library contains <strong>77 equipment types</strong> with pre-defined test lists.
        Key categories include:
      </p>
      <table style={styles.table}>
        <thead>
          <tr style={styles.tableHeader}>
            <th style={styles.th}>Category</th>
            <th style={styles.th}>Equipment Types</th>
            <th style={styles.th}>Tests per Type</th>
          </tr>
        </thead>
        <tbody>
          <tr style={styles.tr}><td style={styles.td}><strong>GIS Switchgear</strong></td><td style={styles.td}>Circuit Breaker, Bus Disconnector, Line Disconnector, Fast Earth Switch, Voltage Transformer, Current Transformer, Surge Arrester, Local Control Cubicle, BCU, SF6 Gas System, Densimeter, VPIS, AFD Relay</td><td style={styles.td}>3–20 each</td></tr>
          <tr style={styles.tr}><td style={styles.td}><strong>Transformer</strong></td><td style={styles.td}>Oil Transformer (electrical tests), MK & OLTC Panel, Cooling System (fans), DGA900, Buchholz Relay, Dehydrating Breather</td><td style={styles.td}>19–45 each</td></tr>
          <tr style={styles.tr}><td style={styles.td}><strong>MV Switchgear</strong></td><td style={styles.td}>VCB (Vacuum Circuit Breaker), CT, VT, Manual Earth Switch, P139 Protection Relay, Arc Flash Detection, Terminal Blocks, EPMS, PQM</td><td style={styles.td}>3–19 each</td></tr>
          <tr style={styles.tr}><td style={styles.td}><strong>Protection</strong></td><td style={styles.td}>87T (Transformer Diff), 87L (Line Diff), REF, Distance (7SL86), Busbar Protection (REB500), AVR</td><td style={styles.td}>5–15 each</td></tr>
          <tr style={styles.tr}><td style={styles.td}><strong>Auxiliary</strong></td><td style={styles.td}>Battery Bank, Rectifier/Charger, AC Power Panel, UPS, NER, Diesel Generator, ATS, DGA Monitoring Panel, SAS/SCADA Panel, Earth Grid, MV Cable, LV Cable</td><td style={styles.td}>2–19 each</td></tr>
          <tr style={styles.tr}><td style={styles.td}><strong>Monitoring</strong></td><td style={styles.td}>B-Watch 3 (PD Monitoring), EPMS, SAS</td><td style={styles.td}>2–10 each</td></tr>
        </tbody>
      </table>

      <SubHeader id="template-structure" title="Template Structure" />
      <p style={styles.p}>
        Templates are stored in <code style={styles.code}>test_templates.json</code>. Each entry maps
        an equipment type to its default tests:
      </p>
      <div style={styles.codeBlock}>
{`{
  "CIRCUIT_BREAKER": {
    "displayName": "Circuit Breaker",
    "level": "L3",
    "tests": [
      "Visual Inspection",
      "Insulation Resistance",
      "Contact Resistance Ductor Test",
      "CB Operating Timing Test",
      "Minimum Voltage Operation",
      ...
    ]
  }
}`}
      </div>
      <Callout type="warning">
        Some expanded templates (MK_OLTC_PANEL, SWITCHGEAR_OVERALL) were built using ZAZ062HV
        site-specific data. Items like specific Buchholz relay models or DGA900 references may
        need adjustment for other projects.
      </Callout>

      {/* ═══ PROGRESS TRACKER ═══ */}
      <SectionHeader id="progress-tracker" title="📊 Progress Tracker" />
      <p style={styles.p}>
        The Progress Tracker shows real-time completion status for every test in your project.
        Data is persisted in your browser's localStorage between sessions.
      </p>

      <SubHeader id="status-columns" title="Status Columns" />
      <table style={styles.table}>
        <thead>
          <tr style={styles.tableHeader}>
            <th style={styles.th}>Column</th>
            <th style={styles.th}>Type</th>
            <th style={styles.th}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr style={styles.tr}><td style={styles.td}>Planned Start</td><td style={styles.td}>Date</td><td style={styles.td}>Scheduled start date for the test</td></tr>
          <tr style={styles.tr}><td style={styles.td}>Planned Finish</td><td style={styles.td}>Date</td><td style={styles.td}>Scheduled completion date</td></tr>
          <tr style={styles.tr}><td style={styles.td}>Actual Start</td><td style={styles.td}>Date</td><td style={styles.td}>When testing actually started</td></tr>
          <tr style={styles.tr}><td style={styles.td}>Actual Finish</td><td style={styles.td}>Date</td><td style={styles.td}>When testing actually completed</td></tr>
          <tr style={styles.tr}><td style={styles.td}>SAT Completed</td><td style={styles.td}>Date</td><td style={styles.td}>Date SAT was completed</td></tr>
          <tr style={styles.tr}><td style={styles.td}>CxA Witnessed</td><td style={styles.td}>Yes/No</td><td style={styles.td}>Whether the CxA witnessed the test</td></tr>
          <tr style={styles.tr}><td style={styles.td}>Completed</td><td style={styles.td}>Yes/No</td><td style={styles.td}>Overall completion flag</td></tr>
          <tr style={styles.tr}><td style={styles.td}>Report Received</td><td style={styles.td}>Date</td><td style={styles.td}>Date test report was received</td></tr>
          <tr style={styles.tr}><td style={styles.td}>Report on Procore</td><td style={styles.td}>Yes/No</td><td style={styles.td}>Whether report is uploaded to Procore</td></tr>
          <tr style={styles.tr}><td style={styles.td}>Report Reviewed</td><td style={styles.td}>Yes/No/NA</td><td style={styles.td}>Whether report has been reviewed by CxA</td></tr>
          <tr style={styles.tr}><td style={styles.td}>Outstanding Obs</td><td style={styles.td}>Text</td><td style={styles.td}>Any open observations from the report</td></tr>
          <tr style={styles.tr}><td style={styles.td}>Report Closed</td><td style={styles.td}>Yes/No</td><td style={styles.td}>Whether the report is fully closed out</td></tr>
          <tr style={styles.tr}><td style={styles.td}>Comments</td><td style={styles.td}>Text</td><td style={styles.td}>Free-text remarks</td></tr>
          <tr style={styles.tr}><td style={styles.td}>% Complete</td><td style={styles.td}>Auto</td><td style={styles.td}>Calculated based on milestone columns completed</td></tr>
        </tbody>
      </table>

      <SubHeader id="dates-checkboxes" title="Dates & Checkboxes" />
      <p style={styles.p}>
        Progress is determined by the <strong>milestone columns</strong> (SAT Completed → CxA Witnessed →
        Completed → Report Received → Report on Procore → Report Reviewed → Report Closed).
        A test is considered:
      </p>
      <ul style={styles.ul}>
        <li><strong>Not Started</strong> — No dates or checkmarks in any column</li>
        <li><strong>In Progress</strong> — Has Actual Start date but not all milestones complete</li>
        <li><strong>Done</strong> — All milestone columns filled (Report Closed = Yes)</li>
        <li><strong>N/A</strong> — Marked as not applicable for this project</li>
      </ul>
      <Callout type="tip">
        The Cx Programme tab in the exported COR uses these statuses to generate the
        Done / In Progress / Pending breakdown and the stacked bar charts.
      </Callout>

      {/* ═══ COR EXPORT ═══ */}
      <SectionHeader id="cor-export" title="📤 COR Export" />
      <p style={styles.p}>
        The export generates a complete <strong>.xlsx workbook</strong> ready for distribution.
        The file preserves formatting, merged cells, conditional formatting, and embedded charts.
      </p>

      <SubHeader id="sheet-structure" title="Sheet Structure" />
      <p style={styles.p}>A typical exported COR contains these sheets:</p>
      <div style={styles.codeBlock}>
{`📄 Project Overview          — Project info, site code, dates, team
📊 Cx Programme              — Summary table + progress stats + level breakdown
📈 Cx Charts                 — Stacked bar charts (Done/In Prog/Pending per section)
🔲 [Bay Sheet 1]             — Full test list with all status columns
🔲 [Bay Sheet 2]             — ...
🔲 ...                       — One sheet per bay/feeder
📜 Certificate of Readiness  — Sign-off template for project handover
📋 Revision History          — Document revision log`}
      </div>

      <SubHeader id="cx-programme" title="Cx Programme & Charts" />
      <p style={styles.p}>The Cx Programme sheet contains three summary tables:</p>
      <ul style={styles.ul}>
        <li><strong>Commissioning Progress</strong> — Per-section breakdown: Total, Done, In Progress, Pending, % Complete, L1-L5 test counts</li>
        <li><strong>Documentation Status</strong> — Stage-by-stage tracking (SAT Completed, CxA Witnessed, Completed, Report Received, on Procore, Reviewed, Closed)</li>
        <li><strong>Level Completion</strong> — Per-section, per-level (L1-L5) Total vs Done</li>
      </ul>
      <p style={styles.p}>
        The <strong>Cx Charts</strong> sheet contains embedded stacked bar charts visualizing the
        Done / In Progress / Pending status for each section. These update automatically based
        on the progress data.
      </p>

      <SubHeader id="certificate" title="Certificate of Readiness" />
      <p style={styles.p}>
        A formal sign-off sheet template including:
      </p>
      <ul style={styles.ul}>
        <li>Project completion statement</li>
        <li>Outstanding items summary</li>
        <li>Sign-off blocks (Contractor, CxA, Client)</li>
        <li>Date and conditional release notes</li>
      </ul>

      {/* ═══ SLD VIEWER ═══ */}
      <SectionHeader id="sld-viewer" title="🔌 SLD Viewer" />
      <p style={styles.p}>
        Upload a Single Line Diagram (SLD) PDF and the tool will parse and render an interactive
        topology view of your substation.
      </p>
      <h4 style={styles.h4}>Flow View</h4>
      <p style={styles.p}>
        Displays the substation topology as a node-and-connection diagram. Each bay is shown
        as a vertical column with equipment nodes (CB, DS, ES, CT, VT) connected by bus bars.
      </p>
      <ul style={styles.ul}>
        <li>Multi-bay horizontal layout — all bays side by side</li>
        <li>Equipment badges showing test completion status</li>
        <li>Click a bay to navigate to its test sheet</li>
      </ul>
      <Callout type="warning">
        SLD parsing is in Beta. Not all SLD formats are supported — diagrams may appear
        jumbled if the PDF structure is non-standard. Best results with clean, single-page SLDs.
      </Callout>

      {/* ═══ ASANA INTEGRATION ═══ */}
      <SectionHeader id="asana-integration" title="🔗 Asana Integration" />
      <p style={styles.p}>
        Connect your project to Asana to automatically create and sync a commissioning tracking board.
      </p>
      <h4 style={styles.h4}>Project Builder</h4>
      <p style={styles.p}>
        Click <strong>"Sync to Asana"</strong> to create an Asana project structured as:
      </p>
      <div style={styles.codeBlock}>
{`Asana Project: ZAZ062 - 220kV Substation
├── Section: 220kV GIS Switchgear
│   ├── Task: H01 TR-1 (185 tests)
│   ├── Task: H02 LINE-1 (165 tests)
│   └── ...
├── Section: Oil Transformers
│   ├── Task: Transformer 1 (87 tests)
│   └── ...
└── Section: Auxiliary Systems
    └── Task: Auxiliary (225 tests)`}
      </div>
      <p style={styles.p}>
        Each task includes the test count and links back to the dashboard. Progress is
        synced based on completion percentage.
      </p>
      <h4 style={styles.h4}>OAuth Setup</h4>
      <p style={styles.p}>
        Requires OAuth authorization (one-time setup via Settings). Uses the Asana API
        with rate-limited batch creation (respects Asana's 150 req/min limit with automatic
        sleep/retry).
      </p>

      {/* ═══ FAQ ═══ */}
      <SectionHeader id="faq" title="❓ FAQ" />

      <h4 style={styles.h4}>Why does my COR have more tests than the manual one?</h4>
      <p style={styles.p}>
        The template library uses granular, individual test entries (one per line) while
        manually-created CORs often group tests under equipment headers. For example, our
        template expands "Circuit Breaker" into 15+ individual tests, while a manual COR
        might list "Circuit Breaker Testing" as one entry. Both approaches are valid — ours
        gives better tracking granularity.
      </p>

      <h4 style={styles.h4}>Can I add custom tests not in the template?</h4>
      <p style={styles.p}>
        Yes! Use the Custom Equipment feature in Bay Builder to add any equipment type and
        define your own test list. These are saved permanently to your project.
      </p>

      <h4 style={styles.h4}>How do I export for a specific section only?</h4>
      <p style={styles.p}>
        Currently the COR exports the entire project. To export a sub-COR for a specific
        section (e.g. just GIS, or just Transformers), use the section filter in Export settings.
      </p>

      <h4 style={styles.h4}>What's the difference between this and the sub-CORs?</h4>
      <p style={styles.p}>
        Sub-CORs are smaller, section-specific registers (e.g. one for GIS, one for Transformers).
        This tool generates a unified COR covering the entire substation in one workbook,
        with a single Cx Programme summary across all sections. You can still break it into
        sub-CORs if needed for distribution.
      </p>

      <h4 style={styles.h4}>Where is my data stored?</h4>
      <p style={styles.p}>
        Progress data (dates, checkmarks) is stored in your browser's <strong>localStorage</strong>.
        It persists between sessions on the same browser/machine but is NOT synced to the cloud.
        Always export your COR to save a permanent copy.
      </p>

      <h4 style={styles.h4}>Can multiple people use this simultaneously?</h4>
      <p style={styles.p}>
        Currently single-user (browser-based). For multi-user collaboration, export the COR
        and share via Procore or SharePoint. Cloud sync is planned for a future release.
      </p>

      <div style={{ height: 100 }} />
    </div>
  );
}

/* ─── Main Docs Component ─────────────────────────────── */
export default function DocsReference() {
  const [activeSection, setActiveSection] = useState('overview');

  const handleNavigate = (id) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const sectionIds = sections.flatMap(s => [s.id, ...(s.children?.map(c => c.id) || [])]);
      for (const id of sectionIds.reverse()) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 120) {
          setActiveSection(id);
          break;
        }
      }
    };
    const container = document.querySelector('[data-docs-content]');
    if (container) container.addEventListener('scroll', handleScroll);
    return () => container?.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div style={styles.container}>
      <Sidebar activeSection={activeSection} onNavigate={handleNavigate} />
      <main style={styles.main} data-docs-content>
        <Content />
      </main>
    </div>
  );
}

/* ─── Styles ──────────────────────────────────────────── */
const styles = {
  container: {
    display: 'flex',
    height: 'calc(100vh - 80px)',
    overflow: 'hidden',
    background: '#ffffff',
    color: '#1e293b',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  sidebar: {
    width: 260,
    minWidth: 260,
    background: '#f8fafc',
    borderRight: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  sidebarHeader: {
    padding: '20px 16px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    borderBottom: '1px solid #e2e8f0',
  },
  sidebarTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: '#1e293b',
  },
  sidebarNav: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 0',
  },
  navItem: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    padding: '8px 16px',
    border: 'none',
    background: 'none',
    color: '#64748b',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s',
    borderRadius: 0,
  },
  navItemActive: {
    color: '#60a5fa',
    background: 'rgba(96, 165, 250, 0.08)',
    borderLeft: '3px solid #60a5fa',
  },
  chevron: {
    marginLeft: 'auto',
    fontSize: 10,
    color: '#64748b',
  },
  subNav: {
    paddingLeft: 12,
  },
  subNavItem: {
    width: '100%',
    display: 'block',
    padding: '6px 16px 6px 32px',
    border: 'none',
    background: 'none',
    color: '#64748b',
    fontSize: 12,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s',
  },
  subNavItemActive: {
    color: '#93c5fd',
  },
  main: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 40px',
  },
  content: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '32px 0',
  },
  sectionHeader: {
    fontSize: 24,
    fontWeight: 700,
    color: '#1e293b',
    marginTop: 48,
    marginBottom: 16,
    paddingTop: 24,
    borderTop: '1px solid #e2e8f0',
  },
  subHeader: {
    fontSize: 18,
    fontWeight: 600,
    color: '#1e293b',
    marginTop: 32,
    marginBottom: 12,
  },
  h4: {
    fontSize: 15,
    fontWeight: 600,
    color: '#475569',
    marginTop: 20,
    marginBottom: 8,
  },
  p: {
    fontSize: 14,
    lineHeight: 1.7,
    color: '#64748b',
    marginBottom: 12,
  },
  ul: {
    paddingLeft: 20,
    marginBottom: 16,
    fontSize: 14,
    lineHeight: 1.8,
    color: '#64748b',
  },
  code: {
    background: '#f1f5f9',
    padding: '2px 6px',
    borderRadius: 4,
    fontSize: 13,
    color: '#93c5fd',
    fontFamily: 'JetBrains Mono, Fira Code, monospace',
  },
  codeBlock: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: 16,
    fontSize: 12,
    fontFamily: 'JetBrains Mono, Fira Code, monospace',
    color: '#64748b',
    whiteSpace: 'pre',
    overflowX: 'auto',
    marginBottom: 16,
    lineHeight: 1.6,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginBottom: 20,
    fontSize: 13,
  },
  tableHeader: {
    background: '#e0f2fe',
  },
  th: {
    padding: '10px 12px',
    textAlign: 'left',
    fontWeight: 600,
    color: '#1e293b',
    borderBottom: '2px solid #334155',
  },
  tr: {
    borderBottom: '1px solid #e2e8f0',
  },
  td: {
    padding: '8px 12px',
    color: '#64748b',
    verticalAlign: 'top',
  },
  pipeline: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '20px 0',
    flexWrap: 'wrap',
  },
  pipelineStep: {
    background: '#e0f2fe',
    border: '1px solid #334155',
    borderRadius: 8,
    padding: '12px 16px',
    fontSize: 13,
    fontWeight: 500,
    color: '#1e293b',
    textAlign: 'center',
    minWidth: 100,
  },
  pipelineArrow: {
    fontSize: 20,
    color: '#60a5fa',
  },
  stepCard: {
    display: 'flex',
    gap: 16,
    padding: 16,
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    marginBottom: 12,
  },
  stepNumber: {
    width: 32,
    height: 32,
    minWidth: 32,
    borderRadius: '50%',
    background: '#2563eb',
    color: '#1e293b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 14,
  },
  stepDesc: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    lineHeight: 1.5,
  },
};
