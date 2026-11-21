import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import Preview from './preview/Preview.tsx'

const legacyRoutes = ['/connected', '/invite']
const legacyHashes = ['#home', '#candidate', '#recruiter', '#admin', '#documents']
const params = new URLSearchParams(location.search)
const connected = legacyRoutes.includes(location.pathname.replace(/\/$/, '')) ||
  (location.pathname === '/' && (params.has('verify') || params.has('token') || legacyHashes.includes(location.hash)))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {connected ? <App /> : <Preview />}
  </StrictMode>,
)
