import { useState } from 'react'

function GoalCalculator({ totalHours }) {
  const [targetHours, setTargetHours] = useState('')
  const [targetDate, setTargetDate] = useState('')

  const today = new Date().toISOString().slice(0, 10)

  const result = (() => {
    const h = parseFloat(targetHours)
    if (!h || !targetDate) return null
    if (h <= totalHours) return { type: 'achieved' }
    const daysRemaining = Math.round(
      (new Date(targetDate + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000
    )
    if (daysRemaining <= 0) return { type: 'past' }
    const minsPerDay = (h - totalHours) * 60 / daysRemaining
    return { type: 'result', minsPerDay, daysRemaining, targetHours: h }
  })()

  return (
    <div className="goal-calculator">
      <div className="goal-calculator__inputs">
        <label className="goal-calculator__field">
          <span>Target hours</span>
          <input
            type="number"
            min={1}
            value={targetHours}
            onChange={e => setTargetHours(e.target.value)}
            placeholder="e.g. 500"
          />
        </label>
        <label className="goal-calculator__field">
          <span>By date</span>
          <input
            type="date"
            min={today}
            value={targetDate}
            onChange={e => setTargetDate(e.target.value)}
          />
        </label>
      </div>
      {result && (
        <div className="goal-calculator__result">
          {result.type === 'achieved' && (
            <span className="goal-calc-achieved">
              ✅ Already at {totalHours.toFixed(0)}h — target achieved!
            </span>
          )}
          {result.type === 'past' && (
            <span className="goal-calc-warn">Target date is in the past.</span>
          )}
          {result.type === 'result' && (
            <span className="goal-calc-result">
              <strong>{result.minsPerDay.toFixed(0)} min/day</strong>
              {' '}over {result.daysRemaining} days to reach {result.targetHours.toFixed(0)}h
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function Card({ label, value, sub }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

function InsightStat({ label, value, sub }) {
  return (
    <div className="insight-stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

function fmtProjection(proj) {
  if (!proj) return <span style={{ color: '#aaa' }}>—</span>
  return <>{proj.date} <span style={{ color: '#888', fontSize: '0.8em' }}>(+{proj.days}d)</span></>
}

export default function DayStatsSection({ stats }) {
  if (!stats) return null

  const maxDayMinutes = stats.bestDays[0]?.minutes || 1
  const goalPct = stats.consistencyTotal > 0
    ? (stats.goalDays / stats.consistencyTotal * 100).toFixed(1)
    : '0.0'

  return (
    <div className="day-stats-section">

      {/* ── Milestone table ── */}
      <div className="chart-card">
        <h2>Expected Milestone Dates</h2>
        <table className="milestone-table">
          <thead>
            <tr>
              <th>Milestone</th>
              <th>Overall avg<br /><span className="th-sub">{stats.allTimeAvgMinPerDay.toFixed(0)} min/day</span></th>
              <th>7-day avg<br /><span className="th-sub">{stats.avg7MinPerDay.toFixed(0)} min/day</span></th>
              <th>30-day avg<br /><span className="th-sub">{stats.avg30MinPerDay.toFixed(0)} min/day</span></th>
            </tr>
          </thead>
          <tbody>
            {stats.milestones.map(m => (
              <tr key={m.hours}>
                <td className="milestone-label">🗓️ {m.hours}h</td>
                {m.achieved ? (
                  <td colSpan={3} className="milestone-achieved">✅ Already achieved!</td>
                ) : (
                  <>
                    <td>{fmtProjection(m.overall)}</td>
                    <td>{fmtProjection(m.avg7)}</td>
                    <td>{fmtProjection(m.avg30)}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="goal-calculator__heading">Goal calculator</div>
        <GoalCalculator totalHours={stats.totalHours} />
      </div>

      {/* ── Insights + Best Days ── */}
      <div className="insights-row">
        <div className="chart-card flex-card">
          <h2>Insights</h2>
          <div className="insights-grid">
            <InsightStat label="Longest streak"    value={`${stats.longestStreak} days`} />
            <InsightStat
              label="Consistency"
              value={`${(stats.consistency * 100).toFixed(1)}%`}
              sub={`${stats.consistencyDays} of ${stats.consistencyTotal} days`}
            />
            <InsightStat label="Current streak"    value={`${stats.currentStreak} days`} />
            <InsightStat
              label="Goal streak"
              value={`${stats.currentGoalStreak} days`}
              sub={`Best: ${stats.bestGoalStreak} days`}
            />
            <InsightStat
              label="Goal achievement"
              value={`${stats.goalDays} days`}
              sub={`${goalPct}% of ${stats.consistencyTotal} days`}
            />
          </div>
        </div>

        <div className="chart-card flex-card">
          <h2>Best Days</h2>
          <div className="best-days">
            {stats.bestDays.map((d, i) => (
              <div key={d.date} className="best-day-row">
                <span className="best-day-rank">#{i + 1}</span>
                <span className="best-day-name" style={{ width: '6rem' }}>{d.date}</span>
                <div className="best-day-bar-wrap">
                  <div
                    className="best-day-bar"
                    style={{ width: `${(d.minutes / maxDayMinutes) * 100}%` }}
                  />
                </div>
                <span className="best-day-value">
                  {d.minutes > 0 ? `${d.minutes.toFixed(0)} min` : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}
