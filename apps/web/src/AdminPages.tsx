import type { FormEvent } from 'react'
import type { AuditEvent, Member, Organization, OrganizationPolicy } from './api'
import { directoryHref, workspaceHref } from './workspaceNavigation'

export function CreateOrganizationPage({ busy, onCreate }: {
  busy: boolean; onCreate: (event: FormEvent<HTMLFormElement>) => void
}) {
  return <section className="panel" aria-label="Organization details">
    <p>Set up a hiring team. You’ll become its first admin and can invite recruiters after creation.</p>
    <form className="inline-form" onSubmit={onCreate}>
      <label>Organization name<input name="name" required maxLength={200} /></label>
      <label>URL slug<input name="slug" placeholder="example-hiring-team" pattern="[a-z0-9]+(-[a-z0-9]+)*" required maxLength={80} /></label>
      <button type="submit" disabled={busy}>Create organization</button>
    </form>
  </section>
}

export function OrganizationsPage({ organizations }: { organizations: Organization[] }) {
  return <section className="panel" aria-label="Organizations you administer">
    <div className="section-heading"><h2>Organizations you administer</h2>
      <a className="pv-button primary" href={workspaceHref('create-organization', 'ADMIN')}>Create organization</a>
    </div>
    {!organizations.length ? <p>No organizations yet.</p> : <ul className="list">{organizations.map(organization => <li key={organization.organizationId}>
      <a href={directoryHref(organization.organizationId)}>{organization.name}</a>
      <span>{organization.slug}</span>
    </li>)}</ul>}
  </section>
}

export function OrganizationRecruitersPage({ organization, members }: { organization: Organization; members?: Member[] }) {
  const recruiters = members?.filter(member => member.role === 'RECRUITER' && member.status === 'ACTIVE')
  return <section className="panel" aria-label="Recruiters">
    <h2>{organization.name}</h2>
    {!recruiters ? <p role="status">Loading recruiters…</p> : !recruiters.length ? <p>No active recruiters in this organization.</p> :
      <ul className="list">{recruiters.map(recruiter => <li key={recruiter.id}>
        <a href={directoryHref(organization.organizationId, recruiter.id)}>{recruiter.displayName}</a>
        <span>{recruiter.email}</span>
      </li>)}</ul>}
  </section>
}

export function TeamPage({ organization, accountId, members, busy, onInvite, onRevoke }: {
  organization: Organization; accountId: string; members?: Member[]; busy: boolean
  onInvite: (event: FormEvent<HTMLFormElement>) => void; onRevoke: (member: Member) => void
}) {
  return <section className="panel" aria-labelledby="members-heading">
    <h2 id="members-heading">{organization.name}</h2>
    <form className="inline-form" onSubmit={onInvite}>
      <label>Invite email<input name="email" type="email" required /></label>
      <label>Role<select name="role"><option value="RECRUITER">Recruiter</option><option value="ADMIN">Admin</option></select></label>
      <button type="submit" disabled={busy}>Send invitation</button>
    </form>
    <h3>Members</h3>
    {!members ? <p role="status">Loading members…</p> : <ul className="list">{members.map(member => <li key={member.id}>
      <span>{member.displayName} · {member.email} · {member.role} · {member.status}</span>
      {member.id !== accountId && member.status === 'ACTIVE' &&
        <button type="button" className="quiet" onClick={() => onRevoke(member)} disabled={busy}>Revoke</button>}
    </li>)}</ul>}
  </section>
}

export function HiringPoliciesPage({ organization, policy, busy, onSave }: {
  organization: Organization; policy: OrganizationPolicy | null; busy: boolean
  onSave: (event: FormEvent<HTMLFormElement>) => void
}) {
  return <section className="panel" aria-label="Policy settings">
    <h2>{organization.name}</h2>
    {policy ? <form onSubmit={onSave}>
      <div className="field-grid">
        <label>Days before a candidate can reapply to the same job<input name="reapplyCooldownDays"
          type="number" min="0" max="365" required defaultValue={policy.reapplyCooldownDays} /></label>
        <label>Retention review period (days)<input name="retentionDays" type="number" min="30" max="3650"
          required defaultValue={policy.retentionDays} /></label>
      </div>
      <label><input name="aiEnabled" type="checkbox" defaultChecked={policy.aiEnabled} /> Allow AI assistance for this organization</label>
      <p>Use the retention period when reviewing deletion requests. An admin must review each request.</p>
      <button type="submit" disabled={busy}>Save policy</button>
    </form> : <p role="status">Loading hiring policies…</p>}
  </section>
}

const actionLabels: Record<string, string> = {
  'membership.invite': 'Sent a team invitation', 'membership.accept': 'Accepted an invitation',
  'membership.revoke': 'Revoked team access', 'membership.role_change': 'Changed a team role',
  'job.publish': 'Published a job', 'organization.create': 'Created the organization',
  'organization.policy_update': 'Updated hiring policies',
  'application.decision_hired': 'Recorded a hire', 'application.decision_not_selected': 'Recorded a not-selected decision',
}

export function AuditPage({ organization, audit }: { organization: Organization; audit: AuditEvent[] }) {
  return <section className="panel" aria-label="Organization audit events">
    <h2>{organization.name}</h2>
    <p>Review who changed team access, job listings, hiring policies, or hiring decisions, and when each action happened. Shows the latest 100 recorded events.</p>
    {!audit.length ? <p>No recorded activity yet.</p> : <ul className="list">{audit.map(event => <li key={event.id}>
      <div><strong>{actionLabels[event.action] ?? event.action.replaceAll(/[._]/g, ' ')}</strong><br />
        {event.actorName ?? 'System'} · {event.targetType.replaceAll('_', ' ')}
        {event.targetId && <> <code>{event.targetId}</code></>}
      </div>
      <time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString()}</time>
    </li>)}</ul>}
  </section>
}
