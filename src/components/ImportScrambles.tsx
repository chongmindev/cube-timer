import { useEffect, useMemo, useState } from 'react'
import { parseScrambles } from '../lib/importScrambles'

/** Side panel for pasting scrambles to use next, one per line. */
export function ImportScrambles({
  event,
  eventName,
  onImport,
  onClose,
}: {
  event: string
  eventName: string
  onImport: (scrambles: string[]) => void
  onClose: () => void
}) {
  const [text, setText] = useState('')
  const scrambles = useMemo(() => parseScrambles(text, event), [text, event])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      <div className="sheet-scrim" onClick={onClose} />
      <aside className="sheet" aria-label="Import scrambles">
        <header className="sheet-head">
          <p className="sheet-meta">Import {eventName} scrambles</p>
          <button className="text-button" onClick={onClose}>
            Close
          </button>
        </header>
        <form
          className="import-form"
          onSubmit={(e) => {
            e.preventDefault()
            onImport(scrambles)
          }}
        >
          <textarea
            className="import-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={event === 'minx' ? 'Seven lines per scramble' : 'One scramble per line'}
            aria-label="Scrambles, one per line"
            spellCheck={false}
            autoFocus
          />
          <div className="sheet-actions">
            <button type="submit" className="text-button" disabled={!scrambles.length}>
              {scrambles.length ? `Use ${scrambles.length} scramble${scrambles.length === 1 ? '' : 's'}` : 'Use scrambles'}
            </button>
          </div>
        </form>
      </aside>
    </>
  )
}
