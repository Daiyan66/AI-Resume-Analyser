import type { Organization } from './api'
import { workspaceNames, type View, type WorkspaceRole } from './workspaceNavigation'

const dashboards: Record<WorkspaceRole, {
  title: string
  description: string
  cards: { title: string; detail: string; action: string; view: View }[]
}> = {
  CANDIDATE: {
    title: 'Your job search',
    description: 'Find a role, keep your application ready, and follow each hiring update.',
    cards: [
      { title: 'Open roles', detail: 'Read job requirements and apply when you’re ready.', action: 'Browse open roles', view: 'candidate' },
      { title: 'Application timeline', detail: 'See what you submitted and how your applications are progressing.', action: 'View applications', view: 'applications' },
      { title: 'Your profile', detail: 'Keep a reusable profile ready for future applications.', action: 'Edit candidate profile', view: 'profile' },
    ],
  },
  RECRUITER: {
    title: 'Your hiring pipeline',
    description: 'Publish openings, review candidates against your criteria, and record hiring decisions.',
    cards: [
      { title: 'Openings and drafts', detail: 'Create job drafts, review requirements, and manage published listings.', action: 'Manage jobs', view: 'recruiter' },
      { title: 'Applicant review', detail: 'Choose a job, then open Applicants to assess submissions and update stages.', action: 'Open jobs & applicants', view: 'recruiter' },
      { title: 'Your organization', detail: 'See the hiring teams you belong to and switch between them.', action: 'View organizations', view: 'organizations' },
    ],
  },
  ADMIN: {
    title: 'Manage your organization',
    description: 'Control team access, set hiring policies, and check activity across your organization.',
    cards: [
      { title: 'Team access', detail: 'Invite recruiters and admins, see who has access, and revoke it when needed.', action: 'Manage team', view: 'admin' },
      { title: 'Hiring policies', detail: 'Manage reapplication, retention review, and AI settings.', action: 'Review policies', view: 'policy' },
      { title: 'Audit history', detail: 'Check recent activity for invitations, access changes, and hiring actions.', action: 'View audit log', view: 'audit' },
    ],
  },
}

export function WorkspaceDashboard({ role, name, organization }: {
  role: WorkspaceRole
  name: string
  organization?: Organization
}) {
  const dashboard = dashboards[role]
  return <>
    <section className={`pv-welcome live-welcome-${role.toLowerCase()}`} aria-labelledby="workspace-welcome">
      <div>
        <p>{organization?.name ?? 'PERSONAL WORKSPACE'}</p>
        <h2 id="workspace-welcome">{role === 'CANDIDATE' ? `Welcome, ${name}` : dashboard.title}</h2>
        <p>{dashboard.description}</p>
      </div>
      <span className="pv-pill">{workspaceNames[role]}</span>
    </section>
    <div className="pv-grid stats live-dashboard-cards">
      {dashboard.cards.map(card => <section className="pv-card live-dashboard-card" key={card.title}>
        <h2>{card.title}</h2>
        <p>{card.detail}</p>
        <a className="pv-button" href={`#${card.view}`}>{card.action}</a>
      </section>)}
    </div>
  </>
}
