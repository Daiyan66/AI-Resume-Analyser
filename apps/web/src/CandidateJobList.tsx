import type { Job } from './api'
import { workTypes } from './workspaceNavigation'

function initials(name: string) {
  const words = name.trim().split(/\s+/).slice(0, 2)
  return (words.length > 1 ? words.map(word => [...word][0] ?? '').join('') : [...words[0]].slice(0, 2).join(''))
    .toLocaleUpperCase()
}

function excerpt(description: string) {
  const text = description.trim().replace(/\s+/g, ' ')
  return text.length > 210 ? text.slice(0, 207).replace(/\s+\S*$/, '') + '…' : text
}

export function CandidateJobList({ jobs, selectedId, compact = false }: {
  jobs: Job[]; selectedId?: string | null; compact?: boolean
}) {
  return <ul className="candidate-card-stack">{jobs.map(job => {
    const opening = selectedId === job.id
    const postedAt = job.publishedAt
    const pay = job.currency && job.salaryMin !== null && job.salaryMax !== null ?
      `${job.currency} ${job.salaryMin.toLocaleString()}–${job.salaryMax.toLocaleString()}` : null
    return <li key={job.id}>
      <article className={`candidate-job-card${compact ? ' compact' : ''}${opening ? ' selected' : ''}`} aria-label={`${job.title} at ${job.organizationName}`}>
        <div className="candidate-job-company">
          <span className="candidate-job-mark" aria-hidden="true">{initials(job.organizationName)}</span>
          <strong>{job.organizationName}</strong>
        </div>
        <div className="candidate-job-opening">
          <div className="candidate-job-summary">
            <h3>{job.title}</h3>
            <p className="candidate-job-meta">{job.location} <span aria-hidden="true">·</span> {workTypes[job.workType]}</p>
            {!compact && job.description.trim() && <p className="candidate-job-description">{excerpt(job.description)}</p>}
            {!compact && pay && <p className="candidate-job-pay">{pay}</p>}
          </div>
          <div className="candidate-job-action">
            {!compact && postedAt && <time dateTime={postedAt}>Posted {new Date(postedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</time>}
            <a className={`pv-button${compact ? '' : ' primary'}`} href={`#candidate?job=${job.id}`} aria-current={opening ? 'true' : undefined}
              aria-label={`View job: ${job.title}`}>View job</a>
          </div>
        </div>
      </article>
    </li>
  })}</ul>
}
