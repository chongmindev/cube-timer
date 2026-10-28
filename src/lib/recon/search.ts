// Short searches for the cross, X-cross and single F2L pairs. Pieces are tracked by where one of
// their stickers sits, so a whole cross is four numbers and its exact distance comes from one
// breadth-first table. Everything here assumes the cross is on the bottom of the current frame.

import {
  D,
  FACE_OF,
  POS,
  SLOTS,
  apply,
  center,
  crossSolved,
  movePerm,
  pairSolved,
  slotCorner,
  slotEdge,
  slotFaces,
  slotPair,
  solvedPairs,
  stickersAt,
  type Pair,
  type Slot,
  type State,
} from './cube'

export const FACE_MOVES = ['U', 'D', 'R', 'L', 'F', 'B'].flatMap((f) => [f, f + "'", f + '2'])
const AXIS: Record<string, number> = { U: 0, D: 0, R: 1, L: 1, F: 2, B: 2 }
const ORDER: Record<string, number> = { U: 0, D: 1, R: 0, L: 1, F: 0, B: 1 }

const isEdge = (i: number) => POS[i].filter((x) => x !== 0).length === 2
const isCorner = (i: number) => POS[i].every((x) => x !== 0)
const EDGE_STICKERS = [...Array(54).keys()].filter(isEdge)
const CORNER_STICKERS = [...Array(54).keys()].filter(isCorner)
const edgeIdx = new Map(EDGE_STICKERS.map((f, i) => [f, i]))
const cornerIdx = new Map(CORNER_STICKERS.map((f, i) => [f, i]))

// Per move: where an edge sticker (0..23) or corner sticker (0..23) goes.
const EDGE_MOVE = FACE_MOVES.map((m) => {
  const p = movePerm(m)
  return Int8Array.from(EDGE_STICKERS, (f) => edgeIdx.get(p[f])!)
})
const CORNER_MOVE = FACE_MOVES.map((m) => {
  const p = movePerm(m)
  return Int8Array.from(CORNER_STICKERS, (f) => cornerIdx.get(p[f])!)
})

/** The bottom-face sticker at each cross edge, in a fixed order. */
const CROSS_GOAL = [
  [0, -2, 2],
  [2, -2, 0],
  [0, -2, -2],
  [-2, -2, 0],
].map((p) => stickersAt(p as [number, number, number]).find((i) => FACE_OF[i] === D)!)

const N4 = 24 ** 4
let crossTable: Uint8Array | null = null

function bfs(size: number, start: number, next: (c: number, m: number) => number): Uint8Array {
  const dist = new Uint8Array(size).fill(255)
  const queue = new Int32Array(size)
  dist[start] = 0
  queue[0] = start
  let head = 0
  let tail = 1
  while (head < tail) {
    const c = queue[head++]
    for (let m = 0; m < FACE_MOVES.length; m++) {
      const n = next(c, m)
      if (dist[n] === 255) {
        dist[n] = dist[c] + 1
        queue[tail++] = n
      }
    }
  }
  return dist
}

function crossMove(c: number, m: number): number {
  const t = EDGE_MOVE[m]
  const a = t[Math.floor(c / 13824)]
  const b = t[Math.floor(c / 576) % 24]
  const d = t[Math.floor(c / 24) % 24]
  const e = t[c % 24]
  return ((a * 24 + b) * 24 + d) * 24 + e
}

function getCrossTable() {
  if (!crossTable) {
    const goal = CROSS_GOAL.reduce((acc, f) => acc * 24 + edgeIdx.get(f)!, 0)
    crossTable = bfs(N4, goal, crossMove)
  }
  return crossTable
}

/** Cross coordinate: where each cross edge's bottom-colored sticker is now. */
function crossCoord(s: State): number {
  const dc = center(s, D)
  return CROSS_GOAL.reduce((acc, goal) => {
    const side = stickersAt(POS[goal]).find((i) => i !== goal)!
    const sideColor = center(s, FACE_OF[side])
    const at = EDGE_STICKERS.find((f) => {
      if (s[f] !== dc) return false
      const other = stickersAt(POS[f]).find((i) => i !== f)!
      return s[other] === sideColor
    })!
    return acc * 24 + edgeIdx.get(at)!
  }, 0)
}

// Pair tables: corner's bottom-colored sticker and the edge's sticker of the slot's first color.
const pairTables = new Map<Slot, { table: Uint8Array; goal: number }>()
function pairTable(slot: Slot) {
  let t = pairTables.get(slot)
  if (!t) {
    const cornerGoal = stickersAt(slotCorner(slot)).find((i) => FACE_OF[i] === D)!
    const edgeGoal = stickersAt(slotEdge(slot)).find((i) => FACE_OF[i] === slotFaces(slot)[0])!
    const goal = cornerIdx.get(cornerGoal)! * 24 + edgeIdx.get(edgeGoal)!
    t = { table: bfs(576, goal, pairMove), goal }
    pairTables.set(slot, t)
  }
  return t
}

function pairMove(c: number, m: number): number {
  return CORNER_MOVE[m][Math.floor(c / 24)] * 24 + EDGE_MOVE[m][c % 24]
}

function pairCoord(s: State, slot: Slot): number {
  const dc = center(s, D)
  const [fa, fb] = slotFaces(slot)
  const a = center(s, fa)
  const b = center(s, fb)
  const corner = CORNER_STICKERS.find((f) => {
    if (s[f] !== dc) return false
    const others = stickersAt(POS[f]).filter((i) => i !== f).map((i) => s[i])
    return others.includes(a) && others.includes(b)
  })!
  const edge = EDGE_STICKERS.find((f) => {
    if (s[f] !== a) return false
    const other = stickersAt(POS[f]).find((i) => i !== f)!
    return s[other] === b
  })!
  return cornerIdx.get(corner)! * 24 + edgeIdx.get(edge)!
}

/** Skip same-face repeats and fix the order of opposite faces so each sequence appears once. */
function allowed(prev: string | undefined, m: string): boolean {
  if (!prev) return true
  if (prev[0] === m[0]) return false
  return !(AXIS[prev[0]] === AXIS[m[0]] && ORDER[m[0]] < ORDER[prev[0]])
}

/** Ranks sequences: shorter first, then fewer awkward back and bottom turns. */
function cost(moves: string[]): number {
  return moves.reduce((c, m) => c + 1 + (m[0] === 'B' ? 0.6 : 0) + (m[0] === 'D' ? 0.15 : 0), 0)
}

export function crossDistance(s: State): number {
  return getCrossTable()[crossCoord(s)]
}

/** A few short crosses: every optimal one plus some one move longer, best-feeling first. */
export function crossSolutions(s: State, limit = 5): string[] {
  const table = getCrossTable()
  const start = crossCoord(s)
  const opt = table[start]
  if (opt === 0) return []
  const found: string[][] = []
  const path: string[] = []
  const dfs = (c: number, left: number) => {
    if (found.length >= 300) return
    if (left === 0) {
      if (table[c] === 0) found.push([...path])
      return
    }
    for (let m = 0; m < FACE_MOVES.length; m++) {
      if (!allowed(path.at(-1), FACE_MOVES[m])) continue
      const n = crossMove(c, m)
      if (table[n] > left - 1) continue
      path.push(FACE_MOVES[m])
      dfs(n, left - 1)
      path.pop()
    }
  }
  dfs(start, opt)
  dfs(start, opt + 1)
  return found
    .sort((a, b) => cost(a) - cost(b))
    .slice(0, limit)
    .map((m) => m.join(' '))
}

/** Cross plus one pair at once, per slot, if one turns up within a few moves of the cross. */
export function xcrossSolutions(s: State, perSlot = 2): { pair: Pair; moves: string }[] {
  const ct = getCrossTable()
  const c0 = crossCoord(s)
  const crossOpt = ct[c0]
  const out: { pair: Pair; moves: string }[] = []
  for (const slot of SLOTS) {
    const { table: pt } = pairTable(slot)
    const p0 = pairCoord(s, slot)
    const found: string[][] = []
    let nodes = 0
    const path: string[] = []
    const dfs = (c: number, p: number, left: number) => {
      if (found.length >= 40 || ++nodes > 1_500_000) return
      if (left === 0) {
        if (ct[c] === 0 && pt[p] === 0) found.push([...path])
        return
      }
      for (let m = 0; m < FACE_MOVES.length; m++) {
        if (!allowed(path.at(-1), FACE_MOVES[m])) continue
        const nc = crossMove(c, m)
        const np = pairMove(p, m)
        if (ct[nc] > left - 1 || pt[np] > left - 1) continue
        path.push(FACE_MOVES[m])
        dfs(nc, np, left - 1)
        path.pop()
      }
    }
    for (let depth = Math.max(crossOpt, pt[p0]); depth <= Math.min(crossOpt + 4, 10); depth++) {
      dfs(c0, p0, depth)
      if (found.length || nodes > 1_500_000) break
    }
    const pair = slotPair(s, slot)
    found
      .sort((a, b) => cost(a) - cost(b))
      .slice(0, perSlot)
      .forEach((m) => out.push({ pair, moves: m.join(' ') }))
  }
  return out.sort((a, b) => cost(a.moves.split(' ')) - cost(b.moves.split(' ')))
}

const F2L_MOVES = ['U', 'R', 'L', 'F', 'B'].flatMap((f) => [f, f + "'", f + '2'])
const F2L_INDEX = F2L_MOVES.map((m) => FACE_MOVES.indexOf(m))

/**
 * Searches short face-turn solutions for one pair that keep the cross and the other solved
 * pairs. Used when no standard insert fits.
 */
export function pairSearch(s: State, pair: Pair, maxDepth = 9, budget = 600_000): string[] {
  const slot = SLOTS.find((x) => slotPair(s, x) === pair)!
  const ct = getCrossTable()
  const { table: pt } = pairTable(slot)
  const keep = solvedPairs(s).filter((p) => p !== pair)
  const c0 = crossCoord(s)
  const p0 = pairCoord(s, slot)
  const found: string[] = []
  let nodes = 0
  const path: string[] = []
  const dfs = (c: number, p: number, left: number) => {
    if (found.length >= 4 || ++nodes > budget) return
    if (left === 0) {
      if (ct[c] !== 0 || pt[p] !== 0) return
      const after = apply(s, path.join(' '))
      if (crossSolved(after) && pairSolved(after, pair) && keep.every((k) => pairSolved(after, k))) {
        found.push(path.join(' '))
      }
      return
    }
    for (let k = 0; k < F2L_MOVES.length; k++) {
      const name = F2L_MOVES[k]
      if (!allowed(path.at(-1), name)) continue
      const m = F2L_INDEX[k]
      const nc = crossMove(c, m)
      const np = pairMove(p, m)
      if (ct[nc] > left - 1 || pt[np] > left - 1) continue
      path.push(name)
      dfs(nc, np, left - 1)
      path.pop()
    }
  }
  for (let depth = Math.max(1, pt[p0]); depth <= maxDepth && !found.length && nodes <= budget; depth++) {
    dfs(c0, p0, depth)
  }
  return found
}
