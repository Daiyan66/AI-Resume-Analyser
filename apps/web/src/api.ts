export type Account = { id: string; email: string; displayName: string; emailVerified: boolean }
export type Organization = { organizationId: string; slug: string; name: string; role: 'ADMIN' | 'RECRUITER' }
export type Member = { id: string; email: string; displayName: string; role: string; status: string }
export type Document = { id: string; filename: string; mediaType: string; byteSize: number; createdAt: string }
export type AuditEvent = { id: string; action: string; targetType: string; createdAt: string }

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
