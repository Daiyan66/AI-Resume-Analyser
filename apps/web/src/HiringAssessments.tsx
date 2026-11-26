import { useEffect, useRef, useState, type FormEvent } from 'react'
import { api, type Document, type Organization } from './api'
import { currentAssessments, localTime, useHiringAction, useHiringData, useWorkflowClock, write, type AssessmentAssignment, type AssessmentFields, type AssessmentTemplate } from './hiringWorkflow'

const emptyTemplate = { title: '', instructions: '', effortMinutes: 30, allowedTools: '', rubric: [] }
type Suggestion = Pick<AssessmentFields, 'title' | 'instructions' | 'rubric'>
type Evidence = { criterion: string; excerpt: string; followUp: string }

function Feedback({ assessment }: { assessment: AssessmentAssignment }) {
  if (!assessment.reviewedAt) return null
  return <div>
    <h4>Review feedback</h4>
    {assessment.outcome && <p><strong>{assessment.outcome === 'PASSED' ? 'Passed' : 'Another attempt requested'}</strong></p>}
    <p className="preserve-lines">{assessment.feedback}</p>
    <ul>{assessment.rubric.map((criterion, index) => <li key={criterion}>{criterion} · {assessment.scores[index]}/4</li>)}</ul>
  </div>
}

function CandidateAssessment({ assessment, base, documents, closed, refresh }: {
  assessment: AssessmentAssignment; base: string; documents: Document[]; closed: boolean; refresh: () => void
}) {
  const [answer, setAnswer] = useState(assessment.answer)
  const [documentId, setDocumentId] = useState(assessment.documentId ?? '')
  const [attachment, setAttachment] = useState<Document>()
  const [aiConsent, setConsent] = useState(assessment.aiConsent)
  const { busy, error, notice, run } = useHiringAction()
  const fileField = useRef<HTMLInputElement>(null)
  const now = useWorkflowClock()
  const opensLater = Date.parse(assessment.availableFrom) > now
  const canEdit = !closed && !opensLater && !!assessment.instructions && !assessment.submittedAt &&
    !assessment.outcome && Date.parse(assessment.dueAt) > now

  function save(submit: boolean) {
    void run(async () => {
      const file = fileField.current?.files?.[0]
      if (submit && !answer.trim() && !documentId && !file) throw new Error('Enter an answer or attach a file.')
      let selectedDocument = documentId
      if (file) {
        const form = new FormData()
        form.set('file', file)
        const uploaded = await api<Document>('/documents', { method: 'POST', body: form })
        setAttachment(uploaded)
        setDocumentId(uploaded.id)
        selectedDocument = uploaded.id
        if (fileField.current) fileField.current.value = ''
      }
      await write(`${base}/${assessment.id}/${submit ? 'submit' : 'draft'}`, submit ? 'POST' : 'PUT',
        { answer, documentId: selectedDocument || null, aiConsent })
      refresh()
    }, submit ? 'Assessment submitted.' : 'Draft saved.')
  }

  return <article className="criterion">
    <h3>{assessment.title}</h3>
    <p>Opens <time dateTime={assessment.availableFrom}>{localTime(assessment.availableFrom)}</time><br />
      Due <time dateTime={assessment.dueAt}>{localTime(assessment.dueAt)}</time> · About {assessment.effortMinutes} minutes</p>
    {assessment.instructions && <p className="preserve-lines">{assessment.instructions}</p>}
    <p className="preserve-lines"><strong>Allowed tools</strong> · {assessment.allowedTools}</p>
    {assessment.rubric.length > 0 && <details><summary>How this will be reviewed</summary><ul>{assessment.rubric.map(item => <li key={item}>{item}</li>)}</ul></details>}
    {error && <p className="alert error" role="alert">{error}</p>}
    {notice && <p className="alert success" role="status">{notice}</p>}
    {canEdit ? <form onSubmit={event => {
      event.preventDefault()
      if (confirm('Submit this assessment for review? Your answer and attachment will be locked.')) save(true)
    }}>
      <label>Written answer<textarea aria-label="Written answer" value={answer} maxLength={20000} disabled={busy}
        onChange={event => setAnswer(event.target.value)} /></label>
      <label>Attach a saved document<select aria-label="Attach a saved document" value={documentId} disabled={busy}
        onChange={event => setDocumentId(event.target.value)}>
        <option value="">No attachment</option>
        {attachment && !documents.some(doc => doc.id === attachment.id) && <option value={attachment.id}>{attachment.filename}</option>}
        {documents.map(doc => <option key={doc.id} value={doc.id}>{doc.filename}</option>)}
      </select></label>
      <label>Or upload a new file<input type="file" accept=".pdf,.docx,.txt" ref={fileField} disabled={busy} /></label>
      <label className="workflow-choice"><input type="checkbox" checked={aiConsent} disabled={busy} onChange={event => setConsent(event.target.checked)} />
        Allow the recruiter to send my written answer to their AI provider to find evidence for the rubric.</label>
      <div className="action-row">
        <button type="button" className="quiet" disabled={busy} onClick={() => save(false)}>Save draft</button>
        <button type="submit" disabled={busy}>Submit assessment</button>
      </div>
      {assessment.updatedAt && <small>Last saved {localTime(assessment.updatedAt)}</small>}
    </form> : assessment.submittedAt ? <>
      <p><strong>Submission received</strong> · <time dateTime={assessment.submittedAt}>{localTime(assessment.submittedAt)}</time></p>
      {assessment.answer && <p className="preserve-lines">{assessment.answer}</p>}
      {assessment.documentId && <a href={`/api/v1/documents/${assessment.documentId}`}>{assessment.documentName ?? 'Download attachment'}</a>}
      <Feedback assessment={assessment} />
    </> : <>
      <p>{closed ? 'This application has closed.' : opensLater ? 'You can start when the assessment opens.' :
        Date.parse(assessment.dueAt) <= now || assessment.outcome === 'EXPIRED' ?
          'The assessment deadline has passed.' : 'Loading assessment instructions…'}</p>
      {assessment.answer && <p className="preserve-lines">{assessment.answer}</p>}
      {assessment.documentId && <a href={`/api/v1/documents/${assessment.documentId}`}>{assessment.documentName ?? 'Download saved attachment'}</a>}
    </>}
  </article>
}

function AssessmentPractice({ base }: { base: string }) {
  const [questions, setQuestions] = useState<string[]>()
  const { busy, error, run } = useHiringAction()
  return <details className="criterion">
    <summary>Optional practice</summary>
    <p>Practice questions use the job description. Your practice stays separate from the assigned assessment.</p>
    <div className="action-row">
      <button type="button" className="quiet" disabled={busy} onClick={() => void run(async () => {
        setQuestions(await api<string[]>(`${base}/practice`))
      })}>Show practice questions</button>
      <button type="button" className="quiet" disabled={busy} onClick={() => void run(async () => {
        setQuestions(await write<string[]>(`${base}/practice/ai`, 'POST'))
      })}>Generate AI practice questions</button>
    </div>
    {error && <p role="alert" className="alert error">{error}</p>}
    {questions && <ol>{questions.map(question => <li key={question}>{question}</li>)}</ol>}
  </details>
}

export function CandidateAssessments({ applicationId, documents, closed, onProgress }: {
  applicationId: string; documents: Document[]; closed: boolean; onProgress: () => void
}) {
  const base = `/candidate/applications/${applicationId}/assessments`
  const [revision, setRevision] = useState(0)
  const result = useHiringData<AssessmentAssignment[]>(base, revision)
  useEffect(() => {
    if (closed || !result?.data) return
    const starts = result.data.filter(item => !item.instructions).map(item => Date.parse(item.availableFrom))
    if (!starts.length) return
    const delay = Math.max(1000, Math.min(2_147_483_647, Math.min(...starts) - Date.now() + 250))
    const timer = window.setTimeout(() => setRevision(value => value + 1), delay)
    return () => window.clearTimeout(timer)
  }, [closed, result])
  return <section className="panel">
    <h2>Assessments</h2>
    {result?.error ? <p role="alert" className="alert error">{result.error}</p> :
      !result?.data ? <p role="status">Loading assessments…</p> :
        !result.data.length ? <p>No assessments have been assigned for this application.</p> :
          result.data.map(assessment => <CandidateAssessment key={assessment.id} assessment={assessment} base={base}
            documents={documents} closed={closed} refresh={() => { setRevision(value => value + 1); onProgress() }} />)}
    <AssessmentPractice base={base} />
  </section>
}

function TemplateEditor({ base, editing, saved }: { base: string; editing?: AssessmentTemplate; saved: () => void }) {
  const [fields, setFields] = useState(editing ?? emptyTemplate)
  const [rubric, setRubric] = useState(() => fields.rubric.join('\n'))
  const [suggestion, setSuggestion] = useState<Suggestion>()
  const { busy, error, notice, run } = useHiringAction()

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void run(async () => {
      const criteria = rubric.split('\n').map(line => line.trim()).filter(Boolean)
      if (criteria.length < 1 || criteria.length > 10 || criteria.some(line => line.length > 500)) {
        throw new Error('Enter 1–10 criteria, one per line, each up to 500 characters.')
      }
      const { title, instructions, effortMinutes, allowedTools } = fields
      await write(editing ? `${base}/${editing.id}` : base, editing ? 'PUT' : 'POST',
        { title, instructions, effortMinutes, allowedTools, rubric: criteria })
      setSuggestion(undefined)
      if (!editing) {
        setFields(emptyTemplate)
        setRubric('')
      }
      saved()
    }, 'Assessment draft saved.')
  }

  return <details className="criterion" open={editing ? true : undefined}>
    <summary>{editing ? `Edit draft · ${editing.title}` : 'Create assessment template'}</summary>
    {error && <p role="alert" className="alert error">{error}</p>}
    {notice && <p role="status" className="alert success">{notice}</p>}
    <form onSubmit={save}>
      <label>Assessment title<input required maxLength={160} value={fields.title}
        onChange={event => setFields(current => ({ ...current, title: event.target.value }))} /></label>
      <label>Instructions and questions<textarea aria-label="Instructions and questions" required maxLength={12000} value={fields.instructions}
        onChange={event => setFields(current => ({ ...current, instructions: event.target.value }))} /></label>
      <label>Estimated effort in minutes<input type="number" required min={5} max={480} value={fields.effortMinutes || ''}
        onChange={event => setFields(current => ({ ...current, effortMinutes: Number(event.target.value) }))} /></label>
      <label>Allowed tools<textarea aria-label="Allowed tools" placeholder="Explain whether candidates may use AI, documentation, or other tools."
        required maxLength={1000} value={fields.allowedTools}
        onChange={event => setFields(current => ({ ...current, allowedTools: event.target.value }))} /></label>
      <label>Scoring criteria, one per line<textarea aria-label="Scoring criteria, one per line" required value={rubric} maxLength={5010}
        onChange={event => setRubric(event.target.value)} /></label>
      <div className="action-row">
        <button type="submit" disabled={busy}>Save assessment draft</button>
        <button type="button" className="quiet" disabled={busy} onClick={() => void run(async () => {
          setSuggestion(await write<Suggestion>(`${base}/suggestions`, 'POST'))
        })}>Suggest questions and rubric with AI</button>
      </div>
      {suggestion && <div className="criterion">
        <h4>AI suggestion</h4>
        <p><strong>{suggestion.title}</strong></p><p className="preserve-lines">{suggestion.instructions}</p>
        <ul>{suggestion.rubric.map(item => <li key={item}>{item}</li>)}</ul>
        <button type="button" className="quiet" onClick={() => {
          setFields(current => ({ ...current, title: suggestion.title, instructions: suggestion.instructions }))
          setRubric(suggestion.rubric.join('\n'))
          setSuggestion(undefined)
        }}>Use as editable draft</button>
      </div>}
    </form>
  </details>
}

function StaffAssessment({ assessment, base, refresh }: { assessment: AssessmentAssignment; base: string; refresh: () => void }) {
  const [evidence, setEvidence] = useState<Evidence[]>()
  const { busy, error, notice, run } = useHiringAction()
  const now = useWorkflowClock()
  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    void run(async () => {
      await write(`${base}/${assessment.id}/review`, 'POST',
        { scores: form.getAll('score').map(Number), feedback: form.get('feedback'), outcome: form.get('outcome') })
      refresh()
    }, 'Assessment feedback sent.')
  }

  return <article className="criterion">
    <h3>{assessment.title}</h3>
    <p>{assessment.outcome === 'PASSED' ? 'Passed' : assessment.outcome === 'RETRY' ? 'Another attempt requested' :
      assessment.submittedAt ? 'Awaiting outcome' :
      Date.parse(assessment.dueAt) <= now ? 'Deadline passed' : 'Awaiting submission'} · Opens {localTime(assessment.availableFrom)} · Due {localTime(assessment.dueAt)}</p>
    {!assessment.submittedAt ? null : <>
      <p className="preserve-lines">{assessment.answer}</p>
      {assessment.documentId && <p><a href={`/api/v1${base}/${assessment.id}/attachment`}>{assessment.documentName ?? 'Download submission'}</a></p>}
      {error && <p role="alert" className="alert error">{error}</p>}
      {notice && <p role="status" className="alert success">{notice}</p>}
      {assessment.aiConsent && assessment.answer && !assessment.outcome && <button type="button" className="quiet" disabled={busy}
        onClick={() => void run(async () => { setEvidence(await write<Evidence[]>(`${base}/${assessment.id}/evidence`, 'POST')) })}>Find evidence with AI</button>}
      {evidence && <ul className="list">{evidence.map(item => <li key={item.criterion}>
        <div><strong>{item.criterion}</strong><p className="preserve-lines">{item.excerpt || 'Unclear from the written answer'}</p>
          {item.followUp && <p>Suggested follow-up · {item.followUp}</p>}</div>
      </li>)}</ul>}
      {assessment.outcome ? <Feedback assessment={assessment} /> : <form onSubmit={review}>
        <p>Score each criterion from 0 (no evidence) to 4 (strong evidence). Your feedback is shared with the candidate.</p>
        {assessment.rubric.map((criterion, index) => <label key={criterion}>{criterion}<select name="score" required
          defaultValue={assessment.scores[index] ?? ''}>
          <option value="" disabled>Choose a score</option>
          {[0, 1, 2, 3, 4].map(score => <option key={score}>{score}</option>)}
        </select></label>)}
        <label>Assessment outcome<select name="outcome" aria-label="Assessment outcome" required defaultValue="">
          <option value="" disabled>Choose an outcome</option>
          <option value="PASSED">Passed</option><option value="RETRY">Another attempt needed</option>
        </select></label>
        <label>Feedback for candidate<textarea required maxLength={4000} name="feedback" defaultValue={assessment.feedback ?? ''} /></label>
        <button type="submit" disabled={busy}>Send feedback</button>
      </form>}
    </>}
  </article>
}

export function StaffAssessments({ applicationId, jobId, organization, closed = false, canAssign = true, interviewHref }: {
  applicationId?: string; jobId: string; organization: Organization; closed?: boolean; canAssign?: boolean; interviewHref?: string
}) {
  const organizationPath = `/organizations/${organization.organizationId}`
  const templates = `${organizationPath}/jobs/${jobId}/assessment-templates`
  const base = applicationId ? `${organizationPath}/applications/${applicationId}/assessments` : ''
  const [revision, setRevision] = useState(0)
  const [page, setPage] = useState(0)
  const collection = useHiringData<AssessmentTemplate[]>(`${templates}?page=${page}`, revision)
  const assigned = useHiringData<AssessmentAssignment[]>(base, revision)
  const { busy, error, notice, run } = useHiringAction()
  const published = collection?.data?.filter(template => template.publishedAt) ?? []
  const attempts = currentAssessments(assigned?.data ?? [])
  const canProceed = attempts.length > 0 && attempts.every(item => item.outcome === 'PASSED')
  function refresh() { setRevision(value => value + 1) }

  return <section className="panel">
    <h2>Assessments</h2>
    {(error || collection?.error || assigned?.error) && <p role="alert" className="alert error">{error || collection?.error || assigned?.error}</p>}
    {notice && <p role="status" className="alert success">{notice}</p>}
    {applicationId && <><h3>Assigned to this candidate</h3>
    {!assigned ? <p role="status">Loading assessments…</p> : assigned.data?.length ?
      assigned.data.map(assessment => <StaffAssessment key={assessment.id} assessment={assessment} base={base} refresh={refresh} />) :
      !assigned.error && <p>No assessments assigned.</p>}
    {!closed && canProceed && interviewHref &&
      <a className="pv-button primary" href={interviewHref}>Proceed to interview</a>}
    {!closed && canAssign && <>
      <h3>Assign an assessment</h3>
      <p>The candidate is notified when you select Assign assessment. Leave the opening time blank to let them start immediately.</p>
      {published.length ? <form className="inline-form" onSubmit={event => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        void run(async () => {
          const starts = String(data.get('starts') ?? '')
          await write(base, 'POST', { templateId: data.get('templateId'), availableFrom: starts ? new Date(starts).toISOString() : null,
            dueAt: new Date(String(data.get('due'))).toISOString() })
          refresh()
        }, 'Assessment assigned. The candidate has been notified in the platform.')
      }}>
        <label>Published template<select aria-label="Published template" name="templateId" required>
          {published.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select></label>
        <label>Opening time in your timezone (optional)<input type="datetime-local" name="starts" /></label>
        <label>Deadline in your timezone<input type="datetime-local" name="due" required /></label>
        <button type="submit" disabled={busy}>Assign assessment</button>
      </form> : <p>Publish a job template to assign it to this candidate.</p>}
    </>}</>}
    {!closed && <>
      <h3>Templates for this job</h3>
      <TemplateEditor base={templates} saved={() => { setPage(0); refresh() }} />
      {!collection && <p role="status">Loading templates…</p>}
      <ul className="list">
        {collection?.data?.map(item => <li key={item.id}>
          <div><strong>{item.title}</strong> · {item.publishedAt ? 'Published' : 'Draft'}
            {item.publishedAt ? <details><summary>Preview template</summary>
              <p className="preserve-lines">{item.instructions}</p>
              <p>Allowed tools · {item.allowedTools}</p>
              <ul>{item.rubric.map(criterion => <li key={criterion}>{criterion}</li>)}</ul>
            </details> : <TemplateEditor base={templates} editing={item} saved={refresh} />}
          </div>
          {!item.publishedAt && <button type="button" className="quiet" disabled={busy} onClick={() => {
            if (confirm('Publish this assessment? Published instructions and scoring criteria are fixed.')) void run(async () => {
              await write(`${templates}/${item.id}/publish`, 'POST')
              refresh()
            }, 'Template published.')
          }}>Publish template</button>}
        </li>)}
      </ul>
      {(page > 0 || collection?.data?.length === 20) && <div className="pagination">
        <button type="button" className="quiet" disabled={!page || busy} onClick={() => setPage(value => value - 1)}>Previous templates</button>
        <button type="button" className="quiet" disabled={collection?.data?.length !== 20 || busy} onClick={() => setPage(value => value + 1)}>Next templates</button>
      </div>}
    </>}
  </section>
}
