function StatCard({ label, value, sub, allTime }) {
  return (
    <div className={`stat-card${allTime ? ' stat-card--alltime' : ''}`}>
      <div className="stat-label">
        {label}
        {allTime && <span className="stat-alltime-badge">all-time</span>}
      </div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

export default function InfoPanel({ info, dayStats }) {
  if (!info) return null

  return (
    <div className="info-panel">
      <StatCard
        label="Total viewing time"
        value={`${info.totalHours.toFixed(1)}h`}
        sub={`DS ${info.dsHours.toFixed(1)}h · External ${info.extHours.toFixed(1)}h`}
      />
      <StatCard
        label="DS videos watched"
        value={info.videosWatched.toLocaleString()}
      />
      <StatCard
        label="Current difficulty"
        value={info.currentRollingAvg?.toFixed(1) ?? '—'}
        sub="20-video rolling avg"
      />
      <StatCard
        label="Average difficulty"
        value={info.avgRating?.toFixed(1) ?? '—'}
        sub="across all watched videos"
      />
      <StatCard
        label="Most difficult video"
        value={info.hardest?.title ?? '—'}
        sub={info.hardest ? `Rating ${info.hardest.rating.toFixed(1)}` : null}
      />
      <StatCard
        label="Easiest video"
        value={info.easiest?.title ?? '—'}
        sub={info.easiest ? `Rating ${info.easiest.rating.toFixed(1)}` : null}
      />
      {info.topGuide && (
        <StatCard
          label="Favourite guide"
          value={info.topGuide.name}
          sub={`${info.topGuide.hours.toFixed(1)}h watched`}
        />
      )}
      {info.topTag && (
        <StatCard
          label="Favourite topic"
          value={info.topTag.name}
          sub={`${info.topTag.hours.toFixed(1)}h · ${info.topTag.videos} videos`}
        />
      )}

      {dayStats && (
        <>
          <StatCard
            label="Minutes watched today"
            value={dayStats.minutesToday !== null ? dayStats.minutesToday.toFixed(1) : '—'}
            sub={dayStats.minutesToday === null ? 'No entry for today yet' : null}
            allTime
          />
          <StatCard
            label="Current streak"
            value={`${dayStats.currentStreak} day${dayStats.currentStreak !== 1 ? 's' : ''}`}
            sub={`Longest: ${dayStats.longestStreak} days`}
            allTime
          />
          <StatCard
            label="Total hours watched"
            value={dayStats.totalHours.toFixed(1)}
            allTime
          />
          <StatCard
            label="Average minutes / day"
            value={dayStats.allTimeAvgMinPerDay.toFixed(1)}
            sub="incl. rest days"
            allTime
          />
        </>
      )}
    </div>
  )
}
