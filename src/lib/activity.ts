// Practice per day for the activity graph. Live sessions are counted as they are; solves that
// were cleared or deleted can be kept as day totals, so the graph and streak don't lose them.

import { effective, type Solve } from './stats'
import type { State } from './store'
import { dayNumber } from './streak'

/** One day's solves for one event; `best` is the best single in ms, null when all were DNF. */
export interface DayTotal {
  count: number
  best: number | null
  /** The best single's scramble (missing from totals kept before scrambles were). */
  scramble?: string
}

/** Day number to event id to that day's totals. */
export type Days = Record<number, Record<string, DayTotal>>

/** Solves kept from one clear or delete, so undoing it can take them back out. */
export interface ActivityBatch {
  id: string
  days: Days
}

function add(days: Days, day: number, event: string, count: number, best: number | null, scramble?: string) {
  const forDay = (days[day] ??= {})
  const t = (forDay[event] ??= { count: 0, best: null })
  t.count += count
  if (best !== null && (t.best === null || best < t.best)) {
    t.best = best
    t.scramble = scramble
  }
}

export function summarize(solves: Solve[], event: string): Days {
  const days: Days = {}
  for (const s of solves) {
    const time = effective(s)
    add(days, dayNumber(s.date), event, 1, time === Infinity ? null : time, s.scramble)
  }
  return days
}

/** Every day with practice: live sessions plus the kept batches. */
export function activityDays(state: State): Days {
  const days: Days = {}
  const merge = (from: Days) => {
    for (const [day, events] of Object.entries(from)) {
      for (const [event, t] of Object.entries(events)) add(days, Number(day), event, t.count, t.best, t.scramble)
    }
  }
  for (const session of state.sessions) merge(summarize(session.solves, session.event))
  for (const batch of state.archive) merge(batch.days)
  return days
}
