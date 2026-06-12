import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

function DailyTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
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
      {d?.goalReached && <div style={{ color: '#2e7d32', marginBottom: 4 }}>✓ Goal reached</div>}
      <div style={{ color: '#0288d1' }}>
        Minutes: <strong>{d?.minutes?.toFixed(0)}</strong>
      </div>
      {d?.avg7  != null && <div style={{ color: '#f57c00' }}>7-day avg: {d.avg7.toFixed(0)} min/day</div>}
      {d?.avg30 != null && <div style={{ color: '#c62828' }}>30-day avg: {d.avg30.toFixed(0)} min/day</div>}
      <div style={{ color: '#555' }}>All-time avg: {d?.allTimeAvg?.toFixed(0)} min/day</div>
      <div style={{ color: '#999', marginTop: 4 }}>{d?.cumulativeHours?.toFixed(1)}h total</div>
    </div>
  )
}

export default function DailyTimeChart({ points }) {
  const tickInterval = Math.max(0, Math.floor(points.length / 12) - 1)

  return (
    <div className="chart-card">
      <h2>Daily Watch Time</h2>
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={points} margin={{ top: 24, right: 30, left: 20, bottom: 40 }}>
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
            label={{ value: 'Minutes watched', angle: -90, position: 'insideLeft', offset: 10 }}
          />
          <Tooltip content={<DailyTooltip />} />
          <Legend verticalAlign="top" />

          <Line
            dataKey="minutes"
            name="Daily minutes"
            stroke="#90CAF9"
            strokeWidth={0}
            dot={{ fill: '#0288d1', r: 3, fillOpacity: 0.45, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#0288d1' }}
            isAnimationActive={false}
          />
          <Line
            dataKey="avg7"
            name="7-day avg"
            stroke="#f57c00"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            dataKey="avg30"
            name="30-day avg"
            stroke="#c62828"
            strokeWidth={2.5}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            dataKey="allTimeAvg"
            name="All-time avg"
            stroke="#757575"
            strokeWidth={1.5}
            strokeDasharray="6 3"
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
