import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

function DSTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  const total = d?.total ?? 0
  const dsPct = total > 0 ? Math.round(d.ds / total * 100) : 0
  const extPct = total > 0 ? Math.round(d.external / total * 100) : 0
  return (
    <div style={{
      background: 'white',
      border: '1px solid #ddd',
      borderRadius: 6,
      padding: '8px 12px',
      fontSize: 12,
      boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
    }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div style={{ color: '#f57c00' }}>
        DS content: <strong>{d?.ds?.toFixed(0)}</strong> min
        <span style={{ color: '#999', marginLeft: 5 }}>({dsPct}%)</span>
      </div>
      <div style={{ color: '#1565C0' }}>
        Non-DS: <strong>{d?.external?.toFixed(0)}</strong> min
        <span style={{ color: '#999', marginLeft: 5 }}>({extPct}%)</span>
      </div>
      <div style={{ color: '#555', marginTop: 4, borderTop: '1px solid #eee', paddingTop: 4 }}>
        Total: {total.toFixed(0)} min
      </div>
    </div>
  )
}

export default function DSvsExternalChart({ points }) {
  const tickInterval = Math.max(0, Math.floor(points.length / 12) - 1)

  return (
    <div className="chart-card">
      <h2>Daily Watch Time: DS vs Non-DS</h2>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={points} margin={{ top: 24, right: 30, left: 20, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
          <XAxis
            dataKey="date"
            interval={tickInterval}
            angle={-35}
            textAnchor="end"
            tick={{ fontSize: 11 }}
            label={{ value: 'Date', position: 'insideBottom', offset: -28 }}
          />
          <YAxis
            label={{ value: 'Minutes', angle: -90, position: 'insideLeft', offset: 10 }}
          />
          <Tooltip content={<DSTooltip />} />
          <Legend verticalAlign="top" />
          <Bar
            dataKey="ds"
            name="DS content"
            stackId="a"
            fill="#f57c00"
            fillOpacity={0.85}
            isAnimationActive={false}
          />
          <Bar
            dataKey="external"
            name="Non-DS (external)"
            stackId="a"
            fill="#1565C0"
            fillOpacity={0.85}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
