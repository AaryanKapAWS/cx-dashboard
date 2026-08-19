import { useState } from 'react'

export default function ExportHistory() {
  const [history, setHistory] = useState(() => {
    try {
      const data = JSON.parse(localStorage.getItem('export_history') || '[]')
      return data.slice(0, 50)
    } catch {
      return []
    }
  })

  const clearHistory = () => {
    localStorage.removeItem('export_history')
    setHistory([])
  }

  const formatDate = (timestamp) => {
    const d = new Date(timestamp)
    const day = d.getDate()
    const month = d.toLocaleString('en-GB', { month: 'short' })
    const year = d.getFullYear()
    const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    return `${day} ${month} ${year}, ${time}`
  }

  const typeBadge = (type) => {
    const colors = { COR: '#d97706', Asana: '#7c3aed', Procore: '#2563eb' }
    return (
      <span style={{
        background: colors[type] || '#6b7280', color: '#fff',
        fontSize: 10, fontWeight: 700, padding: '3px 10px',
        borderRadius: 20, textTransform: 'uppercase', letterSpacing: 0.5,
      }}>{type}</span>
    )
  }

  const regionBadge = (region) => {
    if (!region || region === '-') return <span style={{ color: '#94a3b8' }}>{'\u2014'}</span>
    const colors = { EMEA: '#0891b2', APAC: '#7c3aed', AMER: '#dc2626' }
    return (
      <span style={{
        background: colors[region] || '#6b7280', color: '#fff',
        fontSize: 9, fontWeight: 700, padding: '2px 8px',
        borderRadius: 12, letterSpacing: 0.5,
      }}>{region}</span>
    )
  }

  const progressBar = (pct) => {
    if (pct === undefined || pct === null) return <span style={{ color: '#94a3b8' }}>{'\u2014'}</span>
    const color = pct >= 60 ? '#22c55e' : pct >= 30 ? '#f59e0b' : '#ef4444'
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 60, height: 6, borderRadius: 3, background: '#e2e8f0' }}>
          <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', borderRadius: 3, background: color }} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color }}>{pct}%</span>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px 24px', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>Export History</h2>
        {history.length > 0 && (
          <button onClick={clearHistory} style={{
            fontSize: 12, padding: '6px 14px', borderRadius: 6,
            border: '1px solid #dc2626', color: '#dc2626', background: 'transparent',
            cursor: 'pointer', fontWeight: 600,
          }}>Clear History</button>
        )}
      </div>

      {history.length === 0 ? (
        <div style={{
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
          padding: '48px 24px', textAlign: 'center', color: '#64748b', fontSize: 14,
        }}>
          No exports yet. Generate a COR or create an Asana project to see history here.
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Date/Time', 'Type', 'Project', 'Location', 'Region', 'Items', 'Tests', 'Sections', 'Duration', 'Progress', 'Status'].map((col) => (
                  <th key={col} style={{
                    padding: '12px 14px', fontSize: 10, fontWeight: 700,
                    textTransform: 'uppercase', color: '#94a3b8', textAlign: 'left',
                    letterSpacing: 0.5, borderBottom: '1px solid #e2e8f0',
                  }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((entry, i) => (
                <tr key={entry.id || i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                  <td style={{ padding: '12px 14px', fontSize: 12, color: '#334155', whiteSpace: 'nowrap' }}>{formatDate(entry.timestamp)}</td>
                  <td style={{ padding: '12px 14px' }}>{typeBadge(entry.type)}</td>
                  <td style={{ padding: '12px 14px', fontSize: 12, color: '#1e293b', fontWeight: 500 }}>{entry.projectName}</td>
                  <td style={{ padding: '12px 14px', fontSize: 12, color: '#475569' }}>{entry.location || '\u2014'}</td>
                  <td style={{ padding: '12px 14px' }}>{regionBadge(entry.region)}</td>
                  <td style={{ padding: '12px 14px', fontSize: 12, color: '#475569' }}>{entry.itemCount ?? '\u2014'}</td>
                  <td style={{ padding: '12px 14px', fontSize: 12, color: '#475569' }}>{entry.testCount ?? '\u2014'}</td>
                  <td style={{ padding: '12px 14px', fontSize: 12, color: '#475569' }}>{entry.sections ?? '\u2014'}</td>
                  <td style={{ padding: '12px 14px', fontSize: 12, color: '#475569' }}>{entry.duration || '\u2014'}</td>
                  <td style={{ padding: '12px 14px' }}>{progressBar(entry.progressPct)}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ color: entry.status === 'success' ? '#16a34a' : '#dc2626', fontWeight: 600, fontSize: 12 }}>
                      {entry.status === 'success' ? 'Success' : 'Failed'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
