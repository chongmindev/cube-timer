import { useLayoutEffect, useMemo, useRef } from 'react'
import { useStore } from '../lib/store'
import { dayNumber, streak } from '../lib/streak'

const WEEKS = 53
const DAY_MS = 86_400_000
// Solves in a day needed for each shade, lightest first.
const LEVELS = [1, 5, 15, 30]

const level = (n: number) => LEVELS.filter((t) => n >= t).length

/** A day number back to its date, read in UTC because that's how day numbers are made. */
const toDate = (day: number) => new Date(day * DAY_MS)

const plural = (n: number, word: string) => `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`

/**
 * A year of practice, one square per day: columns are weeks (Sunday first), and the darker
 * the square, the more solves that day. Counts every session and event.
 */
export function ActivityGraph() {
  const { state } = useStore()
  const dates = useMemo(() => state.sessions.flatMap((s) => s.solves.map((solve) => solve.date)), [state.sessions])

  const { weeks, months, total, s } = useMemo(() => {
    const counts = new Map<number, number>()
    for (const d of dates) {
      const day = dayNumber(d)
      counts.set(day, (counts.get(day) ?? 0) + 1)
    }
    const today = dayNumber(Date.now())
    // The grid ends with this week's Saturday column, so today sits in the last column.
    const lastSaturday = today + (6 - toDate(today).getUTCDay())
    const first = lastSaturday - WEEKS * 7 + 1

    let total = 0
    const weeks: { day: number; count: number; future: boolean }[][] = []
    const months: { week: number; label: string }[] = []
    for (let w = 0; w < WEEKS; w++) {
      const column = []
      for (let d = 0; d < 7; d++) {
        const day = first + w * 7 + d
        const count = counts.get(day) ?? 0
        if (day <= today) total += count
        column.push({ day, count, future: day > today })
      }
      weeks.push(column)
      // Label a month over the first week that starts in it.
      const start = toDate(column[0].day)
      if (start.getUTCDate() <= 7 && w < WEEKS - 1) {
        months.push({ week: w, label: start.toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' }) })
      }
    }
    return { weeks, months, total, s: streak(dates) }
  }, [dates])

  // Open on the most recent weeks when the year doesn't fit.
  const scroller = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = scroller.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [])

  return (
    <section className="activity" aria-labelledby="activity-title">
      <div className="activity-head">
        <h2 id="activity-title">Activity</h2>
        <p className="muted">
          {plural(total, 'solve')} in the last year. Current streak {plural(s.current, 'day')}, longest{' '}
          {plural(s.longest, 'day')}.
        </p>
      </div>
      <div className="activity-scroll" ref={scroller}>
        <div className="activity-grid" style={{ ['--weeks' as string]: WEEKS }}>
          <span className="activity-days" aria-hidden="true">
            <span>Mon</span>
            <span>Wed</span>
            <span>Fri</span>
          </span>
          <span className="activity-months" aria-hidden="true">
            {months.map((m) => (
              <span key={m.week} style={{ gridColumn: m.week + 1 }}>
                {m.label}
              </span>
            ))}
          </span>
          <span className="activity-cells" role="img" aria-label={`${plural(total, 'solve')} in the last year`}>
            {weeks.flat().map((c) => (
              <span
                key={c.day}
                className="activity-cell"
                data-level={c.future ? undefined : level(c.count)}
                title={
                  c.future
                    ? undefined
                    : `${plural(c.count, 'solve')} on ${toDate(c.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}`
                }
              />
            ))}
          </span>
        </div>
      </div>
      <p className="activity-key muted" aria-hidden="true">
        Fewer
        {[0, 1, 2, 3, 4].map((l) => (
          <span key={l} className="activity-cell" data-level={l} />
        ))}
        More
      </p>
    </section>
  )
}
