import { useEffect, useState } from 'react'
import { api, type AuditEvent, type CandidateApplication, type CandidateNotification, type CandidateProfile,
  type Job, type Member, type Organization, type Page } from './api'
import { CandidateJobList } from './CandidateJobList'
import { firstName, recruiterRoutes, type WorkspaceRole } from './workspaceNavigation'

function useDashboardData<T>(load: () => Promise<T>, key: string) {
  const [result, setResult] = useState<{ key: string; data?: T; failed?: boolean }>()
  useEffect(() => {
    let active = true
    void load().then(data => { if (active) setResult({ key, data }) })
      .catch(() => { if (active) setResult({ key, failed: true }) })
    return () => { active = false }
  }, [load, key])
  return result?.key === key ? result : undefined
}

const loadCandidate = () => Promise.all([
  api<CandidateProfile>('/candidate/profile'),
  api<Page<CandidateApplication>>('/candidate/applications?size=3'),
  api<Page<CandidateNotification>>('/candidate/notifications?read=false&size=1'),
])
const loadOpenJobs = () => api<Page<Job>>('/public/jobs?size=5')

function CandidateDashboard({ name }: { name: string }) {
  const snapshot = useDashboardData(loadCandidate, name)
  const openJobs = useDashboardData(loadOpenJobs, name)
  const [profile, applications, inbox] = snapshot?.data ?? []
  const ready = !!(profile?.headline.trim() && profile.summary.trim())
  return <>
    <section className="pv-welcome live-welcome-candidate">
      <div><h2>Welcome, {name}</h2><p>Explore openings and keep track of the roles you’ve applied for.</p></div>
      <a href="#candidate" className="pv-button light">Find jobs</a>
    </section>
    <div className="pv-grid stats live-dashboard-cards">
      <a className="pv-card pv-stat" href="#profile"><span>Profile readiness</span><strong>{profile ? (ready ? 'Ready to apply' : 'Needs details') : '—'}</strong><small>Edit profile</small></a>
      <a className="pv-card pv-stat" href="#updates"><span>Unread notifications</span><strong>{inbox?.total ?? '—'}</strong><small>Open notifications</small></a>
      <a className="pv-card pv-stat" href="#applications"><span>My applications</span><strong>{applications?.total ?? '—'}</strong><small>View applications</small></a>
    </div>
    <section className="pv-card">
      <div className="section-heading"><h2>Open jobs</h2><a href="#candidate">Browse and filter jobs</a></div>
      {openJobs?.failed ? <p role="alert">Couldn’t load open jobs.</p> :
        !openJobs?.data ? <p role="status">Loading open jobs…</p> :
        openJobs.data.items.length ? <CandidateJobList jobs={openJobs.data.items} /> : <p>No jobs have been published yet.</p>}
    </section>
    <section className="pv-card">
      <h2>Recent applications</h2>
      {snapshot?.failed ? <p>Couldn’t load your recent activity. You can still open the pages from the menu.</p> :
        !applications ? <p role="status">Loading applications…</p> :
        applications.items.length === 0 ? <p>You haven’t applied yet. Published openings are in <a href="#candidate">Find jobs</a>.</p> :
        <ul className="list">{applications.items.map(application => <li key={application.id}>
          <span><strong>{application.jobTitle}</strong> · {application.organizationName}</span>
          <span className="pv-pill">{application.status.toLowerCase().replaceAll('_', ' ')}</span>
        </li>)}</ul>}
    </section>
  </>
}

type PipelineReport = { byStage: Record<string, number>; applications: number; applicationsWithReview: number }
function RecruiterDashboard({ organization }: { organization: Organization }) {
  const [summary, setSummary] = useState<{ report: PipelineReport; jobs: number }>()
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let active = true
    const base = '/organizations/' + organization.organizationId
    void Promise.all([api<PipelineReport>(base+'/reports/pipeline'), api<Page<Job>>(base+'/jobs?size=1')])
      .then(([report, jobs]) => { if (active) setSummary({report, jobs:jobs.total}) })
      .catch(() => { if (active) setFailed(true) })
    return () => { active = false }
  }, [organization.organizationId])
  return <>
    <section className="pv-card live-recruiter-heading">
      <div><p className="pv-kicker">{organization.name}</p><h2>Hiring pipeline</h2><p>See where applications stand across your organization.</p></div>
      <a className="pv-button primary" href={recruiterRoutes['recruiter-applications']}>View applications</a>
    </section>
    <div className="pv-grid stats live-dashboard-cards">
      <div className="pv-card pv-stat"><span>Job records</span><strong>{summary?.jobs ?? '—'}</strong></div>
      <div className="pv-card pv-stat"><span>Total applications</span><strong>{summary?.report.applications ?? '—'}</strong></div>
      <div className="pv-card pv-stat"><span>With a recorded review</span><strong>{summary?.report.applicationsWithReview ?? '—'}</strong></div>
    </div>
    <section className="pv-card"><h2>Applications by stage</h2>
      {failed ? <p>Couldn’t load pipeline totals.</p> : !summary ? <p role="status">Loading pipeline…</p> :
        <div className="pv-chart">{Object.entries(summary.report.byStage).map(([stage,count]) => {
          const label = stage.toLowerCase().replaceAll('_',' ')
          return <div key={stage}><span>{label}</span>
            <meter aria-label={label} min={0} max={Math.max(summary.report.applications,1)} value={count}/>
            <strong>{count}</strong></div>
        })}</div>}
    </section>
  </>
}

function AdminDashboard({ organization, members, audit }: { organization?: Organization; members: Member[]; audit: AuditEvent[] }) {
  if (!organization) return <section className="pv-card">
    <h2>Set up your first organization</h2>
    <p>Create an organization before inviting recruiters or setting hiring policies.</p>
    <a href="#organizations" className="pv-button primary">Set up organization</a>
  </section>
  return <>
    <section className="pv-card live-admin-heading">
      <div><p className="pv-kicker">ORGANIZATION ADMIN</p><h2>{organization.name}</h2><p>Manage who can hire and how applications are handled.</p></div>
      <a href="#admin" className="pv-button primary">Manage team</a>
    </section>
    <div className="pv-grid stats live-dashboard-cards">
      <a className="pv-card pv-stat" href="#admin"><span>Active team members</span><strong>{members.filter(member=>member.status==='ACTIVE').length}</strong><small>Team & invitations</small></a>
      <a className="pv-card pv-stat" href="#policy"><span>Hiring policies</span><strong>Settings</strong><small>Review retention, reapplication, and AI settings</small></a>
    </div>
    <section className="pv-card">
      <div className="section-heading"><h2>Recent organization activity</h2><a href="#audit">View audit log</a></div>
      {audit.length ? <ul className="list">{audit.slice(0,5).map(event=><li key={event.id}>
        <span>{event.action.replaceAll(/[._]/g,' ')}</span><time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString()}</time>
      </li>)}</ul> : <p>No recent activity to show.</p>}
    </section>
  </>
}

export function WorkspaceDashboard({ role, accountId, name, organization, members, audit }: {
  role: WorkspaceRole; accountId: string; name: string; organization?: Organization; members: Member[]; audit: AuditEvent[]
}) {
  if (role === 'RECRUITER' && organization) return <RecruiterDashboard key={organization.organizationId} organization={organization}/>
  if (role === 'ADMIN') return <AdminDashboard organization={organization} members={members} audit={audit}/>
  return <CandidateDashboard key={accountId} name={firstName(name)}/>
}
