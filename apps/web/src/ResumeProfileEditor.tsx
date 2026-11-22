import { useState, type FormEvent } from 'react'
import { api, type CandidateProfile, type Document } from './api'
import { resumeProfile } from './resumeProfile'

const maxFileBytes = 2_000_000
const maxTextLength = 20_000
const formats = /\.(pdf|docx|txt)$/i

export function ResumeProfileEditor({ documents, onDocumentAdded, onAutofill, profileReady }: {
  documents: Document[]
  onDocumentAdded: (document: Document) => void
  onAutofill: (fields: Partial<CandidateProfile>) => void
  profileReady: boolean
}) {
  const [file, setFile] = useState<File | null>(null)
  const [selectedId, setSelectedId] = useState('')
  const [draft, setDraft] = useState<{ filename: string; text: string; savedText: string }>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const editableDocuments = documents.filter(document => formats.test(document.filename) && document.byteSize <= maxFileBytes)
  const unsaved = !!draft && draft.text !== draft.savedText

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError('')
    setNotice('')
    try { await action() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'The résumé could not be processed.') }
    finally { setBusy(false) }
  }

  async function storeFile(file: File) {
    const body = new FormData()
    body.set('file', file)
    const document = await api<Document>('/documents', { method: 'POST', body })
    onDocumentAdded(document)
    setSelectedId(document.id)
    return document
  }

  function autofill(text: string) {
    const fields = resumeProfile(text)
    const names = Object.keys(fields)
    if (!names.length) {
      setNotice('No profile fields were recognized. You can enter them manually or add section headings such as Summary, Skills, Experience, and Education in the editor.')
      return
    }
    onAutofill(fields)
    setNotice(`Filled ${names.join(', ')}. Review the fields below and select Save profile.`)
  }

  async function openDocument(document: Document, fillProfile: boolean) {
    const { text } = await api<{ text: string }>(`/documents/${document.id}/text`)
    setDraft({ filename: document.filename, text, savedText: text })
    setSelectedId(document.id)
    if (fillProfile) autofill(text)
  }

  function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!file) return
    if (!formats.test(file.name) || !file.size || file.size > maxFileBytes) {
      setNotice('')
      setError('Choose a nonempty PDF, DOCX, or TXT file up to 2 MB.')
      return
    }
    if (unsaved && !window.confirm('Replace your unsaved résumé edits?')) return
    const form = event.currentTarget
    void run(async () => {
      const document = await storeFile(file)
      setFile(null)
      form.reset()
      try { await openDocument(document, true) }
      catch { setError('Your file was uploaded. Its text could not be read. Try a text-based PDF, DOCX, or UTF-8 TXT file.') }
    })
  }

  function editDocument() {
    const document = editableDocuments.find(item => item.id === selectedId)
    if (!document || (unsaved && !window.confirm('Replace your unsaved résumé edits?'))) return
    void run(() => openDocument(document, false))
  }

  function saveEditedResume() {
    if (!draft?.text.trim() || !unsaved) return
    void run(async () => {
      const base = draft.filename.replace(formats, '').replace(/-edited$/, '').slice(0, 235)
      const filename = `${base || 'resume'}-edited.txt`
      const text = draft.text.trim()
      await storeFile(new File([text], filename, { type: 'text/plain' }))
      setDraft({ filename, text, savedText: text })
      setNotice('Edited résumé saved to My documents. You can attach it to a new application.')
    })
  }

  return <section className="panel resume-profile" aria-labelledby="resume-heading">
    <h2 id="resume-heading">Résumé</h2>
    <p>Use a text-based PDF, DOCX, or TXT up to 2 MB. Uploading fills recognized profile fields for you to review.</p>
    <form className="inline-form candidate-filters" onSubmit={upload}>
      <label>Upload résumé<input type="file" accept=".pdf,.docx,.txt" required disabled={busy}
        onChange={event => setFile(event.target.files?.[0] ?? null)} /></label>
      <button type="submit" disabled={busy || !profileReady}>Upload and autofill</button>
    </form>
    {editableDocuments.length > 0 && <div className="inline-form resume-existing">
      <label>Saved résumé<select value={selectedId} onChange={event => setSelectedId(event.target.value)} disabled={busy}>
        <option value="">Choose a document</option>
        {editableDocuments.map(document => <option key={document.id} value={document.id}>
          {document.filename} · {new Date(document.createdAt).toLocaleString()}
        </option>)}
      </select></label>
      <button type="button" className="quiet" onClick={editDocument} disabled={busy || !selectedId}>Edit selected résumé</button>
    </div>}
    {busy && <p role="status">Processing résumé…</p>}
    {error && <p className="alert error" role="alert">{error}</p>}
    {notice && <p className="alert success" role="status">{notice}</p>}
    {draft && <div className="job-detail">
      <label><span id="resume-text-label">Edit résumé text</span>
        <textarea aria-labelledby="resume-text-label" value={draft.text} maxLength={maxTextLength} disabled={busy}
        onChange={event => setDraft({ ...draft, text: event.target.value })} /></label>
      <p>Editing {draft.filename}. Saving creates a separate TXT copy and keeps the original file and prior applications intact.</p>
      <div className="action-row">
        <button type="button" onClick={saveEditedResume} disabled={busy || !unsaved || !draft.text.trim()}>Save edited résumé</button>
        <button type="button" className="quiet" disabled={busy || !profileReady || !draft.text.trim()}
          onClick={() => { setError(''); autofill(draft.text) }}>Autofill profile from text</button>
      </div>
    </div>}
  </section>
}
