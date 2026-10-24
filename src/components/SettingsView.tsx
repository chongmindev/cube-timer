import { useRef, useState, type ReactNode } from 'react'
import { useStore, type RunningDisplay, type State, type Theme } from '../lib/store'

function Row({ title, detail, children }: { title: string; detail?: string; children: ReactNode }) {
  return (
    <div className="setting">
      <div>
        <p className="setting-title">{title}</p>
        {detail && <p className="setting-detail">{detail}</p>}
      </div>
      <div className="setting-control">{children}</div>
    </div>
  )
}

function Choice<T extends string | number>({
  name,
  value,
  options,
  onChange,
}: {
  name: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <fieldset className="segmented">
      <legend className="sr-only">{name}</legend>
      {options.map((o) => (
        <label key={String(o.value)} className={value === o.value ? 'is-on' : undefined}>
          <input type="radio" name={name} checked={value === o.value} onChange={() => onChange(o.value)} />
          {o.label}
        </label>
      ))}
    </fieldset>
  )
}

const ON_OFF = [
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
] as const

export function SettingsView() {
  const { state, dispatch } = useStore()
  const s = state.settings
  const set = (patch: Partial<typeof s>) => dispatch({ type: 'updateSettings', patch })
  const fileInput = useRef<HTMLInputElement>(null)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `cube-timer-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const importData = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as State
      if (!Array.isArray(parsed.sessions) || !parsed.sessions.length) throw new Error('no sessions')
      dispatch({ type: 'replaceAll', state: { ...parsed, settings: { ...s, ...parsed.settings } } })
      const count = parsed.sessions.reduce((n, x) => n + x.solves.length, 0)
      setImportMessage(`Imported ${parsed.sessions.length} sessions and ${count} solves.`)
    } catch {
      setImportMessage('That file is not a cube timer export. Choose a .json file made with Export.')
    }
  }

  return (
    <div className="settings-view">
      <h1>Settings</h1>

      <section>
        <h2>Timing</h2>
        <Row title="Inspection" detail="15 seconds, with +2 after 15 and DNF after 17, like at a competition.">
          <Choice
            name="inspection"
            value={s.inspection ? 'on' : 'off'}
            options={[...ON_OFF]}
            onChange={(v) => set({ inspection: v === 'on' })}
          />
        </Row>
        <Row title="Hold to start" detail="How long to hold space before the timer is ready.">
          <Choice
            name="hold"
            value={s.holdMs}
            options={[
              { value: 0, label: 'None' },
              { value: 300, label: '0.3s' },
              { value: 550, label: '0.55s' },
              { value: 1000, label: '1s' },
            ]}
            onChange={(v) => set({ holdMs: v })}
          />
        </Row>
        <Row title="While solving, show" detail="Hiding the running time helps some people stay calm.">
          <Choice<RunningDisplay>
            name="running"
            value={s.runningDisplay}
            options={[
              { value: 'live', label: 'Full time' },
              { value: 'seconds', label: 'Seconds' },
              { value: 'hidden', label: 'Nothing' },
            ]}
            onChange={(v) => set({ runningDisplay: v })}
          />
        </Row>
        <Row title="Decimals">
          <Choice
            name="decimals"
            value={s.decimals}
            options={[
              { value: 2, label: '0.01' },
              { value: 3, label: '0.001' },
            ]}
            onChange={(v) => set({ decimals: v })}
          />
        </Row>
      </section>

      <section>
        <h2>Display</h2>
        <Row title="Focus mode" detail="Fade everything but the time while you inspect and solve.">
          <Choice
            name="focus"
            value={s.focusMode ? 'on' : 'off'}
            options={[...ON_OFF]}
            onChange={(v) => set({ focusMode: v === 'on' })}
          />
        </Row>
        <Row title="Scramble preview" detail="A flat picture of the puzzle after the scramble.">
          <Choice
            name="preview"
            value={s.showPreview ? 'on' : 'off'}
            options={[...ON_OFF]}
            onChange={(v) => set({ showPreview: v === 'on' })}
          />
        </Row>
        <Row title="Theme">
          <Choice<Theme>
            name="theme"
            value={s.theme}
            options={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
            onChange={(v) => set({ theme: v })}
          />
        </Row>
      </section>

      <section>
        <h2>Your data</h2>
        <p className="setting-detail">Solves are saved in this browser only. Export them to back up or move devices.</p>
        <div className="data-actions">
          <button className="text-button" onClick={exportData}>
            Export all sessions
          </button>
          <button className="text-button" onClick={() => fileInput.current?.click()}>
            Import from a file
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) importData(f)
              e.target.value = ''
            }}
          />
          <button
            className="text-button danger"
            onBlur={() => setConfirmClear(false)}
            onClick={() => {
              if (!confirmClear) return setConfirmClear(true)
              localStorage.removeItem('cube-timer:v1')
              location.reload()
            }}
          >
            {confirmClear ? 'Erase every session for good?' : 'Erase all data'}
          </button>
        </div>
        {importMessage && <p className="notice">{importMessage}</p>}
      </section>
    </div>
  )
}
