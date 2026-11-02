// A few ready scrambles per event, kept in the browser so a new scramble shows up instantly
// instead of waiting on the generator. Each one is used once. The pool refills in the
// background, one scramble at a time, starting with the event you're on.

import { randomScrambleForEvent } from 'cubing/scramble'
import { EVENTS } from './events'

const KEY = 'cube-timer:scrambles'
const KEEP = 4

type Pool = Record<string, string[]>

function read(): Pool {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    return p && typeof p === 'object' ? p : {}
  } catch {
    return {}
  }
}

function write(p: Pool) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    // Storage full or blocked: scrambles are still generated live.
  }
}

export async function generate(event: string): Promise<string> {
  return (await randomScrambleForEvent(event)).toString()
}

/** A saved scramble for the event, or null if none is ready. */
export function takeSaved(event: string): string | null {
  const p = read()
  const s = p[event]?.shift() ?? null
  if (s) write(p)
  refill(event)
  return s
}

let running = false
let again = false
let first: string | undefined

/** Tops up every event's pool, `priority` first. Safe to call often. */
export function refill(priority?: string) {
  if (priority) first = priority
  if (running) {
    again = true
    return
  }
  running = true
  void (async () => {
    do {
      again = false
      const order = [...new Set([first, ...EVENTS.map((e) => e.id)].filter((e): e is string => !!e))]
      for (const event of order) {
        while ((read()[event]?.length ?? 0) < KEEP) {
          let s: string
          try {
            s = await generate(event)
          } catch {
            break
          }
          const p = read()
          ;(p[event] ??= []).push(s)
          write(p)
          // The event you're on may have changed while this one was generating.
          if (again && first !== event) break
        }
        if (again) break
      }
    } while (again)
    running = false
  })()
}
