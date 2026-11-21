import { useState, type FormEvent } from 'react'
import { api } from './api'
import { ConnectedAuthCard } from './ConnectedLayout'

export function PasswordRecovery() {
  const [token] = useState(() => new URLSearchParams(location.search).get('token'))
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const password = String(form.get('password') ?? '')
    if (token && password !== form.get('confirmation')) {
      setError('The passwords do not match.')
      return
    }
    setError('')
    setBusy(true)
    try {
      await api(token ? '/auth/password-reset/confirm' : '/auth/password-reset/request', {
        method: 'POST',
        body: JSON.stringify(token ? { token, password } : { email: form.get('email') }),
      })
      if (token) history.replaceState(null, '', '/connected/password-recovery')
      setDone(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not complete the request.')
    } finally {
      setBusy(false)
    }
  }
  return <ConnectedAuthCard title={token ? 'Choose a new password' : 'Recover your account'}
    description={token ? 'Enter a new password, then sign in again.' : 'Enter the email address you use to sign in.'}
    actions={<a className="pv-button" href="/connected">Sign in</a>}>
      {error && <p className="alert error" role="alert">{error}</p>}
      {done ? <p role="status">{token ? 'Your password was changed. Sign in with your new password.' :
        'If your account is eligible, a reset link will arrive by email. Check Mailpit when running locally.'}</p> :
        <form onSubmit={submit}>
          {token ? <>
            <label>New password<input name="password" type="password" minLength={12} maxLength={72} autoComplete="new-password" required /></label>
            <label>Confirm password<input name="confirmation" type="password" minLength={12} maxLength={72} autoComplete="new-password" required /></label>
          </> : <label>Account email<input name="email" type="email" autoComplete="email" required /></label>}
          <button type="submit" className="pv-button primary" disabled={busy}>{token ? 'Change password' : 'Send reset link'}</button>
        </form>}
      <p className="live-auth-links"><a href="/connected">Back to sign in</a>{token && !done && <> · <a href="/connected/password-recovery">Request a new link</a></>}</p>
    </ConnectedAuthCard>
}
