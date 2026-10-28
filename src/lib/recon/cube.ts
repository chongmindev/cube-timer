// 3x3 facelet model for reconstruction. A state is 54 stickers, face by face in the order
// U R F D L B, each face read row by row as it appears on the unfolded net. Each sticker holds
// the face it came from in the WCA orientation (0 = white U ... 5 = blue B), so "solved" is
// always judged against the current centers and whole-cube rotations need no special care.

export type State = Uint8Array
type Vec = [number, number, number]

export const FACES = ['U', 'R', 'F', 'D', 'L', 'B'] as const
export type FaceName = (typeof FACES)[number]
export const U = 0, R = 1, F = 2, D = 3, L = 4, B = 5

export const COLOR_NAMES = ['white', 'red', 'green', 'yellow', 'orange', 'blue']

const NORMALS: Vec[] = [
  [0, 1, 0],
  [1, 0, 0],
  [0, 0, 1],
  [0, -1, 0],
  [-1, 0, 0],
  [0, 0, -1],
]

// Which axis (and sign) runs along each face's columns and rows on the net. Matches cubeState.ts.
const LAYOUT: { col: [number, number]; row: [number, number] }[] = [
  { col: [0, 1], row: [2, 1] },
  { col: [2, -1], row: [1, -1] },
  { col: [0, 1], row: [1, -1] },
  { col: [0, 1], row: [2, -1] },
  { col: [2, 1], row: [1, -1] },
  { col: [0, -1], row: [1, -1] },
]

/** Position (doubled cubie center, each axis -2, 0 or 2) and face of every sticker. */
export const POS: Vec[] = []
export const FACE_OF: number[] = []
for (let f = 0; f < 6; f++) {
  const n = NORMALS[f]
  const axis = n.findIndex((x) => x !== 0)
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++) {
      const p: Vec = [0, 0, 0]
      p[axis] = n[axis] * 2
      p[LAYOUT[f].col[0]] = (2 * c - 2) * LAYOUT[f].col[1]
      p[LAYOUT[f].row[0]] = (2 * r - 2) * LAYOUT[f].row[1]
      POS.push(p)
      FACE_OF.push(f)
    }
}

const key = (p: Vec, n: Vec) => `${p.join(',')}|${n.join(',')}`
const INDEX = new Map(POS.map((p, i) => [key(p, NORMALS[FACE_OF[i]]), i]))

const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
/** -90 degrees about axis: clockwise as seen looking at that face. */
function quarter(v: Vec, axis: Vec): Vec {
  const c = cross(axis, v)
  const d = dot(axis, v)
  return [-c[0] + axis[0] * d, -c[1] + axis[1] * d, -c[2] + axis[2] * d]
}

/** Permutation: sticker at i moves to to[i]. */
type Perm = Int8Array

function turnPerm(axis: Vec, layers: number[]): Perm {
  const to = new Int8Array(54)
  for (let i = 0; i < 54; i++) {
    const p = POS[i]
    const n = NORMALS[FACE_OF[i]]
    if (!layers.includes(dot(p, axis))) {
      to[i] = i
      continue
    }
    to[i] = INDEX.get(key(quarter(p, axis), quarter(n, axis)))!
  }
  return to
}

function compose(a: Perm, b: Perm): Perm {
  // a then b
  const to = new Int8Array(54)
  for (let i = 0; i < 54; i++) to[i] = b[a[i]]
  return to
}

const BASE: Record<string, Perm> = {}
const OUTER = [2]
const WIDE = [2, 0]
const ALL = [2, 0, -2]
FACES.forEach((name, f) => {
  BASE[name] = turnPerm(NORMALS[f], OUTER)
  BASE[name + 'w'] = turnPerm(NORMALS[f], WIDE)
  BASE[name.toLowerCase()] = BASE[name + 'w']
})
BASE.M = turnPerm(NORMALS[L], [0])
BASE.E = turnPerm(NORMALS[D], [0])
BASE.S = turnPerm(NORMALS[F], [0])
BASE.x = turnPerm(NORMALS[R], ALL)
BASE.y = turnPerm(NORMALS[U], ALL)
BASE.z = turnPerm(NORMALS[F], ALL)

const MOVES = new Map<string, Perm>()
for (const [name, p] of Object.entries(BASE)) {
  const p2 = compose(p, p)
  MOVES.set(name, p)
  MOVES.set(name + '2', p2)
  MOVES.set(name + "'", compose(p2, p))
}

/** Where each sticker goes under a move (for the solvers' piece-level tables). */
export function movePerm(move: string): Int8Array {
  const p = MOVES.get(move)
  if (!p) throw new Error(`Unknown move ${move}`)
  return p
}

export function solvedState(): State {
  const s = new Uint8Array(54)
  for (let i = 0; i < 54; i++) s[i] = FACE_OF[i]
  return s
}

const TOKEN = /^([URFDLB]w?|[urfdlbMESxyz])(2|'|2'|)$/

/** Splits notation into moves, dropping brackets and comments. Returns null if a token is unknown. */
export function parseAlg(text: string): string[] | null {
  const clean = text.replace(/\/\/.*$/gm, ' ').replace(/[()[\]]/g, ' ').replace(/’/g, "'")
  const out: string[] = []
  for (const raw of clean.split(/\s+/)) {
    if (!raw) continue
    const m = TOKEN.exec(raw)
    if (!m) return null
    out.push(m[1] + (m[2] === "2'" ? '2' : m[2]))
  }
  return out
}

export function applyMove(s: State, move: string): State {
  const p = MOVES.get(move)
  if (!p) throw new Error(`Unknown move ${move}`)
  const next = new Uint8Array(54)
  for (let i = 0; i < 54; i++) next[p[i]] = s[i]
  return next
}

export function applyMoves(s: State, moves: string[]): State {
  for (const m of moves) s = applyMove(s, m)
  return s
}

/** Applies notation; throws on unknown tokens. */
export function apply(s: State, alg: string): State {
  const moves = parseAlg(alg)
  if (!moves) throw new Error(`Bad alg: ${alg}`)
  return applyMoves(s, moves)
}

export function invertMoves(moves: string[]): string[] {
  return [...moves].reverse().map((m) => (m.endsWith("'") ? m.slice(0, -1) : m.endsWith('2') ? m : m + "'"))
}

/** Left-right mirror: R and L swap and every turn changes direction. */
export function mirrorMoves(moves: string[]): string[] {
  const swap: Record<string, string> = { R: 'L', L: 'R', r: 'l', l: 'r', Rw: 'Lw', Lw: 'Rw' }
  return moves.map((m) => {
    const base = m.replace(/['2]$/, '')
    const suffix = m.slice(base.length)
    const b = swap[base] ?? base
    const dir = suffix === '2' ? '2' : suffix === "'" ? '' : "'"
    return b + dir
  })
}

/** Move count in STM: rotations are free, everything else counts once. */
export function moveCount(moves: string[]): number {
  return moves.filter((m) => !/^[xyz]/.test(m)).length
}

/** Collapses repeated turns of the same layer ("U U" to "U2", "R R'" to nothing). */
export function simplify(moves: string[]): string[] {
  const out: string[] = []
  const amount = (m: string) => (m.endsWith('2') ? 2 : m.endsWith("'") ? 3 : 1)
  for (const m of moves) {
    const base = m.replace(/['2]$/, '')
    const prev = out.at(-1)
    if (prev && prev.replace(/['2]$/, '') === base) {
      out.pop()
      const t = (amount(prev) + amount(m)) % 4
      if (t) out.push(base + ['', '', '2', "'"][t])
    } else out.push(m)
  }
  return out
}

// ---- Geometry in the current frame ------------------------------------------------------------

const posKey = (p: Vec) => p.join(',')
const BY_POS = new Map<string, number[]>()
POS.forEach((p, i) => {
  const k = posKey(p)
  BY_POS.set(k, [...(BY_POS.get(k) ?? []), i])
})

export const center = (s: State, face: number) => s[face * 9 + 4]
export const stickersAt = (p: Vec) => BY_POS.get(posKey(p))!

function pieceSolved(s: State, p: Vec): boolean {
  return stickersAt(p).every((i) => s[i] === center(s, FACE_OF[i]))
}

export type Slot = 'FR' | 'FL' | 'BR' | 'BL'
export const SLOTS: Slot[] = ['FR', 'FL', 'BL', 'BR']
const SLOT_GEOM: Record<Slot, { x: number; z: number; faces: [number, number] }> = {
  FR: { x: 2, z: 2, faces: [F, R] },
  FL: { x: -2, z: 2, faces: [F, L] },
  BR: { x: 2, z: -2, faces: [B, R] },
  BL: { x: -2, z: -2, faces: [B, L] },
}
export const SLOT_NAMES: Record<Slot, string> = {
  FR: 'front right',
  FL: 'front left',
  BR: 'back right',
  BL: 'back left',
}

export const slotCorner = (slot: Slot): Vec => [SLOT_GEOM[slot].x, -2, SLOT_GEOM[slot].z]
export const slotEdge = (slot: Slot): Vec => [SLOT_GEOM[slot].x, 0, SLOT_GEOM[slot].z]
export const slotFaces = (slot: Slot) => SLOT_GEOM[slot].faces

const CROSS_EDGES: Vec[] = [
  [0, -2, 2],
  [2, -2, 0],
  [0, -2, -2],
  [-2, -2, 0],
]

export function crossSolved(s: State): boolean {
  return CROSS_EDGES.every((p) => pieceSolved(s, p))
}

export function slotSolved(s: State, slot: Slot): boolean {
  return pieceSolved(s, slotCorner(slot)) && pieceSolved(s, slotEdge(slot))
}

/** A pair is named by the colors of its two side faces, so it survives rotations. */
export type Pair = string // e.g. "2-1": the green-red pair
export const pairKey = (a: number, b: number): Pair => [a, b].sort().join('-')

export function slotPair(s: State, slot: Slot): Pair {
  const [a, b] = slotFaces(slot)
  return pairKey(center(s, a), center(s, b))
}

export function slotOfPair(s: State, pair: Pair): Slot {
  return SLOTS.find((slot) => slotPair(s, slot) === pair)!
}

export function pairSolved(s: State, pair: Pair): boolean {
  return slotSolved(s, slotOfPair(s, pair))
}

export function solvedPairs(s: State): Pair[] {
  return SLOTS.filter((slot) => slotSolved(s, slot)).map((slot) => slotPair(s, slot))
}

export function pairName(pair: Pair): string {
  return pair
    .split('-')
    .map((c) => COLOR_NAMES[Number(c)])
    .join('-')
}

export function f2lSolved(s: State): boolean {
  return crossSolved(s) && SLOTS.every((slot) => slotSolved(s, slot))
}

export function ollSolved(s: State): boolean {
  const u = center(s, U)
  for (let i = 0; i < 9; i++) if (s[i] !== u) return false
  return f2lSolved(s)
}

export function isSolved(s: State): boolean {
  for (let i = 0; i < 54; i++) if (s[i] !== center(s, FACE_OF[i])) return false
  return true
}

const ALL_POSITIONS = [...BY_POS.keys()].map((k) => k.split(',').map(Number) as Vec)
const CORNERS = ALL_POSITIONS.filter((p) => p.every((x) => x !== 0))
const EDGES = ALL_POSITIONS.filter((p) => p.filter((x) => x !== 0).length === 2)

function findPiece(s: State, list: Vec[], colors: number[]): Vec {
  const want = [...colors].sort().join()
  return list.find((p) => stickersAt(p).map((i) => s[i]).sort().join() === want)!
}

/** Where the pair's corner and edge sit now, and how many show on the top or front face. */
export function pairPieces(s: State, pair: Pair) {
  const [a, b] = pair.split('-').map(Number)
  const corner = findPiece(s, CORNERS, [center(s, D), a, b])
  const edge = findPiece(s, EDGES, [a, b])
  const inView = (p: Vec) => stickersAt(p).some((i) => FACE_OF[i] === U || FACE_OF[i] === F)
  return {
    stickers: [...stickersAt(corner), ...stickersAt(edge)],
    visible: Number(inView(corner)) + Number(inView(edge)),
    corner,
    edge,
  }
}

/** Slots (other than empty top) that hold one of the pair's pieces. */
export function slotsHolding(s: State, pair: Pair): Slot[] {
  const { corner, edge } = pairPieces(s, pair)
  return SLOTS.filter((slot) => posKey(slotCorner(slot)) === posKey(corner) || posKey(slotEdge(slot)) === posKey(edge))
}

/** Shortest rotation that puts the given colors on the bottom and front, from the WCA orientation. */
export function holdRotation(bottom: number, front: number): string | null {
  const candidates = ['', 'y', "y'", 'y2', 'x', "x'", 'x2', 'z', "z'", 'z2']
  const solved = solvedState()
  const algs = candidates
    .flatMap((a) => ['', 'y', "y'", 'y2'].map((b) => [a, b].filter(Boolean).join(' ')))
    .sort((a, b) => a.split(' ').length - b.split(' ').length || a.length - b.length)
  for (const alg of algs) {
    const s = alg ? apply(solved, alg) : solved
    if (center(s, D) === bottom && center(s, F) === front) return alg
  }
  return null
}
