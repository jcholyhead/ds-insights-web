import { useState, useEffect, useMemo } from 'react'
import {
  ComposedChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'

function VideoTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const point = payload[0]?.payload
  return (
    <div style={{
      background: 'white',
      border: '1px solid #ddd',
      borderRadius: 6,
      padding: '8px 12px',
      fontSize: 12,
      maxWidth: 260,
      boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
    }}>
      <div style={{ color: '#888', marginBottom: 4 }}>
        {Number(label).toFixed(1)}h into journey
      </div>
      {point?.title && (
        <div style={{ fontWeight: 600, marginBottom: 6, lineHeight: 1.35 }}>
          {point.title}
        </div>
      )}
      {point?.rating != null && (
        <div style={{ color: '#1565C0' }}>Rating: {point.rating.toFixed(1)}</div>
      )}
      {point?.rollingAvg != null && (
        <div style={{ color: '#555' }}>Rolling avg: {point.rollingAvg.toFixed(1)}</div>
      )}
      {point?.p90 != null && (
        <div style={{ color: '#e65100' }}>P90: {point.p90.toFixed(1)}</div>
      )}
    </div>
  )
}

function AppearanceLabel({ viewBox, name, atTop }) {
  if (!viewBox) return null
  const { x, y, height } = viewBox
  const px = x - 6
  const py = atTop ? y + 15 : y + height - 15
  const textAnchor = atTop ? 'end' : 'start'

  return (
    <text
      x={px}
      y={py}
      transform={`rotate(-90, ${px}, ${py})`}
      fontSize={12}
      fill="#555"
      textAnchor={textAnchor}
    >
      {name}
    </text>
  )
}

const STORAGE_KEY = 'ds-stats-visible-sources'
const PAGE_SIZE   = 25

const CONSUMPTION_COLORS = [
  'rgba(255, 182, 193, 0.75)', // pink
  'rgba(173, 216, 230, 0.75)', // light blue
  'rgba(152, 251, 152, 0.75)', // pale green
  'rgba(255, 218, 185, 0.75)', // peach
  'rgba(216, 191, 216, 0.75)', // thistle
  'rgba(255, 255, 153, 0.75)', // pale yellow
  'rgba(175, 238, 238, 0.75)', // pale turquoise
  'rgba(255, 160, 122, 0.75)', // light salmon
]

function truncate(str, max = 50) {
  return str.length > max ? str.slice(0, max) + '…' : str
}

function sourcesFromStorage(allNames) {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved !== null) {
    try {
      // Key exists — respect saved selection even if empty (user chose none)
      return new Set(JSON.parse(saved).filter(n => allNames.includes(n)))
    } catch {}
  }
  // Key absent — first load: pre-select only the first source as a demo
  return new Set(allNames.length ? [allNames[0]] : [])
}

export default function DifficultyChart({ difficultyData, appearances, consumptionPoints, hasExternalData, xMin = 0 }) {
  const [showFilter, setShowFilter] = useState(false)
  const [page, setPage] = useState(0)
  const [visibleSources, setVisibleSources] = useState(() => {
    const allNames = (appearances || []).map(a => a.name)
    return sourcesFromStorage(allNames)
  })
  const [showAllConsumption, setShowAllConsumption] = useState(false)
  // Maps source name -> assigned y value; grows as sources are activated,
  // entries removed when sources are deselected, never re-indexed.
  const [yAssignments, setYAssignments] = useState(new Map())

  // On chart regeneration, reconcile with localStorage; reset panel state
  useEffect(() => {
    const allNames = (appearances || []).map(a => a.name)
    setVisibleSources(sourcesFromStorage(allNames))
    setShowAllConsumption(false)
    setYAssignments(new Map())
    setShowFilter(false)
    setPage(0)
  }, [appearances])

  // Persist selections whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...visibleSources]))
  }, [visibleSources])

  // For each marker, look up the rolling average at that exact x position and
  // compare it to the Y midpoint. Label goes where there's more space.
  const { yMid, rollingAvgAtX } = useMemo(() => {
    const ratings = difficultyData.map(d => d.rating).filter(r => r != null)
    const mid = ratings.length
      ? (Math.min(...ratings) + Math.max(...ratings)) / 2
      : 50

    function rollingAvgAtX(x) {
      let val = null
      for (const d of difficultyData) {
        if (d.x <= x) val = d.rollingAvg
        else break
      }
      return val
    }

    return { yMid: mid, rollingAvgAtX }
  }, [difficultyData])

  const filteredAppearances = (appearances || []).filter(a => visibleSources.has(a.name))

  const allNames = (appearances || []).map(a => a.name)

  function toggleSource(name) {
    const isRemoving = visibleSources.has(name)
    setVisibleSources(prev => {
      const next = new Set(prev)
      if (isRemoving) next.delete(name)
      else next.add(name)
      return next
    })
    if (showAllConsumption) {
      setYAssignments(prev => {
        const next = new Map(prev)
        if (isRemoving) {
          next.delete(name)
        } else if (!next.has(name)) {
          next.set(name, next.size * 2)
        }
        return next
      })
    }
  }

  function handleToggleAllConsumption(checked) {
    setShowAllConsumption(checked)
    if (checked) {
      // Assign y values in allNames order to all currently visible sources
      const assignments = new Map()
      for (const name of allNames) {
        if (visibleSources.has(name)) {
          assignments.set(name, assignments.size * 2)
        }
      }
      setYAssignments(assignments)
    } else {
      setYAssignments(new Map())
    }
  }

  function selectAll() {
    setVisibleSources(new Set((appearances || []).map(a => a.name)))
  }

  function selectNone() {
    setVisibleSources(new Set())
  }

  const hasAppearances = (appearances || []).length > 0

  return (
    <div className="chart-card">
      <div className="chart-card__header">
        <h2>Video Difficulty Over Time</h2>
        {hasAppearances && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button
              className="chart-filter-btn"
              onClick={() => { setShowFilter(s => !s); setPage(0) }}
              aria-expanded={showFilter}
            >
              Show external sources {showFilter ? '▲' : '▼'}
            </button>
            <span
              className="chart-filter-info"
              title="Places a vertical marker on the chart at the cumulative-hour position where you first logged time against each external content source."
            >
              ?
            </span>
          </div>
        )}
      </div>

      {!hasExternalData && (
        <p className="chart-note">X-axis shows DS watch hours only (no external time data).</p>
      )}

      {showFilter && hasAppearances && (() => {
        const pageCount = Math.ceil(allNames.length / PAGE_SIZE)
        const pageSources = allNames.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

        return (
          <div className="chart-filter-panel">
            <div className="chart-filter-panel__header">
              <span className="chart-filter-panel__label">External content sources</span>
              <label className="chart-filter-consumption-toggle" title="Plot every consumption event as a dot on the chart">
                <input
                  type="checkbox"
                  checked={showAllConsumption}
                  onChange={e => handleToggleAllConsumption(e.target.checked)}
                />
                show all events
              </label>
              {pageCount > 1 && (
                <span className="chart-filter-page-info">
                  {page + 1} / {pageCount}
                </span>
              )}
            </div>
            <div className="chart-filter-items">
              {pageSources.map(name => (
                <label key={name} className="chart-filter-item" title={name}>
                  <input
                    type="checkbox"
                    checked={visibleSources.has(name)}
                    onChange={() => toggleSource(name)}
                  />
                  {truncate(name)}
                </label>
              ))}
            </div>
            <div className="chart-filter-footer">
              <div className="chart-filter-actions">
                <button onClick={selectAll}>All</button>
                <button onClick={selectNone}>None</button>
              </div>
              {pageCount > 1 && (
                <div className="chart-filter-pagination">
                  <button
                    onClick={() => setPage(p => p - 1)}
                    disabled={page === 0}
                    className="chart-filter-page-btn"
                  >
                    ←
                  </button>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= pageCount - 1}
                    className="chart-filter-page-btn"
                  >
                    →
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      <ResponsiveContainer width="100%" height={450}>
        <ComposedChart
          data={difficultyData}
          margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
          <XAxis
            type="number"
            dataKey="x"
            domain={[xMin, difficultyData.length ? difficultyData[difficultyData.length - 1].x : 'dataMax']}
            label={{
              value: 'Cumulative hours (DS + external)',
              position: 'insideBottom',
              offset: -20,
            }}
            tickCount={10}
          />
          <YAxis
            yAxisId="main"
            label={{
              value: 'Rating (0–100)',
              angle: -90,
              position: 'insideLeft',
              offset: 10,
            }}
          />
          {/* Separate hidden axis for consumption dots — keeps scatter y values
              off the main axis so they don't compress the rating lines */}
          <YAxis yAxisId="scatter" domain={[0, 100]} hide width={0} />
          <Tooltip content={<VideoTooltip />} />
          <Legend verticalAlign="top" />

          <Line
            yAxisId="main"
            dataKey="rating"
            name="Individual video"
            stroke="#90CAF9"
            strokeWidth={0}
            dot={{ fill: '#90CAF9', r: 3, fillOpacity: 0.45, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#1565C0', fillOpacity: 0.9 }}
            isAnimationActive={false}
          />
          <Line
            yAxisId="main"
            dataKey="rollingAvg"
            name="20-video rolling avg"
            stroke="#1565C0"
            strokeWidth={2.5}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            yAxisId="main"
            dataKey="p90"
            name="P90 (rolling 20)"
            stroke="#e65100"
            strokeWidth={2}
            dot={false}
            strokeDasharray="5 3"
            isAnimationActive={false}
          />

          {[...yAssignments.entries()].map(([name, yVal]) => {
            const pts = (consumptionPoints || [])
              .filter(p => p.name === name)
              .map(p => ({ x: p.cumulativeHours, y: yVal }))
            const colorIdx = yVal / 2
            return (
              <Scatter
                key={`consumption-${name}`}
                yAxisId="scatter"
                data={pts}
                dataKey="y"
                fill={CONSUMPTION_COLORS[colorIdx % CONSUMPTION_COLORS.length]}
                isAnimationActive={false}
                legendType="none"
              />
            )
          })}

          {filteredAppearances.map(item => {
            const rv = rollingAvgAtX(item.cumulativeHours)
            const atTop = rv == null || rv <= yMid
            return (
              <ReferenceLine
                key={item.name}
                yAxisId="main"
                x={item.cumulativeHours}
                stroke="#cccccc"
                strokeDasharray="4 4"
                label={<AppearanceLabel name={item.name} atTop={atTop} />}
              />
            )
          })}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
