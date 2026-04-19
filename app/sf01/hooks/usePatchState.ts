import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Effect, PatchValues } from '../lib/types'

export function usePatchState(effect: Effect) {
  const initial = useMemo<PatchValues>(() => {
    const v: PatchValues = {}
    for (const u of effect.uniforms) v[u.name] = u.default
    return v
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effect.id])

  const [values, setValues] = useState<PatchValues>(initial)

  useEffect(() => {
    setValues(initial)
  }, [initial])

  const setUniform = useCallback(
    (name: string, value: number | [number, number, number]) => {
      setValues((prev) => ({ ...prev, [name]: value }))
    },
    []
  )

  return { values, setUniform }
}
