const STATUS_STYLES = {
  'Complete':    { color: 'var(--green)' },
  'In Progress': { color: 'var(--orange)' },
  'Not Started': { color: 'var(--red)' },
  'Awaiting SLD Upload': { color: 'var(--text-muted)' },
  'Pending': { color: 'var(--orange)' },
}

function LevelDots({ level }) {
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map(l => (
        <div key={l} style={{
          width: 8, height: 6, borderRadius: 3,
          background: l <= level
            ? (level >= 5 ? 'var(--green)' : level >= 4 ? 'var(--blue)' : 'var(--orange)')
            : '#e2e8f0',
        }} />
      ))}
      <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 3 }}>L{level}</span>
    </div>
  )
}

function StatusDot({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES['Not Started']
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
      <span style={{ fontSize: 11, fontWeight: 500, color: s.color, whiteSpace: 'nowrap' }}>{status}</span>
    </div>
  )
}

const TH = ({ children, width }) => (
  <th style={{
    padding: '8px 10px', textAlign: 'left',
    fontSize: 10, fontWeight: 600, color: 'var(--text-muted)',
    textTransform: 'uppercase', letterSpacing: '0.5px',
    borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
    width: width || 'auto',
  }}>{children}</th>
)

export default function EquipmentTable({ equipment, selectedIndex, onSelect }) {
  return (
    <div style={{
      background: 'var(--card-bg)', border: '1px solid var(--border)',
      borderRadius: 10, margin: '16px 32px 0', overflow: 'hidden',
    }}>
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>Equipment Register</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>Click a row to view test details</span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <thead>
          <tr style={{ background: '#f8fafc' }}>
            <TH width="50px">Ref</TH>
            <TH>Equipment</TH>
            <TH width="50px">Qty</TH>
            <TH width="80px">Tests</TH>
            <TH width="140px">Type</TH>
            <TH width="110px">Level</TH>
            <TH width="100px">Status</TH>
          </tr>
        </thead>
        <tbody>
          {equipment.map((item, i) => (
            <tr
              key={i}
              onClick={() => onSelect(i === selectedIndex ? null : i)}
              style={{
                borderBottom: '1px solid var(--border)',
                cursor: 'pointer',
                background: i === selectedIndex ? '#FFF8F0' : (i % 2 === 1 ? '#FAFBFC' : 'transparent'),
                borderLeft: i === selectedIndex ? '4px solid var(--orange)' : '4px solid transparent',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { if (i !== selectedIndex) e.currentTarget.style.background = '#f1f5f9' }}
              onMouseLeave={e => { if (i !== selectedIndex) e.currentTarget.style.background = i % 2 === 1 ? '#FAFBFC' : 'transparent' }}
            >
              <td style={{ padding: '8px 10px', fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)', overflow: 'hidden' }}>{item.item_ref}</td>
              <td style={{ padding: '8px 10px', fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</td>
              <td style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>{item.qty}</td>
              <td style={{ padding: '8px 10px', fontSize: 11, textAlign: 'center' }}>
                {item.tests && item.tests.length > 0 ? (
                  <span style={{ color: item.tests.filter(t => t.status === 'Pass').length === item.tests.length ? 'var(--green)' : 'var(--text-muted)', fontWeight: 600 }}>
                    {item.tests.filter(t => t.status === 'Pass').length}/{item.tests.length}
                  </span>
                ) : '—'}
              </td>
              <td style={{ padding: '8px 10px', fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.type}</td>
              <td style={{ padding: '8px 10px' }}><LevelDots level={item.level} /></td>
              <td style={{ padding: '8px 10px' }}><StatusDot status={item.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
