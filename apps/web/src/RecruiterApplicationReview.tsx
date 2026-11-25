import { useEffect, useState, type FormEvent } from 'react'
import { useSuccessNotice } from './useSuccessNotice'
import { api, type ReviewDetail } from './api'
import { workspaceHref, type StaffRole } from './workspaceNavigation'
import { HiringToolsTrial } from './HiringToolsTrial'

type Evidence = { criterionId: string; criterion: string; excerpt: string | null; extractedLine: number | null }

export function RecruiterApplicationReview({ base, applicationId, organizationId, accountId, role }: {
  base: string; applicationId: string; organizationId: string; accountId: string; role: StaffRole
}) {
  const [detail, setDetail] = useState<ReviewDetail>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useSuccessNotice()
  const [evidence, setEvidence] = useState<Evidence[]>()

  useEffect(() => {
    const controller = new AbortController()
    void api<ReviewDetail>(`${base}/${applicationId}`, { signal: controller.signal }).then(setDetail)
      .catch((cause: Error) => { if (!controller.signal.aborted) setError(cause.message) })
    return () => controller.abort()
  }, [base, applicationId])

  async function refresh(id: string) {
    setDetail(await api<ReviewDetail>(`${base}/${id}`))
  }

  async function run(action: () => Promise<void>) {
    setBusy(true); setError(''); setNotice('')
    try { await action() }
    catch (cause) { setError(message(cause)) }
    finally { setBusy(false) }
  }

  if (!detail) return error ? <p className="alert error" role="alert">{error}</p> : <p role="status">Loading application…</p>

  function review(event: FormEvent<HTMLFormElement>, criterionId: string) {
    event.preventDefault()
    const form = event.currentTarget
    const fields = new FormData(form)
    void run(async () => {
      await api(`${base}/${applicationId}/reviews`, { method: 'POST', body: JSON.stringify({
        criterionId, rating: fields.get('rating'), note: fields.get('note'),
      }) })
      await refresh(applicationId); form.reset()
      setNotice('Human review recorded. Earlier assessments remain in the history.')
    })
  }

  function advance(status: string) {
    void run(async () => {
      await api(`${base}/${applicationId}/stage`, { method: 'POST', body: JSON.stringify({ status }) })
      await refresh(applicationId)
      setNotice('Stage updated. The candidate can see the new status in My applications.')
    })
  }

  function decide(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const fields = new FormData(form)
    const outcome = String(fields.get('outcome'))
    if (!window.confirm(`Record the final decision: ${outcome === 'HIRED' ? 'Hired' : 'Not selected'}?`)) return
    void run(async () => {
      await api(`${base}/${applicationId}/decisions`, { method: 'POST', body: JSON.stringify({
        outcome, reason: fields.get('reason'),
      }) })
      await refresh(applicationId); form.reset()
      setNotice('Human decision recorded. The reason stays in the recruiter workspace.')
    })
  }

  const nextStage = ({ SUBMITTED: 'IN_REVIEW', IN_REVIEW: 'INTERVIEW', INTERVIEW: 'OFFER' } as Record<string, string>)[detail.status]

  return <section className="panel" aria-label="Application review">
    {error && <p className="alert error" role="alert">{error}</p>}
    {notice && <p className="alert success" role="status">{notice}</p>}
      <h2>{detail.profileSnapshot.displayName} · {detail.status.replaceAll('_', ' ').toLowerCase()}</h2>
      <p><a className="pv-button" href={`${workspaceHref('staff-assessment-interview', role)}?tab=assessments&application=${detail.id}&job=${detail.job.id}`}>
        Assessment &amp; Interview
      </a></p>
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
      {detail.documentId && detail.job.criteria.length > 0 && <div className="criterion">
        <h3>Résumé evidence</h3>
        <p>Find excerpts from the submitted document to check against the job criteria.</p>
        <button type="button" className="quiet" disabled={busy}
          onClick={() => void run(async () => setEvidence(await api<Evidence[]>(`${base}/${detail.id}/evidence`)))}>
          Find evidence in résumé
        </button>
        {evidence && <ul>{evidence.map(item => <li key={item.criterionId}>
          <strong>{item.criterion}</strong>
          {item.excerpt ? <blockquote className="preserve-lines">
            {item.excerpt}{item.extractedLine != null && <small> (extracted line {item.extractedLine})</small>}
          </blockquote> : <p>No matching excerpt found. Review the document manually.</p>}
        </li>)}</ul>}
      </div>}
      <HiringToolsTrial detail={detail} organizationId={organizationId} accountId={accountId} />
      <h3>Criteria and assessments</h3>
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
  </section>
}

function message(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Something went wrong. Please try again.'
}
