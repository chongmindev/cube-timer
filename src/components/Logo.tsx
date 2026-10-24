import { CUBE_BLUE, CUBE_RED, CUBE_YELLOW } from '../lib/logoPaths'

// A cube drawn only with three primary ribbons wrapped around it. Same drawing as public/favicon.svg.
export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg className="logo" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d={CUBE_RED} fill="var(--red)" />
      <path d={CUBE_YELLOW} fill="var(--yellow)" />
      <path d={CUBE_BLUE} fill="var(--blue)" />
    </svg>
  )
}
