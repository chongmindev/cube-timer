// Draws a 1080x1350 (4:5, fits Instagram and most chats) share card for one solve.
// Follows DESIGN.md: Jost only, paper and ink, primaries with fixed meanings.
import { CUBE_BLUE, CUBE_RED, CUBE_YELLOW } from './logoPaths'

export interface CardData {
  time: string // formatted, e.g. "9.48", "DNF", "11.20+"
  penalty: 'none' | '+2' | 'dnf'
  event: string
  date: string
  scramble: string
  ao5: string
  ao12: string
  isBest: boolean
  solveNumber: number
  session: string
  /** Effective times (ms, Infinity for DNF) of up to 12 solves ending with this one. */
  recent: number[]
  /** Finished reconstruction, one line per step, plus its move count and TPS. */
  recon?: { lines: string[]; summary: string }
}

const W = 1080
const H = 1350
const PAD = 72

const C = {
  paper: '#ffffff',
  ink: '#000000',
  muted: '#5d5d58',
  red: '#d7261e',
  yellow: '#f5c400',
  blue: '#1c4fa0',
}

const font = (weight: number, size: number) => `${weight} ${size}px Jost, Futura, sans-serif`

async function loadFonts() {
  await Promise.all([400, 500, 600, 700].map((w) => document.fonts.load(font(w, 40), '0123456789')))
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const next = line ? `${line}  ${w}` : w
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line)
      line = w
    } else line = next
  }
  if (line) lines.push(line)
  return lines
}

/** Largest font size (<= max) at which text fits the width. */
function fit(ctx: CanvasRenderingContext2D, text: string, weight: number, max: number, width: number) {
  let size = max
  ctx.font = font(weight, size)
  while (ctx.measureText(text).width > width && size > 40) {
    size -= 4
    ctx.font = font(weight, size)
  }
  return size
}

export async function drawCard(data: CardData): Promise<HTMLCanvasElement> {
  await loadFonts()
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.textBaseline = 'alphabetic'

  ctx.fillStyle = C.paper
  ctx.fillRect(0, 0, W, H)

  // Header: cube logo and wordmark, date on the right.
  const y0 = PAD + 8
  ctx.save()
  ctx.translate(PAD - 4, y0 - 42)
  ctx.scale(52 / 32, 52 / 32)
  for (const [d, color] of [
    [CUBE_RED, C.red],
    [CUBE_YELLOW, C.yellow],
    [CUBE_BLUE, C.blue],
  ]) {
    ctx.fillStyle = color
    ctx.fill(new Path2D(d))
  }
  ctx.restore()

  ctx.fillStyle = C.ink
  ctx.font = font(600, 34)
  ctx.textAlign = 'left'
  ctx.fillText('cube timer', PAD + 62, y0 - 1)
  ctx.textAlign = 'right'
  ctx.font = font(400, 30)
  ctx.fillStyle = C.muted
  ctx.fillText(data.date, W - PAD, y0 - 1)

  ctx.fillStyle = C.ink
  ctx.fillRect(PAD, y0 + 28, W - PAD * 2, 6)

  // Event title, left aligned like a poster.
  ctx.textAlign = 'left'
  ctx.font = font(700, 76)
  ctx.fillText(data.event, PAD, y0 + 140)
  ctx.font = font(400, 30)
  ctx.fillStyle = C.muted
  ctx.fillText(data.session, PAD, y0 + 186)

  // The circle: yellow for a counted solve, red for a DNF.
  const cx = W / 2 + 60
  const cy = 700
  const r = 330
  ctx.fillStyle = data.penalty === 'dnf' ? C.red : C.yellow
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()

  ctx.textAlign = 'center'
  ctx.fillStyle = data.penalty === 'dnf' ? '#ffffff' : C.ink
  const size = fit(ctx, data.time, 500, 230, r * 1.75)
  ctx.font = font(500, size)
  ctx.fillText(data.time, cx, cy + size * 0.36)

  if (data.penalty === '+2') {
    ctx.font = font(500, 34)
    ctx.fillText('includes +2', cx, cy + size * 0.36 + 70)
  }

  // Personal best: the yellow triangle, outlined so it reads on the circle's edge.
  if (data.isBest) {
    const tx = PAD
    const ty = cy + r - 40
    ctx.fillStyle = C.yellow
    ctx.strokeStyle = C.ink
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(tx + 32, ty - 56)
    ctx.lineTo(tx + 64, ty)
    ctx.lineTo(tx, ty)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = C.ink
    ctx.textAlign = 'left'
    ctx.font = font(700, 40)
    ctx.fillText('Personal best', tx, ty + 56)
  }

  // Stats row with a heavy rule above and thin dividers, like the app.
  const sy = 1100
  ctx.fillStyle = C.ink
  ctx.fillRect(PAD, sy, W - PAD * 2, 6)
  const cols = [
    ['ao5', data.ao5],
    ['ao12', data.ao12],
    ['solve', String(data.solveNumber)],
  ]
  const colW = (W - PAD * 2) / 3
  cols.forEach(([label, value], i) => {
    const x = PAD + i * colW + (i ? 28 : 0)
    if (i) ctx.fillRect(PAD + i * colW, sy + 6, 2, 104)
    ctx.textAlign = 'left'
    ctx.fillStyle = C.muted
    ctx.font = font(500, 28)
    ctx.fillText(label, x, sy + 46)
    ctx.fillStyle = C.ink
    ctx.font = font(500, 52)
    ctx.fillText(value, x, sy + 104)
  })

  // Scramble along the bottom, under a hairline.
  ctx.fillStyle = C.ink
  ctx.fillRect(PAD, sy + 134, W - PAD * 2, 2)
  ctx.textAlign = 'left'
  ctx.font = font(400, 26)
  const lines = wrap(ctx, data.scramble, W - PAD * 2)
  const shown = lines.slice(0, 2)
  if (lines.length > 2) shown[1] = shown[1] + '  …'
  shown.forEach((l, i) => ctx.fillText(l, PAD, sy + 180 + i * 36))

  return canvas
}

const BARS = '▁▂▃▄▅▆▇█'

/** One bar per solve, taller is slower, ✕ for a DNF. */
export function sparkline(times: number[]): string {
  const finite = times.filter((t) => t !== Infinity)
  if (finite.length === 0) return ''
  const lo = Math.min(...finite)
  const hi = Math.max(...finite)
  return times
    .map((t) => {
      if (t === Infinity) return '✕'
      const level = hi === lo ? 3 : Math.round(((t - lo) / (hi - lo)) * (BARS.length - 1))
      return BARS[level]
    })
    .join('')
}

/** Text version for pasting into chats. Emoji and block characters render almost everywhere. */
export function cardText(d: CardData): string {
  const time = d.penalty === '+2' ? `${d.time.replace(/\+$/, '')} (+2)` : d.time
  const lines = [`🟨🟥🟦 ${d.event}: ${time}`]
  if (d.isBest) lines.push('▲ New personal best')

  const stats = [d.ao5 !== '-' && `ao5 ${d.ao5}`, d.ao12 !== '-' && `ao12 ${d.ao12}`].filter(Boolean)
  const spark = d.recent.length >= 3 ? sparkline(d.recent) : ''
  if (stats.length || spark) lines.push('')
  if (stats.length) lines.push(stats.join('   '))
  if (spark) lines.push(`last ${d.recent.length}  ${spark}`)

  lines.push('', d.scramble)
  if (d.recon) lines.push('', ...d.recon.lines, d.recon.summary)
  lines.push('', 'timed with cube timer')
  return lines.join('\n')
}
