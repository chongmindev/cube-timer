import { effective, type Solve } from './stats'

/** Truncates (WCA rounds results down) to the given number of decimals. */
export function formatMs(ms: number | null, decimals = 2): string {
  if (ms === null) return '-'
  if (ms === Infinity) return 'DNF'
  const factor = 10 ** decimals
  const units = Math.floor((ms / 1000) * factor)
  const totalSeconds = Math.floor(units / factor)
  const frac = String(units % factor).padStart(decimals, '0')
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const tail = decimals > 0 ? `.${frac}` : ''
  if (minutes > 0) return `${minutes}:${String(seconds).padStart(2, '0')}${tail}`
  return `${seconds}${tail}`
}

export function formatSolve(s: Solve, decimals = 2): string {
  if (s.penalty === 'dnf') return 'DNF'
  return formatMs(effective(s), decimals) + (s.penalty === '+2' ? '+' : '')
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}
