import { useState, type FormEvent } from 'react'
import { workspaceHref } from './workspaceNavigation'
import { localTime, useHiringAction, useHiringData, useWorkflowClock, write, type Interview, type InterviewOffer } from './hiringWorkflow'
import type { Organization } from './api'

function meetingHref(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : undefined
  } catch { return undefined }
}

function calendarFile(interview: Interview, job: string) {
  const stamp = (time: Date) => time.toISOString().slice(0, 19).replaceAll(/[-:]/g, '') + 'Z'
  const escape = (text: string) => text.replaceAll('\\', '\\\\').replaceAll(/\r?\n|\r/g, '\\n').replaceAll(/[,;]/g, '\\$&')
  const fields = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//AI Resume Analyser//Interview//EN', 'BEGIN:VEVENT',
    `UID:${interview.id}@airesume`, `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(new Date(interview.startsAt))}`,
    `DTEND:${stamp(new Date(Date.parse(interview.startsAt) + interview.minutes * 60000))}`,
    `SUMMARY:${escape(`Interview for ${job}`)}`, `LOCATION:${escape(interview.location)}`,
    `DESCRIPTION:${escape(interview.message)}`, 'END:VEVENT', 'END:VCALENDAR', '']
  const url = URL.createObjectURL(new Blob([fields.join('\r\n')], { type: 'text/calendar;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'interview.ics'
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function HiringInterviews({ applicationId, jobId, jobTitle, stage, organization }: {
  applicationId: string; jobId: string; jobTitle: string; stage: string; organization?: Organization
}) {
  const base = organization ? `/organizations/${organization.organizationId}/jobs/${jobId}/applications/${applicationId}/interviews`
    : `/candidate/applications/${applicationId}/interviews`
  const [revision, setRevision] = useState(0)
  const [slots, setSlots] = useState(['', '', ''])
  const [chosen, setChosen] = useState('')
  const interviews = useHiringData<Interview[]>(base, revision)
  const offered = useHiringData<InterviewOffer>(`${base}/offer`, revision)
  const { busy, error, notice, run } = useHiringAction()
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const active = interviews?.data?.find(item => !item.cancelledAt && !item.completedAt)
  const offer = offered?.data
  const now = useWorkflowClock()
  const interviewStage = ['IN_REVIEW', 'INTERVIEW'].includes(stage)

  const canOffer = !active || (!!active.rescheduleRequestedAt && Date.parse(active.startsAt) > now)

  function refresh() { setRevision(value => value + 1) }

  function propose(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    void run(async () => {
      const times = slots.filter(Boolean).map(value => new Date(value).toISOString())
      if (!times.length) throw new Error('Enter at least one interview time.')
      await write(`${base}/offer`, 'PUT', { times, timezone: zone, minutes: Number(form.get('minutes')),
        location: form.get('location'), message: form.get('message') })
      refresh()
    }, 'Interview times sent to the candidate.')
  }

  function book(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!chosen) return
    void run(async () => {
      try {
        await write(`${base}/book/${chosen}`, 'POST')
        setChosen('')
      } finally { refresh() }
    }, 'Interview booked.')
  }

  return <section className="panel" aria-labelledby="interviews-heading">
    <h2 id="interviews-heading">Interviews</h2>
    {(error || interviews?.error || offered?.error) && <p className="alert error" role="alert">{error || interviews?.error || offered?.error}</p>}
    {notice && <p className="alert success" role="status">{notice}</p>}
    {!interviews && <p role="status">Loading interviews…</p>}
    {active && <article className="criterion">
      <h3>Confirmed interview</h3>
      <p><time dateTime={active.startsAt}>{localTime(active.startsAt)}</time> ({zone}) · {active.minutes} minutes</p>
      <p className="preserve-lines">{active.location}</p>
      {active.message && <p className="preserve-lines">{active.message}</p>}
      {active.rescheduleRequestedAt && <p>Reschedule requested. The original time stays booked until it is changed.</p>}
      <div className="action-row">
        {meetingHref(active.location) && <a className="pv-button primary" href={meetingHref(active.location)} target="_blank" rel="noreferrer">Join interview</a>}
        <button type="button" className="quiet" onClick={() => calendarFile(active, jobTitle)}>Download calendar event</button>
        {!organization && interviewStage && !active.rescheduleRequestedAt && Date.parse(active.startsAt) > now &&
          <button type="button" className="quiet" disabled={busy} onClick={() => void run(async () => {
            await write(`${base}/${active.id}/reschedule`, 'POST')
            refresh()
          }, 'Reschedule requested.')}>Request reschedule</button>}
        {organization && <>
          <button type="button" className="quiet" disabled={busy} onClick={() => {
            if (confirm('Cancel this interview? The candidate will be notified.')) void run(async () => {
              await write(`${base}/${active.id}`, 'DELETE')
              refresh()
            }, 'Interview cancelled. You can offer new times.')
          }}>Cancel interview</button>
          {Date.parse(active.startsAt) <= now && <button type="button" disabled={busy} onClick={() => void run(async () => {
            await write(`${base}/${active.id}/complete`, 'POST')
            refresh()
          }, 'Interview marked complete.')}>Mark complete</button>}
        </>}
      </div>
    </article>}
    {offer && canOffer && interviewStage && <article className="criterion">
      <h3>{organization ? 'Waiting for the candidate to book' : active ? 'Choose a replacement interview time' : 'Choose an interview time'}</h3>
      <p>Times shown in {zone} · {offer.minutes} minutes</p>
      {organization ? <ul>{offer.slots.map(slot => <li key={slot.id}>{localTime(slot.startsAt)}</li>)}</ul> :
        !offer.slots.length ? <p>These slots are unavailable. Check back after the recruiter offers new times.</p> :
          <form onSubmit={book}>
            <fieldset>
              <legend>Available times</legend>
              {offer.slots.map(slot => <label className="workflow-choice" key={slot.id}>
                <input type="radio" name="slot" value={slot.id} checked={chosen === slot.id} onChange={() => setChosen(slot.id)} />
                <time dateTime={slot.startsAt}>{localTime(slot.startsAt)}</time>
              </label>)}
            </fieldset>
            <button type="submit" disabled={busy || !offer.slots.some(slot => slot.id === chosen)}>{active ? 'Confirm new time' : 'Book interview'}</button>
          </form>}
    </article>}
    {!organization && interviews?.data && offered && !offer && !active && <p>No interview is scheduled for this application.</p>}
    {organization && interviews?.data && offered && canOffer && interviewStage && <form key={offer?.id ?? 'new-offer'} onSubmit={propose}>
      <h3>{offer ? 'Replace offered times' : 'Offer interview times'}</h3>
      <p>Enter options in {zone}. The candidate will pick one.</p>
      <div className="field-grid">
        {slots.map((value, index) => <label key={index}>Option {index + 1}<input type="datetime-local" value={value}
          onChange={event => setSlots(current => current.map((item, i) => i === index ? event.target.value : item))} /></label>)}
        <label>Duration in minutes<input type="number" name="minutes" required min={15} max={120} defaultValue={offer?.minutes ?? 30} /></label>
      </div>
      <label>Meeting link or address<input name="location" maxLength={500} required defaultValue={offer?.location} /></label>
      <label>Preparation instructions<textarea name="message" maxLength={2000} defaultValue={offer?.message} /></label>
      <button type="submit" disabled={busy || !slots.some(Boolean)}>{offer ? 'Replace offered times' : 'Send interview times'}</button>
    </form>}
    {organization && !interviewStage && !active && <p>Move the application to In review or Interview to offer time slots.</p>}
    {!!interviews?.data?.some(item => item.cancelledAt || item.completedAt) && <ul className="list">
      {interviews.data.filter(item => item.cancelledAt || item.completedAt).map(item => <li key={item.id}>
        <span>{localTime(item.startsAt)} · {item.completedAt ? 'Completed' : 'Cancelled'}</span>
      </li>)}
    </ul>}
    {organization && <a href={`${workspaceHref('recruiter-applications', organization.role)}?reviewJob=${jobId}&application=${applicationId}`}>Open application feedback</a>}
  </section>
}
