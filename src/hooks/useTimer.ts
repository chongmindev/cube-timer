import { useCallback, useEffect, useRef, useState } from 'react'
import type { Penalty } from '../lib/stats'

export type Phase = 'idle' | 'inspecting' | 'holding' | 'ready' | 'running' | 'stopped'

interface Options {
  holdMs: number
  inspection: boolean
  /** When false, the spacebar is ignored (menus, panels, text fields). A running timer can always be stopped. */
  enabled: boolean
  onFinish: (time: number, penalty: Penalty) => void
}

const INSPECTION_MS = 15000

function inspectionPenalty(elapsed: number): Penalty {
  if (elapsed > INSPECTION_MS + 2000) return 'dnf'
  if (elapsed > INSPECTION_MS) return '+2'
  return 'none'
}

export function useTimer({ holdMs, inspection, enabled, onFinish }: Options) {
  const [phase, setPhaseState] = useState<Phase>('idle')
  const [now, setNow] = useState(0)
  const phaseRef = useRef<Phase>('idle')
  const holdFrom = useRef<Phase>('idle')
  const holdTimer = useRef<number | undefined>(undefined)
  const startAt = useRef(0)
  const inspectAt = useRef(0)
  const primed = useRef(false)
  const finish = useRef(onFinish)
  finish.current = onFinish

  const setPhase = (p: Phase) => {
    phaseRef.current = p
    setPhaseState(p)
  }

  const press = useCallback(() => {
    const p = phaseRef.current
    if (p === 'running') {
      const t = performance.now()
      const penalty = inspection ? inspectionPenalty(startAt.current - inspectAt.current) : 'none'
      setNow(t)
      setPhase('stopped')
      finish.current(t - startAt.current, penalty)
      return
    }
    if (p === 'idle' && inspection) {
      primed.current = true
      return
    }
    if (p === 'idle' || p === 'inspecting') {
      holdFrom.current = p
      setPhase('holding')
      holdTimer.current = window.setTimeout(() => setPhase('ready'), holdMs)
    }
  }, [holdMs, inspection])

  const release = useCallback(() => {
    const p = phaseRef.current
    window.clearTimeout(holdTimer.current)
    if (p === 'stopped') {
      setPhase('idle')
    } else if (p === 'holding') {
      setPhase(holdFrom.current)
    } else if (p === 'ready') {
      startAt.current = performance.now()
      setPhase('running')
    } else if (p === 'idle' && primed.current) {
      primed.current = false
      inspectAt.current = performance.now()
      setPhase('inspecting')
    }
  }, [])

  const cancel = useCallback(() => {
    window.clearTimeout(holdTimer.current)
    primed.current = false
    if (phaseRef.current !== 'running') setPhase('idle')
  }, [])

  // Animation loop while anything is counting.
  useEffect(() => {
    if (phase === 'idle' || phase === 'stopped') return
    let raf = 0
    const tick = () => {
      setNow(performance.now())
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const p = phaseRef.current
      if (p === 'running') {
        if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return
        e.preventDefault()
        press()
        return
      }
      if (!enabled) return
      if (e.key === 'Escape') return cancel()
      if (e.key === ' ') {
        // Space belongs to the timer: don't let it also click a focused button.
        e.preventDefault()
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
        if (!e.repeat) press()
      }
    }
    const up = (e: KeyboardEvent) => {
      if (e.key === ' ') e.preventDefault()
      if (phaseRef.current === 'stopped' || e.key === ' ') release()
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [enabled, press, release, cancel])

  // Touch or click anywhere stops a running solve.
  useEffect(() => {
    if (phase !== 'running') return
    const down = () => press()
    window.addEventListener('pointerdown', down)
    return () => window.removeEventListener('pointerdown', down)
  }, [phase, press])

  const elapsed = phase === 'running' || phase === 'stopped' ? now - startAt.current : 0
  const inspecting = holdFrom.current === 'inspecting' && (phase === 'holding' || phase === 'ready')
  const inspectionElapsed = phase === 'inspecting' || inspecting ? now - inspectAt.current : 0

  return {
    phase,
    elapsed,
    /** Seconds left (can go negative), or null when not inspecting. */
    inspectionLeft: phase === 'inspecting' || inspecting ? (INSPECTION_MS - inspectionElapsed) / 1000 : null,
    press,
    release,
    cancel,
  }
}
