import { useEffect, useRef, useState, type FormEvent } from 'react'
import { api, type Job, type Organization } from './api'
import { jobImport } from './jobImport'
import { routeId } from './recruiterSearch'
import { recruiterRoutes } from './workspaceNavigation'

export function PostJobPage({ organization }: { organization: Organization }) {
  const draftParam = new URLSearchParams(location.search).get('draft')
  const id = routeId(draftParam)
  const [result, setResult] = useState<{ job?: Job; error?: string }>()
  const path = `/organizations/${organization.organizationId}/jobs/${id}`
  useEffect(() => {
    if (!id) return
    const controller = new AbortController()
    void api<Job>(path, { signal: controller.signal }).then(job => setResult({ job }))
      .catch((cause: Error) => { if (!controller.signal.aborted) setResult({ error: cause.message }) })
    return () => controller.abort()
  }, [id, path])

  if (draftParam && !id) return <p role="alert">Invalid draft link.</p>
  if (result?.error) return <p className="alert error" role="alert">{result.error}</p>
  if (id && !result?.job) return <p role="status">Loading draft…</p>
  if (result?.job && result.job.status !== 'DRAFT') return <p>This job has already left the draft stage. <a href={recruiterRoutes['posted-jobs']}>Back to posted jobs</a></p>
  return <JobForm organization={organization} editing={result?.job} />
}

function JobForm({ organization, editing }: { organization: Organization; editing?: Job }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [criteria, setCriteria] = useState(() => editing?.criteria.map(criterion => ({
    description: criterion.description, importance: criterion.importance, guidance: criterion.guidance ?? '',
  })) ?? [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [draftSuggestion, setDraftSuggestion] = useState('')
  const [draftModel, setDraftModel] = useState('')

  async function run(action: () => Promise<void>) {
    setBusy(true); setError(''); setNotice('')
    try { await action() }
    catch (cause) { setError(message(cause)) }
    finally { setBusy(false) }
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
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
      await api<Job>(path, { method: editing ? 'PUT' : 'POST',
        body: JSON.stringify({ title: fields.get('title'), location: fields.get('location'), workType: fields.get('workType'),
          salaryMin: min ? Number(min) : null, salaryMax: max ? Number(max) : null,
          currency: currency || null, description: fields.get('description'), requirements: fields.get('requirements'),
          questions: questions.map((prompt) => ({ prompt, required: editing?.questions.find(question => question.prompt === prompt)?.required ?? true })), criteria }) })
      location.assign(`${recruiterRoutes['posted-jobs']}?status=DRAFT`)
    })
  }

  function suggest(event: React.MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form
    if (!form) return
    const fields = new FormData(form)
    const title = String(fields.get('title') || '').trim()
    const facts = [fields.get('description'), fields.get('requirements')].map(String).join('\n').trim()
    void run(async () => {
      if (!title || !facts) throw new Error('Enter a title and factual role details before requesting a draft.')
      const result = await api<{ text: string; model: string }>(`/organizations/${organization.organizationId}/ai/job-draft`, {
        method: 'POST', body: JSON.stringify({ title, facts }),
      })
      setDraftSuggestion(result.text)
      setDraftModel(result.model)
      setNotice('Draft ready. Review every claim before using or publishing it.')
    })
  }

  function useSuggestion(event: React.MouseEvent<HTMLButtonElement>) {
    const description = event.currentTarget.form?.elements.namedItem('description') as HTMLTextAreaElement | null
    if (description) description.value = draftSuggestion
    setDraftSuggestion('')
    setNotice('AI text copied into the editable description. Check it against your original facts.')
  }

  function importDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const file = data.get('file')
    void run(async () => {
      if (!(file instanceof File) || !/\.(pdf|docx|txt)$/i.test(file.name) || !file.size || file.size > 2_000_000) {
        throw new Error('Choose a nonempty text-based PDF, DOCX or TXT up to 2 MB.')
      }
      const imported = await api<{ title: string; description: string }>(`/organizations/${organization.organizationId}/jobs/import-draft`, {
        method: 'POST', body: data,
      })
      const form = formRef.current
      if (!form) return
      const values = Object.entries(jobImport(imported)).flatMap(([name, value]) => {
        const field = form.elements.namedItem(name)
        return value && (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement)
          ? [{ field, value }] : []
      })
      if (values.some(({ field, value }) => field.value && field.value !== value) &&
          !confirm('Replace the matching fields with the values extracted from this file?')) return
      for (const { field, value } of values) field.value = value
      setDraftSuggestion('')
      setNotice('Job details filled from the document. Review the imported fields, complete missing details, and save the draft.')
    })
  }

  return <section className="panel" aria-label="Job draft">
    <div className="section-heading"><h2>{organization.name}</h2><a href={recruiterRoutes['posted-jobs']}>Back to posted jobs</a></div>
    <form className="inline-form" onSubmit={importDocument}>
      <label>Job description file<input type="file" name="file" accept=".pdf,.docx,.txt" required aria-describedby="job-import-hint" /></label>
      <button type="submit" disabled={busy}>Upload and autofill</button>
    </form>
    <p id="job-import-hint">Use a text-based PDF, DOCX, or TXT up to 2 MB. Extracted fields are editable.</p>
    {error && <p className="alert error" role="alert">{error}</p>}
    {notice && <p className="alert success" role="status">{notice}</p>}
    <form ref={formRef} onSubmit={save}>
      <h3>{editing ? `Edit draft: ${editing.title}` : 'Create a draft job'}</h3>
      <div className="field-grid">
        <label>Job title<input name="title" required maxLength={160} defaultValue={editing?.title} /></label>
        <label>Location<input name="location" required maxLength={160} defaultValue={editing?.location} /></label>
        <label>Work arrangement<select name="workType" required defaultValue={editing?.workType || ''}><option value="" disabled>Choose an arrangement</option><option value="REMOTE">Remote</option><option value="HYBRID">Hybrid</option><option value="ONSITE">On site</option></select></label>
      </div>
      <div className="field-grid">
        <label>Minimum salary (optional)<input name="salaryMin" type="number" min="0" max="2147483647" defaultValue={editing?.salaryMin ?? ''} /></label>
        <label>Maximum salary (optional)<input name="salaryMax" type="number" min="0" max="2147483647" defaultValue={editing?.salaryMax ?? ''} /></label>
        <label>Currency, e.g. INR (required with salary)<input name="currency" maxLength={3} pattern="[A-Za-z]{3}" defaultValue={editing?.currency ?? ''} /></label>
      </div>
      <label>Role description<textarea name="description" required maxLength={20000} defaultValue={editing?.description} /></label>
      <label>Requirements<textarea name="requirements" required maxLength={10000} defaultValue={editing?.requirements} /></label>
      <div className="criterion">
        <h4>Optional AI drafting</h4>
        <p>An Admin must enable AI and configure a provider. The title, description, and requirements above are sent to that provider when you choose this action. No candidate data is sent.</p>
        <button type="button" className="quiet" disabled={busy} onClick={suggest}>Suggest job description</button>
        {draftSuggestion && <div><p>Suggested by {draftModel}. This text has not been published.</p>
          <p className="preserve-lines">{draftSuggestion}</p>
          <button type="button" className="quiet" onClick={useSuggestion}>Use as editable description</button></div>}
      </div>
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
        {editing && <a className="pv-button" href={recruiterRoutes['posted-jobs']}>Cancel editing</a>}</span>
    </form>
  </section>
}

function message(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Something went wrong. Please try again.'
}
