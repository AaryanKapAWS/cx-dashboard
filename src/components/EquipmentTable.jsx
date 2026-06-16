const STATUS_STYLES = {
  'Complete':    { color: 'var(--green)',  bg: 'var(--green-light)' },
  'In Progress': { color: 'var(--orange)', bg: 'var(--orange-light)' },
  'Not Started': { color: 'var(--red)',    bg: 'var(--red-light)' },
}

function LevelDots({ level }) {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map(l => (
        <div key={l} style={{
          width: 10, height: 10, borderRadius: '50%',
          background: l <= level
            ? (level >= 5 ? 'var(--green)' : level >= 4 ? 'var(--blue)' : 'var(--orange)')
            : '#e2e8f0',
        }} />
      ))}
      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>L{level}</span>
    </div>
  )
}

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES['Not Started']
  return (
    <span style={{
      background: s.bg, color: s.color,
      fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 12,
    }}>{status}</span>
  )
}

const TH = ({ children }) => (
  <th style={{
    padding: '10px 16px', textAlign: 'left',
    fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
    textTransform: 'uppercase', letterSpacing: '0.5px',
    borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
  }}>{children}</th>
)

export default function EquipmentTable({ equipment, selectedIndex, onSelect }) {
  return (
    <div style={{
      background: 'var(--card-bg)', border: '1px solid var(--border)',
      borderRadius: 10, margin: '16px 32px 0', overflow: 'hidden',
    }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 15, fontWeight: 600 }}>Equipment Register</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>Click a row to view test details</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <TH>Ref</TH>
              <TH>Equipment</TH>
              <TH>Manufacturer</TH>
              <TH>Qty</TH>
              <TH>Drawing</TH>
              <TH>Type</TH>
              <TH>Level</TH>
              <TH>Status</TH>
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
                  background: i === selectedIndex ? '#FFF8F0' : 'transparent',
                  borderLeft: i === selectedIndex ? '4px solid var(--orange)' : '4px solid transparent',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (i !== selectedIndex) e.currentTarget.style.background = '#f8fafc' }}
                onMouseLeave={e => { if (i !== selectedIndex) e.currentTarget.style.background = 'transparent' }}
              >
                <td style={{ padding: '11px 16px', fontSize: 12, fontFamily: 'monospace', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{item.item_ref}</td>
                <td style={{ padding: '11px 16px', fontSize: 13, fontWeight: 500 }}>{item.name}</td>
                <td style={{ padding: '11px 16px', fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{item.manufacturer}</td>
                <td style={{ padding: '11px 16px', fontSize: 13, color: 'var(--text-muted)' }}>{item.qty}</td>
                <td style={{ padding: '11px 16px', fontSize: 12, fontFamily: 'monospace', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{item.drawing}</td>
                <td style={{ padding: '11px 16px', fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{item.type}</td>
                <td style={{ padding: '11px 16px' }}><LevelDots level={item.level} /></td>
                <td style={{ padding: '11px 16px' }}><StatusBadge status={item.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
