import { useState } from 'react'
import type { Document, Job, Organization, Page, ReviewDetail } from './api'
import { CandidateHiringPage } from './CandidateHiringPage'
import { StaffAssessments } from './HiringAssessments'
import { HiringInterviews } from './HiringInterviews'
import { localTime, useHiringData } from './hiringWorkflow'
import { applicationStatuses, pageIndex, routeId } from './recruiterSearch'
import { RecruiterApplicationReview } from './RecruiterApplicationReview'
import { RecruiterPagination } from './RecruiterPagination'
import { workspaceHref } from './workspaceNavigation'

type ApplicationSummary = { id: string; jobId: string; jobTitle: string; status: keyof typeof applicationStatuses
  candidateName: string; submittedAt: string }

export function HiringHubPage({ organization, documents, accountId }: { organization?: Organization; documents: Document[]; accountId: string }) {
  return organization ? <StaffHiringPage organization={organization} accountId={accountId} /> : <CandidateHiringPage documents={documents} />
}

function StaffHiringPage({ organization, accountId }: { organization: Organization; accountId: string }) {
  const path = workspaceHref('staff-assessment-interview', organization.role)
  const params = new URLSearchParams(location.search)
  const applicationId = routeId(params.get('application'))
  const jobId = routeId(params.get('job'))
  const templateJob = routeId(params.get('templateJob'))
  const tab = params.get('tab') === 'interviews' ? 'interviews' : 'assessments'
  const index = pageIndex(params.get('page'))
  const q = (params.get('q') ?? '').slice(0, 160)
  const scope = `/organizations/${organization.organizationId}`
  const query = new URLSearchParams({ page: String(index), size: '12', sort: 'oldest', hiringStep: tab, q })
  const detailPath = applicationId && jobId ? `${scope}/jobs/${jobId}/applications/${applicationId}` : ''
  const [revision, setRevision] = useState(0)
  const detail = useHiringData<ReviewDetail>(detailPath, revision)
  const listing = useHiringData<Page<ApplicationSummary>>(applicationId || templateJob ? '' : `${scope}/applications?${query}`)
  const job = useHiringData<Job>(templateJob ? `${scope}/jobs/${templateJob}` : '')
  const selection = detail?.data
  const closed = ['HIRED', 'NOT_SELECTED', 'WITHDRAWN'].includes(selection?.status ?? '')

  function link(nextTab: string, id?: string, job?: string) {
    const target = new URLSearchParams({ tab: nextTab })
    if (id) target.set('application', id)
    if (job) target.set('job', job)
    return `${path}?${target}`
  }

  return <div className="hiring-workflow">
    <nav className="action-row" aria-label="Assessment and interview views">
      <a className={`pv-button ${tab === 'assessments' ? 'primary' : ''}`} aria-current={tab === 'assessments' ? 'page' : undefined}
        href={templateJob ? `${path}?tab=assessments&templateJob=${templateJob}` : link('assessments')}>Assessments</a>
      <a className={`pv-button ${tab === 'interviews' ? 'primary' : ''}`} aria-current={tab === 'interviews' ? 'page' : undefined}
        href={link('interviews')}>Interviews</a>
      {(applicationId || templateJob) && <a href={link(tab)}>Back to {tab}</a>}
    </nav>
    {templateJob ? job?.error ? <p role="alert" className="alert error">{job.error}</p> :
      !job?.data ? <p role="status">Loading job…</p> : <>
        <section className="pv-card"><h2>{job.data.title}</h2><p>Build reusable assessments for this job.</p></section>
        <StaffAssessments jobId={templateJob} organizationId={organization.organizationId} />
      </> : !applicationId ? <section className="panel">
      <h2>{tab === 'assessments' ? 'Assigned assessments' : 'Interview candidates'}</h2>
      <p>Oldest applications first.</p>
      {tab === 'assessments' && <p>To invite a candidate, open their application in <a href={workspaceHref('recruiter-applications', organization.role)}>Applications</a> and schedule an assessment.</p>}
      <form className="inline-form" action={path}>
        <input type="hidden" name="tab" value={tab} />
        <label>Search applications<input type="search" name="q" defaultValue={q} maxLength={160} placeholder="Candidate or job title" /></label>
        <button type="submit">Search</button>
      </form>
      {listing?.error ? <p role="alert" className="alert error">{listing.error}</p> :
        !listing?.data ? <p role="status">Loading applications…</p> :
          !listing.data.items.length ? <p>{tab === 'assessments' ? 'No assigned assessments match this view.' : 'No interview candidates match this view.'}</p> :
            <ul className="list">{listing.data.items.map(application => <li key={application.id}>
              <div><strong>{application.candidateName}</strong><br />
                {application.jobTitle} · {applicationStatuses[application.status]}<br />
                Applied <time dateTime={application.submittedAt}>{localTime(application.submittedAt)}</time></div>
              <a className="pv-button" href={link(tab, application.id, application.jobId)}
                aria-label={`Open ${tab} for ${application.candidateName}`}>Open {tab}</a>
            </li>)}</ul>}
      {listing?.data && <RecruiterPagination result={listing.data} path={path} filters={new URLSearchParams({ tab, q })} noun="applications" />}
    </section> : !detailPath ? <p role="alert">This application link is missing its job. Choose the application again.</p> :
      detail?.error ? <p role="alert" className="alert error">{detail.error}</p> :
      !selection ? <p role="status">Loading application…</p> : <>
        <section className="pv-card">
          <h2>{selection.job.title}</h2>
          <p>{selection.profileSnapshot.displayName} · {applicationStatuses[selection.status as keyof typeof applicationStatuses]}</p>
        </section>
        {tab === 'interviews' ? <><HiringInterviews applicationId={applicationId} jobId={jobId}
          jobTitle={selection.job.title} stage={selection.status} organization={organization} onProgress={() => setRevision(value => value + 1)} />
          {organization.role === 'RECRUITER' && ['INTERVIEW', 'OFFER'].includes(selection.status) &&
            <details className="panel">
              <summary>Final review and hiring decision</summary>
              <RecruiterApplicationReview base={`${scope}/jobs/${jobId}/applications`} applicationId={applicationId}
                organizationId={organization.organizationId} accountId={accountId} role={organization.role} finalReview />
            </details>}
          </> :
          <StaffAssessments applicationId={applicationId} jobId={jobId} organizationId={organization.organizationId}
            closed={closed} canAssign={['SUBMITTED', 'IN_REVIEW'].includes(selection.status)}
            interviewHref={link('interviews', applicationId, jobId)} />}
      </>}
  </div>
}
