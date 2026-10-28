import { useMemo, useState } from 'react'
import { useUndoDelete } from '../hooks/useUndoDelete'
import { EVENTS, getEvent } from '../lib/events'
import { formatDate, formatMs, formatSolve } from '../lib/format'
import { useStore } from '../lib/store'
import { sessionStats } from '../lib/stats'
import { SolveDetail } from './SolveDetail'
import { TimesList } from './TimesList'

export function SessionsView({
  onOpenTimer,
  onReconstruct,
}: {
  onOpenTimer: () => void
  onReconstruct: (solveId: string) => void
}) {
  const { state, current, dispatch } = useStore()
  const decimals = state.settings.decimals
  const stats = useMemo(() => sessionStats(current.solves), [current.solves])
  const [renaming, setRenaming] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const { remove, clear, toast } = useUndoDelete()
  const open = current.solves.findIndex((s) => s.id === openId)
  const last = current.solves.at(-1)

  // Group sessions under their event, in event order.
  const groups = EVENTS.map((e) => ({ event: e, sessions: state.sessions.filter((s) => s.event === e.id) })).filter(
    (g) => g.sessions.length > 0,
  )

  return (
    <div className="sessions-view">
      <nav className="session-index" aria-label="Sessions">
        {groups.map((g) => (
          <section key={g.event.id}>
            <h2>{g.event.name}</h2>
            <ul>
              {g.sessions.map((s) => (
                <li key={s.id}>
                  <button
                    className={`session-link ${s.id === current.id ? 'is-current' : ''}`}
                    onClick={() => {
                      dispatch({ type: 'selectSession', id: s.id })
                      setRenaming(false)
                      setConfirmDelete(false)
                    }}
                  >
                    <span>{s.name}</span>
                    <span className="muted">{s.solves.length}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <button
          className="text-button"
          onClick={() => dispatch({ type: 'createSession', event: current.event, name: 'New session' })}
        >
          New {getEvent(current.event).name} session
        </button>
      </nav>

      <article className="session-detail">
        <header className="session-head">
          {renaming ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const name = new FormData(e.currentTarget).get('name')?.toString().trim()
                if (name) dispatch({ type: 'renameSession', id: current.id, name })
                setRenaming(false)
              }}
            >
              <input name="name" defaultValue={current.name} autoFocus aria-label="Session name" className="rename" />
            </form>
          ) : (
            <h1>{current.name}</h1>
          )}
          <p className="muted">
            {getEvent(current.event).name}, started {formatDate(current.created)}
          </p>
          <div className="session-actions">
            <button className="text-button" onClick={onOpenTimer}>
              Practice this session
            </button>
            <button className="text-button" onClick={() => setRenaming(!renaming)}>
              {renaming ? 'Cancel rename' : 'Rename'}
            </button>
            <button className="text-button danger" onClick={clear} disabled={current.solves.length === 0}>
              Clear times
            </button>
            <button
              className="text-button danger"
              onClick={() => {
                if (confirmDelete) {
                  dispatch({ type: 'deleteSession', id: current.id })
                  setConfirmDelete(false)
                } else setConfirmDelete(true)
              }}
              onBlur={() => setConfirmDelete(false)}
            >
              {confirmDelete ? `Delete ${current.solves.length} solves for good?` : 'Delete session'}
            </button>
          </div>
        </header>

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
            {stats.averages.map((a) => (
              <tr key={a.label}>
                <th scope="row">{a.label}</th>
                <td>{formatMs(a.current, decimals)}</td>
                <td>{formatMs(a.best, decimals)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="session-summary">
          {stats.count} solves, mean {formatMs(stats.mean, decimals)}, worst {formatMs(stats.worst, decimals)}
          {stats.dnfs > 0 && `, ${stats.dnfs} DNF`}
        </p>

        <TimesList solves={current.solves} decimals={decimals} onOpen={setOpenId} bestId={null} />
      </article>

      {open >= 0 && (
        <SolveDetail
          solves={current.solves}
          sessionName={current.name}
          index={open}
          eventName={getEvent(current.event).name}
          decimals={decimals}
          onPenalty={(penalty) => dispatch({ type: 'setPenalty', solveId: current.solves[open].id, penalty })}
          onDelete={() => {
            remove(current.solves[open])
            setOpenId(null)
          }}
          onClose={() => setOpenId(null)}
          onReconstruct={getEvent(current.event).puzzle === '3x3x3' ? () => onReconstruct(current.solves[open].id) : undefined}
        />
      )}
      {toast}
    </div>
  )
}
