import { FACES, type State } from '../lib/recon/cube'
import { COLORS } from './ScrambleNet'

const PLACES: [number, number, number][] = [
  [0, 1, 0], // U
  [4, 0, 1], // L
  [2, 1, 1], // F
  [1, 2, 1], // R
  [5, 3, 1], // B
  [3, 1, 2], // D
]
const FACE = 30
const GAP = 3
const CELL = (FACE - 1) / 3

/** Unfolded 3x3 drawn from a facelet state. Stickers outside `highlight` fade back when it is set. */
export function FaceletNet({ state, highlight }: { state: State; highlight?: number[] | null }) {
  const lit = highlight ? new Set(highlight) : null
  return (
    <svg className="net" viewBox={`0 0 ${4 * FACE + 3 * GAP} ${3 * FACE + 2 * GAP}`} role="img" aria-label="Cube, unfolded">
      {PLACES.map(([f, cx, cy]) => {
        const x0 = cx * (FACE + GAP)
        const y0 = cy * (FACE + GAP)
        return (
          <g key={f}>
            <rect x={x0} y={y0} width={FACE} height={FACE} fill="#000" />
            {Array.from({ length: 9 }, (_, k) => {
              const i = f * 9 + k
              return (
                <rect
                  key={k}
                  x={x0 + 1 + (k % 3) * CELL}
                  y={y0 + 1 + Math.floor(k / 3) * CELL}
                  width={CELL - 1}
                  height={CELL - 1}
                  fill={COLORS[FACES[state[i]]]}
                  opacity={lit && !lit.has(i) ? 0.22 : 1}
                />
              )
            })}
          </g>
        )
      })}
    </svg>
  )
}

/**
 * Last-layer case seen from above, front at the bottom. For OLL only the top color shows;
 * for PLL every sticker keeps its color.
 */
export function LastLayerCase({ state, mode }: { state: State; mode: 'oll' | 'pll' }) {
  const top = state[4]
  const S = 20
  const color = (i: number) =>
    mode === 'oll' ? (state[i] === top ? COLORS[FACES[top]] : 'var(--muted)') : COLORS[FACES[state[i]]]
  const cells: { x: number; y: number; w: number; h: number; i: number }[] = []
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) cells.push({ x: 1 + c, y: 1 + r, w: 1, h: 1, i: r * 3 + c })
  // Side stickers: top row of each side face, ordered left to right as seen from above.
  for (let k = 0; k < 3; k++) {
    cells.push({ x: 1 + k, y: 4.15, w: 1, h: 0.6, i: 2 * 9 + k }) // F
    cells.push({ x: 3 - k, y: 0.25, w: 1, h: 0.6, i: 5 * 9 + k }) // B
    cells.push({ x: 0.25, y: 1 + k, w: 0.6, h: 1, i: 4 * 9 + k }) // L
    cells.push({ x: 4.15, y: 3 - k, w: 0.6, h: 1, i: 1 * 9 + k }) // R
  }
  return (
    <svg className="ll-case" viewBox={`0 0 ${5 * S} ${5 * S}`} role="img" aria-label="Last layer case from above">
      <rect x={S - 2} y={S - 2} width={3 * S + 4} height={3 * S + 4} fill="#000" />
      {cells.map((c, n) => (
        <rect key={n} x={c.x * S + 1} y={c.y * S + 1} width={c.w * S - 2} height={c.h * S - 2} fill={color(c.i)} />
      ))}
    </svg>
  )
}
