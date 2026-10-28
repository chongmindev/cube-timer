import type { Recon, Solve } from '../stats'
import { effective } from '../stats'
import { moveCount, parseAlg } from './cube'

/** One line per step, as cubers write reconstructions: "R U R' // 1st pair". */
export function reconLines(recon: Recon): string[] {
  return recon.steps.filter((s) => s.moves.trim()).map((s) => (s.label ? `${s.moves} // ${s.label}` : s.moves))
}

export function reconMoves(recon: Recon): number {
  return recon.steps.reduce((n, s) => n + moveCount(parseAlg(s.moves) ?? []), 0)
}

/** "52 moves, 6.2 TPS" (TPS left out for DNFs). */
export function reconSummary(recon: Recon, solve: Solve): string {
  const moves = reconMoves(recon)
  const time = effective(solve)
  const tps = time !== Infinity && solve.time > 0 ? `, ${(moves / (solve.time / 1000)).toFixed(1)} TPS` : ''
  return `${moves} moves${tps}`
}
