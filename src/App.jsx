import { useState, useEffect, useRef, useMemo } from 'react'
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
import ResearchConsentModal from './components/ResearchConsentModal'
import './App.css'

const EXTENSION_STORE_URL = 'https://chromewebstore.google.com/detail/dreaming-insights-extensi/cafjfdpcidjkbpcjpgdkgoakjdiicbmh'

const RESEARCH_API_URL = import.meta.env.VITE_RESEARCH_API_URL
const RESEARCH_API_KEY = import.meta.env.VITE_RESEARCH_API_KEY
const RESEARCH_STORAGE_KEY = 'ds-stats-research'

async function computeResearchHash(dayTimeEntries) {
  if (!dayTimeEntries || dayTimeEntries.length < 2) return null
  const r0 = dayTimeEntries[0]
  const r1 = dayTimeEntries[1]
  const input = `${r0.date}:${r0.timeSeconds}:${r1.date}:${r1.timeSeconds}`
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

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

function ExtensionGate({ onManual }) {
  return (
    <div className="extension-gate">
      <div className="extension-gate__inner">
        <div className="extension-gate__header">
          <h1>Dreaming Insights</h1>
          <p>Choose how you'd like to get started.</p>
          <a href="/demo.html" className="gate-demo-link">See an example first →</a>
        </div>

        <div className="extension-gate__options">

          {/* ── Option 1: extension ── */}
          <div className="gate-option gate-option--primary">
            <div className="gate-option__icon">🧩</div>
            <h2>Use the extension</h2>
            <p className="gate-option__desc">
              The <strong>Dreaming Insights</strong> Chrome extension fetches
              your data automatically whenever you visit your Dreaming Spanish or
              Dreaming French progress page. No manual steps required.
            </p>
            <a
              className="gate-option__btn gate-option__btn--primary"
              href={EXTENSION_STORE_URL}
              target="_blank"
              rel="noreferrer"
            >
              Install Dreaming Insights →
            </a>
            <p className="gate-option__hint">
              After installing, refresh this page.
            </p>
          </div>

          {/* ── Option 2: manual import ── */}
          <div className="gate-option">
            <div className="gate-option__icon">📋</div>
            <h2>Import manually</h2>
            <p className="gate-option__desc">
              You can paste JSON directly from the Dreaming Spanish API.
              You'll need to be logged in and comfortable opening browser
              DevTools.
            </p>

            <ol className="gate-option__steps">
              <li>
                Log in to Dreaming Spanish and open{' '}
                <strong>https://app.dreaming.com/spanish/progress</strong> (or
                your profile page).
              </li>
              <li>
                Open DevTools (<kbd>F12</kbd> or <kbd>⌥⌘I</kbd>) and go to the{' '}
                <strong>Network</strong> tab. Reload the page.
              </li>
              <li>
                Filter by <code>watchedVideos</code> and copy the JSON response
                — this is the <strong>required</strong> data source.
              </li>
              <li>
                Optionally repeat for <code>externalTimes</code> and{' '}
                <code>dayWatchedTime</code> to unlock additional charts.
              </li>
            </ol>

            <button
              className="gate-option__btn gate-option__btn--secondary"
              onClick={onManual}
            >
              Continue with manual import →
            </button>
          </div>

        </div>
      </div>
      <footer className="site-footer">
        <a href="https://forms.gle/F7FzqFdQ9yA5XgtJA" target="_blank" rel="noreferrer">Contact / Support</a>
        <span className="site-footer__sep">·</span>
        <a href="/privacy.html" target="_blank" rel="noreferrer">Privacy Policy</a>
        <span className="site-footer__sep">·</span>
        <a href="https://github.com/jcholyhead/ds-insights-web" target="_blank" rel="noreferrer">Source Code</a>
      </footer>
    </div>
  )
}

function StatusCard({ label, status }) {
  const ok = status === 'valid'
  return (
    <div className={`status-card ${ok ? 'status-card--ok' : 'status-card--missing'}`}>
      <span className="status-icon">{ok ? '✓' : '¿'}</span>
      <span className="status-label">{label}</span>
    </div>
  )
}

export default function App() {
  // 'installed' | 'checking' | 'not-installed' | 'manual'
  // Lazy initializer runs synchronously before first paint — resolves immediately
  // for extension users so there's no layout shift.
  const [extInstalled, setExtInstalled] = useState(() =>
    document.documentElement.dataset.dreamingInsights === 'true'
      ? 'installed'
      : 'checking'
  )

  useEffect(() => {
    if (extInstalled === 'installed') return

    const onReady = (e) => {
      if (e.detail?.installed) setExtInstalled('installed')
    }
    document.addEventListener('dreaming-insights-ready', onReady)

    const timer = setTimeout(
      () => setExtInstalled(s => s === 'checking' ? 'not-installed' : s),
      1500
    )

    return () => {
      document.removeEventListener('dreaming-insights-ready', onReady)
      clearTimeout(timer)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [watchedText, setWatchedText] = useState('')
  const [externalText, setExternalText] = useState('')
  const [language, setLanguage] = useState('es')
  const [isProcessing, setIsProcessing] = useState(false)
  const videoCatalogues = useRef({})
  const handleGenerateRef = useRef(null)
  const autoGenFired = useRef(false)
  const [dayTimeText, setDayTimeText] = useState('')
  const [showInputs, setShowInputs] = useState(false)
  const [charts, setCharts] = useState(null)
  const [fromLevel, setFromLevel] = useState(1)
  const [toLevel, setToLevel] = useState(1)
  const [error, setError] = useState('')
  const [extWarnings, setExtWarnings] = useState([])
  const [dayWarnings, setDayWarnings] = useState([])
  const [researchState, setResearchState] = useState(() => {
    try { return JSON.parse(localStorage.getItem(RESEARCH_STORAGE_KEY)) } catch { return null }
  })
  const [uploadStatus, setUploadStatus] = useState(null) // null | 'uploading' | 'done' | 'error'
  const [showResearchModal, setShowResearchModal] = useState(false)

  async function handleGenerate() {
    setError('')
    setExtWarnings([])
    setDayWarnings([])
    setCharts(null)
    setIsProcessing(true)

    try {
      // ── Parse watched videos (required) ────────────────────────────
      let watchedData
      try { watchedData = JSON.parse(watchedText) }
      catch { throw new Error('Invalid JSON in the watched-videos field.') }

      const watchHistory = watchedData.watchedVideos
      if (!Array.isArray(watchHistory))
        throw new Error('watched-videos.json must have a top-level "watchedVideos" array.')

      // ── Detect language + lazy-load the right catalogue ────────────
      // Extension path: reads `language` field injected at root of the JSON.
      // Manual path: uses the language selector (defaults to 'es').
      const injected = watchedData.language?.toLowerCase()
      const resolvedLang = ['es', 'fr'].includes(injected ?? language)
        ? (injected ?? language)
        : 'es'

      if (!videoCatalogues.current[resolvedLang]) {
        const r = await fetch(`/videos-${resolvedLang}.json`)
        if (!r.ok) throw new Error(`Failed to load video catalogue (${resolvedLang}): HTTP ${r.status}`)
        const data = await r.json()
        videoCatalogues.current[resolvedLang] = data.videos
      }
      const videos = videoCatalogues.current[resolvedLang]

      // ── Parse external time (optional) ─────────────────────────────
      let externalEntries = []
      if (externalText.trim()) {
        let externalData
        try { externalData = JSON.parse(externalText) }
        catch { throw new Error('Invalid JSON in the external-time field.') }

        if (!Array.isArray(externalData.externalTimes))
          throw new Error('external-time.json must have a top-level "externalTimes" array.')

        const validation = validateExternalEntries(externalData.externalTimes)
        if (validation.warnings.length > 0) setExtWarnings(validation.warnings)
        if (validation.plottable) externalEntries = externalData.externalTimes
      }

      // ── Parse day watched time (optional) ──────────────────────────
      let dayTimeEntries = []
      if (dayTimeText.trim()) {
        let parsed
        try { parsed = JSON.parse(dayTimeText) }
        catch { throw new Error('Invalid JSON in the day watched time field.') }

        const arr = Array.isArray(parsed) ? parsed : parsed.dayWatchedTime ?? parsed.data ?? null
        if (!Array.isArray(arr))
          throw new Error('Day watched time data must be a JSON array (or an object with a "dayWatchedTime" array).')

        const validation = validateDailyTimeEntries(arr)
        if (validation.warnings.length > 0) setDayWarnings(validation.warnings)
        if (validation.plottable) dayTimeEntries = arr
      }

      // ── Compute ────────────────────────────────────────────────────
      const videosById = new Map(videos.map(v => [v._id, v]))
      const fullTimeline = buildFullTimeline(videosById, watchHistory, externalEntries)
      const difficultyData = buildDifficultyData(fullTimeline)
      const appearances = getFirstAppearances(fullTimeline)
      const allConsumptionPoints = getAllConsumptionPoints(fullTimeline)
      const { slices: contentSlices, totalHours: contentTotalHours } =
        buildContentSplit(videosById, watchHistory, externalEntries)
      const guideData = buildGuideData(videosById, watchHistory)
      const { slices: guideSlices, totalHours: guidesTotalHours } = buildGuidesPieData(guideData)
      const tagData = buildTagData(videosById, watchHistory, 20)
      const infoPanel = buildInfoPanel(fullTimeline, difficultyData, guideData, tagData)
      const exportRows = buildExportRows(videosById, watchHistory, externalEntries)
      const summaryRows = buildSummaryRows(videosById, watchHistory, externalEntries)
      const today = new Date().toISOString().slice(0, 10)
      const dailyTimeData = buildDailyTimeData(dayTimeEntries)
      const dayStats = buildDayStats(dayTimeEntries, today)
      const totalHours = fullTimeline.length
        ? fullTimeline[fullTimeline.length - 1].cumulativeHours
        : 0

      setCharts({
        fullTimeline,
        videosById,
        difficultyData,
        appearances,
        contentSlices,
        contentTotalHours,
        guideData,
        guideSlices,
        guidesTotalHours,
        tagData,
        infoPanel,
        exportRows,
        summaryRows,
        allConsumptionPoints,
        hasExternalData: externalEntries.length > 0,
        dailyPoints: dailyTimeData?.points ?? [],
        dayStats,
        totalHours,
        // Raw data stored for research uploads
        rawWatchedVideos: watchHistory,
        rawExternalEntries: externalEntries,
        dayTimeEntries,
        dayTimeCount: dayTimeEntries.length,
      })
      setFromLevel(1)
      setToLevel(topAchievedLevel(totalHours))

    } catch (err) {
      setError(err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  // Derive level-filtered chart data. Recomputes whenever charts or the level
  // selection changes. All visual charts use filteredData, not charts directly.
  const filteredData = useMemo(() => {
    if (!charts) return null
    const from = LEVELS.find(l => l.level === fromLevel)
    const to   = LEVELS.find(l => l.level === toLevel)
    const fromH = from.minHours
    const toH   = to.maxHours

    const inRange = h => h >= fromH && (toH === Infinity || h < toH)

    // Filter timeline entries to this level range
    const filteredTimeline = charts.fullTimeline.filter(e => inRange(e.cumulativeHours))

    // Synthetic watch history: one entry per DS event in range
    const filteredWatch = filteredTimeline
      .filter(e => e.videoId != null)
      .map(e => ({ watched: true, videoId: e.videoId }))

    // External entries that fall in range
    const filteredExt = filteredTimeline
      .filter(e => e._ext != null)
      .map(e => e._ext)

    // Recompute aggregated charts for the filtered range
    const guideData    = buildGuideData(charts.videosById, filteredWatch)
    const { slices: guideSlices, totalHours: guidesTotalHours } = buildGuidesPieData(guideData)
    const tagData      = buildTagData(charts.videosById, filteredWatch, 20)
    const { slices: contentSlices, totalHours: contentTotalHours } =
      buildContentSplit(charts.videosById, filteredWatch, filteredExt)

    // Filter series charts by cumulative hour range
    const difficultyData = charts.difficultyData.filter(d => inRange(d.x))
    const appearances         = charts.appearances.filter(a => inRange(a.cumulativeHours))
    const consumptionPoints   = charts.allConsumptionPoints.filter(p => inRange(p.cumulativeHours))
    const dailyPoints    = charts.dailyPoints.filter(p => inRange(p.cumulativeHours))

    // Recompute info panel from filtered data
    const infoPanel = buildInfoPanel(filteredTimeline, difficultyData, guideData, tagData)

    return {
      ...charts,
      guideData, guideSlices, guidesTotalHours,
      tagData,
      contentSlices, contentTotalHours,
      difficultyData,
      appearances,
      consumptionPoints,
      dailyPoints,
      infoPanel,
      xMin: fromH,
    }
  }, [charts, fromLevel, toLevel]) // eslint-disable-line react-hooks/exhaustive-deps

  async function performResearchUpload(chartsSnapshot, email = null) {
    setUploadStatus('uploading')
    try {
      const hash = await computeResearchHash(chartsSnapshot.dayTimeEntries)
      if (!hash) throw new Error('Could not compute hash')

      const payload = {
        hash,
        watchedVideos:  chartsSnapshot.rawWatchedVideos,
        externalTimes:  chartsSnapshot.rawExternalEntries,
        dayWatchedTime: chartsSnapshot.dayTimeEntries,
      }
      if (email) payload.email = email

      const r = await fetch(RESEARCH_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Api-Key': RESEARCH_API_KEY },
        body: JSON.stringify(payload),
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)

      const updated = { optedIn: true, hash, lastUpload: new Date().toISOString() }
      setResearchState(updated)
      localStorage.setItem(RESEARCH_STORAGE_KEY, JSON.stringify(updated))
      setUploadStatus('done')
    } catch (err) {
      console.error('Research upload failed:', err)
      setUploadStatus('error')
    }
  }

  // Auto-upload for opted-in users whose data is stale by more than 7 days
  useEffect(() => {
    if (!charts || !researchState?.optedIn) return
    if (!charts.dayStats || charts.dayTimeCount < 7) return
    const daysSince = (Date.now() - new Date(researchState.lastUpload).getTime()) / 86400000
    if (daysSince > 7) performResearchUpload(charts)
  }, [charts]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-generate when the extension has populated the fields.
  // A 300ms debounce gives optional fields (externalText, dayTimeText) time to
  // arrive after watchedText, since the extension sets them sequentially.
  useEffect(() => {
    if (autoGenFired.current) return
    if (extInstalled !== 'installed') return
    if (!watchedText.trim()) return

    autoGenFired.current = true
    const t = setTimeout(() => handleGenerateRef.current(), 300)
    return () => clearTimeout(t)
  }, [extInstalled, watchedText]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleLevelClick(level) {
    if (level < fromLevel) {
      setFromLevel(level)
    } else if (level > toLevel) {
      setToLevel(level)
    } else if (level === fromLevel && level === toLevel) {
      // single level — can't deselect
    } else if (level === fromLevel) {
      setFromLevel(level + 1)
    } else if (level === toLevel) {
      setToLevel(level - 1)
    } else {
      setFromLevel(level)
      setToLevel(level)
    }
  }

  if (extInstalled === 'not-installed') {
    return (
      <ExtensionGate
        onManual={() => {
          setExtInstalled('manual')
          setShowInputs(true)
        }}
      />
    )
  }
  if (extInstalled === 'checking') return null

  handleGenerateRef.current = handleGenerate

  const canGenerate = watchedText.trim() && !isProcessing

  function jsonStatus(text, validate) {
    if (!text.trim()) return 'missing'
    try {
      const parsed = JSON.parse(text)
      return validate(parsed) ? 'valid' : 'invalid'
    } catch {
      return 'invalid'
    }
  }

  const statuses = {
    watched:  jsonStatus(watchedText,  d => Array.isArray(d?.watchedVideos)),
    external: jsonStatus(externalText, d => Array.isArray(d?.externalTimes)),
    dayTime:  jsonStatus(dayTimeText,  d => Array.isArray(d) || Array.isArray(d?.dayWatchedTime) || Array.isArray(d?.data)),
  }

  const isResearchEligible = !!(charts?.dayStats && charts?.dayTimeCount >= 7)

  return (
    <>
      <header>
        <div className="header-inner">
          <svg className="header-icon" viewBox="0 0 40 30" fill="none" aria-hidden="true">
            <rect x="0"  y="20" width="8" height="10" rx="2" fill="white" opacity="0.6"/>
            <rect x="11" y="13" width="8" height="17" rx="2" fill="white" opacity="0.75"/>
            <rect x="22" y="6"  width="8" height="24" rx="2" fill="white" opacity="0.9"/>
            <rect x="33" y="0"  width="7" height="30" rx="2" fill="white"/>
            <path d="M4 19 L15 12 L26 5 L36.5 0.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.45"/>
          </svg>
          <div>
            <h1>Dreaming Insights</h1>
            <p>Your immersion journey, visualised</p>
          </div>
        </div>
      </header>

      <main>
        {/* Status bar — always visible */}
        <div className="data-header">
          <div className="status-cards">
            <StatusCard label="Watched videos" status={statuses.watched} />
            <StatusCard label="External time"  status={statuses.external} />
            <StatusCard label="Day watch time" status={statuses.dayTime} />
          </div>
          <button
            className="toggle-inputs-btn"
            onClick={() => setShowInputs(s => !s)}
          >
            {showInputs ? 'Hide inputs' : 'Manual input'}
          </button>
        </div>

        {/* Textareas — hidden by default, always in DOM for extension access */}
        <section className="input-section" style={{ display: showInputs ? 'flex' : 'none' }}>
          <div className="language-selector">
            <span className="language-selector__label">Language:</span>
            {[
              { key: 'es', label: '🇪🇸 Spanish' },
              { key: 'fr', label: '🇫🇷 French'  },
            ].map(({ key, label }) => (
              <button
                key={key}
                className={`lang-btn${language === key ? ' lang-btn--active' : ''}`}
                onClick={() => setLanguage(key)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="input-row">
            <div className="input-group">
              <label htmlFor="watched-input">
                watched-videos.json <span className="label-required">required</span>
              </label>
              <textarea
                id="watched-input"
                rows={12}
                placeholder='Paste your watched-videos.json export here…'
                value={watchedText}
                onChange={e => setWatchedText(e.target.value)}
                spellCheck={false}
              />
              <span className="char-count">{watchedText.length.toLocaleString()} chars</span>
            </div>

            <div className="input-group">
              <label htmlFor="external-input">
                external-time.json <span className="label-optional">optional</span>
              </label>
              <textarea
                id="external-input"
                rows={12}
                placeholder='Optional — paste your external-time.json export here. Leave blank to use DS watch history only.'
                value={externalText}
                onChange={e => setExternalText(e.target.value)}
                spellCheck={false}
              />
              <span className="char-count">{externalText.length.toLocaleString()} chars</span>
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="daytime-input">
              dayWatchedTime <span className="label-optional">optional</span>
            </label>
            <textarea
              id="daytime-input"
              rows={5}
              placeholder='Optional — paste the dayWatchedTime JSON array here for a daily minutes chart with 7-day and 30-day rolling averages.'
              value={dayTimeText}
              onChange={e => setDayTimeText(e.target.value)}
              spellCheck={false}
            />
            <span className="char-count">{dayTimeText.length.toLocaleString()} chars</span>
          </div>
        </section>

        {error && (
          <div className="error" role="alert">{error}</div>
        )}

        {extWarnings.length > 0 && (
          <div className="warning" role="alert">
            <strong>External time data issues:</strong>
            <ul>
              {extWarnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        )}

        {dayWarnings.length > 0 && (
          <div className="warning" role="alert">
            <strong>Day watched time data issues:</strong>
            <ul>
              {dayWarnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        )}

        <div className="generate-row">
          <button
            className="generate-btn"
            onClick={handleGenerate}
            disabled={!canGenerate}
          >
            {isProcessing ? 'Processing…' : 'Generate Charts'}
          </button>
        </div>

        {/* ── Research opt-in ── */}
        {isResearchEligible && (
          <div className="research-cta">
            {researchState?.optedIn ? (
              <p className="research-active">
                ✓ Contributing to Dreaming Insights research
                {uploadStatus === 'uploading'
                  ? ' · Updating…'
                  : ` · Last uploaded ${new Date(researchState.lastUpload).toLocaleDateString()}`
                }
                {uploadStatus === 'error' && ' · Last upload failed'}
              </p>
            ) : (
              <>
                <button
                  className="research-btn"
                  onClick={() => setShowResearchModal(true)}
                  disabled={uploadStatus === 'uploading'}
                >
                  {uploadStatus === 'uploading' ? 'Uploading…' : 'Contribute to Dreaming Insights research'}
                </button>
                <p className="research-desc">
                  Opt in to share your anonymised viewing data to help improve Dreaming
                  Insights recommendations. Your data is stored securely and used for
                  research purposes only.
                  {uploadStatus === 'error' && (
                    <span className="research-error"> Upload failed — please try again.</span>
                  )}
                </p>
              </>
            )}
          </div>
        )}

        {/* ── Level filter — shown as soon as charts are generated ── */}
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
                      selected   ? 'level-btn--selected'   : '',
                      !achieved  ? 'level-btn--unachieved' : '',
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
            <InfoPanel
              info={filteredData.infoPanel}
              dayStats={charts.dayStats}
            />
            <ExportButton exportRows={charts.exportRows} summaryRows={charts.summaryRows} />

            <section className="charts">
              {charts.dayStats && (
                <DayStatsSection stats={charts.dayStats} />
              )}

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
                <ContentSplitChart
                  slices={filteredData.contentSlices}
                  totalHours={filteredData.contentTotalHours}
                />
              </div>

              <div className="chart-card">
                <h2>Viewing by Guide ({Math.round(filteredData.guidesTotalHours)}h)</h2>
                <GuidesPieChart
                  slices={filteredData.guideSlices}
                  totalHours={filteredData.guidesTotalHours}
                />
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

      {showResearchModal && (
        <ResearchConsentModal
          charts={charts}
          onClose={() => setShowResearchModal(false)}
          onConfirm={(email) => {
            setShowResearchModal(false)
            performResearchUpload(charts, email)
          }}
        />
      )}
    </>
  )
}
