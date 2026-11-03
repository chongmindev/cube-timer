// Official results from the WCA's public API, which needs no sign-in and allows requests from
// any site. The profile is kept in this browser and refreshed at most twice a day.

import { useEffect, useState } from 'react'

const API = 'https://www.worldcubeassociation.org/api/v0/persons/'
const KEY = 'cube-timer:wca'
const FRESH_MS = 12 * 60 * 60 * 1000

export const WCA_ID = /^\d{4}[A-Z]{4}\d{2}$/

/** `best` is in centiseconds, as the WCA stores it, for every event the app has. */
export interface WcaRecord {
  best: number
  worldRank: number
  continentRank: number
  countryRank: number
}

export interface WcaProfile {
  id: string
  name: string
  country: string
  /** ISO 3166 code, for the flag. The WCA's multi-country entries use codes starting with X. */
  countryCode: string
  url: string
  competitions: number
  medals: { gold: number; silver: number; bronze: number }
  /** How many official records they have set, by level. */
  recordsSet: { national: number; continental: number; world: number }
  records: Record<string, { single?: WcaRecord; average?: WcaRecord }>
  fetchedAt: number
}

type ApiRecord = { best: number; world_rank: number; continent_rank: number; country_rank: number }

const toRecord = (r?: ApiRecord): WcaRecord | undefined =>
  r && { best: r.best, worldRank: r.world_rank, continentRank: r.continent_rank, countryRank: r.country_rank }

/** The profile for a WCA ID, or null when there is none. Throws when the WCA can't be reached. */
export async function fetchProfile(id: string): Promise<WcaProfile | null> {
  const res = await fetch(API + encodeURIComponent(id))
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`WCA answered ${res.status}`)
  const d = await res.json()
  const records: WcaProfile['records'] = {}
  for (const [event, r] of Object.entries((d.personal_records ?? {}) as Record<string, { single?: ApiRecord; average?: ApiRecord }>)) {
    records[event] = { single: toRecord(r.single), average: toRecord(r.average) }
  }
  return {
    id: d.person.wca_id,
    name: d.person.name,
    country: d.person.country?.name ?? '',
    countryCode: d.person.country?.iso2 ?? '',
    url: d.person.url,
    competitions: d.competition_count ?? 0,
    medals: { gold: d.medals?.gold ?? 0, silver: d.medals?.silver ?? 0, bronze: d.medals?.bronze ?? 0 },
    recordsSet: { national: d.records?.national ?? 0, continental: d.records?.continental ?? 0, world: d.records?.world ?? 0 },
    records,
    fetchedAt: Date.now(),
  }
}

/** A flag image for the profile's country, or null for the WCA's multi-country entries. */
export function flagUrl(profile: WcaProfile): string | null {
  const code = profile.countryCode.toLowerCase()
  return /^[a-wyz][a-z]$/.test(code) || code === 'xk' ? `https://flagcdn.com/${code}.svg` : null
}

export function readSaved(): WcaProfile | null {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? 'null')
  } catch {
    return null
  }
}

export function save(profile: WcaProfile | null) {
  try {
    if (profile) localStorage.setItem(KEY, JSON.stringify(profile))
    else localStorage.removeItem(KEY)
  } catch {
    // Storage blocked: the profile is fetched again next time.
  }
}

/** The saved profile for `id`, refreshed in the background when it's more than half a day old. */
export function useWca(id: string | null): WcaProfile | null {
  const [profile, setProfile] = useState(() => {
    const saved = readSaved()
    return saved && saved.id === id ? saved : null
  })

  useEffect(() => {
    if (!id) return setProfile(null)
    const saved = readSaved()
    const mine = saved && saved.id === id ? saved : null
    setProfile(mine)
    // Profiles saved before flags were kept are fetched again.
    if (mine?.countryCode !== undefined && Date.now() - mine.fetchedAt < FRESH_MS) return
    let live = true
    fetchProfile(id)
      .then((p) => {
        if (!live || !p) return
        save(p)
        setProfile(p)
      })
      .catch(() => {
        // Offline or the WCA is down: keep showing what was saved.
      })
    return () => {
      live = false
    }
  }, [id])

  return profile
}
