import { useRef, useEffect } from 'react'
import Highcharts from 'highcharts'
import xrangeModule from 'highcharts/modules/xrange'

// Initialize xrange module
if (typeof xrangeModule === 'function') xrangeModule(Highcharts)

const STATUS_COLORS = {
  'Complete': '#36b37e',
  'In Progress': '#FF9900',
  'Not Started': '#cbd5e1',
  'Awaiting SLD Upload': '#e2e8f0',
  'Pending': '#FF9900',
}

export default function Timeline({ equipment }) {
  const chartRef = useRef(null)

  useEffect(() => {
    if (!chartRef.current) return

    // Filter to items with dates
    const items = equipment.filter(e => e.plannedStart && e.plannedEnd)
    if (items.length === 0) {
      chartRef.current.innerHTML = '<div style="padding:20px;color:#94a3b8;font-size:13px;text-align:center;">No timeline data available — upload a commissioning lookahead to see the schedule.</div>'
      return
    }

    const categories = items.map(e => e.name.length > 35 ? e.name.substring(0, 33) + '...' : e.name)
    const data = items.map((e, i) => ({
      x: new Date(e.plannedStart).getTime(),
      x2: new Date(e.plannedEnd).getTime(),
      y: i,
      color: STATUS_COLORS[e.status] || '#cbd5e1',
      custom: {
        name: e.name,
        status: e.status,
        tests: e.tests ? e.tests.length : 0,
      }
    }))

    Highcharts.chart(chartRef.current, {
      chart: {
        type: 'xrange',
        height: Math.max(200, items.length * 28 + 80),
        backgroundColor: 'transparent',
        style: { fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif' },
      },
      title: null,
      xAxis: {
        type: 'datetime',
        plotLines: [{
          value: Date.now(),
          color: '#FF9900',
          width: 2,
          dashStyle: 'Dash',
          label: {
            text: 'Today',
            style: { color: '#FF9900', fontSize: '10px', fontWeight: '600' },
          }
        }],
        labels: { style: { fontSize: '10px' } },
      },
      yAxis: {
        categories: categories,
        reversed: true,
        title: null,
        labels: { style: { fontSize: '11px' } },
        gridLineWidth: 0.5,
        gridLineColor: '#f1f5f9',
      },
      legend: { enabled: false },
      tooltip: {
        formatter: function() {
          const c = this.point.custom
          const start = new Date(this.point.x).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
          const end = new Date(this.point.x2).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
          return `<b>${c.name}</b><br/>` +
            `${start} → ${end}<br/>` +
            `Status: <b>${c.status}</b><br/>` +
            `Tests: ${c.tests}`
        }
      },
      series: [{
        name: 'Commissioning',
        data: data,
        borderRadius: 3,
        pointWidth: 16,
        dataLabels: { enabled: false },
      }],
      credits: { enabled: false },
      plotOptions: {
        xrange: {
          borderWidth: 0,
        }
      }
    })
  }, [equipment])

  return (
    <div style={{
      background: 'var(--card-bg)', border: '1px solid var(--border)',
      borderRadius: 10, margin: '16px 32px 0', overflow: 'hidden',
    }}>
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>Commissioning Timeline</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Planned schedule from lookahead data</span>
      </div>
      <div ref={chartRef} style={{ padding: '12px 16px' }} />
    </div>
  )
}
