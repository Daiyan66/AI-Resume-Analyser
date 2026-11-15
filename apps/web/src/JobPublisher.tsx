import { useEffect, useState, type FormEvent } from 'react'
import { api, type Job, type Organization, type Page } from './api'

type Props = { organization: Organization; onPublished: () => void }

export function JobPublisher({ organization, onPublished }: Props) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    void api<Page<Job>>(`/organizations/${organization.organizationId}/jobs?page=${page}&size=12`)
      .then((result) => { setJobs(result.items); setTotal(result.total) })
      .catch((cause: unknown) => setError(message(cause)))
  }, [organization.organizationId, page])

  async function run(action: () => Promise<void>) {
    setBusy(true); setError(''); setNotice('')
    try { await action() }
    catch (cause) { setError(message(cause)) }
    finally { setBusy(false) }
  }

  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const fields = new FormData(form)
    const min = String(fields.get('salaryMin') || '')
    const max = String(fields.get('salaryMax') || '')
    const currency = String(fields.get('currency') || '').trim().toUpperCase()
    const questions = String(fields.get('questions') || '').split('\n').map((line) => line.trim()).filter(Boolean)
    void run(async () => {
      if (questions.length > 10) throw new Error('Add no more than 10 screening questions.')
      if (questions.some((question) => question.length > 500)) throw new Error('Keep each screening question under 500 characters.')
      if ((min === '') !== (max === '') || (min === '') !== (currency === '')) {
        throw new Error('Enter minimum salary, maximum salary, and currency together, or leave all three blank.')
      }
      if (min && Number(max) < Number(min)) throw new Error('Maximum salary must be at least the minimum salary.')
      const job = await api<Job>(`/organizations/${organization.organizationId}/jobs`, { method: 'POST',
        body: JSON.stringify({ title: fields.get('title'), location: fields.get('location'), workType: fields.get('workType'),
          salaryMin: min ? Number(min) : null, salaryMax: max ? Number(max) : null,
          currency: currency || null, description: fields.get('description'), requirements: fields.get('requirements'),
          questions: questions.map((prompt) => ({ prompt, required: true })) }) })
      setJobs((current) => [job, ...current].slice(0, 12)); setTotal((current) => current + 1); form.reset()
      setNotice('Draft job created. Publish it when the details are ready for candidates.')
    })
  }

  function publish(job: Job) {
    if (!window.confirm(`Publish ${job.title} for candidates to see?`)) return
    void run(async () => {
      const published = await api<Job>(`/organizations/${organization.organizationId}/jobs/${job.id}/publish`, { method: 'POST' })
      setJobs((current) => current.map((item) => item.id === job.id ? published : item))
      setNotice(`${job.title} is now on the public job board.`)
      onPublished()
    })
  }

  return <section className="panel" aria-labelledby="publish-heading">
    <h2 id="publish-heading">Jobs for {organization.name}</h2>
    <p>This starter publisher lets candidates test the job board and applications. The full recruiter editor arrives in Phase 6.</p>
    {error && <p className="alert error" role="alert">{error}</p>}
    {notice && <p className="alert success" role="status">{notice}</p>}
    <ul className="list">{jobs.map((job) => <li key={job.id}>
      <span><strong>{job.title}</strong> · {job.status.toLowerCase()}</span>
      {job.status === 'DRAFT' && <button type="button" className="quiet" disabled={busy} onClick={() => publish(job)}>Publish</button>}
    </li>)}</ul>
    {total > 12 && <div className="pagination">
      <button type="button" className="quiet" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
      <span>Page {page + 1} · {total} jobs</span>
      <button type="button" className="quiet" disabled={(page + 1) * 12 >= total} onClick={() => setPage(page + 1)}>Next</button>
    </div>}
    <form onSubmit={create}>
      <div className="field-grid">
        <label>Job title<input name="title" required maxLength={160} /></label>
        <label>Location<input name="location" required maxLength={160} /></label>
        <label>Work arrangement<select name="workType"><option value="REMOTE">Remote</option><option value="HYBRID">Hybrid</option><option value="ONSITE">On site</option></select></label>
      </div>
      <div className="field-grid">
        <label>Minimum salary (optional)<input name="salaryMin" type="number" min="0" /></label>
        <label>Maximum salary (optional)<input name="salaryMax" type="number" min="0" /></label>
        <label>Currency, e.g. INR (required with salary)<input name="currency" maxLength={3} pattern="[A-Za-z]{3}" /></label>
      </div>
      <label>Role description<textarea name="description" required maxLength={20000} /></label>
      <label>Requirements<textarea name="requirements" required maxLength={10000} /></label>
      <label>Screening questions (optional, one per line, up to 10)<textarea name="questions" /></label>
      <button type="submit" disabled={busy}>Create draft job</button>
    </form>
  </section>
}

function message(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Something went wrong. Please try again.'
}
