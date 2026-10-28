import { useCallback, useEffect, useState } from 'react'
import { BASE, invalidateApi, onContentChange } from './api'
import type { StudioUser } from './types'

function csrfToken(): string {
  return document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/)?.[1] ?? ''
}

/** Turns DRF's {field: ["message"]} / {detail: "..."} errors into one readable line. */
function readError(data: unknown, status: number): string {
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>
    if (typeof d.detail === 'string') return d.detail
    const parts = Object.entries(d).map(([field, v]) => {
      const msg = Array.isArray(v) ? v.join(' ') : typeof v === 'object' && v ? Object.values(v).flat().join(' ') : String(v)
      return field === 'non_field_errors' ? msg : `${field.replace(/_/g, ' ')}: ${msg}`
    })
    if (parts.length) return parts.join(' · ')
  }
  if (status === 403 && data === null) return 'The server’s security check refused this. Reload the page and try again.'
  if (status === 403) return 'You need to be signed in to do that.'
  return `Something went wrong (${status}).`
}

/** A write (or read) as the signed-in user. Pass FormData to upload files. */
export async function send<T>(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', path: string, body?: object | FormData): Promise<T> {
  const isForm = body instanceof FormData
  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: 'same-origin',
    headers: {
      ...(isForm || body === undefined ? {} : { 'Content-Type': 'application/json' }),
      'X-CSRFToken': csrfToken(),
    },
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  })
  const data = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) throw new Error(readError(data, res.status))
  if (method !== 'GET') invalidateApi() // the public pages refetch fresh data
  return data as T
}

export function upload<T>(path: string, field: string, file: File): Promise<T> {
  const form = new FormData()
  form.append(field, file)
  return send<T>('PATCH', path, form)
}

/** Load something for the Studio, uncached, with a way to reload it. */
export function useStudioData<T>(path: string | null, { live = false }: { live?: boolean } = {}) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  // live: fetch again when the site's content changes (off by default, so a form being edited isn't reset).
  useEffect(() => (live ? onContentChange(() => setTick((t) => t + 1)) : undefined), [live])

  useEffect(() => {
    if (!path) return
    let alive = true
    send<T>('GET', path)
      .then((d) => alive && (setData(d), setError(null)))
      .catch((e: Error) => alive && setError(e.message))
    return () => {
      alive = false
    }
  }, [path, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { data, setData, error, reload }
}

/** Who is signed in: undefined while checking, null when signed out. */
export function useStudioUser() {
  const [user, setUser] = useState<StudioUser | null | undefined>(undefined)
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    send<{ user: StudioUser | null }>('GET', '/auth/me/')
      .then((d) => setUser(d.user))
      .catch(() => {
        setOffline(true)
        setUser(null)
      })
  }, [])

  const signIn = async (username: string, password: string) => {
    const d = await send<{ user: StudioUser }>('POST', '/auth/login/', { username, password })
    setUser(d.user)
  }
  const signOut = async () => {
    await send('POST', '/auth/logout/')
    setUser(null)
  }
  return { user, offline, signIn, signOut }
}
