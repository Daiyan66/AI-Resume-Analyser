import { useEffect, useState } from 'react'
import { useSuccessNotice } from './useSuccessNotice'
import { api, type Job, type Member, type Organization, type Page } from './api'
import { RecruiterPagination } from './RecruiterPagination'
import { RecruiterFilter } from './RecruiterFilter'
import { jobStatuses, pageIndex, routeId } from './recruiterSearch'
import { directoryHref, workspaceHref, workTypes } from './workspaceNavigation'

export function PostedJobsPage({ organization, members, directoryRecruiter }: {
  organization: Organization; members?: Member[]; directoryRecruiter?: Member
}) {
  const admin = organization.role === 'ADMIN'
  const path = directoryRecruiter ? directoryHref(organization.organizationId, directoryRecruiter.id) : workspaceHref('posted-jobs', organization.role)
  const [result, setResult] = useState<Page<Job>>()
  const [error, setError] = useState('')
  const [notice, setNotice] = useSuccessNotice()
  const [busy, setBusy] = useState(false)
  const [revision, setRevision] = useState(0)
  const params = new URLSearchParams(location.search)
  const q = (params.get('q') ?? '').slice(0, 160)
  const status = params.get('status') ?? ''
  const workType = params.get('workType') ?? ''
  const recruiterId = directoryRecruiter?.id ?? (admin ? routeId(params.get('recruiter')) : '')
  const filters = new URLSearchParams({ q, status, workType })
  const query = new URLSearchParams(filters)
  if (directoryRecruiter) query.set('excludeDrafts', 'true')
  if (recruiterId) {
    query.set('recruiterId', recruiterId)
    if (!directoryRecruiter) filters.set('recruiter', recruiterId)
  }
  const page = pageIndex(params.get('page'))
  const apiPath = `/organizations/${organization.organizationId}/jobs`
  const request = `${apiPath}?${query}&page=${page}&size=12`

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
    <div className="section-heading"><h2>{directoryRecruiter?.displayName ?? organization.name}</h2>
      {!directoryRecruiter && <a href={workspaceHref('post-job', organization.role)} className="pv-button primary">Post a job</a>}
    </div>
    <form className="inline-form" action={path}>
      <label>Search jobs<input name="q" type="search" maxLength={160} defaultValue={q} placeholder="Title, location or keyword" /></label>
      <label>Job status<select name="status" defaultValue={status}><option value="">All statuses</option>
        {Object.entries(jobStatuses).filter(([value]) => !directoryRecruiter || value !== 'DRAFT').map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      <label>Work arrangement<select name="workType" defaultValue={workType}><option value="">All arrangements</option>
        {Object.entries(workTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      {admin && !directoryRecruiter && <RecruiterFilter members={members} value={recruiterId} />}
      <button type="submit">Filter jobs</button><a className="pv-button" href={path}>Clear filters</a>
    </form>
    {error && <p className="alert error" role="alert">{error}</p>}
    {notice && <p className="alert success" role="status">{notice}</p>}
    {!result ? !error && <p role="status">Loading jobs…</p> :
      !result.items.length ? <p>{q || status || workType || recruiterId ? 'No jobs match these filters.' : 'No jobs on this page.'}</p> :
      <ul className="list recruiter-results">{result.items.map(job => <li key={job.id}>
        <div><strong>{job.title}</strong><br />{job.location} · {workTypes[job.workType]} · {jobStatuses[job.status as keyof typeof jobStatuses]}
          {admin && job.postedByName && <><br />{job.status === 'DRAFT' ? 'Draft by' : 'Posted by'} {job.postedByName}</>}
        </div>
        <div className="action-row">
          {!directoryRecruiter && <a className="pv-button" href={`${workspaceHref('staff-assessment-interview', organization.role)}?tab=assessments&templateJob=${job.id}`}>Assessment templates</a>}
          {directoryRecruiter ? <a className="pv-button" href={directoryHref(organization.organizationId, directoryRecruiter.id, job.id)}
            aria-label={`View hires for ${job.title}`}>View hires</a> : job.status === 'DRAFT' ? <>
            <a className="pv-button" href={`${workspaceHref('post-job', organization.role)}?draft=${job.id}`}>Edit draft</a>
            <button disabled={busy} onClick={() => void change(job, 'PUBLISHED')}>Publish</button>
          </> : <>
            <a className="pv-button" href={`${workspaceHref('recruiter-applications', organization.role)}?job=${job.id}`}>Applicants</a>
            {job.status === 'PUBLISHED' && <button className="quiet" disabled={busy} onClick={() => void change(job, 'PAUSED')}>Pause</button>}
            {job.status === 'PAUSED' && <button className="quiet" disabled={busy} onClick={() => void change(job, 'PUBLISHED')}>Resume</button>}
            {job.status !== 'CLOSED' && <button className="quiet" disabled={busy} onClick={() => void change(job, 'CLOSED')}>Close</button>}
          </>}
        </div>
      </li>)}</ul>}
    {result && <RecruiterPagination result={result} path={path} filters={filters} noun="jobs" />}
  </section>
}
