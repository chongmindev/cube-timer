import { useEffect, useMemo, useState } from 'react'
import { formatDate, formatMs, formatSolve } from '../lib/format'
import { reconLines, reconSummary } from '../lib/recon/text'
import { cardText, drawCard, type CardData } from '../lib/shareCard'
import { effective, rolling, type Penalty, type Solve } from '../lib/stats'

const PENALTIES: { value: Penalty; label: string }[] = [
  { value: 'none', label: 'No penalty' },
  { value: '+2', label: '+2' },
  { value: 'dnf', label: 'DNF' },
]

export function SolveDetail({
  solves,
  index,
  eventName,
  sessionName,
  decimals,
  onPenalty,
  onDelete,
  onClose,
  onReconstruct,
}: {
  solves: Solve[]
  index: number
  eventName: string
  sessionName: string
  decimals: number
  onPenalty: (p: Penalty) => void
  onDelete: () => void
  onClose: () => void
  /** Only offered for 3x3 events. */
  onReconstruct?: () => void
}) {
  const solve = solves[index]
  const [status, setStatus] = useState<string | null>(null)
  const [card, setCard] = useState<{ url: string; blob: Blob } | null>(null)
  const [shareAs, setShareAs] = useState<'text' | 'image'>('text')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const data: CardData = useMemo(() => {
    const best = Math.min(...solves.map(effective))
    return {
      time: formatSolve(solve, decimals),
      penalty: solve.penalty,
      event: eventName,
      date: new Date(solve.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      scramble: solve.scramble,
      ao5: formatMs(rolling(solves, 5)[index], decimals),
      ao12: formatMs(rolling(solves, 12)[index], decimals),
      isBest: solve.penalty !== 'dnf' && effective(solve) === best,
      solveNumber: index + 1,
      session: sessionName,
      recent: solves.slice(Math.max(0, index - 11), index + 1).map(effective),
      recon: solve.recon?.done ? { lines: reconLines(solve.recon), summary: reconSummary(solve.recon, solve) } : undefined,
    }
  }, [solves, solve, index, eventName, sessionName, decimals])

  // Redraw the card whenever what's on it changes.
  useEffect(() => {
    let url: string | null = null
    let cancelled = false
    drawCard(data).then((canvas) =>
      canvas.toBlob((blob) => {
        if (!blob || cancelled) return
        url = URL.createObjectURL(blob)
        setCard({ url, blob })
      }, 'image/png'),
    )
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [data])

  const flash = (msg: string) => {
    setStatus(msg)
    window.setTimeout(() => setStatus(null), 1800)
  }

  const copyImage = async () => {
    if (!card) return
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': card.blob })])
      flash('Image copied. Paste it anywhere.')
    } catch {
      flash('This browser blocked copying images. Use Save image instead.')
    }
  }

  const saveImage = () => {
    if (!card) return
    const a = document.createElement('a')
    a.href = card.url
    a.download = `${eventName}-${data.time}.png`.replace(/[^\w.+-]/g, '_')
    a.click()
  }

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(cardText(data))
      flash('Copied. Paste it anywhere.')
    } catch {
      flash('Clipboard is blocked in this browser.')
    }
  }

  return (
    <>
      <div className="sheet-scrim" onClick={onClose} />
      <aside className="sheet" aria-label={`Solve ${index + 1}`}>
        <header className="sheet-head">
          <p className="sheet-meta">
            Solve {index + 1}, {eventName}, {formatDate(solve.date)}
          </p>
          <button className="text-button" onClick={onClose}>
            Close
          </button>
        </header>
        <p className="sheet-time">{formatSolve(solve, decimals)}</p>

        <fieldset className="segmented">
          <legend>Penalty</legend>
          {PENALTIES.map((p) => (
            <label key={p.value} className={solve.penalty === p.value ? 'is-on' : undefined}>
              <input
                type="radio"
                name="penalty"
                checked={solve.penalty === p.value}
                onChange={() => onPenalty(p.value)}
              />
              {p.label}
            </label>
          ))}
        </fieldset>

        <section className="sheet-section">
          <h3>Scramble</h3>
          <p className="scramble-text small">{solve.scramble}</p>
        </section>

        {onReconstruct && (
          <section className="sheet-section">
            <div className="side-head">
              <h3>Reconstruction</h3>
              <button className="text-button" onClick={onReconstruct}>
                {solve.recon ? (solve.recon.done ? 'Edit' : 'Continue') : 'Reconstruct'}
              </button>
            </div>
            {solve.recon?.done ? (
              <>
                <pre className="share-text">{data.recon!.lines.join('\n')}</pre>
                <p className="muted">{data.recon!.summary}</p>
              </>
            ) : (
              <p className="muted">
                {solve.recon
                  ? `Draft, ${solve.recon.steps.length} step${solve.recon.steps.length === 1 ? '' : 's'} in.`
                  : 'Work out what you did, step by step, while you still remember it.'}
              </p>
            )}
          </section>
        )}

        <section className="sheet-section share">
          <fieldset className="segmented">
            <legend>Share as</legend>
            {(['text', 'image'] as const).map((v) => (
              <label key={v} className={shareAs === v ? 'is-on' : undefined}>
                <input type="radio" name="share-as" checked={shareAs === v} onChange={() => setShareAs(v)} />
                {v === 'text' ? 'Text' : 'Image'}
              </label>
            ))}
          </fieldset>

          {shareAs === 'text' ? (
            <>
              <pre className="share-text">{cardText(data)}</pre>
              <div className="share-actions">
                <button className="text-button" onClick={copyText}>
                  Copy text
                </button>
              </div>
            </>
          ) : (
            <>
              {card ? (
                <img className="share-card" src={card.url} alt={`Share card: ${eventName} ${data.time}`} />
              ) : (
                <div className="share-card is-loading" />
              )}
              <div className="share-actions">
                <button className="text-button" onClick={copyImage} disabled={!card}>
                  Copy image
                </button>
                <button className="text-button" onClick={saveImage} disabled={!card}>
                  Save image
                </button>
              </div>
            </>
          )}
          {status && (
            <p className="share-status" role="status">
              {status}
            </p>
          )}
        </section>

        <footer className="sheet-actions">
          <button className="text-button danger" onClick={onDelete}>
            Delete solve
          </button>
        </footer>
      </aside>
    </>
  )
}
