import { useState } from 'react'
import testTemplates from '../data/test_templates.json'

const LEVEL_COLORS = {
  'L1': { bg: '#E8F5E9', color: '#2e7d32' },
  'L2': { bg: '#E3F2FD', color: '#1565c0' },
  'L3': { bg: '#FFF8E1', color: '#f57f17' },
  'L4': { bg: '#FCE4EC', color: '#c62828' },
  'L5': { bg: '#F3E5F5', color: '#6a1b9a' },
}

/**
 * TestCustomiser — shows all tests for an equipment item with checkboxes to include/exclude.
 * Also allows adding custom tests.
 * 
 * Props:
 *   equipmentType: string (e.g. 'CT', 'TRANSFORMER', 'RELAY')
 *   selectedTests: array of {level, name, enabled} — current state
 *   onUpdate: (newTests) => void — called when tests change
 */
export default function TestCustomiser({ equipmentType, selectedTests, onUpdate }) {
  const [newTestName, setNewTestName] = useState('')
  const [newTestLevel, setNewTestLevel] = useState('L3')

  // Initialise from template if no selectedTests provided
  const tests = selectedTests && selectedTests.length > 0
    ? selectedTests
    : getDefaultTests(equipmentType)

  function getDefaultTests(type) {
    const tmpl = testTemplates[type]
    if (!tmpl) return []
    return tmpl.map(t => {
      const [level, name, testSheet] = Array.isArray(t) ? t : [t.level, t.test, '']
      return { level, name, testSheet: testSheet || '', enabled: true }
    })
  }

  function toggleTest(idx) {
    const updated = tests.map((t, i) => i === idx ? { ...t, enabled: !t.enabled } : t)
    onUpdate(updated)
  }

  function addCustomTest() {
    if (!newTestName.trim()) return
    const updated = [...tests, { level: newTestLevel, name: newTestName.trim(), testSheet: '', enabled: true, custom: true }]
    onUpdate(updated)
    setNewTestName('')
  }

  function removeTest(idx) {
    const updated = tests.filter((_, i) => i !== idx)
    onUpdate(updated)
  }

  const enabledCount = tests.filter(t => t.enabled).length
  const totalCount = tests.length

  return (
    <div style={{ padding: '12px 16px', background: '#fafbfc', borderTop: '1px solid #e2e8f0' }}>
      {/* Summary bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
          {enabledCount}/{totalCount} tests selected
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => onUpdate(tests.map(t => ({ ...t, enabled: true })))}
            style={{ fontSize: 10, padding: '3px 8px', border: '1px solid #e2e8f0', borderRadius: 4, background: '#fff', cursor: 'pointer' }}
          >
            Select All
          </button>
          <button
            onClick={() => onUpdate(tests.map(t => ({ ...t, enabled: false })))}
            style={{ fontSize: 10, padding: '3px 8px', border: '1px solid #e2e8f0', borderRadius: 4, background: '#fff', cursor: 'pointer' }}
          >
            Deselect All
          </button>
        </div>
      </div>

      {/* Test list */}
      <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff' }}>
        {tests.map((test, idx) => {
          const levelStyle = LEVEL_COLORS[test.level] || { bg: '#f1f5f9', color: '#475569' }
          return (
            <div key={idx} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 10px', borderBottom: '1px solid #f1f5f9',
              opacity: test.enabled ? 1 : 0.5,
            }}>
              <input
                type="checkbox"
                checked={test.enabled}
                onChange={() => toggleTest(idx)}
                style={{ width: 14, height: 14, accentColor: '#FF9900', cursor: 'pointer' }}
              />
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3,
                background: levelStyle.bg, color: levelStyle.color,
                minWidth: 22, textAlign: 'center'
              }}>
                {test.level}
              </span>
              <span style={{
                fontSize: 11, flex: 1, color: '#1e293b',
                textDecoration: test.enabled ? 'none' : 'line-through',
              }}>
                {test.name}
              </span>
              {test.custom && (
                <button
                  onClick={() => removeTest(idx)}
                  style={{ fontSize: 10, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}
                  title="Remove custom test"
                >
                  ✕
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Add custom test */}
      <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center' }}>
        <select
          value={newTestLevel}
          onChange={(e) => setNewTestLevel(e.target.value)}
          style={{ padding: '5px 8px', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: 11, width: 55 }}
        >
          <option value="L1">L1</option>
          <option value="L2">L2</option>
          <option value="L3">L3</option>
          <option value="L4">L4</option>
          <option value="L5">L5</option>
        </select>
        <input
          type="text"
          value={newTestName}
          onChange={(e) => setNewTestName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addCustomTest()}
          placeholder="Add custom test..."
          style={{ flex: 1, padding: '5px 10px', border: '1px solid #e2e8f0', borderRadius: 4, fontSize: 11 }}
        />
        <button
          onClick={addCustomTest}
          disabled={!newTestName.trim()}
          style={{
            padding: '5px 12px', fontSize: 11, fontWeight: 600,
            background: newTestName.trim() ? '#FF9900' : '#e2e8f0',
            color: newTestName.trim() ? '#000' : '#94a3b8',
            border: 'none', borderRadius: 4, cursor: newTestName.trim() ? 'pointer' : 'not-allowed'
          }}
        >
          + Add
        </button>
      </div>
    </div>
  )
}
