import { useMemo } from 'react'
import { getEvent } from '../lib/events'
import { formatDate, formatSolve } from '../lib/format'
import { reconSummary } from '../lib/recon/text'
import { useStore } from '../lib/store'

const capitalize = (s: string) => s[0].toUpperCase() + s.slice(1)

/** Every reconstruction from every session, newest solve first. A row opens it to edit. */
export function ReconsView({ onOpen }: { onOpen: (sessionId: string, solveId: string) => void }) {
  const { state } = useStore()
  const decimals = state.settings.decimals

  const recons = useMemo(
    () =>
      state.sessions
        .flatMap((session) =>
          session.solves.flatMap((solve) => (solve.recon ? [{ session, solve, recon: solve.recon }] : [])),
        )
        .sort((a, b) => b.solve.date - a.solve.date),
    [state.sessions],
  )

  return (
    <div className="recons-view">
      <h1>Recons</h1>
      {recons.length === 0 ? (
        <p className="muted">
          No reconstructions yet. Open a 3x3 solve from your times and choose Reconstruct; it's saved here as you go.
        </p>
      ) : (
        <table className="times recons">
          <thead>
            <tr>
              <th scope="col">Time</th>
              <th scope="col">Steps</th>
              <th scope="col">Moves</th>
              <th scope="col">Session</th>
              <th scope="col">Date</th>
            </tr>
          </thead>
          <tbody>
            {recons.map(({ session, solve, recon }) => (
              <tr key={solve.id}>
                <td>
                  <button className="times-time" onClick={() => onOpen(session.id, solve.id)}>
                    {formatSolve(solve, decimals)}
                  </button>
                </td>
                <td className="recons-steps">
                  {recon.steps
                    .map((s) => s.label)
                    .filter(Boolean)
                    .map(capitalize)
                    .join(', ') || '-'}
                  {!recon.done && <span className="recons-draft">Draft</span>}
                </td>
                <td>{reconSummary(recon, solve)}</td>
                <td className="muted">
                  {getEvent(session.event).name}, {session.name}
                </td>
                <td className="muted">{formatDate(solve.date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
