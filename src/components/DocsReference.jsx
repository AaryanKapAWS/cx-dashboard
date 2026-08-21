import React, { useState, useRef, useEffect } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// DocsReference.jsx — Comprehensive Wiki / Reference Guide for cx-dashboard
// ═══════════════════════════════════════════════════════════════════════════════

const COLORS = {
  bg: '#0f1419',
  sidebar: '#141a22',
  card: '#1a2332',
  border: '#1e293b',
  accent: '#60a5fa',
  accentHover: '#93c5fd',
  text: '#e2e8f0',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  tableHeader: '#1a2332',
  tableRowAlt: '#151d2a',
  success: '#34d399',
  warning: '#fbbf24',
  info: '#38bdf8',
  l1: '#f472b6',
  l2: '#fb923c',
  l3: '#60a5fa',
  l4: '#a78bfa',
  l5: '#34d399',
};

// ─── Navigation Structure ────────────────────────────────────────────────────
const NAV_SECTIONS = [
  { id: 'overview', label: 'Overview', icon: '📋' },
  { id: 'quick-start', label: 'Quick Start', icon: '🚀' },
  {
    id: 'section-types', label: 'Section Types', icon: '📂',
    children: [
      { id: 'sec-oil-transformer', label: 'Oil Transformer' },
      { id: 'sec-dry-transformer', label: 'Dry Transformer' },
      { id: 'sec-switchgear-ais', label: 'Switchgear (AIS)' },
      { id: 'sec-hv-switchgear-gis', label: 'HV Switchgear (GIS)' },
      { id: 'sec-protection', label: 'Protection' },
      { id: 'sec-cables', label: 'Cables' },
      { id: 'sec-battery-dc', label: 'Battery & DC' },
      { id: 'sec-earthing', label: 'Earthing' },
      { id: 'sec-substation-checks', label: 'Substation Checks' },
      { id: 'sec-panel-board', label: 'Panel Board' },
    ],
  },
  {
    id: 'equipment-reference', label: 'Equipment Reference', icon: '⚡',
    children: [
      { id: 'eq-switchgear-overall', label: 'Switchgear Overall' },
      { id: 'eq-ct', label: 'CT' },
      { id: 'eq-vt', label: 'VT' },
      { id: 'eq-circuit-breaker', label: 'Circuit Breaker' },
      { id: 'eq-relay', label: 'Relay' },
      { id: 'eq-cubicle', label: 'Cubicle' },
      { id: 'eq-transformer', label: 'Transformer' },
      { id: 'eq-mk-oltc-panel', label: 'MK & OLTC Panel' },
      { id: 'eq-energization', label: 'Energization' },
      { id: 'eq-gis-bay', label: 'GIS Bay' },
      { id: 'eq-cb-gis', label: 'CB (GIS)' },
      { id: 'eq-ds-es-gis', label: 'DS/ES (GIS)' },
      { id: 'eq-ct-gis', label: 'CT (GIS)' },
      { id: 'eq-ied-oc-gis', label: 'IED OC (GIS)' },
      { id: 'eq-ied-87t-gis', label: 'IED 87T (GIS)' },
      { id: 'eq-battery-bank', label: 'Battery Bank' },
      { id: 'eq-ups', label: 'UPS' },
      { id: 'eq-earth-grid', label: 'Earth Grid' },
      { id: 'eq-hv-cable-gis', label: 'HV Cable (GIS)' },
      { id: 'eq-l4-integration', label: 'L4 Integration' },
    ],
  },
];

// ─── Equipment Data ──────────────────────────────────────────────────────────
const EQUIPMENT_DATA = {
  'eq-switchgear-overall': {
    name: 'Switchgear Overall',
    code: 'SWITCHGEAR_OVERALL',
    testCount: 19,
    description: 'Overall switchgear commissioning tests including busbar integrity, HV withstand, protection trip matrix, and energization checks.',
    tests: [
      { name: 'Substation Check Sheet', level: 'L3' },
      { name: 'Busbar Ductor Test', level: 'L3' },
      { name: 'Busbar Megger Test (IR)', level: 'L3' },
      { name: 'Switchgear HV Withstand Test', level: 'L3' },
      { name: 'Castel Key Interlock Test', level: 'L3' },
      { name: 'Protection Trip Matrix Test', level: 'L3' },
      { name: 'Pre Energisation Check', level: 'L3' },
      { name: 'Post Energisation Check', level: 'L3' },
      { name: 'DOF', level: 'L3' },
      { name: 'HV Test Config 1', level: 'L3' },
      { name: 'HV Test Config 2', level: 'L3' },
      { name: 'HV Test Config 3', level: 'L3' },
      { name: 'Busbar IR Test', level: 'L3' },
      { name: 'Busbar Contact Resistance', level: 'L3' },
      { name: 'Main AC Check', level: 'L3' },
      { name: 'Main DC Check', level: 'L3' },
      { name: 'BB VT Secondary Injection Test', level: 'L3' },
      { name: 'BB VT Loop Distribution Check', level: 'L4' },
      { name: 'Earth Bar CRM', level: 'L4' },
    ],
  },
  'eq-ct': {
    name: 'Current Transformer (CT)',
    code: 'CT',
    testCount: 9,
    description: 'Current transformer commissioning tests covering insulation, polarity, saturation characteristics, and ratio verification.',
    tests: [
      { name: 'Visual Inspection', level: 'L3' },
      { name: 'IR', level: 'L3' },
      { name: 'Polarity Check', level: 'L3' },
      { name: 'Saturation Curve', level: 'L3' },
      { name: 'Winding Resistance', level: 'L3' },
      { name: 'CRM and Torque', level: 'L3' },
      { name: 'Ratio Check', level: 'L3' },
      { name: 'Burden Measurement', level: 'L3' },
      { name: 'Primary Injection', level: 'L3' },
    ],
  },
  'eq-vt': {
    name: 'Voltage Transformer (VT)',
    code: 'VT',
    testCount: 13,
    description: 'Voltage transformer commissioning from factory acceptance through to energization verification.',
    tests: [
      { name: 'FAT Report', level: 'L1' },
      { name: 'FAT Observation', level: 'L1' },
      { name: 'RIF', level: 'L2' },
      { name: 'IVF', level: 'L2' },
      { name: 'Visual Inspection', level: 'L3' },
      { name: 'IR', level: 'L3' },
      { name: 'Polarity Test', level: 'L3' },
      { name: 'Winding Resistance', level: 'L3' },
      { name: 'Ratio Check', level: 'L3' },
      { name: 'VT Burden', level: 'L3' },
      { name: 'Primary Injection', level: 'L4' },
      { name: 'Pre Energization Check', level: 'L5' },
      { name: 'Post Energization Check', level: 'L5' },
    ],
  },
  'eq-circuit-breaker': {
    name: 'Circuit Breaker',
    code: 'CIRCUIT_BREAKER',
    testCount: 12,
    description: 'Circuit breaker commissioning tests covering mechanical operation, insulation, gas quality (SF6), and timing verification.',
    tests: [
      { name: 'Visual Inspection', level: 'L3' },
      { name: 'IR', level: 'L3' },
      { name: 'Contact Resistance (DCRM)', level: 'L3' },
      { name: 'Timing Check', level: 'L3' },
      { name: 'Min Voltage Operation', level: 'L3' },
      { name: 'Coil Resistance', level: 'L3' },
      { name: 'Motor Charging Current', level: 'L3' },
      { name: 'Manual/Electrical Operation', level: 'L3' },
      { name: 'SF6 Gas Purity Test', level: 'L3' },
      { name: 'SF6 Dew Point', level: 'L3' },
      { name: 'SF6 Leakage Rate Test', level: 'L3' },
      { name: 'CB Castell Key Interlock', level: 'L3' },
    ],
  },
  'eq-relay': {
    name: 'Protection Relay',
    code: 'RELAY',
    testCount: 12,
    description: 'IED/Relay commissioning tests including configuration validation, I/O verification, and protection function testing.',
    tests: [
      { name: 'Equipment Details Validation', level: 'L3' },
      { name: 'DC Supply Check', level: 'L3' },
      { name: 'Measurement Validation', level: 'L3' },
      { name: 'LED Verification', level: 'L3' },
      { name: 'DI Verification', level: 'L3' },
      { name: 'DO Verification', level: 'L3' },
      { name: 'Trip Test', level: 'L3' },
      { name: 'Disturbance Recorder Check', level: 'L3' },
      { name: 'Time Sync Check', level: 'L3' },
      { name: 'Config File Validation', level: 'L3' },
      { name: 'Final Setting Verification', level: 'L3' },
      { name: 'CB Failure Function Test', level: 'L3' },
    ],
  },
  'eq-cubicle': {
    name: 'Cubicle',
    code: 'CUBICLE',
    testCount: 11,
    description: 'Switchgear cubicle/panel commissioning from factory acceptance through scheme checks and functional verification.',
    tests: [
      { name: 'FAT Report Review', level: 'L1' },
      { name: 'FAT Observation Close-out', level: 'L1' },
      { name: 'RIF', level: 'L2' },
      { name: 'IVF', level: 'L2' },
      { name: 'AC/DC Scheme Check', level: 'L3' },
      { name: 'Inter-panel Wiring Check', level: 'L3' },
      { name: 'Voltage Detector Functional Check', level: 'L3' },
      { name: 'Spare Contact Healthiness Check', level: 'L3' },
      { name: 'MCB Checks', level: 'L3' },
      { name: 'Heater and Lighting Check', level: 'L3' },
      { name: 'Interlock Checks', level: 'L3' },
    ],
  },
  'eq-transformer': {
    name: 'Power Transformer',
    code: 'TRANSFORMER',
    testCount: 45,
    description: 'Comprehensive power transformer commissioning covering oil analysis, winding tests, insulation diagnostics, OLTC operation, and protection device verification.',
    tests: [
      { name: 'FAT Report', level: 'L1' },
      { name: 'FAT Observation', level: 'L1' },
      { name: 'RIF', level: 'L2' },
      { name: 'IVF', level: 'L2' },
      { name: 'Shock Recorders Report', level: 'L2' },
      { name: 'Oil Sample Reports', level: 'L2' },
      { name: 'Oil Filtration', level: 'L3' },
      { name: 'Turns Ratio and Vector Group Test', level: 'L3' },
      { name: 'Winding Resistances', level: 'L3' },
      { name: 'DC Winding Resistance HV', level: 'L3' },
      { name: 'DC Winding Resistance LV', level: 'L3' },
      { name: 'IR and Polarisation Index', level: 'L3' },
      { name: 'Core Clamp IR', level: 'L3' },
      { name: 'Winding Dissipation Factor', level: 'L3' },
      { name: 'Bushing DF C1', level: 'L3' },
      { name: 'SFRA', level: 'L3' },
      { name: 'Exciting Current', level: 'L3' },
      { name: 'Short-Circuit Impedance', level: 'L3' },
      { name: 'Dynamic Winding Resistance OLTC Scan', level: 'L3' },
      { name: 'OLTC Operation', level: 'L3' },
      { name: 'Magnetic Balance', level: 'L3' },
      { name: 'Demagnetisation', level: 'L3' },
      { name: 'DIRANA', level: 'L3' },
      { name: 'Pressure Test', level: 'L3' },
      { name: 'Functional Tests on Protective Devices', level: 'L3' },
      { name: 'Tests on CTs', level: 'L3' },
      { name: 'Dielectric Strength Test (Transformer Oil)', level: 'L3' },
      { name: 'Dielectric Strength Test (OLTC Oil)', level: 'L3' },
      { name: 'Oil Sampling and Gas Analysis', level: 'L3' },
      { name: 'No Load Test', level: 'L3' },
      { name: 'Exciting Current Test', level: 'L3' },
      { name: 'Dynamic OLTC Scan', level: 'L3' },
      { name: 'DC Winding Resistance LV/HV', level: 'L3' },
      { name: 'Winding DF', level: 'L3' },
      { name: 'Bushing DF C1 (repeat)', level: 'L3' },
      { name: 'Demagnetization', level: 'L3' },
      { name: 'SFRA (repeat)', level: 'L3' },
      { name: 'Short-Circuit Impedance Test', level: 'L3' },
      { name: 'Report of Impact Recorders', level: 'L3' },
      { name: 'Checks Before Assembly', level: 'L3' },
      { name: 'MK Box Scheme Check', level: 'L3' },
      { name: 'CT Primary Injection (Stability)', level: 'L4' },
      { name: 'Transformer Differential 87T/64R', level: 'L4' },
      { name: 'Cable End Torque/CRM', level: 'L4' },
    ],
  },
  'eq-mk-oltc-panel': {
    name: 'MK & OLTC Panel',
    code: 'MK_OLTC_PANEL',
    testCount: 24,
    description: 'Marshalling kiosk and OLTC panel commissioning covering protective relays, annunciators, thermometers, and oil analysis.',
    tests: [
      { name: 'MCB Checks', level: 'L2' },
      { name: 'Buchholz Relay Main Tank', level: 'L3' },
      { name: 'OLTC Protective Relay 97QC', level: 'L3' },
      { name: 'Rapid Pressure Rise Relay 66QT', level: 'L3' },
      { name: 'Pressure Relief Relay Main Tank', level: 'L3' },
      { name: 'Pressure Relief Relay OLTC', level: 'L3' },
      { name: 'Protection Relay for OLTC', level: 'L3' },
      { name: 'Sudden Pressure Relay', level: 'L3' },
      { name: 'Annunciator', level: 'L3' },
      { name: 'Dehydrating Breather Main Tank', level: 'L3' },
      { name: 'Oil Level Indicator Main Tank', level: 'L3' },
      { name: 'Oil Level Indicator OLTC', level: 'L3' },
      { name: 'Winding Thermometer HV', level: 'L3' },
      { name: 'Winding Thermometer LV', level: 'L3' },
      { name: 'U1 Device', level: 'L3' },
      { name: 'Tap Changer', level: 'L3' },
      { name: 'Tap Changer Alarm', level: 'L3' },
      { name: 'PF2/PF3', level: 'L3' },
      { name: 'Alarms and Protection Signals', level: 'L3' },
      { name: 'Result of Oil Analysis', level: 'L3' },
      { name: 'Dielectric Strength Test Transformer Oil', level: 'L3' },
      { name: 'Dielectric Strength Test OLTC Oil', level: 'L3' },
      { name: 'Oil Sampling and Gas Analysis', level: 'L3' },
      { name: 'No Load Test', level: 'L4' },
    ],
  },
  'eq-energization': {
    name: 'Energization',
    code: 'ENERGIZATION',
    testCount: 5,
    description: 'Final energization sequence tests — pre-checks, FOD inspection, live energization, post-checks, and soak period.',
    tests: [
      { name: 'Pre-Energization Safety Checks', level: 'L5' },
      { name: 'FOD Check', level: 'L5' },
      { name: 'Energization', level: 'L5' },
      { name: 'Post-Energization Check', level: 'L5' },
      { name: 'Soak Test', level: 'L5' },
    ],
  },
  'eq-gis-bay': {
    name: 'GIS Bay',
    code: 'GIS_BAY',
    testCount: 13,
    description: 'Gas-insulated switchgear bay-level tests including gas quality, interlocks, HV withstand, and control circuit verification.',
    tests: [
      { name: 'FAT report', level: 'L1' },
      { name: 'FAT Observation', level: 'L1' },
      { name: 'RIF', level: 'L2' },
      { name: 'IVF', level: 'L2' },
      { name: 'Visual Inspection', level: 'L3' },
      { name: 'SF6 Gas Quality Test', level: 'L3' },
      { name: 'Gas Density Monitor Test', level: 'L3' },
      { name: 'Switchgear Interlock Test', level: 'L3' },
      { name: 'Busbar Ductor Test', level: 'L3' },
      { name: 'HV AC Withstand Test and PD Measurement', level: 'L3' },
      { name: 'IR of Main Circuit', level: 'L3' },
      { name: 'Dielectric Test on Aux/Control', level: 'L3' },
      { name: 'Control Circuit Connection/Functional Test', level: 'L3' },
    ],
  },
  'eq-cb-gis': {
    name: 'Circuit Breaker (GIS)',
    code: 'CB_GIS',
    testCount: 25,
    description: 'GIS circuit breaker commissioning — comprehensive testing from factory acceptance through interlocks and remote operation verification.',
    tests: [
      { name: 'FAT report', level: 'L1' },
      { name: 'FAT Observation', level: 'L1' },
      { name: 'RIF', level: 'L2' },
      { name: 'IVF', level: 'L2' },
      { name: 'Visual Inspection', level: 'L3' },
      { name: 'SF6 Gas Functional Check', level: 'L3' },
      { name: 'Leakage Test', level: 'L3' },
      { name: 'Dew Point', level: 'L3' },
      { name: 'IR', level: 'L3' },
      { name: 'Contact Resistance Ductor', level: 'L3' },
      { name: 'Dynamic Contact Resistance DCRM', level: 'L3' },
      { name: 'CB Operating Timing Test', level: 'L3' },
      { name: 'Min Voltage Operation', level: 'L3' },
      { name: 'Operational Lockout', level: 'L3' },
      { name: 'Anti-Pumping', level: 'L3' },
      { name: 'Anti-Condensation Heater', level: 'L3' },
      { name: 'Pole Discrepancy Relay Timing', level: 'L3' },
      { name: 'Coil Resistance', level: 'L3' },
      { name: 'Motor Charging Current', level: 'L3' },
      { name: 'Spring Operating Mechanism', level: 'L3' },
      { name: 'Manual/Electrical Operation', level: 'L3' },
      { name: 'CB Auxiliary Circuit Check', level: 'L3' },
      { name: 'CB Castel Key Interlock', level: 'L3' },
      { name: 'CB Interlock Check', level: 'L4' },
      { name: 'Local/Remote Operation Check', level: 'L4' },
    ],
  },
  'eq-ds-es-gis': {
    name: 'Disconnector / Earth Switch (GIS)',
    code: 'DS_ES_GIS',
    testCount: 16,
    description: 'GIS disconnector and earth switch commissioning — insulation, contact resistance, motor operation, and interlock verification.',
    tests: [
      { name: 'FAT report', level: 'L1' },
      { name: 'FAT Observation', level: 'L1' },
      { name: 'RIF', level: 'L2' },
      { name: 'IVF', level: 'L2' },
      { name: 'IR', level: 'L3' },
      { name: 'Contact Resistance Ductor', level: 'L3' },
      { name: 'Motor Winding Resistance', level: 'L3' },
      { name: 'Coil Resistance', level: 'L3' },
      { name: 'Motor Current and Timing', level: 'L3' },
      { name: 'Operation at Min/Max Voltage', level: 'L3' },
      { name: 'Position Indicator Check', level: 'L3' },
      { name: 'Manual Operation', level: 'L3' },
      { name: 'Auxiliary Contacts Check', level: 'L3' },
      { name: 'Interlock Check', level: 'L3' },
      { name: 'DS Interlock', level: 'L4' },
      { name: 'ES Interlock', level: 'L4' },
    ],
  },
  'eq-ct-gis': {
    name: 'Current Transformer (GIS)',
    code: 'CT_GIS',
    testCount: 16,
    description: 'GIS current transformer commissioning — insulation diagnostics, magnetization, ratio verification, and primary injection.',
    tests: [
      { name: 'FAT report', level: 'L1' },
      { name: 'FAT Observation', level: 'L1' },
      { name: 'RIF', level: 'L2' },
      { name: 'IVF', level: 'L2' },
      { name: 'Visual Inspection', level: 'L3' },
      { name: 'IR', level: 'L3' },
      { name: 'Tan Delta', level: 'L3' },
      { name: 'Polarity', level: 'L3' },
      { name: 'Saturation/Magnetization', level: 'L3' },
      { name: 'Winding Resistance', level: 'L3' },
      { name: 'Ratio Check', level: 'L3' },
      { name: 'Burden Test', level: 'L3' },
      { name: 'Continuity/Connections', level: 'L3' },
      { name: 'Contact Resistance/Torque', level: 'L3' },
      { name: 'DGA Test for Oil', level: 'L3' },
      { name: 'CT Primary Injection', level: 'L4' },
    ],
  },
  'eq-ied-oc-gis': {
    name: 'IED Overcurrent (GIS)',
    code: 'IED_OC_GIS',
    testCount: 30,
    description: 'GIS overcurrent IED commissioning — relay configuration, I/O tests, protection function verification, SCADA integration, and synchro-check.',
    tests: [
      { name: 'Wiring Check', level: 'L3' },
      { name: 'Relay Power On', level: 'L3' },
      { name: 'Configuration Validation', level: 'L3' },
      { name: 'Meter Functional Test', level: 'L3' },
      { name: 'Breaker Trip Test', level: 'L3' },
      { name: 'Alarms/Indication', level: 'L3' },
      { name: 'Equipment Details', level: 'L3' },
      { name: 'DC Supply', level: 'L3' },
      { name: 'Measurement Validation', level: 'L3' },
      { name: 'LED Test', level: 'L3' },
      { name: 'DI Test', level: 'L3' },
      { name: 'DO Test', level: 'L3' },
      { name: 'Disturbance Recorder', level: 'L3' },
      { name: 'Time Sync', level: 'L3' },
      { name: 'Configuration File Validation', level: 'L3' },
      { name: 'Lock Out Validation', level: 'L3' },
      { name: 'Trip Circuit Supervision', level: 'L4' },
      { name: 'EPMS Signal/Screenshot', level: 'L4' },
      { name: 'RJ45 EPMS', level: 'L4' },
      { name: 'Interlock Castel Key', level: 'L4' },
      { name: 'CB Failure Function', level: 'L4' },
      { name: 'Final Setting Verification', level: 'L4' },
      { name: 'SCADA End Signal', level: 'L4' },
      { name: '25 Synchro-check', level: 'L4' },
      { name: '50/51 Phase OC', level: 'L4' },
      { name: '50N/51N Neutral OC', level: 'L4' },
      { name: '27 UV', level: 'L4' },
      { name: '59 OV', level: 'L4' },
    ],
  },
  'eq-ied-87t-gis': {
    name: 'IED Transformer Differential (GIS)',
    code: 'IED_87T_GIS',
    testCount: 36,
    description: 'GIS transformer differential IED commissioning — full relay validation plus differential, overcurrent, frequency, and directional earth fault protection.',
    tests: [
      { name: 'Wiring Check', level: 'L3' },
      { name: 'Relay Power On', level: 'L3' },
      { name: 'Configuration Validation', level: 'L3' },
      { name: 'Meter Functional Test', level: 'L3' },
      { name: 'Breaker Trip Test', level: 'L3' },
      { name: 'Alarms/Indication', level: 'L3' },
      { name: 'Equipment Details', level: 'L3' },
      { name: 'DC Supply', level: 'L3' },
      { name: 'Measurement Validation', level: 'L3' },
      { name: 'LED Test', level: 'L3' },
      { name: 'DI Test', level: 'L3' },
      { name: 'DO Test', level: 'L3' },
      { name: 'Disturbance Recorder', level: 'L3' },
      { name: 'Time Sync', level: 'L3' },
      { name: 'Configuration File Validation', level: 'L3' },
      { name: 'Lock Out Validation', level: 'L3' },
      { name: 'Trip Circuit Supervision', level: 'L4' },
      { name: 'EPMS Signal/Screenshot', level: 'L4' },
      { name: 'RJ45 EPMS', level: 'L4' },
      { name: 'Interlock Castel Key', level: 'L4' },
      { name: 'CB Failure Function', level: 'L4' },
      { name: 'Final Setting Verification', level: 'L4' },
      { name: 'SCADA End Signal', level: 'L4' },
      { name: '87T Tx Differential', level: 'L4' },
      { name: '50/51 Phase OC HV', level: 'L4' },
      { name: '50/51 Phase OC MV', level: 'L4' },
      { name: '50N/51N Neutral OC', level: 'L4' },
      { name: '50G/51G Ground OC', level: 'L4' },
      { name: '81O/81U Frequency', level: 'L4' },
      { name: '67N Directional EF', level: 'L4' },
      { name: '64REF', level: 'L4' },
      { name: '25 Synchro-check', level: 'L4' },
      { name: '27 UV', level: 'L4' },
      { name: '59 OV', level: 'L4' },
    ],
  },
  'eq-battery-bank': {
    name: 'Battery Bank',
    code: 'BATTERY_BANK',
    testCount: 14,
    description: 'Battery bank commissioning — environment checks, individual cell testing, capacity verification, and post-energization monitoring.',
    tests: [
      { name: 'RIF', level: 'L2' },
      { name: 'IVF', level: 'L2' },
      { name: 'Visual Inspection', level: 'L3' },
      { name: 'Battery Room Environment', level: 'L3' },
      { name: 'Individual Cell Voltage', level: 'L3' },
      { name: 'Individual Cell IR/Impedance', level: 'L3' },
      { name: 'Overall String Voltage', level: 'L3' },
      { name: 'Specific Gravity', level: 'L3' },
      { name: 'Electrolyte Level', level: 'L3' },
      { name: 'Inter-cell Connection Torque/Resistance', level: 'L3' },
      { name: 'IR battery to ground', level: 'L3' },
      { name: 'Capacity Discharge Test', level: 'L3' },
      { name: 'Battery Autonomy Verification', level: 'L3' },
      { name: 'Post-Energization Float Voltage', level: 'L5' },
    ],
  },
  'eq-ups': {
    name: 'UPS',
    code: 'UPS',
    testCount: 19,
    description: 'Uninterruptible power supply commissioning — startup, load testing, bypass modes, and integration signal verification.',
    tests: [
      { name: 'Visual/Mechanical Inspection', level: 'L3' },
      { name: 'Record Nameplate', level: 'L3' },
      { name: 'Check Tightness', level: 'L3' },
      { name: 'Check Grounding', level: 'L3' },
      { name: 'Pre-Startup Verification', level: 'L3' },
      { name: 'Start-Up Testing', level: 'L3' },
      { name: 'UPS Metering Calibration', level: 'L3' },
      { name: 'Burn-In Test', level: 'L3' },
      { name: 'Battery Discharge Test', level: 'L3' },
      { name: 'Normal Operating Condition', level: 'L4' },
      { name: 'Steady State Load', level: 'L4' },
      { name: 'Transient Load', level: 'L4' },
      { name: 'Bypass Mode', level: 'L4' },
      { name: 'Generator Mode', level: 'L4' },
      { name: 'Overload Test', level: 'L4' },
      { name: 'Maintenance Bypass Transfer', level: 'L4' },
      { name: 'Utility Failure/Battery Discharge', level: 'L4' },
      { name: 'EPMS Signal Check', level: 'L4' },
      { name: 'SAS Signal Check', level: 'L4' },
    ],
  },
  'eq-earth-grid': {
    name: 'Earth Grid',
    code: 'EARTH_GRID',
    testCount: 7,
    description: 'Earthing system commissioning — grid integrity, resistance measurement, step/touch voltages, and soil resistivity.',
    tests: [
      { name: 'Visual Inspection of Earth Connections', level: 'L3' },
      { name: 'Earth Grid Continuity', level: 'L3' },
      { name: 'Earth Resistance (Fall-of-Potential)', level: 'L3' },
      { name: 'Step Voltage', level: 'L3' },
      { name: 'Touch Voltage', level: 'L3' },
      { name: 'Soil Resistivity', level: 'L3' },
      { name: 'Cross-bonding/Jumper Verification', level: 'L3' },
    ],
  },
  'eq-hv-cable-gis': {
    name: 'HV Cable (GIS)',
    code: 'HV_CABLE_GIS',
    testCount: 14,
    description: 'HV cable commissioning — continuity, resistance measurements, AC withstand with PD monitoring, and termination inspection.',
    tests: [
      { name: 'RIF', level: 'L2' },
      { name: 'IVF', level: 'L2' },
      { name: 'Visual/Mechanical Inspection', level: 'L3' },
      { name: 'Cable Continuity', level: 'L3' },
      { name: 'Cable Screen Ohmic Resistance', level: 'L3' },
      { name: 'Conductor Ohmic Resistance', level: 'L3' },
      { name: 'IR for Cable Screen', level: 'L3' },
      { name: 'IR for Conductor Before AC Withstand', level: 'L3' },
      { name: 'AC Withstand Voltage Test', level: 'L3' },
      { name: 'PD Test during AC Withstand', level: 'L3' },
      { name: 'IR for Conductor After AC Withstand', level: 'L3' },
      { name: 'Cable Termination Inspection', level: 'L3' },
      { name: 'Sheath Voltage Limiting Device', level: 'L3' },
      { name: 'Cross Bonding Link Box', level: 'L3' },
    ],
  },
  'eq-l4-integration': {
    name: 'L4 Integration Tests',
    code: 'L4_INTEGRATION',
    testCount: 12,
    description: 'Level 4 system integration tests — verifying equipment interactions, SCADA connectivity, and end-to-end protection schemes.',
    tests: [
      { name: 'Local/Remote CB Operation', level: 'L4' },
      { name: 'CB Real Trips by Primary Injection', level: 'L4' },
      { name: 'CT Primary Injection', level: 'L4' },
      { name: 'Trip Circuit Supervision', level: 'L4' },
      { name: 'Lockout Relay (86)', level: 'L4' },
      { name: 'CB Close Block', level: 'L4' },
      { name: 'DI/DO to SCADA', level: 'L4' },
      { name: 'SER Input Checks', level: 'L4' },
      { name: 'RJ45 EPMS', level: 'L4' },
      { name: 'OCC File', level: 'L4' },
      { name: 'EPMS Validation/Screenshots', level: 'L4' },
      { name: 'PQM Validation', level: 'L4' },
    ],
  },
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = {
  container: {
    display: 'flex',
    height: '100vh',
    background: COLORS.bg,
    color: COLORS.text,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    overflow: 'hidden',
  },
  sidebar: {
    width: 260,
    minWidth: 260,
    background: COLORS.sidebar,
    borderRight: `1px solid ${COLORS.border}`,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  sidebarHeader: {
    padding: '20px 16px 16px',
    borderBottom: `1px solid ${COLORS.border}`,
  },
  sidebarTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: COLORS.text,
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  sidebarSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  },
  sidebarNav: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 0',
  },
  navItem: {
    padding: '8px 16px',
    fontSize: 13,
    color: COLORS.textSecondary,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    transition: 'all 0.15s',
    borderLeft: '3px solid transparent',
  },
  navItemActive: {
    color: COLORS.accent,
    background: 'rgba(96, 165, 250, 0.08)',
    borderLeft: `3px solid ${COLORS.accent}`,
  },
  navItemHover: {
    color: COLORS.text,
    background: 'rgba(255,255,255,0.03)',
  },
  navGroup: {
    padding: '6px 16px',
    fontSize: 13,
    fontWeight: 600,
    color: COLORS.text,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    userSelect: 'none',
  },
  navChild: {
    padding: '6px 16px 6px 36px',
    fontSize: 12,
    color: COLORS.textSecondary,
    cursor: 'pointer',
    transition: 'all 0.15s',
    borderLeft: '3px solid transparent',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '40px 48px',
  },
  contentInner: {
    maxWidth: 800,
    margin: '0 auto',
  },
  h1: {
    fontSize: 32,
    fontWeight: 800,
    color: COLORS.text,
    marginBottom: 8,
    lineHeight: 1.2,
  },
  h2: {
    fontSize: 24,
    fontWeight: 700,
    color: COLORS.text,
    marginTop: 48,
    marginBottom: 16,
    paddingBottom: 8,
    borderBottom: `1px solid ${COLORS.border}`,
  },
  h3: {
    fontSize: 18,
    fontWeight: 600,
    color: COLORS.text,
    marginTop: 32,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 1.7,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  code: {
    background: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 4,
    padding: '2px 6px',
    fontSize: 12,
    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
    color: COLORS.accent,
  },
  codeBlock: {
    background: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    padding: 16,
    fontSize: 12,
    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
    color: COLORS.textSecondary,
    overflowX: 'auto',
    marginBottom: 16,
    lineHeight: 1.6,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginBottom: 24,
    fontSize: 13,
  },
  th: {
    background: COLORS.tableHeader,
    padding: '10px 12px',
    textAlign: 'left',
    fontWeight: 600,
    color: COLORS.text,
    borderBottom: `2px solid ${COLORS.border}`,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  td: {
    padding: '8px 12px',
    borderBottom: `1px solid ${COLORS.border}`,
    color: COLORS.textSecondary,
  },
  badge: (level) => ({
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 700,
    background: `${COLORS[level.toLowerCase()]}20`,
    color: COLORS[level.toLowerCase()] || COLORS.accent,
    border: `1px solid ${COLORS[level.toLowerCase()] || COLORS.accent}40`,
  }),
  card: {
    background: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    padding: 20,
    marginBottom: 16,
  },
  infoBox: {
    background: 'rgba(96, 165, 250, 0.06)',
    border: `1px solid rgba(96, 165, 250, 0.2)`,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  stepGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 12,
    marginBottom: 24,
  },
  stepCard: {
    background: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    padding: 16,
    textAlign: 'center',
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: COLORS.accent,
    color: '#fff',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 8,
  },
  tagList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  tag: {
    background: 'rgba(96, 165, 250, 0.1)',
    border: `1px solid rgba(96, 165, 250, 0.25)`,
    borderRadius: 4,
    padding: '3px 8px',
    fontSize: 11,
    color: COLORS.accent,
  },
  pipelineBox: {
    background: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    padding: 20,
    marginBottom: 24,
    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
    fontSize: 12,
    lineHeight: 1.8,
    color: COLORS.textSecondary,
    overflowX: 'auto',
    whiteSpace: 'pre',
  },
};

// ─── Sub-components ──────────────────────────────────────────────────────────
function LevelBadge({ level }) {
  return <span style={styles.badge(level)}>{level}</span>;
}

function TestTable({ tests }) {
  return (
    <table style={styles.table}>
      <thead>
        <tr>
          <th style={{ ...styles.th, width: 50 }}>#</th>
          <th style={styles.th}>Test Name</th>
          <th style={{ ...styles.th, width: 70 }}>Level</th>
        </tr>
      </thead>
      <tbody>
        {tests.map((t, i) => (
          <tr key={i} style={i % 2 === 1 ? { background: COLORS.tableRowAlt } : {}}>
            <td style={styles.td}>{i + 1}</td>
            <td style={styles.td}>{t.name}</td>
            <td style={styles.td}><LevelBadge level={t.level} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function EquipmentSection({ id, data }) {
  return (
    <div id={id} style={{ marginBottom: 48 }}>
      <h3 style={styles.h3}>{data.name}</h3>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <span style={styles.code}>{data.code}</span>
        <span style={{ fontSize: 12, color: COLORS.textMuted }}>{data.testCount} tests</span>
      </div>
      <p style={styles.paragraph}>{data.description}</p>
      <TestTable tests={data.tests} />
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function DocsReference() {
  const [activeSection, setActiveSection] = useState('overview');
  const [expandedGroups, setExpandedGroups] = useState({ 'section-types': true, 'equipment-reference': true });
  const [hoveredNav, setHoveredNav] = useState(null);
  const contentRef = useRef(null);

  const scrollTo = (id) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el && contentRef.current) {
      contentRef.current.scrollTo({ top: el.offsetTop - 40, behavior: 'smooth' });
    }
  };

  const toggleGroup = (id) => {
    setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Track scroll position to highlight active nav
  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;
    const handleScroll = () => {
      const sections = container.querySelectorAll('[id]');
      let current = 'overview';
      sections.forEach(section => {
        if (section.offsetTop - 80 <= container.scrollTop) {
          current = section.id;
        }
      });
      setActiveSection(current);
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const getNavStyle = (id) => {
    const isActive = activeSection === id;
    const isHovered = hoveredNav === id;
    return {
      ...styles.navItem,
      ...(isActive ? styles.navItemActive : {}),
      ...(!isActive && isHovered ? styles.navItemHover : {}),
    };
  };

  const getChildNavStyle = (id) => {
    const isActive = activeSection === id;
    const isHovered = hoveredNav === id;
    return {
      ...styles.navChild,
      ...(isActive ? { ...styles.navItemActive, paddingLeft: 36 } : {}),
      ...(!isActive && isHovered ? styles.navItemHover : {}),
    };
  };

  return (
    <div style={styles.container}>
      {/* ═══ SIDEBAR ═══ */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <h1 style={styles.sidebarTitle}>📘 CX Dashboard</h1>
          <div style={styles.sidebarSubtitle}>Documentation</div>
        </div>
        <nav style={styles.sidebarNav}>
          {NAV_SECTIONS.map(section => {
            if (section.children) {
              return (
                <div key={section.id}>
                  <div
                    style={styles.navGroup}
                    onClick={() => toggleGroup(section.id)}
                  >
                    <span>{section.icon}</span>
                    <span style={{ flex: 1 }}>{section.label}</span>
                    <span style={{ fontSize: 10, color: COLORS.textMuted }}>
                      {expandedGroups[section.id] ? '▼' : '▶'}
                    </span>
                  </div>
                  {expandedGroups[section.id] && section.children.map(child => (
                    <div
                      key={child.id}
                      style={getChildNavStyle(child.id)}
                      onClick={() => scrollTo(child.id)}
                      onMouseEnter={() => setHoveredNav(child.id)}
                      onMouseLeave={() => setHoveredNav(null)}
                    >
                      {child.label}
                    </div>
                  ))}
                </div>
              );
            }
            return (
              <div
                key={section.id}
                style={getNavStyle(section.id)}
                onClick={() => scrollTo(section.id)}
                onMouseEnter={() => setHoveredNav(section.id)}
                onMouseLeave={() => setHoveredNav(null)}
              >
                <span>{section.icon}</span>
                <span>{section.label}</span>
              </div>
            );
          })}
        </nav>
        <div style={{ padding: '12px 16px', borderTop: `1px solid ${COLORS.border}`, fontSize: 11, color: COLORS.textMuted }}>
          v2.0 • Last updated Aug 2026
        </div>
      </aside>

      {/* ═══ CONTENT ═══ */}
      <main style={styles.content} ref={contentRef}>
        <div style={styles.contentInner}>

          {/* ──── OVERVIEW ──── */}
          <section id="overview">
            <h1 style={styles.h1}>CX Dashboard Documentation</h1>
            <p style={{ ...styles.paragraph, fontSize: 16, color: COLORS.textSecondary }}>
              Complete reference for the Commissioning (Cx) Dashboard — a structured tool for managing
              electrical substation commissioning from factory acceptance through energization.
            </p>

            <div style={styles.infoBox}>
              <strong style={{ color: COLORS.accent }}>Who is this for?</strong><br/>
              Commissioning engineers, project managers, and QA teams managing HV/MV substation
              commissioning projects. The tool tracks every test across the full IEC commissioning
              lifecycle (L1→L5).
            </div>

            <h3 style={styles.h3}>Commissioning Levels</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
              {[
                { level: 'L1', desc: 'Factory Acceptance Testing (FAT)' },
                { level: 'L2', desc: 'Receipt & Inspection (RIF/IVF)' },
                { level: 'L3', desc: 'Individual Component Testing' },
                { level: 'L4', desc: 'System Integration Testing' },
                { level: 'L5', desc: 'Energization & Soak Testing' },
              ].map(l => (
                <div key={l.level} style={{ ...styles.card, flex: '1 1 140px', minWidth: 140 }}>
                  <LevelBadge level={l.level} />
                  <div style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 6 }}>{l.desc}</div>
                </div>
              ))}
            </div>

            <h3 style={styles.h3}>Pipeline Diagram</h3>
            <div style={styles.pipelineBox}>
{` ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
 │  CREATE      │───▶│  BUILD       │───▶│  TRACK       │───▶│  EXPORT      │
 │  PROJECT     │    │  SCOPE       │    │  PROGRESS    │    │  COR         │
 └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
        │                    │                    │                    │
   Name, Client         Add Sections       Fill Results        Generate
   Location, Dates      Add Equipment      Upload Evidence     Certificate
   Team Members         Configure Tests    Sign-off Tests      of Readiness`}
            </div>
          </section>

          {/* ──── QUICK START ──── */}
          <section id="quick-start">
            <h2 style={styles.h2}>🚀 Quick Start</h2>
            <p style={styles.paragraph}>
              Get a commissioning project tracked in 4 steps:
            </p>
            <div style={styles.stepGrid}>
              {[
                { num: 1, title: 'Create Project', desc: 'Set project name, client, location, dates, and assign team members.' },
                { num: 2, title: 'Build Scope', desc: 'Add section templates (transformer, switchgear, etc.) and configure equipment within each section.' },
                { num: 3, title: 'Track Progress', desc: 'Record test results, upload evidence documents, and get engineer sign-offs for each test.' },
                { num: 4, title: 'Export COR', desc: 'Generate Certificate of Readiness package with all completed tests, evidence, and sign-off records.' },
              ].map(s => (
                <div key={s.num} style={styles.stepCard}>
                  <div style={styles.stepNumber}>{s.num}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 6 }}>{s.title}</div>
                  <div style={{ fontSize: 11, color: COLORS.textSecondary, lineHeight: 1.5 }}>{s.desc}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ──── SECTION TYPES ──── */}
          <section id="section-types">
            <h2 style={styles.h2}>📂 Section Types</h2>
            <p style={styles.paragraph}>
              Sections are the top-level organizational units in a commissioning project. Each section
              template defines the equipment types and feeder structures available. There are 11 section
              templates:
            </p>
          </section>

          <section id="sec-oil-transformer">
            <h3 style={styles.h3}>Oil Transformer</h3>
            <div style={{ marginBottom: 4 }}><span style={styles.code}>oil_transformer</span></div>
            <p style={styles.paragraph}>
              Complete oil-filled power transformer section covering the main transformer unit and all
              associated ancillary equipment through to energization.
            </p>
            <div style={styles.tagList}>
              {['Power Transformer', 'VT', 'CT', 'Surge Arrester', 'NER CT', 'Busbar', 'NER', 'MK & OLTC Panel', 'Energization'].map(t => (
                <span key={t} style={styles.tag}>{t}</span>
              ))}
            </div>
          </section>

          <section id="sec-dry-transformer">
            <h3 style={styles.h3}>Dry Transformer</h3>
            <div style={{ marginBottom: 4 }}><span style={styles.code}>dry_transformer</span></div>
            <p style={styles.paragraph}>
              Dry-type transformer section — similar to oil transformer but without OLTC-specific
              tests and oil analysis requirements.
            </p>
            <div style={styles.tagList}>
              {['Dry Transformer', 'VT', 'CT', 'Surge Arrester', 'Busbar', 'NER', 'Energization'].map(t => (
                <span key={t} style={styles.tag}>{t}</span>
              ))}
            </div>
          </section>

          <section id="sec-switchgear-ais">
            <h3 style={styles.h3}>Switchgear (AIS)</h3>
            <div style={{ marginBottom: 4 }}><span style={styles.code}>switchgear_ais</span></div>
            <p style={styles.paragraph}>
              Air-insulated switchgear section organized per-feeder. Each feeder is assigned a type
              which determines its equipment complement. Also includes overall switchgear tests.
            </p>
            <div style={{ ...styles.card, marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.text, marginBottom: 8 }}>Feeder Types:</div>
              <div style={styles.tagList}>
                {['Incomer', 'Bus Coupler', 'NER', 'Bus Bar VT', 'Outgoing Feeder', 'Aux Transformer', 'Transformer Feeder', 'Spare', 'Custom'].map(t => (
                  <span key={t} style={styles.tag}>{t}</span>
                ))}
              </div>
            </div>
            <div style={{ ...styles.card }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.text, marginBottom: 8 }}>Overall Equipment:</div>
              <div style={styles.tagList}>
                {['Switchgear Overall', 'AC/DC Checks', 'SCADA'].map(t => (
                  <span key={t} style={styles.tag}>{t}</span>
                ))}
              </div>
            </div>
          </section>

          <section id="sec-hv-switchgear-gis">
            <h3 style={styles.h3}>HV Switchgear (GIS)</h3>
            <div style={{ marginBottom: 4 }}><span style={styles.code}>hv_switchgear_gis</span></div>
            <p style={styles.paragraph}>
              Gas-insulated switchgear for 110–400kV applications. Per-feeder structure with
              GIS-specific equipment types (SF6 gas testing, GIS bay tests, etc.).
            </p>
            <div style={{ ...styles.card }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.text, marginBottom: 8 }}>Feeder Types:</div>
              <div style={styles.tagList}>
                {['Line Feeder', 'Transformer Feeder', 'Bus Section/Coupler', 'Bus Bar VT', 'Spare', 'Custom'].map(t => (
                  <span key={t} style={styles.tag}>{t}</span>
                ))}
              </div>
            </div>
          </section>

          <section id="sec-protection">
            <h3 style={styles.h3}>Protection</h3>
            <div style={{ marginBottom: 4 }}><span style={styles.code}>protection</span></div>
            <p style={styles.paragraph}>
              Protection system section for relay panels and stability testing. Used for dedicated
              protection commissioning outside of switchgear feeders.
            </p>
            <div style={styles.tagList}>
              {['Protection Panel', 'Stability Test'].map(t => (
                <span key={t} style={styles.tag}>{t}</span>
              ))}
            </div>
          </section>

          <section id="sec-cables">
            <h3 style={styles.h3}>Cables</h3>
            <div style={{ marginBottom: 4 }}><span style={styles.code}>cables</span></div>
            <p style={styles.paragraph}>
              Cable commissioning section for HV and MV power cables including withstand testing,
              partial discharge measurement, and termination checks.
            </p>
            <div style={styles.tagList}>
              {['HV Cable', 'MV Cable'].map(t => (
                <span key={t} style={styles.tag}>{t}</span>
              ))}
            </div>
          </section>

          <section id="sec-battery-dc">
            <h3 style={styles.h3}>Battery & DC Systems</h3>
            <div style={{ marginBottom: 4 }}><span style={styles.code}>battery_dc</span></div>
            <p style={styles.paragraph}>
              DC power systems section covering batteries, chargers, distribution, UPS, and earth
              fault monitoring — the backbone of protection and control power.
            </p>
            <div style={styles.tagList}>
              {['Battery Bank', 'Battery Charger', 'DC Distribution Board', 'UPS', 'DC Earth Fault Monitor'].map(t => (
                <span key={t} style={styles.tag}>{t}</span>
              ))}
            </div>
          </section>

          <section id="sec-earthing">
            <h3 style={styles.h3}>Earthing</h3>
            <div style={{ marginBottom: 4 }}><span style={styles.code}>earthing</span></div>
            <p style={styles.paragraph}>
              Earthing system section for earth grid integrity and electrode testing.
            </p>
            <div style={styles.tagList}>
              {['Earth Grid', 'Earth Electrode'].map(t => (
                <span key={t} style={styles.tag}>{t}</span>
              ))}
            </div>
          </section>

          <section id="sec-substation-checks">
            <h3 style={styles.h3}>Substation Checks</h3>
            <div style={{ marginBottom: 4 }}><span style={styles.code}>substation_checks</span></div>
            <p style={styles.paragraph}>
              General substation-level commissioning checks and grid interface verification.
            </p>
            <div style={styles.tagList}>
              {['Substation Check Sheets', 'Grid Interface Kiosk'].map(t => (
                <span key={t} style={styles.tag}>{t}</span>
              ))}
            </div>
          </section>

          <section id="sec-panel-board">
            <h3 style={styles.h3}>Panel Board</h3>
            <div style={{ marginBottom: 4 }}><span style={styles.code}>panel_board</span></div>
            <p style={styles.paragraph}>
              Panel board section organized per-feeder with CT, busbar, and protection equipment
              for each feeder position.
            </p>
            <div style={styles.tagList}>
              {['CT', 'Busbar', 'Protection'].map(t => (
                <span key={t} style={styles.tag}>{t}</span>
              ))}
            </div>
          </section>

          {/* ──── EQUIPMENT REFERENCE ──── */}
          <section id="equipment-reference">
            <h2 style={styles.h2}>⚡ Equipment Reference</h2>
            <p style={styles.paragraph}>
              Complete test listings for every equipment type. Each test is assigned a commissioning
              level (L1–L5) indicating when it should be performed in the project lifecycle.
            </p>
            <div style={styles.infoBox}>
              <strong style={{ color: COLORS.accent }}>Level Legend:</strong>{' '}
              <LevelBadge level="L1" /> Factory{' • '}
              <LevelBadge level="L2" /> Receipt{' • '}
              <LevelBadge level="L3" /> Component{' • '}
              <LevelBadge level="L4" /> Integration{' • '}
              <LevelBadge level="L5" /> Energization
            </div>
          </section>

          {Object.entries(EQUIPMENT_DATA).map(([id, data]) => (
            <section key={id} id={id}>
              <EquipmentSection id={id} data={data} />
            </section>
          ))}

          {/* Footer */}
          <div style={{ marginTop: 64, paddingTop: 24, borderTop: `1px solid ${COLORS.border}`, textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: COLORS.textMuted }}>
              CX Dashboard Documentation • v2.0 • Generated August 2026
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}
