import type { Page } from './api'

export function RecruiterPagination({ result, path, filters, noun }: {
  result: Page<unknown>
  path: string
  filters: URLSearchParams
  noun: string
}) {
  const { page, size, total } = result
  const pageLink = (index: number) => {
    const params = new URLSearchParams(filters)
    params.set('page', String(index))
    return `${path}?${params}`
  }
  if (total === 0 && page === 0) return null
  return <nav className="pagination" aria-label={`${noun} pagination`}>
    <span>{page > 0 && <a className="pv-button" href={pageLink(page - 1)}>Previous</a>}</span>
    <span>Page {page + 1} · {total} {noun}</span>
    <span>{(page + 1) * size < total && <a className="pv-button" href={pageLink(page + 1)}>Next</a>}</span>
  </nav>
}
