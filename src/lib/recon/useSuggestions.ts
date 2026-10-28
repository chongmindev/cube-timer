import { useEffect, useState } from 'react'
import type { State } from './cube'
import type { CrossSuggestions, LastLayerSuggestion, PairSuggestion } from './suggest'
import type { Job } from './worker'

interface Results {
  hold: number[]
  cross: CrossSuggestions
  f2l: PairSuggestion[]
  ll: LastLayerSuggestion
}

let worker: Worker | null = null
let nextId = 0
const pending = new Map<number, (result: unknown) => void>()

function run<J extends Job>(job: J, state: State): Promise<Results[J]> {
  if (!worker) {
    worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (e: MessageEvent<{ id: number; result: unknown }>) => {
      pending.get(e.data.id)?.(e.data.result)
      pending.delete(e.data.id)
    }
  }
  const id = nextId++
  return new Promise((resolve) => {
    pending.set(id, resolve as (r: unknown) => void)
    worker!.postMessage({ id, job, state: Array.from(state) })
  })
}

/** Suggestions for the given cube, recomputed when the cube changes. Null while working. */
export function useSuggestions<J extends Job>(job: J | null, state: State): Results[J] | null {
  const [result, setResult] = useState<{ key: string; value: Results[J] } | null>(null)
  const key = `${job}:${state.join('')}`
  useEffect(() => {
    if (!job) return
    let live = true
    run(job, state).then((value) => live && setResult({ key, value }))
    return () => {
      live = false
    }
  }, [job, key]) // eslint-disable-line react-hooks/exhaustive-deps
  return result && result.key === key ? result.value : null
}
