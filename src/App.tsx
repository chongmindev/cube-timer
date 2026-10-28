import { useCallback, useEffect, useState } from 'react'
import { SessionsView } from './components/SessionsView'
import { SettingsView } from './components/SettingsView'
import { Logo } from './components/Logo'
import { ReconstructView } from './components/ReconstructView'
import { StreakMark } from './components/StreakMark'
import { TimerView } from './components/TimerView'
import { getEvent } from './lib/events'
import { StoreProvider, useStore } from './lib/store'

type View = 'timer' | 'sessions' | 'settings'

const VIEWS: { id: View; label: string }[] = [
  { id: 'timer', label: 'Timer' },
  { id: 'sessions', label: 'Sessions' },
  { id: 'settings', label: 'Settings' },
]

function Shell() {
  const { state, current, dispatch } = useStore()
  const [view, setView] = useState<View>('timer')
  const [reconId, setReconId] = useState<string | null>(null)
  const reconIndex = current.solves.findIndex((s) => s.id === reconId)
  const [focused, setFocused] = useState(false)
  const onFocusChange = useCallback((f: boolean) => setFocused(f), [])

  useEffect(() => {
    const theme = state.settings.theme
    if (theme === 'system') document.documentElement.removeAttribute('data-theme')
    else document.documentElement.setAttribute('data-theme', theme)
  }, [state.settings.theme])

  return (
    <div className={`app ${focused ? 'is-focus' : ''}`}>
      <header className="topbar chrome">
        <span className="wordmark" aria-label="cube timer">
          <Logo />
          <span className="wordmark-text">cube timer</span>
        </span>
        <StreakMark />
        <nav className="views" aria-label="Main">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              className="view-link"
              aria-current={view === v.id ? 'page' : undefined}
              onClick={() => {
                setView(v.id)
                setReconId(null)
              }}
            >
              {v.label}
            </button>
          ))}
        </nav>
      </header>
      {reconIndex >= 0 ? (
        <main key={`recon-${reconId}`} className="view">
          <ReconstructView
            solve={current.solves[reconIndex]}
            index={reconIndex}
            eventName={getEvent(current.event).name}
            decimals={state.settings.decimals}
            onSave={(recon) => dispatch({ type: 'setRecon', solveId: reconId!, recon })}
            onClose={() => setReconId(null)}
          />
        </main>
      ) : (
        <main key={view} className="view">
          {view === 'timer' && <TimerView onFocusChange={onFocusChange} onReconstruct={setReconId} />}
          {view === 'sessions' && <SessionsView onOpenTimer={() => setView('timer')} onReconstruct={setReconId} />}
          {view === 'settings' && <SettingsView />}
        </main>
      )}
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  )
}
