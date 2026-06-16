import { useState } from 'react'

const STATUS_BADGE = {
  Construction: { bg: 'var(--orange)', color: '#fff' },
  Design:       { bg: '#334155',       color: '#94a3b8' },
}

// Group projects by cluster
function groupByCluster(projects) {
  return projects.reduce((acc, p) => {
    acc[p.cluster] = acc[p.cluster] || []
    acc[p.cluster].push(p)
    return acc
  }, {})
}

export default function TopBar({ projects, selectedProject, onProjectChange }) {
  const [open, setOpen] = useState(false)
  const groups = groupByCluster(projects)
  const badge = STATUS_BADGE[selectedProject?.status] || STATUS_BADGE.Design

  return (
    <header style={{
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      borderBottom: '3px solid var(--orange)',
      padding: '16px 32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'relative',
      zIndex: 100,
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="1.8">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
          <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 700, letterSpacing: '-0.3px' }}>
            Substation Commissioning Tracker
          </h1>
        </div>
        <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 4, marginLeft: 40 }}>
          Real-time equipment inspection progress from Procore
        </p>
      </div>

      {/* Project selector */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            background: open ? '#1e293b' : 'transparent',
            border: `2px solid ${open ? 'var(--orange)' : '#334155'}`,
            borderRadius: 8,
            padding: '8px 14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: '#fff',
            minWidth: 260,
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.5px' }}>
            {selectedProject?.cluster}
          </span>
          <span style={{ flex: 1, fontSize: 13, fontWeight: 600, textAlign: 'left' }}>
            {selectedProject?.name}
          </span>
          <span style={{
            background: badge.bg, color: badge.color,
            fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
          }}>{selectedProject?.status}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"
            style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {open && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0,
            background: '#0f172a', border: '1px solid #334155',
            borderRadius: 8, minWidth: 300,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            overflow: 'hidden',
          }}>
            {Object.entries(groups).map(([cluster, items]) => (
              <div key={cluster}>
                <div style={{
                  padding: '8px 14px 4px',
                  fontSize: 10, fontWeight: 700, color: '#475569',
                  letterSpacing: '1px', textTransform: 'uppercase',
                  borderTop: '1px solid #1e293b',
                }}>
                  {cluster} cluster
                </div>
                {items.map(p => {
                  const b = STATUS_BADGE[p.status] || STATUS_BADGE.Design
                  const isActive = p.id === selectedProject?.id
                  return (
                    <button
                      key={p.id}
                      onClick={() => { onProjectChange(p); setOpen(false) }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 14px', background: isActive ? '#1e3a5f' : 'transparent',
                        border: 'none', cursor: 'pointer', color: '#fff', textAlign: 'left',
                      }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#1e293b' }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                    >
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', width: 28 }}>{p.cluster}</span>
                      <span style={{ flex: 1, fontSize: 13 }}>{p.name}</span>
                      <span style={{
                        background: b.bg, color: b.color,
                        fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, flexShrink: 0,
                      }}>{p.status}</span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Close dropdown on outside click */}
      {open && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: -1 }}
          onClick={() => setOpen(false)}
        />
      )}
    </header>
  )
}
