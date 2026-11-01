import { useEffect, useRef } from 'react'
import { TwistyPlayer } from 'cubing/twisty'
import type { Pair } from '../lib/recon/cube'

// cubing.js piece order for the 3x3, by home position (white top, green front).
const EDGES = ['UF', 'UR', 'UB', 'UL', 'DF', 'DR', 'DB', 'DL', 'FR', 'FL', 'BR', 'BL']
const CORNERS = ['UFR', 'URB', 'UBL', 'ULF', 'DRF', 'DFL', 'DLB', 'DBR']
// Our color numbers are the faces they start on.
const HOME = 'URFDLB'

const FULL = 'EDGES:------------,CORNERS:--------,CENTERS:------'

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
    return () => {
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
