import { useCallback, useEffect, useState } from 'react'
import { SessionsView } from './components/SessionsView'
import { SettingsView } from './components/SettingsView'
import { Logo } from './components/Logo'
import { TimerView } from './components/TimerView'
import { StoreProvider, useStore } from './lib/store'

type View = 'timer' | 'sessions' | 'settings'

const VIEWS: { id: View; label: string }[] = [
  { id: 'timer', label: 'Timer' },
  { id: 'sessions', label: 'Sessions' },
  { id: 'settings', label: 'Settings' },
]

function Shell() {
  const { state } = useStore()
  const [view, setView] = useState<View>('timer')
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
        <nav className="views" aria-label="Main">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              className="view-link"
              aria-current={view === v.id ? 'page' : undefined}
              onClick={() => setView(v.id)}
            >
              {v.label}
            </button>
          ))}
        </nav>
      </header>
      <main key={view} className="view">
        {view === 'timer' && <TimerView onFocusChange={onFocusChange} />}
        {view === 'sessions' && <SessionsView onOpenTimer={() => setView('timer')} />}
        {view === 'settings' && <SettingsView />}
      </main>
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
