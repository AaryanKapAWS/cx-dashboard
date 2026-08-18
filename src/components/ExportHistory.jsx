import { useState, useEffect } from 'react'

const TYPE_BADGES = {
  COR: { bg: '#fef3c7', color: '#92400e', border: '#fde68a', label: 'COR' },
  Asana: { bg: '#ede9fe', color: '#5b21b6', border: '#ddd6fe', label: 'Asana' },
  Procore: { bg: '#e0f2fe', color: '#075985', border: '#bae6fd', label: 'Procore' },
}

const STATUS_STYLES = {
  success: { bg: '#dcfce7', color: '#166534', border: '#bbf7d0', label: '✓ Success' },
  failed: { bg: '#fef2f2', color: '#991b1b', border: '#fecaca', label: '✗ Failed' },
}

export default function ExportHistory() {
  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('export_history') || '[]')
    } catch {
      return []
    }
  })

  function handleClear() {
    if (window.confirm('Clear all export history? This cannot be undone.')) {
      localStorage.removeItem('export_history')
      setHistory([])
    }
  }

  function formatTimestamp(iso) {
    try {
      const d = new Date(iso)
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
        ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    } catch {
      return iso
    }
  }

  if (history.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 16px' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
        <p style={{ fontSize: 12, color: '#64748b', margin: 0, lineHeight: 1.6 }}>
          No exports yet. Generate a COR or create an Asana project<br />to see history here.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Header with clear button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
          {history.length} export{history.length !== 1 ? 's' : ''} logged
        </span>
        <button onClick={handleClear} style={{
          padding: '5px 10px', fontSize: 10, fontWeight: 600,
          background: '#fff', color: '#dc2626', border: '1px solid #fecaca',
          borderRadius: 5, cursor: 'pointer',
        }}>
          Clear History
        </button>
      </div>

      {/* History table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <th style={thStyle}>Date & Time</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Project</th>
              <th style={thStyle}>Items</th>
              <th style={thStyle}>Tests</th>
              <th style={thStyle}>Status</th>
            </tr>
          </thead>
          <tbody>
            {history.map((entry) => {
              const typeBadge = TYPE_BADGES[entry.type] || TYPE_BADGES.COR
              const statusBadge = STATUS_STYLES[entry.status] || STATUS_STYLES.success
              return (
                <tr key={entry.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={tdStyle}>
                    <span style={{ color: '#334155', whiteSpace: 'nowrap' }}>
                      {formatTimestamp(entry.timestamp)}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: 10,
                      fontSize: 10, fontWeight: 600,
                      background: typeBadge.bg, color: typeBadge.color, border: `1px solid ${typeBadge.border}`,
                    }}>
                      {typeBadge.label}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ color: '#0f172a', fontWeight: 500 }}>
                      {entry.projectName || '—'}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    {entry.itemCount ?? '—'}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    {entry.testCount ?? '—'}
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: 10,
                      fontSize: 10, fontWeight: 600,
                      background: statusBadge.bg, color: statusBadge.color, border: `1px solid ${statusBadge.border}`,
                    }}>
                      {statusBadge.label}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const thStyle = {
  textAlign: 'left',
  padding: '8px 10px',
  fontSize: 10,
  fontWeight: 600,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.3px',
}

const tdStyle = {
  padding: '10px 10px',
  color: '#475569',
}
