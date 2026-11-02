// cubing.js draws the other puzzles (Pyraminx, Skewb, Megaminx, Square-1, Clock) from its own
// SVGs in its own bright colors. Their sources are rewritten here, before cubing.js reads them,
// so every puzzle uses the same palette as the cube net. Colors are resolved from the page, so
// a preview made in dark mode gets the dark mode primaries.

import { puzzles } from 'cubing/puzzles'
import { COLORS } from '../components/ScrambleNet'

/** Each stock color, by how cubing.js writes it, mapped to ours. */
const PALETTE: Record<string, string> = {
  // The six cube faces, in every spelling cubing.js uses.
  white: COLORS.U,
  '#ffffff': COLORS.U,
  red: COLORS.R,
  '#ff0000': COLORS.R,
  limegreen: COLORS.F,
  '#44ee00': COLORS.F,
  '#008800': COLORS.F,
  '#26f': COLORS.B,
  '#2266ff': COLORS.B,
  '#0000ff': COLORS.B,
  orange: COLORS.L,
  '#ff8000': COLORS.L,
  yellow: COLORS.D,
  '#f4f400': COLORS.D,
  // Megaminx's other six faces, toned down to sit with the primaries.
  '#8800dd': '#5b2d8c',
  '#e8d0a0': '#e6d2a2',
  '#3399ff': '#7fb2e6',
  '#99ff00': '#9cc73a',
  '#ff66cc': '#ec7fae',
  '#888888': '#8a8a84',
  // Square-1's sides between the layers.
  '#d8d8d8': 'var(--hairline)',
  // Clock: a blue front, a pale back, yellow hands, and red and orange marks.
  '#113366': 'var(--blue)',
  '#446699': '#4a73b5',
  '#88aacc': '#a7bedd',
  '#ccddee': '#e4eaf2',
  '#ffcc44': 'var(--yellow)',
  '#cc0000': 'var(--red)',
  '#cc6600': '#ff7300',
}

/** A color as plain hex: cubing.js copies colors into gradients, which can't read CSS variables. */
function resolve(color: string): string {
  const v = /^var\((--[\w-]+)\)$/.exec(color)
  return v ? getComputedStyle(document.documentElement).getPropertyValue(v[1]).trim() : color
}

const recolor = (svg: string) =>
  svg.replace(/(fill\s*[:=]\s*"?\s*)(#[0-9a-fA-F]{3,6}\b|[a-z]+)/g, (all, lead: string, color: string) => {
    const ours = PALETTE[color.toLowerCase()]
    return ours ? lead + resolve(ours) : all
  })

const OTHERS = ['pyraminx', 'skewb', 'megaminx', 'square1', 'clock'] as const

let done = false

/** Swaps the palette into the other puzzles' pictures. Safe to call more than once. */
export function applyPuzzleColors() {
  if (done) return
  done = true
  for (const id of OTHERS) {
    const loader = puzzles[id]
    if (!loader?.svg) continue
    const stock = loader.svg.bind(loader)
    loader.svg = async () => recolor(await stock())
  }
}
