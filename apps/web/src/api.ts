export type Account = { id: string; email: string; displayName: string; emailVerified: boolean }
export type Organization = { organizationId: string; slug: string; name: string; role: 'ADMIN' | 'RECRUITER' }
export type Member = { id: string; email: string; displayName: string; role: string; status: string }
export type Document = { id: string; filename: string; mediaType: string; byteSize: number; createdAt: string }
export type AuditEvent = { id: string; action: string; targetType: string; createdAt: string }
export type Page<T> = { items: T[]; page: number; size: number; total: number }
export type JobQuestion = { id: string; prompt: string; required: boolean }
export type JobCriterion = { id: string; description: string; importance: 'REQUIRED' | 'PREFERRED'; guidance: string | null }
export type Job = { id: string; organizationId: string; organizationName: string; title: string; location: string;
  workType: 'REMOTE' | 'HYBRID' | 'ONSITE'; salaryMin: number | null; salaryMax: number | null;
  currency: string | null; description: string; requirements: string; status: string;
  publishedAt: string | null; questions: JobQuestion[]; criteria: JobCriterion[] }
export type PipelineItem = { id: string; candidateName: string; candidateEmail: string; status: string;
  submittedAt: string; reviewedCriteria: number; totalCriteria: number }
export type Review = { id: string; criterionId: string; reviewerName: string; rating: string; note: string; createdAt: string }
export type Decision = { id: string; actorName: string; outcome: string; reason: string; createdAt: string }
export type ReviewDetail = { id: string; job: Job; status: string;
  profileSnapshot: { displayName: string; email: string; profile: CandidateProfile };
  answers: Record<string, { prompt: string; answer: string }>;
  documentId: string | null; documentName: string | null; submittedAt: string;
  reviews: Review[]; decisions: Decision[];
  events: { status: string; message: string; createdAt: string }[] }
export type CandidateProfile = { headline: string; location: string; phone: string; summary: string;
  skills: string; experience: string; education: string }
export type CandidateApplication = { id: string; jobId: string; jobTitle: string; organizationName: string;
  status: 'SUBMITTED' | 'IN_REVIEW' | 'INTERVIEW' | 'OFFER' | 'HIRED' | 'NOT_SELECTED' | 'WITHDRAWN'; documentId: string | null;
  profileSnapshot: { displayName: string; email: string; profile: CandidateProfile };
  answers: Record<string, { prompt: string; answer: string }>; submittedAt: string;
  events: { id: string; status: string; message: string; createdAt: string }[] }
export type DataRequest = { id: string; status: string; createdAt: string }

async function csrfToken(): Promise<string> {
  const response = await fetch('/api/v1/auth/csrf', { credentials: 'same-origin', cache: 'no-store' })
  if (!response.ok) throw new Error('Could not start a secure request')
  const data: { token: string } = await response.json()
  return data.token
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || 'GET').toUpperCase()
  const headers = new Headers(options.headers)
  if (method !== 'GET' && method !== 'HEAD') headers.set('X-XSRF-TOKEN', await csrfToken())
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  const response = await fetch(`/api/v1${path}`, { ...options, headers, credentials: 'same-origin' })
  if (!response.ok) {
    const data = await response.json().catch(() => null) as { error?: string; detail?: string; message?: string } | null
    throw new Error(data?.error || data?.detail || data?.message || `Request failed (${response.status})`)
  }
  if (response.status === 204) return undefined as T
  return await response.json() as T
}
