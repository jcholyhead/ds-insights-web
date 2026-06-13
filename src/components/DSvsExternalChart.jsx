import { useState, useMemo } from 'react'
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

const SETTINGS_KEY = 'ds-stats-dsvs-settings'

const GRANULARITY_OPTIONS = [
  { value: 'auto',  label: 'Auto' },
  { value: 'day',   label: 'Daily' },
  { value: 'week',  label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
]

function autoGranularity(n) {
  if (n <= 90)  return 'day'
  if (n <= 365) return 'week'
  return 'month'
}

function bucketPoints(points, granularity) {
  if (granularity === 'day') return points

  const byKey = new Map()

  for (const p of points) {
    const d = new Date(p.date + 'T00:00:00')
    let key
    if (granularity === 'week') {
      const day = d.getDay() || 7
      const thu = new Date(d); thu.setDate(d.getDate() + 4 - day)
      const jan1 = new Date(thu.getFullYear(), 0, 1)
      const week = Math.ceil(((thu - jan1) / 86400000 + 1) / 7)
      key = `${thu.getFullYear()}-W${String(week).padStart(2, '0')}`
    } else {
      key = p.date.slice(0, 7)
    }

    if (!byKey.has(key)) byKey.set(key, { date: key, ds: 0, external: 0, total: 0 })
    const b = byKey.get(key)
    b.ds       += p.ds
    b.external += p.external
    b.total    += p.total
  }

  return [...byKey.values()].map(b => ({
    ...b,
    ds:       Math.round(b.ds),
    external: Math.round(b.external),
    total:    Math.round(b.total),
  }))
}

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
  const [showSettings, setShowSettings] = useState(false)
  const [granularityPref, setGranularityPref] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}').granularity ?? 'auto' }
    catch { return 'auto' }
  })

  function handleGranularityChange(val) {
    setGranularityPref(val)
    try {
      const prev = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...prev, granularity: val }))
    } catch {}
  }

  const effectiveGranularity = granularityPref === 'auto' ? autoGranularity(points.length) : granularityPref
  const data = useMemo(
    () => bucketPoints(points, effectiveGranularity),
    [points, effectiveGranularity]
  )

  const tickInterval = Math.max(0, Math.floor(data.length / 12) - 1)
  const granularityLabel = effectiveGranularity === 'week' ? 'weekly'
    : effectiveGranularity === 'month' ? 'monthly' : 'daily'

  return (
    <div className="chart-card">
      <div className="chart-card__header">
        <h2>
          Watch Time: DS vs Non-DS{' '}
          <span style={{ fontSize: 13, fontWeight: 400, color: '#888' }}>({granularityLabel})</span>
        </h2>
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
        <div className="chart-settings-panel chart-settings-panel--col">
          <div className="chart-settings-group-label">Bucket size</div>
          {GRANULARITY_OPTIONS.map(({ value, label }) => (
            <label key={value} className="chart-settings-item">
              <input
                type="radio"
                name="dsvs-granularity"
                value={value}
                checked={granularityPref === value}
                onChange={() => handleGranularityChange(value)}
              />
              {label}
              {value === 'auto' && (
                <span style={{ color: '#aaa', fontSize: 12, marginLeft: 4 }}>
                  (currently {granularityLabel})
                </span>
              )}
            </label>
          ))}
        </div>
      )}

      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data} margin={{ top: 24, right: 30, left: 20, bottom: 40 }}>
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
