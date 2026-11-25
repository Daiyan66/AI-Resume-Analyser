export const candidateSections = ['candidate', 'applications', 'profile', 'updates', 'privacy'] as const
export type CandidateSection = typeof candidateSections[number]
export type WorkspaceRole = 'CANDIDATE' | 'RECRUITER' | 'ADMIN'
export type StaffRole = Exclude<WorkspaceRole, 'CANDIDATE'>

const sharedPaths = {
  'posted-jobs': 'jobs',
  'post-job': 'jobs/new',
  'recruiter-applications': 'applications',
  'team-chat': 'chat',
  'recruiter-notifications': 'notifications',
  'hired-candidates': 'hires',
} as const
const adminPaths = {
  ...sharedPaths, admin: 'team', policy: 'hiring-policies', audit: 'audit',
  organizations: 'organizations', 'create-organization': 'organizations/new',
} as const
const recruiterPaths = { ...sharedPaths, 'batch-screening': 'batch-screening' } as const
type DirectoryView = 'organization-recruiters' | 'organization-recruiter-jobs' | 'organization-job-hires'
type StaffView = keyof typeof adminPaths | keyof typeof recruiterPaths | DirectoryView
export type View = StaffView | CandidateSection | 'home' | 'candidate-home' | 'documents' | 'invitation'

export const viewTitles: Record<View, string> = {
  home: 'Dashboard', 'candidate-home': 'Candidate dashboard', candidate: 'Find jobs',
  applications: 'My applications', profile: 'Candidate profile', updates: 'Notifications', privacy: 'Privacy & data',
  'posted-jobs': 'Posted jobs', 'post-job': 'Post a job', 'recruiter-applications': 'Applications',
  'recruiter-notifications': 'Notifications', 'hired-candidates': 'Hired candidates', 'batch-screening': 'Batch screening',
  'team-chat': 'Team chat', admin: 'Team & invitations', policy: 'Hiring policies', audit: 'Audit log',
  documents: 'My documents', organizations: 'Organizations', 'create-organization': 'Create organization',
  'organization-recruiters': 'Organization recruiters', 'organization-recruiter-jobs': 'Recruiter jobs',
  'organization-job-hires': 'Job hires', invitation: 'Organization invitation',
}

export function isCandidateSection(view: View): view is CandidateSection {
  return candidateSections.some(section => section === view)
}

export function isCandidateView(view: View) {
  return isCandidateSection(view) || view === 'candidate-home' || view === 'documents'
}

type StaffRoute = { view: StaffView; role: StaffRole; organizationId?: string; recruiterId?: string; jobId?: string }

export function staffRoute(path: string): StaffRoute | undefined {
  const parts = path.replace(/\/$/, '').split('/')
  if (parts[1] !== 'dashboard') return
  const role = parts[2] === 'admin' ? 'ADMIN' : parts[2] === 'recruiter' ? 'RECRUITER' : undefined
  if (!role) return
  const routes = role === 'ADMIN' ? adminPaths : recruiterPaths
  const tail = parts.slice(3).join('/')
  const view = (Object.keys(routes) as (keyof typeof routes)[]).find(key => routes[key] === tail)
  if (view) return { view, role }
  if (role !== 'ADMIN') return
  const directory = /^organizations\/([\da-f-]+)(?:\/recruiters\/([\da-f-]+)(?:\/jobs\/([\da-f-]+)\/hires)?)?$/i.exec(tail)
  if (!directory || directory.slice(1).some(id => id && !/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(id))) return
  const [, organizationId, recruiterId, jobId] = directory
  return { view: jobId ? 'organization-job-hires' : recruiterId ? 'organization-recruiter-jobs' : 'organization-recruiters',
    role, organizationId, recruiterId, jobId }
}

export function directoryHref(organizationId: string, recruiterId?: string, jobId?: string) {
  const base = `/dashboard/admin/organizations/${organizationId}`
  if (!recruiterId) return base
  const recruiter = `${base}/recruiters/${recruiterId}`
  return jobId ? `${recruiter}/jobs/${jobId}/hires` : recruiter
}

export function workspaceHref(view: View, role: WorkspaceRole) {
  if (view === 'home' || view === 'candidate-home') return '/dashboard'
  const paths = role === 'ADMIN' ? adminPaths : recruiterPaths
  if (role !== 'CANDIDATE' && Object.hasOwn(paths, view)) {
    return `/dashboard/${role.toLowerCase()}/${paths[view as keyof typeof paths]}`
  }
  return '/dashboard#' + view
}

export function currentView(fragment: string): View {
  const route = staffRoute(location.pathname)
  if (route) return route.view
  const [hash] = fragment.slice(1).split('?')
  return Object.hasOwn(viewTitles, hash) ? hash as View : 'home'
}

export const workspaceMenus: Record<WorkspaceRole, View[]> = {
  CANDIDATE: ['candidate-home', 'profile', 'updates', 'candidate', 'applications', 'documents', 'privacy'],
  RECRUITER: ['home', 'recruiter-notifications', 'posted-jobs', 'post-job', 'recruiter-applications', 'hired-candidates', 'batch-screening', 'team-chat'],
  ADMIN: ['home', 'recruiter-notifications', 'posted-jobs', 'post-job', 'recruiter-applications', 'hired-candidates', 'team-chat',
    'admin', 'policy', 'audit', 'organizations', 'create-organization'],
}

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || 'there'
}

export const workTypes = { REMOTE: 'Remote', HYBRID: 'Hybrid', ONSITE: 'On-site' } as const
