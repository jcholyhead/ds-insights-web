import { useState } from 'react'

export default function ResearchConsentModal({ charts, onConfirm, onClose }) {
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')

  function handleConfirm() {
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Please enter a valid email address, or leave blank.')
      return
    }
    onConfirm(email.trim() || null)
  }

  const watchedCount  = charts?.rawWatchedVideos?.filter(v => v.watched).length ?? 0
  const externalCount = charts?.rawExternalEntries?.length ?? 0
  const dayCount      = charts?.dayTimeCount ?? 0

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Research consent">
        <div className="modal__header">
          <h2>Contribute to Dreaming Insights Research</h2>
          <button className="modal__close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal__body">

          <h3>What will be uploaded</h3>
          <p>The following data from your current session will be sent to our secure research database:</p>
          <ul>
            <li><strong>Watched videos history</strong> — {watchedCount.toLocaleString()} video records (video IDs and timestamps)</li>
            <li><strong>Daily watch time</strong> — {dayCount.toLocaleString()} days of viewing data</li>
            {externalCount > 0 && (
              <li><strong>External content</strong> — {externalCount.toLocaleString()} external viewing records</li>
            )}
          </ul>

          <h3>How your data will be used</h3>
          <p>
            Contributed data is used exclusively for research into language acquisition patterns.
            This includes building recommendation engines, identifying effective content pathways,
            and creating tools that help learners progress more effectively on Dreaming Spanish
            and Dreaming French.
          </p>

          <h3>Your privacy</h3>
          <ul>
            <li>Your data is stored under an <strong>anonymised identifier</strong> — a one-way hash derived from your earliest viewing records. It cannot be traced back to your Dreaming Spanish account.</li>
            <li>No name, account details, or personal information are collected unless you choose to provide your email below.</li>
            <li>Your data is <strong>never sold</strong> or shared with third parties outside the Dreaming Insights research programme.</li>
            <li>Once opted in, your data refreshes automatically every 7 days when you use this tool. You can opt out at any time by clearing this site's local storage.</li>
          </ul>

          <h3>Optional: stay in the loop</h3>
          <p>
            If you'd like to be notified about research projects or findings that used your data,
            you can leave your email address below. This is entirely optional and stored separately
            from your viewing data.
          </p>
          <div className="research-email-field">
            <label htmlFor="research-email">Email address (optional)</label>
            <input
              id="research-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setEmailError('') }}
              autoComplete="email"
            />
            {emailError && <span className="research-email-error">{emailError}</span>}
          </div>

        </div>
        <div className="modal__footer">
          <button className="modal__cancel-btn" onClick={onClose}>Cancel</button>
          <button className="modal__confirm-btn" onClick={handleConfirm}>
            Confirm &amp; Submit
          </button>
        </div>
      </div>
    </div>
  )
}
