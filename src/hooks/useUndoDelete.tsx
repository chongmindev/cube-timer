import { useCallback, useRef, useState } from 'react'
import { useStore } from '../lib/store'
import type { Solve } from '../lib/stats'

/** Deletes immediately and offers a few seconds to undo, instead of a confirm prompt. */
export function useUndoDelete() {
  const { current, dispatch } = useStore()
  // Snapshot of the session's solves from before the change.
  const [pending, setPending] = useState<{ sessionId: string; solves: Solve[]; message: string } | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const stash = useCallback(
    (message: string) => {
      setPending({ sessionId: current.id, solves: current.solves, message })
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setPending(null), 6000)
    },
    [current],
  )

  const remove = useCallback(
    (solve: Solve) => {
      if (!current.solves.some((s) => s.id === solve.id)) return
      stash('Solve deleted.')
      dispatch({ type: 'deleteSolve', solveId: solve.id })
    },
    [current, dispatch, stash],
  )

  const clear = useCallback(() => {
    if (current.solves.length === 0) return
    const n = current.solves.length
    stash(`Cleared ${n} ${n === 1 ? 'solve' : 'solves'}.`)
    dispatch({ type: 'setSolves', sessionId: current.id, solves: [] })
  }, [current, dispatch, stash])

  const undo = () => {
    if (!pending) return
    dispatch({ type: 'setSolves', sessionId: pending.sessionId, solves: pending.solves })
    setPending(null)
  }

  const toast = pending ? (
    <div className="toast" role="status">
      {pending.message}
      <button className="text-button" onClick={undo}>
        Undo
      </button>
    </div>
  ) : null

  return { remove, clear, toast }
}
