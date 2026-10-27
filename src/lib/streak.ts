// Daily streaks: consecutive local calendar days with at least one solve, in any session.

/** Local calendar day as a whole number, so consecutive days differ by exactly 1 (DST-safe). */
export function dayNumber(ts: number): number {
  const d = new Date(ts)
  return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000)
}

export interface Streak {
  current: number // days in a row up to today, or up to yesterday if today has no solve yet
  longest: number
  solvedToday: boolean
  week: boolean[] // the last 7 days, oldest first, ending today
}

export function streak(dates: number[], now = Date.now()): Streak {
  const days = new Set(dates.map(dayNumber))
  const today = dayNumber(now)
  const solvedToday = days.has(today)

  // Today without a solve doesn't break the streak yet; it is still yesterday's to keep.
  let current = 0
  for (let d = solvedToday ? today : today - 1; days.has(d); d--) current++

  let longest = 0
  for (const d of days) {
    if (days.has(d - 1)) continue // only count from the first day of each run
    let run = 1
    while (days.has(d + run)) run++
    longest = Math.max(longest, run)
  }

  const week = Array.from({ length: 7 }, (_, i) => days.has(today - 6 + i))
  return { current, longest, solvedToday, week }
}
