export type Penalty = 'none' | '+2' | 'dnf'

export interface Solve {
  id: string
  time: number // raw milliseconds, before penalty
  penalty: Penalty
  scramble: string
  date: number
  recon?: Recon
}

/** A step-by-step reconstruction. The first step is how the cube was held (a rotation, maybe empty). */
export interface Recon {
  steps: { moves: string; label: string }[]
  done: boolean
}

/** Time that counts for stats. DNF is Infinity so it sorts last. */
export function effective(s: Solve): number {
  if (s.penalty === 'dnf') return Infinity
  return s.time + (s.penalty === '+2' ? 2000 : 0)
}

export function mean(times: number[]): number | null {
  if (times.length === 0) return null
  if (times.some((t) => t === Infinity)) return Infinity
  return times.reduce((a, b) => a + b, 0) / times.length
}

/** WCA-style average: drop the best and worst 5% (at least one each for 5+ solves). */
export function average(times: number[]): number | null {
  const n = times.length
  if (n < 3) return null
  if (n === 3) return mean(times)
  const trim = Math.ceil(n * 0.05)
  const sorted = [...times].sort((a, b) => a - b)
  return mean(sorted.slice(trim, n - trim))
}

export interface AvgStat {
  label: string
  size: number
  current: number | null
  best: number | null
}

const SIZES: [string, number][] = [
  ['mo3', 3],
  ['ao5', 5],
  ['ao12', 12],
  ['ao25', 25],
  ['ao50', 50],
  ['ao100', 100],
  ['ao200', 200],
  ['ao500', 500],
  ['ao1000', 1000],
]

/** First index in sorted `a` whose value is at least `x`. */
function lowerBound(a: number[], x: number): number {
  let lo = 0
  let hi = a.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (a[mid] < x) lo = mid + 1
    else hi = mid
  }
  return lo
}

/**
 * Rolling average of the given size ending at each index (null until enough solves). Same
 * result as `average` on each window, but the window is kept sorted as it slides instead of
 * being sorted again for every solve, so ao1000 over thousands of solves stays quick.
 */
export function rolling(solves: Solve[], size: number): (number | null)[] {
  const times = solves.map(effective)
  const trim = size === 3 ? 0 : Math.ceil(size * 0.05)
  const window: number[] = []
  return times.map((t, i) => {
    window.splice(lowerBound(window, t), 0, t)
    if (i >= size) window.splice(lowerBound(window, times[i - size]), 1)
    if (window.length < size) return null
    if (window[size - trim - 1] === Infinity) return Infinity
    let sum = 0
    for (let j = trim; j < size - trim; j++) sum += window[j]
    return sum / (size - 2 * trim)
  })
}

function minOf(values: (number | null)[]): number | null {
  let best: number | null = null
  for (const v of values) if (v !== null && (best === null || v < best)) best = v
  return best
}

export function sessionStats(solves: Solve[]) {
  const times = solves.map(effective)
  const averages: AvgStat[] = SIZES.map(([label, size]) => {
    // Skip the work for averages the session can't have yet.
    if (solves.length < size) return { label, size, current: null, best: null }
    const roll = rolling(solves, size)
    return { label, size, current: roll[roll.length - 1] ?? null, best: minOf(roll) }
  })
  const finite = times.filter((t) => t !== Infinity)
  return {
    count: solves.length,
    best: minOf(times),
    worst: finite.length ? Math.max(...finite) : null,
    mean: finite.length ? finite.reduce((a, b) => a + b, 0) / finite.length : null,
    dnfs: times.length - finite.length,
    averages,
  }
}
