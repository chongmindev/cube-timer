// What happened in a step, and what probably happens next. Suggestions for F2L try every standard
// insert from each angle (with a U before it and, for back slots, a rotation), then a short
// search as a fallback. Last-layer cases are found by trying the algorithm lists directly.

import { F2L_ALGS, OLL, PLL } from './algs'
import {
  SLOT_NAMES,
  apply,
  applyMoves,
  center,
  crossSolved,
  f2lSolved,
  holdRotation,
  isSolved,
  mirrorMoves,
  moveCount,
  ollSolved,
  pairName,
  pairPieces,
  pairSolved,
  parseAlg,
  simplify,
  slotOfPair,
  slotPair,
  slotsHolding,
  solvedPairs,
  SLOTS,
  D,
  type Pair,
  type Slot,
  type State,
} from './cube'
import { crossDistance, crossSolutions, pairSearch, xcrossSolutions } from './search'

export type Stage = 'cross' | 'f2l' | 'oll' | 'pll' | 'done'

export function stageOf(s: State): Stage {
  if (isSolved(s)) return 'done'
  if (!crossSolved(s)) return 'cross'
  if (!f2lSolved(s)) return 'f2l'
  if (!ollSolved(s)) return 'oll'
  return 'pll'
}

const ORDINAL = ['1st', '2nd', '3rd', '4th']
const CROSS_LABEL = ['cross', 'x-cross', 'xx-cross', 'xxx-cross', 'xxxx-cross']

/** Names a step by what it solved, and warns when it undid something. */
export function describeStep(before: State, after: State): { label: string; warning: string | null } {
  const pb = solvedPairs(before)
  const pa = solvedPairs(after)
  const lost = crossSolved(before) && !crossSolved(after) ? 'This breaks the cross.' : null
  const lostPair = pb.some((p) => !pa.includes(p)) ? 'This breaks a solved pair.' : null
  const warning = lost ?? lostPair

  if (isSolved(after) && !isSolved(before)) {
    if (ollSolved(before)) return { label: 'PLL', warning }
    if (f2lSolved(before)) return { label: 'LL', warning }
  }
  if (ollSolved(after) && !ollSolved(before) && f2lSolved(before)) return { label: 'OLL', warning }
  if (crossSolved(after) && !crossSolved(before)) return { label: CROSS_LABEL[pa.length], warning }
  if (crossSolved(after)) {
    const added = pa.length - pb.filter((p) => pa.includes(p)).length
    if (added > 0) {
      const start = pa.length - added
      const names = Array.from({ length: added }, (_, i) => ORDINAL[start + i])
      return { label: `${names.join(' + ')} pair`, warning }
    }
  }
  return { label: '', warning: warning ?? 'This doesn’t solve anything new yet.' }
}

// ---- Hold and cross ---------------------------------------------------------------------------

/** Fewest moves to a cross on each color, from the scramble as handed to you. */
export function crossByColor(scrambled: State): number[] {
  return [0, 1, 2, 3, 4, 5].map((c) => {
    const front = c === 0 || c === 3 ? 2 : 0
    const rot = holdRotation(c, front)!
    return crossDistance(rot ? apply(scrambled, rot) : scrambled)
  })
}

export interface CrossSuggestions {
  cross: string[]
  xcross: { pair: Pair; name: string; moves: string }[]
}

export function crossSuggestions(s: State): CrossSuggestions {
  return {
    cross: crossSolutions(s),
    xcross: xcrossSolutions(s)
      .slice(0, 4)
      .map((x) => ({ ...x, name: pairName(x.pair) })),
  }
}

// ---- F2L ---------------------------------------------------------------------------------------

const FR = F2L_ALGS.map((a) => parseAlg(a)!)
const FL = FR.map(mirrorMoves)
const AUF = [[], ['U'], ["U'"], ['U2']]
const ROTATIONS = [[], ['y'], ["y'"], ['y2']]

const TRIGGERS: Record<Slot, string[]> = {
  FR: ["R U R'", "R U' R'", "R U2 R'", "F' U F", "F' U' F"],
  FL: ["L' U L", "L' U' L", "L' U2 L", "F U F'", "F U' F'"],
  BR: ["R' U R", "R' U' R", "R' U2 R", "B U B'", "B U' B'"],
  BL: ["L U L'", "L U' L'", "L U2 L'", "B' U B", "B' U' B"],
}

function score(moves: string[]): number {
  return (
    moveCount(moves) +
    moves.filter((m) => /^[xyz]/.test(m)).length * 0.6 +
    moves.filter((m) => m[0] === 'B').length * 0.5 +
    moves.filter((m) => /^[RLFB]2/.test(m)).length * 0.7
  )
}

function pairCandidates(s: State, pair: Pair): string[][] {
  const keep = solvedPairs(s).filter((p) => p !== pair)
  const found = new Map<string, string[]>()
  const searched = new Set<string>()
  const consider = (seq: string[], fromSearch = false) => {
    const after = applyMoves(s, seq)
    if (!crossSolved(after) || !pairSolved(after, pair) || !keep.every((k) => pairSolved(after, k))) return
    const clean = simplify(seq)
    const key = clean.join(' ')
    if (fromSearch && !found.has(key)) searched.add(key)
    found.set(key, clean)
  }
  const inserts = (prefix: string[]) => {
    for (const rot of ROTATIONS) {
      const s1 = applyMoves(s, [...prefix, ...rot])
      const slot = slotOfPair(s1, pair)
      if (slot !== 'FR' && slot !== 'FL') continue
      const algs = slot === 'FR' ? FR : FL
      for (const pre of AUF) for (const alg of algs) consider([...prefix, ...rot, ...pre, ...alg])
    }
  }

  inserts([])
  if (found.size === 0) {
    // A piece is stuck in a slot: take it out first.
    for (const slot of slotsHolding(s, pair))
      for (const t of TRIGGERS[slot]) for (const pre of AUF) inserts([...pre, ...parseAlg(t)!])
  }
  for (const m of pairSearch(s, pair, found.size ? 7 : 10, found.size ? 80_000 : 800_000)) {
    consider(m.split(' '), true)
  }
  // Standard inserts first; odd search finds only win when clearly shorter.
  const rank = (m: string[]) => score(m) + (searched.has(m.join(' ')) ? 2 : 0)
  return [...found.values()].sort((a, b) => rank(a) - rank(b)).slice(0, 4)
}

export interface PairSuggestion {
  pair: Pair
  name: string
  slot: string
  visible: number
  stickers: number[]
  moves: string[]
}

/** Unsolved pairs, the ones you'd have spotted first on top, each with a few ways to solve it. */
export function f2lSuggestions(s: State): PairSuggestion[] {
  const solved = solvedPairs(s)
  return SLOTS.map((slot) => slotPair(s, slot))
    .filter((p) => !solved.includes(p))
    .map((pair) => {
      const pieces = pairPieces(s, pair)
      return {
        pair,
        name: pairName(pair),
        slot: SLOT_NAMES[slotOfPair(s, pair)],
        visible: pieces.visible,
        stickers: pieces.stickers,
        moves: pairCandidates(s, pair).map((m) => m.join(' ')),
      }
    })
    .sort((a, b) => b.visible - a.visible || (a.moves[0]?.length ?? 99) - (b.moves[0]?.length ?? 99))
}

// ---- Last layer ---------------------------------------------------------------------------------

export interface LastLayerSuggestion {
  stage: 'oll' | 'pll'
  name: string | null
  algs: string[]
}

const join = (...parts: string[]) => parts.filter(Boolean).join(' ')

export function lastLayerSuggestions(s: State): LastLayerSuggestion {
  const aufs = ['', 'U', "U'", 'U2']
  if (!ollSolved(s)) {
    for (const [name, algs] of OLL) {
      const fits = algs.flatMap((a) => aufs.map((pre) => join(pre, a)).filter((m) => ollSolved(apply(s, m))))
      if (fits.length) return { stage: 'oll', name, algs: fits }
    }
    return { stage: 'oll', name: null, algs: [] }
  }
  const skip = aufs.find((m) => m && isSolved(apply(s, m)))
  if (skip) return { stage: 'pll', name: 'PLL skip', algs: [skip] }
  for (const [name, algs] of PLL) {
    const fits: string[] = []
    for (const a of algs)
      for (const pre of aufs)
        for (const post of aufs) if (isSolved(apply(s, join(pre, a, post)))) fits.push(join(pre, a, post))
    if (fits.length) return { stage: 'pll', name, algs: fits.slice(0, 4) }
  }
  return { stage: 'pll', name: null, algs: [] }
}

/** The cross color in the current frame, for labels. */
export const crossColor = (s: State) => center(s, D)
