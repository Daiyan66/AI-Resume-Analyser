import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import Preview from './preview/Preview.tsx'
import { PasswordRecovery } from './PasswordRecovery.tsx'

const legacyRoutes = ['/connected', '/invite']
const legacyHashes = ['#home', '#candidate', '#recruiter', '#admin', '#documents']
const params = new URLSearchParams(location.search)
const recovery = location.pathname === '/connected/password-recovery' ||
  (location.pathname === '/auth/reset-password' && params.has('token'))
const connected = legacyRoutes.includes(location.pathname.replace(/\/$/, '')) ||
  (location.pathname === '/' && (params.has('verify') || params.has('token') || legacyHashes.includes(location.hash)))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {recovery ? <PasswordRecovery /> : connected ? <App /> : <Preview />}
  </StrictMode>,
)
