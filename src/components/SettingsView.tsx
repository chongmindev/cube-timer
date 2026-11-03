import { Fragment, useRef, useState, type ReactNode } from 'react'
import { EVENTS } from '../lib/events'
import { formatMs } from '../lib/format'
import { useStore, type RunningDisplay, type State, type Theme } from '../lib/store'
import { WCA_ID, fetchProfile, flagUrl, save, useWca } from '../lib/wca'

function Row({ title, detail, children }: { title: ReactNode; detail?: string; children: ReactNode }) {
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
      <legend className="sr-only">{name[0].toUpperCase() + name.slice(1)}</legend>
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
    a.download = `thistle-${new Date().toISOString().slice(0, 10)}.json`
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
      setImportMessage('That file is not a Thistle export. Choose a .json file made with Export.')
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
        <Row title="While solving, show">
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
        <Row title="Scramble preview">
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

      <WcaSection wcaId={s.wcaId} onChange={(wcaId) => set({ wcaId })} />

      <section>
        <h2>Your data</h2>
        <p className="setting-detail">Solves are saved in this browser only. Export them to back up or move devices.</p>
        <Row
          title="Keep cleared solves in activity"
          detail="When you clear times or delete a session, its solves still count toward your activity graph and streak."
        >
          <Choice
            name="keep-activity"
            value={s.keepActivity ? 'on' : 'off'}
            options={[...ON_OFF]}
            onChange={(v) => set({ keepActivity: v === 'on' })}
          />
        </Row>
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

const official = (cs?: number) => (cs ? formatMs(cs * 10, 2) : '-')
/** "2 gold, 1 bronze": only the kinds there are some of. */
const breakdown = (counts: Record<string, number>) =>
  Object.entries(counts)
    .filter(([, n]) => n > 0)
    .map(([kind, n]) => `${n} ${kind}`)
    .join(', ')
const rank = (n?: number) => (n ? n.toLocaleString() : '-')

function WcaSection({ wcaId, onChange }: { wcaId: string | null; onChange: (id: string | null) => void }) {
  const profile = useWca(wcaId)
  const [draft, setDraft] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const connect = async () => {
    const id = draft.trim().toUpperCase()
    if (!WCA_ID.test(id)) return setMessage('A WCA ID looks like 2019MINC02: a year, four letters, two digits.')
    setBusy(true)
    setMessage(null)
    try {
      const p = await fetchProfile(id)
      if (!p) return setMessage(`No WCA profile has the ID ${id}.`)
      save(p)
      onChange(p.id)
      setDraft('')
    } catch {
      setMessage('Couldn’t reach the WCA. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  const events = profile ? EVENTS.filter((e) => profile.records[e.id]) : []

  return (
    <section>
      <h2>WCA profile</h2>
      {wcaId ? (
        <>
          <Row
            title={
              profile ? (
                <>
                  {flagUrl(profile) && (
                    <img className="wca-flag" src={flagUrl(profile)!} alt={profile.country} title={profile.country} />
                  )}
                  {profile.name}
                </>
              ) : (
                wcaId
              )
            }
            detail={profile ? profile.id : 'Loading official results'}
          >
            <div className="data-actions">
              {profile && (
                <a className="text-button" href={profile.url} target="_blank" rel="noreferrer">
                  Open on the WCA
                </a>
              )}
              <button
                className="text-button danger"
                onClick={() => {
                  save(null)
                  onChange(null)
                }}
              >
                Disconnect
              </button>
            </div>
          </Row>
          {profile?.medals && (
            <dl className="glance wca-glance">
              <div>
                <dt>Competitions</dt>
                <dd>{profile.competitions}</dd>
              </div>
              <div>
                <dt>Podiums</dt>
                <dd>{profile.medals.gold + profile.medals.silver + profile.medals.bronze}</dd>
                {breakdown(profile.medals) && <dd className="wca-breakdown">{breakdown(profile.medals)}</dd>}
              </div>
              <div>
                <dt>Records</dt>
                <dd>{profile.recordsSet.national + profile.recordsSet.continental + profile.recordsSet.world}</dd>
                {breakdown(profile.recordsSet) && <dd className="wca-breakdown">{breakdown(profile.recordsSet)}</dd>}
              </div>
            </dl>
          )}
          {events.length > 0 && (
            <div className="wca-scroll">
              <table className="stat-table wca-table">
                <thead>
                  <tr>
                    <td />
                    <th scope="colgroup" colSpan={4}>
                      Single
                    </th>
                    <th scope="colgroup" colSpan={4}>
                      Average
                    </th>
                  </tr>
                  <tr>
                    <th scope="col">Event</th>
                    {[0, 1].map((k) => (
                      <Fragment key={k}>
                        <th scope="col">Time</th>
                        <th scope="col" title="National rank">
                          NR
                        </th>
                        <th scope="col" title="Continental rank">
                          CR
                        </th>
                        <th scope="col" title="World rank">
                          WR
                        </th>
                      </Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => {
                    const r = profile!.records[e.id]
                    return (
                      <tr key={e.id}>
                        <th scope="row">{e.name}</th>
                        {[r.single, r.average].map((x, k) => (
                          <Fragment key={k}>
                            <td className="wca-time">{official(x?.best)}</td>
                            <td className="muted">{rank(x?.countryRank)}</td>
                            <td className="muted">{rank(x?.continentRank)}</td>
                            <td className="muted">{rank(x?.worldRank)}</td>
                          </Fragment>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <Row title="WCA ID" detail="Shows your official results here and beside your best on the timer.">
          <form
            className="wca-connect"
            onSubmit={(e) => {
              e.preventDefault()
              connect()
            }}
          >
            <input
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value)
                setMessage(null)
              }}
              placeholder="2019MINC02"
              maxLength={10}
              spellCheck={false}
              autoComplete="off"
              aria-label="WCA ID"
            />
            <button type="submit" className="text-button" disabled={busy || !draft.trim()}>
              {busy ? 'Connecting' : 'Connect'}
            </button>
          </form>
        </Row>
      )}
      {message && <p className="wca-message">{message}</p>}
    </section>
  )
}
