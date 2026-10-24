import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react'
import { uid } from './format'
import type { Penalty, Solve } from './stats'

export interface Session {
  id: string
  name: string
  event: string
  solves: Solve[]
  created: number
}

export type RunningDisplay = 'live' | 'seconds' | 'hidden'
export type Theme = 'system' | 'light' | 'dark'

export interface Settings {
  inspection: boolean
  holdMs: number
  focusMode: boolean
  runningDisplay: RunningDisplay
  decimals: 2 | 3
  theme: Theme
  showPreview: boolean
}

export interface State {
  sessions: Session[]
  currentId: string
  settings: Settings
}

export const DEFAULT_SETTINGS: Settings = {
  inspection: false,
  holdMs: 300,
  focusMode: true,
  runningDisplay: 'live',
  decimals: 2,
  theme: 'system',
  showPreview: true,
}

const STORAGE_KEY = 'cube-timer:v1'

function newSession(event: string, name: string): Session {
  return { id: uid(), name, event, solves: [], created: Date.now() }
}

function initialState(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as State
      if (parsed.sessions?.length) {
        return { ...parsed, settings: { ...DEFAULT_SETTINGS, ...parsed.settings } }
      }
    }
  } catch {
    // Storage unavailable or corrupt: start fresh.
  }
  const first = newSession('333', 'Main')
  return { sessions: [first], currentId: first.id, settings: DEFAULT_SETTINGS }
}

export type Action =
  | { type: 'addSolve'; solve: Solve }
  | { type: 'setPenalty'; solveId: string; penalty: Penalty }
  | { type: 'deleteSolve'; solveId: string }
  | { type: 'setSolves'; sessionId: string; solves: Solve[] }
  | { type: 'selectSession'; id: string }
  | { type: 'selectEvent'; event: string }
  | { type: 'createSession'; event: string; name: string }
  | { type: 'renameSession'; id: string; name: string }
  | { type: 'deleteSession'; id: string }
  | { type: 'updateSettings'; patch: Partial<Settings> }
  | { type: 'replaceAll'; state: State }

function mapCurrent(state: State, fn: (s: Session) => Session): State {
  return { ...state, sessions: state.sessions.map((s) => (s.id === state.currentId ? fn(s) : s)) }
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'addSolve':
      return mapCurrent(state, (s) => ({ ...s, solves: [...s.solves, action.solve] }))
    case 'setPenalty':
      return mapCurrent(state, (s) => ({
        ...s,
        solves: s.solves.map((x) => (x.id === action.solveId ? { ...x, penalty: action.penalty } : x)),
      }))
    case 'deleteSolve':
      return mapCurrent(state, (s) => ({ ...s, solves: s.solves.filter((x) => x.id !== action.solveId) }))
    case 'setSolves':
      return {
        ...state,
        sessions: state.sessions.map((s) => (s.id === action.sessionId ? { ...s, solves: action.solves } : s)),
      }
    case 'selectSession':
      return { ...state, currentId: action.id }
    case 'selectEvent': {
      // Jump to the most recent session for this event, or start one.
      const existing = [...state.sessions].reverse().find((s) => s.event === action.event)
      if (existing) return { ...state, currentId: existing.id }
      const created = newSession(action.event, 'Main')
      return { ...state, sessions: [...state.sessions, created], currentId: created.id }
    }
    case 'createSession': {
      const created = newSession(action.event, action.name)
      return { ...state, sessions: [...state.sessions, created], currentId: created.id }
    }
    case 'renameSession':
      return {
        ...state,
        sessions: state.sessions.map((s) => (s.id === action.id ? { ...s, name: action.name } : s)),
      }
    case 'deleteSession': {
      let sessions = state.sessions.filter((s) => s.id !== action.id)
      if (sessions.length === 0) sessions = [newSession('333', 'Main')]
      const currentId = sessions.some((s) => s.id === state.currentId) ? state.currentId : sessions[0].id
      return { ...state, sessions, currentId }
    }
    case 'updateSettings':
      return { ...state, settings: { ...state.settings, ...action.patch } }
    case 'replaceAll':
      return action.state
  }
}

const StoreContext = createContext<{ state: State; dispatch: (a: Action) => void } | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Storage full or blocked: keep working in memory.
    }
  }, [state])

  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  const current = ctx.state.sessions.find((s) => s.id === ctx.state.currentId) ?? ctx.state.sessions[0]
  return { ...ctx, current }
}
