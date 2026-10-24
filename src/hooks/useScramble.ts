import { useCallback, useEffect, useRef, useState } from 'react'
import { randomScrambleForEvent } from 'cubing/scramble'

async function generate(event: string): Promise<string> {
  return (await randomScrambleForEvent(event)).toString()
}

/**
 * Current scramble for an event, with history so you can step back to earlier scrambles
 * (to redo one) and forward again. A fresh scramble is generated in the background.
 */
export function useScramble(event: string) {
  const [history, setHistory] = useState<string[]>([])
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const next = useRef<Promise<string> | null>(null)
  // Bumped on every event change so stale results are dropped.
  const token = useRef(0)

  const fetchNew = useCallback(() => {
    const mine = token.current
    const pending = next.current ?? generate(event)
    next.current = null
    setLoading(true)
    pending.then((s) => {
      if (mine !== token.current) return
      setHistory((h) => {
        setIndex(h.length)
        return [...h, s]
      })
      setLoading(false)
      next.current = generate(event)
    })
  }, [event])

  useEffect(() => {
    token.current++
    next.current = null
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
