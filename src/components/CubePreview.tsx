import { useEffect, useRef } from 'react'
import { TwistyPlayer } from 'cubing/twisty'
import { ScrambleNet } from './ScrambleNet'

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
  }, [puzzle])

  useEffect(() => {
    if (player.current) player.current.experimentalSetupAlg = scramble ?? ''
  }, [scramble, puzzle])

  return <div className="preview" ref={host} aria-label="Scrambled puzzle preview" role="img" />
}
