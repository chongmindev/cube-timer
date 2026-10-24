export type Penalty = 'none' | '+2' | 'dnf'

export interface Solve {
  id: string
  time: number // raw milliseconds, before penalty
  penalty: Penalty
  scramble: string
  date: number
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
  ['ao50', 50],
  ['ao100', 100],
]

/** Rolling average of the given size ending at each index (null until enough solves). */
export function rolling(solves: Solve[], size: number): (number | null)[] {
  const times = solves.map(effective)
  return times.map((_, i) => (i + 1 < size ? null : average(times.slice(i + 1 - size, i + 1))))
}

function minOf(values: (number | null)[]): number | null {
  let best: number | null = null
  for (const v of values) if (v !== null && (best === null || v < best)) best = v
  return best
}

export function sessionStats(solves: Solve[]) {
  const times = solves.map(effective)
  const averages: AvgStat[] = SIZES.map(([label, size]) => {
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
