import { useEffect, useState, type FormEvent } from 'react'
import { api, type Job, type Organization, type Page } from './api'
import { RecruiterPipeline } from './RecruiterPipeline'

type Props = { organization: Organization; onPublished: () => void }

export function JobPublisher({ organization, onPublished }: Props) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [editing, setEditing] = useState<Job | null>(null)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [criteria, setCriteria] = useState<{ description: string; importance: 'REQUIRED' | 'PREFERRED'; guidance: string }[]>([])
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

  function save(event: FormEvent<HTMLFormElement>) {
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
      if (criteria.some((criterion) => !criterion.description.trim())) throw new Error('Each review criterion needs a description.')
      if ((min === '') !== (max === '') || (min === '') !== (currency === '')) {
        throw new Error('Enter minimum salary, maximum salary, and currency together, or leave all three blank.')
      }
      if (min && Number(max) < Number(min)) throw new Error('Maximum salary must be at least the minimum salary.')
      const path = `/organizations/${organization.organizationId}/jobs${editing ? `/${editing.id}` : ''}`
      const job = await api<Job>(path, { method: editing ? 'PUT' : 'POST',
        body: JSON.stringify({ title: fields.get('title'), location: fields.get('location'), workType: fields.get('workType'),
          salaryMin: min ? Number(min) : null, salaryMax: max ? Number(max) : null,
          currency: currency || null, description: fields.get('description'), requirements: fields.get('requirements'),
          questions: questions.map((prompt) => ({ prompt, required: true })), criteria }) })
      setJobs((current) => editing ? current.map((item) => item.id === job.id ? job : item) : [job, ...current].slice(0, 12))
      if (!editing) setTotal((current) => current + 1)
      setEditing(null); setCriteria([]); form.reset()
      setNotice(editing ? 'Draft updated.' : 'Draft job created. Publish it when the details are ready for candidates.')
    })
  }

  function publish(job: Job) {
    if (!window.confirm(`Publish ${job.title} for candidates to see?`)) return
    void run(async () => {
      const published = await api<Job>(`/organizations/${organization.organizationId}/jobs/${job.id}/publish`, { method: 'POST' })
      setJobs((current) => current.map((item) => item.id === job.id ? published : item))
      if (selectedJob?.id === job.id) setSelectedJob(published)
      setNotice(`${job.title} is now on the public job board.`)
      onPublished()
    })
  }

  function changeStatus(job: Job, status: 'PAUSED' | 'PUBLISHED' | 'CLOSED') {
    if (status === 'CLOSED' && !window.confirm(`Close ${job.title}? It will no longer accept applications.`)) return
    void run(async () => {
      const updated = await api<Job>(`/organizations/${organization.organizationId}/jobs/${job.id}/status`, {
        method: 'POST', body: JSON.stringify({ status }),
      })
      setJobs((current) => current.map((item) => item.id === job.id ? updated : item))
      if (selectedJob?.id === job.id) setSelectedJob(updated)
      setNotice(`${job.title} is now ${status.toLowerCase()}.`)
      onPublished()
    })
  }

  function edit(job: Job) {
    setEditing(job)
    setCriteria(job.criteria.map((criterion) => ({ description: criterion.description,
      importance: criterion.importance, guidance: criterion.guidance || '' })))
    setNotice('Edit the draft below, then save it before publishing.')
  }

  return <section className="panel" aria-labelledby="publish-heading">
    <h2 id="publish-heading">Jobs for {organization.name}</h2>
    <p>Draft jobs, set review criteria, publish openings, and review applicants. Published job text and criteria stay fixed for submitted applications.</p>
    {error && <p className="alert error" role="alert">{error}</p>}
    {notice && <p className="alert success" role="status">{notice}</p>}
    <ul className="list">{jobs.map((job) => <li key={job.id}>
      <span><strong>{job.title}</strong> · {job.status.toLowerCase()}</span>
      <span className="action-row">
        {job.status === 'DRAFT' && <><button type="button" className="quiet" disabled={busy} onClick={() => edit(job)}>Edit</button>
          <button type="button" disabled={busy} onClick={() => publish(job)}>Publish</button></>}
        {job.status === 'PUBLISHED' && <><button type="button" className="quiet" disabled={busy} onClick={() => changeStatus(job, 'PAUSED')}>Pause</button>
          <button type="button" className="quiet" disabled={busy} onClick={() => changeStatus(job, 'CLOSED')}>Close</button></>}
        {job.status === 'PAUSED' && <button type="button" className="quiet" disabled={busy} onClick={() => changeStatus(job, 'PUBLISHED')}>Resume</button>}
        {job.status !== 'DRAFT' && <button type="button" className="quiet" onClick={() => setSelectedJob(job)}>Applicants</button>}
      </span>
    </li>)}</ul>
    {total > 12 && <div className="pagination">
      <button type="button" className="quiet" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
      <span>Page {page + 1} · {total} jobs</span>
      <button type="button" className="quiet" disabled={(page + 1) * 12 >= total} onClick={() => setPage(page + 1)}>Next</button>
    </div>}
    {selectedJob && <RecruiterPipeline key={selectedJob.id} organization={organization} job={selectedJob} />}
    <form key={editing?.id || 'new'} onSubmit={save}>
      <h3>{editing ? `Edit draft: ${editing.title}` : 'Create a draft job'}</h3>
      <div className="field-grid">
        <label>Job title<input name="title" required maxLength={160} defaultValue={editing?.title} /></label>
        <label>Location<input name="location" required maxLength={160} defaultValue={editing?.location} /></label>
        <label>Work arrangement<select name="workType" defaultValue={editing?.workType || 'REMOTE'}><option value="REMOTE">Remote</option><option value="HYBRID">Hybrid</option><option value="ONSITE">On site</option></select></label>
      </div>
      <div className="field-grid">
        <label>Minimum salary (optional)<input name="salaryMin" type="number" min="0" defaultValue={editing?.salaryMin ?? ''} /></label>
        <label>Maximum salary (optional)<input name="salaryMax" type="number" min="0" defaultValue={editing?.salaryMax ?? ''} /></label>
        <label>Currency, e.g. INR (required with salary)<input name="currency" maxLength={3} pattern="[A-Za-z]{3}" defaultValue={editing?.currency ?? ''} /></label>
      </div>
      <label>Role description<textarea name="description" required maxLength={20000} defaultValue={editing?.description} /></label>
      <label>Requirements<textarea name="requirements" required maxLength={10000} defaultValue={editing?.requirements} /></label>
      <label>Screening questions (optional, one per line, up to 10)<textarea name="questions" defaultValue={editing?.questions.map((question) => question.prompt).join('\n')} /></label>
      <h4>Review criteria</h4>
      <p>Use specific requirements to guide human assessment. Add required and preferred criteria before publishing.</p>
      {criteria.map((criterion, index) => <div className="criterion field-grid" key={index}>
        <label>Criterion<input required maxLength={500} value={criterion.description}
          onChange={(event) => setCriteria(criteria.map((item, itemIndex) => itemIndex === index ? { ...item, description: event.target.value } : item))} /></label>
        <label>Importance<select value={criterion.importance}
          onChange={(event) => setCriteria(criteria.map((item, itemIndex) => itemIndex === index ?
            { ...item, importance: event.target.value as 'REQUIRED' | 'PREFERRED' } : item))}>
          <option value="REQUIRED">Required</option><option value="PREFERRED">Preferred</option></select></label>
        <label>Review guidance<input maxLength={1000} value={criterion.guidance}
          onChange={(event) => setCriteria(criteria.map((item, itemIndex) => itemIndex === index ? { ...item, guidance: event.target.value } : item))} /></label>
        <button type="button" className="quiet" onClick={() => setCriteria(criteria.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>
      </div>)}
      <button type="button" className="quiet" disabled={criteria.length >= 20}
        onClick={() => setCriteria([...criteria, { description: '', importance: 'REQUIRED', guidance: '' }])}>Add criterion</button>
      <span className="action-row"><button type="submit" disabled={busy}>{editing ? 'Save draft changes' : 'Create draft job'}</button>
        {editing && <button type="button" className="quiet" onClick={() => { setEditing(null); setCriteria([]) }}>Cancel editing</button>}</span>
    </form>
  </section>
}

function message(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Something went wrong. Please try again.'
}
