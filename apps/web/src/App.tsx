import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useSuccessNotice } from './useSuccessNotice'
import { api, type Account, type Page, type AuditEvent, type Document, type Member, type Organization,
  type OrganizationPolicy } from './api'
import { AuditPage, CreateOrganizationPage, HiringPoliciesPage, OrganizationRecruitersPage, OrganizationsPage, TeamPage } from './AdminPages'
import { CandidateWorkspace } from './CandidateWorkspace'
import { PostedJobsPage } from './PostedJobsPage'
import { PostJobPage } from './PostJobPage'
import { RecruiterApplicationsPage } from './RecruiterApplicationsPage'
import { RecruiterNotificationsPage } from './RecruiterNotificationsPage'
import { BatchScreeningPage } from './BatchScreeningPage'
import { TeamChatPage } from './TeamChatPage'
import { ConnectedAuthCard, ConnectedLayout } from './ConnectedLayout'

import { currentView, firstName, isCandidateSection, isCandidateView, staffRoute, directoryHref, workspaceHref, viewTitles, workspaceMenus,
  type View, type WorkspaceRole } from './workspaceNavigation'
import { WorkspaceDashboard } from './WorkspaceDashboard'

function App() {
  const [sessionLoading, setSessionLoading] = useState(true)
  const [fragment, setFragment] = useState(() => window.location.hash)
  const view = currentView(fragment)
  const jobId = new URLSearchParams(fragment.split('?')[1]).get('job')
  const [account, setAccount] = useState<Account | null>(null)
  const [workspaceLoading, setWorkspaceLoading] = useState(false)
  const [canCreateOrganizations, setCanCreateOrganizations] = useState(false)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [selectedOrgId, setSelectedOrgId] = useState('')
  const [members, setMembers] = useState<Member[]>()
  const [audit, setAudit] = useState<AuditEvent[]>([])
  const [policy, setPolicy] = useState<OrganizationPolicy | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [mode, setMode] = useState<'login' | 'register'>(()=>new URLSearchParams(location.search).get('mode') === 'register' ? 'register' : 'login')
  const [resendEmail, setResendEmail] = useState('')
  const [inviteToken, setInviteToken] = useState(new URLSearchParams(window.location.search).get('token'))
  const [verifyToken, setVerifyToken] = useState(new URLSearchParams(window.location.search).get('verify'))
  const verificationStarted = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useSuccessNotice()

  const route = staffRoute(location.pathname)
  const routeRole = route?.role
  const role: WorkspaceRole = organizations.some(org => org.role === 'ADMIN') ? 'ADMIN' :
    organizations.length ? 'RECRUITER' : canCreateOrganizations ? 'ADMIN' : 'CANDIDATE'
  const roleOrganizations = organizations.filter(org => org.role === role)
  const selectedOrg = roleOrganizations.find(org => org.organizationId === (route?.organizationId ?? selectedOrgId)) ??
    (!route?.organizationId ? roleOrganizations[0] : undefined)
  const orgId = selectedOrg?.organizationId
  const directoryRecruiter = members?.find(member => member.id === route?.recruiterId &&
    member.role === 'RECRUITER' && member.status === 'ACTIVE')
  const adminOverview = view === 'organizations' || view === 'create-organization'
  const staffView = workspaceMenus.ADMIN.includes(view) || workspaceMenus.RECRUITER.includes(view)
  const unknownStaffPath = /^\/dashboard\/(admin|recruiter)(?:\/|$)/.test(location.pathname) && !route
  const allowed = !unknownStaffPath && (view === 'home' || (route ? (role === route.role || role === 'ADMIN' && route.role === 'RECRUITER' && view !== 'batch-screening')
    && (adminOverview || !!selectedOrg) : isCandidateView(view) ? role === 'CANDIDATE' || !account :
      staffView && role === 'ADMIN' && (adminOverview || !!selectedOrg)))
  const activeView = inviteToken && account ? 'invitation' : !allowed ? 'home' : view
  const menu: View[] = role === 'ADMIN' && !orgId ? ['home', 'organizations', 'create-organization'] : workspaceMenus[role]
  const dashboardView = activeView === 'home' || activeView === 'candidate-home'
  const activeMenuView = dashboardView && role === 'CANDIDATE' ? 'candidate-home' :
    route?.organizationId ? 'organizations' : activeView
  const [unread, setUnread] = useState<{ path: string; found: boolean }>()
  const [notificationRevision, setNotificationRevision] = useState(0)
  const notificationsPath = !account ? '' : role === 'CANDIDATE' ? '/candidate/notifications?read=false&size=1' :
    orgId ? `/organizations/${orgId}/recruiter-notifications?unread=true&size=1` : ''

  useEffect(() => {
    if (!notificationsPath) return
    const controller = new AbortController()
    let timer: number
    async function check() {
      try {
        const data = await api<Page<unknown>>(notificationsPath, { signal: controller.signal })
        if (!controller.signal.aborted) setUnread({ path: notificationsPath, found: data.total > 0 })
      } catch {
        // Retry during the next check.
      } finally {
        if (!controller.signal.aborted) timer = window.setTimeout(check, 5000)
      }
    }
    void check()
    return () => { controller.abort(); window.clearTimeout(timer) }
  }, [notificationsPath, notificationRevision])

  useEffect(() => {
    if (!account || workspaceLoading || inviteToken || !allowed) return
    if ((routeRole === 'RECRUITER' && role === 'ADMIN') || (!routeRole && role === 'ADMIN' && staffView && view !== 'home')) {
      const next = workspaceHref(view, role)
      if (!next.includes('#')) location.replace(next + location.search)
    }
  }, [account, workspaceLoading, inviteToken, allowed, role, routeRole, staffView, view])

  useEffect(() => {
    const updateView = () => {
      setFragment(window.location.hash)
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', updateView)
    return () => window.removeEventListener('hashchange', updateView)
  }, [])

  useEffect(() => {
    let active = true
    void api<Account | undefined>('/auth/session')
      .then(current => { if (active) { setWorkspaceLoading(!!current); setAccount(current ?? null) } })
      .catch(() => { if (active) setError('Could not check your session. Check that the app server is running and try again.') })
      .finally(() => { if (active) setSessionLoading(false) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!verifyToken || verificationStarted.current) return
    verificationStarted.current = true
    void api('/auth/verify-email', { method: 'POST', body: JSON.stringify({ token: verifyToken }) })
      .then(() => {
        setVerifyToken(null)
        window.history.replaceState({}, '', '/dashboard')
        setFragment('')
        setNotice('Email verified. You can sign in now.')
      })
      .catch((cause: unknown) => {
        setError(message(cause))
        setVerifyToken(null)
        window.history.replaceState({}, '', '/dashboard')
      })
  }, [verifyToken, setNotice])

  useEffect(() => {
    if (!account) return
    let active = true
    void Promise.all([api<{ account: Account; organizations: Organization[]; canCreateOrganizations: boolean }>('/me/workspaces'), api<Document[]>('/documents')])
      .then(([workspace, docs]) => {
        if (!active) return
        setCanCreateOrganizations(workspace.canCreateOrganizations)
        const orgs = workspace.organizations
        setOrganizations(orgs)
        setDocuments(docs)
        setSelectedOrgId(sessionStorage.getItem(`active-organization-${account.id}`) ?? '')
      })
      .catch((cause: unknown) => { if (active) setError(message(cause)) })
      .finally(() => { if (active) setWorkspaceLoading(false) })
    return () => { active = false }
  }, [account])

  function selectOrganization(id: string) {
    if (!account) return
    sessionStorage.setItem(`active-organization-${account.id}`, id)
    location.assign(route?.organizationId ? workspaceHref('organizations', 'ADMIN') : location.pathname)
  }

  useEffect(() => {
    if (!orgId || role !== 'ADMIN') return
    const controller = new AbortController()
    const options = { signal: controller.signal }
    const base = `/organizations/${orgId}`
    const reportError = (cause: unknown) => { if (!controller.signal.aborted) setError(message(cause)) }
    if (['home', 'admin', 'posted-jobs', 'recruiter-applications', 'hired-candidates',
      'organization-recruiters', 'organization-recruiter-jobs', 'organization-job-hires'].includes(activeView)) {
      void api<Member[]>(`${base}/members`, options).then(setMembers).catch(reportError)
    }
    if (activeView === 'home' || activeView === 'audit') {
      void api<AuditEvent[]>(`${base}/audit`, options).then(setAudit).catch(reportError)
    }
    if (activeView === 'policy') {
      void api<OrganizationPolicy>(`${base}/policy`, options).then(setPolicy).catch(reportError)
    }
    return () => controller.abort()
  }, [activeView, orgId, role])

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await action()
    } catch (cause) {
      setError(message(cause))
    } finally {
      setBusy(false)
    }
  }

  function submitAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const email = String(fields.get('email') || '')
    const password = String(fields.get('password') || '')
    const displayName = String(fields.get('displayName') || '')
    void run(async () => {
      if (mode === 'register') {
        await api<Account>('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, displayName }) })
        setResendEmail(email)
        setMode('login')
        setNotice('Account created. Open the verification email, then sign in.')
        return
      }
      const signedIn = await api<Account>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
      setWorkspaceLoading(true)
      setAccount(signedIn)

    })
  }

  function resendVerification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void run(async () => {
      await api('/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email: resendEmail }) })
      setNotice('If this account is waiting for verification, a new email was sent. Check your inbox.')
    })
  }

  function createOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const name = String(fields.get('name') || '')
    const slug = String(fields.get('slug') || '')
    void run(async () => {
      const created = await api<Organization>('/organizations', { method: 'POST', body: JSON.stringify({ name, slug }) })
      if (account) sessionStorage.setItem(`active-organization-${account.id}`, created.organizationId)
      location.assign(directoryHref(created.organizationId))
    })
  }

  function inviteMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    if (!selectedOrg) return
    const fields = new FormData(event.currentTarget)
    const email = String(fields.get('email') || '')
    const role = String(fields.get('role') || 'RECRUITER')
    void run(async () => {
      await api(`/organizations/${selectedOrg.organizationId}/invitations`, {
        method: 'POST', body: JSON.stringify({ email, role }),
      })
      setNotice(`Invitation sent to ${email}.`)
      form.reset()
    })
  }

  function acceptInvitation() {
    if (!inviteToken) return
    void run(async () => {
      const joined = await api<Organization>('/invitations/accept', {
        method: 'POST', body: JSON.stringify({ token: inviteToken }),
      })
      setInviteToken(null)
      window.history.replaceState({}, '', '/dashboard')
      setOrganizations((current) => [...current.filter((org) => org.organizationId !== joined.organizationId), joined])
      if (account) sessionStorage.setItem(`active-organization-${account.id}`, joined.organizationId)
      setSelectedOrgId(joined.organizationId)
      setMembers(undefined)
      setAudit([])
      setPolicy(null)
      setFragment('')
      setNotice(`You joined ${joined.name} as ${joined.role}.`)
    })
  }

  function uploadDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const fields = new FormData(form)
    void run(async () => {
      await api<Document>('/documents', { method: 'POST', body: fields })
      setDocuments(await api<Document[]>('/documents'))
      setNotice('Private document uploaded. Only your account can download it.')
      form.reset()
    })
  }

  function revokeMember(member: Member) {
    if (!selectedOrg || !window.confirm(`Revoke ${member.displayName}'s access to ${selectedOrg.name}?`)) return
    void run(async () => {
      await api(`/organizations/${selectedOrg.organizationId}/members/${member.id}`, { method: 'DELETE' })
      setMembers(await api<Member[]>(`/organizations/${selectedOrg.organizationId}/members`))
      setNotice(`${member.displayName}'s access was revoked.`)
    })
  }

  function savePolicy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedOrg) return
    const fields = new FormData(event.currentTarget)
    void run(async () => {
      setPolicy(await api<OrganizationPolicy>(`/organizations/${selectedOrg.organizationId}/policy`, {
        method: 'PUT', body: JSON.stringify({ reapplyCooldownDays: Number(fields.get('reapplyCooldownDays')),
          retentionDays: Number(fields.get('retentionDays')), aiEnabled: fields.get('aiEnabled') === 'on' }),
      }))
      setNotice('Organization policy saved. The reapplication rule takes effect now.')
    })
  }

  function signOut() {
    void run(async () => {
      await api('/auth/logout', { method: 'POST' })
      setAccount(null)
      setWorkspaceLoading(false)
      setOrganizations([])
      setUnread(undefined)
      setPolicy(null)
      setDocuments([])
      setMembers(undefined)
      setAudit([])
      setFragment('')
      if (!inviteToken) window.history.replaceState({}, '', '/dashboard')
      setCanCreateOrganizations(false)
    })
  }

  if (sessionLoading || workspaceLoading) return <ConnectedLayout><main className="pv-main" aria-busy="true"><p role="status">Opening your workspace…</p></main></ConnectedLayout>

  if (!account && (view !== 'candidate' || inviteToken || verifyToken || error || notice)) {
    const registering = mode === 'register'
    return <ConnectedAuthCard title={registering ? 'Create your account' : 'Sign in to your workspace'}
      description={registering ? 'Set up a candidate account or accept an invitation from a hiring team.' :
        'Use your account to track applications, review candidates, or manage hiring access.'}
      actions={<button type="button" className="pv-button" onClick={() => {setError('');setNotice('');setMode(registering ? 'login' : 'register')}}>
        {registering ? 'Sign in' : 'Create account'}
      </button>}>
      {error && <p className="alert error" role="alert">{error}</p>}
      {notice && <p className="alert success" role="status">{notice}</p>}
      {inviteToken && <p>Use the email address where you received the invitation.</p>}
      {verifyToken && <p role="status">Verifying your email…</p>}
      <form key={mode} onSubmit={submitAccount}>
        {registering && <label>Display name<input name="displayName" maxLength={160} required autoComplete="name" /></label>}
        <label>Email<input name="email" type="email" defaultValue={resendEmail} required autoComplete="email" /></label>
        <label>Password<input name="password" type="password" minLength={registering ? 12 : undefined}
          maxLength={registering ? 72 : undefined} required
          aria-describedby={registering ? 'password-hint' : undefined}
          autoComplete={registering ? 'new-password' : 'current-password'} />
          {registering && <small id="password-hint">Use at least 12 characters. The limit is 72 bytes.</small>}</label>
        <button type="submit" className="pv-button primary" disabled={busy}>
          {busy ? 'Please wait…' : registering ? 'Create account' : 'Sign in'}
        </button>
      </form>
      {!registering && <div className="live-auth-links">
        <a href="/dashboard/password-recovery">Forgot your password?</a>
        <details><summary>Resend verification email</summary><form onSubmit={resendVerification}>
          <label>Account email<input type="email" required value={resendEmail} onChange={event => setResendEmail(event.target.value)} /></label>
          <button type="submit" className="pv-button" disabled={busy}>Send verification email</button>
        </form></details>
      </div>}
    </ConnectedAuthCard>
  }

  return (
    <ConnectedLayout workspace={!!account} actions={!account && <a className="pv-button" href="/dashboard">Sign in</a>}>
      <div className="pv-body">
        <aside className="pv-sidebar">
          <div className="pv-org live-sidebar-name"><strong>{account ? firstName(account.displayName) : 'Public job board'}</strong></div>
          {role !== 'CANDIDATE' && selectedOrg && <div className="recruiter-organization">
            {roleOrganizations.length > 1 ? <label>Organization<select aria-label="Organization" value={selectedOrg.organizationId}
              onChange={event => selectOrganization(event.target.value)}>
              {roleOrganizations.map(org => <option key={org.organizationId} value={org.organizationId}>{org.name} · {org.role}</option>)}
            </select></label> : <span>{selectedOrg.name}</span>}
          </div>}
          <nav aria-label="Workspace navigation">
            {(account ? menu : ['candidate'] as View[]).map(target => {
              const badge = (target === 'updates' || target === 'recruiter-notifications') &&
                unread?.path === notificationsPath && unread.found
              return <a className="pv-nav-item" key={target} href={workspaceHref(target, role)}
                aria-current={activeMenuView === target ? 'page' : undefined}
                aria-description={badge ? 'Unread notifications' : undefined}>
                {target === 'home' || target === 'candidate-home' ? 'Dashboard' : target === 'profile' ? 'Profile' : viewTitles[target]}
                {badge && <span className="sidebar-unread" aria-hidden="true" />}
              </a>
            })}
          </nav>
          {account && <div className="pv-sidebar-bottom">
            <button type="button" className="pv-button" onClick={signOut} disabled={busy}>Sign out</button>
          </div>}
        </aside>
        <main className="pv-main">
          <div className="pv-page-heading">
            <h1>{dashboardView && account ? `Welcome, ${firstName(account.displayName)}` : viewTitles[activeView]}</h1>
          </div>
          {error && <p className="alert error" role="alert">{error}</p>}
          {notice && <p className="alert success" role="status">{notice}</p>}
          {!allowed && <p className="alert error" role="alert">This workspace page is unavailable for your active organization role.</p>}
          {account && dashboardView && <WorkspaceDashboard role={role} accountId={account.id} members={members ?? []}
            audit={audit} organization={role === 'CANDIDATE' ? undefined : selectedOrg} />}
          {account && activeView === 'invitation' && <section className="panel" aria-label="Accept invitation">
            <p>Invitations can only be accepted by the email they were sent to. You are signed in as {account.email}.</p>
            <div className="action-row">
              <button type="button" onClick={acceptInvitation} disabled={busy}>Accept invitation</button>
              <button type="button" className="quiet" onClick={signOut} disabled={busy}>Sign out to switch account</button>
            </div>
          </section>}
          {role === 'ADMIN' && activeView === 'create-organization' && canCreateOrganizations &&
            <CreateOrganizationPage busy={busy} onCreate={createOrganization} />}
          {role === 'ADMIN' && activeView === 'organizations' && <OrganizationsPage organizations={roleOrganizations} />}
          {selectedOrg && account && activeView === 'admin' && <TeamPage organization={selectedOrg} accountId={account.id}
            members={members} busy={busy} onInvite={inviteMember} onRevoke={revokeMember} />}
          {selectedOrg && activeView === 'policy' && <HiringPoliciesPage organization={selectedOrg} policy={policy} busy={busy} onSave={savePolicy} />}
          {selectedOrg && activeView === 'audit' && <AuditPage organization={selectedOrg} audit={audit} />}
          {selectedOrg && account && route?.organizationId && route.view === activeView && <>
            <nav aria-label="Organization directory" className="action-row">
              <a href={workspaceHref('organizations', 'ADMIN')}>Organizations</a>
              {route.recruiterId && <a href={directoryHref(selectedOrg.organizationId)}>{selectedOrg.name}</a>}
              {route.jobId && directoryRecruiter &&
                <a href={directoryHref(selectedOrg.organizationId, directoryRecruiter.id)}>{directoryRecruiter.displayName}’s jobs</a>}
            </nav>
            {activeView === 'organization-recruiters' ? <OrganizationRecruitersPage organization={selectedOrg} members={members} /> :
              !members ? <p role="status">Loading recruiter…</p> : !directoryRecruiter ?
                <p role="alert">This recruiter is unavailable in the organization.</p> : route.jobId ?
                  <RecruiterApplicationsPage organization={selectedOrg} accountId={account.id} hires
                    directory={{ recruiter: directoryRecruiter, jobId: route.jobId }} /> :
                  <PostedJobsPage organization={selectedOrg} directoryRecruiter={directoryRecruiter} />}
          </>}
            {account && activeView === 'documents' && <section className="panel" aria-labelledby="documents-heading">
              <h2 id="documents-heading">Your private documents</h2>
              <p>Documents here belong to your account. Organization members cannot download them from this page.</p>
              <form className="inline-form" onSubmit={uploadDocument}>
                <label>Choose PDF, DOCX, or TXT<input name="file" type="file" accept=".pdf,.docx,.txt" required /></label>
                <button type="submit" disabled={busy}>Upload document</button>
              </form>
              <ul className="list">{documents.map((document) => <li key={document.id}>
                <span>{document.filename} · {(document.byteSize / 1024).toFixed(1)} KB</span>
                <a href={`/api/v1/documents/${document.id}`}>Download</a>
              </li>)}</ul>
            </section>}
        {selectedOrg && activeView === 'posted-jobs' && <PostedJobsPage key={selectedOrg.organizationId} organization={selectedOrg} members={members} />}
        {selectedOrg && activeView === 'post-job' && <PostJobPage key={selectedOrg.organizationId} organization={selectedOrg} />}
        {selectedOrg && account && activeView === 'recruiter-applications' && <RecruiterApplicationsPage key={selectedOrg.organizationId} organization={selectedOrg} accountId={account.id} members={members} />}
        {selectedOrg && account && activeView === 'hired-candidates' && <RecruiterApplicationsPage key={selectedOrg.organizationId + ':hires'} organization={selectedOrg} accountId={account.id} members={members} hires />}
        {selectedOrg && activeView === 'recruiter-notifications' && <RecruiterNotificationsPage key={selectedOrg.organizationId} organization={selectedOrg} onRead={() => setNotificationRevision(value => value + 1)} />}
        {selectedOrg && activeView === 'batch-screening' && <BatchScreeningPage key={selectedOrg.organizationId} organization={selectedOrg} />}
        {selectedOrg && account && activeView === 'team-chat' && <TeamChatPage key={selectedOrg.organizationId} organization={selectedOrg} accountId={account.id} />}
        {isCandidateSection(activeView) && <CandidateWorkspace key={account?.id || 'guest'} account={account} documents={documents}
          section={activeView} jobId={jobId} onNotificationRead={() => setNotificationRevision(value => value + 1)} onDocumentAdded={(document) => setDocuments(current => [document, ...current])}
          onSignIn={() => { window.location.hash = 'home' }} />}
        </main>
      </div>
    </ConnectedLayout>
  )
}

function message(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Something went wrong. Please try again.'
}

export default App
