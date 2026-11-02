import { useCallback, useEffect, useRef, useState } from 'react'
import { generate, takeSaved } from '../lib/scramblePool'

/**
 * Current scramble for an event, with history so you can step back to earlier scrambles
 * (to redo one) and forward again. Imported scrambles come first, in order. After that, new
 * scrambles come from the saved pool when one is ready, so they show up instantly; otherwise
 * one is generated live.
 */
export function useScramble(event: string) {
  const [history, setHistory] = useState<string[]>([])
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  // Bumped on every event change so stale results are dropped.
  const token = useRef(0)
  // Imported scrambles not shown yet, and how many were imported.
  const queue = useRef<string[]>([])
  const [imported, setImported] = useState<{ left: number; total: number } | null>(null)

  const fetchNew = useCallback(() => {
    const push = (s: string) => {
      setHistory((h) => {
        setIndex(h.length)
        return [...h, s]
      })
      setLoading(false)
    }
    const next = queue.current.shift()
    if (next) {
      setImported((i) => i && { ...i, left: queue.current.length })
      return push(next)
    }
    // Past the last imported scramble: back to generated ones.
    setImported(null)
    const saved = takeSaved(event)
    if (saved) return push(saved)
    const mine = token.current
    setLoading(true)
    generate(event).then((s) => mine === token.current && push(s))
  }, [event])

  useEffect(() => {
    token.current++
    queue.current = []
    setImported(null)
    setHistory([])
    setIndex(0)
    fetchNew()
  }, [event, fetchNew])

  const advance = useCallback(() => {
    if (index < history.length - 1) setIndex(index + 1)
    else fetchNew()
  }, [index, history.length, fetchNew])

  const back = useCallback(() => {
    if (index > 0) setIndex(index - 1)
  }, [index])

  /** Uses these scrambles next, in order, starting now. */
  const importScrambles = useCallback(
    (list: string[]) => {
      if (!list.length) return
      token.current++ // a scramble still generating would land after the first import
      queue.current = [...list]
      setImported({ left: list.length, total: list.length })
      fetchNew()
    },
    [fetchNew],
  )

  /** Drops the imported scrambles that haven't come up yet and goes back to generated ones. */
  const dropImported = useCallback(() => {
    queue.current = []
    fetchNew()
  }, [fetchNew])

  return {
    scramble: loading ? null : (history[index] ?? null),
    advance,
    back,
    canGoBack: !loading && index > 0,
    /** Which imported scramble is showing (1-based) and how many there are, while importing. */
    imported: imported && { at: imported.total - imported.left, total: imported.total },
    importScrambles,
    dropImported,
  }
}
