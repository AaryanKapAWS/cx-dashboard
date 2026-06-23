import { useEffect, useRef } from 'react'
import testTemplates from '../data/test_templates.json'

const LEVEL_COLORS = {
  'L1': { bg: '#E8F5E9', color: '#2e7d32', label: 'FAT' },
  'L2': { bg: '#E3F2FD', color: '#1565c0', label: 'Delivery' },
  'L3': { bg: '#FFF8E1', color: '#f57f17', label: 'SAT' },
  'L4': { bg: '#FCE4EC', color: '#c62828', label: 'IST' },
  'L5': { bg: '#F3E5F5', color: '#6a1b9a', label: 'Energization' },
}

function getTests(equipment) {
  // If item has pre-defined tests, use those
  if (equipment.tests && equipment.tests.length > 0) {
    return equipment.tests.map(t => ({
      name: t.name,
      level: `L${t.level}`,
      standard: t.standard || '—',
      status: t.status || 'Not Started',
    }))
  }
  // Otherwise look up from templates
  const tmpl = testTemplates[equipment.type]
  if (!tmpl) return []
  return tmpl.map(t => {
    const [level, name] = Array.isArray(t) ? t : [t.level, t.test]
    return { name, level, standard: '—', status: 'Not Started' }
  })
}

export default function TestDetail({ equipment }) {
  const tests = getTests(equipment)
  const ref = useRef()

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [equipment])

  return (
    <div ref={ref} style={{
      background: 'var(--card-bg)', border: '1px solid var(--orange)',
      borderRadius: 10, margin: '12px 32px 0',
      boxShadow: '0 4px 16px rgba(255,153,0,0.08)',
      overflow: 'hidden',
      animation: 'slideDown 0.2s ease',
    }}>
      <style>{`@keyframes slideDown { from { opacity:0; transform:translateY(-8px) } to { opacity:1; transform:translateY(0) } }`}</style>

      {/* Header */}
      <div style={{ padding: '16px 24px', background: '#fff8ed', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{equipment.name}</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 28 }}>
          Type: <strong style={{ color: '#475569' }}>{equipment.type}</strong>
          {equipment.manufacturer && <>{' · '}Manufacturer: <strong style={{ color: '#475569' }}>{equipment.manufacturer}</strong></>}
          {' · '}Drawing: <strong style={{ color: '#475569', fontFamily: 'monospace' }}>{equipment.drawing || 'SLD'}</strong>
          {' · '}{tests.length} tests
        </div>
        {equipment.feeder_ref && (
          <div style={{ fontSize: 11, color: '#64748b', marginLeft: 28, marginTop: 2 }}>
            Feeder: <strong>{equipment.feeder_ref}</strong>
          </div>
        )}
      </div>

      {tests.length === 0 ? (
        <div style={{ padding: '24px', color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
          No tests defined for this equipment type.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['#', 'Test', 'Level', 'Category', 'Status'].map(h => (
                <th key={h} style={{
                  padding: '9px 16px', textAlign: 'left',
                  fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                  borderBottom: '1px solid var(--border)',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tests.map((t, i) => {
              const levelInfo = LEVEL_COLORS[t.level] || LEVEL_COLORS['L3']
              return (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '9px 16px', fontSize: 11, color: 'var(--text-muted)', width: 40 }}>{i + 1}</td>
                  <td style={{ padding: '9px 16px', fontSize: 13, fontWeight: 500 }}>{t.name}</td>
                  <td style={{ padding: '9px 16px', width: 100 }}>
                    <span style={{
                      background: levelInfo.bg, color: levelInfo.color,
                      fontWeight: 700, fontSize: 11,
                      padding: '3px 10px', borderRadius: 4, whiteSpace: 'nowrap'
                    }}>{t.level}</span>
                  </td>
                  <td style={{ padding: '9px 16px', fontSize: 11, color: '#64748b', width: 100 }}>
                    {levelInfo.label}
                  </td>
                  <td style={{ padding: '9px 16px', width: 100 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 12,
                      background: t.status === 'Pass' ? '#dcfce7' : '#f1f5f9',
                      color: t.status === 'Pass' ? '#16a34a' : '#64748b',
                    }}>{t.status}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
