import * as XLSX from 'xlsx'

function autoFit(ws, rows) {
  const keys = Object.keys(rows[0] || {})
  ws['!cols'] = keys.map(key => {
    const maxLen = Math.max(
      key.length,
      ...rows.map(r => String(r[key] ?? '').length)
    )
    return { wch: Math.min(maxLen + 2, 70) }
  })
}

export default function ExportButton({ exportRows, summaryRows }) {
  function handleExport() {
    const wb = XLSX.utils.book_new()

    const wsHistory = XLSX.utils.json_to_sheet(exportRows)
    autoFit(wsHistory, exportRows)
    XLSX.utils.book_append_sheet(wb, wsHistory, 'History')

    const wsSummary = XLSX.utils.json_to_sheet(summaryRows)
    autoFit(wsSummary, summaryRows)
    XLSX.utils.book_append_sheet(wb, wsSummary, 'By Source')

    XLSX.writeFile(wb, 'ds-viewing-history.xlsx')
  }

  return (
    <div className="export-row">
      <button className="export-btn" onClick={handleExport}>
        Export Viewing History (.xlsx)
      </button>
      <span className="export-hint">
        {exportRows.length.toLocaleString()} rows · History + By Source sheets
      </span>
    </div>
  )
}
