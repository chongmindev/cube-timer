import { useEffect, useRef, useState } from 'react'
import { TwistyPlayer } from 'cubing/twisty'
import { applyPuzzleColors } from '../lib/puzzleColors'
import { ScrambleNet } from './ScrambleNet'

applyPuzzleColors()

/** Changes whenever the theme does, from the app's setting or the system's. */
function useThemeVersion() {
  const [version, setVersion] = useState(0)
  useEffect(() => {
    const bump = () => setVersion((v) => v + 1)
    const attr = new MutationObserver(bump)
    attr.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    const system = matchMedia('(prefers-color-scheme: dark)')
    system.addEventListener('change', bump)
    return () => {
      attr.disconnect()
      system.removeEventListener('change', bump)
    }
  }, [])
  return version
}

const NXN = /^(\d)x\1x\1$/

/** Picture of the puzzle after the scramble. Cubes use our own net; other puzzles use cubing.js. */
export function CubePreview({ puzzle, scramble }: { puzzle: string; scramble: string | null }) {
  const cube = NXN.exec(puzzle)
  if (cube) {
    return (
      <div className="preview">
        <ScrambleNet size={Number(cube[1])} scramble={scramble} />
      </div>
    )
  }
  return <TwistyPreview puzzle={puzzle} scramble={scramble} />
}

function TwistyPreview({ puzzle, scramble }: { puzzle: string; scramble: string | null }) {
  const host = useRef<HTMLDivElement>(null)
  const player = useRef<TwistyPlayer | null>(null)
  // The puzzle's colors are fixed when it's drawn, so a theme change draws it again.
  const theme = useThemeVersion()

  useEffect(() => {
    const p = new TwistyPlayer({
      puzzle: puzzle as TwistyPlayer['puzzle'],
      visualization: '2D',
      controlPanel: 'none',
      background: 'none',
      hintFacelets: 'none',
    })
    player.current = p
    host.current?.appendChild(p)
    return () => {
      p.remove()
      player.current = null
    }
  }, [puzzle, theme])

  useEffect(() => {
    if (player.current) player.current.experimentalSetupAlg = scramble ?? ''
  }, [scramble, puzzle, theme])

  return <div className="preview" ref={host} aria-label="Scrambled puzzle preview" role="img" />
}
