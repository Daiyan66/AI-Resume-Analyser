import { useEffect, useState } from 'react'
import { api, type Organization, type Page } from './api'
import { RecruiterPagination } from './RecruiterPagination'
import { pageIndex } from './recruiterSearch'
import { recruiterRoutes } from './workspaceNavigation'

type Notification = {
  key: string; kind: 'submitted' | 'withdrawn' | 'chat'; applicationId: string | null; jobId: string | null
  personId: string | null; actor: string; subject: string | null; happenedAt: string; read: boolean
}

const path = recruiterRoutes['recruiter-notifications']

function destination(item: Notification) {
  if (item.kind === 'chat') return recruiterRoutes['team-chat'] + (item.personId ? `?person=${item.personId}` : '')
  return `${recruiterRoutes['recruiter-applications']}?reviewJob=${item.jobId}&application=${item.applicationId}`
}

export function RecruiterNotificationsPage({ organization }: { organization: Organization }) {
  const params = new URLSearchParams(location.search)
  const index = pageIndex(params.get('page'))
  const unread = params.get('unread') === 'true'
  const base = `/organizations/${organization.organizationId}/recruiter-notifications`
  const request = `${base}?page=${index}&unread=${unread}`
  const [data, setData] = useState<Page<Notification>>()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    void api<Page<Notification>>(request, { signal: controller.signal }).then(setData)
      .catch((cause: Error) => { if (!controller.signal.aborted) setError(cause.message) })
    return () => controller.abort()
  }, [request, refresh])

  async function markRead(item: Notification) {
    setBusy(item.key)
    setError('')
    try {
      await api(`${base}/${item.key}/read`, { method: 'PUT' })
      setRefresh(value => value + 1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not mark the notification as read.')
    } finally { setBusy('') }
  }

  return <section className="panel" aria-label="Hiring notifications">
    <div className="section-heading"><h2>{organization.name}</h2>
      <div className="action-row">
        <a className={`pv-button ${!unread ? 'primary' : ''}`} href={path} aria-current={!unread ? 'page' : undefined}>All notifications</a>
        <a className={`pv-button ${unread ? 'primary' : ''}`} href={`${path}?unread=true`} aria-current={unread ? 'page' : undefined}>Unread</a>
        <button className="quiet" onClick={() => { setError(''); setRefresh(value => value + 1) }}>Refresh</button>
      </div>
    </div>
    {error && <p className="alert error" role="alert">{error}</p>}
    {!data ? !error && <p role="status">Loading notifications…</p> : !data.items.length ?
      <p>{unread ? 'No unread notifications here.' : 'No notifications here.'}</p> :
      <ul className="list">{data.items.map(item => <li key={item.key}>
        <div><strong>{item.kind === 'chat' ? (item.personId ? 'Direct message' : 'Team message') :
          item.kind === 'submitted' ? 'New application' : 'Application withdrawn'}</strong>
          {!item.read && <> <span className="pv-pill">Unread</span></>}
          <br />{item.actor}{item.subject && ` · ${item.subject}`} · <time dateTime={item.happenedAt}>{new Date(item.happenedAt).toLocaleString()}</time>
        </div>
        <div className="action-row">
          <a className="pv-button" href={destination(item)}>{item.kind === 'chat' ? 'Open chat' : 'View application'}</a>
          {!item.read && <button className="quiet" disabled={!!busy} onClick={() => void markRead(item)}>Mark read</button>}
        </div>
      </li>)}</ul>}
    {data && <RecruiterPagination result={data} path={path} filters={new URLSearchParams({ unread: String(unread) })} noun="notifications" />}
  </section>
}
