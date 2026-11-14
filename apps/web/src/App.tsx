import { useEffect, useState, type FormEvent } from 'react'
import { api, type Account, type AuditEvent, type Document, type Member, type Organization } from './api'
import './App.css'

type ApiStatus = 'checking' | 'ready' | 'unavailable'

async function getApiStatus(): Promise<ApiStatus> {
  try {
    const result = await api<{ status: string }>('/system/status')
    return result.status === 'ready' ? 'ready' : 'unavailable'
  } catch {
    return 'unavailable'
  }
}

function App() {
  const [status, setStatus] = useState<ApiStatus>('checking')
  const [account, setAccount] = useState<Account | null>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [selectedOrgId, setSelectedOrgId] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  const [audit, setAudit] = useState<AuditEvent[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [inviteToken, setInviteToken] = useState(new URLSearchParams(window.location.search).get('token'))
  const [verifyToken, setVerifyToken] = useState(new URLSearchParams(window.location.search).get('verify'))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const selectedOrg = organizations.find((org) => org.organizationId === selectedOrgId)

  useEffect(() => {
    void getApiStatus().then(setStatus)
    void api<Account>('/me').then(setAccount).catch(() => setAccount(null))
  }, [])

  useEffect(() => {
    if (!verifyToken) return
    void api('/auth/verify-email', { method: 'POST', body: JSON.stringify({ token: verifyToken }) })
      .then(() => {
        setVerifyToken(null)
        window.history.replaceState({}, '', '/')
        setNotice('Email verified. You can sign in now.')
      })
      .catch((cause: unknown) => setError(message(cause)))
  }, [verifyToken])

  useEffect(() => {
    if (!account) return
    void Promise.all([api<Organization[]>('/organizations'), api<Document[]>('/documents')])
      .then(([orgs, docs]) => {
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
    ]).then(([nextMembers, nextAudit]) => {
      setMembers(nextMembers)
      setAudit(nextAudit)
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
        setMode('login')
        setNotice('Account created. Open the verification email in Mailpit at localhost:8025, then sign in.')
        return
      }
      const signedIn = await api<Account>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
      setAccount(signedIn)
      setNotice(`Signed in as ${signedIn.displayName}`)
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
      setNotice(`Invitation sent to ${email}. Open Mailpit at localhost:8025 to see it locally.`)
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
      window.history.replaceState({}, '', '/')
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

  function signOut() {
    void run(async () => {
      await api('/auth/logout', { method: 'POST' })
      setAccount(null)
      setOrganizations([])
      setDocuments([])
      setMembers([])
      setAudit([])
      setNotice('Signed out.')
    })
  }

  return (
    <main className="page">
      <div className="shell">
        <header className="topbar">
          <span className="eyebrow">AI Resume Analyser · rebuild</span>
          {account && <button type="button" className="quiet" onClick={signOut} disabled={busy}>Sign out</button>}
        </header>
        <h1>A clearer hiring experience starts here.</h1>
        <p className="intro">Phase 4 adds secure accounts, organization access, invitations, and private documents.
          Hiring workflows arrive in the next phases.</p>
        <section className="status-card" aria-labelledby="status-heading">
          <div>
            <h2 id="status-heading">System connection</h2>
            <p aria-live="polite" className={`status status-${status}`}>
              {status === 'checking' && 'Checking the API and database…'}
              {status === 'ready' && 'Ready · API and database are connected'}
              {status === 'unavailable' && 'Unavailable · Start the API and database, then try again'}
            </p>
          </div>
          <button type="button" onClick={() => { setStatus('checking'); void getApiStatus().then(setStatus) }}
            disabled={status === 'checking'}>Check again</button>
        </section>

        {error && <p className="alert error" role="alert">{error}</p>}
        {notice && <p className="alert success" role="status">{notice}</p>}

        {!account ? (
          <section className="panel narrow" aria-labelledby="account-heading">
            <div className="section-heading">
              <h2 id="account-heading">{mode === 'login' ? 'Sign in' : 'Create an account'}</h2>
              <button type="button" className="text-button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
                {mode === 'login' ? 'Create an account' : 'I have an account'}
              </button>
            </div>
            {inviteToken && <p>Sign in or register with the email that received the invitation. You can accept it afterward.</p>}
            {verifyToken && <p>Checking your email verification link…</p>}
            <form onSubmit={submitAccount}>
              {mode === 'register' && <label>Display name<input name="displayName" maxLength={160} required autoComplete="name" /></label>}
              <label>Email<input name="email" type="email" required autoComplete="email" /></label>
              <label>Password<input name="password" type="password" minLength={mode === 'register' ? 12 : undefined}
                required autoComplete={mode === 'register' ? 'new-password' : 'current-password'} /></label>
              <button type="submit" disabled={busy}>{mode === 'login' ? 'Sign in' : 'Create account'}</button>
            </form>
          </section>
        ) : (
          <div className="workspace">
            <section className="panel" aria-labelledby="account-heading">
              <div className="section-heading"><h2 id="account-heading">Welcome, {account.displayName}</h2><span>{account.email}</span></div>
              {inviteToken && <div className="invite-banner"><p>You have an organization invitation for this email.</p>
                <button type="button" onClick={acceptInvitation} disabled={busy}>Accept invitation</button></div>}
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
            </section>

            {selectedOrg?.role === 'ADMIN' && <section className="panel" aria-labelledby="members-heading">
              <h2 id="members-heading">Manage {selectedOrg.name}</h2>
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

            <section className="panel" aria-labelledby="documents-heading">
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
            </section>
          </div>
        )}
        <p className="note">The legacy application remains in its original folders during the rebuild.</p>
      </div>
    </main>
  )
}

function message(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Something went wrong. Please try again.'
}

export default App
