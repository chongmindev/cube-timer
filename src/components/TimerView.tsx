import { useCallback, useEffect, useMemo, useState } from 'react'
import { useScramble } from '../hooks/useScramble'
import { useTimer } from '../hooks/useTimer'
import { useUndoDelete } from '../hooks/useUndoDelete'
import { EVENTS, getEvent } from '../lib/events'
import { formatMs, formatSolve, parseTyped, uid } from '../lib/format'
import { useStore } from '../lib/store'
import { sessionStats, type Penalty } from '../lib/stats'
import { useWca } from '../lib/wca'
import { CubePreview } from './CubePreview'
import { Menu } from './Menu'
import { Shape } from './Shape'
import { ImportScrambles } from './ImportScrambles'
import { SolveDetail } from './SolveDetail'
import { TimesList } from './TimesList'

export function TimerView({
  onFocusChange,
  onReconstruct,
}: {
  onFocusChange: (focused: boolean) => void
  onReconstruct: (solveId: string) => void
}) {
  const { state, current, dispatch } = useStore()
  const { settings } = state
  const event = getEvent(current.event)
  const wca = useWca(state.settings.wcaId)
  const officialRecord = wca?.records[event.id]
  const officialBest = officialRecord?.single ? formatMs(officialRecord.single.best * 10, 2) : null
  const officialAverage = officialRecord?.average ? formatMs(officialRecord.average.best * 10, 2) : null
  const { scramble, advance, back, canGoBack, imported, importScrambles, dropImported } = useScramble(current.event)
  const { remove, clear, toast } = useUndoDelete()

  const [openId, setOpenId] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [justSolvedId, setJustSolvedId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [typed, setTyped] = useState('')
  const [typedError, setTypedError] = useState(false)

  const stats = useMemo(() => sessionStats(current.solves), [current.solves])
  const last = current.solves[current.solves.length - 1] ?? null

  const onFinish = useCallback(
    (time: number, penalty: Penalty) => {
      if (!scramble) return
      const solve = { id: uid(), time, penalty, scramble, date: Date.now() }
      const after = sessionStats([...current.solves, solve])
      const improved = (label: string) => {
        const before = stats.averages.find((a) => a.label === label)?.best ?? null
        const now = after.averages.find((a) => a.label === label)?.best ?? null
        return now !== null && now !== Infinity && (before === null || now < before)
      }
      const messages: string[] = []
      if (current.solves.length > 0 && after.best !== null && after.best < (stats.best ?? Infinity)) {
        messages.push('New best single')
      }
      if (stats.averages[1].best !== null && improved('ao5')) messages.push('new best ao5')
      if (stats.averages[2].best !== null && improved('ao12')) messages.push('new best ao12')
      setNotice(messages.length ? messages.join(', ').replace(/^n/, 'N') : null)
      dispatch({ type: 'addSolve', solve })
      setJustSolvedId(solve.id)
      advance()
    },
    [scramble, current.solves, stats, dispatch, advance],
  )

  const timer = useTimer({
    inspection: settings.inspection,
    enabled: !openId && !menuOpen && !importing && !settings.typing && scramble !== null,
    onFinish,
  })

  const solving = !['idle', 'stopped'].includes(timer.phase)
  useEffect(() => {
    onFocusChange(solving && settings.focusMode)
    return () => onFocusChange(false)
  }, [solving, settings.focusMode, onFocusChange])
  useEffect(() => {
    if (solving) setNotice(null)
  }, [solving])

  const submitTyped = () => {
    const result = parseTyped(typed)
    if (!result) {
      setTypedError(typed.trim() !== '')
      return
    }
    onFinish(result.time, result.penalty)
    setTyped('')
    setTypedError(false)
  }

  // Quick keys for the solve that just finished.
  useEffect(() => {
    if (openId || menuOpen || importing || timer.phase !== 'idle' || !last || last.id !== justSolvedId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      if (e.key === '2') togglePenalty('+2')
      else if (e.key.toLowerCase() === 'd') togglePenalty('dnf')
      else if (e.key === 'Backspace' || e.key === 'Delete') remove(last)
    }
    const togglePenalty = (p: Penalty) =>
      dispatch({ type: 'setPenalty', solveId: last.id, penalty: last.penalty === p ? 'none' : p })
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openId, menuOpen, importing, timer.phase, last, justSolvedId, dispatch, remove])

  const display = (() => {
    const d = settings.decimals
    switch (timer.phase) {
      case 'inspecting':
      case 'holding':
      case 'ready':
        if (timer.inspectionLeft !== null) {
          if (timer.inspectionLeft > 0) return String(Math.ceil(timer.inspectionLeft))
          return timer.inspectionLeft > -2 ? '+2' : 'DNF'
        }
        return formatMs(0, d)
      case 'running':
        if (settings.runningDisplay === 'hidden') return 'Solving'
        return formatMs(timer.elapsed, settings.runningDisplay === 'seconds' ? 0 : d)
      default:
        return last ? formatSolve(last, d) : formatMs(0, d)
    }
  })()

  const sessionsForEvent = state.sessions.filter((s) => s.event === current.event)
  const open = current.solves.findIndex((s) => s.id === openId)
  const scrambleSize = !scramble ? '' : scramble.length > 200 ? 'xl' : scramble.length > 90 ? 'lg' : ''
  const ao5 = stats.averages[1]
  const ao12 = stats.averages[2]
  const showQuick = timer.phase === 'idle' && last && last.id === justSolvedId

  const copyScramble = async () => {
    if (!scramble) return
    try {
      await navigator.clipboard.writeText(scramble)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard blocked.
    }
  }

  return (
    <div className="timer-view" data-phase={timer.phase}>
      <section className="scramble-bar chrome">
        <div className="pickers">
          <Menu
            label={event.name}
            onOpenChange={setMenuOpen}
            items={EVENTS.map((e) => ({
              key: e.id,
              label: e.name,
              selected: e.id === current.event,
              onSelect: () => dispatch({ type: 'selectEvent', event: e.id }),
            }))}
          />
          <Menu
            label={current.name}
            onOpenChange={setMenuOpen}
            items={sessionsForEvent.map((s) => ({
              key: s.id,
              label: s.name,
              hint: `${s.solves.length} solves`,
              selected: s.id === current.id,
              onSelect: () => dispatch({ type: 'selectSession', id: s.id }),
            }))}
            footer={
              <button
                className="text-button"
                onClick={() =>
                  dispatch({
                    type: 'createSession',
                    event: current.event,
                    name: `Session ${sessionsForEvent.length + 1}`,
                  })
                }
              >
                New session
              </button>
            }
          />
          {/* Kept in place while typing, so the row never reflows; typed times have no inspection. */}
          <button
            className="toggle"
            aria-pressed={settings.inspection && !settings.typing}
            disabled={settings.typing}
            onClick={() => dispatch({ type: 'updateSettings', patch: { inspection: !settings.inspection } })}
            title={settings.typing ? 'Inspection is off while typing times' : '15 second inspection'}
          >
            Inspection
          </button>
          <button
            className="toggle"
            aria-pressed={settings.typing}
            onClick={() => dispatch({ type: 'updateSettings', patch: { typing: !settings.typing } })}
            title="Type times in instead of timing"
          >
            Typing
          </button>
          {imported ? (
            <button className="text-button" onClick={dropImported} title="Go back to generated scrambles">
              Imported {imported.at} of {imported.total}, stop
            </button>
          ) : (
            <button className="text-button" onClick={() => setImporting(true)} title="Paste scrambles to use next">
              Import
            </button>
          )}
        </div>
        <div className="scramble-row">
          <button
            className="scramble-step"
            onClick={back}
            disabled={!canGoBack}
            aria-label="Previous scramble"
            title="Previous scramble"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M10 2.5L4.5 8L10 13.5" />
            </svg>
          </button>
          <p className={`scramble-text ${scrambleSize}`} aria-live="polite">
            {scramble ? (
              <span>
                {/* Each move stays on one line; browsers would otherwise break Megaminx's R-- at the dash. */}
                {scramble.split(/(\s+)/).map((part, i) => (i % 2 ? part : <span key={i} className="move">{part}</span>))}
                <span className="scramble-tools">
                  <button
                    className="icon-button"
                    onClick={copyScramble}
                    aria-label={copied ? 'Copied' : 'Copy scramble'}
                    title={copied ? 'Copied' : 'Copy scramble'}
                  >
                    <svg viewBox="0 0 16 16" aria-hidden="true">
                      {copied ? (
                        <path d="M2.5 8.5L6.5 12.5L13.5 4" />
                      ) : (
                        <>
                          <path d="M5.5 5.5H13.5V13.5H5.5Z" />
                          <path d="M3.5 10.5H2.5V2.5H10.5V3.5" />
                        </>
                      )}
                    </svg>
                  </button>
                </span>
              </span>
            ) : (
              <span className="muted">Generating scramble</span>
            )}
          </p>
          <button
            className="scramble-step"
            onClick={advance}
            disabled={!scramble}
            aria-label="Next scramble"
            title="Next scramble"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M6 2.5L11.5 8L6 13.5" />
            </svg>
          </button>
        </div>
      </section>

      <section
        className="stage"
        // Touch starts the timer on phones; with a mouse, only Space does.
        onPointerDown={(e) => {
          if (e.pointerType !== 'mouse' && timer.phase !== 'running' && !settings.typing) timer.press()
        }}
        onPointerUp={(e) => e.pointerType !== 'mouse' && !settings.typing && timer.release()}
        onPointerCancel={(e) => e.pointerType !== 'mouse' && !settings.typing && timer.cancel()}
      >
        {settings.typing ? (
          <form
            className="dial is-typing"
            data-error={typedError || undefined}
            onSubmit={(e) => {
              e.preventDefault()
              submitTyped()
            }}
          >
            <span className="disc" aria-hidden="true" />
            <input
              className="digits typed"
              data-long={typed.length > 5 || undefined}
              value={typed}
              onChange={(e) => {
                setTyped(e.target.value)
                setTypedError(false)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setTyped('')
              }}
              placeholder={last ? formatSolve(last, settings.decimals) : formatMs(0, settings.decimals)}
              inputMode="decimal"
              autoComplete="off"
              spellCheck={false}
              autoFocus
              disabled={!scramble || !!openId}
              aria-label="Type a time"
            />
          </form>
        ) : (
          <div className="dial" data-phase={timer.phase}>
            <span className="disc" aria-hidden="true" />
            <p className="digits" aria-live="off" data-long={display.length > 5 || undefined}>
              {display}
            </p>
            {(timer.phase === 'idle' || timer.phase === 'stopped') && (
              <svg className="space-key" viewBox="0 0 40 10" aria-hidden="true">
                <path d="M1.5 0V8.5H38.5V0" />
              </svg>
            )}
          </div>
        )}
        <div className="under chrome">
          {notice && timer.phase === 'idle' && (
            <p className="notice">
              <Shape kind="triangle" className="yellow" size={12} />
              {notice}
            </p>
          )}
          <dl className="glance">
            <div>
              <dt>ao5</dt>
              <dd>{formatMs(ao5.current, settings.decimals)}</dd>
            </div>
            <div>
              <dt>ao12</dt>
              <dd>{formatMs(ao12.current, settings.decimals)}</dd>
            </div>
            <div>
              <dt>Best</dt>
              <dd>{formatMs(stats.best, settings.decimals)}</dd>
            </div>
            {officialBest && (
              <div>
                <dt>WCA</dt>
                <dd title={`Official best single on the WCA${officialAverage ? `; average ${officialAverage}` : ''}`}>
                  {officialBest}
                </dd>
              </div>
            )}
            <div>
              <dt>Solves</dt>
              <dd>{stats.count}</dd>
            </div>
          </dl>
          {showQuick && (
            <div className="quick" onPointerDown={(e) => e.stopPropagation()}>
              <button
                className={`text-button ${last.penalty === '+2' ? 'is-on' : ''}`}
                onClick={() =>
                  dispatch({ type: 'setPenalty', solveId: last.id, penalty: last.penalty === '+2' ? 'none' : '+2' })
                }
              >
                +2 <kbd>2</kbd>
              </button>
              <button
                className={`text-button ${last.penalty === 'dnf' ? 'is-on' : ''}`}
                onClick={() =>
                  dispatch({ type: 'setPenalty', solveId: last.id, penalty: last.penalty === 'dnf' ? 'none' : 'dnf' })
                }
              >
                DNF <kbd>D</kbd>
              </button>
              <button className="text-button danger" onClick={() => remove(last)}>
                Delete <kbd>⌫</kbd>
              </button>
            </div>
          )}
          {settings.typing && typedError && (
            <p className="hint is-error">That isn't a time. 1234 means 12.34; end with + for a +2, or type DNF.</p>
          )}
        </div>
      </section>

      <aside className="side side-left chrome">
        <header className="side-head">
          <h2>Preview</h2>
          <button
            className="icon-button"
            aria-pressed={settings.showPreview}
            onClick={() => dispatch({ type: 'updateSettings', patch: { showPreview: !settings.showPreview } })}
            aria-label="Scramble preview"
            title={settings.showPreview ? 'Hide scramble preview' : 'Show scramble preview'}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M1 8C3 4.6 5.4 3 8 3C10.6 3 13 4.6 15 8C13 11.4 10.6 13 8 13C5.4 13 3 11.4 1 8Z" />
              <path d="M10 8A2 2 0 1 1 6 8A2 2 0 1 1 10 8Z" />
              {!settings.showPreview && <path d="M2.5 13.5L13.5 2.5" />}
            </svg>
          </button>
        </header>
        {settings.showPreview && <CubePreview puzzle={event.puzzle} scramble={scramble} />}
      </aside>

      <aside className="side side-right chrome">
        <header className="side-head">
          <h2>Times</h2>
          <button className="text-button danger" onClick={clear} disabled={current.solves.length === 0}>
            Clear times
          </button>
        </header>
        <TimesList solves={current.solves} decimals={settings.decimals} onOpen={setOpenId} />
      </aside>

      {importing && (
        <ImportScrambles
          event={current.event}
          eventName={event.name}
          onImport={(list) => {
            importScrambles(list)
            setImporting(false)
          }}
          onClose={() => setImporting(false)}
        />
      )}
      {open >= 0 && (
        <SolveDetail
          solves={current.solves}
          sessionName={current.name}
          index={open}
          eventName={event.name}
          decimals={settings.decimals}
          onPenalty={(penalty) => dispatch({ type: 'setPenalty', solveId: current.solves[open].id, penalty })}
          onDelete={() => {
            remove(current.solves[open])
            setOpenId(null)
          }}
          onClose={() => setOpenId(null)}
          onReconstruct={event.puzzle === '3x3x3' ? () => onReconstruct(current.solves[open].id) : undefined}
        />
      )}
      {toast}
    </div>
  )
}
