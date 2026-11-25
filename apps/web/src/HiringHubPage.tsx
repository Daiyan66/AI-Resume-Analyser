import type { Document, Job, Organization, Page, ReviewDetail } from './api'
import { CandidateHiringPage } from './CandidateHiringPage'
import { StaffAssessments } from './HiringAssessments'
import { HiringInterviews } from './HiringInterviews'
import { localTime, useHiringData } from './hiringWorkflow'
import { applicationStatuses, pageIndex, routeId } from './recruiterSearch'
import { RecruiterPagination } from './RecruiterPagination'
import { workspaceHref } from './workspaceNavigation'

type ApplicationSummary = { id: string; jobId: string; jobTitle: string; status: keyof typeof applicationStatuses
  candidateName: string; submittedAt: string }

export function HiringHubPage({ organization, documents }: { organization?: Organization; documents: Document[] }) {
  return organization ? <StaffHiringPage organization={organization} /> : <CandidateHiringPage documents={documents} />
}

function StaffHiringPage({ organization }: { organization: Organization }) {
  const path = workspaceHref('staff-assessment-interview', organization.role)
  const params = new URLSearchParams(location.search)
  const applicationId = routeId(params.get('application'))
  const jobId = routeId(params.get('job'))
  const templateJob = routeId(params.get('templateJob'))
  const tab = params.get('tab') === 'interviews' ? 'interviews' : 'assessments'
  const index = pageIndex(params.get('page'))
  const q = (params.get('q') ?? '').slice(0, 160)
  const scope = `/organizations/${organization.organizationId}`
  const query = new URLSearchParams({ page: String(index), size: '12', sort: 'oldest', q })
  const detailPath = applicationId && jobId ? `${scope}/jobs/${jobId}/applications/${applicationId}` : ''
  const detail = useHiringData<ReviewDetail>(detailPath)
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
        href={templateJob ? `${path}?tab=assessments&templateJob=${templateJob}` : link('assessments', applicationId, jobId)}>Assessments</a>
      <a className={`pv-button ${tab === 'interviews' ? 'primary' : ''}`} aria-current={tab === 'interviews' ? 'page' : undefined}
        href={link('interviews', applicationId, jobId)}>Interviews</a>
      {(applicationId || templateJob) && <a href={link(tab)}>All applications</a>}
    </nav>
    {templateJob ? job?.error ? <p role="alert" className="alert error">{job.error}</p> :
      !job?.data ? <p role="status">Loading job…</p> : <>
        <section className="pv-card"><h2>{job.data.title}</h2><p>Build reusable assessments for this job.</p></section>
        <StaffAssessments jobId={templateJob} organization={organization} />
      </> : !applicationId ? <section className="panel">
      <h2>Choose an application</h2>
      <p>Oldest applications first.</p>
      {tab === 'assessments' && <p>To set up a template before assigning it, open a job in <a href={workspaceHref('posted-jobs', organization.role)}>Posted jobs</a>.</p>}
      <form className="inline-form" action={path}>
        <input type="hidden" name="tab" value={tab} />
        <label>Search applications<input type="search" name="q" defaultValue={q} maxLength={160} placeholder="Candidate or job title" /></label>
        <button type="submit">Search</button>
      </form>
      {listing?.error ? <p role="alert" className="alert error">{listing.error}</p> :
        !listing?.data ? <p role="status">Loading applications…</p> :
          !listing.data.items.length ? <p>No applications found.</p> :
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
        {tab === 'interviews' ? <HiringInterviews applicationId={applicationId} jobId={jobId}
          jobTitle={selection.job.title} stage={selection.status} organization={organization} /> :
          <StaffAssessments applicationId={applicationId} jobId={jobId} organization={organization}
            closed={closed} canAssign={['SUBMITTED', 'IN_REVIEW'].includes(selection.status)}
            interviewHref={link('interviews', applicationId, jobId)} />}
      </>}
  </div>
}
