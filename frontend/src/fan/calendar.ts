import { DEBUT } from '../lib/dates'
import type { Member, SvtEvent } from '../lib/types'

/** One date on the CARAT calendar: a birthday, the debut anniversary or an event from the Studio. */
export interface CalendarEntry {
  key: string
  date: Date // local midnight
  kind: 'birthday' | 'anniversary' | SvtEvent['kind']
  title: string
  detail: string
  color: string
  emoji: string
  member?: Member
  event?: SvtEvent
}

const DAY = 86_400_000

export const EVENT_EMOJI: Record<SvtEvent['kind'], string> = {
  comeback: '💿',
  concert: '🏟️',
  fanmeeting: '💌',
  broadcast: '📺',
  other: '✨',
}

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

const localDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Everything on the calendar between from and to (both local dates, inclusive). */
export function entriesBetween(members: Member[], events: SvtEvent[], from: Date, to: Date): CalendarEntry[] {
  const out: CalendarEntry[] = []
  for (let year = from.getFullYear(); year <= to.getFullYear(); year++) {
    for (const m of members) {
      const [by, bm, bd] = m.birthday.split('-').map(Number)
      out.push({
        key: `b-${m.slug}-${year}`,
        date: new Date(year, bm - 1, bd),
        kind: 'birthday',
        title: `${m.stage_name}'s birthday`,
        detail: `turns ${year - by} · ${m.unit_label}`,
        color: m.color,
        emoji: '🎂',
        member: m,
      })
    }
    const years = year - DEBUT.getFullYear()
    if (years > 0) {
      out.push({
        key: `anniv-${year}`,
        date: new Date(year, DEBUT.getMonth(), DEBUT.getDate()),
        kind: 'anniversary',
        title: `SEVENTEEN's ${ordinal(years)} anniversary`,
        detail: 'debut day, 26 May 2015 · CARAT day',
        color: '#F7CAC9',
        emoji: '💎',
      })
    }
  }
  for (const e of events) {
    out.push({
      key: `e-${e.id}`,
      date: localDate(e.date),
      kind: e.kind,
      title: e.title,
      detail: e.note || e.kind_label,
      color: e.kind === 'comeback' ? '#92A8D1' : e.kind === 'concert' ? '#C25E73' : '#B79FCB',
      emoji: EVENT_EMOJI[e.kind],
      event: e,
    })
  }
  return out
    .filter((e) => e.date >= from && e.date <= to)
    .sort((a, b) => a.date.getTime() - b.date.getTime() || (a.member?.order ?? 99) - (b.member?.order ?? 99))
}

/** The next n dates from today (today's own count as upcoming). */
export function upcoming(members: Member[], events: SvtEvent[], n = 5, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate())
  return entriesBetween(members, events, today, end).slice(0, n)
}

export const daysFrom = (date: Date, now = new Date()) =>
  Math.round((date.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / DAY)

export const isoOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
