import { useEffect, useRef } from 'react'

const TEST_STATUS = {
  'Pass':        { color: 'var(--green)',  bg: 'var(--green-light)' },
  'Scheduled':   { color: 'var(--blue)',   bg: 'var(--blue-light)' },
  'Pending':     { color: 'var(--orange)', bg: 'var(--orange-light)' },
  'Not Started': { color: 'var(--red)',    bg: 'var(--red-light)' },
}

const LEVEL_COLORS = ['#94a3b8', '#dc2626', '#f97316', '#FF9900', '#2563eb', '#16a34a']

export default function TestDetail({ equipment }) {
  const tests = equipment.tests || []
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
          {' · '}Manufacturer: <strong style={{ color: '#475569' }}>{equipment.manufacturer}</strong>
          {' · '}Drawing: <strong style={{ color: '#475569', fontFamily: 'monospace' }}>{equipment.drawing}</strong>
          {' · '}{tests.length} tests
        </div>
      </div>

      {tests.length === 0 ? (
        <div style={{ padding: '24px', color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
          No tests defined for this equipment.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Test', 'Standard', 'Cx Level', 'Status'].map(h => (
                <th key={h} style={{
                  padding: '9px 24px', textAlign: 'left',
                  fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                  borderBottom: '1px solid var(--border)',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tests.map((t, i) => {
              const s = TEST_STATUS[t.status] || TEST_STATUS['Not Started']
              return (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '11px 24px', fontSize: 13, fontWeight: 500 }}>{t.name}</td>
                  <td style={{ padding: '11px 24px', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{t.standard}</td>
                  <td style={{ padding: '11px 24px' }}>
                    <span style={{
                      background: LEVEL_COLORS[t.level] + '22',
                      color: LEVEL_COLORS[t.level],
                      fontWeight: 700, fontSize: 12,
                      padding: '2px 9px', borderRadius: 4,
                    }}>L{t.level}</span>
                  </td>
                  <td style={{ padding: '11px 24px' }}>
                    <span style={{
                      background: s.bg, color: s.color,
                      fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 12,
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
