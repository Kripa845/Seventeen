import { useEffect, useRef, useState } from 'react'
import type { Album, GameKey, Member, Score, Song } from './types'

export const BASE = import.meta.env.VITE_API_URL ?? '/api'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json() as Promise<T>
}

// Small in-memory cache so moving between pages doesn't refetch everything.
const cache = new Map<string, unknown>()
// Requests in flight, so several components asking for the same thing share one fetch.
const inflight = new Map<string, Promise<unknown>>()

function load<T>(path: string): Promise<T> {
  let p = inflight.get(path) as Promise<T> | undefined
  if (!p) {
    p = get<T>(path)
      .then((d) => {
        cache.set(path, d)
        return d
      })
      .finally(() => inflight.delete(path))
    inflight.set(path, p)
  }
  return p
}

// ---------- Keeping open pages fresh ----------
// When content changes (in this tab's Studio, another tab, Django admin or another device),
// cached responses are dropped and whatever is on screen fetches again. That's how a new
// album cover or member photo reaches viewers without them reloading.

const listeners = new Set<() => void>()
let channel: BroadcastChannel | null = null
try {
  channel = new BroadcastChannel('svt-content')
  channel.onmessage = () => refresh()
} catch {
  /* old browser: the version check below still catches up */
}

function refresh() {
  cache.clear()
  inflight.clear()
  listeners.forEach((fn) => fn())
}

/** Forget cached responses after something changes, in this tab and the site's other open tabs. */
export function invalidateApi() {
  refresh()
  channel?.postMessage('changed')
}

/** Calls fn whenever the site's content changes. Returns the unsubscribe function. */
export function onContentChange(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

/**
 * Watches /api/version/ (when the tab comes back into view, and every 20s while it's visible)
 * and refreshes open pages when an admin has changed something anywhere. Mount once.
 */
export function useContentSync(every = 20_000) {
  useEffect(() => {
    let last: string | null = null
    const check = async () => {
      if (document.hidden) return
      try {
        const { version } = await get<{ version: string }>('/version/')
        if (last !== null && version !== last) refresh()
        last = version
      } catch {
        /* backend down: try again next time */
      }
    }
    check()
    const timer = setInterval(check, every)
    const onShow = () => !document.hidden && check()
    document.addEventListener('visibilitychange', onShow)
    window.addEventListener('focus', onShow)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onShow)
      window.removeEventListener('focus', onShow)
    }
  }, [every])
}

export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(path ? ((cache.get(path) as T) ?? null) : null)
  const [error, setError] = useState<string | null>(null)
  const [generation, setGeneration] = useState(0)
  const shownPath = useRef(path)

  useEffect(() => onContentChange(() => setGeneration((g) => g + 1)), [])

  useEffect(() => {
    if (!path) return
    let alive = true
    // A new path starts blank; a refresh of the same path keeps the old data on screen until the new arrives.
    const isNewPath = shownPath.current !== path
    shownPath.current = path
    const cached = cache.get(path) as T | undefined
    if (cached !== undefined) {
      setData(cached)
      setError(null)
      return
    }
    if (isNewPath) {
      setData(null)
      setError(null)
    }
    load<T>(path)
      .then((d) => {
        if (!alive) return
        setData(d)
        setError(null)
      })
      .catch((e: Error) => alive && (isNewPath || generation === 0) && setError(e.message))
    return () => {
      alive = false
    }
  }, [path, generation])

  return { data, error, loading: !data && !error }
}

export const useMembers = () => useApi<Member[]>('/members/')
export const useMember = (slug: string) => useApi<Member>(`/members/${slug}/`)
export const useAlbums = () => useApi<Album[]>('/albums/')
export const useAlbum = (slug: string) => useApi<Album>(`/albums/${slug}/`)
export const useSongs = () => useApi<Song[]>('/songs/')
export const useTitleTracks = () => useApi<Song[]>('/songs/?title_tracks=1')
export const useSong = (id: string) => useApi<Song>(`/songs/${id}/`)

export async function fetchScores(game: GameKey): Promise<Score[]> {
  return get<Score[]>(`/scores/?game=${game}`)
}

export async function postScore(game: GameKey, player: string, score: number): Promise<Score> {
  // Signed-in players' sessions need Django's CSRF token on writes.
  const csrf = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/)?.[1] ?? ''
  const res = await fetch(`${BASE}/scores/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrf },
    body: JSON.stringify({ game, player, score }),
  })
  if (!res.ok) throw new Error('Could not save score')
  return res.json()
}
