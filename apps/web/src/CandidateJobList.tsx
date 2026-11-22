import type { Job } from './api'
import { workTypes } from './workspaceNavigation'

export function CandidateJobList({ jobs, selectedId }: { jobs: Job[]; selectedId?: string | null }) {
  return <ul className="list candidate-job-list">{jobs.map(job => <li key={job.id}>
    <div><strong>{job.title}</strong><br /><span>{job.organizationName} · {job.location} · {workTypes[job.workType]}</span></div>
    <a className="pv-button" href={`#candidate?job=${job.id}`} aria-current={selectedId === job.id ? 'true' : undefined}
      aria-label={`View job: ${job.title}`}>View job</a>
  </li>)}</ul>
}
