import { useEffect, useRef, useState, type FormEvent } from 'react'
import { api, type Organization } from './api'
import { routeId } from './recruiterSearch'

type Person = { id: string; displayName: string; role: 'ADMIN' | 'RECRUITER' }
type Message = { id: string; senderId: string; senderName: string; body: string; sentAt: string }
type MessagePage = { items: Message[]; hasOlder: boolean }

function mergeMessages(current: Message[], incoming: Message[]) {
  return [...new Map([...current, ...incoming].map(message => [message.id, message])).values()]
    .sort((left, right) => left.id.length - right.id.length || left.id.localeCompare(right.id))
}

export function TeamChatPage({ organization, accountId }: { organization: Organization; accountId: string }) {
  const [people, setPeople] = useState<Person[]>()
  const [personId, setPersonId] = useState(() => routeId(new URLSearchParams(location.search).get('person')))
  const [error, setError] = useState('')
  const base = `/organizations/${organization.organizationId}/chat`

  useEffect(() => {
    const controller = new AbortController()
    void api<Person[]>(`${base}/people`, { signal: controller.signal }).then(setPeople)
      .catch((cause: Error) => { if (!controller.signal.aborted) setError(cause.message) })
    return () => controller.abort()
  }, [base])

  const person = people?.find(item => item.id === personId)
  return <section className="panel" aria-label="Hiring team conversations">
    <div className="section-heading"><h2>{organization.name}</h2>
      <label>Conversation<select aria-label="Conversation" value={personId} onChange={event => setPersonId(event.target.value)}>
        <option value="">Team room</option>
        {personId && !person && <option value={personId} disabled>{people ? 'Teammate unavailable' : 'Loading teammate…'}</option>}
        {people?.map(item => <option key={item.id} value={item.id}>{item.displayName} · {item.role === 'ADMIN' ? 'Admin' : 'Recruiter'}</option>)}
      </select></label>
    </div>
    {error && <p role="alert">Could not load teammates. {error}</p>}
    {personId && !person ? <p role="status">{people ? 'Choose another conversation.' : 'Loading conversation…'}</p> :
      <ChatThread key={personId} base={base} person={person} accountId={accountId} />}
  </section>
}

function ChatThread({ base, person, accountId }: { base: string; person?: Person; accountId: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [hasOlder, setHasOlder] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [reading, setReading] = useState(false)
  const [sending, setSending] = useState(false)
  const [connectionError, setConnectionError] = useState('')
  const [actionError, setActionError] = useState('')
  const [body, setBody] = useState('')
  const newestSeen = useRef('')
  const scrollArea = useRef<HTMLDivElement>(null)
  const keepAtBottom = useRef(true)
  const params = new URLSearchParams(person ? { person: person.id } : {})
  const request = `${base}/messages?${params}`

  useEffect(() => {
    const controller = new AbortController()
    let timer: number
    async function poll() {
      const cursor = newestSeen.current
      try {
        const result = await api<MessagePage>(cursor ? `${request}&after=${cursor}` : request, { signal: controller.signal })
        if (controller.signal.aborted) return
        if (result.items.length) setMessages(current => mergeMessages(current, result.items))
        if (!cursor) setHasOlder(result.hasOlder)
        newestSeen.current = (cursor ? result.items.at(-1) : result.items[0])?.id ?? cursor
        setLoaded(true)
        setConnectionError('')
      } catch (cause) {
        if (!controller.signal.aborted) setConnectionError(cause instanceof Error ? cause.message : 'Chat connection interrupted.')
      } finally {
        if (!controller.signal.aborted) timer = window.setTimeout(poll, 4_000)
      }
    }
    void poll()
    return () => { controller.abort(); window.clearTimeout(timer) }
  }, [request])

  useEffect(() => {
    if (keepAtBottom.current && scrollArea.current) scrollArea.current.scrollTop = scrollArea.current.scrollHeight
  }, [messages])

  async function loadOlder() {
    if (!messages.length) return
    setReading(true)
    setActionError('')
    try {
      const result = await api<MessagePage>(`${request}&before=${messages[0].id}`)
      keepAtBottom.current = false
      setMessages(current => mergeMessages(current, result.items))
      setHasOlder(result.hasOlder)
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Could not load earlier messages.')
    } finally { setReading(false) }
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!body.trim() || sending) return
    setSending(true)
    setActionError('')
    try {
      const message = await api<Message>(`${base}/messages`, {
        method: 'POST', body: JSON.stringify({ person: person?.id, body: body.trim() }),
      })
      keepAtBottom.current = true
      setMessages(current => mergeMessages(current, [message]))
      setBody('')
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Could not send your message.')
    } finally { setSending(false) }
  }

  return <div className="team-chat-thread">
    <p>{person ? `Direct conversation with ${person.displayName}.` : 'Visible to active admins and recruiters in this organization.'}</p>
    {connectionError && <p role="alert" className="alert error">{connectionError} Chat will retry automatically.</p>}
    {actionError && <p role="alert" className="alert error">{actionError}</p>}
    {hasOlder && <button className="quiet" disabled={reading} onClick={() => void loadOlder()}>Load older messages</button>}
    <div className="team-chat-history" ref={scrollArea} tabIndex={0} aria-label="Conversation history"
      onScroll={event => {
        const area = event.currentTarget
        keepAtBottom.current = area.scrollHeight - area.scrollTop - area.clientHeight < 48
      }}>
      {!loaded && !connectionError && <p role="status">Loading conversation…</p>}
      {loaded && !messages.length && <p>No messages here yet. Start the conversation below.</p>}
      <ol className="team-chat-messages" role="log" aria-label="Messages" aria-relevant="additions">
        {messages.map(message => <li key={message.id} className={message.senderId === accountId ? 'own-message' : undefined}>
          <div><strong>{message.senderId === accountId ? 'You' : message.senderName}</strong>
            <time dateTime={message.sentAt}>{new Date(message.sentAt).toLocaleString()}</time></div>
          <p className="preserve-lines">{message.body}</p>
        </li>)}
      </ol>
    </div>
    <form onSubmit={send}>
      <label><span id="chat-message-label">Message</span><textarea aria-labelledby="chat-message-label" value={body} onChange={event => setBody(event.target.value)} required maxLength={2000} disabled={sending} /></label>
      <button type="submit" disabled={sending || !body.trim()}>Send message</button>
    </form>
  </div>
}
