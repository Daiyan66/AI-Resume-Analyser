import type { ReactNode } from 'react'
import './App.css'

export function ConnectedLayout({ children, actions, workspace = false }: { children: ReactNode; actions?: ReactNode; workspace?: boolean }) {
  return <div className={workspace ? "pv-app live-app live-app-workspace" : "pv-app live-app"}>
    {!workspace && <header className="pv-header">
      <div className="pv-top">
        <a href="/" className="pv-brand"><span className="pv-mark" aria-hidden="true">A<span>.</span></span>AI Resume Analyser</a>
        <nav aria-label="Account navigation">
          <a className="pv-top-link" href="/#how-it-works">How it works</a>
          {actions}
        </nav>
      </div>
    </header>}
    {children}
    {!workspace && <footer className="pv-footer">
      <span>AI Resume Analyser</span>
      <nav aria-label="Footer"><a href="/#how-it-works">About the platform</a></nav>
    </footer>}
  </div>
}

export function ConnectedAuthCard({ title, description, children, actions }: {
  title: string
  description: string
  children: ReactNode
  actions?: ReactNode
}) {
  return <ConnectedLayout actions={actions}>
    <main className="pv-main live-auth">
      <div className="live-auth-intro">
        <p className="pv-kicker">YOUR HIRING WORKSPACE</p>
        <h1 id="account-heading">{title}</h1>
        <p>{description}</p>
      </div>
      <section className="pv-card live-auth-card" aria-labelledby="account-heading">{children}</section>
    </main>
  </ConnectedLayout>
}
