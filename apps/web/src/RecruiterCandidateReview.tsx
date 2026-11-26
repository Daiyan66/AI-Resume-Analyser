import { useEffect, useState, type FormEvent } from 'react'
import { api, type ReviewDetail } from './api'
import { applicationStatuses } from './recruiterSearch'
import { StaffAssessments } from './HiringAssessments'
import { workspaceHref } from './workspaceNavigation'

type Evidence = { criterionId: string; excerpt: string | null }
const ratings: Record<string, string> = {
  MET: 'Met', PARTIAL: 'Partially met', NOT_MET: 'Not met', UNCLEAR: 'Unclear',
}

export function RecruiterCandidateReview({ path }: { path: string }) {
  const [detail, setDetail] = useState<ReviewDetail>()
  const [error, setError] = useState('')
  const [evidence, setEvidence] = useState<Evidence[]>()
  const [evidenceError, setEvidenceError] = useState(false)
  const [preview, setPreview] = useState(false)
  const [scheduling, setScheduling] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    void api<ReviewDetail>(path, { signal: controller.signal }).then(result => {
      if (controller.signal.aborted) return
      setDetail(result)
      if (!result.documentId || !result.job.criteria.length) return
      return api<Evidence[]>(path + '/evidence', { signal: controller.signal }).then(setEvidence)
        .catch(() => { if (!controller.signal.aborted) setEvidenceError(true) })
    }).catch((cause: Error) => { if (!controller.signal.aborted) setError(cause.message) })
    return () => controller.abort()
  }, [path])

  if (!detail) return error ? <p className="alert error" role="alert">{error}</p> : <p role="status">Loading application…</p>
  const closed = ['HIRED', 'NOT_SELECTED', 'WITHDRAWN'].includes(detail.status)
  const canAssess = ['SUBMITTED', 'IN_REVIEW'].includes(detail.status)
  const assessment = new URLSearchParams({ tab: 'assessments', application: detail.id, job: detail.job.id })

  async function reject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const reason = String(new FormData(event.currentTarget).get('reason') ?? '').trim()
    if (reason.length < 10) {
      setError('Enter at least 10 characters for the private rejection reason.')
      return
    }
    setBusy(true)
    setError('')
    try {
      setDetail(await api<ReviewDetail>(path + '/reject', { method: 'POST', body: JSON.stringify({ reason }) }))
      setRejecting(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not reject the application. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return <section className="panel recruiter-candidate-review" aria-label="Application review">
    <h2>{detail.profileSnapshot.displayName}</h2>
    <p>{detail.job.title} · {applicationStatuses[detail.status as keyof typeof applicationStatuses] ?? detail.status}</p>
    <p>{detail.profileSnapshot.email} · Applied {new Date(detail.submittedAt).toLocaleString()}</p>
    {Object.entries(detail.profileSnapshot.profile).filter(([, value]) => value).map(([field, value]) =>
      <p key={field} className="preserve-lines"><strong>{field[0].toUpperCase() + field.slice(1)}</strong> · {value}</p>)}
    {Object.keys(detail.answers).length > 0 && <>
      <h3>Application answers</h3>
      <ul>{Object.entries(detail.answers).map(([id, answer]) =>
        <li key={id}><strong>{answer.prompt}</strong> · {answer.answer || 'No answer'}</li>)}</ul>
    </>}
    {(['REQUIRED', 'PREFERRED'] as const).map(importance => <section key={importance}>
      <h3>{importance === 'REQUIRED' ? 'Required criteria' : 'Preferred criteria'}</h3>
      {!detail.job.criteria.some(criterion => criterion.importance === importance) && <p>No criteria specified.</p>}
      {detail.job.criteria.filter(criterion => criterion.importance === importance).map(criterion => {
        const review = detail.reviews.find(item => item.criterionId === criterion.id)
        const finding = evidence?.find(item => item.criterionId === criterion.id)
        return <div key={criterion.id} className="criterion">
          <strong>{criterion.description}</strong>
          <p>{review ? ratings[review.rating] ?? review.rating : 'Awaiting human review'}</p>
          {review?.note && <p className="preserve-lines">{review.note}</p>}
          {detail.documentId && (finding?.excerpt ? <blockquote className="preserve-lines">{finding.excerpt}</blockquote> :
            <small>{evidenceError ? 'Résumé evidence unavailable.' : evidence ? 'No matching résumé excerpt.' : 'Checking résumé evidence…'}</small>)}
        </div>
      })}
    </section>)}

    {preview && <ResumePreview path={path + '/resume-preview'} name={detail.documentName ?? 'Submitted résumé'} />}
    {error && <p className="alert error" role="alert">{error}</p>}
    <form onSubmit={reject}>
      {rejecting && <label>Private rejection reason
        <textarea name="reason" minLength={10} maxLength={4000} required autoFocus />
      </label>}
      <div className="action-row">
        <button type="button" className="quiet" disabled={!detail.documentId} aria-expanded={preview}
          onClick={() => setPreview(!preview)}>{preview ? 'Hide resume' : 'View resume'}</button>
        <button type="button" disabled={!canAssess || rejecting} aria-expanded={scheduling}
          aria-controls="application-assessment-schedule" onClick={() => setScheduling(!scheduling)}>Proceed to assessment</button>
        {rejecting ? <button type="submit" className="quiet" disabled={busy}>Confirm rejection</button> :
          <button type="button" className="quiet" disabled={closed || scheduling} onClick={() => setRejecting(true)}>Reject</button>}
        {rejecting && <button type="button" className="quiet" disabled={busy} onClick={() => { setRejecting(false); setError('') }}>Cancel</button>}
      </div>
    </form>
    {!detail.documentId && <p>No résumé was submitted.</p>}
    {scheduling && <div id="application-assessment-schedule" className="criterion">
      <StaffAssessments organizationId={detail.job.organizationId} applicationId={detail.id} jobId={detail.job.id} scheduleFirst />
      <a href={workspaceHref('staff-assessment-interview', 'RECRUITER') + '?' + assessment}>Open assessment workspace</a>
    </div>}
  </section>
}

export function ResumePreview({ path, name }: { path: string; name: string }) {
  const [text, setText] = useState<string>()
  const [error, setError] = useState('')
  const pdf = name.toLowerCase().endsWith('.pdf')

  useEffect(() => {
    if (pdf) return
    const controller = new AbortController()
    void fetch('/api/v1' + path, { signal: controller.signal, cache: 'no-store' }).then(async response => {
      if (!response.ok) throw new Error('Could not preview the submitted résumé.')
      setText(await response.text())
    }).catch((cause: Error) => { if (!controller.signal.aborted) setError(cause.message) })
    return () => controller.abort()
  }, [path, pdf])

  return <section aria-label="Résumé preview">
    <h3>{name}</h3>
    {pdf ? <iframe className="recruiter-resume-preview" title="Submitted résumé" src={'/api/v1' + path + '#toolbar=0'} /> :
      error ? <p role="alert">{error}</p> : <p className="preserve-lines">{text ?? 'Loading résumé…'}</p>}
  </section>
}
