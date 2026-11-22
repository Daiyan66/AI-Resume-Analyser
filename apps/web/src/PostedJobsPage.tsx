import { useEffect, useState } from 'react'
import { api, type Job, type Organization, type Page } from './api'
import { RecruiterPagination } from './RecruiterPagination'
import { jobStatuses, pageIndex } from './recruiterSearch'
import { recruiterRoutes, workTypes } from './workspaceNavigation'

const path = recruiterRoutes['posted-jobs']

export function PostedJobsPage({ organization }: { organization: Organization }) {
  const [result, setResult] = useState<Page<Job>>()
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [revision, setRevision] = useState(0)
  const params = new URLSearchParams(location.search)
  const q = (params.get('q') ?? '').slice(0, 160)
  const status = params.get('status') ?? ''
  const workType = params.get('workType') ?? ''
  const filters = new URLSearchParams({ q, status, workType })
  const page = pageIndex(params.get('page'))
  const apiPath = `/organizations/${organization.organizationId}/jobs`
  const request = `${apiPath}?${filters}&page=${page}&size=12`

  useEffect(() => {
    const controller = new AbortController()
    void api<Page<Job>>(request, { signal: controller.signal }).then(setResult)
      .catch((cause: Error) => { if (!controller.signal.aborted) setError(cause.message) })
    return () => controller.abort()
  }, [request, revision])

  async function change(job: Job, next: 'PUBLISHED' | 'PAUSED' | 'CLOSED') {
    const publishing = job.status === 'DRAFT'
    if (publishing && !confirm(`Publish ${job.title} to the public job board?`)) return
    if (next === 'CLOSED' && !confirm(`Close ${job.title}? It will stop accepting applications.`)) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const updated = await api<Job>(`${apiPath}/${job.id}/${publishing ? 'publish' : 'status'}`, {
        method: 'POST', body: publishing ? undefined : JSON.stringify({ status: next }),
      })
      setResult(current => current && {
        ...current, items: current.items.flatMap(item => item.id !== updated.id ? [item] :
          !status || status === updated.status ? [updated] : []),
      })
      setRevision(current => current + 1)
      setNotice(`${job.title} is now ${updated.status.toLowerCase()}.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update this job.')
    } finally { setBusy(false) }
  }

  return <section className="panel" aria-label="Organization jobs">
    <div className="section-heading"><h2>{organization.name}</h2>
      <a href={recruiterRoutes['post-job']} className="pv-button primary">Post a job</a>
    </div>
    <form className="inline-form" action={path}>
      <label>Search jobs<input name="q" type="search" maxLength={160} defaultValue={q} placeholder="Title, location or keyword" /></label>
      <label>Job status<select name="status" defaultValue={status}><option value="">All statuses</option>
        {Object.entries(jobStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      <label>Work arrangement<select name="workType" defaultValue={workType}><option value="">All arrangements</option>
        {Object.entries(workTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      <button type="submit">Filter jobs</button><a className="pv-button" href={path}>Clear filters</a>
    </form>
    {error && <p className="alert error" role="alert">{error}</p>}
    {notice && <p className="alert success" role="status">{notice}</p>}
    {!result ? !error && <p role="status">Loading jobs…</p> :
      !result.items.length ? <p>{q || status || workType ? 'No jobs match these filters.' : 'No jobs on this page.'}</p> :
      <ul className="list recruiter-results">{result.items.map(job => <li key={job.id}>
        <div><strong>{job.title}</strong><br />{job.location} · {workTypes[job.workType]} · {jobStatuses[job.status as keyof typeof jobStatuses]}</div>
        <div className="action-row">
          {job.status === 'DRAFT' ? <>
            <a className="pv-button" href={`${recruiterRoutes['post-job']}?draft=${job.id}`}>Edit draft</a>
            <button disabled={busy} onClick={() => void change(job, 'PUBLISHED')}>Publish</button>
          </> : <>
            <a className="pv-button" href={`${recruiterRoutes['recruiter-applications']}?job=${job.id}`}>Applicants</a>
            {job.status === 'PUBLISHED' && <button className="quiet" disabled={busy} onClick={() => void change(job, 'PAUSED')}>Pause</button>}
            {job.status === 'PAUSED' && <button className="quiet" disabled={busy} onClick={() => void change(job, 'PUBLISHED')}>Resume</button>}
            {job.status !== 'CLOSED' && <button className="quiet" disabled={busy} onClick={() => void change(job, 'CLOSED')}>Close</button>}
          </>}
        </div>
      </li>)}</ul>}
    {result && <RecruiterPagination result={result} path={path} filters={filters} noun="jobs" />}
  </section>
}
