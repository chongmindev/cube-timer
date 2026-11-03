import { useCallback, useRef, useState } from 'react'
import { summarize } from '../lib/activity'
import { uid } from '../lib/format'
import { useStore, type Session } from '../lib/store'
import type { Solve } from '../lib/stats'

const solvesText = (n: number) => `${n} ${n === 1 ? 'solve' : 'solves'}`

/** Deletes immediately and offers a few seconds to undo, instead of a confirm prompt. */
export function useUndoDelete() {
  const { state, current, dispatch } = useStore()
  // Snapshot of the session's solves from before the change, and the activity it kept, if any.
  // Without a snapshot the message is a notice with nothing to undo.
  const [pending, setPending] = useState<{
    restore?: { sessionId: string; solves: Solve[]; batchId?: string }
    message: string
  } | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const show = useCallback((p: NonNullable<typeof pending>) => {
    setPending(p)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setPending(null), 6000)
  }, [])

  /** Keeps a session's solves in the activity graph when the setting is on; returns the batch id. */
  const keep = useCallback(
    (session: Session) => {
      if (!state.settings.keepActivity || session.solves.length === 0) return undefined
      const batch = { id: uid(), days: summarize(session.solves, session.event) }
      dispatch({ type: 'archive', batch })
      return batch.id
    },
    [state.settings.keepActivity, dispatch],
  )

  const remove = useCallback(
    (solve: Solve) => {
      if (!current.solves.some((s) => s.id === solve.id)) return
      show({ restore: { sessionId: current.id, solves: current.solves }, message: 'Solve deleted.' })
      dispatch({ type: 'deleteSolve', solveId: solve.id })
    },
    [current, dispatch, show],
  )

  const clear = useCallback(() => {
    if (current.solves.length === 0) return
    const batchId = keep(current)
    const n = solvesText(current.solves.length)
    show({
      restore: { sessionId: current.id, solves: current.solves, batchId },
      message: batchId ? `Cleared ${n}. Added to your activity.` : `Cleared ${n}.`,
    })
    dispatch({ type: 'setSolves', sessionId: current.id, solves: [] })
  }, [current, dispatch, keep, show])

  /** Deletes the current session for good, after the caller has confirmed. */
  const deleteSession = useCallback(() => {
    const batchId = keep(current)
    show({
      message: batchId
        ? `Deleted ${current.name}. Its ${solvesText(current.solves.length)} were added to your activity.`
        : `Deleted ${current.name}.`,
    })
    dispatch({ type: 'deleteSession', id: current.id })
  }, [current, dispatch, keep, show])

  const undo = () => {
    const r = pending?.restore
    if (!r) return
    dispatch({ type: 'setSolves', sessionId: r.sessionId, solves: r.solves })
    if (r.batchId) dispatch({ type: 'unarchive', id: r.batchId })
    setPending(null)
  }

  const toast = pending ? (
    <div className="toast" role="status">
      {pending.message}
      {pending.restore && (
        <button className="text-button" onClick={undo}>
          Undo
        </button>
      )}
    </div>
  ) : null

  return { remove, clear, deleteSession, toast }
}
