import { useState } from 'react'
import type { Document, Page } from './api'
import { CandidateAssessments } from './HiringAssessments'
import { HiringInterviews } from './HiringInterviews'
import { localTime, useHiringData } from './hiringWorkflow'
import { applicationStatuses, pageIndex, routeId } from './recruiterSearch'
import { RecruiterPagination } from './RecruiterPagination'
import { workspaceHref } from './workspaceNavigation'

const steps = {
  application_review: { label: 'Waiting for recruiter review', action: 'View progress' },
  assessment_scheduled: { label: 'Assessment scheduled', action: 'View assessment schedule', time: 'Opens' },
  assessment_due: { label: 'Assessment ready', action: 'Open assessment', time: 'Due' },
  assessment_review: { label: 'Assessment submitted', action: 'View submission', time: 'Submitted' },
  assessment_retry: { label: 'Another assessment attempt requested', action: 'View assessment feedback' },
  assessment_expired: { label: 'Assessment deadline passed', action: 'View assessment', time: 'Deadline' },
  interview_pending: { label: 'Waiting for interview times', action: 'View interview status' },
  interview_booking: { label: 'Interview times available', action: 'Choose a time', time: 'First offered time' },
  interview_completed: { label: 'Interview completed · awaiting an update', action: 'View interview history' },
  interview_elapsed: { label: 'Interview time passed · awaiting an update', action: 'View interview' },
  interview_upcoming: { label: 'Interview confirmed', action: 'View interview', time: 'Starts' },
  offer: { label: 'Offer stage', action: 'View progress' },
  closed: { label: 'Application closed', action: 'View history' },
} as const
type Progress = {
  id: string; jobId: string; jobTitle: string; organizationName: string; status: keyof typeof applicationStatuses
  submittedAt: string; nextKind: keyof typeof steps; nextAt: string | null; assessmentTitle: string | null
}

const path = workspaceHref('candidate-assessment-interview', 'CANDIDATE')
const apiPath = '/candidate/hiring-applications'

function ProgressCard({ application, detail = false }: { application: Progress; detail?: boolean }) {
  const next = steps[application.nextKind]
  return <article className="pv-card candidate-progress-card">
    <div className="section-heading">
      <h2>{application.jobTitle}</h2>
      <span className="pv-pill">{applicationStatuses[application.status]}</span>
    </div>
    <p>{application.organizationName} · Applied <time dateTime={application.submittedAt}>{localTime(application.submittedAt)}</time></p>
    <div className="candidate-progress-next">
      <div><strong>{next.label}</strong>
        {application.assessmentTitle && <div>{application.assessmentTitle}</div>}
        {application.nextAt && 'time' in next && <div>{next.time} <time dateTime={application.nextAt}>{localTime(application.nextAt)}</time></div>}
      </div>
      {!detail && <a className="pv-button primary" href={`${path}?application=${application.id}`}>{next.action}</a>}
    </div>
  </article>
}

export function CandidateHiringPage({ documents }: { documents: Document[] }) {
  const params = new URLSearchParams(location.search)
  const id = routeId(params.get('application'))
  const index = pageIndex(params.get('page'))
  const [revision, setRevision] = useState(0)
  const detail = useHiringData<Progress>(id ? `${apiPath}/${id}` : '', revision)
  const listing = useHiringData<Page<Progress>>(id ? '' : `${apiPath}?page=${index}&size=12`)
  const application = detail?.data
  const error = id ? detail?.error : listing?.error

  return <div className="hiring-workflow">
    {id && <a href={path}>Back to assessments and interviews</a>}
    {error ? <p role="alert" className="alert error">{error}</p> : id ?
      !application ? <p role="status">Loading application…</p> : <>
        <ProgressCard application={application} detail />
        {application.nextKind.startsWith('interview') && <HiringInterviews applicationId={application.id} jobId={application.jobId}
          jobTitle={application.jobTitle} stage={application.status} onProgress={() => setRevision(value => value + 1)} />}
        {application.nextKind.startsWith('assessment') ?
          <CandidateAssessments applicationId={application.id} documents={documents} closed={false}
            onProgress={() => setRevision(value => value + 1)} /> :
          <details className="pv-card"><summary>Assessment history and practice</summary>
            <CandidateAssessments applicationId={application.id} documents={documents} closed={application.nextKind === 'closed'}
              onProgress={() => setRevision(value => value + 1)} />
          </details>}
      </> : !listing?.data ? <p role="status">Loading assessments and interviews…</p> : <>
        <h2>Jobs with assessments</h2>
        {listing.data.items.length ? <ul className="candidate-card-stack">
          {listing.data.items.map(item => <li key={item.id}><ProgressCard application={item} /></li>)}
        </ul> : <section className="panel"><p>An application appears here once a recruiter assigns you an assessment.</p>
          <a className="pv-button" href="/dashboard#candidate">Find jobs</a></section>}
        <RecruiterPagination result={listing.data} path={path} filters={new URLSearchParams()} noun="applications" />
      </>}
  </div>
}
