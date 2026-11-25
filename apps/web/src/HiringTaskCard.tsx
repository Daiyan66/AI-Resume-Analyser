import type { Organization } from './api'
import { localTime, useHiringData, type HiringTask } from './hiringWorkflow'
import { workspaceHref } from './workspaceNavigation'

const candidateLabels: Record<string, string> = {
  assessment_due: 'Submit assessment',
  interview_booking: 'Book your interview',
  interview_upcoming: 'View upcoming interview',
}
const staffLabels: Record<string, string> = {
  assessment_review: 'Review submission',
  interview_booking: 'Waiting for candidate to book',
  interview_reschedule: 'Review reschedule request',
  interview_expired: 'Offer new interview times',
}

export function HiringTaskCard({ organization }: { organization?: Organization }) {
  const base = organization ? `/organizations/${organization.organizationId}` : '/candidate'
  const result = useHiringData<HiringTask[]>(`${base}/hiring-tasks`)
  const path = workspaceHref(organization ? 'staff-assessment-interview' : 'candidate-assessment-interview', organization?.role ?? 'CANDIDATE')
  const labels = organization ? staffLabels : candidateLabels
  return <section className="pv-card" aria-label={organization ? 'Needs attention' : 'Next action'}>
    <div className="section-heading"><h2>{organization ? 'Needs attention' : 'Next action'}</h2>
      <a href={path}>Assessment &amp; Interview</a></div>
    {result?.error ? <p role="alert">Could not load hiring tasks.</p> : !result?.data ? <p role="status">Loading hiring tasks…</p> :
      !result.data.length ? <p>{organization ? 'No interview or assessment tasks are waiting.' : 'You have no upcoming interview or assessment tasks.'}</p> :
        <ul className="list">{result.data.slice(0, organization ? 8 : 3).map(task => {
          const tab = task.kind.startsWith('assessment') ? 'assessments' : 'interviews'
          const query = new URLSearchParams({ tab, application: task.applicationId })
          if (organization) query.set('job', task.jobId)
          const timeLabel = task.kind === 'assessment_due' ? 'Due' : task.kind === 'assessment_review' ? 'Submitted' :
            task.kind === 'interview_reschedule' ? 'Requested' : task.kind === 'interview_expired' ? 'Last slot expired' :
            task.kind === 'interview_booking' ? 'First offered time' : 'Starts'
          return <li key={task.itemId}>
            <div><strong>{task.title}</strong>{organization && <> · {task.candidate}</>}<br />
              {timeLabel} <time dateTime={task.at}>{localTime(task.at)}</time></div>
            <a className="pv-button" href={`${path}?${query}`}>{labels[task.kind]}</a>
          </li>
        })}</ul>}
  </section>
}
