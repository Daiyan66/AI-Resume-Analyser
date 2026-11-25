import { useEffect, useState } from 'react'
import { api } from './api'
import { useSuccessNotice } from './useSuccessNotice'

export type HiringTask = { applicationId: string; jobId: string; title: string; candidate: string; kind: string; at: string; itemId: string }
export type Interview = { id: string; startsAt: string; timezone: string; minutes: number; location: string; message: string
  cancelledAt: string | null; completedAt: string | null; rescheduleRequestedAt: string | null }
export type InterviewOffer = { id: string; timezone: string; minutes: number; location: string; message: string
  slots: { id: string; startsAt: string }[] }
export type AssessmentFields = { title: string; instructions: string; effortMinutes: number; allowedTools: string; rubric: string[] }
export type AssessmentTemplate = AssessmentFields & { id: string; publishedAt: string | null }
export type AssessmentAssignment = AssessmentFields & { id: string; templateId: string; availableFrom: string; dueAt: string; answer: string; documentId: string | null
  documentName: string | null; aiConsent: boolean; updatedAt: string | null; submittedAt: string | null
  reviewedAt: string | null; scores: number[]; feedback: string | null; outcome: 'PASSED' | 'RETRY' | 'EXPIRED' | null }

// The API returns attempts newest-first, so only the first attempt per template governs progression.
export function currentAssessments(attempts: AssessmentAssignment[]) {
  const latest = new Map<string, AssessmentAssignment>()
  for (const attempt of attempts) {
    if (!latest.has(attempt.templateId)) latest.set(attempt.templateId, attempt)
  }
  return [...latest.values()]
}

export function errorMessage(cause: unknown) {
  return cause instanceof Error ? cause.message : 'The request could not be completed.'
}

export function localTime(value: string) {
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export function useHiringData<T>(path: string, revision = 0) {
  const [result, setResult] = useState<{ path: string; revision: number; data?: T; error?: string }>()
  useEffect(() => {
    if (!path) return
    const controller = new AbortController()
    void api<T>(path, { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) setResult({ path, revision, data })
    }).catch(cause => {
      if (!controller.signal.aborted) setResult({ path, revision, error: errorMessage(cause) })
    })
    return () => controller.abort()
  }, [path, revision])
  return result && result.path === path ? result : undefined
}

export function useHiringAction() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useSuccessNotice()
  async function run(task: () => Promise<void>, success?: string) {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await task()
      if (success) setNotice(success)
    } catch (cause) {
      setError(errorMessage(cause))
    } finally { setBusy(false) }
  }
  return { busy, error, notice, run }
}

export function write<T>(path: string, method: 'POST' | 'PUT' | 'DELETE', value?: unknown) {
  return api<T>(path, { method, body: value === undefined ? undefined : JSON.stringify(value) })
}

export function useWorkflowClock() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 5000)
    return () => window.clearInterval(timer)
  }, [])
  return now
}
