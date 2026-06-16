function StatCard({ label, value, sub, color, bg }) {
  return (
    <div style={{
      background: 'var(--card-bg)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '20px 24px', flex: 1,
      borderTop: `4px solid ${color}`,
    }}>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 36, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      <div style={{
        marginTop: 10, display: 'inline-block',
        background: bg, color, fontSize: 11, fontWeight: 600,
        padding: '3px 8px', borderRadius: 4,
      }}>{sub}</div>
    </div>
  )
}

export default function StatsRow({ equipment }) {
  const counts = equipment.reduce((acc, item) => {
    acc.total++
    acc[item.status] = (acc[item.status] || 0) + 1
    return acc
  }, { total: 0 })

  return (
    <div style={{ display: 'flex', gap: 16, margin: '16px 32px 0' }}>
      <StatCard label="Total Equipment" value={counts.total} sub="All items tracked" color="var(--blue)" bg="var(--blue-light)" />
      <StatCard label="Fully Commissioned" value={counts['Complete'] || 0} sub="L5 complete" color="var(--green)" bg="var(--green-light)" />
      <StatCard label="In Progress" value={counts['In Progress'] || 0} sub="L3/L4 testing" color="var(--orange)" bg="var(--orange-light)" />
      <StatCard label="Not Started" value={(counts['Not Started'] || 0) + (counts['Awaiting SLD Upload'] || 0)} sub="No inspections" color="var(--red)" bg="var(--red-light)" />
    </div>
  )
}
