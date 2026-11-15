import { useEffect, useState, type FormEvent } from 'react'
import { api, type Account, type CandidateApplication, type CandidateProfile, type DataRequest,
  type Document, type Job, type Page } from './api'

const emptyProfile: CandidateProfile = { headline: '', location: '', phone: '', summary: '', skills: '',
  experience: '', education: '' }

type Props = { account: Account | null; documents: Document[]; jobsVersion: number; onSignIn: () => void }

export function CandidateWorkspace({ account, documents, jobsVersion, onSignIn }: Props) {
  const [jobs, setJobs] = useState<Page<Job>>({ items: [], page: 0, size: 12, total: 0 })
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [profile, setProfile] = useState<CandidateProfile>(emptyProfile)
  const [applications, setApplications] = useState<Page<CandidateApplication>>({ items: [], page: 0, size: 12, total: 0 })
  const [applicationPage, setApplicationPage] = useState(0)
  const [selectedApplication, setSelectedApplication] = useState<CandidateApplication | null>(null)
  const [requests, setRequests] = useState<DataRequest[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [documentId, setDocumentId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    void api<Page<Job>>(`/public/jobs?page=${jobs.page}&size=12`).then(setJobs)
      .catch((cause: unknown) => setError(message(cause)))
  }, [jobs.page, jobsVersion])

  useEffect(() => {
    if (!account) return
    void Promise.all([api<CandidateProfile>('/candidate/profile'),
      api<Page<CandidateApplication>>(`/candidate/applications?page=${applicationPage}&size=12`),
      api<DataRequest[]>('/candidate/deletion-requests')])
      .then(([nextProfile, nextApplications, nextRequests]) => {
        setProfile(nextProfile); setApplications(nextApplications); setRequests(nextRequests)
      }).catch((cause: unknown) => setError(message(cause)))
  }, [account, applicationPage])

  async function run(action: () => Promise<void>) {
    setBusy(true); setError(''); setNotice('')
    try { await action() }
    catch (cause) { setError(message(cause)) }
    finally { setBusy(false) }
  }

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void run(async () => {
      setProfile(await api<CandidateProfile>('/candidate/profile', { method: 'PUT', body: JSON.stringify(profile) }))
      setNotice('Profile saved. New applications will use this version.')
    })
  }

  function submitApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedJob) return
    void run(async () => {
      const application = await api<CandidateApplication>('/candidate/applications', { method: 'POST',
        body: JSON.stringify({ jobId: selectedJob.id, documentId: documentId || null, answers }) })
      setSelectedApplication(application)
      setApplicationPage(0)
      setApplications(await api<Page<CandidateApplication>>('/candidate/applications?page=0&size=12'))
      setNotice(`Application submitted to ${selectedJob.organizationName}. Your status is Application received.`)
    })
  }

  function withdraw(application: CandidateApplication) {
    if (!window.confirm(`Withdraw your application for ${application.jobTitle}?`)) return
    void run(async () => {
      const updated = await api<CandidateApplication>(`/candidate/applications/${application.id}/withdraw`, { method: 'POST' })
      setSelectedApplication(updated)
      setApplications(await api<Page<CandidateApplication>>('/candidate/applications?page=0&size=12'))
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
      setApplications(await api<Page<CandidateApplication>>(`/candidate/applications?page=${applicationPage}&size=12`))
      if (selectedApplication) {
        setSelectedApplication(await api<CandidateApplication>(`/candidate/applications/${selectedApplication.id}`))
      }
      setNotice('Application statuses are up to date.')
    })
  }

  const activeApplication = applications.items.find((application) =>
    application.jobId === selectedJob?.id && !['HIRED', 'NOT_SELECTED', 'WITHDRAWN'].includes(application.status))

  function statusLabel(status: CandidateApplication['status']) {
    return ({ SUBMITTED: 'Application received', IN_REVIEW: 'In review', INTERVIEW: 'Interview',
      OFFER: 'Offer', HIRED: 'Hired', NOT_SELECTED: 'Not selected', WITHDRAWN: 'Withdrawn' })[status]
  }

  return <div className="candidate-area">
    {error && <p className="alert error" role="alert">{error}</p>}
    {notice && <p className="alert success" role="status">{notice}</p>}
    <section className="panel" aria-labelledby="jobs-heading">
      <h2 id="jobs-heading">Find jobs</h2>
      <p>Published openings are visible to everyone. Your applications are private.</p>
      {jobs.items.length === 0 ? <p>No jobs have been published yet. Organization members can publish a starter job below.</p> :
        <ul className="list">{jobs.items.map((job) => <li key={job.id}>
          <span><strong>{job.title}</strong> · {job.organizationName} · {job.location} · {job.workType.toLowerCase()}</span>
          <button type="button" className="quiet" onClick={() => { setSelectedJob(job); setAnswers({}); setDocumentId('') }}>View job</button>
        </li>)}</ul>}
      <div className="pagination">
        <button type="button" className="quiet" disabled={jobs.page === 0} onClick={() => setJobs({ ...jobs, page: jobs.page - 1 })}>Previous</button>
        <span>Page {jobs.page + 1} · {jobs.total} jobs</span>
        <button type="button" className="quiet" disabled={(jobs.page + 1) * jobs.size >= jobs.total}
          onClick={() => setJobs({ ...jobs, page: jobs.page + 1 })}>Next</button>
      </div>
      {selectedJob && <div className="job-detail">
        <h3>{selectedJob.title}</h3>
        <p>{selectedJob.organizationName} · {selectedJob.location} · {selectedJob.workType.toLowerCase()}</p>
        {selectedJob.salaryMin !== null && <p>Compensation: {selectedJob.currency} {selectedJob.salaryMin.toLocaleString()}–{selectedJob.salaryMax?.toLocaleString()}</p>}
        <h4>About the role</h4><p className="preserve-lines">{selectedJob.description}</p>
        <h4>Requirements</h4><p className="preserve-lines">{selectedJob.requirements}</p>
        {!account ? <button type="button" onClick={onSignIn}>Sign in to apply</button> : activeApplication ?
          <p>You already applied to this job. See My applications below.</p> :
          <form onSubmit={submitApplication}>
            <p>Your current profile is copied into this application when you submit. Save a headline and summary first.</p>
            {selectedJob.questions.map((question) => <label key={question.id}>{question.prompt}
              <textarea required={question.required} maxLength={2000} value={answers[question.id] || ''}
                onChange={(event) => setAnswers({ ...answers, [question.id]: event.target.value })} /></label>)}
            <label>Resume or document (optional)<select value={documentId} onChange={(event) => setDocumentId(event.target.value)}>
              <option value="">No document</option>
              {documents.map((document) => <option key={document.id} value={document.id}>{document.filename}</option>)}
            </select></label>
            <button type="submit" disabled={busy}>Submit application</button>
          </form>}
      </div>}
    </section>

    {account && <>
      <section className="panel" aria-labelledby="profile-heading">
        <h2 id="profile-heading">Candidate profile</h2>
        <p>Keep reusable information here. Add a headline and summary before applying. Each application keeps a snapshot of the profile you submitted.</p>
        <form onSubmit={saveProfile}>
          <div className="field-grid">
            <label>Headline<input value={profile.headline} maxLength={160} onChange={(event) => setProfile({ ...profile, headline: event.target.value })} /></label>
            <label>Location<input value={profile.location} maxLength={160} onChange={(event) => setProfile({ ...profile, location: event.target.value })} /></label>
            <label>Phone<input value={profile.phone} maxLength={40} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} /></label>
          </div>
          {(['summary', 'skills', 'experience', 'education'] as const).map((field) => <label key={field}>
            {field[0].toUpperCase() + field.slice(1)}<textarea value={profile[field]}
              maxLength={field === 'experience' ? 8000 : 4000}
              onChange={(event) => setProfile({ ...profile, [field]: event.target.value })} /></label>)}
          <button type="submit" disabled={busy}>Save profile</button>
        </form>
      </section>

      <section className="panel" aria-labelledby="applications-heading">
        <div className="section-heading"><h2 id="applications-heading">My applications</h2>
          <button type="button" className="quiet" disabled={busy} onClick={refreshApplications}>Check for updates</button></div>
        {applications.items.length === 0 ? <p>No applications yet.</p> : <ul className="list">
          {applications.items.map((application) => <li key={application.id}>
            <span><strong>{application.jobTitle}</strong> · {application.organizationName} · {statusLabel(application.status)}</span>
            <button type="button" className="quiet" onClick={() => setSelectedApplication(application)}>View</button>
          </li>)}
        </ul>}
        {applications.total > 12 && <div className="pagination">
          <button type="button" className="quiet" disabled={applicationPage === 0}
            onClick={() => setApplicationPage(applicationPage - 1)}>Previous</button>
          <span>Page {applicationPage + 1} · {applications.total} applications</span>
          <button type="button" className="quiet" disabled={(applicationPage + 1) * 12 >= applications.total}
            onClick={() => setApplicationPage(applicationPage + 1)}>Next</button>
        </div>}
        {selectedApplication && <div className="job-detail">
          <h3>{selectedApplication.jobTitle} · {statusLabel(selectedApplication.status)}</h3>
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
      </section>

      <section className="panel" aria-labelledby="data-heading">
        <h2 id="data-heading">Your data</h2>
        <p>Download a JSON copy of your account, profile, document list, and applications.</p>
        <a href="/api/v1/candidate/export" download="candidate-data.json">Download my data</a>
        <p>Deletion requests are reviewed against hiring record retention requirements. Submitting a request does not immediately delete data.</p>
        <button type="button" className="quiet" disabled={busy || requests.some((request) => request.status === 'PENDING')}
          onClick={requestDeletion}>Request deletion review</button>
        {requests.map((request) => <p key={request.id}>Request {new Date(request.createdAt).toLocaleDateString()}: {request.status.toLowerCase()}</p>)}
      </section>
    </>}
  </div>
}

function message(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Something went wrong. Please try again.'
}
