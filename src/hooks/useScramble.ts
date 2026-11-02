import { useCallback, useEffect, useRef, useState } from 'react'
import { generate, takeSaved } from '../lib/scramblePool'

/**
 * Current scramble for an event, with history so you can step back to earlier scrambles
 * (to redo one) and forward again. New scrambles come from the saved pool when one is ready,
 * so they show up instantly; otherwise one is generated live.
 */
export function useScramble(event: string) {
  const [history, setHistory] = useState<string[]>([])
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  // Bumped on every event change so stale results are dropped.
  const token = useRef(0)

  const fetchNew = useCallback(() => {
    const push = (s: string) => {
      setHistory((h) => {
        setIndex(h.length)
        return [...h, s]
      })
      setLoading(false)
    }
    const saved = takeSaved(event)
    if (saved) return push(saved)
    const mine = token.current
    setLoading(true)
    generate(event).then((s) => mine === token.current && push(s))
  }, [event])

  useEffect(() => {
    token.current++
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

  return {
    scramble: loading ? null : (history[index] ?? null),
    advance,
    back,
    canGoBack: !loading && index > 0,
  }
}
