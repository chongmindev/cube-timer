import { useCallback, useEffect, useMemo, useState } from 'react'
import { useScramble } from '../hooks/useScramble'
import { useTimer } from '../hooks/useTimer'
import { useUndoDelete } from '../hooks/useUndoDelete'
import { EVENTS, getEvent } from '../lib/events'
import { formatMs, formatSolve, parseTyped, uid } from '../lib/format'
import { useStore } from '../lib/store'
import { effective, sessionStats, type Penalty } from '../lib/stats'
import { CubePreview } from './CubePreview'
import { Menu } from './Menu'
import { Shape } from './Shape'
import { SolveDetail } from './SolveDetail'
import { TimesList } from './TimesList'

export function TimerView({ onFocusChange }: { onFocusChange: (focused: boolean) => void }) {
  const { state, current, dispatch } = useStore()
  const { settings } = state
  const event = getEvent(current.event)
  const { scramble, advance, back, canGoBack } = useScramble(current.event)
  const { remove, clear, toast } = useUndoDelete()

  const [openId, setOpenId] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [justSolvedId, setJustSolvedId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [typed, setTyped] = useState('')
  const [typedError, setTypedError] = useState(false)

  const stats = useMemo(() => sessionStats(current.solves), [current.solves])
  const last = current.solves[current.solves.length - 1] ?? null
  const bestId = useMemo(() => {
    let id: string | null = null
    let best = Infinity
    for (const s of current.solves) if (effective(s) < best) [best, id] = [effective(s), s.id]
    return id
  }, [current.solves])

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
    holdMs: settings.holdMs,
    inspection: settings.inspection,
    enabled: !openId && !menuOpen && !settings.typing && scramble !== null,
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

  // I toggles inspection and T toggles typing whenever the timer is idle.
  useEffect(() => {
    if (openId || menuOpen || timer.phase !== 'idle') return
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return
      const key = e.key.toLowerCase()
      if (key === 'i' && !settings.typing) {
        dispatch({ type: 'updateSettings', patch: { inspection: !settings.inspection } })
      } else if (key === 't') {
        e.preventDefault() // keep the T out of the field that is about to appear
        dispatch({ type: 'updateSettings', patch: { typing: !settings.typing } })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openId, menuOpen, timer.phase, settings.inspection, settings.typing, dispatch])

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
    if (openId || menuOpen || timer.phase !== 'idle' || !last || last.id !== justSolvedId) return
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
  }, [openId, menuOpen, timer.phase, last, justSolvedId, dispatch, remove])

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
          {!settings.typing && (
            <button
              className="toggle"
              aria-pressed={settings.inspection}
              onClick={() => dispatch({ type: 'updateSettings', patch: { inspection: !settings.inspection } })}
              title="Toggle 15 second inspection (I)"
            >
              Inspection <kbd>I</kbd>
            </button>
          )}
          <button
            className="toggle"
            aria-pressed={settings.typing}
            onClick={() => dispatch({ type: 'updateSettings', patch: { typing: !settings.typing } })}
            title="Type times in instead of timing (T)"
          >
            Typing <kbd>T</kbd>
          </button>
          <div className="scramble-actions">
            <button className="text-button" onClick={back} disabled={!canGoBack}>
              Previous scramble
            </button>
            <button className="text-button" onClick={advance} disabled={!scramble}>
              Next scramble
            </button>
            <button className="text-button" onClick={copyScramble} disabled={!scramble}>
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
        <p className={`scramble-text ${scrambleSize}`} aria-live="polite">
          {scramble ?? <span className="muted">Generating scramble</span>}
        </p>
      </section>

      <section
        className="stage"
        onPointerDown={(e) => {
          if (e.button === 0 && timer.phase !== 'running' && !settings.typing) timer.press()
        }}
        onPointerUp={settings.typing ? undefined : timer.release}
        onPointerCancel={settings.typing ? undefined : timer.cancel}
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
          {settings.typing && (typedError || !last) && (
            <p className={`hint ${typedError ? 'is-error' : ''}`}>
              {typedError ? "That isn't a time. " : ''}Type a time and press Enter. 1234 means 12.34; end with + for
              a +2, or type DNF.
            </p>
          )}
          {!last && timer.phase === 'idle' && !settings.typing && (
            <p className="hint">
              {settings.inspection
                ? 'Tap space to start the 15 second inspection, then hold and let go to start.'
                : 'Hold space until the time turns green, then let go to start.'}{' '}
              On a phone, hold the time.
            </p>
          )}
        </div>
      </section>

      <aside className="side side-left chrome">
        {settings.showPreview && <CubePreview puzzle={event.puzzle} scramble={scramble} />}
      </aside>

      <aside className="side side-right chrome">
        <header className="side-head">
          <h2>Times</h2>
          <button className="text-button danger" onClick={clear} disabled={current.solves.length === 0}>
            Clear times
          </button>
        </header>
        <TimesList solves={current.solves} decimals={settings.decimals} onOpen={setOpenId} bestId={bestId} />
      </aside>

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
        />
      )}
      {toast}
    </div>
  )
}
