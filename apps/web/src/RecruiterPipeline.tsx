import { useEffect, useState, type FormEvent } from 'react'
import { api, type Job, type Organization, type Page, type PipelineItem, type ReviewDetail } from './api'

type Props = { organization: Organization; job: Job }

export function RecruiterPipeline({ organization, job }: Props) {
  const base = `/organizations/${organization.organizationId}/jobs/${job.id}/applications`
  const [page, setPage] = useState(0)
  const [pipeline, setPipeline] = useState<Page<PipelineItem>>({ items: [], page: 0, size: 12, total: 0 })
  const [detail, setDetail] = useState<ReviewDetail | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    void api<Page<PipelineItem>>(`${base}?page=${page}&size=12`).then(setPipeline)
      .catch((cause: unknown) => setError(message(cause)))
  }, [base, page])

  async function refresh(applicationId: string) {
    const [nextDetail, nextPipeline] = await Promise.all([
      api<ReviewDetail>(`${base}/${applicationId}`), api<Page<PipelineItem>>(`${base}?page=${page}&size=12`),
    ])
    setDetail(nextDetail); setPipeline(nextPipeline)
  }

  async function run(action: () => Promise<void>) {
    setBusy(true); setError(''); setNotice('')
    try { await action() }
    catch (cause) { setError(message(cause)) }
    finally { setBusy(false) }
  }

  function open(applicationId: string) {
    void run(async () => { setDetail(await api<ReviewDetail>(`${base}/${applicationId}`)) })
  }

  function review(event: FormEvent<HTMLFormElement>, criterionId: string) {
    event.preventDefault()
    if (!detail) return
    const form = event.currentTarget
    const fields = new FormData(form)
    const applicationId = detail.id
    void run(async () => {
      await api(`${base}/${applicationId}/reviews`, { method: 'POST', body: JSON.stringify({
        criterionId, rating: fields.get('rating'), note: fields.get('note'),
      }) })
      await refresh(applicationId); form.reset()
      setNotice('Human review recorded. Earlier assessments remain in the history.')
    })
  }

  function advance(status: string) {
    if (!detail) return
    const applicationId = detail.id
    void run(async () => {
      await api(`${base}/${applicationId}/stage`, { method: 'POST', body: JSON.stringify({ status }) })
      await refresh(applicationId)
      setNotice('Stage updated. The candidate can see the new status in My applications.')
    })
  }

  function decide(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!detail) return
    const form = event.currentTarget
    const fields = new FormData(form)
    const outcome = String(fields.get('outcome'))
    if (!window.confirm(`Record the final decision: ${outcome === 'HIRED' ? 'Hired' : 'Not selected'}?`)) return
    const applicationId = detail.id
    void run(async () => {
      await api(`${base}/${applicationId}/decisions`, { method: 'POST', body: JSON.stringify({
        outcome, reason: fields.get('reason'),
      }) })
      await refresh(applicationId); form.reset()
      setNotice('Human decision recorded. The reason stays in the recruiter workspace.')
    })
  }

  const nextStage = ({ SUBMITTED: 'IN_REVIEW', IN_REVIEW: 'INTERVIEW', INTERVIEW: 'OFFER' } as Record<string, string>)[detail?.status || '']

  return <div className="job-detail">
    <h3>Applicants for {job.title}</h3>
    {error && <p className="alert error" role="alert">{error}</p>}
    {notice && <p className="alert success" role="status">{notice}</p>}
    {pipeline.items.length === 0 ? <p>No applications for this job yet.</p> : <ul className="list">
      {pipeline.items.map((item) => <li key={item.id}>
        <span><strong>{item.candidateName}</strong> · {item.status.replaceAll('_', ' ').toLowerCase()} · reviews {item.reviewedCriteria}/{item.totalCriteria}</span>
        <button type="button" className="quiet" onClick={() => open(item.id)} disabled={busy}>Review</button>
      </li>)}
    </ul>}
    {pipeline.total > 12 && <div className="pagination">
      <button type="button" className="quiet" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
      <span>Page {page + 1} · {pipeline.total} applicants</span>
      <button type="button" className="quiet" disabled={(page + 1) * 12 >= pipeline.total} onClick={() => setPage(page + 1)}>Next</button>
    </div>}

    {detail && <div className="review-detail">
      <h4>{detail.profileSnapshot.displayName} · {detail.status.replaceAll('_', ' ').toLowerCase()}</h4>
      <p>{detail.profileSnapshot.email} · submitted {new Date(detail.submittedAt).toLocaleString()}</p>
      {Object.entries(detail.profileSnapshot.profile).map(([field, value]) => <p key={field} className="preserve-lines">
        <strong>{field[0].toUpperCase() + field.slice(1)}:</strong> {value || '—'}</p>)}
      {detail.documentId && <p><a href={`/api/v1${base}/${detail.id}/document`}>Download submitted document: {detail.documentName}</a></p>}
      <h4>Application answers</h4>
      {Object.values(detail.answers).length === 0 ? <p>No questions.</p> : <ul>
        {Object.entries(detail.answers).map(([id, answer]) => <li key={id}><strong>{answer.prompt}:</strong> {answer.answer || 'No answer'}</li>)}
      </ul>}
      <h4>Status history</h4>
      <ol>{detail.events.map((event, index) => <li key={`${event.createdAt}-${index}`}>
        {event.message} · {new Date(event.createdAt).toLocaleString()}</li>)}</ol>
      <h4>Criteria and assessments</h4>
      {detail.job.criteria.map((criterion) => <div className="criterion" key={criterion.id}>
        <p><strong>{criterion.description}</strong> · {criterion.importance.toLowerCase()}</p>
        {criterion.guidance && <p>Review guidance: {criterion.guidance}</p>}
        <ul>{detail.reviews.filter((review) => review.criterionId === criterion.id).map((review) =>
          <li key={review.id}>{review.rating.replaceAll('_', ' ').toLowerCase()} · {review.reviewerName}: {review.note}</li>)}</ul>
        {!['HIRED', 'NOT_SELECTED', 'WITHDRAWN'].includes(detail.status) && <form onSubmit={(event) => review(event, criterion.id)}>
          <label>Assessment<select name="rating"><option value="MET">Met</option><option value="PARTIAL">Partially met</option>
            <option value="NOT_MET">Not met</option><option value="UNCLEAR">Unclear</option></select></label>
          <label>Evidence and note<textarea name="note" minLength={5} maxLength={2000} required /></label>
          <button type="submit" className="quiet" disabled={busy}>Record assessment</button>
        </form>}
      </div>)}
      {nextStage && <button type="button" disabled={busy} onClick={() => advance(nextStage)}>
        Move to {nextStage.replaceAll('_', ' ').toLowerCase()}</button>}
      {['IN_REVIEW', 'INTERVIEW', 'OFFER'].includes(detail.status) && <form onSubmit={decide}>
        <h4>Final decision</h4>
        <p>Record an assessment for every criterion first. The candidate sees the outcome, while this reason stays private.</p>
        <label>Outcome<select name="outcome"><option value="NOT_SELECTED">Not selected</option>
          {detail.status === 'OFFER' && <option value="HIRED">Hired</option>}</select></label>
        <label>Reason<textarea name="reason" minLength={10} maxLength={4000} required /></label>
        <button type="submit" disabled={busy}>Record decision</button>
      </form>}
      {detail.decisions.map((decision) => <p key={decision.id} className="preserve-lines">
        <strong>{decision.outcome.replaceAll('_', ' ')} by {decision.actorName}:</strong> {decision.reason}</p>)}
    </div>}
  </div>
}

function message(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Something went wrong. Please try again.'
}
