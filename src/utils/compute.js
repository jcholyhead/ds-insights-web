/**
 * compute.js — all data processing for Dreaming Spanish stats.
 * Ported from charts.py Python logic, operating on raw JSON exports.
 */

/**
 * Convert an ELO difficulty score to a 0–100 rating.
 */
export function computeRating(elo) {
  return 0.04151 * elo - 8.47
}

/**
 * Rolling average helper. Returns an array of the same length as `values`.
 * Each entry is the mean of up to `window` preceding values (inclusive).
 */
export function rollingAverage(values, window = 20) {
  const result = []
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - window + 1)
    const slice = values.slice(start, i + 1)
    const avg = slice.reduce((a, b) => a + b, 0) / slice.length
    result.push(avg)
  }
  return result
}

/**
 * Rolling percentile helper (nearest-rank method).
 * Returns an array of the same length as `values`.
 * `p` is 0–1 (e.g. 0.75 for P75).
 */
function rollingPercentile(values, window, p) {
  return values.map((_, i) => {
    const start = Math.max(0, i - window + 1)
    const sorted = values.slice(start, i + 1).slice().sort((a, b) => a - b)
    const idx = Math.ceil(p * sorted.length) - 1
    return sorted[Math.max(0, idx)]
  })
}

/**
 * Build the full chronological timeline from DS watch history and external time entries.
 *
 * watchHistory:     array from watchedVideos.json  → { videoId, lastWatched, watchPosition, watched }
 * videosById:       Map<id, video> from videos.json
 * externalEntries:  array from externalTimes.json  → { id, type, date, timeSeconds, description, ... }
 *
 * Returns array of:
 *   { ts: Date, seconds, rating (null for external), source (null for DS), cumulativeHours }
 * sorted by ts ascending.
 */
export function buildFullTimeline(videosById, watchHistory, externalEntries) {
  // DS events: watched === true
  const dsEvents = []
  for (const w of watchHistory) {
    if (!w.watched) continue
    const video = videosById.get(w.videoId)
    if (!video) continue
    const seconds = video.duration - (video.endCutout || 0)
    const rating = computeRating(video.difficultyScore)
    dsEvents.push({
      ts: new Date(w.lastWatched),
      seconds,
      rating,
      source: null,
      title: video.title,
      videoId: video._id,
    })
  }

  // External events: skip 'initial' type and blank/placeholder descriptions
  const extEvents = []
  for (const e of externalEntries) {
    if (e.type === 'initial') continue
    const desc = (e.description || '').trim()
    if (!desc || desc === '__empty__') continue
    extEvents.push({
      ts: new Date(e.date + 'T12:00:00'),
      seconds: e.timeSeconds,
      rating: null,
      source: desc,
      _ext: e,
    })
  }

  // Combine, sort, compute cumulative hours
  const all = [...dsEvents, ...extEvents].sort((a, b) => a.ts - b.ts)
  let cumSeconds = 0
  for (const row of all) {
    cumSeconds += row.seconds
    row.cumulativeHours = cumSeconds / 3600
  }

  return all
}

/**
 * Build the data series for the difficulty-over-time chart.
 *
 * Returns array of { x: cumulativeHours, rating, rollingAvg }
 * Only DS events (rating != null) are included.
 */
export function buildDifficultyData(fullTimeline) {
  const dsOnly = fullTimeline.filter(r => r.rating != null)
  const ratings = dsOnly.map(r => r.rating)
  const rolling = rollingAverage(ratings, 20)
  const p90s    = rollingPercentile(ratings, 20, 0.90)

  return dsOnly.map((row, i) => ({
    x: Math.round(row.cumulativeHours * 100) / 100,
    rating: Math.round(row.rating * 10) / 10,
    rollingAvg: Math.round(rolling[i] * 100) / 100,
    p90: Math.round(p90s[i] * 10) / 10,
    title: row.title,
  }))
}

/**
 * Find the cumulative-hours position at which each of the top N external sources
 * first appeared.
 *
 * Returns array of { name, cumulativeHours } sorted ascending by cumulativeHours.
 */
export function getFirstAppearances(fullTimeline) {
  // Walk the timeline in order; for each source's first occurrence, place the
  // marker at the cumulative hours of the row *before* that event — ensuring
  // the vertical line always sits to the left of its consumption dots.
  const seen = new Set()
  const results = []

  for (let i = 0; i < fullTimeline.length; i++) {
    const row = fullTimeline[i]
    if (row.source == null || seen.has(row.source)) continue
    seen.add(row.source)
    const cumH = i > 0 ? fullTimeline[i - 1].cumulativeHours : 0
    results.push({ name: row.source, cumulativeHours: Math.round(cumH * 100) / 100 })
  }

  return results.sort((a, b) => a.cumulativeHours - b.cumulativeHours)
}

/**
 * Return every external consumption event in the timeline with its cumulative-hours position.
 * Used to plot all occurrences of a source being consumed (not just the first appearance).
 *
 * Returns array of { name, cumulativeHours }.
 */
export function getAllConsumptionPoints(fullTimeline) {
  return fullTimeline
    .filter(r => r.source != null)
    .map(r => ({ name: r.source, cumulativeHours: Math.round(r.cumulativeHours * 100) / 100 }))
}

/**
 * Build the data for the content-split pie chart.
 *
 * Returns { slices: [{ name, value (seconds) }], totalHours }
 * First slice is always Dreaming Spanish. External sources >= 1% threshold get
 * their own slice; the rest are combined into 'Other content'.
 */
export function buildContentSplit(videosById, watchHistory, externalEntries) {
  // DS seconds
  let dsSeconds = 0
  for (const w of watchHistory) {
    if (!w.watched) continue
    const video = videosById.get(w.videoId)
    if (!video) continue
    dsSeconds += video.duration - (video.endCutout || 0)
  }

  // External seconds by source name
  const extBySource = new Map()
  for (const e of externalEntries) {
    if (e.type === 'initial') continue
    const desc = (e.description || '').trim()
    if (!desc || desc === '__empty__') continue
    extBySource.set(desc, (extBySource.get(desc) || 0) + e.timeSeconds)
  }

  const extTotal = [...extBySource.values()].reduce((a, b) => a + b, 0)
  const total = dsSeconds + extTotal
  const threshold = total * 0.01

  const slices = [{ name: 'Dreaming Spanish', value: dsSeconds }]
  let other = 0

  // Sort external sources desc so the order is consistent
  const sortedExt = [...extBySource.entries()].sort((a, b) => b[1] - a[1])
  for (const [name, secs] of sortedExt) {
    if (secs >= threshold) {
      slices.push({ name, value: secs })
    } else {
      other += secs
    }
  }

  if (other > 0) {
    slices.push({ name: 'Other content', value: other })
  }

  return { slices, totalHours: total / 3600 }
}

/**
 * Build per-guide stats for watched videos.
 *
 * Returns array of { name, hours, videos, seconds } sorted desc by seconds.
 */
export function buildGuideData(videosById, watchHistory) {
  const guideSeconds = new Map()
  const guideVideos = new Map()

  for (const w of watchHistory) {
    if (!w.watched) continue
    const video = videosById.get(w.videoId)
    if (!video) continue
    const seconds = video.duration - (video.endCutout || 0)
    for (const guide of (video.guides || [])) {
      guideSeconds.set(guide, (guideSeconds.get(guide) || 0) + seconds)
      guideVideos.set(guide, (guideVideos.get(guide) || 0) + 1)
    }
  }

  return [...guideSeconds.entries()]
    .map(([name, seconds]) => ({
      name,
      seconds,
      hours: Math.round(seconds / 3600 * 10) / 10,
      videos: guideVideos.get(name),
    }))
    .sort((a, b) => b.seconds - a.seconds)
}

/**
 * Build the guides pie chart data from guideData.
 * Applies 1% threshold; small guides go into 'Other guides'.
 *
 * Returns { slices: [{ name, value (seconds) }], totalHours }
 */
export function buildGuidesPieData(guideData) {
  const total = guideData.reduce((a, g) => a + g.seconds, 0)
  const threshold = total * 0.01

  const slices = []
  let other = 0

  for (const g of guideData) {
    if (g.seconds >= threshold) {
      slices.push({ name: g.name, value: g.seconds })
    } else {
      other += g.seconds
    }
  }

  if (other > 0) {
    slices.push({ name: 'Other guides', value: other })
  }

  return { slices, totalHours: total / 3600 }
}

/**
 * Build per-tag stats for watched videos (top N by hours).
 *
 * Returns array of { name, hours, videos } sorted desc.
 */
export function buildTagData(videosById, watchHistory, topN = 20) {
  const tagSeconds = new Map()
  const tagVideos = new Map()

  for (const w of watchHistory) {
    if (!w.watched) continue
    const video = videosById.get(w.videoId)
    if (!video) continue
    const seconds = video.duration - (video.endCutout || 0)
    for (const tag of (video.tags || [])) {
      tagSeconds.set(tag, (tagSeconds.get(tag) || 0) + seconds)
      tagVideos.set(tag, (tagVideos.get(tag) || 0) + 1)
    }
  }

  return [...tagSeconds.entries()]
    .map(([name, seconds]) => ({
      name,
      seconds,
      hours: Math.round(seconds / 3600 * 10) / 10,
      videos: tagVideos.get(name),
    }))
    .sort((a, b) => b.seconds - a.seconds)
    .slice(0, topN)
}

// ─── Day watched time ────────────────────────────────────────────────────────

/**
 * Validate dayWatchedTime entries.
 * Requires at least 7 usable entries so rolling averages are meaningful.
 */
export function validateDailyTimeEntries(entries) {
  if (!entries || entries.length === 0) {
    return { plottable: false, usable: 0, warnings: [] }
  }

  let badDate = 0
  let badTime = 0
  let usable = 0

  for (const e of entries) {
    if (!e.date || !DATE_RE.test(e.date)) { badDate++; continue }
    if (e.timeSeconds == null || e.timeSeconds <= 0) { badTime++; continue }
    usable++
  }

  const warnings = []
  if (badDate > 0) warnings.push(`${badDate} entr${badDate === 1 ? 'y has' : 'ies have'} an invalid or missing date and will be skipped.`)
  if (badTime > 0) warnings.push(`${badTime} entr${badTime === 1 ? 'y has' : 'ies have'} a zero or missing timeSeconds value and will be skipped.`)

  return { plottable: usable >= 7, usable, warnings }
}

/**
 * Build data series for the daily watch-time chart.
 *
 * Rolling averages use calendar windows (not session counts):
 *   avg7:  sum of minutes in the 7 calendar days ending on that date  / 7
 *   avg30: sum of minutes in the 30 calendar days ending on that date / 30
 *
 * allTimeAvg is total minutes / total calendar days from first to last entry.
 */
export function buildDailyTimeData(entries) {
  const valid = entries
    .filter(e => e.date && DATE_RE.test(e.date) && e.timeSeconds > 0)
    .sort((a, b) => a.date.localeCompare(b.date))

  if (valid.length < 7) return null

  // date → minutes / goalReached lookups
  const byDate     = new Map(valid.map(e => [e.date, e.timeSeconds / 60]))
  const goalByDate = new Map(valid.map(e => [e.date, e.goalReached ?? false]))

  const firstDate = new Date(valid[0].date + 'T00:00:00')
  const lastDate  = new Date(valid[valid.length - 1].date + 'T00:00:00')
  const totalDays = Math.round((lastDate - firstDate) / 86400000) + 1

  function windowSum(dateStr, days) {
    const base = new Date(dateStr + 'T00:00:00')
    let sum = 0
    for (let i = 0; i < days; i++) {
      const d = new Date(base)
      d.setDate(d.getDate() - i)
      sum += byDate.get(d.toISOString().slice(0, 10)) || 0
    }
    return sum
  }

  let cumulativeMinutes = 0
  const points = []

  for (let i = 0; i < totalDays; i++) {
    const d = new Date(firstDate)
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().slice(0, 10)
    const minutes = byDate.get(dateStr) || 0
    const calDays = i + 1

    cumulativeMinutes += minutes

    points.push({
      date: dateStr,
      minutes: Math.round(minutes * 10) / 10,
      avg7:       calDays >= 7  ? Math.round(windowSum(dateStr, 7)  / 7  * 10) / 10 : null,
      avg30:      calDays >= 30 ? Math.round(windowSum(dateStr, 30) / 30 * 10) / 10 : null,
      allTimeAvg: Math.round(cumulativeMinutes / calDays * 10) / 10,
      cumulativeHours: Math.round(cumulativeMinutes / 60 * 100) / 100,
      goalReached: goalByDate.get(dateStr) ?? false,
    })
  }

  return { points }
}

// ─── Day stats analytics ─────────────────────────────────────────────────────

const MILESTONES_H = [50, 150, 300, 600, 1000, 1500]

/**
 * Full analytics derived from dayWatchedTime entries.
 * `today` must be a YYYY-MM-DD string (pass new Date().toISOString().slice(0,10)).
 */
export function buildDayStats(entries, today) {
  const valid = entries
    .filter(e => e.date && DATE_RE.test(e.date) && e.timeSeconds > 0)
    .sort((a, b) => a.date.localeCompare(b.date))

  if (valid.length === 0) return null

  const byDate = new Map(valid.map(e => [e.date, e]))
  const dateSet = new Set(valid.map(e => e.date))
  const goalSet = new Set(valid.filter(e => e.goalReached).map(e => e.date))

  const firstDate = valid[0].date
  const lastDate  = valid[valid.length - 1].date
  const firstD    = new Date(firstDate + 'T00:00:00')
  const todayD    = new Date(today + 'T00:00:00')
  const totalCalDays = Math.round((todayD - firstD) / 86400000) + 1

  // Today / yesterday helpers
  const yesterday = new Date(todayD)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().slice(0, 10)

  // Summary
  const todayEntry = byDate.get(today)
  const minutesToday = todayEntry ? todayEntry.timeSeconds / 60 : null
  const totalSeconds = valid.reduce((s, e) => s + e.timeSeconds, 0)
  const totalHours = totalSeconds / 3600
  const allTimeAvgMinPerDay = (totalSeconds / 60) / totalCalDays

  // Rolling window average ending at a given date
  function windowAvg(dateStr, days) {
    const base = new Date(dateStr + 'T00:00:00')
    let sum = 0
    for (let i = 0; i < days; i++) {
      const d = new Date(base)
      d.setDate(d.getDate() - i)
      sum += (byDate.get(d.toISOString().slice(0, 10))?.timeSeconds || 0) / 60
    }
    return sum / days
  }

  const avg7MinPerDay  = windowAvg(today, 7)
  const avg30MinPerDay = windowAvg(today, 30)

  // ── Streaks ──────────────────────────────────────────────────────────────

  // Walk the calendar from firstDate to today, collecting streak lengths
  function allStreaks(set) {
    const streaks = []
    let run = 0
    for (let i = 0; i < totalCalDays; i++) {
      const d = new Date(firstD)
      d.setDate(d.getDate() + i)
      const ds = d.toISOString().slice(0, 10)
      if (set.has(ds)) {
        run++
      } else {
        if (run > 0) streaks.push(run)
        run = 0
      }
    }
    if (run > 0) streaks.push(run)
    return streaks
  }

  // Current streak: walk backwards from startDate
  function currentRun(set, startDate) {
    let count = 0
    const d = new Date(startDate + 'T00:00:00')
    while (true) {
      const ds = d.toISOString().slice(0, 10)
      if (!set.has(ds)) break
      count++
      d.setDate(d.getDate() - 1)
    }
    return count
  }

  const watchStreaks = allStreaks(dateSet)
  const longestStreak = Math.max(...watchStreaks, 0)
  const avgStreakLength = watchStreaks.length
    ? watchStreaks.reduce((s, v) => s + v, 0) / watchStreaks.length
    : 0

  // Current watch streak — only live if streak reaches yesterday or today
  const currentStreak = lastDate >= yesterdayStr ? currentRun(dateSet, lastDate) : 0

  const goalStreaks = allStreaks(goalSet)
  const bestGoalStreak = Math.max(...goalStreaks, 0)
  const lastGoalDate = [...goalSet].sort().pop() ?? null
  const currentGoalStreak = lastGoalDate && lastGoalDate >= yesterdayStr
    ? currentRun(goalSet, lastGoalDate)
    : 0

  // ── Consistency & goal achievement ───────────────────────────────────────

  const consistencyDays = valid.length
  const goalDays = goalSet.size

  // ── Top 10 dates by minutes watched ───────────────────────────────

  const bestDays = valid
    .map(e => ({
      date: e.date,
      minutes: Math.round(e.timeSeconds / 60 * 10) / 10,
    }))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 10)

  // ── Milestone projections ─────────────────────────────────────────────────

  function projectDate(hoursNeeded, avgMinPerDay) {
    if (avgMinPerDay <= 0) return null
    const days = Math.ceil(hoursNeeded / (avgMinPerDay / 60))
    const d = new Date(todayD)
    d.setDate(d.getDate() + days)
    return { date: d.toISOString().slice(0, 10), days }
  }

  const milestones = MILESTONES_H.map(h => {
    if (totalHours >= h) return { hours: h, achieved: true }
    const needed = h - totalHours
    return {
      hours: h,
      achieved: false,
      overall: projectDate(needed, allTimeAvgMinPerDay),
      avg7:    projectDate(needed, avg7MinPerDay),
      avg30:   projectDate(needed, avg30MinPerDay),
    }
  })

  return {
    minutesToday,
    totalHours,
    allTimeAvgMinPerDay,
    avg7MinPerDay,
    avg30MinPerDay,
    currentStreak,
    longestStreak,
    avgStreakLength,
    consistency: consistencyDays / totalCalDays,
    consistencyDays,
    consistencyTotal: totalCalDays,
    goalDays,
    currentGoalStreak,
    bestGoalStreak,
    bestDays,
    milestones,
  }
}

// ─── External time validation ───────────────────────────────────────────────

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Validate external time entries and return a report.
 *
 * Returns:
 *   { plottable: bool, usable: number, warnings: string[] }
 *
 * `plottable` is true when there are at least 3 usable entries.
 * `usable` is the count of entries that pass all checks.
 * `warnings` is a human-readable list of issues found.
 */
export function validateExternalEntries(entries) {
  if (!entries || entries.length === 0) {
    return { plottable: false, usable: 0, warnings: [] }
  }

  let emptyDesc = 0
  let badDate = 0
  let badTime = 0
  let usable = 0

  for (const e of entries) {
    if (e.type === 'initial') continue
    const desc = (e.description || '').trim()
    if (!desc || desc === '__empty__') { emptyDesc++; continue }
    if (!e.date || !DATE_RE.test(e.date)) { badDate++; continue }
    if (!e.timeSeconds || e.timeSeconds <= 0) { badTime++; continue }
    usable++
  }

  const nonInitial = entries.filter(e => e.type !== 'initial').length
  const skipped = nonInitial - usable
  const warnings = []

  if (emptyDesc > 0) {
    warnings.push(`${emptyDesc} entr${emptyDesc === 1 ? 'y has' : 'ies have'} no description and will be skipped.`)
  }
  if (badDate > 0) {
    warnings.push(`${badDate} entr${badDate === 1 ? 'y has' : 'ies have'} a missing or invalid date (expected YYYY-MM-DD) and will be skipped.`)
  }
  if (badTime > 0) {
    warnings.push(`${badTime} entr${badTime === 1 ? 'y has' : 'ies have'} a zero or missing timeSeconds value and will be skipped.`)
  }

  // Warn when more than half the data is unusable
  if (nonInitial > 0 && skipped / nonInitial > 0.5) {
    warnings.unshift(
      `Over half of your external time entries (${skipped} of ${nonInitial}) have issues — charts may not reflect your full external history.`
    )
  }

  return { plottable: usable >= 3, usable, warnings }
}

// ─── Excel export helpers ───────────────────────────────────────────────────

function fmtDuration(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`
  return `${s}s`
}

/**
 * Build the flat row array for the History sheet.
 * Rows are sorted chronologically (DS rows use exact timestamp; external use noon on their date).
 */
export function buildExportRows(videosById, watchHistory, externalEntries) {
  const rows = []

  for (const w of watchHistory) {
    if (!w.watched) continue
    const v = videosById.get(w.videoId)
    if (!v) continue
    const watchedSecs = v.duration - (v.endCutout || 0)
    const ts = w.lastWatched.replace('Z', '')  // strip UTC marker — keep local-ish
    const [date, timePart] = ts.split('T')
    rows.push({
      Date: date,
      Time: timePart.slice(0, 5),
      Source: 'Dreaming Spanish',
      Title: v.title,
      Duration: fmtDuration(watchedSecs),
      'Duration (mins)': Math.round(watchedSecs / 60 * 10) / 10,
      Level: v.level,
      'Difficulty Rating': Math.round(computeRating(v.difficultyScore) * 10) / 10,
      Guides: (v.guides || []).join(', '),
      Activity: 'watching',
      _sortKey: date + 'T' + timePart.slice(0, 5),
    })
  }

  for (const e of externalEntries) {
    if (e.type === 'initial') continue
    const desc = (e.description || '').trim()
    if (!desc || desc === '__empty__') continue
    rows.push({
      Date: e.date,
      Time: '',
      Source: desc,
      Title: '',
      Duration: fmtDuration(e.timeSeconds),
      'Duration (mins)': Math.round(e.timeSeconds / 60 * 10) / 10,
      Level: '',
      'Difficulty Rating': '',
      Guides: '',
      Activity: e.type,
      _sortKey: e.date + 'T12:00',
    })
  }

  rows.sort((a, b) => a._sortKey.localeCompare(b._sortKey))

  // Strip the internal sort key before export
  return rows.map(({ _sortKey, ...rest }) => rest)
}

/**
 * Build the summary rows for the By Source sheet.
 */
export function buildSummaryRows(videosById, watchHistory, externalEntries) {
  const bySource = new Map()  // name → { seconds, sessions }

  for (const w of watchHistory) {
    if (!w.watched) continue
    const v = videosById.get(w.videoId)
    if (!v) continue
    const secs = v.duration - (v.endCutout || 0)
    const curr = bySource.get('Dreaming Spanish') || { seconds: 0, sessions: 0 }
    bySource.set('Dreaming Spanish', { seconds: curr.seconds + secs, sessions: curr.sessions + 1 })
  }

  for (const e of externalEntries) {
    if (e.type === 'initial') continue
    const desc = (e.description || '').trim()
    if (!desc || desc === '__empty__') continue
    const curr = bySource.get(desc) || { seconds: 0, sessions: 0 }
    bySource.set(desc, { seconds: curr.seconds + e.timeSeconds, sessions: curr.sessions + 1 })
  }

  const totalSecs = [...bySource.values()].reduce((s, v) => s + v.seconds, 0)

  return [...bySource.entries()]
    .sort((a, b) => b[1].seconds - a[1].seconds)
    .map(([name, { seconds, sessions }]) => ({
      Source: name,
      'Total Hours': Math.round(seconds / 3600 * 10) / 10,
      Sessions: sessions,
      '% of Total': Math.round(seconds / totalSecs * 1000) / 10,
    }))
}

/**
 * Build summary stats for the info panel.
 *
 * difficultyData: output of buildDifficultyData (includes title per point)
 * fullTimeline:   output of buildFullTimeline
 * guideData:      output of buildGuideData (sorted desc)
 * tagData:        output of buildTagData (sorted desc, top 20)
 */
export function buildInfoPanel(fullTimeline, difficultyData, guideData, tagData) {
  const totalHours = fullTimeline.length > 0
    ? fullTimeline[fullTimeline.length - 1].cumulativeHours
    : 0

  const dsEvents = fullTimeline.filter(e => e.rating != null)
  const dsHours = dsEvents.reduce((s, e) => s + e.seconds, 0) / 3600
  const extHours = totalHours - dsHours

  const sorted = [...difficultyData].sort((a, b) => b.rating - a.rating)
  const hardest = sorted[0]
  const easiest = sorted[sorted.length - 1]

  const avgRating = difficultyData.reduce((s, d) => s + d.rating, 0) / difficultyData.length
  const currentRollingAvg = difficultyData[difficultyData.length - 1]?.rollingAvg

  return {
    totalHours,
    dsHours,
    extHours,
    videosWatched: dsEvents.length,
    avgRating,
    currentRollingAvg,
    hardest,
    easiest,
    topGuide: guideData[0] ?? null,
    topTag: tagData[0] ?? null,
  }
}
