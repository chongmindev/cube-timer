import { useMemo } from 'react'
import { useStore } from '../lib/store'
import { streak } from '../lib/streak'

/** Daily streak in the top bar: the count plus one bar per day of the last week. */
export function StreakMark() {
  const { state } = useStore()
  const s = useMemo(
    () => streak(state.sessions.flatMap((session) => session.solves.map((solve) => solve.date))),
    [state.sessions],
  )

  const label =
    s.current === 0
      ? 'No streak yet'
      : `${s.current} day${s.current === 1 ? '' : 's'}`
  const hint =
    s.current === 0
      ? 'Solve once a day to build a streak.'
      : s.solvedToday
        ? `Longest streak: ${s.longest} day${s.longest === 1 ? '' : 's'}.`
        : 'Solve today to keep your streak.'

  return (
    <span className={`streak ${s.current > 0 && !s.solvedToday ? 'is-due' : ''}`} title={hint}>
      <span className="streak-week" aria-hidden="true">
        {s.week.map((on, i) => (
          <span key={i} className={`streak-day ${on ? 'is-on' : ''} ${i === 6 ? 'is-today' : ''}`} />
        ))}
      </span>
      <span className="streak-count">{label}</span>
      <span className="sr-only">{hint}</span>
    </span>
  )
}
