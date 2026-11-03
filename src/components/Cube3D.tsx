import { useEffect, useRef } from 'react'
import { TwistyPlayer } from 'cubing/twisty'
import type { Pair } from '../lib/recon/cube'
import type { Face } from '../lib/cubeState'
import { COLORS } from './ScrambleNet'

// cubing.js piece order for the 3x3, by home position (white top, green front).
const EDGES = ['UF', 'UR', 'UB', 'UL', 'DF', 'DR', 'DB', 'DL', 'FR', 'FL', 'BR', 'BL']
const CORNERS = ['UFR', 'URB', 'UBL', 'ULF', 'DRF', 'DFL', 'DLB', 'DBR']
// Our color numbers are the faces they start on.
const HOME = 'URFDLB'

const FULL = 'EDGES:------------,CORNERS:--------,CENTERS:------'

// cubing.js's own sticker colors, by face. They're swapped for the app's (the same ones the
// scramble picture uses), so the cube matches everywhere and follows light and dark mode.
const STOCK: Record<Face, number> = { U: 0xffffff, L: 0xff9900, F: 0x00ff00, R: 0xff0000, B: 0x2266ff, D: 0xffff00 }

type Rgb = { r: number; g: number; b: number }
type Mesh = { material?: { color?: Rgb } | { color?: Rgb }[] }
type Root = { traverse: (fn: (o: Mesh) => void) => void }

const near = (c: Rgb, hex: number) =>
  Math.abs(c.r - ((hex >> 16) & 255) / 255) < 0.01 &&
  Math.abs(c.g - ((hex >> 8) & 255) / 255) < 0.01 &&
  Math.abs(c.b - (hex & 255) / 255) < 0.01

/** Finds each face's sticker colors in the scene, once, before any are changed. */
function stickerColors(root: Root): [Face, Rgb][] {
  const found = new Map<Rgb, Face>()
  root.traverse((o) => {
    for (const m of [o.material].flat()) {
      const c = m?.color
      const face = c && (Object.keys(STOCK) as Face[]).find((f) => near(c, STOCK[f]))
      if (c && face) found.set(c, face)
    }
  })
  return [...found].map(([c, f]) => [f, c])
}

/** The app's color for a face as 0-1 channels; theme colors are read from the page. */
function appColor(face: Face): Rgb {
  let css = COLORS[face]
  const v = /^var\((--[\w-]+)\)$/.exec(css)
  if (v) css = getComputedStyle(document.documentElement).getPropertyValue(v[1]).trim()
  const n = parseInt(css.replace('#', ''), 16)
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }
}

// Colors are shown as stored (no color-space conversion), so the hex values go in as-is.
const paint = (colors: [Face, Rgb][]) => colors.forEach(([f, c]) => Object.assign(c, appColor(f)))

const same = (name: string, faces: string) => name.length === faces.length && [...faces].every((f) => name.includes(f))

/** Stickering that greys out everything except one F2L pair (and the centers). */
function pairMask(pair: Pair, crossColor: number): string {
  const sides = pair.split('-').map((c) => HOME[Number(c)]).join('')
  const corner = sides + HOME[crossColor]
  const edges = EDGES.map((e) => (same(e, sides) ? '-' : 'I')).join('')
  const corners = CORNERS.map((c) => (same(c, corner) ? '-' : 'I')).join('')
  return `EDGES:${edges},CORNERS:${corners},CENTERS:------`
}

/**
 * The cube in 3D, from the solver's view. Stickers on the hidden back, left and bottom float
 * just off those faces, so every piece shows while it still reads as one cube. `setup` is where
 * the cube starts; `moves` are shown applied on top and can be played back.
 */
export function Cube3D({
  setup,
  moves,
  highlight,
  playToken,
}: {
  setup: string
  moves: string
  highlight?: { pair: Pair; crossColor: number } | null
  /** Change this to replay `moves` from the start. */
  playToken?: number
}) {
  const host = useRef<HTMLDivElement>(null)
  const player = useRef<TwistyPlayer | null>(null)

  useEffect(() => {
    const p = new TwistyPlayer({
      puzzle: '3x3x3',
      visualization: '3D',
      controlPanel: 'none',
      background: 'none',
      hintFacelets: 'floating',
      experimentalSetupAnchor: 'start',
      tempoScale: 2,
    })
    player.current = p
    host.current?.appendChild(p)
    // cubing.js turns the cube on every move until it sees the button come up, so a missed
    // release turns it on plain hover. Only let moves through while a button is held.
    const onlyWhileHeld = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.buttons === 0) e.stopPropagation()
    }
    host.current?.addEventListener('pointermove', onlyWhileHeld, { capture: true })
    // Repaint when the theme changes, from the app's setting or the system's.
    let colors: [Face, Rgb][] = []
    const repaint = () => {
      paint(colors)
      p.experimentalCurrentVantages().then((vs) => [...vs].forEach((v) => v.scheduleRender()))
    }
    p.experimentalCurrentThreeJSPuzzleObject().then((root) => {
      colors = stickerColors(root as unknown as Root)
      paint(colors)
    })
    const themeAttr = new MutationObserver(repaint)
    themeAttr.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    const system = matchMedia('(prefers-color-scheme: dark)')
    system.addEventListener('change', repaint)
    const el = host.current
    return () => {
      el?.removeEventListener('pointermove', onlyWhileHeld, { capture: true })
      themeAttr.disconnect()
      system.removeEventListener('change', repaint)
      p.remove()
      player.current = null
    }
  }, [])

  useEffect(() => {
    const p = player.current
    if (!p) return
    p.experimentalSetupAlg = setup
    p.alg = moves
    p.jumpToEnd()
  }, [setup, moves])

  useEffect(() => {
    const p = player.current
    if (p) p.experimentalStickeringMaskOrbits = highlight ? pairMask(highlight.pair, highlight.crossColor) : FULL
  }, [highlight?.pair, highlight?.crossColor]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const p = player.current
    if (!p || !playToken) return
    p.jumpToStart()
    p.play()
  }, [playToken])

  return <div className="cube-3d" ref={host} role="img" aria-label="Cube in 3D. Drag to turn it." />
}
