import { useMemo } from 'react'
import { scrambledFaces, type Face } from '../lib/cubeState'

// WCA color scheme (white top, green front), tuned to the app's primaries.
export const COLORS: Record<Face, string> = {
  U: '#ffffff',
  F: '#29a35a',
  R: 'var(--red)',
  B: 'var(--blue)',
  L: '#e06400',
  D: 'var(--yellow)',
}

// Unfolded cross: U above F, then L F R B across, D below.
const PLACES: [Face, number, number][] = [
  ['U', 1, 0],
  ['L', 0, 1],
  ['F', 1, 1],
  ['R', 2, 1],
  ['B', 3, 1],
  ['D', 1, 2],
]

const FACE = 30
const GAP = 3

/** Flat net of an NxN cube after the scramble: square stickers set into solid black faces. */
export function ScrambleNet({ size, scramble }: { size: number; scramble: string | null }) {
  const faces = useMemo(() => (scramble ? scrambledFaces(size, scramble) : null), [size, scramble])
  const inset = size > 5 ? 0.6 : 1
  const cell = (FACE - inset) / size
  const w = 4 * FACE + 3 * GAP
  const h = 3 * FACE + 2 * GAP

  return (
    <svg className="net" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Scrambled cube, unfolded">
      {PLACES.map(([face, cx, cy]) => {
        const x0 = cx * (FACE + GAP)
        const y0 = cy * (FACE + GAP)
        return (
          <g key={face}>
            <rect x={x0} y={y0} width={FACE} height={FACE} fill="#000" />
            {faces?.[face].map((row, r) =>
              row.map((c, col) => (
                <rect
                  key={`${r}-${col}`}
                  x={x0 + inset / 2 + col * cell + inset / 2}
                  y={y0 + inset / 2 + r * cell + inset / 2}
                  width={cell - inset}
                  height={cell - inset}
                  fill={COLORS[c]}
                />
              )),
            )}
          </g>
        )
      })}
    </svg>
  )
}
