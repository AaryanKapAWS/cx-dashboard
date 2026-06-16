const STEPS = ['Upload SLD', 'Equipment List', 'Map to Tests', 'Track Progress']
const CURRENT = 3 // 0-indexed, "Track Progress" is active

export default function Pipeline() {
  return (
    <div style={{
      background: 'var(--card-bg)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '20px 32px',
      margin: '24px 32px 0',
      display: 'flex',
      alignItems: 'center',
      gap: 0,
    }}>
      {STEPS.map((step, i) => {
        const done = i < CURRENT
        const active = i === CURRENT
        const color = done ? 'var(--green)' : active ? 'var(--orange)' : '#cbd5e1'
        return (
          <div key={step} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: done ? 'var(--green)' : active ? 'var(--orange)' : '#f1f5f9',
                border: `2px solid ${color}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: (done || active) ? '#fff' : '#94a3b8',
                fontWeight: 700, fontSize: 14,
                transition: 'all 0.2s',
              }}>
                {done ? '✓' : i + 1}
              </div>
              <span style={{
                marginTop: 8, fontSize: 12, fontWeight: active ? 600 : 400,
                color: done ? 'var(--green)' : active ? 'var(--orange)' : 'var(--text-muted)',
                whiteSpace: 'nowrap',
              }}>
                {step}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{
                height: 2, flex: 1, maxWidth: 60,
                background: i < CURRENT ? 'var(--green)' : 'var(--border)',
                marginBottom: 20,
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}
