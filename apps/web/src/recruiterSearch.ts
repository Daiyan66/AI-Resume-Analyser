export const jobStatuses = { DRAFT: 'Draft', PUBLISHED: 'Published', PAUSED: 'Paused', CLOSED: 'Closed' } as const
export const applicationStatuses = {
  SUBMITTED: 'Submitted', IN_REVIEW: 'In review', INTERVIEW: 'Interview', OFFER: 'Offer',
  HIRED: 'Hired', NOT_SELECTED: 'Not selected', WITHDRAWN: 'Withdrawn',
} as const

export function pageIndex(value: string | null) {
  const index = Number(value)
  return Number.isSafeInteger(index) && index >= 0 && index <= 2_147_483_647 ? index : 0
}

export function routeId(value: string | null) {
  return value && /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(value) ? value : ''
}
