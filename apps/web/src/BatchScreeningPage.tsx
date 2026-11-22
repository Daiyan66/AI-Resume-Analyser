import { useEffect, useState, type FormEvent } from 'react'
import { api, type Job, type Organization } from './api'
import { jobStatuses, routeId } from './recruiterSearch'
import { recruiterRoutes } from './workspaceNavigation'

type JobOption = { id: string; title: string; status: keyof typeof jobStatuses }
type BatchSummary = { id: string; createdAt: string; itemCount: number }
type Finding = { criterion: string; excerpt: string | null; extractedLine: number | null }
type Batch = { id: string; items: { id: string; filename: string; state: string; evidence: Finding[] }[] }

export function BatchScreeningPage({ organization }: { organization: Organization }) {
  const base = `/organizations/${organization.organizationId}`
  const initialJob = routeId(new URLSearchParams(location.search).get('job'))
  const [jobId, setJobId] = useState(initialJob)
  const [options, setOptions] = useState<JobOption[]>()
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    void api<JobOption[]>(`${base}/applications/jobs`, { signal: controller.signal }).then(setOptions)
      .catch((cause: Error) => { if (!controller.signal.aborted) setError(cause.message) })
    return () => controller.abort()
  }, [base])

  const selected = options?.find(job => job.id === jobId)
  return <>
    <section className="panel" aria-label="Choose the job to screen against">
      <label className="candidate-status-filter">Job<select value={jobId} aria-label="Job" onChange={event => {
        const next = event.target.value
        setJobId(next)
        const path = recruiterRoutes['batch-screening']
        history.replaceState(null, '', next ? `${path}?job=${next}` : path)
      }}>
        <option value="">Choose a job</option>
        {jobId && !selected && <option value={jobId} disabled>{options ? 'Job unavailable' : 'Loading job…'}</option>}
        {options?.map(item => <option value={item.id} key={item.id}>{item.title} · {jobStatuses[item.status]}</option>)}
      </select></label>
      {error && <p role="alert" className="alert error">{error}</p>}
      {!options && !error && <p role="status">Loading jobs…</p>}
      {options?.length === 0 && <p>Publish a job to start screening. <a href={recruiterRoutes['posted-jobs']}>Go to posted jobs</a></p>}
    </section>
    {selected && <ScreeningJob key={jobId} path={`${base}/jobs/${jobId}`} />}
  </>
}

function ScreeningJob({ path }: { path: string }) {
  const base = `${path}/screening-batches`
  const [job, setJob] = useState<Job>()
  const [history, setHistory] = useState<BatchSummary[]>()
  const [batch, setBatch] = useState<Batch>()
  const [page, setPage] = useState(0)
  const [revision, setRevision] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const size = 10

  useEffect(() => {
    const controller = new AbortController()
    void api<Job>(path, { signal: controller.signal }).then(setJob)
      .catch((cause: Error) => { if (!controller.signal.aborted) setError(cause.message) })
    return () => controller.abort()
  }, [path])

  useEffect(() => {
    const controller = new AbortController()
    void api<BatchSummary[]>(`${base}?page=${page}&size=${size}`, { signal: controller.signal }).then(setHistory)
      .catch((cause: Error) => { if (!controller.signal.aborted) setError(cause.message) })
    return () => controller.abort()
  }, [base, page, revision])

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError('')
    setNotice('')
    try { await action() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'The screening request failed.') }
    finally { setBusy(false) }
  }

  function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const files = data.getAll('files')
    if (!files.length || files.length > 5 || files.some(file =>
      !(file instanceof File) || file.size === 0 || file.size > 2_000_000 || !/\.(txt|pdf|docx)$/i.test(file.name))) {
      setError('Choose 1–5 nonempty PDF, DOCX, or TXT files up to 2 MB each.')
      return
    }
    void run(async () => {
      setBatch(await api<Batch>(base, { method: 'POST', body: data }))
      setPage(0)
      setRevision(value => value + 1)
      form.reset()
      setNotice('Batch complete. Review the excerpts below.')
    })
  }

  function remove(id: string) {
    if (!confirm('Delete the saved results for this batch?')) return
    void run(async () => {
      await api(`${base}/${id}`, { method: 'DELETE' })
      if (batch?.id === id) setBatch(undefined)
      if (history?.length === 1) setPage(value => Math.max(0, value - 1))
      setRevision(value => value + 1)
      setNotice('Screening batch deleted.')
    })
  }

  return <section className="panel" aria-label="Screen résumés">
    {error && <p className="alert error" role="alert">{error}</p>}
    {notice && <p className="alert success" role="status">{notice}</p>}
    {!job ? !error && <p role="status">Loading job requirements…</p> : <>
      <h2>{job.title}</h2>
      <details><summary>View job description and requirements</summary>
        <p className="preserve-lines">{job.description}</p>
        <h3>Requirements</h3><p className="preserve-lines">{job.requirements}</p>
        {job.criteria.length > 0 && <><h3>Review criteria</h3>
          <ul>{job.criteria.map(criterion => <li key={criterion.id}>{criterion.description}</li>)}</ul></>}
      </details>
      <p>Upload 1–5 text-based PDF, DOCX, or TXT files up to 2 MB each. Screening finds literal matches to the job’s requirements and review criteria. Check the excerpts before making a decision.</p>
      <form className="inline-form" onSubmit={upload}>
        <label>Résumé files<input type="file" name="files" multiple required accept=".pdf,.docx,.txt" disabled={busy} /></label>
        <button type="submit" disabled={busy}>{busy ? 'Working…' : 'Screen résumés'}</button>
      </form>
    </>}
    <h3>Previous batches</h3>
    {history?.length === 0 ? <p>No batches on this page.</p> : <ul className="list">
      {history?.map(item => <li key={item.id}>
        <span>{new Date(item.createdAt).toLocaleString()} · {item.itemCount} {item.itemCount === 1 ? 'file' : 'files'}</span>
        <span className="action-row">
          <button className="quiet" disabled={busy} onClick={() => void run(async () => setBatch(await api<Batch>(`${base}/${item.id}`)))}>View results</button>
          <button className="quiet" disabled={busy} onClick={() => remove(item.id)}>Delete batch</button>
        </span>
      </li>)}
    </ul>}
    {(page > 0 || history?.length === size) && <div className="pagination">
      <button className="quiet" disabled={!page || busy} onClick={() => setPage(page - 1)}>Previous</button>
      <span>Page {page + 1}</span>
      <button className="quiet" disabled={history?.length !== size || busy} onClick={() => setPage(page + 1)}>Next</button>
    </div>}
    {batch && <section className="job-detail" aria-label="Batch results">
      <h3>Batch results</h3>
      {batch.items.map(item => <details className="criterion" open key={item.id}>
        <summary><strong>{item.filename}</strong> · {item.state === 'READY' ?
          `${item.evidence.filter(finding => finding.excerpt).length} of ${item.evidence.length} checks matched` : 'Could not read text'}</summary>
        {item.state !== 'READY' ? <p>Try a text-based PDF, DOCX, or UTF-8 TXT version.</p> :
          <ul className="list">{item.evidence.map((finding, index) => <li key={index}>
            <div><strong>{finding.criterion}</strong>
              {finding.excerpt ? <blockquote className="preserve-lines">{finding.excerpt}
                {finding.extractedLine != null && <> (extracted line {finding.extractedLine})</>}</blockquote> :
                <p>No literal match found. Check the source résumé for equivalent experience.</p>}
            </div>
          </li>)}</ul>}
      </details>)}
    </section>}
  </section>
}
