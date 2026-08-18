/**
 * Asana Project Builder (Enhanced)
 * 
 * Creates a richly structured Asana project from equipment data.
 * 
 * Features:
 *   - Custom fields: Test Level (L1-L5), Status (Not Started/In Progress/Complete)
 *   - Test checklists in task notes
 *   - Dependencies: equipment tasks chained within each section
 *   - Better visibility: emoji prefixes, section descriptions, rich task names
 *   - Timeline-optimised dates
 *
 * Structure:
 *   Project: "DUB069HV - 4th Transformer Commissioning"
 *   ├── Section: 🏁 Milestones
 *   │   ├── 🏁 Commissioning Kickoff (milestone)
 *   │   └── ⚡ Energization (milestone)
 *   ├── Section: ⚡ Transformer Bay
 *   │   ├── Surge Arrester ×2 [L3] (task with test checklist in notes)
 *   │   ├── CT (HV) ×2 [L2,L3] (depends on SA)
 *   │   └── Oil Transformer [L1-L5] (depends on CT)
 *   └── Section: 🟢 01A Incomer
 *       ├── Cubicle [L3]
 *       └── Circuit Breaker [L3,L4] (depends on Cubicle)
 */

import TEST_TEMPLATES from '../data/test_templates.json'
import {
  getWorkspaces, createProject, createSection, createTask,
  createCustomField, addCustomFieldToProject, setDependency, addMembersToProject,
} from './asanaAPI'

// ─── DISPLAY NAMES & CONFIG ──────────────────────────────────────────────────
const DISPLAY_NAMES = {
  CT: 'CT - Protection', CT_HV: 'CT (HV/Outdoor)', CT_METER: 'CT - Metering',
  NCT: 'NCT / CBCT', NER_CT: 'NER CT', VT: 'VT', VT_HV: 'VT (HV/Outdoor)',
  CIRCUIT_BREAKER: 'Circuit Breaker', EARTH_SWITCH: 'Earth Switch',
  SURGE_ARRESTER: 'Surge Arrester', TRANSFORMER: 'Oil Transformer',
  DRY_TRANSFORMER: 'Dry Transformer', NER: 'NER',
  BUSBAR: 'Busbar', HV_CABLE: 'HV Cable', MV_CABLE: 'MV Cable',
  PQM: 'Power Quality Meter', EPMS: 'EPMS', RELAY: 'Relay / IED',
  CUBICLE: 'Cubicle', PROTECTION_PANEL: 'Protection Panel',
  MK_OLTC_PANEL: 'MK & OLTC Panel', STABILITY_TEST: 'Stability Test',
  SYNCH_CHECK: 'Synch Check', CABLE_DIFF: 'Cable Diff (87L)',
  L4_INTEGRATION: 'L4 Integration', ENERGIZATION: 'Energization',
  SWITCHGEAR_OVERALL: 'Switchgear Overall', AC_DC_CHECKS: 'AC/DC Distribution',
  SCADA: 'SCADA / SAS', ESB_INTERFACE: 'Grid Interface',
  SUBSTATION_CHECKS: 'Substation Checks',
  BATTERY_BANK: 'Battery Bank', BATTERY_CHARGER: 'Charger / Rectifier',
  DC_DISTRIBUTION: 'DC Distribution', UPS: 'UPS',
  DC_EARTH_FAULT: 'DC Earth Fault Monitor',
  EARTH_GRID: 'Earth Grid', EARTH_ELECTRODE: 'Earth Electrode',
}

// Section emoji prefixes for visibility
const SECTION_EMOJIS = {
  transformer_bay: '⚡', line_bay: '🔌', bus_section: '🔀',
  switchgear: '🟢', protection: '🛡️', cables: '🔗',
  battery_dc: '🔋', earthing: '⏚', substation: '🏗️',
  aux_transformer: '🔶', panel_board: '📋', custom: '⚙️',
}

const LEVEL_LABELS = {
  L1: 'L1 - Factory Testing', L2: 'L2 - Pre-SAT',
  L3: 'L3 - SAT', L4: 'L4 - FPT', L5: 'L5 - Energization',
}

const LEVEL_SHORT = { L1: 'L1', L2: 'L2', L3: 'L3', L4: 'L4', L5: 'L5' }

function getTests(item) {
  if (item.customTests) return item.customTests.filter(t => t.enabled).map(t => [t.level, t.name])
  const tmpl = TEST_TEMPLATES[item.type]
  if (!tmpl) return [['L3', `${item.type} Test`]]
  return tmpl.map(t => [t[0], t[1]])
}

function getEquipName(item) {
  return item.displayName || item.name || DISPLAY_NAMES[item.type] || item.type
}

function getDuration(testCount) {
  if (testCount <= 3) return 1
  if (testCount <= 8) return 2
  if (testCount <= 15) return 3
  if (testCount <= 25) return 4
  return 5
}

function formatDate(date) { return date.toISOString().split('T')[0] }
function addDays(date, days) { const d = new Date(date); d.setDate(d.getDate() + days); return d }
function sleep(ms) { return new Promise(r => setTimeout(r, ms * 3)) }

// Get highest test level for an item
function getHighestLevel(tests) {
  const levels = ['L1', 'L2', 'L3', 'L4', 'L5']
  let highest = -1
  for (const [level] of tests) {
    const idx = levels.indexOf(level)
    if (idx > highest) highest = idx
  }
  return highest >= 0 ? levels[highest] : 'L3'
}

// Get all unique levels for an item
function getLevelTags(tests) {
  const unique = [...new Set(tests.map(t => t[0]))]
  const order = ['L1', 'L2', 'L3', 'L4', 'L5']
  return unique.sort((a, b) => order.indexOf(a) - order.indexOf(b))
}

// ─── MAIN BUILDER ────────────────────────────────────────────────────────────
export async function buildAsanaProject(equipmentData, projectName, onProgress, abortSignal, shareEmails = []) {
  const progress = (step, total, msg) => {
    if (onProgress) onProgress({ step, total, message: msg })
  }

  function checkAbort() {
    if (abortSignal && abortSignal.aborted) throw new Error('Cancelled')
  }

  // 1. Get workspace
  progress(1, 7, 'Finding workspace...')
  const workspaces = await getWorkspaces()
  if (!workspaces || workspaces.length === 0) throw new Error('No Asana workspaces found')
  const workspace = workspaces[0]

  // 2. Create project
  progress(2, 7, 'Creating project...')
  const project = await createProject(
    workspace.gid,
    projectName,
    `HV/MV Substation Commissioning Project\n` +
    `Generated by Cx-Dashboard on ${new Date().toLocaleDateString()}\n` +
    `Equipment items: ${equipmentData.length}\n\n` +
    `Test Levels:\n` +
    `  L1 — Factory Witness Testing\n` +
    `  L2 — Installation Verification (Pre-SAT)\n` +
    `  L3 — Site Acceptance Testing\n` +
    `  L4 — Functional Performance Testing\n` +
    `  L5 — Substation Energization`,
    'light-orange'
  )
  await sleep(300)

  // 3. Create custom fields
  progress(3, 7, 'Setting up custom fields...')

  // Test Level field (dropdown)
  let levelField = null
  try {
    levelField = await createCustomField(workspace.gid, {
      name: 'Test Level',
      resource_subtype: 'enum',
      enum_options: [
        { name: 'L1 - FWT', color: 'cool-gray' },
        { name: 'L2 - IVF', color: 'yellow-orange' },
        { name: 'L3 - SAT', color: 'yellow-green' },
        { name: 'L4 - FPT', color: 'blue' },
        { name: 'L5 - SEZ', color: 'purple' },
      ],
    })
    await addCustomFieldToProject(project.gid, levelField.gid)
    await sleep(200)
  } catch (e) {
    console.warn('Custom field (Level) error:', e.message)
  }

  // Status field (dropdown)
  let statusField = null
  try {
    statusField = await createCustomField(workspace.gid, {
      name: 'Cx Status',
      resource_subtype: 'enum',
      enum_options: [
        { name: 'Not Started', color: 'cool-gray' },
        { name: 'In Progress', color: 'yellow-orange' },
        { name: 'Complete', color: 'green' },
        { name: 'Blocked', color: 'red' },
        { name: 'N/A', color: 'light-pink' },
      ],
    })
    await addCustomFieldToProject(project.gid, statusField.gid)
    await sleep(200)
  } catch (e) {
    console.warn('Custom field (Status) error:', e.message)
  }

  // 4. Group equipment by section
  const feederGroups = {}
  for (const item of equipmentData) {
    const ref = item.feeder_ref || 'Unassigned'
    const dashIdx = ref.indexOf(' — ')
    const sectionName = dashIdx >= 0 ? ref.slice(dashIdx + 3) : ref
    if (sectionName === 'Overall') {
      const prefix = dashIdx >= 0 ? ref.slice(0, dashIdx) : ref
      const key = `${prefix} — Overall`
      if (!feederGroups[key]) feederGroups[key] = []
      feederGroups[key].push(item)
    } else {
      if (!feederGroups[sectionName]) feederGroups[sectionName] = []
      feederGroups[sectionName].push(item)
    }
  }

  // 5. Create Milestones section
  progress(4, 7, 'Creating milestones...')
  const msSection = await createSection(project.gid, '🏁 Milestones')
  const baseDate = new Date()
  baseDate.setDate(baseDate.getDate() + 1)

  const milestones = [
    { name: '🏁 Commissioning Kickoff', offset: 0 },
    { name: '📋 L2 Documentation Complete', offset: 14 },
    { name: '⚡ L3 SAT Complete', offset: 49 },
    { name: '🔗 L4 FPT Complete', offset: 63 },
    { name: '🟢 C2E — Ready for Energization', offset: 70 },
    { name: '⚡ ENERGIZATION', offset: 77 },
    { name: '✅ Declaration of Fitness', offset: 84 },
  ]

  const milestoneGids = []
  for (const ms of milestones) {
    const task = await createTask(project.gid, msSection.gid, {
      name: ms.name,
      due_on: formatDate(addDays(baseDate, ms.offset)),
      resource_subtype: 'milestone',
    })
    milestoneGids.push(task.gid)
    await sleep(200)
  }

  // 6. Chain milestones
  progress(5, 7, 'Setting milestone dependencies...')
  for (let i = 1; i < milestoneGids.length; i++) {
    try {
      await setDependency(milestoneGids[i], milestoneGids[i - 1])
      await sleep(200)
    } catch (e) { /* non-critical */ }
  }

  // 7. Create equipment sections + tasks
  const sectionNames = Object.keys(feederGroups)
  let taskDayOffset = 0
  let totalTasksCreated = 0

  for (let sIdx = 0; sIdx < sectionNames.length; sIdx++) {
    const sName = sectionNames[sIdx]
    const items = feederGroups[sName]
    progress(6, 7, `Section ${sIdx + 1}/${sectionNames.length}: ${sName} (${totalTasksCreated} tasks created)`)

    // Add emoji prefix to section name based on content
    const sectionLabel = sName
    checkAbort()
    const section = await createSection(project.gid, sectionLabel)
    await sleep(100)


    for (const item of items) {
      const equipName = getEquipName(item)
      const tests = getTests(item)
      const duration = getDuration(tests.length)
      const startDate = formatDate(addDays(baseDate, taskDayOffset))
      const dueDate = formatDate(addDays(baseDate, taskDayOffset + duration))
      const levels = getLevelTags(tests)
      const highestLevel = getHighestLevel(tests)

      // Rich task name with level indicators
      const taskName = `${equipName} [${levels.join(',')}] — ${tests.length} tests`

      // Notes: full test checklist
      const noteLines = [
        `Equipment: ${DISPLAY_NAMES[item.type] || item.type}`,
        `Tests: ${tests.length} | Levels: ${levels.join(', ')}`,
        '',
      ]
      const byLevel = {}
      for (const [level, name] of tests) {
        if (!byLevel[level]) byLevel[level] = []
        byLevel[level].push(name)
      }
      for (const level of ['L1', 'L2', 'L3', 'L4', 'L5']) {
        if (!byLevel[level]) continue
        noteLines.push(`${LEVEL_LABELS[level] || level}:`)
        for (const name of byLevel[level]) noteLines.push(`  ☐ ${name}`)
        noteLines.push('')
      }
      const notes = noteLines.join('\n')

      // Build custom field values
      const customFields = {}
      if (levelField) {
        const levelOption = levelField.enum_options?.find(o => o.name.startsWith(highestLevel))
        if (levelOption) customFields[levelField.gid] = levelOption.gid
      }
      if (statusField) {
        const notStarted = statusField.enum_options?.find(o => o.name === 'Not Started')
        if (notStarted) customFields[statusField.gid] = notStarted.gid
      }

      const taskData = {
        name: taskName,
        notes,
        start_on: startDate,
        due_on: dueDate,
      }
      if (Object.keys(customFields).length > 0) {
        taskData.custom_fields = customFields
      }

      checkAbort()
      const task = await createTask(project.gid, section.gid, taskData)
      totalTasksCreated++
      await sleep(150)





    }

    taskDayOffset += Math.max(5, items.length * 2)  // Section gap based on size
  }

  // Share with specified emails
  if (shareEmails.length > 0) {
    progress(6, 7, `Sharing with ${shareEmails.length} member(s)...`)
    try {
      await addMembersToProject(project.gid, shareEmails)
    } catch (e) {
      console.warn('Share error (non-critical):', e.message)
    }
    await sleep(200)
  }

  progress(7, 7, 'Done!')
  return {
    projectGid: project.gid,
    projectUrl: `https://app.asana.com/0/${project.gid}`,
    totalTasks: totalTasksCreated,
    sections: sectionNames.length,
    milestones: milestones.length,
  }
}
