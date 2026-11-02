import { useEffect, useMemo, useState } from 'react'
import { formatSolve } from '../lib/format'
import {
  COLOR_NAMES,
  apply,
  holdRotation,
  parseAlg,
  solvedState,
  type State,
} from '../lib/recon/cube'
import { reconLines, reconSummary } from '../lib/recon/text'
import { crossColor, describeStep, stageOf } from '../lib/recon/suggest'
import { useSuggestions } from '../lib/recon/useSuggestions'
import type { Recon, Solve } from '../lib/stats'
import { Cube3D } from './Cube3D'
import { LastLayerCase } from './FaceletNet'
import { COLORS } from './ScrambleNet'

const FACE_FOR_COLOR = ['U', 'R', 'F', 'D', 'L', 'B'] as const
const OPPOSITE = [3, 4, 5, 0, 1, 2]
const STAGE_TITLE = { hold: 'How you held it', cross: 'Cross', f2l: 'F2L', oll: 'OLL', pll: 'PLL', done: 'Solved' }

export function ReconstructView({
  solve,
  index,
  eventName,
  decimals,
  onSave,
  onClose,
}: {
  solve: Solve
  index: number
  eventName: string
  decimals: number
  onSave: (recon: Recon | undefined) => void
  onClose: () => void
}) {
  const [steps, setSteps] = useState(solve.recon?.steps ?? [])
  const [input, setInput] = useState('')
  const [pairPick, setPairPick] = useState<string | null>(null)
  const [bottom, setBottom] = useState<number | null>(null)
  const [playToken, setPlayToken] = useState(0)
  // What the cube shows: null is the latest step plus what you're typing, a number is that one
  // step, and 'all' is the whole solve from the scramble.
  const [viewing, setViewing] = useState<number | 'all' | null>(null)
  // The moves of the step being edited, while one is open.
  const [draft, setDraft] = useState('')

  const scrambled = useMemo(() => apply(solvedState(), solve.scramble), [solve.scramble])
  const after = (list: typeof steps, n = list.length) =>
    list.slice(0, n).reduce<State>((s, step) => (step.moves.trim() ? apply(s, step.moves) : s), scrambled)
  const current = useMemo(() => after(steps), [steps, scrambled]) // eslint-disable-line react-hooks/exhaustive-deps
  const stage = steps.length === 0 ? 'hold' : stageOf(current)
  const done = stage === 'done'

  // Save as you go, so a half-done reconstruction is kept as a draft.
  useEffect(() => {
    onSave(steps.length ? { steps, done } : undefined)
  }, [steps, done]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !(e.target instanceof HTMLInputElement) && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const parsed = input.trim() ? parseAlg(input) : []
  const preview = parsed && parsed.length ? apply(current, parsed.join(' ')) : current
  const typed = parsed ? parsed.join(' ') : ''
  const upTo = (n: number) => [solve.scramble, ...steps.slice(0, n).map((s) => s.moves)].filter(Boolean).join(' ')
  const draftParsed = draft.trim() ? parseAlg(draft) : []
  const draftMoves = draftParsed ? draftParsed.join(' ') : ''
  const view =
    viewing === null
      ? { setup: upTo(steps.length), moves: typed }
      : viewing === 'all'
        ? { setup: solve.scramble, moves: steps.map((s) => s.moves).filter(Boolean).join(' ') }
        : { setup: upTo(viewing), moves: draftMoves }
  const play = (v: number | 'all' | null) => {
    setViewing(v)
    setPlayToken((t) => t + 1)
  }
  const fill = (moves: string) => {
    setInput(moves)
    setViewing(null)
  }
  const edit = (next: typeof steps) => {
    setSteps(next)
    setViewing(null)
  }
  // Steps after a changed one may now do something else, so their labels are worked out again.
  const relabel = (list: typeof steps, from: number) => {
    let s = after(list, from)
    return list.map((step, i) => {
      if (i < from) return step
      const next = step.moves.trim() ? apply(s, step.moves) : s
      const label = i === 0 ? step.label : describeStep(s, next).label
      s = next
      return { ...step, label }
    })
  }
  const saveStep = (i: number) => {
    if (draftParsed === null || (i > 0 && !draftMoves)) return
    edit(relabel(steps.map((s, j) => (j === i ? { ...s, moves: draftMoves } : s)), i))
  }
  const deleteStep = (i: number) => edit(relabel(steps.filter((_, j) => j !== i), i))
  const editing = typeof viewing === 'number' ? viewing : null
  const draftCheck = (() => {
    if (editing === null) return null
    if (draftParsed === null) return { text: 'That isn’t notation the app reads.', warn: true }
    if (editing === 0) return { text: draftMoves ? `Held with ${draftMoves}.` : 'Held as scrambled.', warn: false }
    if (!draftMoves) return { text: 'Type the moves for this step, or delete it.', warn: true }
    const before = after(steps, editing)
    const c = describeStep(before, apply(before, draftMoves))
    return { text: [c.label && `Solves the ${c.label}.`, c.warning].filter(Boolean).join(' ') || 'Later steps stay as they are.', warn: !!c.warning }
  })()
  const check =
    stage === 'hold' || !parsed || !parsed.length ? null : describeStep(current, preview)

  const job = stage === 'hold' ? 'hold' : stage === 'cross' ? 'cross' : stage === 'f2l' ? 'f2l' : stage === 'done' ? null : 'll'
  const holdInfo = useSuggestions(stage === 'hold' ? 'hold' : null, scrambled)
  const cross = useSuggestions(job === 'cross' ? 'cross' : null, current)
  const f2l = useSuggestions(job === 'f2l' ? 'f2l' : null, current)
  const ll = useSuggestions(job === 'll' ? 'll' : null, current)
  const loading = job && !(holdInfo || cross || f2l || ll)

  const selectedPair = f2l?.find((p) => p.pair === pairPick) ?? f2l?.[0] ?? null

  const addStep = () => {
    if (parsed === null) return
    const moves = parsed.join(' ')
    if (stage !== 'hold' && !moves) return
    const label = stage === 'hold' ? 'inspection' : describeStep(current, preview).label
    edit([...steps, { moves, label }])
    setInput('')
    setPairPick(null)
  }

  const lines = reconLines({ steps, done })
  const summary = reconSummary({ steps, done }, solve)

  return (
    <div className="recon-view">
      <header className="recon-head">
        <button className="text-button" onClick={onClose}>
          Back
        </button>
        <div>
          <h1 className="recon-title">
            {formatSolve(solve, decimals)} <span className="muted">Solve {index + 1}, {eventName}</span>
          </h1>
          <p className="scramble-text small">{solve.scramble}</p>
        </div>
      </header>

      <div className="recon-grid">
        <section className="recon-cube">
          <Cube3D
            setup={view.setup}
            moves={view.moves}
            highlight={
              viewing === null && stage === 'f2l' && !input && selectedPair
                ? { pair: selectedPair.pair, crossColor: crossColor(current) }
                : null
            }
            playToken={playToken}
          />
          <p className="muted recon-caption">
            {viewing === 'all'
              ? 'The whole solve, from the scramble.'
              : viewing !== null
                ? `Your ${steps[viewing].label || 'step'}.`
                : steps.length === 0
                  ? 'As scrambled: white top, green front.'
                  : typed
                    ? 'After the moves you’re typing.'
                    : 'From how you held it, after the last step.'}
          </p>
          <div className="recon-step-actions">
            {viewing === null && typed && (
              <button className="text-button" onClick={() => play(null)}>
                Play these moves
              </button>
            )}
            {viewing !== null && (
              <button className="text-button" onClick={() => play(viewing)}>
                Play again
              </button>
            )}
            {steps.some((s) => s.moves) && (
              <button className="text-button" onClick={() => play('all')}>
                Play solve
              </button>
            )}
            {viewing !== null && (
              <button className="text-button" onClick={() => setViewing(null)}>
                Back to {done ? 'the end' : 'this step'}
              </button>
            )}
          </div>
        </section>

        <section className="recon-steps">
          <h2>Steps</h2>
          <ol>
            {steps.map((s, i) => (
              <li key={i}>
                <button
                  className={`recon-row recon-step ${viewing === i ? 'is-on' : ''}`}
                  onClick={() => {
                    if (viewing !== i) setDraft(s.moves)
                    play(i)
                  }}
                  aria-pressed={viewing === i}
                  title="Show and edit this step"
                >
                  <span className="muted">{s.label || 'step'}</span>
                  <span className="recon-moves">{s.moves || 'no rotation'}</span>
                  <span className="muted">{s.moves ? parseAlg(s.moves)!.filter((m) => !/^[xyz]/.test(m)).length : ''}</span>
                </button>
                {editing === i && draftCheck && (
                  <form
                    className="recon-input recon-edit"
                    onSubmit={(e) => {
                      e.preventDefault()
                      saveStep(i)
                    }}
                  >
                    <input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder={i === 0 ? 'Rotation, like z2' : 'Moves for this step'}
                      spellCheck={false}
                      autoComplete="off"
                      aria-label={`Moves for your ${s.label || 'step'}`}
                    />
                    <p className={`recon-check ${draftCheck.warn ? 'is-warn' : ''}`}>{draftCheck.text}</p>
                    <div className="recon-step-actions">
                      <button
                        type="submit"
                        className="text-button"
                        disabled={draftParsed === null || (i > 0 && !draftMoves) || draftMoves === s.moves}
                      >
                        Save step
                      </button>
                      <button type="button" className="text-button" onClick={() => setViewing(null)}>
                        Cancel
                      </button>
                      {i > 0 && (
                        <button type="button" className="text-button danger" onClick={() => deleteStep(i)}>
                          Delete step
                        </button>
                      )}
                    </div>
                  </form>
                )}
              </li>
            ))}
            {!done && (
              <li className="recon-row is-now">
                <span>{STAGE_TITLE[stage]}</span>
                <span className="recon-moves muted">{input || '…'}</span>
                <span />
              </li>
            )}
          </ol>
          <div className="recon-step-actions">
            <button className="text-button" onClick={() => edit(steps.slice(0, -1))} disabled={!steps.length}>
              Undo last step
            </button>
            <button className="text-button danger" onClick={() => edit([])} disabled={!steps.length}>
              Start over
            </button>
          </div>
        </section>

        <section className="recon-suggest">
          {done ? (
            <div className="recon-done">
              <h2>Reconstruction</h2>
              <pre className="share-text">{lines.join('\n')}</pre>
              <p>{summary}</p>
              <button className="text-button" onClick={onClose}>
                Done
              </button>
            </div>
          ) : (
            <>
              <h2>{STAGE_TITLE[stage]}</h2>
              <div className="recon-suggest-list">
                {loading && <p className="muted">Finding likely moves…</p>}

                {stage === 'hold' && (
                  <div className="recon-hold">
                    <p className="muted">Which color was your cross? The number is its fewest moves.</p>
                    <div className="swatches">
                      {COLOR_NAMES.map((name, c) => (
                        <button
                          key={c}
                          className={`swatch ${bottom === c ? 'is-on' : ''}`}
                          onClick={() => {
                            setBottom(c)
                            fill(holdRotation(c, c === 0 || c === 3 ? 2 : 0) ?? '')
                          }}
                          aria-pressed={bottom === c}
                        >
                          <span className="chip" style={{ background: COLORS[FACE_FOR_COLOR[c]] }} />
                          {name}
                          <span className="muted">{holdInfo ? holdInfo[c] : ''}</span>
                        </button>
                      ))}
                    </div>
                    {bottom !== null && (
                      <>
                        <p className="muted">And the front?</p>
                        <div className="swatches">
                          {COLOR_NAMES.map((name, c) =>
                            c === bottom || c === OPPOSITE[bottom] ? null : (
                              <button key={c} className="swatch" onClick={() => fill(holdRotation(bottom, c) ?? '')}>
                                <span className="chip" style={{ background: COLORS[FACE_FOR_COLOR[c]] }} />
                                {name}
                              </button>
                            ),
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {stage === 'cross' && cross && (
                  <ul className="recon-options">
                    {cross.cross.map((m) => (
                      <li key={m}>
                        <button onClick={() => fill(m)}>
                          <span className="recon-moves">{m}</span>
                          <small>Cross, {m.split(' ').length} moves</small>
                        </button>
                      </li>
                    ))}
                    {cross.xcross.map((x) => (
                      <li key={x.moves}>
                        <button onClick={() => fill(x.moves)}>
                          <span className="recon-moves">{x.moves}</span>
                          <small>X-cross with the {x.name} pair, {x.moves.split(' ').length} moves</small>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {stage === 'f2l' && f2l && (
                  <>
                    <ul className="recon-pairs">
                      {f2l.map((p) => (
                        <li key={p.pair}>
                          <button
                            className={selectedPair?.pair === p.pair ? 'is-on' : ''}
                            onClick={() => {
                              setPairPick(p.pair)
                              setViewing(null)
                            }}
                            aria-pressed={selectedPair?.pair === p.pair}
                          >
                            <span className="pair-chips">
                              {p.pair.split('-').map((c) => (
                                <span key={c} className="chip" style={{ background: COLORS[FACE_FOR_COLOR[Number(c)]] }} />
                              ))}
                            </span>
                            {p.name}
                            <small>
                              goes {p.slot}.{' '}
                              {p.visible === 2 ? 'Both pieces in view.' : p.visible === 1 ? 'One piece in view.' : 'Hidden.'}
                            </small>
                          </button>
                        </li>
                      ))}
                    </ul>
                    {selectedPair && (
                      <ul className="recon-options">
                        {selectedPair.moves.map((m) => (
                          <li key={m}>
                            <button onClick={() => fill(m)}>
                              <span className="recon-moves">{m}</span>
                            </button>
                          </li>
                        ))}
                        {!selectedPair.moves.length && <li className="muted">No short solution found. Type yours.</li>}
                      </ul>
                    )}
                  </>
                )}

                {(stage === 'oll' || stage === 'pll') && ll && (
                  <>
                    <div className="recon-case">
                      <LastLayerCase state={current} mode={stage} />
                      <p>{ll.name ?? 'Unknown case'}</p>
                    </div>
                    <ul className="recon-options">
                      {ll.algs.map((m) => (
                        <li key={m}>
                          <button onClick={() => fill(m)}>
                            <span className="recon-moves">{m}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
              <form
                className="recon-input"
                onSubmit={(e) => {
                  e.preventDefault()
                  addStep()
                }}
              >
                <input
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value)
                    setViewing(null)
                  }}
                  placeholder={stage === 'hold' ? 'Rotation, like z2' : 'Pick one above, or type your moves'}
                  spellCheck={false}
                  autoComplete="off"
                  aria-label="Moves for this step"
                />
                <p className={`recon-check ${parsed === null || check?.warning ? 'is-warn' : ''}`}>
                  {parsed === null
                    ? 'That isn’t notation the app reads. Use moves like R U R\' U\', with w, x, y, z, M, E, S.'
                    : stage === 'hold'
                      ? input.trim()
                        ? `Held with ${input.trim()}.`
                        : 'Held as scrambled.'
                      : check
                        ? [check.label && `Solves the ${check.label}.`, check.warning].filter(Boolean).join(' ')
                        : ''}
                </p>
                <button
                  type="submit"
                  className="text-button"
                  disabled={parsed === null || (stage !== 'hold' && !input.trim())}
                >
                  Add step
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
