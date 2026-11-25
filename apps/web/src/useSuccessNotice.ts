import { useCallback, useEffect, useState } from 'react'

export function useSuccessNotice() {
  const [notice, setNotice] = useState<{ message: string }>()
  const showNotice = useCallback((message: string) => setNotice(message ? { message } : undefined), [])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => {
      setNotice(current => current === notice ? undefined : current)
    }, 5000)
    return () => window.clearTimeout(timer)
  }, [notice])

  return [notice?.message ?? '', showNotice] as const
}
