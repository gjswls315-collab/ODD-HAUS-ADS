import { useMemo } from 'react'
import { computeLayout } from './layout'
import { useStore } from './store'

export function useLayout() {
  const params = useStore((s) => s.params)
  return useMemo(() => computeLayout(params), [params])
}
