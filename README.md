# Dreaming Insights — Frontend

A client-side analytics dashboard for [Dreaming Spanish](https://www.dreamingspanish.com) and [Dreaming French](https://www.dreamingfrench.com) learners. Paste or auto-import your watch history and get a detailed picture of your immersion journey.

Live at **[dreaminginsights.com](https://dreaminginsights.com)**

---

## Features

### Data import

**Chrome extension (recommended)**
The Dreaming Insights Chrome extension intercepts API responses as you browse your Dreaming Spanish or Dreaming French progress page and auto-fills all three data sources into the app. No manual steps required.

**Manual import**
Paste JSON directly from the Dreaming Spanish/French API via browser DevTools. Three data sources are supported:

| Source | Required | Unlocks |
|---|---|---|
| `watchedVideos` | Yes | All charts |
| `externalTimes` | No | External content on difficulty chart, content split |
| `dayWatchedTime` | No | Daily time chart, streak stats |

---

### Language support

Supports both Spanish (`es`) and French (`fr`) video catalogues. The extension injects a `language` field automatically; manual users select via a toggle in the input panel. Each language maps against its own video catalogue (`videos-es.json` / `videos-fr.json`), refreshed daily from the Dreaming Spanish API.

---

### Charts and analytics

#### Video Difficulty Over Time
The centrepiece chart. Plots every watched video's difficulty rating (derived from its ELO score, mapped to a 0–100 scale) against cumulative watch hours.

- **Individual video dots** — each watched DS video as a scatter point
- **20-video rolling average** — smoothed difficulty trend
- **P90 (rolling 20)** — the 90th percentile ceiling over a rolling window of 20 videos; useful for tracking your increasing comprehension ceiling
- **External content markers** — vertical reference lines showing the first time each external content source appeared in your timeline
- **Consumption dots** — optional per-source scatter showing every logged session for selected external sources, staggered on the Y-axis and colour-coded by source

**Level filter** — filter all charts to a specific DS level range (Levels 1–7, corresponding to 0–50h, 50–150h, 150–300h, 300–600h, 600–1000h, 1000–1500h, 1500h+).

#### Daily Watch Time
Bar chart of raw minutes watched per day with overlaid 7-day and 30-day rolling average lines. Requires `dayWatchedTime` data.

#### Streak & day stats
Summary cards showing:
- Current streak and longest streak
- Best single day
- 7-day and 30-day rolling averages
- Total days logged

#### Content Split
Pie/donut chart breaking down total watch time between Dreaming Spanish content and each external source. Sources below 1% of total time are grouped as "Other".

#### Viewing by Guide
Pie chart showing time distribution across DS guides (e.g. Beginner, Intermediate, Advanced, Super Challenge).

#### Hours per Guide
Bar chart of absolute hours watched per guide.

#### Top 20 Tags
Horizontal bar chart of the 20 most-watched content tags by hours, giving a picture of topic coverage.

#### Info Panel
Summary statistics including total hours, number of videos watched, date range, most-watched guide, and top tags.

---

### Data export

CSV export of the full watch history with computed fields (difficulty rating, guide, tags, cumulative hours). A separate summary CSV is also available.

---

### Research programme (opt-in)

Users with at least 7 days of `dayWatchedTime` data can opt in to share anonymised watch history for research purposes. Data is uploaded to secure cloud storage (AWS S3) under a one-way SHA-256 hash identifier derived from the user's earliest watch records — no name or account information is collected.

- Users may optionally provide an email address to be contacted about research findings; this is stored separately from watch data
- Once opted in, data is automatically refreshed if more than 7 days have passed since the last upload
- Opt-out by clearing the site's local storage

---

### Privacy

All processing is client-side. No data leaves the browser unless the user explicitly opts in to the research programme. A small amount of preference data (visible sources, research opt-in state) is stored in `localStorage`. The Chrome extension stores data in `chrome.storage.local` only — it never transmits to any server.

Full privacy policy: [dreaminginsights.com/privacy.html](https://dreaminginsights.com/privacy.html)

---

## Development

### Prerequisites
- Node.js 18+
- The video catalogues (`videos-es.json`, `videos-fr.json`) in `public/` — these are large files served from S3/CloudFront in production

### Setup

```bash
cd frontend
npm install
```

Create a `.env.local` file:
```
VITE_RESEARCH_API_URL=https://your-lambda-url.on.aws/
VITE_RESEARCH_API_KEY=your-api-key
```

### Run

```bash
npm run dev
```

### Build

```bash
npm run build
```

Output goes to `dist/`. The `public/` directory is copied verbatim, including `privacy.html` and the video catalogue JSON files.

---

## Architecture

| Concern | Implementation |
|---|---|
| Framework | React 18 + Vite |
| Charts | Recharts (ComposedChart, Line, Scatter, ReferenceLine) |
| Data processing | Pure JS in `src/utils/compute.js` — no server round-trips |
| Video catalogue | Lazy-loaded per language on first generate, cached in a `useRef` for the session |
| State | React `useState` / `useMemo` — no external state library |
| Persistence | `localStorage` for preferences and research opt-in state |
| Styling | Plain CSS (`App.css`) |
| Analytics | Umami (privacy-friendly, no cookies) |
