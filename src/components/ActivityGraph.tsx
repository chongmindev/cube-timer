import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { activityDays } from '../lib/activity'
import { EVENTS } from '../lib/events'
import { formatMs } from '../lib/format'
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

const longDate = (day: number) =>
  toDate(day).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })

/**
 * A year of practice, one square per day: columns are weeks (Sunday first), and the darker
 * the square, the more solves that day. Counts every session and event, plus cleared solves
 * kept for activity. Hovering a day shows its solves and best single per event, with that
 * solve's scramble; clicking the day keeps the card open to copy it.
 */
export function ActivityGraph() {
  const { state } = useStore()
  const days = useMemo(() => activityDays(state), [state])

  const { weeks, months, total, s } = useMemo(() => {
    const counts = new Map<number, number>()
    for (const [day, events] of Object.entries(days)) {
      counts.set(Number(day), Object.values(events).reduce((n, t) => n + t.count, 0))
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
    return { weeks, months, total, s: streak(counts.keys()) }
  }, [days])

  // Open on the most recent weeks when the year doesn't fit.
  const scroller = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = scroller.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [])

  // The day under the pointer, placed above its square.
  const box = useRef<HTMLElement>(null)
  const [tip, setTip] = useState<{ day: number; x: number; y: number } | null>(null)
  // Clicking a day keeps its card open, so its scrambles can be copied.
  const [pinned, setPinned] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const place = (target: EventTarget) => {
    const cell = (target as HTMLElement).closest<HTMLElement>('[data-day]')
    if (!cell || !box.current) return null
    const r = cell.getBoundingClientRect()
    const b = box.current.getBoundingClientRect()
    // Kept inside the section so the card never runs off the page.
    const x = Math.min(Math.max(r.left + r.width / 2 - b.left, 150), b.width - 150)
    return { day: Number(cell.dataset.day), x, y: r.top - b.top }
  }
  const onOver = (e: PointerEvent) => !pinned && setTip(place(e.target))
  const close = () => {
    setPinned(false)
    setTip(null)
  }
  const onClick = (e: { target: EventTarget }) => {
    const at = place(e.target)
    if (!at || (pinned && tip?.day === at.day)) return close()
    setTip(at)
    setPinned(true)
  }
  useEffect(() => {
    if (!pinned) return
    const onDown = (e: globalThis.PointerEvent) => {
      const t = e.target as HTMLElement
      if (!t.closest('.activity-tip, .activity-cells')) close()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [pinned])
  const copy = async (scramble: string) => {
    try {
      await navigator.clipboard.writeText(scramble)
      setCopied(scramble)
      window.setTimeout(() => setCopied(null), 1500)
    } catch {
      // Clipboard blocked.
    }
  }
  const tipEvents = tip
    ? EVENTS.filter((e) => days[tip.day]?.[e.id]).map((e) => ({ event: e, ...days[tip.day][e.id] }))
    : []
  const tipCount = tipEvents.reduce((n, t) => n + t.count, 0)

  return (
    <section className="activity" aria-labelledby="activity-title" ref={box}>
      <div className="activity-head">
        <h2 id="activity-title">Activity</h2>
        <p className="muted">
          {plural(total, 'solve')} in the last year. Current streak {plural(s.current, 'day')}, longest{' '}
          {plural(s.longest, 'day')}.
        </p>
      </div>
      <div className="activity-scroll" ref={scroller} onScroll={close}>
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
          <span
            className="activity-cells"
            role="img"
            aria-label={`${plural(total, 'solve')} in the last year`}
            onPointerOver={onOver}
            onPointerLeave={() => !pinned && setTip(null)}
            onClick={onClick}
          >
            {weeks.flat().map((c) => (
              <span
                key={c.day}
                className="activity-cell"
                data-level={c.future ? undefined : level(c.count)}
                data-day={c.future ? undefined : c.day}
              />
            ))}
          </span>
        </div>
      </div>
      {tip && (
        <div
          className="activity-tip"
          data-pinned={pinned || undefined}
          style={{ left: tip.x, top: tip.y }}
          role={pinned ? 'dialog' : 'tooltip'}
          aria-label={longDate(tip.day)}
        >
          <p className="activity-tip-head">
            <span>{longDate(tip.day)}</span>
            <span>{tipCount ? plural(tipCount, 'solve') : 'No solves'}</span>
          </p>
          {tipEvents.map((t) => (
            <div key={t.event.id} className="activity-tip-event">
              <p className="activity-tip-row">
                <span>{t.event.name}</span>
                <span>
                  {tipEvents.length > 1 && `${plural(t.count, 'solve')}, `}
                  best {t.best === null ? 'DNF' : formatMs(t.best, state.settings.decimals)}
                </span>
              </p>
              {t.scramble && (
                <p className="activity-tip-scramble">
                  <span>{t.scramble}</span>
                  {pinned && (
                    <button className="text-button" onClick={() => copy(t.scramble!)}>
                      {copied === t.scramble ? 'Copied' : 'Copy'}
                    </button>
                  )}
                </p>
              )}
            </div>
          ))}
          {!pinned && tipEvents.some((t) => t.scramble) && (
            <p className="activity-tip-hint">Click the day to copy a scramble</p>
          )}
        </div>
      )}
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
