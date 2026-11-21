import { useEffect, useRef, useState, type FormEvent } from 'react'
import { api, type Account, type AuditEvent, type Document, type Member, type Organization,
  type OrganizationPolicy } from './api'
import { CandidateWorkspace } from './CandidateWorkspace'
import { JobPublisher } from './JobPublisher'
import { ConnectedAuthCard, ConnectedLayout } from './ConnectedLayout'

type View = 'home' | 'candidate' | 'recruiter' | 'admin' | 'documents'

function currentView(): View {
  const value = window.location.hash.slice(1)
  return ['home', 'candidate', 'recruiter', 'admin', 'documents'].includes(value) ? value as View : 'home'
}

function App() {
  const [sessionLoading, setSessionLoading] = useState(true)
  const [view, setView] = useState<View>(currentView)
  const [account, setAccount] = useState<Account | null>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [selectedOrgId, setSelectedOrgId] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  const [audit, setAudit] = useState<AuditEvent[]>([])
  const [policy, setPolicy] = useState<OrganizationPolicy | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [jobsVersion, setJobsVersion] = useState(0)
  const [mode, setMode] = useState<'login' | 'register'>(()=>new URLSearchParams(location.search).get('mode') === 'register' ? 'register' : 'login')
  const [resendEmail, setResendEmail] = useState('')
  const [inviteToken, setInviteToken] = useState(new URLSearchParams(window.location.search).get('token'))
  const [verifyToken, setVerifyToken] = useState(new URLSearchParams(window.location.search).get('verify'))
  const verificationStarted = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const selectedOrg = organizations.find((org) => org.organizationId === selectedOrgId)

  useEffect(() => {
    const updateView = () => setView(currentView())
    window.addEventListener('hashchange', updateView)
    return () => window.removeEventListener('hashchange', updateView)
  }, [])

  useEffect(() => {
    let active = true
    void api<Account | undefined>('/auth/session')
      .then(current => { if (active) setAccount(current ?? null) })
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
        window.history.replaceState({}, '', '/connected')
        setNotice('Email verified. You can sign in now.')
      })
      .catch((cause: unknown) => {
        setError(message(cause))
        setVerifyToken(null)
        window.history.replaceState({}, '', '/connected')
      })
  }, [verifyToken])

  useEffect(() => {
    if (!account) return
    void Promise.all([api<{ account: Account; organizations: Organization[] }>('/me/workspaces'), api<Document[]>('/documents')])
      .then(([workspace, docs]) => {
        const orgs = workspace.organizations
        setOrganizations(orgs)
        setDocuments(docs)
        setSelectedOrgId((current) => orgs.some((org) => org.organizationId === current)
          ? current : (orgs[0]?.organizationId || ''))
      })
      .catch((cause: unknown) => setError(message(cause)))
  }, [account])

  useEffect(() => {
    if (!selectedOrgId || selectedOrg?.role !== 'ADMIN') return
    void Promise.all([
      api<Member[]>(`/organizations/${selectedOrgId}/members`),
      api<AuditEvent[]>(`/organizations/${selectedOrgId}/audit`),
      api<OrganizationPolicy>(`/organizations/${selectedOrgId}/policy`),
    ]).then(([nextMembers, nextAudit, nextPolicy]) => {
      setMembers(nextMembers)
      setAudit(nextAudit)
      setPolicy(nextPolicy)
    }).catch((cause: unknown) => setError(message(cause)))
  }, [selectedOrgId, selectedOrg?.role])

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
      setAccount(signedIn)
      setNotice(`Signed in as ${signedIn.displayName}`)
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
    const form = event.currentTarget
    const fields = new FormData(event.currentTarget)
    const name = String(fields.get('name') || '')
    const slug = String(fields.get('slug') || '')
    void run(async () => {
      const created = await api<Organization>('/organizations', { method: 'POST', body: JSON.stringify({ name, slug }) })
      setOrganizations((current) => [...current, created])
      setSelectedOrgId(created.organizationId)
      setNotice(`${created.name} created. You are its Admin.`)
      form.reset()
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
      setAudit(await api<AuditEvent[]>(`/organizations/${selectedOrg.organizationId}/audit`))
    })
  }

  function acceptInvitation() {
    if (!inviteToken) return
    void run(async () => {
      const joined = await api<Organization>('/invitations/accept', {
        method: 'POST', body: JSON.stringify({ token: inviteToken }),
      })
      setInviteToken(null)
      window.history.replaceState({}, '', '/connected')
      setOrganizations((current) => [...current.filter((org) => org.organizationId !== joined.organizationId), joined])
      setSelectedOrgId(joined.organizationId)
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
      setAudit(await api<AuditEvent[]>(`/organizations/${selectedOrg.organizationId}/audit`))
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
      setOrganizations([])
      setDocuments([])
      setMembers([])
      setAudit([])
      setView('home')
      if (!inviteToken) window.history.replaceState({}, '', '/connected')
      setNotice('Signed out.')
    })
  }

  if (sessionLoading) return <ConnectedLayout><main className="pv-main" aria-busy="true"><p role="status">Checking your session…</p></main></ConnectedLayout>

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
        <a href="/connected/password-recovery">Forgot your password?</a>
        <details><summary>Resend verification email</summary><form onSubmit={resendVerification}>
          <label>Account email<input type="email" required value={resendEmail} onChange={event => setResendEmail(event.target.value)} /></label>
          <button type="submit" className="pv-button" disabled={busy}>Send verification email</button>
        </form></details>
      </div>}
    </ConnectedAuthCard>
  }

  return (
    <ConnectedLayout actions={account ? <button type="button" className="pv-button" onClick={signOut} disabled={busy}>Sign out</button> : <a className="pv-button" href="/connected">Sign in</a>}>
      <div className="pv-body">
        <aside className="pv-sidebar">
          <div className="pv-org"><span className="pv-symbol" aria-hidden="true">{selectedOrg?.name.slice(0,2).toUpperCase() ?? 'AI'}</span>
            <div><strong>{selectedOrg?.name ?? 'Your workspace'}</strong><small>{account?.displayName ?? 'Public job board'}</small></div>
          </div>
          <nav aria-label="Workspace navigation">
            {([['home', 'Overview'], ['candidate', 'Find jobs & applications'],
              ...(selectedOrg ? [['recruiter', 'Recruiter workspace']] : []),
              ...(selectedOrg?.role === 'ADMIN' ? [['admin', 'Admin workspace']] : []),
              ...(account ? [['documents', 'My documents']] : [])] as [View, string][]).map(([target, label]) =>
              <a className="pv-nav-item" key={target} href={`#${target}`} aria-current={view === target ? 'page' : undefined}>{label}</a>)}
          </nav>
        </aside>
        <main className="pv-main">
          <div className="pv-page-heading">
            <h1>{({ home: 'Workspace overview', candidate: 'Find jobs & applications', recruiter: 'Recruiter workspace',
              admin: 'Admin workspace', documents: 'My documents' } as Record<View, string>)[view]}</h1>
          </div>
          {error && <p className="alert error" role="alert">{error}</p>}
          {notice && <p className="alert success" role="status">{notice}</p>}
          {account && <div className="live-workspace">
            {view === 'home' &&
            <section className="panel" aria-labelledby="account-heading">
              <div className="section-heading"><h2 id="account-heading">Welcome, {account.displayName}</h2><span>{account.email}</span></div>
              {inviteToken && <div className="invite-banner">
                <p>Invitations can only be accepted by the email they were sent to. You are signed in as {account.email}.</p>
                <button type="button" onClick={acceptInvitation} disabled={busy}>Accept invitation</button>{' '}
                <button type="button" className="quiet" onClick={signOut} disabled={busy}>Sign out to switch account</button>
              </div>}
              <h3>Your organizations</h3>
              {organizations.length === 0 ? <p>You have not joined an organization yet. You can create one below or accept an invitation.</p> : (
                <label>Active organization<select value={selectedOrgId} onChange={(event) => setSelectedOrgId(event.target.value)}>
                  {organizations.map((org) => <option key={org.organizationId} value={org.organizationId}>
                    {org.name} · {org.role}
                  </option>)}
                </select></label>
              )}
              <form className="inline-form" onSubmit={createOrganization}>
                <label>Organization name<input name="name" placeholder="Example Hiring Team" required maxLength={200} /></label>
                <label>URL slug<input name="slug" placeholder="example-hiring-team" pattern="[a-z0-9]+(-[a-z0-9]+)*" required maxLength={80} /></label>
                <button type="submit" disabled={busy}>Create organization</button>
              </form>
            </section>}

            {view === 'admin' && selectedOrg?.role === 'ADMIN' && <section className="panel" aria-labelledby="members-heading">
              <h2 id="members-heading">Manage {selectedOrg.name}</h2>
              {policy && <form key={selectedOrg.organizationId} onSubmit={savePolicy}>
                <h3>Organization policy</h3>
                <div className="field-grid">
                  <label>Days before a candidate can reapply to the same job<input name="reapplyCooldownDays"
                    type="number" min="0" max="365" required defaultValue={policy.reapplyCooldownDays} /></label>
                  <label>Retention review period (days)<input name="retentionDays" type="number" min="30" max="3650"
                    required defaultValue={policy.retentionDays} /></label>
                </div>
                <label><input name="aiEnabled" type="checkbox" defaultChecked={policy.aiEnabled} /> Allow AI assistance for this organization</label>
                <p>The retention period is a policy record. Deletion requests still require human review; data is never erased automatically.</p>
                <button type="submit" disabled={busy}>Save policy</button>
              </form>}
              <form className="inline-form" onSubmit={inviteMember}>
                <label>Invite email<input name="email" type="email" required /></label>
                <label>Role<select name="role"><option value="RECRUITER">Recruiter</option><option value="ADMIN">Admin</option></select></label>
                <button type="submit" disabled={busy}>Send invitation</button>
              </form>
              <h3>Members</h3>
              <ul className="list">{members.map((member) => <li key={member.id}>
                <span>{member.displayName} · {member.email} · {member.role} · {member.status}</span>
                {member.id !== account.id && member.status === 'ACTIVE' &&
                  <button type="button" className="quiet" onClick={() => revokeMember(member)} disabled={busy}>Revoke</button>}
              </li>)}</ul>
              <h3>Recent access changes</h3>
              <ul className="list">{audit.slice(0, 8).map((event) => <li key={event.id}>
                {event.action} · {event.targetType} · {new Date(event.createdAt).toLocaleString()}
              </li>)}</ul>
            </section>}

            {view === 'documents' && <section className="panel" aria-labelledby="documents-heading">
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
          </div>}
        {view === 'recruiter' && selectedOrg && <JobPublisher key={selectedOrg.organizationId} organization={selectedOrg}
          onPublished={() => setJobsVersion((current) => current + 1)} />}
        {view === 'candidate' && <CandidateWorkspace key={account?.id || 'guest'} account={account} documents={documents} jobsVersion={jobsVersion}
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
