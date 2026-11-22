import { useEffect, useState } from 'react'
import { api, type Organization, type Page } from './api'
import { RecruiterApplicationReview } from './RecruiterApplicationReview'
import { RecruiterPagination } from './RecruiterPagination'
import { applicationStatuses, jobStatuses, pageIndex, routeId } from './recruiterSearch'
import { recruiterRoutes } from './workspaceNavigation'

type Summary = { id: string; jobId: string; jobTitle: string; candidateName: string; status: keyof typeof applicationStatuses; submittedAt: string; hiredAt: string | null }
type JobOption = { id: string; title: string; status: keyof typeof jobStatuses }

export function RecruiterApplicationsPage({ organization, accountId, hires = false }: { organization: Organization; accountId: string; hires?: boolean }) {
  const path = recruiterRoutes[hires ? 'hired-candidates' : 'recruiter-applications']
  const params = new URLSearchParams(location.search)
  const application = params.get('application')
  const reviewId = routeId(application)
  const jobId = routeId(params.get('job'))
  const selectedJob = routeId(params.get('reviewJob')) || jobId
  const base = `/organizations/${organization.organizationId}`
  if (application) {
    params.delete('application')
    params.delete('reviewJob')
    const back = `${path}?${params}`
    return <>
      <a className="pv-button" href={back}>{hires ? 'Back to hired candidates' : 'Back to applications'}</a>
      {selectedJob && reviewId ?
        <RecruiterApplicationReview base={`${base}/jobs/${selectedJob}/applications`} applicationId={reviewId} organizationId={organization.organizationId} accountId={accountId} /> :
        <p role="alert">This application link is invalid.</p>}
    </>
  }
  return <ApplicationList base={base} jobId={jobId} path={path} hires={hires} />
}

function ApplicationList({ base, jobId, path, hires }: { base: string; jobId: string; path: string; hires: boolean }) {
  const params = new URLSearchParams(location.search)
  const q = (params.get('q') ?? '').slice(0, 160)
  const status = hires ? 'HIRED' : params.get('status') ?? ''
  const index = pageIndex(params.get('page'))
  const filters = new URLSearchParams({ q, job: jobId, status })
  const query = new URLSearchParams({ q, page: String(index), size: '12' })
  if (status) query.set('status', status)
  if (jobId) query.set('jobId', jobId)
  const request = `${base}/applications?${query}`
  const [result, setResult] = useState<Page<Summary>>()
  const [jobs, setJobs] = useState<JobOption[]>()
  const [error, setError] = useState('')
  const [jobError, setJobError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    void api<Page<Summary>>(request, { signal: controller.signal }).then(setResult)
      .catch((cause: Error) => { if (!controller.signal.aborted) setError(cause.message) })
    return () => controller.abort()
  }, [request])

  useEffect(() => {
    const controller = new AbortController()
    void api<JobOption[]>(`${base}/applications/jobs`, { signal: controller.signal }).then(setJobs)
      .catch((cause: Error) => { if (!controller.signal.aborted) setJobError(cause.message) })
    return () => controller.abort()
  }, [base])

  return <section className="panel" aria-label="Application list">
    <form className="inline-form" action={path}>
      <label>{hires ? 'Search hires' : 'Search applications'}<input type="search" name="q" defaultValue={q} maxLength={160} placeholder="Candidate name, email or job title" /></label>
      <label>Job<select name="job" key={jobs ? 'ready' : 'pending'} defaultValue={jobId}>
        <option value="">All jobs</option>
        {jobId && !jobs?.some(job => job.id === jobId) && <option value={jobId}>Selected job</option>}
        {jobs?.map(job => <option key={job.id} value={job.id}>{job.title} · {jobStatuses[job.status]}</option>)}
      </select></label>
      {!hires && <label>Application status<select name="status" defaultValue={status}><option value="">All statuses</option>
        {Object.entries(applicationStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>}
      <button type="submit">{hires ? 'Filter hires' : 'Filter applications'}</button><a className="pv-button" href={path}>Clear filters</a>
    </form>
    {jobError && <p role="alert">Could not load job options. {jobError}</p>}
    {error && <p className="alert error" role="alert">{error}</p>}
    {!result ? !error && <p role="status">Loading applications…</p> :
      !result.items.length ? <p>{hires ? 'No hired candidates match this view.' : q || jobId || status ? 'No applications match these filters.' : 'No applications on this page.'}</p> :
      <ul className="list recruiter-results">{result.items.map(item => {
        const review = new URLSearchParams(filters)
        review.set('page', String(index))
        review.set('reviewJob', item.jobId)
        review.set('application', item.id)
        return <li key={item.id}>
          <div><strong>{item.candidateName}</strong><br />{item.jobTitle} · {hires ? (item.hiredAt ? `Hired ${new Date(item.hiredAt).toLocaleDateString()}` : 'Hired') :
            `${applicationStatuses[item.status]} · ${new Date(item.submittedAt).toLocaleDateString()}`}</div>
          <a className="pv-button" href={`${path}?${review}`}>{hires ? 'View hire' : 'Review'}</a>
        </li>
      })}</ul>}
    {result && <RecruiterPagination result={result} path={path} filters={filters} noun={hires ? "hires" : "applications"} />}
  </section>
}
