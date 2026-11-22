import { useState } from 'react'
import type { ReviewDetail } from './api'
import { firstName } from './workspaceNavigation'

function preferenceKey(organizationId: string, accountId: string) {
  return `hiring-tools-trial:${organizationId}:${accountId}`
}

export function HiringToolsSetting({ organizationId, accountId }: { organizationId: string; accountId: string }) {
  const key = preferenceKey(organizationId, accountId)
  const [enabled, setEnabled] = useState(() => localStorage.getItem(key) !== 'off')
  return <label className="hiring-trial-setting">
    <input type="checkbox" checked={enabled} onChange={event => {
      const next = event.target.checked
      localStorage.setItem(key, next ? 'on' : 'off')
      setEnabled(next)
    }} />
    <span>Trial hiring tools <small>Show interview kits and follow-up drafts in application reviews on this browser.</small></span>
  </label>
}

type DraftType = 'acknowledge' | 'interview' | 'follow-up'

function draftFor(kind: DraftType, detail: ReviewDetail) {
  const hello = `Hi ${firstName(detail.profileSnapshot.displayName)},\n\n`
  const role = `the ${detail.job.title} role at ${detail.job.organizationName}`
  const signoff = `\n\nThanks,\n${detail.job.organizationName} hiring team`
  if (kind === 'interview') return hello + `We’d like to discuss your application for ${role}. Please share a few times that work for you and your time zone.` + signoff
  if (kind === 'follow-up') return hello + `Thank you for speaking with us about ${role}. We appreciate your time and will be in touch when we have an update.` + signoff
  return hello + `Thank you for applying for ${role}. Our team has received your application and will be in touch with any next steps.` + signoff
}

export function HiringToolsTrial({ detail, organizationId, accountId }: {
  detail: ReviewDetail; organizationId: string; accountId: string
}) {
  if (localStorage.getItem(preferenceKey(organizationId, accountId)) === 'off') return null
  return <TrialContent detail={detail} />
}

function TrialContent({ detail }: { detail: ReviewDetail }) {
  const [kind, setKind] = useState<DraftType>('acknowledge')
  const [text, setText] = useState(() => draftFor(kind, detail))
  const [notice, setNotice] = useState('')
  const [dirty, setDirty] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setNotice('Draft copied.')
    } catch {
      setNotice('Select and copy the draft text manually.')
    }
  }

  return <details className="criterion hiring-trial">
    <summary>Trial hiring tools</summary>
    <h3>Interview kit</h3>
    {detail.job.criteria.length ? <ol>{detail.job.criteria.map(criterion => <li key={criterion.id}>
      <p><strong>{criterion.description}</strong> · {criterion.importance === 'REQUIRED' ? 'Required' : 'Preferred'}</p>
      <p>Walk me through a specific example that demonstrates “{criterion.description}”. What did you do personally, and what was the result?</p>
      {criterion.guidance && <p className="preserve-lines">{criterion.guidance}</p>}
    </li>)}</ol> : <p>Add specific job criteria to generate an interview kit.</p>}
    {detail.job.criteria.length > 0 && <dl className="hiring-rubric">
      <div><dt>Met</dt><dd>Specific evidence covers the criterion.</dd></div>
      <div><dt>Partially met</dt><dd>Evidence covers part of the criterion.</dd></div>
      <div><dt>Not met</dt><dd>The evidence shows a gap against the criterion.</dd></div>
      <div><dt>Unclear</dt><dd>Ask a follow-up question or request more evidence.</dd></div>
    </dl>}
    <h3>Follow-up draft</h3>
    <p>Edit and review the draft before sending it through your usual channel.</p>
    <label>Template<select aria-label="Draft template" value={kind} onChange={event => {
      const next = event.target.value as DraftType
      if (dirty && !confirm('Replace your edits with the selected template?')) return
      setKind(next)
      setText(draftFor(next, detail))
      setDirty(false)
      setNotice('')
    }}>
      <option value="acknowledge">Application acknowledgement</option>
      <option value="interview">Interview availability</option>
      <option value="follow-up">Post-interview follow-up</option>
    </select></label>
    <label className="hiring-draft"><span>Editable draft</span><textarea aria-label="Editable draft" rows={7} value={text}
      onChange={event => { setText(event.target.value); setDirty(true); setNotice('') }} /></label>
    <button className="quiet" disabled={!text.trim()} onClick={() => void copy()}>Copy draft</button>
    {notice && <p role="status">{notice}</p>}
  </details>
}
