import Highcharts from 'highcharts'
import HighchartsMore from 'highcharts/highcharts-more'
import SolidGauge from 'highcharts/modules/solid-gauge'
import HighchartsReact from 'highcharts-react-official'

HighchartsMore(Highcharts)
SolidGauge(Highcharts)

export default function Charts({ equipment }) {
  // Calculate completion based on tests passed / total tests
  const totalTests = equipment.reduce((sum, item) => sum + (item.tests ? item.tests.length : 0), 0)
  const passedTests = equipment.reduce((sum, item) => {
    if (!item.tests) return sum
    return sum + item.tests.filter(t => t.status === 'Pass').length
  }, 0)
  const completion = totalTests === 0 ? 0 : Math.round(passedTests / totalTests * 100)

  const levelCounts = [1, 2, 3, 4, 5].map(l => equipment.filter(e => e.level === l).length)

  const gaugeOptions = {
    chart: { type: 'solidgauge', height: 220, backgroundColor: 'transparent', margin: [0, 0, 0, 0] },
    title: null,
    credits: { enabled: false },
    pane: {
      center: ['50%', '70%'], size: '140%', startAngle: -90, endAngle: 90,
      background: [{ backgroundColor: '#f1f5f9', innerRadius: '60%', outerRadius: '100%', shape: 'arc', borderWidth: 0 }],
    },
    yAxis: {
      min: 0, max: 100, stops: [[0.1, '#FF9900'], [0.5, '#FF9900'], [0.9, '#16a34a']],
      lineWidth: 0, tickWidth: 0, minorTickInterval: null, labels: { enabled: false },
    },
    tooltip: { enabled: false },
    plotOptions: {
      solidgauge: {
        innerRadius: '60%',
        dataLabels: {
          enabled: true, y: -35, borderWidth: 0, useHTML: true,
          format: '<div style="text-align:center"><span style="font-size:32px;font-weight:700;color:#1e293b">{y}%</span><br/><span style="font-size:12px;color:#64748b">Overall Completion</span></div>',
        },
      },
    },
    series: [{ name: 'Completion', data: [completion] }],
  }

  const columnOptions = {
    chart: { type: 'column', height: 220, backgroundColor: 'transparent', spacing: [10, 10, 10, 10] },
    title: null,
    credits: { enabled: false },
    xAxis: {
      categories: ['L1', 'L2', 'L3', 'L4', 'L5'],
      labels: { style: { color: '#64748b', fontSize: '12px' } },
      lineColor: '#e2e8f0', tickColor: 'transparent',
    },
    yAxis: {
      title: { text: null }, gridLineColor: '#f1f5f9',
      labels: { style: { color: '#64748b', fontSize: '11px' } },
    },
    tooltip: { headerFormat: '', pointFormat: '<b>{point.category}</b>: {point.y} items' },
    plotOptions: {
      column: {
        borderRadius: 4, colorByPoint: true,
        colors: ['#dc2626', '#f97316', '#FF9900', '#2563eb', '#16a34a'],
      },
    },
    legend: { enabled: false },
    series: [{ name: 'Equipment', data: levelCounts }],
  }

  return (
    <div style={{ display: 'flex', gap: 16, margin: '16px 32px 0' }}>
      {[
        { title: 'Overall Commissioning Progress', opts: gaugeOptions },
        { title: 'Equipment by Commissioning Level', opts: columnOptions },
      ].map(({ title, opts }) => (
        <div key={title} style={{
          flex: 1, background: 'var(--card-bg)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '20px 24px',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>{title}</div>
          <HighchartsReact highcharts={Highcharts} options={opts} />
        </div>
      ))}
    </div>
  )
}
