import { useEffect, useState } from 'react'
import './App.css'

type ApiStatus = 'checking' | 'ready' | 'unavailable'

async function getApiStatus(signal?: AbortSignal): Promise<ApiStatus> {
  try {
    const response = await fetch('/api/v1/system/status', { signal })
    if (!response.ok) throw new Error('API status request failed')
    const data: unknown = await response.json()
    if (typeof data !== 'object' || data === null || !('status' in data) || data.status !== 'ready') {
      throw new Error('API status was not ready')
    }
    return 'ready'
  } catch {
    return 'unavailable'
  }
}

function App() {
  const [status, setStatus] = useState<ApiStatus>('checking')

  useEffect(() => {
    const controller = new AbortController()
    void getApiStatus(controller.signal)
      .then((nextStatus) => {
        if (!controller.signal.aborted) setStatus(nextStatus)
      })
    return () => controller.abort()
  }, [])

  return (
    <main className="page">
      <div className="shell">
        <p className="eyebrow">AI Resume Analyser · rebuild</p>
        <h1>A clearer hiring experience starts here.</h1>
        <p className="intro">
          This is the foundation for the new candidate, recruiter, and admin workspaces.
          Hiring features will arrive in the next phases.
        </p>
        <section className="status-card" aria-labelledby="status-heading">
          <div>
            <h2 id="status-heading">System connection</h2>
            <p aria-live="polite" className={`status status-${status}`}>
              {status === 'checking' && 'Checking the new API and database…'}
              {status === 'ready' && 'Ready · API and database are connected'}
              {status === 'unavailable' && 'Unavailable · Start the API and database, then try again'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setStatus('checking')
              void getApiStatus().then(setStatus)
            }}
            disabled={status === 'checking'}
          >
            Check again
          </button>
        </section>
        <p className="note">The existing application remains in the legacy folders during the rebuild.</p>
      </div>
    </main>
  )
}

export default App
