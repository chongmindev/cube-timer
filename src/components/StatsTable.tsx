import { formatMs, formatSolve } from '../lib/format'
import { sessionStats, type Solve } from '../lib/stats'

/**
 * Current and best single and averages. Up to ao100 always shows; bigger averages appear once
 * the session has enough solves for one.
 */
export function StatsTable({
  solves,
  stats,
  decimals,
}: {
  solves: Solve[]
  stats: ReturnType<typeof sessionStats>
  decimals: number
}) {
  const last = solves.at(-1)
  return (
    <table className="stat-table">
      <thead>
        <tr>
          <th scope="col" />
          <th scope="col">Current</th>
          <th scope="col">Best</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row">Single</th>
          <td>{last ? formatSolve(last, decimals) : '-'}</td>
          <td>{formatMs(stats.best, decimals)}</td>
        </tr>
        {stats.averages
          .filter((a) => a.size <= 100 || stats.count >= a.size)
          .map((a) => (
            <tr key={a.label}>
              <th scope="row">{a.label}</th>
              <td>{formatMs(a.current, decimals)}</td>
              <td>{formatMs(a.best, decimals)}</td>
            </tr>
          ))}
      </tbody>
    </table>
  )
}
