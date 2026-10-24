// Minimal NxN cube simulator: applies a WCA scramble and returns each face's sticker colors.
// Stickers are tracked in 3D (doubled, centered integer coordinates plus a face normal), so one
// rotation rule covers every face turn, wide turn (Rw, 3Rw) and slice (2R) on any size.

export type Face = 'U' | 'L' | 'F' | 'R' | 'B' | 'D'
type Vec = [number, number, number]

interface Sticker {
  pos: Vec // cubie center, doubled so coordinates stay integers: 2i - (n - 1)
  normal: Vec
  color: Face // which face's color this sticker carries
}

const NORMALS: Record<Face, Vec> = {
  U: [0, 1, 0],
  D: [0, -1, 0],
  R: [1, 0, 0],
  L: [-1, 0, 0],
  F: [0, 0, 1],
  B: [0, 0, -1],
}

const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]

/** Quarter turn clockwise as seen looking at the face along -axis, i.e. -90 degrees about axis. */
function quarter(v: Vec, axis: Vec): Vec {
  const c = cross(axis, v)
  const d = dot(axis, v)
  return [-c[0] + axis[0] * d, -c[1] + axis[1] * d, -c[2] + axis[2] * d]
}

function solved(n: number): Sticker[] {
  const stickers: Sticker[] = []
  const coords = Array.from({ length: n }, (_, i) => 2 * i - (n - 1))
  for (const face of Object.keys(NORMALS) as Face[]) {
    const normal = NORMALS[face]
    const axis = normal.findIndex((x) => x !== 0)
    const [a, b] = [0, 1, 2].filter((i) => i !== axis)
    for (const p of coords)
      for (const q of coords) {
        const pos: Vec = [0, 0, 0]
        pos[axis] = normal[axis] * (n - 1)
        pos[a] = p
        pos[b] = q
        stickers.push({ pos, normal, color: face })
      }
  }
  return stickers
}

const MOVE = /^(\d+)?([URFDLB])(w)?(['2]?)$/

function applyMove(stickers: Sticker[], n: number, token: string) {
  const m = MOVE.exec(token)
  if (!m) return // rotations and anything unexpected are ignored
  const [, num, face, wide, suffix] = m
  const axis = NORMALS[face as Face]
  // Layer k (1 = outermost) sits at coordinate n - 1 - 2(k - 1) along the face normal.
  const depth = num ? Number(num) : 1
  const layers = wide ? Array.from({ length: num ? depth : 2 }, (_, i) => i + 1) : [depth]
  const coords = new Set(layers.map((k) => n - 1 - 2 * (k - 1)))
  const turns = suffix === '2' ? 2 : suffix === "'" ? 3 : 1
  for (const s of stickers) {
    if (!coords.has(dot(s.pos, axis))) continue
    for (let t = 0; t < turns; t++) {
      s.pos = quarter(s.pos, axis)
      s.normal = quarter(s.normal, axis)
    }
  }
}

/** For the net: which 3D axis (and sign) runs along each face's columns and rows. */
const LAYOUT: Record<Face, { col: [number, number]; row: [number, number] }> = {
  U: { col: [0, 1], row: [2, 1] },
  F: { col: [0, 1], row: [1, -1] },
  R: { col: [2, -1], row: [1, -1] },
  B: { col: [0, -1], row: [1, -1] },
  L: { col: [2, 1], row: [1, -1] },
  D: { col: [0, 1], row: [2, -1] },
}

/** Applies the scramble to a solved n x n cube and returns faces as rows of sticker colors. */
export function scrambledFaces(n: number, scramble: string): Record<Face, Face[][]> {
  const stickers = solved(n)
  for (const token of scramble.trim().split(/\s+/)) if (token) applyMove(stickers, n, token)

  const faces = {} as Record<Face, Face[][]>
  for (const face of Object.keys(NORMALS) as Face[]) {
    const grid: Face[][] = Array.from({ length: n }, () => Array<Face>(n))
    const normal = NORMALS[face]
    const { col, row } = LAYOUT[face]
    for (const s of stickers) {
      if (dot(s.normal, normal) !== 1) continue
      const c = (s.pos[col[0]] * col[1] + (n - 1)) / 2
      const r = (s.pos[row[0]] * row[1] + (n - 1)) / 2
      grid[r][c] = s.color
    }
    faces[face] = grid
  }
  return faces
}
