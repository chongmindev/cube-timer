import { effective, type Penalty, type Solve } from './stats'

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

/**
 * Reads a typed time. Plain digits follow the usual cubing shorthand, where the last two
 * digits are hundredths: "1234" is 12.34 and "10234" is 1:02.34. "12.34" and "1:02.34" work
 * as written. A trailing "+" (or "+2") adds two seconds; "DNF" marks a DNF,
 * with or without a time ("DNF", "DNF(12.34)", "12.34 dnf").
 */
export function parseTyped(input: string): { time: number; penalty: Penalty } | null {
  let text = input.trim().toLowerCase()
  if (!text) return null
  let penalty: Penalty = 'none'
  if (text.includes('dnf')) {
    penalty = 'dnf'
    text = text.replace('dnf', '').replace(/[()\s]/g, '')
    if (!text) return { time: 0, penalty }
  } else if (/\+2?$/.test(text)) {
    penalty = '+2'
    text = text.replace(/\+2?$/, '').trim()
  }

  let ms: number
  if (/^\d+$/.test(text)) {
    const digits = text.padStart(5, '0')
    const cs = Number(digits.slice(-2))
    const s = Number(digits.slice(-4, -2))
    const m = Number(digits.slice(0, -4))
    if (s >= 60) return null
    ms = (m * 60 + s) * 1000 + cs * 10
  } else {
    const match = /^(?:(\d+):)?(\d+(?:\.\d+)?|\.\d+)$/.exec(text)
    if (!match) return null
    const m = match[1] ? Number(match[1]) : 0
    const s = Number(match[2])
    if (match[1] && s >= 60) return null
    ms = Math.round((m * 60 + s) * 1000)
  }
  if (ms <= 0 || ms >= 24 * 3600 * 1000) return null
  return { time: ms, penalty }
}
