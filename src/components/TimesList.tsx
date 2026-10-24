import { useMemo } from 'react'
import { formatMs, formatSolve } from '../lib/format'
import { rolling, type Solve } from '../lib/stats'
import { Shape } from './Shape'

/** Newest first, with the ao5 and ao12 that ended on each solve. */
export function TimesList({
  solves,
  decimals,
  onOpen,
  bestId,
}: {
  solves: Solve[]
  decimals: number
  onOpen: (id: string) => void
  bestId: string | null
}) {
  const ao5 = useMemo(() => rolling(solves, 5), [solves])
  const ao12 = useMemo(() => rolling(solves, 12), [solves])

  if (solves.length === 0) {
    return <p className="times-empty">Your solves show up here. Hold space to start.</p>
  }

  return (
    <table className="times">
      <thead>
        <tr>
          <th scope="col">#</th>
          <th scope="col">Time</th>
          <th scope="col">ao5</th>
          <th scope="col">ao12</th>
        </tr>
      </thead>
      <tbody>
        {solves
          .map((s, i) => (
            <tr key={s.id} className={s.id === bestId ? 'is-best' : undefined}>
              <td className="times-index">{i + 1}</td>
              <td>
                <button className="times-time" onClick={() => onOpen(s.id)}>
                  {s.id === bestId && <Shape kind="triangle" className="yellow" />}
                  {s.penalty !== 'none' && <Shape kind="square" className="red" />}
                  {formatSolve(s, decimals)}
                </button>
              </td>
              <td>{formatMs(ao5[i], decimals)}</td>
              <td>{formatMs(ao12[i], decimals)}</td>
            </tr>
          ))
          .reverse()}
      </tbody>
    </table>
  )
}
