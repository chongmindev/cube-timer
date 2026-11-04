import { useCallback, useEffect, useState } from 'react'
import { SessionsView } from './components/SessionsView'
import { SettingsView } from './components/SettingsView'
import { Logo } from './components/Logo'
import { ReconstructView } from './components/ReconstructView'
import { ReconsView } from './components/ReconsView'
import { TimerView } from './components/TimerView'
import { getEvent } from './lib/events'
import { StoreProvider, useStore } from './lib/store'

type View = 'timer' | 'sessions' | 'recons' | 'settings'

const VIEWS: { id: View; label: string }[] = [
  { id: 'timer', label: 'Timer' },
  { id: 'sessions', label: 'Sessions' },
  { id: 'recons', label: 'Recons' },
  { id: 'settings', label: 'Settings' },
]

function Shell() {
  const { state, current, dispatch } = useStore()
  const [view, setView] = useState<View>('timer')
  const [reconId, setReconId] = useState<string | null>(null)
  const reconIndex = current.solves.findIndex((s) => s.id === reconId)
  const [focused, setFocused] = useState(false)
  const onFocusChange = useCallback((f: boolean) => setFocused(f), [])

  // The browser tab names the page you're on.
  useEffect(() => {
    const page = reconIndex >= 0 ? 'Reconstruct' : view === 'timer' ? 'Home' : VIEWS.find((v) => v.id === view)!.label
    document.title = `Thistle ${page}`
  }, [view, reconIndex])

  useEffect(() => {
    const theme = state.settings.theme
    if (theme === 'system') document.documentElement.removeAttribute('data-theme')
    else document.documentElement.setAttribute('data-theme', theme)
  }, [state.settings.theme])

  return (
    <div className={`app ${focused ? 'is-focus' : ''}`}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="topbar chrome">
        <span className="wordmark" aria-label="Thistle, cube timer">
          <Logo />
          <span className="wordmark-text">
            Thistle <span className="wordmark-sub">cube timer</span>
          </span>
        </span>
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
        <main key={`recon-${reconId}`} id="main" tabIndex={-1} className="view">
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
        <main key={view} id="main" tabIndex={-1} className="view">
          {view === 'timer' && <TimerView onFocusChange={onFocusChange} onReconstruct={setReconId} />}
          {view === 'sessions' && <SessionsView onOpenTimer={() => setView('timer')} onReconstruct={setReconId} />}
          {view === 'recons' && (
            <ReconsView
              onOpen={(sessionId, solveId) => {
                dispatch({ type: 'selectSession', id: sessionId })
                setReconId(solveId)
              }}
            />
          )}
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
