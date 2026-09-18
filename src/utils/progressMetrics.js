/**
 * progressMetrics.js — Single source of truth for all progress calculations.
 *
 * Both ProgressTracker and AnalyticsDashboard import from here.
 * If you change a definition, both views update automatically.
 */

import testTemplates from '../data/test_templates.json'
import { getCustomTemplates } from './customTemplates'

// ── Storage keys ────────────────────────────────────────────────────────────
export const PROGRESS_KEY = 'test_progress'
export const SCHEDULE_KEY = 'test_schedule'

// ── Default progress entry (every field a test can have) ────────────────────
export const PROGRESS_DEFAULTS = {
  tested: false,             // SAT Completed        – boolean
  witnessed: false,          // CxA Witnessed         – boolean
  completed: false,          // Completed             – false | true | 'NA'
  reportReceivedDate: null,  // Report Received       – date string (YYYY-MM-DD) or null
  reportOnProcore: false,    // On Procore            – boolean
  reportReviewedDate: null,  // Report Reviewed       – date string (YYYY-MM-DD) or null
  reviewed: false,           // Reviewed              – false | true | 'NA'
  outstandingObs: false,     // Outstanding Obs       – false | true | 'NA'
  closed: false,             // Report Closed         – boolean
  comments: '',              // Comments              – free text
  critical: false,           // Critical for Energisation – boolean
}

// ── Key generators ──────────────────────────────────────────────────────────

/** Progress key for a specific test: section_equipment_index */
export function makeProgressKey(item, testIdx) {
  return `${(item.feeder_ref || 'unknown').replace(/\s/g, '_')}_${(item.displayName || item.name || item.type).replace(/\s/g, '_')}_${testIdx}`
}

/** Schedule key for an equipment group (no test index) */
export function makeScheduleKey(item) {
  return `${(item.feeder_ref || 'unknown').replace(/\s/g, '_')}_${(item.displayName || item.name || item.type).replace(/\s/g, '_')}`
}

// ── Test resolution ─────────────────────────────────────────────────────────

/** Resolve the test list for any equipment item (custom, built-in, or imported). */
export function resolveTests(item) {
  if (item.customTests && item.customTests.length > 0) {
    return item.customTests.filter(t => t.enabled !== false).map(t => [t.level || 'L3', t.name, ''])
  }
  const builtin = testTemplates[item.type]
  if (builtin && builtin.length > 0) return builtin
  const ct = getCustomTemplates().find(t => t.id === item.type)
  if (ct) return ct.tests.map(t => [t[0], t[1], ''])
  return []
}

// ── Per-test scoring ────────────────────────────────────────────────────────

/** Is this test N/A? (excluded from all counts and percentages) */
export function isNA(p) {
  return p && p.completed === 'NA'
}

/**
 * Weighted completion score for a single test (0–1 scale).
 * SAT 60% + Report Received 15% + Reviewed 15% + Closed 10%.
 * This is the same formula used in the COR Excel output.
 */
export function weightedScore(p) {
  if (!p) return 0
  let s = 0
  // Done = SAT Completed OR Completed=YES (consistent with COR formula)
  if (p.tested || p.completed === true) s += 0.6
  if (p.reportReceivedDate || p.reportDate) s += 0.15
  if (p.reviewed === true) s += 0.15
  if (p.closed) s += 0.1
  return s
}

/**
 * True only when all 4 core gates are met (for final close-out count).
 * Most UI should use weightedScore or individual flags instead.
 */
export function isFullyDone(p) {
  return p && p.tested && p.witnessed && (p.completed === true) && p.closed
}

// ── localStorage helpers ────────────────────────────────────────────────────

export function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

export function saveProgress(data) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(data))
}

export function loadSchedule() {
  try {
    const raw = localStorage.getItem(SCHEDULE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

// ── Aggregate stats (used by both Progress tab and Analytics tab) ───────────

/**
 * Compute all project-level stats from equipment + progress + schedule.
 * Returns a single object that both views can consume.
 *
 * Counts use these rules:
 *   - N/A tests (completed === 'NA') are excluded from ALL counts
 *   - tested: p.tested === true (SAT Completed)
 *   - witnessed: p.witnessed === true
 *   - completed: p.completed === true (the Completed toggle, not the 3-state 'NA')
 *   - closed: p.closed === true (Report Closed)
 *   - reportReceived: p.reportReceivedDate OR p.reportDate is truthy
 *   - reviewed: p.reviewed === true (the Reviewed toggle)
 *   - reportOnProcore: p.reportOnProcore === true
 *   - outstandingObs: p.outstandingObs === true
 *   - Rates are capped at 100% to handle data where a downstream field was set
 *     before an upstream one (e.g. reviewed without reportReceived).
 */
export function computeStats(equipment, progress, schedule = {}) {
  let totalTests = 0, tested = 0, witnessed = 0, closed = 0, naCount = 0
  let reportReceived = 0, reviewed = 0, reportOnProcore = 0, outstandingObs = 0, completed = 0
  let wSum = 0
  const turnaroundDays = []
  const sectionData = {}
  const levelData = {
    L1: { total: 0, done: 0 }, L2: { total: 0, done: 0 }, L3: { total: 0, done: 0 },
    L4: { total: 0, done: 0 }, L5: { total: 0, done: 0 },
  }
  const sectionSet = new Set()
  let eqCount = 0

  if (!equipment) return _emptyStats()

  equipment.forEach(item => {
    const tests = resolveTests(item)
    if (!tests.length) return
    eqCount++
    const section = item.feeder_ref || item.section || 'Other'
    sectionSet.add(section)
    if (!sectionData[section]) sectionData[section] = { total: 0, tested: 0, closed: 0, wSum: 0 }

    const schedKey = makeScheduleKey(item)
    const sched = schedule[schedKey]

    tests.forEach((test, idx) => {
      const key = makeProgressKey(item, idx)
      const p = progress[key]
      const lvl = test[0]

      // Skip N/A from ALL counts
      if (isNA(p)) { naCount++; return }

      totalTests++
      sectionData[section].total++
      if (levelData[lvl]) levelData[lvl].total++

      if (p) {
        // "Done" = SAT Completed OR Completed=YES (consistent with COR formula)
        const isDone = p.tested || p.completed === true
        if (isDone) { tested++; sectionData[section].tested++; if (levelData[lvl]) levelData[lvl].done++ }
        if (p.witnessed) witnessed++
        if (p.completed === true) completed++
        if (p.closed) { closed++; sectionData[section].closed++ }

        const hasReport = !!(p.reportReceivedDate || p.reportDate)
        if (hasReport) {
          reportReceived++
          const rptDateStr = p.reportReceivedDate || p.reportDate
          if (rptDateStr && sched && sched.actualFinish) {
            const satDate = new Date(sched.actualFinish)
            const rptDate = new Date(rptDateStr)
            if (!isNaN(satDate) && !isNaN(rptDate)) turnaroundDays.push(Math.round((rptDate - satDate) / 86400000))
          }
        }
        if (p.reviewed === true) reviewed++
        if (p.reportOnProcore) reportOnProcore++
        if (p.outstandingObs === true) outstandingObs++

        const ws = weightedScore(p)
        wSum += ws
        sectionData[section].wSum += ws
      }
    })
  })

  const overallPct = totalTests > 0 ? (wSum / totalTests) * 100 : 0
  const avgTurnaround = turnaroundDays.length > 0 ? Math.round(turnaroundDays.reduce((a, b) => a + b, 0) / turnaroundDays.length) : null
  const awaitingReports = Math.max(0, tested - reportReceived)

  return {
    sections: sectionSet.size, equipment: eqCount, totalTests, naCount,
    tested, witnessed, completed, closed,
    reportReceived, reviewed, reportOnProcore, outstandingObs,
    wSum, overallPct, avgTurnaround, awaitingReports,
    sectionData, levelData,
  }
}

function _emptyStats() {
  return {
    sections: 0, equipment: 0, totalTests: 0, naCount: 0,
    tested: 0, witnessed: 0, completed: 0, closed: 0,
    reportReceived: 0, reviewed: 0, reportOnProcore: 0, outstandingObs: 0,
    wSum: 0, overallPct: 0, avgTurnaround: null, awaitingReports: 0,
    sectionData: {}, levelData: { L1: { total: 0, done: 0 }, L2: { total: 0, done: 0 }, L3: { total: 0, done: 0 }, L4: { total: 0, done: 0 }, L5: { total: 0, done: 0 } },
  }
}

/** Cap a percentage to 0–100 range */
export function capPct(v) {
  return Math.min(Math.max(Math.round(v), 0), 100)
}
