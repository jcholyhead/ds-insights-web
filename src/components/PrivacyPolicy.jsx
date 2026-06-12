export default function PrivacyPolicy({ onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Privacy Policy">
        <div className="modal__header">
          <h2>Privacy Policy</h2>
          <button className="modal__close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal__body">

          <h3>Overview</h3>
          <p>
            This tool runs entirely in your browser. By default, no data you paste here is
            sent anywhere — all processing happens locally on your device and nothing leaves it.
          </p>

          <h3>Data you paste in</h3>
          <p>
            The watched-videos, external time, and day watched time JSON you provide are parsed
            and used only to generate your charts. This data is never transmitted to any server
            unless you explicitly opt in to the research programme (see below).
          </p>

          <h3>Local storage</h3>
          <p>
            A small amount of preference data is saved in your browser's local storage so your
            settings persist between visits:
          </p>
          <ul>
            <li>Which external content sources are visible on the difficulty chart</li>
            <li>Whether you have opted in to the research programme, and when data was last uploaded</li>
          </ul>
          <p>
            This data never leaves your device. You can clear it at any time by clearing your
            browser's local storage for this site.
          </p>

          <h3>Chrome extension</h3>
          <p>
            The <strong>Dreaming Insights Chrome extension</strong> intercepts API responses
            from <strong>app.dreaming.com</strong> while you browse your progress page and
            makes that data available to this website. The extension:
          </p>
          <ul>
            <li>Reads three API responses your browser already receives: watched videos, external time, and daily watch time</li>
            <li>Stores them locally using <strong>chrome.storage.local</strong> — Chrome's built-in local storage for extensions</li>
            <li>Never transmits any data to any external server or third party</li>
            <li>Does not run on any website other than <strong>app.dreaming.com</strong> and <strong>dreaminginsights.com</strong></li>
          </ul>
          <p>
            Data captured by the extension is retained in local storage until you clear it via the
            extension popup, uninstall the extension, or clear your browser's extension storage. It
            is never synced to the cloud and is accessible only by the extension itself.
          </p>
          <p>
            The extension requires two host permissions: one to intercept API responses on
            app.dreaming.com, and one to detect the extension is installed and auto-fill data
            fields on dreaminginsights.com.
          </p>

          <h3>Research programme (optional opt-in)</h3>
          <p>
            If you choose to contribute to the research programme, the following data is uploaded
            to secure cloud storage (AWS S3) operated by the Dreaming Insights team:
          </p>
          <ul>
            <li>Your watched-videos history</li>
            <li>Your external time entries (if provided)</li>
            <li>Your daily watch time history</li>
          </ul>
          <p>
            Your data is stored under an anonymised identifier — a one-way hash derived from the
            dates and durations of your earliest watch records. This hash cannot be reversed to
            identify you. No name or account information is collected. If you choose to provide
            an email address during opt-in, it is stored separately from your viewing data and
            used only to notify you about research projects you contributed to.
          </p>
          <p>
            Contributed data is used solely for research purposes such as building recommendation
            models and understanding viewing patterns across the Dreaming Insights community.
          </p>
          <p>
            Once opted in, your data is automatically refreshed on each visit if more than 7 days
            have passed since the last upload. To opt out, clear this site's local storage in your
            browser settings — no further uploads will occur.
          </p>

          <h3>No tracking or analytics</h3>
          <p>
            This site does not use cookies, advertising trackers, or any third-party analytics.
          </p>

          <h3>Contact</h3>
          <p>
            If you have questions about how your data is used, please{' '}
            <a href="https://forms.gle/F7FzqFdQ9yA5XgtJA" target="_blank" rel="noreferrer">
              get in touch
            </a>.
          </p>

        </div>
      </div>
    </div>
  )
}
