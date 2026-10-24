/** The three Bauhaus forms. Each one means one thing in the app; see DESIGN.md. */
export function Shape({ kind, size = 10, className }: { kind: 'circle' | 'square' | 'triangle'; size?: number; className?: string }) {
  return (
    <svg className={`shape ${className ?? ''}`} width={size} height={size} viewBox="0 0 10 10" aria-hidden="true">
      {kind === 'circle' && <circle cx="5" cy="5" r="5" fill="currentColor" />}
      {kind === 'square' && <rect width="10" height="10" fill="currentColor" />}
      {kind === 'triangle' && <path d="M5 0.5L10 9.5H0z" fill="currentColor" />}
    </svg>
  )
}
