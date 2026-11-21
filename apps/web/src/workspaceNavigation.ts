export const candidateSections = ['candidate', 'applications', 'profile', 'updates', 'privacy'] as const
export type CandidateSection = typeof candidateSections[number]
export type View = CandidateSection | 'home' | 'candidate-home' | 'recruiter' | 'admin' | 'policy' | 'audit' | 'documents' | 'organizations'
export type WorkspaceRole = 'CANDIDATE' | 'RECRUITER' | 'ADMIN'

export const viewTitles: Record<View, string> = {
  home: 'Workspace overview', 'candidate-home': 'Candidate dashboard', candidate: 'Find jobs',
  applications: 'My applications', profile: 'Candidate profile', updates: 'Application updates', privacy: 'Privacy & data',
  recruiter: 'Jobs & applicants', admin: 'Team & invitations', policy: 'Hiring policies', audit: 'Audit log',
  documents: 'My documents', organizations: 'Organizations',
}

export function isCandidateSection(view: View): view is CandidateSection {
  return candidateSections.some(section => section === view)
}
export function isCandidateView(view: View) {
  return isCandidateSection(view) || view === 'candidate-home' || view === 'documents'
}
export function currentView(): View {
  const hash = window.location.hash.slice(1)
  return Object.hasOwn(viewTitles, hash) ? hash as View : 'home'
}

export const workspaceNames: Record<WorkspaceRole, string> = {
  CANDIDATE: 'Candidate', RECRUITER: 'Recruiter', ADMIN: 'Admin',
}
export const workspaceMenus: Record<WorkspaceRole, View[]> = {
  CANDIDATE: ['candidate-home', 'candidate', 'applications', 'updates', 'profile', 'documents', 'privacy', 'organizations'],
  RECRUITER: ['home', 'recruiter', 'organizations'],
  ADMIN: ['home', 'admin', 'policy', 'audit', 'recruiter', 'organizations'],
}
