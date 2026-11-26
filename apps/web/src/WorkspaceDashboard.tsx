import { useEffect, useState } from 'react'
import { api, type AuditEvent, type CandidateApplication, type CandidateNotification, type CandidateProfile,
  type Job, type Member, type Organization, type Page } from './api'
import { HiringTaskCard } from './HiringTaskCard'
import { CandidateJobList } from './CandidateJobList'
import { HiringToolsSetting } from './HiringToolsTrial'
import { applicationStatuses } from './recruiterSearch'
import { workspaceHref, type WorkspaceRole } from './workspaceNavigation'

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

function CandidateDashboard({ accountId }: { accountId: string }) {
  const snapshot = useDashboardData(loadCandidate, accountId)
  const openJobs = useDashboardData(loadOpenJobs, accountId)
  const [profile, applications, inbox] = snapshot?.data ?? []
  const ready = !!(profile?.headline.trim() && profile.summary.trim())
  return <>
    <div className="pv-grid stats live-dashboard-cards">
      <a className="pv-card pv-stat" href="#profile"><span>Profile readiness</span><strong>{profile ? (ready ? 'Ready to apply' : 'Needs details') : '—'}</strong><small>Edit profile</small></a>
      <a className="pv-card pv-stat" href="#updates"><span>Unread notifications</span><strong>{inbox?.total ?? '—'}</strong><small>Open notifications</small></a>
      <a className="pv-card pv-stat" href="#applications"><span>My applications</span><strong>{applications?.total ?? '—'}</strong><small>View applications</small></a>
    </div>
    <HiringTaskCard />
    <div className="candidate-dashboard-columns">
      <section aria-labelledby="dashboard-open-jobs">
        <div className="section-heading"><h2 id="dashboard-open-jobs">Open jobs</h2><a href="#candidate">Browse all jobs</a></div>
        {openJobs?.failed ? <p role="alert">Couldn’t load open jobs.</p> :
          !openJobs?.data ? <p role="status">Loading open jobs…</p> :
          openJobs.data.items.length ? <CandidateJobList jobs={openJobs.data.items} compact /> :
          <p className="pv-card">No jobs have been published yet.</p>}
      </section>
      <section aria-labelledby="dashboard-recent-applications">
        <div className="section-heading"><h2 id="dashboard-recent-applications">Recent applications</h2>
          <a href="#applications">View all applications</a></div>
        {snapshot?.failed ? <p role="alert">Couldn’t load your recent activity.</p> :
          !applications ? <p role="status">Loading applications…</p> :
          applications.items.length === 0 ? <p className="pv-card">You haven’t applied yet. <a href="#candidate">Find jobs</a></p> :
          <ul className="candidate-card-stack">{applications.items.map(application => <li className="pv-card candidate-application-card" key={application.id}>
            <h3>{application.jobTitle}</h3>
            <p>{application.organizationName}</p>
            <div>
              <time dateTime={application.submittedAt}>Applied {new Date(application.submittedAt).toLocaleDateString()}</time>
              <span className="pv-pill">{applicationStatuses[application.status]}</span>
            </div>
          </li>)}</ul>}
      </section>
    </div>
  </>
}

type PipelineReport = {
  byStage: Record<keyof typeof applicationStatuses, number>
  weeklyApplications: { start: string; applications: number }[]
}

function HiringInsights({ organization }: { organization: Organization }) {
  const [summary, setSummary] = useState<{ report: PipelineReport; openJobs: number }>()
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let active = true
    const base = '/organizations/' + organization.organizationId
    void Promise.all([api<PipelineReport>(base + '/reports/pipeline'), api<Page<Job>>(base + '/jobs?size=1&status=PUBLISHED')])
      .then(([report, jobs]) => { if (active) setSummary({ report, openJobs: jobs.total }) })
      .catch(() => { if (active) setFailed(true) })
    return () => { active = false }
  }, [organization.organizationId])

  const stages = Object.entries(applicationStatuses).map(([key, label]) => ({
    label, count: summary?.report.byStage[key as keyof typeof applicationStatuses] ?? 0,
    href: key === 'HIRED' ? workspaceHref('hired-candidates', organization.role) : `${workspaceHref('recruiter-applications', organization.role)}?status=${key}`,
  }))
  const stageMax = Math.max(1, ...stages.map(stage => stage.count))
  const weeks = summary?.report.weeklyApplications ?? []
  const weekMax = Math.max(1, ...weeks.map(week => week.applications))
  const weekLabel = (start: string) => new Date(`${start}T00:00:00Z`).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', timeZone: 'UTC',
  })

  return <>
    <div className="pv-grid stats live-dashboard-cards">
      <a className="pv-card pv-stat" href={`${workspaceHref('posted-jobs', organization.role)}?status=PUBLISHED`}><span>Open jobs</span><strong>{summary?.openJobs ?? '—'}</strong></a>
      <a className="pv-card pv-stat" href={`${workspaceHref('recruiter-applications', organization.role)}?status=SUBMITTED`}><span>Awaiting review</span><strong>{summary?.report.byStage.SUBMITTED ?? '—'}</strong></a>
      <a className="pv-card pv-stat" href={workspaceHref('hired-candidates', organization.role)}><span>Hires</span><strong>{summary?.report.byStage.HIRED ?? '—'}</strong></a>
    </div>
    {failed ? <p role="alert">Couldn’t load hiring metrics.</p> : !summary ? <p role="status">Loading hiring metrics…</p> :
      <div className="hiring-charts">
        <section className="pv-card">
          <h2>Applications by stage</h2>
          <ul className="hiring-stage-chart">{stages.map(stage => <li key={stage.label}>
            <a href={stage.href}>{stage.label}</a>
            <meter aria-label={stage.label} min={0} max={stageMax} value={stage.count} />
            <strong>{stage.count}</strong>
          </li>)}</ul>
        </section>
        <section className="pv-card">
          <h2>Applications by week</h2>
          <p>Last eight weeks, including the current week.</p>
          <ol className="hiring-week-chart">{weeks.map(week => <li key={week.start}>
            <div className="hiring-week-bar"><span aria-hidden="true" style={{ height: `${100 * week.applications / weekMax}%` }} /></div>
            <strong>{week.applications}</strong><time dateTime={week.start}>{weekLabel(week.start)}</time>
          </li>)}</ol>
        </section>
      </div>}
  </>
}

function AdminDashboard({ organization, members, audit, accountId }: { organization?: Organization; members: Member[]; audit: AuditEvent[]; accountId: string }) {
  if (!organization) return <section className="pv-card">
    <h2>Set up your first organization</h2>
    <p>Create an organization before inviting recruiters or setting hiring policies.</p>
    <a href={workspaceHref('create-organization', 'ADMIN')} className="pv-button primary">Set up organization</a>
  </section>
  return <>
    <section className="pv-card live-admin-heading">
      <div><p className="pv-kicker">ORGANIZATION ADMIN</p><h2>{organization.name}</h2><p>Manage who can hire and how applications are handled.</p></div>
      <a href={workspaceHref('admin', 'ADMIN')} className="pv-button primary">Manage team</a>
    </section>
    <HiringTaskCard key={organization.organizationId} organization={organization} />
    <HiringInsights organization={organization} key={`${organization.organizationId}-insights`} />
    <div className="pv-grid stats live-dashboard-cards">
      <a className="pv-card pv-stat" href={workspaceHref('admin', 'ADMIN')}><span>Active team members</span><strong>{members.filter(member=>member.status==='ACTIVE').length}</strong><small>Team & invitations</small></a>
      <a className="pv-card pv-stat" href={workspaceHref('policy', 'ADMIN')}><span>Hiring policies</span><strong>Settings</strong><small>Review retention, reapplication, and AI settings</small></a>
    </div>
    <section className="pv-card"><HiringToolsSetting key={organization.organizationId} organizationId={organization.organizationId} accountId={accountId} /></section>
    <section className="pv-card">
      <div className="section-heading"><h2>Recent organization activity</h2><a href={workspaceHref('audit', 'ADMIN')}>View audit log</a></div>
      {audit.length ? <ul className="list">{audit.slice(0,5).map(event=><li key={event.id}>
        <span>{event.action.replaceAll(/[._]/g,' ')}</span><time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString()}</time>
      </li>)}</ul> : <p>No recent activity to show.</p>}
    </section>
  </>
}

export function WorkspaceDashboard({ role, accountId, organization, members, audit }: {
  role: WorkspaceRole; accountId: string; organization?: Organization; members: Member[]; audit: AuditEvent[]
}) {
  if (role === 'RECRUITER' && organization) return <>
    <div className="section-heading"><h2>{organization.name}</h2>
      <a className="pv-button primary" href={workspaceHref('post-job', 'RECRUITER')}>Post a job</a>
    </div>
    <HiringTaskCard key={organization.organizationId} organization={organization} />
    <HiringInsights organization={organization} key={`${organization.organizationId}-insights`} />
    <section className="pv-card"><HiringToolsSetting organizationId={organization.organizationId} accountId={accountId} /></section>
  </>
  if (role === 'ADMIN') return <AdminDashboard organization={organization} members={members} audit={audit} accountId={accountId}/>
  return <CandidateDashboard key={accountId} accountId={accountId}/>
}
