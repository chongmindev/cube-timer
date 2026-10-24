import { useEffect, useRef, useState, type ReactNode } from 'react'

interface Item {
  key: string
  label: ReactNode
  hint?: ReactNode
  selected?: boolean
  onSelect: () => void
}

/** A text trigger that drops a plain list. Closes on outside click or Escape. */
export function Menu({
  label,
  items,
  footer,
  onOpenChange,
}: {
  label: ReactNode
  items: Item[]
  footer?: ReactNode
  onOpenChange?: (open: boolean) => void
}) {
  const [open, setOpenState] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const setOpen = (v: boolean) => {
    setOpenState(v)
    onOpenChange?.(v)
  }

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="menu" ref={root}>
      <button className="menu-trigger" aria-expanded={open} onClick={() => setOpen(!open)}>
        {label}
        <svg className="caret" width="10" height="6" viewBox="0 0 10 6" aria-hidden="true">
          <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      {open && (
        <div className="menu-list" role="menu">
          {items.map((item) => (
            <button
              key={item.key}
              role="menuitemradio"
              aria-checked={item.selected}
              className="menu-item"
              onClick={() => {
                item.onSelect()
                setOpen(false)
              }}
            >
              <span>{item.label}</span>
              {item.hint && <span className="menu-hint">{item.hint}</span>}
            </button>
          ))}
          {footer && <div className="menu-footer" onClick={() => setOpen(false)}>{footer}</div>}
        </div>
      )}
    </div>
  )
}
