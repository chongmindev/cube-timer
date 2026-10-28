// Runs the suggestion searches off the main thread so the page stays responsive.
import { crossByColor, crossSuggestions, f2lSuggestions, lastLayerSuggestions } from './suggest'

export type Job = 'hold' | 'cross' | 'f2l' | 'll'

const JOBS = {
  hold: crossByColor,
  cross: crossSuggestions,
  f2l: f2lSuggestions,
  ll: lastLayerSuggestions,
}

self.onmessage = (e: MessageEvent<{ id: number; job: Job; state: number[] }>) => {
  const { id, job, state } = e.data
  const result = JOBS[job](Uint8Array.from(state))
  self.postMessage({ id, result })
}
