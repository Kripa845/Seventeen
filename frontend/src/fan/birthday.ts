import {
  DINO_THEME,
  DK_THEME,
  HOSHI_THEME,
  JEONGHAN_THEME,
  JOSHUA_THEME,
  JUN_THEME,
  MINGYU_THEME,
  SCOUPS_THEME,
  SEUNGKWAN_THEME,
  THE8_THEME,
  VERNON_THEME,
  WONWOO_THEME,
  WOOZI_THEME,
} from '../lib/color'
import type { Member, ThemeTokens } from '../lib/types'

/** Each member's own theme, by member slug. */
export const MEMBER_THEMES: Record<string, ThemeTokens> = {
  scoups: SCOUPS_THEME,
  jeonghan: JEONGHAN_THEME,
  joshua: JOSHUA_THEME,
  jun: JUN_THEME,
  hoshi: HOSHI_THEME,
  wonwoo: WONWOO_THEME,
  woozi: WOOZI_THEME,
  dk: DK_THEME,
  mingyu: MINGYU_THEME,
  the8: THE8_THEME,
  seungkwan: SEUNGKWAN_THEME,
  vernon: VERNON_THEME,
  dino: DINO_THEME,
}

export const isBirthday = (m: Member, on = new Date()) => {
  const [, mm, dd] = m.birthday.split('-').map(Number)
  return on.getMonth() + 1 === mm && on.getDate() === dd
}

/**
 * Whose birthday it is today, if anyone's. Two members can share a day (DK and Vernon,
 * 18 February): the day is split between them, the first in the morning, the other after noon.
 * ?birthday=<slug> in the address previews a member's day (kept for the visit).
 */
export function birthdayStar(members: Member[], now = new Date()): Member | null {
  const preview = readPreview()
  if (preview) return members.find((m) => m.slug === preview) ?? null
  const today = members.filter((m) => isBirthday(m, now) && MEMBER_THEMES[m.slug]).sort((a, b) => a.order - b.order)
  if (!today.length) return null
  return today[Math.min(today.length - 1, Math.floor((now.getHours() * today.length) / 24))]
}

const PREVIEW_KEY = 'svt-birthday-preview'

// Read once, as the site opens: redirects (like / → /me) drop the query string.
try {
  const fromUrl = new URLSearchParams(window.location.search).get('birthday')
  if (fromUrl) sessionStorage.setItem(PREVIEW_KEY, fromUrl)
  else if (fromUrl !== null) sessionStorage.removeItem(PREVIEW_KEY)
} catch {
  /* storage blocked: no previews */
}

function readPreview(): string | null {
  try {
    return sessionStorage.getItem(PREVIEW_KEY)
  } catch {
    return null
  }
}

const DISMISS_KEY = 'svt-birthday-dismissed'

/** Viewers can go back to their usual theme for the rest of the day. */
export function birthdayDismissed(slug: string, now = new Date()) {
  try {
    return localStorage.getItem(DISMISS_KEY) === `${slug}:${now.toDateString()}`
  } catch {
    return false
  }
}

export function dismissBirthday(slug: string | null, now = new Date()) {
  try {
    if (slug) localStorage.setItem(DISMISS_KEY, `${slug}:${now.toDateString()}`)
    else localStorage.removeItem(DISMISS_KEY)
  } catch {
    /* storage blocked: lasts for this visit only */
  }
}
