import { useState, useMemo } from 'react'
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

const DAILY_SETTINGS_KEY = 'ds-stats-daily-settings'

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
      {d?.isOutlier ? (
        <div style={{ color: '#e64a19' }}>
          Minutes: <strong>{d?.realMinutes?.toFixed(0)}</strong>
          <span style={{ marginLeft: 5, fontSize: 11, color: '#999' }}>outlier — clipped on chart</span>
        </div>
      ) : (
        <div style={{ color: '#0288d1' }}>
          Minutes: <strong>{d?.minutes?.toFixed(0)}</strong>
        </div>
      )}
      {d?.avg7  != null && <div style={{ color: '#f57c00' }}>7-day avg: {d.avg7.toFixed(0)} min/day</div>}
      {d?.avg30 != null && <div style={{ color: '#c62828' }}>30-day avg: {d.avg30.toFixed(0)} min/day</div>}
      <div style={{ color: '#555' }}>All-time avg: {d?.allTimeAvg?.toFixed(0)} min/day</div>
      <div style={{ color: '#999', marginTop: 4 }}>{d?.cumulativeHours?.toFixed(1)}h total</div>
    </div>
  )
}

function DailyDot(props) {
  const { cx, cy, payload } = props
  if (cx == null || cy == null) return null
  if (payload?.isOutlier) {
    return (
      <g key={`outlier-${payload.date}`}>
        <circle cx={cx} cy={cy} r={5} fill="#e64a19" fillOpacity={0.85} stroke="white" strokeWidth={1} />
      </g>
    )
  }
  return (
    <circle key={`dot-${payload.date}`} cx={cx} cy={cy} r={3} fill="#0288d1" fillOpacity={0.45} />
  )
}

export default function DailyTimeChart({ points }) {
  const [showSettings, setShowSettings] = useState(false)
  const [compressY, setCompressY] = useState(() => {
    try { return JSON.parse(localStorage.getItem(DAILY_SETTINGS_KEY) || '{}').compressY ?? false }
    catch { return false }
  })

  function toggleCompressY(val) {
    setCompressY(val)
    try {
      const prev = JSON.parse(localStorage.getItem(DAILY_SETTINGS_KEY) || '{}')
      localStorage.setItem(DAILY_SETTINGS_KEY, JSON.stringify({ ...prev, compressY: val }))
    } catch {}
  }

  const { processedPoints, yDomain } = useMemo(() => {
    if (!compressY || !points.length) return { processedPoints: points, yDomain: undefined }

    const maxAllTimeAvg = Math.max(...points.map(p => p.allTimeAvg ?? 0))
    const maxDaily      = Math.max(...points.map(p => p.minutes ?? 0))
    const maxAvg7       = Math.max(...points.map(p => p.avg7 ?? 0))
    const maxAvg30      = Math.max(...points.map(p => p.avg30 ?? 0))
    const threshold     = Math.max(
      Math.min(2 * maxAllTimeAvg, maxDaily),
      maxAvg7,
      maxAvg30,
    )

    const processed = points.map(p =>
      p.minutes > threshold
        ? { ...p, realMinutes: p.minutes, minutes: threshold, isOutlier: true }
        : p
    )

    return { processedPoints: processed, yDomain: [0, threshold] }
  }, [points, compressY])

  const tickInterval = Math.max(0, Math.floor(points.length / 12) - 1)

  return (
    <div className="chart-card">
      <div className="chart-card__header">
        <h2>Daily Watch Time</h2>
        <button
          className="chart-settings-btn"
          onClick={() => setShowSettings(s => !s)}
          aria-expanded={showSettings}
          title="Chart settings"
        >
          ⚙
        </button>
      </div>

      {showSettings && (
        <div className="chart-settings-panel">
          <label className="chart-settings-item">
            <input
              type="checkbox"
              checked={compressY}
              onChange={e => toggleCompressY(e.target.checked)}
            />
            Compress y-axis
            <span style={{ color: '#888', fontSize: 12, marginLeft: 4 }}>
              (caps at 2× all-time avg; outliers shown in orange)
            </span>
          </label>
        </div>
      )}

      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={processedPoints} margin={{ top: 24, right: 30, left: 20, bottom: 40 }}>
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
            domain={yDomain}
            allowDataOverflow={compressY}
            label={{ value: 'Minutes watched', angle: -90, position: 'insideLeft', offset: 10 }}
          />
          <Tooltip content={<DailyTooltip />} />
          <Legend verticalAlign="top" />

          <Line
            dataKey="minutes"
            name="Daily minutes"
            stroke="#90CAF9"
            strokeWidth={0}
            dot={<DailyDot />}
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
