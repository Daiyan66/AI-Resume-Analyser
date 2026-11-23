import { useEffect, useState } from 'react'
import { api, type Member, type Organization, type Page } from './api'
import { RecruiterApplicationReview } from './RecruiterApplicationReview'
import { RecruiterPagination } from './RecruiterPagination'
import { applicationStatuses, jobStatuses, pageIndex, routeId } from './recruiterSearch'
import { RecruiterFilter } from './RecruiterFilter'
import { directoryHref, workspaceHref } from './workspaceNavigation'

type Summary = { id: string; jobId: string; jobTitle: string; candidateName: string; status: keyof typeof applicationStatuses; submittedAt: string; hiredAt: string | null; postedByName: string; hiredByName: string | null }
type JobOption = { id: string; title: string; status: keyof typeof jobStatuses }

type Directory = { recruiter: Member; jobId: string }

export function RecruiterApplicationsPage({ organization, accountId, hires = false, members, directory }: {
  organization: Organization; accountId: string; hires?: boolean; members?: Member[]; directory?: Directory
}) {
  const path = directory ? directoryHref(organization.organizationId, directory.recruiter.id, directory.jobId)
    : workspaceHref(hires ? 'hired-candidates' : 'recruiter-applications', organization.role)
  const admin = organization.role === 'ADMIN'
  const params = new URLSearchParams(location.search)
  const application = params.get('application')
  const reviewId = routeId(application)
  const jobId = directory?.jobId ?? routeId(params.get('job'))
  const selectedJob = directory ? jobId : routeId(params.get('reviewJob')) || jobId
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
  return <ApplicationList base={base} jobId={jobId} path={path} hires={hires} admin={admin} members={members} directory={directory} />
}

function ApplicationList({ base, jobId, path, hires, admin, members, directory }: {
  base: string; jobId: string; path: string; hires: boolean; admin: boolean; members?: Member[]; directory?: Directory
}) {
  const params = new URLSearchParams(location.search)
  const q = (params.get('q') ?? '').slice(0, 160)
  const status = hires ? 'HIRED' : params.get('status') ?? ''
  const index = pageIndex(params.get('page'))
  const recruiterId = directory?.recruiter.id ?? (admin ? routeId(params.get('recruiter')) : '')
  const filters = new URLSearchParams({ q, job: jobId, status })
  const query = new URLSearchParams({ q, page: String(index), size: '12' })
  if (status) query.set('status', status)
  if (jobId) query.set('jobId', jobId)
  if (recruiterId) {
    query.set('recruiterId', recruiterId)
    if (!directory) filters.set('recruiter', recruiterId)
  }
  if (directory) query.set('hiredBy', directory.recruiter.id)
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
    {directory && <><h2>{jobs?.find(job => job.id === jobId)?.title ?? 'Selected job'}</h2>
      <p>Hires recorded by {directory.recruiter.displayName} for this job.</p></>}
    <form className="inline-form" action={path}>
      <label>{hires ? 'Search hires' : 'Search applications'}<input type="search" name="q" defaultValue={q} maxLength={160} placeholder="Candidate name, email or job title" /></label>
      {!directory && <label>Job<select name="job" key={jobs ? 'ready' : 'pending'} defaultValue={jobId}>
        <option value="">All jobs</option>
        {jobId && !jobs?.some(job => job.id === jobId) && <option value={jobId}>Selected job</option>}
        {jobs?.map(job => <option key={job.id} value={job.id}>{job.title} · {jobStatuses[job.status]}</option>)}
      </select></label>}
      {admin && !directory && <RecruiterFilter members={members} value={recruiterId} />}
      {!hires && <label>Application status<select name="status" defaultValue={status}><option value="">All statuses</option>
        {Object.entries(applicationStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>}
      <button type="submit">{hires ? 'Filter hires' : 'Filter applications'}</button><a className="pv-button" href={path}>Clear filters</a>
    </form>
    {jobError && <p role="alert">Could not load job options. {jobError}</p>}
    {error && <p className="alert error" role="alert">{error}</p>}
    {!result ? !error && <p role="status">Loading applications…</p> :
      !result.items.length ? <p>{hires ? 'No hired candidates match this view.' : q || jobId || status || recruiterId ? 'No applications match these filters.' : 'No applications on this page.'}</p> :
      <ul className="list recruiter-results">{result.items.map(item => {
        const review = new URLSearchParams(filters)
        review.set('page', String(index))
        review.set('reviewJob', item.jobId)
        review.set('application', item.id)
        return <li key={item.id}>
          <div><strong>{item.candidateName}</strong><br />{item.jobTitle} · {hires ? (item.hiredAt ? `Hired ${new Date(item.hiredAt).toLocaleDateString()}` : 'Hired') :
            `${applicationStatuses[item.status]} · ${new Date(item.submittedAt).toLocaleDateString()}`}
            {admin && <><br />Posted by {item.postedByName}{hires && item.hiredByName && ` · Hire recorded by ${item.hiredByName}`}</>}
          </div>
          <a className="pv-button" href={`${path}?${review}`}>{hires ? 'View hire' : 'Review'}</a>
        </li>
      })}</ul>}
    {result && <RecruiterPagination result={result} path={path} filters={filters} noun={hires ? "hires" : "applications"} />}
  </section>
}
