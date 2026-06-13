import { useState, useEffect, useMemo } from 'react'
import {
  buildFullTimeline,
  buildDifficultyData,
  getFirstAppearances,
  buildContentSplit,
  buildGuideData,
  buildGuidesPieData,
  buildTagData,
  buildInfoPanel,
  buildExportRows,
  buildSummaryRows,
  validateExternalEntries,
  validateDailyTimeEntries,
  buildDailyTimeData,
  buildDayStats,
  getAllConsumptionPoints,
} from './utils/compute'
import DifficultyChart from './components/DifficultyChart'
import ContentSplitChart from './components/ContentSplitChart'
import GuidesPieChart from './components/GuidesPieChart'
import GuidesBarChart from './components/GuidesBarChart'
import TagsBarChart from './components/TagsBarChart'
import InfoPanel from './components/InfoPanel'
import ExportButton from './components/ExportButton'
import DailyTimeChart from './components/DailyTimeChart'
import DayStatsSection from './components/DayStatsSection'
import './App.css'

const EXTENSION_STORE_URL = 'https://chromewebstore.google.com/detail/dreaming-insights-extensi/cafjfdpcidjkbpcjpgdkgoakjdiicbmh'

const LEVELS = [
  { level: 1, minHours: 0,    maxHours: 50   },
  { level: 2, minHours: 50,   maxHours: 150  },
  { level: 3, minHours: 150,  maxHours: 300  },
  { level: 4, minHours: 300,  maxHours: 600  },
  { level: 5, minHours: 600,  maxHours: 1000 },
  { level: 6, minHours: 1000, maxHours: 1500 },
  { level: 7, minHours: 1500, maxHours: Infinity },
]

function topAchievedLevel(totalHours) {
  const achieved = LEVELS.filter(l => totalHours >= l.minHours)
  return achieved[achieved.length - 1]?.level ?? 1
}

export default function Demo() {
  const [charts, setCharts] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [fromLevel, setFromLevel] = useState(1)
  const [toLevel, setToLevel] = useState(1)

  useEffect(() => {
    async function load() {
      try {
        const [watchedRes, externalRes, daytimeRes] = await Promise.all([
          fetch('/demo/watched.json'),
          fetch('/demo/external.json'),
          fetch('/demo/daytime.json'),
        ])

        if (!watchedRes.ok) throw new Error(`Could not load demo/watched.json (${watchedRes.status})`)

        const watchedData  = await watchedRes.json()
        const externalData = externalRes.ok ? await externalRes.json() : { externalTimes: [] }
        const daytimeRaw   = daytimeRes.ok  ? await daytimeRes.json()  : []

        const watchHistory = watchedData.watchedVideos
        if (!Array.isArray(watchHistory)) throw new Error('demo/watched.json must have a watchedVideos array')

        const lang = (watchedData.language || 'es').toLowerCase()
        const catalogueRes = await fetch(`/videos-${lang}.json`)
        if (!catalogueRes.ok) throw new Error(`Could not load videos-${lang}.json`)
        const { videos } = await catalogueRes.json()

        let externalEntries = []
        if (Array.isArray(externalData.externalTimes)) {
          const v = validateExternalEntries(externalData.externalTimes)
          if (v.plottable) externalEntries = externalData.externalTimes
        }

        let dayTimeEntries = []
        const arr = Array.isArray(daytimeRaw) ? daytimeRaw : daytimeRaw.dayWatchedTime ?? []
        if (Array.isArray(arr)) {
          const v = validateDailyTimeEntries(arr)
          if (v.plottable) dayTimeEntries = arr
        }

        const videosById    = new Map(videos.map(v => [v._id, v]))
        const fullTimeline  = buildFullTimeline(videosById, watchHistory, externalEntries)
        const difficultyData = buildDifficultyData(fullTimeline)
        const appearances   = getFirstAppearances(fullTimeline)
        const allConsumptionPoints = getAllConsumptionPoints(fullTimeline)
        const { slices: contentSlices, totalHours: contentTotalHours } =
          buildContentSplit(videosById, watchHistory, externalEntries)
        const guideData     = buildGuideData(videosById, watchHistory)
        const { slices: guideSlices, totalHours: guidesTotalHours } = buildGuidesPieData(guideData)
        const tagData       = buildTagData(videosById, watchHistory, 20)
        const infoPanel     = buildInfoPanel(fullTimeline, difficultyData, guideData, tagData)
        const exportRows    = buildExportRows(videosById, watchHistory, externalEntries)
        const summaryRows   = buildSummaryRows(videosById, watchHistory, externalEntries)
        const today         = new Date().toISOString().slice(0, 10)
        const dailyTimeData = buildDailyTimeData(dayTimeEntries)
        const dayStats      = buildDayStats(dayTimeEntries, today)
        const totalHours    = fullTimeline.length
          ? fullTimeline[fullTimeline.length - 1].cumulativeHours
          : 0

        const result = {
          fullTimeline, videosById, difficultyData, appearances, allConsumptionPoints,
          contentSlices, contentTotalHours, guideData, guideSlices, guidesTotalHours,
          tagData, infoPanel, exportRows, summaryRows,
          hasExternalData: externalEntries.length > 0,
          dailyPoints: dailyTimeData?.points ?? [],
          dayStats, totalHours,
          rawWatchedVideos: watchHistory,
          rawExternalEntries: externalEntries,
          dayTimeEntries,
          dayTimeCount: dayTimeEntries.length,
        }

        setCharts(result)
        setFromLevel(1)
        setToLevel(topAchievedLevel(totalHours))
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const filteredData = useMemo(() => {
    if (!charts) return null
    const from  = LEVELS.find(l => l.level === fromLevel)
    const to    = LEVELS.find(l => l.level === toLevel)
    const fromH = from.minHours
    const toH   = to.maxHours

    const inRange = h => h >= fromH && (toH === Infinity || h < toH)

    const filteredTimeline = charts.fullTimeline.filter(e => inRange(e.cumulativeHours))
    const filteredWatch    = filteredTimeline.filter(e => e.videoId != null).map(e => ({ watched: true, videoId: e.videoId }))
    const filteredExt      = filteredTimeline.filter(e => e._ext != null).map(e => e._ext)

    const guideData    = buildGuideData(charts.videosById, filteredWatch)
    const { slices: guideSlices, totalHours: guidesTotalHours } = buildGuidesPieData(guideData)
    const tagData      = buildTagData(charts.videosById, filteredWatch, 20)
    const { slices: contentSlices, totalHours: contentTotalHours } =
      buildContentSplit(charts.videosById, filteredWatch, filteredExt)

    const difficultyData    = charts.difficultyData.filter(d => inRange(d.x))
    const appearances       = charts.appearances.filter(a => inRange(a.cumulativeHours))
    const consumptionPoints = charts.allConsumptionPoints.filter(p => inRange(p.cumulativeHours))
    const dailyPoints       = charts.dailyPoints.filter(p => inRange(p.cumulativeHours))
    const infoPanel         = buildInfoPanel(filteredTimeline, difficultyData, guideData, tagData)

    return {
      ...charts,
      guideData, guideSlices, guidesTotalHours,
      tagData, contentSlices, contentTotalHours,
      difficultyData, appearances, consumptionPoints, dailyPoints,
      infoPanel, xMin: fromH,
    }
  }, [charts, fromLevel, toLevel]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleLevelClick(level) {
    if (level < fromLevel) {
      setFromLevel(level)
    } else if (level > toLevel) {
      setToLevel(level)
    } else if (level === fromLevel && level === toLevel) {
      // single level selected — no-op
    } else if (level === fromLevel) {
      setFromLevel(level + 1)
    } else if (level === toLevel) {
      setToLevel(level - 1)
    } else {
      setFromLevel(level)
      setToLevel(level)
    }
  }

  return (
    <>
      <header>
        <div className="header-inner">
          <svg className="header-icon" viewBox="0 0 40 30" fill="none" aria-hidden="true">
            <rect x="0"  y="20" width="8"  height="10" rx="2" fill="white" opacity="0.6"/>
            <rect x="11" y="13" width="8"  height="17" rx="2" fill="white" opacity="0.75"/>
            <rect x="22" y="6"  width="8"  height="24" rx="2" fill="white" opacity="0.9"/>
            <rect x="33" y="0"  width="7"  height="30" rx="2" fill="white"/>
            <path d="M4 19 L15 12 L26 5 L36.5 0.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.45"/>
          </svg>
          <div>
            <h1>Dreaming Insights</h1>
            <p>Your immersion journey, visualised</p>
          </div>
        </div>
      </header>

      <div className="demo-banner">
        <div className="demo-banner__inner">
          <span className="demo-banner__label">Demo</span>
          <span className="demo-banner__text">
            This is an example learner's journey. Want to see your own stats?
          </span>
          <div className="demo-banner__actions">
            <a className="demo-banner__btn demo-banner__btn--primary" href={EXTENSION_STORE_URL} target="_blank" rel="noreferrer">
              Install the extension →
            </a>
            <a className="demo-banner__btn" href="/">
              Go to the app
            </a>
          </div>
        </div>
      </div>

      <main>
        {loading && (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#888' }}>
            Loading demo data…
          </div>
        )}

        {error && (
          <div className="error" role="alert">{error}</div>
        )}

        {charts && (
          <div className="level-filter-bar">
            <span className="level-filter__label">Filter data by DS level</span>
            <div className="level-filter__buttons">
              {LEVELS.map(l => {
                const achieved = charts.totalHours >= l.minHours
                const selected = l.level >= fromLevel && l.level <= toLevel
                return (
                  <button
                    key={l.level}
                    className={[
                      'level-btn',
                      selected  ? 'level-btn--selected'   : '',
                      !achieved ? 'level-btn--unachieved' : '',
                    ].join(' ').trim()}
                    onClick={() => achieved && handleLevelClick(l.level)}
                    disabled={!achieved}
                    title={achieved
                      ? `Level ${l.level}: ${l.minHours}–${l.maxHours === Infinity ? '∞' : l.maxHours}h`
                      : `Not yet reached (requires ${l.minHours}h)`}
                  >
                    {l.level}
                  </button>
                )
              })}
            </div>
            <span className="level-filter__range">
              {(() => {
                const f = LEVELS.find(l => l.level === fromLevel)
                const t = LEVELS.find(l => l.level === toLevel)
                const range = t.maxHours === Infinity ? `${f.minHours}h+` : `${f.minHours}–${t.maxHours}h`
                return fromLevel === toLevel
                  ? `Level ${fromLevel} · ${range}`
                  : `Levels ${fromLevel}–${toLevel} · ${range}`
              })()}
            </span>
          </div>
        )}

        {filteredData && (
          <>
            <InfoPanel info={filteredData.infoPanel} dayStats={charts.dayStats} />
            <ExportButton exportRows={charts.exportRows} summaryRows={charts.summaryRows} />

            <section className="charts">
              {charts.dayStats && <DayStatsSection stats={charts.dayStats} />}

              {filteredData.dailyPoints.length > 0 && (
                <DailyTimeChart points={filteredData.dailyPoints} />
              )}

              <DifficultyChart
                difficultyData={filteredData.difficultyData}
                appearances={filteredData.appearances}
                consumptionPoints={filteredData.consumptionPoints}
                hasExternalData={charts.hasExternalData}
                xMin={filteredData.xMin}
              />

              <div className="chart-card">
                <h2>Content Split by Time ({Math.round(filteredData.contentTotalHours)}h total)</h2>
                <ContentSplitChart slices={filteredData.contentSlices} totalHours={filteredData.contentTotalHours} />
              </div>

              <div className="chart-card">
                <h2>Viewing by Guide ({Math.round(filteredData.guidesTotalHours)}h)</h2>
                <GuidesPieChart slices={filteredData.guideSlices} totalHours={filteredData.guidesTotalHours} />
              </div>

              <div className="chart-card">
                <h2>Hours Watched per Guide</h2>
                <GuidesBarChart guideData={filteredData.guideData} />
              </div>

              <div className="chart-card">
                <h2>Top 20 Tags by Hours Watched</h2>
                <TagsBarChart tagData={filteredData.tagData} />
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="site-footer">
        <a href="https://forms.gle/F7FzqFdQ9yA5XgtJA" target="_blank" rel="noreferrer">Contact / Support</a>
        <span className="site-footer__sep">·</span>
        <a href="/privacy.html" target="_blank" rel="noreferrer">Privacy Policy</a>
        <span className="site-footer__sep">·</span>
        <a href="https://github.com/jcholyhead/ds-insights-web" target="_blank" rel="noreferrer">Source Code</a>
      </footer>
    </>
  )
}
