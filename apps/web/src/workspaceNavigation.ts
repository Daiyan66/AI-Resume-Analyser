export const candidateSections = ['candidate', 'applications', 'profile', 'updates', 'privacy'] as const
export type CandidateSection = typeof candidateSections[number]
export const recruiterRoutes = {
  'posted-jobs': '/connected/recruiter/jobs',
  'post-job': '/connected/recruiter/jobs/new',
  'recruiter-applications': '/connected/recruiter/applications',
  'team-chat': '/connected/recruiter/chat',
} as const
export type RecruiterView = keyof typeof recruiterRoutes
export type View = RecruiterView | CandidateSection | 'home' | 'candidate-home' | 'admin' | 'policy' | 'audit' | 'documents' | 'organizations'
export type WorkspaceRole = 'CANDIDATE' | 'RECRUITER' | 'ADMIN'

export const viewTitles: Record<View, string> = {
  home: 'Workspace overview', 'candidate-home': 'Candidate dashboard', candidate: 'Find jobs',
  applications: 'My applications', profile: 'Candidate profile', updates: 'Application updates', privacy: 'Privacy & data',
  'posted-jobs': 'Posted jobs', 'post-job': 'Post a job',
  'recruiter-applications': 'Applications', 'team-chat': 'Team chat', admin: 'Team & invitations', policy: 'Hiring policies', audit: 'Audit log',
  documents: 'My documents', organizations: 'Organizations',
}

export function isCandidateSection(view: View): view is CandidateSection {
  return candidateSections.some(section => section === view)
}
export function isCandidateView(view: View) {
  return isCandidateSection(view) || view === 'candidate-home' || view === 'documents'
}
export function recruiterView(path: string) {
  return (Object.keys(recruiterRoutes) as RecruiterView[]).find(view => recruiterRoutes[view] === path.replace(/\/$/, ''))
}

export function workspaceHref(view: View) {
  if (Object.hasOwn(recruiterRoutes, view)) return recruiterRoutes[view as RecruiterView]
  return (recruiterView(location.pathname) ? '/connected' : '') + '#' + view
}

export function currentView(fragment: string): View {
  const route = recruiterView(location.pathname)
  if (route) return route
  const [hash] = fragment.slice(1).split('?')
  return Object.hasOwn(viewTitles, hash) && !Object.hasOwn(recruiterRoutes, hash) ? hash as View : 'home'
}

export const workspaceNames: Record<WorkspaceRole, string> = {
  CANDIDATE: 'Candidate', RECRUITER: 'Recruiter', ADMIN: 'Admin',
}
export const workspaceMenus: Record<WorkspaceRole, View[]> = {
  CANDIDATE: ['candidate-home', 'profile', 'updates', 'candidate', 'applications', 'documents', 'privacy'],
  RECRUITER: ['home', 'posted-jobs', 'post-job', 'recruiter-applications', 'team-chat'],
  ADMIN: ['home', 'admin', 'policy', 'audit', 'posted-jobs', 'post-job', 'recruiter-applications', 'team-chat', 'organizations'],
}

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || 'there'
}

export const workTypes = { REMOTE: 'Remote', HYBRID: 'Hybrid', ONSITE: 'On-site' } as const
