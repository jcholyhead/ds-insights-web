export default function YouTubeLabelModal({ urls, onConfirm, onClose, status }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Submit YouTube URLs">
        <div className="modal__header">
          <h2>Submit YouTube URLs for labelling</h2>
          <button className="modal__close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="modal__body">
          <h3>What will be sent</h3>
          <p>
            The following <strong>{urls.length} YouTube URL{urls.length !== 1 ? 's' : ''}</strong> will
            be sent to the Dreaming Insights labelling service to identify the channel name for each video.
          </p>
          <ul>
            {urls.map(url => (
              <li key={url} style={{ fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all' }}>
                {url}
              </li>
            ))}
          </ul>

          <h3>Privacy notice</h3>
          <p style={{ background: '#fff8e1', border: '1px solid #ffcc80', borderRadius: 6, padding: '0.75rem 1rem', fontSize: '0.875rem' }}>
            ⚠️ This is an exception to our usual on-device privacy policy. These YouTube URLs will be
            transmitted outside your browser to our labelling API. <strong>No other information about
            you is included</strong> — only the video URLs listed above.
          </p>
          <p>
            Once processed, channel names will be stored in our lookup table so future users with the
            same videos benefit automatically.
          </p>

          {status === 'success' && (
            <p style={{ color: '#2e7d32', fontWeight: 600 }}>
              ✅ URLs submitted. Reloading your data…
            </p>
          )}
          {status === 'error' && (
            <p style={{ color: '#c62828' }}>
              Something went wrong submitting the URLs. Please try again.
            </p>
          )}
        </div>

        <div className="modal__footer">
          <button className="modal__cancel-btn" onClick={onClose}>Cancel</button>
          <button
            className="modal__confirm-btn"
            onClick={onConfirm}
            disabled={status === 'submitting' || status === 'success'}
          >
            {status === 'submitting' ? 'Submitting…' : 'Submit URLs'}
          </button>
        </div>
      </div>
    </div>
  )
}
