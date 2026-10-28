import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { send } from '../lib/studio'
import type { Account, Song } from '../lib/types'
import './auth.css'

interface RegisterInput {
  username: string
  password: string
  display_name?: string
  bias?: string | null
}

interface AuthCtx {
  /** undefined while checking, null when signed out */
  account: Account | null | undefined
  /** ids of the songs this viewer has hearted */
  likes: Set<number>
  login: (username: string, password: string) => Promise<Account>
  register: (input: RegisterInput) => Promise<Account>
  logout: () => Promise<void>
  saveProfile: (patch: { display_name?: string; bias?: string | null }) => Promise<void>
  /** Returns false (and changes nothing) when signed out, so the caller can send them to sign in. */
  toggleLike: (song: Song) => Promise<boolean>
}

const Ctx = createContext<AuthCtx | null>(null)

/** Who is signed in, for the whole site. Viewers get a dashboard; admins also get the Studio. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null | undefined>(undefined)
  const [likes, setLikes] = useState<Set<number>>(new Set())

  const loadLikes = useCallback(async () => {
    const songs = await send<Song[]>('GET', '/me/likes/')
    setLikes(new Set(songs.map((s) => s.id)))
  }, [])

  const signedIn = useCallback(
    (a: Account | null) => {
      setAccount(a)
      if (a) loadLikes().catch(() => setLikes(new Set()))
      else setLikes(new Set())
    },
    [loadLikes],
  )

  useEffect(() => {
    send<{ user: Account | null }>('GET', '/auth/me/')
      .then((d) => signedIn(d.user))
      .catch(() => signedIn(null))
  }, [signedIn])

  const value = useMemo<AuthCtx>(
    () => ({
      account,
      likes,
      login: async (username, password) => {
        const d = await send<{ user: Account }>('POST', '/auth/login/', { username, password })
        signedIn(d.user)
        return d.user
      },
      register: async (input) => {
        const d = await send<{ user: Account }>('POST', '/auth/register/', input)
        signedIn(d.user)
        return d.user
      },
      logout: async () => {
        await send('POST', '/auth/logout/')
        signedIn(null)
      },
      saveProfile: async (patch) => {
        const d = await send<{ user: Account }>('PATCH', '/me/profile/', patch)
        setAccount(d.user)
      },
      toggleLike: async (song) => {
        if (!account) return false
        const liked = likes.has(song.id)
        const next = new Set(likes)
        if (liked) next.delete(song.id)
        else next.add(song.id)
        setLikes(next) // feels instant; undone below if the server says no
        try {
          if (liked) await send('DELETE', `/me/likes/${song.id}/`)
          else await send('POST', '/me/likes/', { song: song.id })
        } catch {
          setLikes(likes)
        }
        return true
      },
    }),
    [account, likes, signedIn],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}

/** Where to go after signing in: a safe ?next= path, else the place for your role. */
export function homeFor(account: Account, next: string | null) {
  if (next && next.startsWith('/') && !next.startsWith('//') && next !== '/' && next !== '/login' && next !== '/register') return next
  return account.is_staff ? '/studio' : '/me'
}
