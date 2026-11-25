import { useEffect, useState, type FormEvent } from 'react'
import { useSuccessNotice } from './useSuccessNotice'
import { api, type Account, type CandidateApplication, type CandidateNotification, type CandidateProfile, type DataRequest,
  type Document, type Job, type Page } from './api'
import { CandidateJobList } from './CandidateJobList'
import { ResumeProfileEditor } from './ResumeProfileEditor'
import { workTypes, workspaceHref, type CandidateSection } from './workspaceNavigation'

const emptyProfile: CandidateProfile = { headline: '', location: '', phone: '', summary: '', skills: '',
  experience: '', education: '' }

const statusLabels = { SUBMITTED: 'Application received', IN_REVIEW: 'In review', INTERVIEW: 'Interview',
  OFFER: 'Offer', HIRED: 'Hired', NOT_SELECTED: 'Not selected', WITHDRAWN: 'Withdrawn' } as const
const pageSize = 12

type Props = {
  account: Account | null
  documents: Document[]
  section: CandidateSection
  jobId: string | null
  onSignIn: () => void
  onNotificationRead: () => void
  onDocumentAdded: (document: Document) => void
}

function usePage<T>(path: string | null, revision: number) {
  const [result, setResult] = useState<{ path: string; revision: number; data?: Page<T>; error?: string }>()
  useEffect(() => {
    if (!path) return
    let active = true
    void api<Page<T>>(path).then(data => {
      if (active) setResult({ path, revision, data })
    }).catch(cause => {
      if (active) setResult({ path, revision, error: message(cause) })
    })
    return () => { active = false }
  }, [path, revision])
  return result?.path === path && result.revision === revision ? result : undefined
}

export function CandidateWorkspace({ account, documents, section, jobId, onSignIn, onDocumentAdded, onNotificationRead }: Props) {
  const [jobPage, setJobPage] = useState(0)
  const [jobFilters, setJobFilters] = useState({ q: '', workType: '' })
  const [jobFilterDraft, setJobFilterDraft] = useState(jobFilters)
  const [jobDetail, setJobDetail] = useState<{ id: string; job?: Job; error?: string }>()
  const [profile, setProfile] = useState<CandidateProfile | null>(null)
  const [applicationPage, setApplicationPage] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [applicationRevision, setApplicationRevision] = useState(0)
  const [selectedApplication, setSelectedApplication] = useState<CandidateApplication | null>(null)
  const [requests, setRequests] = useState<DataRequest[]>([])
  const [notifications, setNotifications] = useState<Page<CandidateNotification>>({ items: [], page: 0, size: 12, total: 0 })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useSuccessNotice()

  const jobParams = new URLSearchParams({ page: String(jobPage), size: String(pageSize), q: jobFilters.q })
  if (jobFilters.workType) jobParams.set('workType', jobFilters.workType)
  const jobResult = usePage<Job>(section === 'candidate' ? `/public/jobs?${jobParams}` : null, 0)
  const jobs = jobResult?.data
  const selectedJob = jobId && jobDetail?.id === jobId ? jobDetail.job : undefined

  const applicationParams = new URLSearchParams({ page: String(section === 'applications' ? applicationPage : 0), size: String(pageSize) })
  if (section === 'applications' && statusFilter) applicationParams.set('status', statusFilter)
  const applicationResult = usePage<CandidateApplication>(
    account && (section === 'applications' || section === 'candidate') ? `/candidate/applications?${applicationParams}` : null,
    applicationRevision,
  )
  const applications = applicationResult?.data

  useEffect(() => {
    if (section !== 'candidate' || !jobId) return
    let active = true
    void api<Job>(`/public/jobs/${encodeURIComponent(jobId)}`).then(job => {
      if (active) setJobDetail({ id: jobId, job })
    }).catch(() => {
      if (active) setJobDetail({ id: jobId, error: 'This job is unavailable. Choose another opening from the list.' })
    })
    return () => { active = false }
  }, [section, jobId])

  useEffect(() => {
    if (!account) return
    let active = true
    void api<CandidateProfile>('/candidate/profile').then(nextProfile => {
      if (active) setProfile(nextProfile)
    }).catch(cause => { if (active) setError(message(cause)) })
    void Promise.all([api<DataRequest[]>('/candidate/deletion-requests'),
      api<Page<CandidateNotification>>('/candidate/notifications?page=0&size=12')])
      .then(([nextRequests, nextNotifications]) => {
        if (active) { setRequests(nextRequests); setNotifications(nextNotifications) }
      }).catch(cause => { if (active) setError(message(cause)) })
    return () => { active = false }
  }, [account])

  async function run(action: () => Promise<void>) {
    setBusy(true); setError(''); setNotice('')
    try { await action() }
    catch (cause) { setError(message(cause)) }
    finally { setBusy(false) }
  }

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profile) return
    void run(async () => {
      setProfile(await api<CandidateProfile>('/candidate/profile', { method: 'PUT', body: JSON.stringify(profile) }))
      setNotice('Profile saved. New applications will use this version.')
    })
  }

  function submitApplication(answers: Record<string, string>, documentId: string) {
    if (!selectedJob) return
    void run(async () => {
      const application = await api<CandidateApplication>('/candidate/applications', { method: 'POST',
        body: JSON.stringify({ jobId: selectedJob.id, documentId: documentId || null, answers }) })
      setSelectedApplication(application)
      setApplicationPage(0)
      setStatusFilter('')
      setApplicationRevision(revision => revision + 1)
      setNotice(`Application submitted to ${selectedJob.organizationName}. Your status is Application received.`)
      window.location.hash = 'applications'
    })
  }

  function withdraw(application: CandidateApplication) {
    if (!window.confirm(`Withdraw your application for ${application.jobTitle}?`)) return
    void run(async () => {
      const updated = await api<CandidateApplication>(`/candidate/applications/${application.id}/withdraw`, { method: 'POST' })
      setSelectedApplication(updated)
      if (statusFilter && statusFilter !== updated.status) {
        setSelectedApplication(null)
        if (applications?.items.length === 1) setApplicationPage(page => Math.max(0, page - 1))
      }
      setApplicationRevision(revision => revision + 1)
      setNotice('Application withdrawn. Your status history was kept.')
    })
  }

  function requestDeletion() {
    if (!window.confirm('Request deletion of your candidate data? A team member must review retention requirements first.')) return
    void run(async () => {
      await api<DataRequest>('/candidate/deletion-requests', { method: 'POST' })
      setRequests(await api<DataRequest[]>('/candidate/deletion-requests'))
      setNotice('Deletion request recorded. Your account and applications remain available during review.')
    })
  }

  function refreshApplications() {
    void run(async () => {
      setApplicationRevision(revision => revision + 1)
      setNotifications(await api<Page<CandidateNotification>>('/candidate/notifications?page=0&size=12'))
      if (selectedApplication) {
        setSelectedApplication(await api<CandidateApplication>(`/candidate/applications/${selectedApplication.id}`))
      }
      setNotice('Application statuses are up to date.')
    })
  }

  function markNotificationRead(id: string) {
    void run(async () => {
      await api(`/candidate/notifications/${id}/read`, { method: 'POST' })
      onNotificationRead()
      setNotifications(await api<Page<CandidateNotification>>('/candidate/notifications?page=0&size=12'))
    })
  }

  const activeApplication = applications?.items.find(application =>
    application.jobId === selectedJob?.id && !['HIRED', 'NOT_SELECTED', 'WITHDRAWN'].includes(application.status))

  return <div className="candidate-area">
    {error && <p className="alert error" role="alert">{error}</p>}
    {notice && <p className="alert success" role="status">{notice}</p>}
    {account && section === 'updates' && <section className="panel" aria-labelledby="notifications-heading">
      <h2 id="notifications-heading">Updates</h2>
      <p>Hiring status updates appear here.</p>
      <button type="button" className="quiet" disabled={busy} onClick={refreshApplications}>Check for updates</button>
      {notifications.items.length === 0 ? <p>No updates yet.</p> : <ul className="list">
        {notifications.items.map((item) => <li key={item.id}>
          <span>{item.read ? '' : '● '}{item.message} · {new Date(item.createdAt).toLocaleString()}</span>
          {!item.read && <button type="button" className="quiet" onClick={() => markNotificationRead(item.id)}>Mark read</button>}
        </li>)}
      </ul>}
    </section>}
    {section === 'candidate' && <section className="candidate-job-board" aria-labelledby="jobs-heading">
      <div className="panel">
        <h2 id="jobs-heading">Published openings</h2>
        <form className="inline-form candidate-filters" onSubmit={event => {
          event.preventDefault()
          setJobPage(0)
          setJobFilters({ ...jobFilterDraft, q: jobFilterDraft.q.trim() })
        }} onReset={event => {
          event.preventDefault()
          setJobPage(0)
          setJobFilterDraft({ q: '', workType: '' })
          setJobFilters({ q: '', workType: '' })
        }}>
          <label>Search jobs<input name="q" type="search" placeholder="Title, company, keyword or location"
            value={jobFilterDraft.q} maxLength={160}
            onChange={event => setJobFilterDraft({ ...jobFilterDraft, q: event.target.value })} /></label>
          <label>Work arrangement<select name="workType" value={jobFilterDraft.workType}
            onChange={event => setJobFilterDraft({ ...jobFilterDraft, workType: event.target.value })}>
            <option value="">All arrangements</option>
            {Object.entries(workTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
          <button type="submit">Filter jobs</button><button type="reset" className="quiet">Clear filters</button>
        </form>
      </div>
      {jobId && <div className="panel">
        <a href="#candidate">Close job details</a>
        {!selectedJob ? jobDetail?.id === jobId && jobDetail.error
          ? <p role="alert">{jobDetail.error}</p> : <p role="status">Loading job details…</p> : <>
          <h3>{selectedJob.title}</h3>
          <p>{selectedJob.organizationName} · {selectedJob.location} · {workTypes[selectedJob.workType]}</p>
          {selectedJob.salaryMin !== null && <p>Compensation: {selectedJob.currency} {selectedJob.salaryMin.toLocaleString()}–{selectedJob.salaryMax?.toLocaleString()}</p>}
          <h4>About the role</h4><p className="preserve-lines">{selectedJob.description}</p>
          <h4>Requirements</h4><p className="preserve-lines">{selectedJob.requirements}</p>
          {!account ? <button type="button" onClick={onSignIn}>Sign in to apply</button> : activeApplication ?
            <p>You already applied to this job. See <a href="#applications">My applications</a>.</p> :
            <JobApplicationForm key={selectedJob.id} job={selectedJob} documents={documents} busy={busy} onSubmit={submitApplication} />}
        </>}
      </div>}
      {jobResult?.error ? <p role="alert">{jobResult.error}</p> : !jobs ? <p role="status">Loading jobs…</p> :
        jobs.items.length ? <CandidateJobList jobs={jobs.items} selectedId={jobId} /> :
        <p>{jobFilters.q || jobFilters.workType ? 'No jobs match these filters.' : 'No jobs have been published yet.'}</p>}
      {jobs && jobs.total > 0 && <div className="pagination">
        <button type="button" className="quiet" disabled={jobPage === 0} onClick={() => setJobPage(jobPage - 1)}>Previous</button>
        <span role="status">Page {jobPage + 1} · {jobs.total} {jobs.total === 1 ? 'job' : 'jobs'}</span>
        <button type="button" className="quiet" disabled={(jobPage + 1) * jobs.size >= jobs.total}
          onClick={() => setJobPage(jobPage + 1)}>Next</button>
      </div>}
    </section>}

    {account && <>
      {section === 'profile' && <ResumeProfileEditor documents={documents} onDocumentAdded={onDocumentAdded}
        profileReady={!!profile && !busy}
        onAutofill={fields => setProfile(current => ({ ...(current ?? emptyProfile), ...fields }))} />}
      {section === 'profile' && <section className="panel" aria-labelledby="profile-heading">
        <h2 id="profile-heading">Candidate profile</h2>
        <p>Keep reusable information here. Add a headline and summary before applying. Each application keeps a snapshot of the profile you submitted.</p>
        {profile ? <form onSubmit={saveProfile}>
          <div className="field-grid">
            <label>Headline<input value={profile.headline} maxLength={160} onChange={(event) => setProfile({ ...profile, headline: event.target.value })} /></label>
            <label>Location<input value={profile.location} maxLength={160} onChange={(event) => setProfile({ ...profile, location: event.target.value })} /></label>
            <label>Phone<input value={profile.phone} maxLength={40} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} /></label>
          </div>
          {(['summary', 'skills', 'experience', 'education'] as const).map((field) => <label key={field}>
            <span id={`profile-${field}-label`}>{field[0].toUpperCase() + field.slice(1)}</span>
            <textarea aria-labelledby={`profile-${field}-label`} value={profile[field]}
              maxLength={field === 'experience' ? 8000 : 4000}
              onChange={(event) => setProfile({ ...profile, [field]: event.target.value })} /></label>)}
          <button type="submit" disabled={busy}>Save profile</button>
        </form> : !error && <p role="status">Loading profile…</p>}
      </section>}

      {section === 'applications' && <section className="panel" aria-labelledby="applications-heading">
        <div className="section-heading"><h2 id="applications-heading">My applications</h2>
          <button type="button" className="quiet" disabled={busy} onClick={refreshApplications}>Check for updates</button></div>
        <label className="candidate-status-filter">Application status<select value={statusFilter} onChange={event => {
          setStatusFilter(event.target.value)
          setApplicationPage(0)
          setSelectedApplication(null)
        }}>
          <option value="">All statuses</option>
          {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
        {applicationResult?.error ? <p role="alert">{applicationResult.error}</p> :
          !applications ? <p role="status">Loading applications…</p> :
          applications.items.length === 0 ? <p>{statusFilter ? 'No applications with this status.' : 'No applications yet.'}</p> :
          <ul className="list">
          {applications.items.map((application) => <li key={application.id}>
            <span><strong>{application.jobTitle}</strong> · {application.organizationName} · {statusLabels[application.status]}</span>
            <button type="button" className="quiet" onClick={() => setSelectedApplication(application)}>View</button>
          </li>)}
        </ul>}
        {applications && applications.total > pageSize && <div className="pagination">
          <button type="button" className="quiet" disabled={applicationPage === 0}
            onClick={() => setApplicationPage(applicationPage - 1)}>Previous</button>
          <span>Page {applicationPage + 1} · {applications.total} applications</span>
          <button type="button" className="quiet" disabled={(applicationPage + 1) * pageSize >= applications.total}
            onClick={() => setApplicationPage(applicationPage + 1)}>Next</button>
        </div>}
        {selectedApplication && <div className="job-detail">
          <h3>{selectedApplication.jobTitle} · {statusLabels[selectedApplication.status]}</h3>
          <p><a href={`${workspaceHref('candidate-assessment-interview', 'CANDIDATE')}?application=${selectedApplication.id}`}>View assessment and interview progress</a></p>
          <ol>{selectedApplication.events.map((event) => <li key={event.id}>{event.message} · {new Date(event.createdAt).toLocaleString()}</li>)}</ol>
          <h4>Submitted profile</h4><p>{selectedApplication.profileSnapshot.displayName} · {selectedApplication.profileSnapshot.email}</p>
          {Object.entries(selectedApplication.profileSnapshot.profile).map(([field, value]) =>
            <p key={field} className="preserve-lines"><strong>{field[0].toUpperCase() + field.slice(1)}:</strong> {value || '—'}</p>)}
          {selectedApplication.documentId && <p>Document selected: {documents.find((document) => document.id === selectedApplication.documentId)?.filename || 'Uploaded document'}</p>}
          <h4>Your answers</h4>
          {Object.entries(selectedApplication.answers).length === 0 ? <p>No questions.</p> :
            <ul>{Object.entries(selectedApplication.answers).map(([id, answer]) =>
              <li key={id}><strong>{answer.prompt}</strong>: {answer.answer || 'No answer'}</li>)}</ul>}
          {!['HIRED', 'NOT_SELECTED', 'WITHDRAWN'].includes(selectedApplication.status) && <button type="button" className="quiet" disabled={busy}
            onClick={() => withdraw(selectedApplication)}>Withdraw application</button>}
        </div>}
      </section>}

      {section === 'privacy' && <section className="panel" aria-labelledby="data-heading">
        <h2 id="data-heading">Your data</h2>
        <p>Download a JSON copy of your account, profile, document list, and applications.</p>
        <a href="/api/v1/candidate/export" download="candidate-data.json">Download my data</a>
        <p>Deletion requests are reviewed against hiring record retention requirements. Submitting a request does not immediately delete data.</p>
        <button type="button" className="quiet" disabled={busy || requests.some((request) => request.status === 'PENDING')}
          onClick={requestDeletion}>Request deletion review</button>
        {requests.map((request) => <p key={request.id}>Request {new Date(request.createdAt).toLocaleDateString()}: {request.status.toLowerCase()}</p>)}
      </section>}
    </>}
  </div>
}

function JobApplicationForm({ job, documents, busy, onSubmit }: {
  job: Job
  documents: Document[]
  busy: boolean
  onSubmit: (answers: Record<string, string>, documentId: string) => void
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [documentId, setDocumentId] = useState('')
  return <form onSubmit={event => { event.preventDefault(); onSubmit(answers, documentId) }}>
    <p>Your application uses your saved profile. Add a headline and summary in <a href="#profile">Profile</a> before applying.</p>
    {job.questions.map(question => <label key={question.id}>{question.prompt}
      <textarea required={question.required} maxLength={2000} value={answers[question.id] || ''}
        onChange={event => setAnswers({ ...answers, [question.id]: event.target.value })} />
    </label>)}
    <label>Résumé or document (optional)<select value={documentId} onChange={event => setDocumentId(event.target.value)}>
      <option value="">No document</option>
      {documents.map(document => <option key={document.id} value={document.id}>{document.filename}</option>)}
    </select></label>
    <button type="submit" disabled={busy}>Submit application</button>
  </form>
}

function message(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Something went wrong. Please try again.'
}
