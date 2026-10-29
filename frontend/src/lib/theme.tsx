import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { BASE } from './api'
import { CARAT_THEME, deepen, mix, readableOn, THEME_FONTS as FONTS } from './color'
import type { SiteSettings, ThemeTokens } from './types'
import '../themes/heaven.css'
import '../themes/darling.css'
import '../themes/leftright.css'
import '../themes/world.css'
import '../themes/attacca.css'
import '../themes/hot.css'
import '../themes/homerun.css'
import '../themes/maestro.css'
import '../themes/ajunice.css'
import '../themes/scoups.css'
import '../themes/jeonghan.css'
import '../themes/joshua.css'
import '../themes/jun.css'
import '../themes/dk.css'
import '../themes/woozi.css'
import '../themes/wonwoo.css'
import '../themes/the8.css'
import '../themes/dino.css'
import '../themes/seungkwan.css'
import '../themes/vernon.css'
import '../themes/mingyu.css'
import '../themes/hoshi.css'

/**
 * One look for every page: the theme the visitor chose to "wear" (Themes page or an
 * album's button, saved in localStorage), else the site's theme (set in the Studio).
 * Member, album and song pages don't change it; they only tint their own content.
 *  - override: the Studio's live preview while an admin edits the site theme
 */
interface Pinned {
  label: string
  tokens: ThemeTokens
}

interface ThemeCtx {
  pinned: Pinned | null
  pin: (p: Pinned | null) => void
  setOverride: (t: ThemeTokens | null) => void
  active: ThemeTokens
  site: SiteSettings | null
  setSite: (s: SiteSettings) => void
}

const Ctx = createContext<ThemeCtx | null>(null)
const KEY = 'svt-pinned-era'


function loadPinned(): Pinned | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Pinned) : null
  } catch {
    return null
  }
}

function applyTokens(t: ThemeTokens) {
  const root = document.documentElement
  // On dark themes the accent is used as-is; on light ones make sure text on it is readable.
  const accentStrong = t.dark ? t.accent : deepen(t.accent)
  const vars: Record<string, string> = {
    '--bg': t.bg,
    '--surface': t.surface,
    '--text': t.text,
    '--muted': mix(t.text, t.bg, 0.38),
    '--line': mix(t.text, t.bg, 0.86),
    '--accent': t.accent,
    '--accent-strong': accentStrong,
    '--on-accent': readableOn(accentStrong),
    '--accent2': t.accent2,
    '--glow': mix(t.accent, t.bg, 0.55),
    '--font-head': FONTS[t.font] ?? FONTS.serif,
  }
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v)
  root.dataset.pattern = t.pattern
  root.dataset.skin = t.skin ?? 'none'
  root.dataset.dark = String(t.dark)
  root.style.colorScheme = t.dark ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pinned, setPinned] = useState<Pinned | null>(loadPinned)
  const [override, setOverride] = useState<ThemeTokens | null>(null)
  const [site, setSite] = useState<SiteSettings | null>(null)
  const active = override ?? pinned?.tokens ?? site?.theme ?? CARAT_THEME

  useEffect(() => {
    fetch(`${BASE}/site/`)
      .then((r) => (r.ok ? r.json() : null))
      .then((s: SiteSettings | null) => s && setSite(s))
      .catch(() => {
        /* backend down: keep the built-in default */
      })
  }, [])

  useLayoutEffect(() => {
    applyTokens(active)
  }, [active])

  const value = useMemo<ThemeCtx>(
    () => ({
      pinned,
      active,
      site,
      setSite,
      setOverride,
      pin: (p) => {
        setPinned(p)
        try {
          if (p) localStorage.setItem(KEY, JSON.stringify(p))
          else localStorage.removeItem(KEY)
        } catch {
          /* storage blocked: still works for this visit */
        }
      },
    }),
    [pinned, active, site],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useTheme() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useTheme must be inside ThemeProvider')
  return ctx
}

/** The Studio's live preview of a theme being edited; removed when the editor unmounts. */
export function usePageTheme(tokens: ThemeTokens | null | undefined) {
  const { setOverride } = useTheme()
  const key = tokens ? JSON.stringify(tokens) : ''
  useEffect(() => {
    if (!key) return
    setOverride(JSON.parse(key) as ThemeTokens)
    return () => setOverride(null)
  }, [key, setOverride])
}
