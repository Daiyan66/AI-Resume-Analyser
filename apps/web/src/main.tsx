import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import Preview from './preview/Preview.tsx'
import { PasswordRecovery } from './PasswordRecovery.tsx'

import { recruiterRoutes, recruiterView } from './workspaceNavigation'

// Keep previously shared sign-in, recovery, and recruiter links usable.
if (/^\/connected(?=\/|$)/.test(location.pathname)) {
  history.replaceState(null, '', location.pathname.replace(/^\/connected/, '/dashboard') + location.search + location.hash)
}
if (['/', '/dashboard', '/dashboard/'].includes(location.pathname) && location.hash === '#recruiter') {
  history.replaceState(null, '', recruiterRoutes['posted-jobs'] + location.search)
}

const params = new URLSearchParams(location.search)
const path = location.pathname.replace(/\/$/, '')
const legacyHashes = ['#home', '#candidate', '#admin', '#documents']
const recovery = path === '/dashboard/password-recovery' || (path === '/auth/reset-password' && params.has('token'))
const workspace = !!recruiterView(path) || ['/dashboard', '/invite'].includes(path) ||
  (!path && (params.has('verify') || params.has('token') || legacyHashes.includes(location.hash)))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {recovery ? <PasswordRecovery /> : workspace ? <App /> : <Preview />}
  </StrictMode>,
)
