import { useState, useEffect } from 'react'
import { getCustomTemplates, getAllTemplatesWithCustom } from '../utils/customTemplates'
import TEST_TEMPLATES from '../data/test_templates.json'

// ─── EQUIPMENT PALETTE ───────────────────────────────────────────────────────
const EQUIPMENT_GROUPS = [
  {
    label: 'Transformers',
    items: [
      { type: 'TRANSFORMER', label: 'Oil Transformer' },
      { type: 'DRY_TRANSFORMER', label: 'Dry Transformer' },
    ]
  },
  {
    label: 'Instrument Transformers',
    items: [
      { type: 'CT_HV', label: 'CT (HV/Outdoor)' },
      { type: 'CT', label: 'CT - Protection' },
      { type: 'CT_METER', label: 'CT - Metering' },
      { type: 'NCT', label: 'NCT / CBCT' },
      { type: 'VT_HV', label: 'VT (HV/Outdoor)' },
      { type: 'VT', label: 'VT' },
      { type: 'CT_GIS', label: 'CT (GIS)' },
      { type: 'VT_GIS', label: 'VT (GIS)' },
      { type: 'RING_CT_GIS', label: 'Ring CT (GIS)' },
    ]
  },
  {
    label: 'Switching & Busbar',
    items: [
      { type: 'CIRCUIT_BREAKER', label: 'Circuit Breaker' },
      { type: 'EARTH_SWITCH', label: 'Earth Switch / Disconnector' },
      { type: 'BUSBAR', label: 'Busbar' },
      { type: 'CB_GIS', label: 'Circuit Breaker (GIS)' },
      { type: 'DS_ES_GIS', label: 'Disconnector / ES (GIS)' },
      { type: 'ES_GIS', label: 'Earth Switch (GIS)' },
      { type: 'GIS_BAY', label: 'GIS Bay (Overall)' },
    ]
  },
  {
    label: 'Protection & Surge',
    items: [
      { type: 'SURGE_ARRESTER', label: 'Surge Arrester' },
      { type: 'SA_GIS', label: 'Surge Arrester (GIS)' },
      { type: 'NER', label: 'NER (Neutral Earth Resistor)' },
      { type: 'NER_CT', label: 'NER CT' },
    ]
  },
  {
    label: 'Panels, Relays & Metering',
    items: [
      { type: 'CUBICLE', label: 'Cubicle / Switchgear Panel' },
      { type: 'RELAY', label: 'Relay / IED' },
      { type: 'PROTECTION_PANEL', label: 'Protection Panel' },
      { type: 'MK_OLTC_PANEL', label: 'MK & OLTC Panel' },
      { type: 'PQM', label: 'Power Quality Meter' },
      { type: 'EPMS', label: 'EPMS' },
      { type: 'CUBICLE_GIS', label: 'Cubicle (GIS)' },
      { type: 'IED_OC_GIS', label: 'IED O/C (GIS)' },
      { type: 'IED_87T_GIS', label: 'IED 87T (GIS)' },
      { type: 'IED_87B_GIS', label: 'IED 87B (GIS)' },
      { type: 'LCC_GIS', label: 'Local Control Cabinet (GIS)' },
    ]
  },
  {
    label: 'Cables',
    items: [
      { type: 'HV_CABLE', label: 'HV Cable' },
      { type: 'MV_CABLE', label: 'MV Cable' },
      { type: 'HV_CABLE_GIS', label: 'HV Cable (GIS)' },
    ]
  },
  {
    label: 'SCADA, Control & Interface',
    items: [
      { type: 'SCADA', label: 'SCADA / SAS' },
      { type: 'ESB_INTERFACE', label: 'Grid Interface' },
      { type: 'AC_DC_CHECKS', label: 'AC/DC Distribution' },
      { type: 'SWITCHGEAR_OVERALL', label: 'Switchgear Overall Tests' },
      { type: 'SUBSTATION_CHECKS', label: 'Substation Checks' },
    ]
  },
  {
    label: 'DC System & Auxiliary',
    items: [
      { type: 'BATTERY_BANK', label: 'Battery Bank' },
      { type: 'BATTERY_CHARGER', label: 'Charger / Rectifier' },
      { type: 'DC_DISTRIBUTION', label: 'DC Distribution' },
      { type: 'UPS', label: 'UPS' },
      { type: 'DC_EARTH_FAULT', label: 'DC Earth Fault Monitor' },
    ]
  },
  {
    label: 'Earthing',
    items: [
      { type: 'EARTH_GRID', label: 'Earth Grid' },
      { type: 'EARTH_ELECTRODE', label: 'Earth Electrode' },
    ]
  },
  {
    label: 'Milestones & System Tests',
    items: [
      { type: 'ENERGIZATION', label: 'Energization' },
      { type: 'ENERGIZATION_GIS', label: 'Energization (GIS)' },
      { type: 'L4_INTEGRATION', label: 'L4 Integration / FPT' },
      { type: 'STABILITY_TEST', label: 'Stability Test (87T/87B/REF)' },
      { type: 'STABILITY_GIS', label: 'Stability Test (GIS)' },
      { type: 'SYNCH_CHECK', label: 'Synch Check' },
      { type: 'CABLE_DIFF', label: 'Cable Differential (87L)' },
      { type: 'EPMS_GIS', label: 'EPMS (GIS)' },
    ]
  },
  {
    label: 'Protection Relays & BBP',
    items: [
      { type: 'IED_87T', label: '87T Transformer Differential' },
      { type: 'IED_REF', label: 'REF Protection Relay' },
      { type: 'IED_AVR', label: 'AVR (Voltage Regulator)' },
      { type: 'IED_87L', label: '87L Line Differential' },
      { type: 'BUSBAR_PROTECTION_RELAY', label: 'Busbar Protection Relay' },
      { type: 'BUSBAR_PROTECTION_CENTRAL', label: 'Busbar Protection Central Unit' },
      { type: 'BBP_PANEL', label: 'BBP Panel Functional' },
      { type: 'LOCKOUT_RELAY', label: 'Lockout Relay (86)' },
      { type: 'ARC_FLASH_DETECTION', label: 'Arc Flash Detection' },
      { type: 'VPIS', label: 'VPIS (Voltage Presence)' },
    ]
  },
  {
    label: 'Auxiliary & Infrastructure',
    items: [
      { type: 'AC_POWER_PANEL', label: 'AC Power Panel' },
      { type: 'AC_UPS_PANEL', label: 'AC UPS Panel' },
      { type: 'SAS_PANEL', label: 'SAS / SCADA Panel' },
      { type: 'ATS', label: 'ATS (Auto Transfer Switch)' },
      { type: 'DIESEL_GENERATOR', label: 'Diesel Generator' },
      { type: 'DGA_MONITOR', label: 'DGA Monitoring Panel' },
      { type: 'NER_STANDALONE', label: 'NER (Standalone)' },
      { type: 'AUX_TRANSFORMER_ENHANCED', label: 'Auxiliary Transformer' },
      { type: 'LV_CONTROL_CABLE', label: 'LV Control Cable' },
      { type: 'LV_POWER_CABLE', label: 'LV Power Cable' },
      { type: 'B_WATCH_3', label: 'B-Watch 3 (GIS Monitor)' },
    ]
  },
]

// ─── TYPE BADGE COLOURS (matching Option 2 EquipmentTable) ──────────────────
const TYPE_COLOURS = {
  TRANSFORMER: { bg: '#FFF3E0', text: '#E65100', border: '#FFE0B2' },
  DRY_TRANSFORMER: { bg: '#FFF3E0', text: '#E65100', border: '#FFE0B2' },
  CT_HV: { bg: '#E0F7FA', text: '#006064', border: '#B2EBF2' },
  VT_HV: { bg: '#E8F5E9', text: '#1B5E20', border: '#C8E6C9' },
  CIRCUIT_BREAKER: { bg: '#FCE4EC', text: '#880E4F', border: '#F8BBD0' },
  EARTH_SWITCH: { bg: '#F3E5F5', text: '#4A148C', border: '#E1BEE7' },
  SURGE_ARRESTER: { bg: '#FBE9E7', text: '#BF360C', border: '#FFCCBC' },
  BUSBAR: { bg: '#ECEFF1', text: '#263238', border: '#CFD8DC' },
  NER: { bg: '#FFF8E1', text: '#F57F17', border: '#FFECB3' },
  NER_CT: { bg: '#FFF8E1', text: '#F57F17', border: '#FFECB3' },
  CT: { bg: '#E0F7FA', text: '#006064', border: '#B2EBF2' },
  CT_METER: { bg: '#E0F2F1', text: '#004D40', border: '#B2DFDB' },
  NCT: { bg: '#E0F7FA', text: '#00838F', border: '#B2EBF2' },
  VT: { bg: '#E8F5E9', text: '#1B5E20', border: '#C8E6C9' },
  PQM: { bg: '#E8EAF6', text: '#1A237E', border: '#C5CAE9' },
  EPMS: { bg: '#E8EAF6', text: '#283593', border: '#C5CAE9' },
  RELAY: { bg: '#FCE4EC', text: '#AD1457', border: '#F8BBD0' },
  CUBICLE: { bg: '#EFEBE9', text: '#3E2723', border: '#D7CCC8' },
  SYNCH_CHECK: { bg: '#F3E5F5', text: '#6A1B9A', border: '#E1BEE7' },
  CABLE_DIFF: { bg: '#E3F2FD', text: '#0D47A1', border: '#BBDEFB' },
  L4_INTEGRATION: { bg: '#E3F2FD', text: '#1565C0', border: '#BBDEFB' },
  ENERGIZATION: { bg: '#FFF9C4', text: '#F57F17', border: '#FFF59D' },
  PROTECTION_PANEL: { bg: '#EDE7F6', text: '#4527A0', border: '#D1C4E9' },
  MK_OLTC_PANEL: { bg: '#FBE9E7', text: '#D84315', border: '#FFCCBC' },
  STABILITY_TEST: { bg: '#EDE7F6', text: '#311B92', border: '#D1C4E9' },
  HV_CABLE: { bg: '#ECEFF1', text: '#37474F', border: '#CFD8DC' },
  MV_CABLE: { bg: '#ECEFF1', text: '#455A64', border: '#CFD8DC' },
  SWITCHGEAR_OVERALL: { bg: '#E0F2F1', text: '#004D40', border: '#B2DFDB' },
  AC_DC_CHECKS: { bg: '#FFF8E1', text: '#FF6F00', border: '#FFECB3' },
  SCADA: { bg: '#E3F2FD', text: '#0D47A1', border: '#BBDEFB' },
  SUBSTATION_CHECKS: { bg: '#ECEFF1', text: '#263238', border: '#CFD8DC' },
  ESB_INTERFACE: { bg: '#E8F5E9', text: '#2E7D32', border: '#C8E6C9' },
}
const DEFAULT_COLOUR = { bg: '#F5F5F5', text: '#424242', border: '#E0E0E0' }

function getTypeColour(type) { return TYPE_COLOURS[type] || DEFAULT_COLOUR }
function getTestCount(type) {
  const custom = getCustomTemplates()
  const ct = custom.find(t => t.id === type)
  if (ct) return ct.tests.length
  return TEST_TEMPLATES[type]?.length || 0
}
function getLabel(type) {
  const custom = getCustomTemplates()
  const ct = custom.find(t => t.id === type)
  if (ct) return ct.label
  for (const group of EQUIPMENT_GROUPS) {
    const found = group.items.find(i => i.type === type)
    if (found) return found.label
  }
  return type.replace(/_/g, ' ')
}
function generateId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7) }

// ─── LINE PRESETS ────────────────────────────────────────────────────────────
const LINE_PRESETS = [
  // ─── HV PRIMARY (Main Power Path) ────────────────────────────────────────
  {
    id: 'transformer_bay', label: 'Transformer Bay', colour: '#d35400',
    hasChildren: false,
    hasSubtype: true,
    subtypes: [
      { id: 'oil', label: 'Oil Transformer' },
      { id: 'dry', label: 'Dry Transformer' },
    ],
    defaults: [
      { type: 'SURGE_ARRESTER', qty: 2 }, { type: 'EARTH_SWITCH', qty: 1 },
      { type: 'CT_HV', qty: 2 }, { type: 'VT_HV', qty: 1 },
      { type: 'CIRCUIT_BREAKER', qty: 1 },
      { type: 'TRANSFORMER', qty: 1 },
      { type: 'NER_CT', qty: 2 }, { type: 'NER', qty: 1 },
      { type: 'MK_OLTC_PANEL', qty: 1 }, { type: 'PROTECTION_PANEL', qty: 1 },
      { type: 'ENERGIZATION', qty: 1 },
    ],
    defaultsDry: [
      { type: 'SURGE_ARRESTER', qty: 2 }, { type: 'EARTH_SWITCH', qty: 1 },
      { type: 'CT_HV', qty: 2 }, { type: 'VT_HV', qty: 1 },
      { type: 'CIRCUIT_BREAKER', qty: 1 },
      { type: 'DRY_TRANSFORMER', qty: 1 },
      { type: 'PROTECTION_PANEL', qty: 1 }, { type: 'ENERGIZATION', qty: 1 },
    ],
  },
  {
    id: 'line_bay', label: 'Line Bay', colour: '#2980b9',
    hasChildren: false,
    defaults: [
      { type: 'SURGE_ARRESTER', qty: 2 }, { type: 'EARTH_SWITCH', qty: 2 },
      { type: 'CT_HV', qty: 2 }, { type: 'VT_HV', qty: 1 },
      { type: 'CIRCUIT_BREAKER', qty: 1 },
      { type: 'HV_CABLE', qty: 1 }, { type: 'ENERGIZATION', qty: 1 },
    ]
  },
  {
    id: 'bus_section', label: 'Bus Section', colour: '#1a5276',
    hasChildren: false,
    defaults: [
      { type: 'EARTH_SWITCH', qty: 4 }, { type: 'CT_HV', qty: 2 },
      { type: 'CIRCUIT_BREAKER', qty: 1 }, { type: 'BUSBAR', qty: 1 },
      { type: 'ENERGIZATION', qty: 1 },
    ]
  },
  // ─── HV SECONDARY (Protection & Cables) ──────────────────────────────────
  {
    id: 'protection', label: 'Protection & Stability', colour: '#8e44ad',
    hasChildren: false,
    defaults: [
      { type: 'PROTECTION_PANEL', qty: 1 }, { type: 'STABILITY_TEST', qty: 1 },
    ]
  },
  {
    id: 'cables', label: 'Cable Testing', colour: '#2c3e50',
    hasChildren: false,
    defaults: [ { type: 'HV_CABLE', qty: 1 }, { type: 'MV_CABLE', qty: 1 } ]
  },
  // ─── MV (Switchgear & Panels) ────────────────────────────────────────────
  {
    id: 'switchgear', label: 'Switchgear', colour: '#27ae60',
    hasChildren: true,
    hasSubtype: true,
    subtypes: [
      { id: 'ais', label: 'AIS (Air Insulated)' },
      { id: 'gis', label: 'GIS (Gas Insulated)' },
    ],
    feederTypes: [
      { id: 'incomer', label: 'Incomer', defaults: ['CUBICLE','CIRCUIT_BREAKER','CT','CT_METER','NCT','VT','EARTH_SWITCH','BUSBAR','RELAY','PQM','EPMS','L4_INTEGRATION','ENERGIZATION'] },
      { id: 'outgoing', label: 'Outgoing Feeder', defaults: ['CUBICLE','CIRCUIT_BREAKER','CT','CT_METER','NCT','VT','EARTH_SWITCH','BUSBAR','RELAY','PQM','EPMS','CABLE_DIFF','L4_INTEGRATION','ENERGIZATION'] },
      { id: 'bus_coupler', label: 'Bus Coupler', defaults: ['CUBICLE','CIRCUIT_BREAKER','CT','VT','BUSBAR','RELAY','PQM','SYNCH_CHECK','L4_INTEGRATION','ENERGIZATION'] },
      { id: 'bus_vt', label: 'Bus Bar VT', defaults: ['VT','BUSBAR','PQM'] },
      { id: 'transformer_feeder', label: 'Transformer Feeder', defaults: ['CUBICLE','CIRCUIT_BREAKER','CT','CT_METER','NCT','VT','EARTH_SWITCH','BUSBAR','RELAY','PQM','EPMS','L4_INTEGRATION','ENERGIZATION'] },
      { id: 'aux_tx_feeder', label: 'Aux Transformer Feeder', defaults: ['CUBICLE','CIRCUIT_BREAKER','CT','BUSBAR','RELAY','PQM','EPMS','L4_INTEGRATION','ENERGIZATION'] },
      { id: 'bb_earth_switch', label: 'BB Earth Switch', defaults: ['CUBICLE','CIRCUIT_BREAKER','CT','EARTH_SWITCH','BUSBAR','RELAY','PQM','ENERGIZATION'] },
      { id: 'spare', label: 'Spare', defaults: ['CUBICLE','CIRCUIT_BREAKER','CT','BUSBAR','RELAY','PQM','EPMS','ENERGIZATION'] },
    ],
    feederTypesGIS: [
      { id: 'incomer', label: 'Incomer', defaults: ['CUBICLE_GIS','CB_GIS','CT_GIS','RING_CT_GIS','VT_GIS','DS_ES_GIS','ES_GIS','SA_GIS','LCC_GIS','IED_OC_GIS','EPMS_GIS','ENERGIZATION_GIS'] },
      { id: 'outgoing', label: 'Outgoing Feeder', defaults: ['CUBICLE_GIS','CB_GIS','CT_GIS','RING_CT_GIS','VT_GIS','DS_ES_GIS','ES_GIS','SA_GIS','LCC_GIS','IED_OC_GIS','EPMS_GIS','ENERGIZATION_GIS'] },
      { id: 'bus_coupler', label: 'Bus Coupler', defaults: ['CUBICLE_GIS','CB_GIS','CT_GIS','VT_GIS','DS_ES_GIS','LCC_GIS','IED_OC_GIS','ENERGIZATION_GIS'] },
      { id: 'bus_section', label: 'Bus Section', defaults: ['CUBICLE_GIS','CB_GIS','CT_GIS','DS_ES_GIS','ES_GIS','LCC_GIS','IED_87B_GIS','ENERGIZATION_GIS'] },
      { id: 'bus_vt', label: 'Bus Bar VT', defaults: ['VT_GIS','LCC_GIS'] },
      { id: 'transformer_feeder', label: 'Transformer Feeder', defaults: ['CUBICLE_GIS','CB_GIS','CT_GIS','RING_CT_GIS','VT_GIS','DS_ES_GIS','ES_GIS','SA_GIS','HV_CABLE_GIS','LCC_GIS','IED_87T_GIS','EPMS_GIS','ENERGIZATION_GIS'] },
      { id: 'spare', label: 'Spare', defaults: ['CUBICLE_GIS','CB_GIS','CT_GIS','DS_ES_GIS','LCC_GIS','ENERGIZATION_GIS'] },
    ],
    defaults: [ { type: 'SWITCHGEAR_OVERALL', qty: 1 }, { type: 'AC_DC_CHECKS', qty: 1 } ]
  },
  {
    id: 'panel_board', label: 'Panel Board', colour: '#7f8c8d',
    hasChildren: true,
    feederTypes: [
      { id: 'pb_incomer', label: 'Incomer', defaults: ['CT','CT_METER','CIRCUIT_BREAKER','BUSBAR','RELAY','PQM','EPMS','ENERGIZATION'] },
      { id: 'pb_feeder', label: 'Feeder', defaults: ['CT','CT_METER','BUSBAR','RELAY','PQM','EPMS','ENERGIZATION'] },
      { id: 'pb_spare', label: 'Spare', defaults: ['CT','BUSBAR','ENERGIZATION'] },
    ],
    defaults: [ { type: 'BUSBAR', qty: 1 }, { type: 'ENERGIZATION', qty: 1 } ]
  },
  {
    id: 'aux_transformer', label: 'Aux Transformer', colour: '#e67e22',
    hasChildren: false,
    defaults: [
      { type: 'DRY_TRANSFORMER', qty: 1 }, { type: 'MV_CABLE', qty: 1 }, { type: 'ENERGIZATION', qty: 1 },
    ]
  },
  // ─── AUXILIARY SYSTEMS (Not on power path) ────────────────────────────────
  {
    id: 'battery_dc', label: 'Battery & DC System', colour: '#f39c12',
    hasChildren: false,
    defaults: [
      { type: 'BATTERY_BANK', qty: 1 }, { type: 'BATTERY_CHARGER', qty: 1 },
      { type: 'DC_DISTRIBUTION', qty: 1 }, { type: 'UPS', qty: 1 }, { type: 'DC_EARTH_FAULT', qty: 1 },
    ]
  },
  {
    id: 'earthing', label: 'Earthing System', colour: '#16a085',
    hasChildren: false,
    defaults: [ { type: 'EARTH_GRID', qty: 1 }, { type: 'EARTH_ELECTRODE', qty: 1 } ]
  },
  {
    id: 'substation', label: 'Substation Checks', colour: '#34495e',
    hasChildren: false,
    defaults: [ { type: 'SCADA', qty: 1 }, { type: 'ESB_INTERFACE', qty: 1 }, { type: 'SUBSTATION_CHECKS', qty: 1 } ]
  },
  // ─── CUSTOM ───────────────────────────────────────────────────────────────
  {
    id: 'blank', label: 'Custom', colour: '#95a5a6',
    hasChildren: false, defaults: []
  },
]


// ─── ALLOWED CHILD SECTIONS (restricted nesting) ────────────────────────────
// Only these parent types can have children, and only specific child types
const ALLOWED_CHILDREN = {
  transformer_bay: ['protection', 'cables', 'blank'],
  line_bay: ['protection', 'cables', 'blank'],
  bus_section: ['blank'],
  switchgear: ['cables', 'blank'],
  panel_board: ['blank'],
  protection: ['blank'],
  cables: ['blank'],
  battery_dc: ['blank'],
  earthing: ['blank'],
  substation: ['blank'],
  aux_transformer: ['blank'],
  blank: ['blank'],
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────
export default function BayBuilder({ onSubmit, onSectionChange, onFeederChange }) {
  const [lines, setLines] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bay_tree_v5')) || [] } catch { return [] }
  })
  const [selectedLine, setSelectedLine] = useState(null)
  const [selectedFeeder, setSelectedFeeder] = useState(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [paletteTarget, setPaletteTarget] = useState(null) // { lineId, feederId? }
  const [paletteFilter, setPaletteFilter] = useState('')
  const [customRefresh, setCustomRefresh] = useState(0)
  const [customCreateOpen, setCustomCreateOpen] = useState(false)
  const [addChildFor, setAddChildFor] = useState(null)
  const [scopeCollapsed, setScopeCollapsed] = useState(false)
  const [subtypePrompt, setSubtypePrompt] = useState(null) // { presetId, parentId } when awaiting AIS/GIS choice
  const [collapsedLines, setCollapsedLines] = useState({})
  const [dragEqId, setDragEqId] = useState(null)
  const [dragFeeder, setDragFeeder] = useState(null)

  useEffect(() => { localStorage.setItem('bay_tree_v5', JSON.stringify(lines)) }, [lines])

  // Auto-select first line on mount if none selected
  useEffect(() => {
    if (!selectedLine && lines.length > 0) setSelectedLine(lines[0].id)
  }, [lines.length])

  // Notify parent of active section
  useEffect(() => {
    if (onSectionChange) {
      const line = findInTree(lines, selectedLine)
      onSectionChange(line ? line.name : null)
    }
  }, [selectedLine, lines])

  // Notify parent when a feeder is selected (so Equipment Register can sync tab)
  useEffect(() => {
    if (onFeederChange) {
      if (selectedFeeder) {
        const line = findInTree(lines, selectedLine)
        const feeder = line && (line.feeders || []).find(f => f.id === selectedFeeder)
        onFeederChange(feeder ? `${feeder.ref} ${feeder.name}`.trim() : null)
      } else {
        onFeederChange(null)
      }
    }
  }, [selectedFeeder, selectedLine, lines])

  // Flatten → equipment list for COR
  useEffect(() => {
    const items = []
    function walkLines(lineList, parentName, parentPreset) {
      for (const line of lineList) {
        const hasFeeders = (line.feeders || []).length > 0
        // Use parent name for grouping children under their parent in the Equipment Register
        const sectionName = parentName || line.name
        for (const eq of (line.equipment || [])) {
          for (let q = 0; q < (eq.qty || 1); q++) {
            const suffix = (eq.qty || 1) > 1 ? ` ${q + 1}` : ''
            const feederLabel = parentName ? line.name : (hasFeeders ? 'Overall' : '')
            // Attach custom tests for custom equipment types
            let customTests = null
            if (eq.type && eq.type.startsWith('custom_')) {
              const ct = getCustomTemplates().find(t => t.id === eq.type)
              if (ct) customTests = ct.tests.map(t => ({ level: t[0], name: t[1], enabled: true }))
            }
            items.push({
              type: eq.type, name: (eq.names && eq.names[q]) || (eq.name ? `${eq.name}${suffix}` : `${getLabel(eq.type)}${suffix}`),
              displayName: (eq.names && eq.names[q]) || (eq.name ? `${eq.name}${suffix}` : `${getLabel(eq.type)}${suffix}`),
              feeder_ref: feederLabel ? `${sectionName} — ${feederLabel}` : sectionName,
              feeder_type: line.preset || 'custom',
              feeder_type_label: feederLabel || sectionName, section: line.preset || 'custom',
              child_section: parentName ? line.name : null,
              parent_section: parentName || null,
              ...(customTests ? { customTests } : {}),
            })
          }
        }
        for (const feeder of (line.feeders || [])) {
          for (const eq of feeder.equipment) {
            for (let q = 0; q < (eq.qty || 1); q++) {
              const suffix = (eq.qty || 1) > 1 ? ` ${q + 1}` : ''
              // Attach custom tests for custom equipment types in feeders
              let customTestsF = null
              if (eq.type && eq.type.startsWith('custom_')) {
                const ct = getCustomTemplates().find(t => t.id === eq.type)
                if (ct) customTestsF = ct.tests.map(t => ({ level: t[0], name: t[1], enabled: true }))
              }
              items.push({
                type: eq.type, name: (eq.names && eq.names[q]) || (eq.name ? `${eq.name}${suffix}` : `${getLabel(eq.type)}${suffix}`),
                displayName: (eq.names && eq.names[q]) || (eq.name ? `${eq.name}${suffix}` : `${getLabel(eq.type)}${suffix}`),
                feeder_ref: `${sectionName} — ${feeder.ref} ${feeder.name}`,
                feeder_type: feeder.type, feeder_type_label: feeder.name || feeder.ref,
                section: line.preset || 'switchgear',
                child_section: parentName ? line.name : null,
                parent_section: parentName || null,
                ...(customTestsF ? { customTests: customTestsF } : {}),
              })
            }
          }
        }
        if (line.children && line.children.length) walkLines(line.children, line.name, line.preset)
      }
    }
    walkLines(lines, null, null)
    onSubmit(items)
  }, [lines])

  // ── LINE OPERATIONS ──
  function addLine(presetId, parentId = null, subtype = null) {
    const preset = LINE_PRESETS.find(p => p.id === presetId)
    const allLines = flattenLines(lines)
    const count = allLines.filter(l => l.preset === presetId).length + 1
    const subtypeLabel = subtype === 'gis' ? ' (GIS)' : subtype === 'ais' ? ' (AIS)' : subtype === 'oil' ? ' (Oil)' : subtype === 'dry' ? ' (Dry)' : ''
    const name = count > 1 ? `${preset.label}${subtypeLabel} ${count}` : `${preset.label}${subtypeLabel}`
    // Pick correct defaults based on subtype
    let equipDefaults = preset.defaults || []
    if (subtype === 'dry' && preset.defaultsDry) equipDefaults = preset.defaultsDry
    if (subtype === 'gis' && preset.defaultsGIS) equipDefaults = preset.defaultsGIS
    const newLine = {
      id: generateId(), name, preset: presetId, colour: preset.colour, subtype: subtype || null,
      equipment: equipDefaults.map(d => ({ id: generateId(), type: d.type, qty: d.qty || 1, name: '' })),
      feeders: [],
      children: [],
    }
    if (parentId) {
      setLines(insertChild(lines, parentId, newLine))
    } else {
      setLines([...lines, newLine])
    }
    setSelectedLine(newLine.id)
    setSelectedFeeder(null)
    setAddChildFor(null)
  }

  function duplicateLine(id) {
    const source = lines.find(l => l.id === id)
    if (!source) return
    const newLine = {
      ...source,
      id: generateId(),
      name: (() => {
        const baseName = source.name.replace(/ \(Copy( \d+)?\)$/, '')
        const existing = lines.filter(l => l.name.startsWith(baseName + ' (Copy')).length
        return existing === 0 ? baseName + ' (Copy)' : baseName + ` (Copy ${existing + 1})`
      })(),
      equipment: source.equipment.map(e => ({ ...e, id: generateId() })),
      feeders: (source.feeders || []).map(f => ({
        ...f,
        id: generateId(),
        equipment: f.equipment.map(e => ({ ...e, id: generateId() })),
      })),
      children: [],
    }
    setLines([...lines, newLine])
  }

  function removeLine(id) {
    const idx = lines.findIndex(l => l.id === id)
    setLines(removeFromTree(lines, id))
    if (selectedLine === id) {
      // Go to previous line, or next, or null
      if (idx > 0) { setSelectedLine(lines[idx - 1].id); setSelectedFeeder(null) }
      else if (lines.length > 1) { setSelectedLine(lines[1].id); setSelectedFeeder(null) }
      else { setSelectedLine(null); setSelectedFeeder(null) }
    }
  }

  function renameLine(id, name) {
    setLines(updateInTree(lines, id, l => ({ ...l, name })))
  }

  function moveLine(id, dir) {
    setLines(moveInTree(lines, id, dir))
  }

  // ── FEEDER OPERATIONS ──
  function addFeeder(lineId, feederTypeId) {
    const line = findInTree(lines, lineId)
    const preset = LINE_PRESETS.find(p => p.id === line.preset)
    // Use GIS feeder types if line subtype is 'gis'
    const feederList = (line.subtype === 'gis' && preset?.feederTypesGIS) ? preset.feederTypesGIS : preset?.feederTypes
    const feederType = feederList?.find(f => f.id === feederTypeId)
    if (!feederType) return
    const count = (line.feeders || []).filter(f => f.type === feederTypeId).length + 1
    const ref = `${String(line.feeders.length + 1).padStart(2, '0')}${String.fromCharCode(65 + (line.feeders.length % 26))}`
    const newFeeder = {
      id: generateId(), ref, type: feederTypeId,
      name: count > 1 ? `${feederType.label} ${count}` : feederType.label,
      equipment: feederType.defaults.map(type => ({ id: generateId(), type, qty: 1, name: '' })),
    }
    setLines(updateInTree(lines, lineId, l => ({ ...l, feeders: [...(l.feeders || []), newFeeder] })))
  }

  function removeFeeder(lineId, feederId) {
    const line = findInTree(lines, lineId)
    const feeders = line?.feeders || []
    const idx = feeders.findIndex(f => f.id === feederId)
    setLines(updateInTree(lines, lineId, l => ({ ...l, feeders: (l.feeders || []).filter(f => f.id !== feederId) })))
    if (selectedFeeder === feederId) {
      // Go to previous feeder, or next, or back to line overview
      if (idx > 0) setSelectedFeeder(feeders[idx - 1].id)
      else if (feeders.length > 1) setSelectedFeeder(feeders[1].id)
      else setSelectedFeeder(null)
    }
  }

  function renameFeeder(lineId, feederId, name) {
    setLines(updateInTree(lines, lineId, l => ({
      ...l, feeders: (l.feeders || []).map(f => f.id === feederId ? { ...f, name } : f)
    })))
  }

  function moveFeeder(lineId, feederId, dir) {
    setLines(updateInTree(lines, lineId, l => {
      const feeders = [...(l.feeders || [])]
      const idx = feeders.findIndex(f => f.id === feederId)
      const newIdx = idx + dir
      if (newIdx < 0 || newIdx >= feeders.length) return l
      ;[feeders[idx], feeders[newIdx]] = [feeders[newIdx], feeders[idx]]
      return { ...l, feeders }
    }))
  }

  // ── EQUIPMENT OPERATIONS ──
  function addEquipment(lineId, feederId, type) {
    if (feederId) {
      setLines(updateInTree(lines, lineId, l => ({
        ...l, feeders: (l.feeders || []).map(f => f.id === feederId ? {
          ...f, equipment: [...f.equipment, { id: generateId(), type, qty: 1, name: '' }]
        } : f)
      })))
    } else {
      setLines(updateInTree(lines, lineId, l => ({
        ...l, equipment: [...(l.equipment || []), { id: generateId(), type, qty: 1, name: '' }]
      })))
    }
  }

  function removeEquipment(lineId, feederId, eqId) {
    if (feederId) {
      setLines(updateInTree(lines, lineId, l => ({
        ...l, feeders: (l.feeders || []).map(f => f.id === feederId ? {
          ...f, equipment: f.equipment.filter(e => e.id !== eqId)
        } : f)
      })))
    } else {
      setLines(updateInTree(lines, lineId, l => ({
        ...l, equipment: (l.equipment || []).filter(e => e.id !== eqId)
      })))
    }
  }

  function updateEquipment(lineId, feederId, eqId, updates) {
    if (feederId) {
      setLines(updateInTree(lines, lineId, l => ({
        ...l, feeders: (l.feeders || []).map(f => f.id === feederId ? {
          ...f, equipment: f.equipment.map(e => e.id === eqId ? { ...e, ...updates } : e)
        } : f)
      })))
    } else {
      setLines(updateInTree(lines, lineId, l => ({
        ...l, equipment: (l.equipment || []).map(e => e.id === eqId ? { ...e, ...updates } : e)
      })))
    }
  }

  function moveEquipment(lineId, feederId, eqId, dir) {
    const mutate = (arr) => {
      const idx = arr.findIndex(e => e.id === eqId)
      const newIdx = idx + dir
      if (newIdx < 0 || newIdx >= arr.length) return arr
      const a = [...arr]; [a[idx], a[newIdx]] = [a[newIdx], a[idx]]; return a
    }
    if (feederId) {
      setLines(updateInTree(lines, lineId, l => ({
        ...l, feeders: (l.feeders || []).map(f => f.id === feederId ? { ...f, equipment: mutate(f.equipment) } : f)
      })))
    } else {
      setLines(updateInTree(lines, lineId, l => ({ ...l, equipment: mutate(l.equipment || []) })))
    }
  }

  // ── COMPUTED ──
  const activeLine = findInTree(lines, selectedLine)
  const activeFeeder = activeLine?.feeders?.find(f => f.id === selectedFeeder)
  const activeEquipment = activeFeeder ? activeFeeder.equipment : (activeLine?.equipment || [])
  const activeLabel = activeFeeder ? activeFeeder.name : activeLine?.name
  const allLines = flattenLines(lines)
  const totalItems = allLines.reduce((s, l) => s + (l.equipment || []).reduce((ss, e) => ss + (e.qty || 1), 0) + (l.feeders || []).reduce((ss, f) => ss + f.equipment.reduce((sss, e) => sss + (e.qty || 1), 0), 0), 0)
  const totalTests = allLines.reduce((s, l) => s + (l.equipment || []).reduce((ss, e) => ss + getTestCount(e.type) * (e.qty || 1), 0) + (l.feeders || []).reduce((ss, f) => ss + f.equipment.reduce((sss, e) => sss + getTestCount(e.type) * (e.qty || 1), 0), 0), 0)


  // ── RECURSIVE TREE RENDERER ──
  function renderTreeLines(lineList, depth) {
    return lineList.map((line, lineIdx) => {
      const isActive = selectedLine === line.id && !selectedFeeder
      const hasActiveFdr = selectedLine === line.id && selectedFeeder
      const fdrCount = (line.feeders || []).length
      const childCount = (line.children || []).length
      const preset = LINE_PRESETS.find(p => p.id === line.preset)
      const isParent = preset?.hasChildren
      const showingAddChild = addChildFor === line.id
      const isCollapsed = collapsedLines[line.id] || false
      const hasCollapsible = childCount > 0 || (isParent && fdrCount > 0)
      const isLastInList = lineIdx === lineList.length - 1

      // Count total visible sub-items for connector rendering
      const visibleFeeders = (!isCollapsed && isParent) ? line.feeders || [] : []
      const visibleChildren = (!isCollapsed && childCount > 0) ? line.children : []
      const totalSubItems = visibleFeeders.length + (visibleChildren ? visibleChildren.length : 0)

      return (
        <div key={line.id}>
          {/* Line row */}
          <div onClick={() => { setSelectedLine(line.id); setSelectedFeeder(null) }}
            style={{
              padding: `10px 16px 10px ${12 + depth * 20}px`, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
              background: isActive ? '#FFF8EB' : hasActiveFdr ? '#FAFBFC' : 'transparent',
              borderLeft: isActive ? '3px solid #FF9900' : '3px solid transparent',
            }}>
            {/* Collapse/expand arrow for sections with children */}
            {hasCollapsible ? (
              <span onClick={(e) => { e.stopPropagation(); setCollapsedLines(prev => ({ ...prev, [line.id]: !prev[line.id] })) }}
                style={{ fontSize: 15, color: '#64748b', cursor: 'pointer', width: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, userSelect: 'none' }}>
                {isCollapsed ? '▸' : '▾'}
              </span>
            ) : (
              <span style={{ width: 16, flexShrink: 0 }} />
            )}
            {depth === 0 && <div style={{ width: 10, height: 10, borderRadius: '50%', background: line.colour, flexShrink: 0 }} />}
            <span
              style={{
                fontSize: depth === 0 ? 14 : 13, fontWeight: isActive ? 600 : 400, color: '#1e293b',
                flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}
            >{line.name}</span>
            {(isParent && fdrCount > 0) && (
              <span style={{ fontSize: 10, color: '#64748b', background: '#e2e8f0', borderRadius: 8, padding: '2px 6px' }}>{fdrCount}</span>
            )}
            {childCount > 0 && (
              <span style={{ fontSize: 10, color: '#64748b', background: '#e2e8f0', borderRadius: 8, padding: '2px 6px' }}>{childCount}↓</span>
            )}
            {/* Add child line button (only if this type allows children) */}
            {ALLOWED_CHILDREN[line.preset] && (
              <button onClick={(e) => { e.stopPropagation(); setAddChildFor(showingAddChild ? null : line.id) }}
                title="Add sub-section"
                style={{ fontSize: 12, color: showingAddChild ? '#FF9900' : '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}>
                +↓
              </button>
            )}
          </div>

          {/* Add-child dropdown (restricted to allowed types) */}
          {showingAddChild && ALLOWED_CHILDREN[line.preset] && (
            <div style={{ marginLeft: 12 + depth * 20 + 16 + 10, padding: '4px 0 4px 10px', borderLeft: '1px solid #FF990040' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, padding: '4px 0' }}>
                {LINE_PRESETS.filter(p => ALLOWED_CHILDREN[line.preset].includes(p.id)).map(p => (
                  <button key={p.id} onClick={(e) => { e.stopPropagation(); addLine(p.id, line.id) }} style={{
                    padding: '4px 10px', fontSize: 10, fontWeight: 600,
                    border: `1px solid ${p.colour}40`, borderRadius: 4,
                    background: `${p.colour}08`, color: p.colour, cursor: 'pointer',
                  }}>+ {p.label}</button>
                ))}
              </div>
            </div>
          )}

          {/* Feeder children (for switchgear-type lines) — standard tree connectors */}
          {visibleFeeders.length > 0 && visibleFeeders.map((feeder, fIdx) => {
            const isFdrActive = selectedFeeder === feeder.id
            const isLastSub = fIdx === visibleFeeders.length - 1 && (!visibleChildren || visibleChildren.length === 0)
            const indent = 12 + depth * 20 + 16 + 5 // align connector under parent dot center (padding + arrow + half-dot)
            return (
              <div key={feeder.id}
                onClick={() => { setSelectedLine(line.id); setSelectedFeeder(feeder.id) }}
                style={{
                  height: 32, display: 'flex', alignItems: 'center', cursor: 'pointer',
                  paddingLeft: indent + 20, paddingRight: 12,
                  background: isFdrActive ? '#FFF8EB' : 'transparent',
                  position: 'relative',
                }}>
                {/* Connector: vertical line */}
                <div style={{ position: 'absolute', left: indent, top: 0, bottom: isLastSub ? '50%' : 0, width: 1.5, background: '#e5e7eb' }} />
                {/* Connector: horizontal branch */}
                <div style={{ position: 'absolute', left: indent, top: 'calc(50% - 0.75px)', width: 12, height: 1.5, background: '#e5e7eb' }} />
                <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace', minWidth: 28 }}>{feeder.ref}</span>
                <span style={{
                  fontSize: 13, color: '#334155', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{feeder.name}</span>
                <span style={{ fontSize: 10, color: '#94a3b8' }}>{feeder.equipment.length}eq</span>
              </div>
            )
          })}

          {/* Child lines (recursive) — standard tree connectors */}
          {visibleChildren && visibleChildren.length > 0 && visibleChildren.map((child, cIdx) => {
            const isLastChild = cIdx === visibleChildren.length - 1
            const indent = 12 + depth * 20 + 16 + 5 // same indent as feeders — under parent dot center
            return (
              <div key={child.id} style={{ position: 'relative' }}>
                {/* Connector: vertical line — stops at row center (19px) for last child, full height otherwise */}
                <div style={{ position: 'absolute', left: indent, top: 0, height: isLastChild ? 19 : '100%', width: 1.5, background: '#e5e7eb', zIndex: 0 }} />
                {/* Connector: horizontal branch to child */}
                <div style={{ position: 'absolute', left: indent, top: 18.25, width: 12, height: 1.5, background: '#e5e7eb', zIndex: 0 }} />
                {/* Render the child line at depth+1 but offset by the connector space */}
                <div style={{ marginLeft: indent + 12 - (12 + (depth + 1) * 20) }}>
                  {renderTreeLines([child], depth + 1)}
                </div>
              </div>
            )
          })}
        </div>
      )
    })
  }

  return (
    <div style={{ display: 'flex', gap: 0, background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden', minWidth: 640, height: 'calc(100vh - 200px)' }}>

      {/* ═══ LEFT PANEL: TREE ═══ */}
      <div style={{ width: scopeCollapsed ? 44 : 380, minWidth: scopeCollapsed ? 44 : 320, flexShrink: 0, borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', transition: 'width 0.2s ease', overflow: 'hidden' }}>
        <div style={{ padding: scopeCollapsed ? '12px 8px' : '12px 16px', background: '#232F3E', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {!scopeCollapsed && (
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>⚡ Scope</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>{lines.length} sections · {totalItems} items · {totalTests} tests</div>
            </div>
          )}
          <button onClick={() => setScopeCollapsed(!scopeCollapsed)}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16, padding: '4px', opacity: 0.8 }}>
            {scopeCollapsed ? '▶' : '◀'}
          </button>
        </div>

        {!scopeCollapsed && (
          <div style={{ padding: '6px 0', flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {lines.length === 0 && (
              <div style={{ padding: '30px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
                Add a section to start building<br/>your substation scope
              </div>
            )}
            {renderTreeLines(lines, 0)}
        </div>
        )}

        {/* ═══ SUBTYPE PROMPT (dynamic) ═══ */}
        {subtypePrompt && (() => {
          const promptPreset = LINE_PRESETS.find(p => p.id === subtypePrompt.presetId)
          const subtypes = promptPreset?.subtypes || []
          const colours = {
            ais: { border: '#27ae60', bg: '#f0fdf4', text: '#15803d', icon: '⚡' },
            gis: { border: '#1a5276', bg: '#eff6ff', text: '#1e40af', icon: '🔒' },
            oil: { border: '#d35400', bg: '#fef3e2', text: '#c2410c', icon: '🛢️' },
            dry: { border: '#6b21a8', bg: '#faf5ff', text: '#6b21a8', icon: '🔥' },
          }
          return (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.4)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }} onClick={() => setSubtypePrompt(null)}>
            <div style={{
              background: '#fff', borderRadius: 12, padding: '24px 28px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)', minWidth: 280,
            }} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: '#1e293b' }}>{promptPreset?.label}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 16 }}>Select the type</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {subtypes.map(st => {
                  const c = colours[st.id] || { border: '#64748b', bg: '#f8fafc', text: '#334155', icon: '●' }
                  return (
                    <button key={st.id} onClick={() => { addLine(subtypePrompt.presetId, subtypePrompt.parentId, st.id); setSubtypePrompt(null) }} style={{
                      flex: 1, padding: '12px 16px', fontSize: 13, fontWeight: 700,
                      border: `2px solid ${c.border}`, borderRadius: 8,
                      background: c.bg, color: c.text, cursor: 'pointer',
                    }}>
                      {c.icon} {st.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
          )
        })()}

        {/* Add Line buttons */}
        {!scopeCollapsed && (
        <div style={{ padding: '10px 14px', borderTop: '1px solid #e2e8f0', background: '#fafbfc', flexShrink: 0, maxHeight: '45vh', overflowY: 'auto' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Add Section</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {LINE_PRESETS.filter(p => p.id !== 'blank').map(p => (
              <button key={p.id} onClick={() => {
                const preset = LINE_PRESETS.find(pr => pr.id === p.id)
                if (preset?.hasSubtype) { setSubtypePrompt({ presetId: p.id, parentId: null }); return }
                addLine(p.id)
              }} style={{
                padding: '9px 14px', fontSize: 13, fontWeight: 600, textAlign: 'left', width: '100%',
                border: `1.5px solid ${p.colour}30`, borderRadius: 6,
                background: `${p.colour}06`, color: p.colour, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: p.colour, flexShrink: 0 }} />
                {p.label}
              </button>
            ))}
            <button onClick={() => addLine('blank')} style={{
              padding: '9px 14px', fontSize: 13, fontWeight: 500, textAlign: 'left', width: '100%',
              border: '1.5px dashed #d1d5db', borderRadius: 6,
              background: '#fff', color: '#64748b', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 10, marginTop: 2,
            }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#95a5a6', flexShrink: 0 }} />
              Custom Line
            </button>
          </div>
        </div>
        )}
      </div>

      {/* ═══ RIGHT PANEL: DETAIL ═══ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 360, maxHeight: 'calc(100vh - 200px)' }}>
        {activeLine ? (
          <>
            {/* Header */}
            <div style={{ padding: '10px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 10, background: '#fafbfc', flexShrink: 0 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: activeLine.colour }} />
              {/* Breadcrumb: Line > Feeder */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                {!activeFeeder ? (
                  <input value={activeLine.name}
                    onChange={(e) => renameLine(activeLine.id, e.target.value)}
                    style={{
                      fontSize: 14, fontWeight: 700, color: '#1e293b', border: 'none', outline: 'none',
                      background: 'transparent', borderBottom: '1.5px solid #e2e8f0', padding: '2px 4px',
                      borderRadius: 0, width: '100%', maxWidth: 240,
                    }}
                    onFocus={(e) => e.currentTarget.style.borderBottomColor = '#FF9900'}
                    onBlur={(e) => e.currentTarget.style.borderBottomColor = '#e2e8f0'}
                  />
                ) : (
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', cursor: 'pointer' }}
                    onClick={() => setSelectedFeeder(null)}>
                    {activeLine.name}
                  </span>
                )}
                {activeFeeder && (
                  <>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>›</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#64748b', marginRight: 4 }}>{activeFeeder.ref}</span>
                    <input value={activeFeeder.name}
                      onChange={(e) => renameFeeder(activeLine.id, activeFeeder.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        fontSize: 14, fontWeight: 700, color: '#1e293b', border: 'none', outline: 'none',
                        background: 'transparent', borderBottom: '1.5px solid #e2e8f0', padding: '2px 4px',
                        borderRadius: 0, width: '100%', maxWidth: 180,
                      }}
                      onFocus={(e) => e.currentTarget.style.borderBottomColor = '#FF9900'}
                      onBlur={(e) => e.currentTarget.style.borderBottomColor = '#e2e8f0'}
                    />
                  </>
                )}
              </div>
              <span style={{ fontSize: 10, color: '#64748b' }}>{activeEquipment.length} items · {activeEquipment.reduce((s, e) => s + getTestCount(e.type) * (e.qty || 1), 0)} tests</span>
              {activeFeeder && (
                <>
                  <button onClick={() => moveFeeder(activeLine.id, activeFeeder.id, -1)} style={moveBtn}>▲</button>
                  <button onClick={() => moveFeeder(activeLine.id, activeFeeder.id, 1)} style={moveBtn}>▼</button>
                  <button onClick={() => removeFeeder(activeLine.id, activeFeeder.id)} style={{ ...moveBtn, color: '#ef4444', borderColor: '#fecaca' }}>✕</button>
                </>
              )}
              {!activeFeeder && (
                <>
                  <button onClick={() => moveLine(activeLine.id, -1)} style={moveBtn}>▲</button>
                  <button onClick={() => moveLine(activeLine.id, 1)} style={moveBtn}>▼</button>
                  <button onClick={() => duplicateLine(activeLine.id)} style={{ ...moveBtn, color: '#3b82f6', borderColor: '#bfdbfe' }} title="Duplicate section">📋</button>
                  <button onClick={() => removeLine(activeLine.id)} style={{ ...moveBtn, color: '#ef4444', borderColor: '#fecaca' }}>✕</button>
                </>
              )}
            </div>

            {/* ═══ FEEDER MANAGER (for switchgear/panel board lines, no feeder selected) ═══ */}
            {!activeFeeder && LINE_PRESETS.find(p => p.id === activeLine.preset)?.hasChildren && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '0', minHeight: 0 }}>
                {/* Feeder list */}
                <div style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Feeders ({(activeLine.feeders || []).length})</div>
                  {(activeLine.feeders || []).length === 0 && (
                    <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: 12, border: '1px dashed #e2e8f0', borderRadius: 6, marginBottom: 8 }}>
                      No feeders yet. Add feeders below.
                    </div>
                  )}
                  {(activeLine.feeders || []).map((feeder, fIdx) => (
                    <div key={feeder.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                      borderRadius: 6, marginBottom: 4,
                      border: dragFeeder === feeder.id ? '1px solid #FF9900' : '1px solid #f1f5f9',
                      background: '#fafbfc', cursor: 'grab', transition: 'all 0.15s',
                      opacity: dragFeeder === feeder.id ? 0.5 : 1,
                    }}
                      draggable
                      onDragStart={(e) => { setDragFeeder(feeder.id); e.dataTransfer.effectAllowed = 'move' }}
                      onDragEnd={() => setDragFeeder(null)}
                      onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#FF9900' }}
                      onDragLeave={(e) => { e.currentTarget.style.borderColor = '#f1f5f9' }}
                      onDrop={(e) => {
                        e.preventDefault(); e.currentTarget.style.borderColor = '#f1f5f9'
                        if (dragFeeder && dragFeeder !== feeder.id) {
                          const feeders = [...(activeLine.feeders || [])]
                          const fromIdx = feeders.findIndex(f => f.id === dragFeeder)
                          const toIdx = feeders.findIndex(f => f.id === feeder.id)
                          if (fromIdx >= 0 && toIdx >= 0) {
                            const [moved] = feeders.splice(fromIdx, 1)
                            feeders.splice(toIdx, 0, moved)
                            setLines(updateInTree(lines, activeLine.id, l => ({ ...l, feeders })))
                          }
                        }
                        setDragFeeder(null)
                      }}
                      onMouseEnter={e => { if (!dragFeeder) e.currentTarget.style.borderColor = '#FF990060' }}
                      onMouseLeave={e => { if (!dragFeeder) e.currentTarget.style.borderColor = '#f1f5f9' }}
                    >
                      <span style={{ cursor: 'grab', color: '#c0c0c0', fontSize: 14, userSelect: 'none' }}>≡</span>
                      <input value={feeder.ref}
                        onChange={(e) => { e.stopPropagation(); setLines(updateInTree(lines, activeLine.id, l => ({ ...l, feeders: (l.feeders || []).map(f => f.id === feeder.id ? { ...f, ref: e.target.value } : f) }))) }}
                        onClick={(e) => e.stopPropagation()}
                        style={{ fontSize: 11, color: '#475569', fontFamily: 'monospace', fontWeight: 600, width: 44, border: '1px solid #e2e8f0', borderRadius: 4, padding: '3px 4px', background: '#fff', textAlign: 'center' }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = '#FF9900' }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0' }}
                      />
                      <input value={feeder.name}
                        onChange={(e) => { e.stopPropagation(); renameFeeder(activeLine.id, feeder.id, e.target.value) }}
                        onClick={(e) => e.stopPropagation()}
                        style={{ flex: 1, fontSize: 13, border: 'none', outline: 'none', background: 'transparent', color: '#1e293b', fontWeight: 500 }}
                      />
                      <span style={{ fontSize: 10, color: '#94a3b8' }}>{feeder.equipment.length} items</span>
                      <button onClick={(e) => { e.stopPropagation(); removeFeeder(activeLine.id, feeder.id) }}
                        style={{ ...moveBtn, color: '#ef4444', borderColor: '#fecaca' }}>✕</button>
                    </div>
                  ))}

                  {/* Quick-add feeder buttons */}
                  <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {(() => { const _p = LINE_PRESETS.find(p => p.id === activeLine.preset); return ((activeLine.subtype === 'gis' && _p?.feederTypesGIS) ? _p.feederTypesGIS : _p?.feederTypes) || [] })().map(ft => (
                      <button key={ft.id} onClick={() => addFeeder(activeLine.id, ft.id)}
                        style={{
                          padding: '6px 12px', fontSize: 11, fontWeight: 600,
                          border: '1.5px solid #27ae6030', borderRadius: 5,
                          background: '#27ae6008', color: '#27ae60', cursor: 'pointer',
                        }}>
                        + {ft.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Overall equipment (small section below) */}
                {(activeLine.equipment || []).length > 0 && (
                  <div style={{ padding: '12px 16px', borderTop: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Overall Equipment</div>
                    {(activeLine.equipment || []).map(eq => {
                      const tc = getTypeColour(eq.type)
                      return (
                        <div key={eq.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', marginBottom: 3, borderRadius: 4, border: '1px solid #f1f5f9' }}>
                          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 3, background: tc.bg, color: tc.text, border: `1px solid ${tc.border}` }}>{getLabel(eq.type)}</span>
                          <span style={{ flex: 1, fontSize: 11, color: '#475569' }}>{eq.name || getLabel(eq.type)}</span>
                          <span style={{ fontSize: 9, color: '#94a3b8' }}>{getTestCount(eq.type)} tests</span>
                          <button onClick={() => removeEquipment(activeLine.id, null, eq.id)}
                            style={{ fontSize: 11, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}
                            onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                            onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                          >✕</button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ═══ NORMAL EQUIPMENT LIST (for non-switchgear lines OR when viewing a feeder) ═══ */}
            {(activeFeeder || !LINE_PRESETS.find(p => p.id === activeLine.preset)?.hasChildren) && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px' }}>
                {activeEquipment.length === 0 && (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: 12, border: '1px dashed #e2e8f0', borderRadius: 6 }}>
                    No equipment. Click "+ Add Equipment" below.
                  </div>
                )}
                {activeEquipment.map(eq => {
                  const tc = getTypeColour(eq.type)
                  const qty = eq.qty || 1
                  const names = eq.names || []
                  return (
                    <div key={eq.id} style={{ marginBottom: 3 }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                        borderRadius: 6, border: dragEqId === eq.id ? '1px solid #FF9900' : '1px solid #f1f5f9',
                        opacity: dragEqId === eq.id ? 0.5 : 1,
                        cursor: 'grab', transition: 'border-color 0.15s, opacity 0.15s',
                      }}
                        draggable
                        onDragStart={(e) => { setDragEqId(eq.id); e.dataTransfer.effectAllowed = 'move' }}
                        onDragEnd={() => setDragEqId(null)}
                        onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#FF9900' }}
                        onDragLeave={(e) => { e.currentTarget.style.borderColor = '#f1f5f9' }}
                        onDrop={(e) => {
                          e.preventDefault(); e.currentTarget.style.borderColor = '#f1f5f9'
                          if (dragEqId && dragEqId !== eq.id) {
                            // Reorder: move dragged item to this position
                            const lineId = activeLine.id
                            const feederId = activeFeeder?.id || null
                            const allEq = feederId
                              ? (findInTree(lines, lineId)?.feeders?.find(f => f.id === feederId)?.equipment || [])
                              : (findInTree(lines, lineId)?.equipment || [])
                            const fromIdx = allEq.findIndex(e2 => e2.id === dragEqId)
                            const toIdx = allEq.findIndex(e2 => e2.id === eq.id)
                            if (fromIdx >= 0 && toIdx >= 0) {
                              const reorder = (arr) => {
                                const newArr = [...arr]
                                const [moved] = newArr.splice(fromIdx, 1)
                                newArr.splice(toIdx, 0, moved)
                                return newArr
                              }
                              if (feederId) {
                                setLines(updateInTree(lines, lineId, l => ({
                                  ...l, feeders: (l.feeders || []).map(f => f.id === feederId ? { ...f, equipment: reorder(f.equipment) } : f)
                                })))
                              } else {
                                setLines(updateInTree(lines, lineId, l => ({ ...l, equipment: reorder(l.equipment || []) })))
                              }
                            }
                          }
                          setDragEqId(null)
                        }}
                      >
                        {/* Drag handle */}
                        <span style={{ cursor: 'grab', color: '#c0c0c0', fontSize: 14, userSelect: 'none' }}>≡</span>
                        {/* Type badge */}
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 4,
                          background: tc.bg, color: tc.text, border: `1px solid ${tc.border}`,
                          whiteSpace: 'nowrap',
                        }}>{getLabel(eq.type)}</span>
                        {/* Name inputs */}
                        {qty === 1 && (
                          <input value={eq.name || ''} onChange={(e) => updateEquipment(activeLine.id, activeFeeder?.id || null, eq.id, { name: e.target.value })}
                            placeholder={getLabel(eq.type)}
                            style={{ flex: 1, fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 4, padding: '5px 10px', color: '#334155', minWidth: 80 }} />
                        )}
                        {qty > 1 && (
                          <div style={{ flex: 1, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {Array.from({ length: qty }, (_, i) => (
                              <input key={i}
                                value={(names[i]) || ''}
                                onChange={(e) => {
                                  const newNames = [...names]
                                  while (newNames.length <= i) newNames.push('')
                                  newNames[i] = e.target.value
                                  updateEquipment(activeLine.id, activeFeeder?.id || null, eq.id, { names: newNames })
                                }}
                                placeholder={`${getLabel(eq.type)} ${i + 1}`}
                                style={{ flex: '1 1 0', minWidth: 80, fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 4, padding: '5px 10px', color: '#334155' }}
                              />
                            ))}
                          </div>
                        )}
                        {/* Test count */}
                        <span style={{ fontSize: 10, color: '#94a3b8', whiteSpace: 'nowrap' }}>{getTestCount(eq.type)} tests</span>
                        {/* Qty */}
                        <span style={{ fontSize: 10, color: '#64748b', fontWeight: 500 }}>Qty</span>
                        <input type="number" min="1" max="20" value={qty}
                          onChange={(e) => {
                          const newQty = Math.max(1, parseInt(e.target.value) || 1)
                          const updates = { qty: newQty }
                          if (newQty === 1 && names.length > 0 && names[0]) {
                            updates.name = names[0]
                            updates.names = []
                          }
                          updateEquipment(activeLine.id, activeFeeder?.id || null, eq.id, updates)
                        }}
                          style={{ width: 38, fontSize: 12, textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: 4, padding: '4px 0' }} />
                        {/* Remove */}
                        <button onClick={() => removeEquipment(activeLine.id, activeFeeder?.id || null, eq.id)}
                          style={{ fontSize: 11, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Bottom bar */}
            <div style={{ padding: '8px 16px', borderTop: '1px solid #e2e8f0', background: '#fafbfc', display: 'flex', gap: 8, flexShrink: 0 }}>
              <button onClick={() => { setPaletteTarget({ lineId: activeLine.id, feederId: activeFeeder?.id || null }); setPaletteOpen(true) }}
                style={{ flex: 1, padding: '8px', fontSize: 12, fontWeight: 600, background: '#232F3E', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                + Add Equipment
              </button>

            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
            ← Select a line to view & edit equipment
          </div>
        )}
      </div>

      {/* ═══ EQUIPMENT PALETTE ═══ */}
      {paletteOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(2px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => { setPaletteOpen(false); setPaletteFilter('') }}>
          <div style={{ position: 'relative', background: '#fff', borderRadius: 14, width: '90vw', maxWidth: 1200, height: '92vh', boxShadow: '0 25px 50px rgba(0,0,0,0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}>
            {/* Search header */}
            <div style={{ padding: '16px 24px 14px', background: '#232F3E' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 10 }}>Add Equipment</div>
              <input autoFocus value={paletteFilter} onChange={e => setPaletteFilter(e.target.value)}
                placeholder="Search..." style={{ width: '100%', fontSize: 13, border: 'none', borderRadius: 8, padding: '10px 14px', outline: 'none', background: '#f8fafc' }} />
            </div>
            {/* Multi-column equipment grid */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexWrap: 'wrap', gap: 0, alignItems: 'flex-start', justifyContent: 'center' }}>
              {EQUIPMENT_GROUPS.map(group => {
                const filtered = group.items.filter(i => i.label.toLowerCase().includes(paletteFilter.toLowerCase()) || i.type.toLowerCase().includes(paletteFilter.toLowerCase()))
                if (!filtered.length) return null
                return (
                  <div key={group.label} style={{ width: '23%', minWidth: 180, paddingRight: 16, marginBottom: 20 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px', paddingBottom: 4, borderBottom: '2px solid #FF9900' }}>{group.label}</div>
                    {filtered.map(item => {
                      const tc = getTypeColour(item.type)
                      return (
                        <button key={item.type}
                          onClick={() => { addEquipment(paletteTarget.lineId, paletteTarget.feederId, item.type) }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
                            padding: '7px 8px', fontSize: 12, border: 'none', background: 'transparent',
                            cursor: 'pointer', color: '#1e293b', borderRadius: 4, transition: 'background 0.1s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: tc.text, flexShrink: 0 }} />
                          <span style={{ flex: 1 }}>{item.label}</span>
                          <span style={{ fontSize: 10, color: '#b0b0b0' }}>{getTestCount(item.type)}</span>
                        </button>
                      )
                    })}
                  </div>
                )
              })}

              {/* ─── CUSTOM EQUIPMENT SECTION ─── */}
              {(() => {
                const customTemplates = getCustomTemplates()
                const filteredCustom = customTemplates.filter(t =>
                  t.label.toLowerCase().includes(paletteFilter.toLowerCase()) ||
                  t.id.toLowerCase().includes(paletteFilter.toLowerCase())
                )
                if (filteredCustom.length === 0 && !paletteFilter) {
                  return (
                    <div style={{ width: '23%', minWidth: 180, paddingRight: 16, marginBottom: 20 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px', paddingBottom: 4, borderBottom: '2px solid #60a5fa' }}>Custom Equipment</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', padding: '8px 0', fontStyle: 'italic' }}>No custom types yet</div>
                      <button
                        onClick={() => setCustomCreateOpen(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', textAlign: 'left', padding: '7px 8px', fontSize: 12, border: '1px dashed #60a5fa', background: 'transparent', cursor: 'pointer', color: '#60a5fa', borderRadius: 4, marginTop: 4 }}
                      >
                        <span>+</span><span>Create Custom</span>
                      </button>
                    </div>
                  )
                }
                if (filteredCustom.length === 0 && paletteFilter) return null
                return (
                  <div style={{ width: '23%', minWidth: 180, paddingRight: 16, marginBottom: 20 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px', paddingBottom: 4, borderBottom: '2px solid #60a5fa' }}>Custom Equipment</div>
                    {filteredCustom.map(ct => (
                      <button key={ct.id}
                        onClick={() => { addEquipment(paletteTarget.lineId, paletteTarget.feederId, ct.id) }}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', padding: '7px 8px', fontSize: 12, border: 'none', background: 'transparent', cursor: 'pointer', color: '#1e293b', borderRadius: 4, transition: 'background 0.1s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#60a5fa', flexShrink: 0 }} />
                        <span style={{ flex: 1 }}>{ct.label}</span>
                        <span style={{ fontSize: 10, color: '#b0b0b0' }}>{ct.tests.length}</span>
                      </button>
                    ))}
                    <button
                      onClick={() => setCustomCreateOpen(true)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', textAlign: 'left', padding: '7px 8px', fontSize: 12, border: '1px dashed #60a5fa', background: 'transparent', cursor: 'pointer', color: '#60a5fa', borderRadius: 4, marginTop: 4 }}
                    >
                      <span>+</span><span>Create Custom</span>
                    </button>
                  </div>
                )
              })()}
            </div>

            {/* ─── QUICK-CREATE CUSTOM EQUIPMENT MODAL (inside palette) ─── */}
            {customCreateOpen && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,20,25,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}
                onClick={() => setCustomCreateOpen(false)}>
                <div style={{ background: '#0f1419', border: '1px solid #2d3748', borderRadius: 10, width: 460, maxHeight: '70vh', overflow: 'auto', padding: 24 }}
                  onClick={e => e.stopPropagation()}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 16 }}>Quick Create Custom Equipment</div>
                  <QuickCustomCreate onCreated={() => { setCustomCreateOpen(false); setCustomRefresh(r => r + 1) }} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── QUICK CUSTOM CREATE (inline in palette) ─────────────────────────────────
function QuickCustomCreate({ onCreated }) {
  const [name, setName] = useState('')
  const [tests, setTests] = useState([['L3', '']])
  const LEVELS = ['L1', 'L2', 'L3', 'L4', 'L5']

  function handleSave() {
    const trimName = name.trim()
    if (!trimName) { alert('Equipment name is required'); return }
    const validTests = tests.filter(t => t[1].trim() !== '')
    if (validTests.length === 0) { alert('At least one test is required'); return }

    const template = {
      id: 'custom_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      label: trimName,
      tests: validTests.map(t => [t[0], t[1].trim()]),
      createdAt: new Date().toISOString()
    }
    const templates = getCustomTemplates()
    templates.push(template)
    localStorage.setItem('cx_custom_templates', JSON.stringify(templates))
    if (onCreated) onCreated()
  }

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase' }}>Equipment Name</div>
        <input
          value={name} onChange={e => setName(e.target.value)}
          placeholder="e.g. Fire Suppression Panel"
          autoFocus
          style={{ width: '100%', padding: '9px 12px', fontSize: 13, background: '#1a2332', border: '1px solid #2d3748', borderRadius: 6, color: '#e2e8f0', outline: 'none' }}
        />
      </div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase' }}>Tests ({tests.length})</div>
        {tests.map((t, idx) => (
          <div key={idx} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
            <select
              value={t[0]} onChange={e => { const nt = [...tests]; nt[idx] = [e.target.value, nt[idx][1]]; setTests(nt) }}
              style={{ padding: '7px 8px', fontSize: 12, background: '#1a2332', border: '1px solid #2d3748', borderRadius: 5, color: '#e2e8f0', outline: 'none' }}
            >
              {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <input
              value={t[1]} onChange={e => { const nt = [...tests]; nt[idx] = [nt[idx][0], e.target.value]; setTests(nt) }}
              placeholder="Test name..."
              style={{ flex: 1, padding: '7px 10px', fontSize: 12, background: '#1a2332', border: '1px solid #2d3748', borderRadius: 5, color: '#e2e8f0', outline: 'none' }}
            />
            <button onClick={() => setTests(tests.filter((_, i) => i !== idx))}
              style={{ padding: '5px 8px', fontSize: 11, background: '#7f1d1d', color: '#fecaca', border: 'none', borderRadius: 4, cursor: 'pointer' }}>✕</button>
          </div>
        ))}
        <button onClick={() => setTests([...tests, ['L3', '']])}
          style={{ padding: '5px 12px', fontSize: 11, border: '1px dashed #60a5fa', background: 'transparent', color: '#60a5fa', borderRadius: 5, cursor: 'pointer', marginTop: 2 }}>
          + Add Test
        </button>
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onCreated}
          style={{ padding: '7px 16px', fontSize: 12, background: '#2d3748', color: '#e2e8f0', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          Cancel
        </button>
        <button onClick={handleSave}
          style={{ padding: '7px 16px', fontSize: 12, fontWeight: 600, background: '#FF9900', color: '#0f1419', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          Create
        </button>
      </div>
    </div>
  )
}

// ─── FEEDER ADDER (dropdown for adding feeders) ─────────────────────────────
function FeederAdder({ lineId, presetId, onAdd }) {
  const [open, setOpen] = useState(false)
  const preset = LINE_PRESETS.find(p => p.id === presetId)
  if (!preset?.feederTypes) return null

  return (
    <>
      <button onClick={() => setOpen(!open)}
        style={{ padding: '8px 12px', fontSize: 11, fontWeight: 600, background: '#27ae60', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap' }}>
        + Add Feeder ▾
      </button>
      {open && (
        <div style={{
          position: 'absolute', bottom: 40, right: 0, background: '#fff', border: '1px solid #e2e8f0',
          borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: 4, zIndex: 50, minWidth: 160
        }}>
          {preset.feederTypes.map(ft => (
            <button key={ft.id} onClick={() => { onAdd(lineId, ft.id); setOpen(false) }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', fontSize: 11, border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: 4, color: '#334155' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              {ft.label}
            </button>
          ))}
        </div>
      )}
    </>
  )
}

// ─── TREE UTILITY FUNCTIONS ───────────────────────────────────────────────────────
function flattenLines(tree) {
  const result = []
  for (const l of tree) {
    result.push(l)
    if (l.children && l.children.length) result.push(...flattenLines(l.children))
  }
  return result
}

function findInTree(tree, id) {
  if (!id) return null
  for (const l of tree) {
    if (l.id === id) return l
    if (l.children && l.children.length) {
      const found = findInTree(l.children, id)
      if (found) return found
    }
  }
  return null
}

function updateInTree(tree, id, fn) {
  return tree.map(l => {
    if (l.id === id) return fn(l)
    if (l.children && l.children.length) return { ...l, children: updateInTree(l.children, id, fn) }
    return l
  })
}

function removeFromTree(tree, id) {
  return tree.filter(l => l.id !== id).map(l => ({
    ...l,
    children: l.children && l.children.length ? removeFromTree(l.children, id) : []
  }))
}

function insertChild(tree, parentId, newLine) {
  return tree.map(l => {
    if (l.id === parentId) return { ...l, children: [...(l.children || []), newLine] }
    if (l.children && l.children.length) return { ...l, children: insertChild(l.children, parentId, newLine) }
    return l
  })
}

function moveInTree(tree, id, dir) {
  const idx = tree.findIndex(l => l.id === id)
  if (idx >= 0) {
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= tree.length) return tree
    const arr = [...tree]
    ;[arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]]
    return arr
  }
  return tree.map(l => ({
    ...l,
    children: l.children && l.children.length ? moveInTree(l.children, id, dir) : []
  }))
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const moveBtn = { fontSize: 10, color: '#64748b', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 4, padding: '3px 6px', cursor: 'pointer' }
const tinyBtn = { fontSize: 11, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: '1px 2px', lineHeight: 1 }
const tabStyle = { padding: '6px 10px', fontSize: 11, cursor: 'pointer', borderBottom: '2px solid transparent', color: '#334155' }
