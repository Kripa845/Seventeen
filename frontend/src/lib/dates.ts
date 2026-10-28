export const DEBUT = new Date(2015, 4, 26) // 26 May 2015

const DAY = 86_400_000

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** Next occurrence of a yearly date (from an ISO birthday), and days until it. */
export function nextAnniversary(iso: string, from = new Date()) {
  const [, m, d] = iso.split('-').map(Number)
  const today = startOfDay(from)
  let next = new Date(today.getFullYear(), m - 1, d)
  if (next < today) next = new Date(today.getFullYear() + 1, m - 1, d)
  return { date: next, days: Math.round((next.getTime() - today.getTime()) / DAY) }
}

export function daysSince(date: Date, from = new Date()) {
  return Math.floor((startOfDay(from).getTime() - startOfDay(date).getTime()) / DAY)
}

/** Whole days from today to an ISO date (negative once it has passed). */
export function daysUntil(iso: string, from = new Date()) {
  const [y, m, d] = iso.split('-').map(Number)
  return Math.round((new Date(y, m - 1, d).getTime() - startOfDay(from).getTime()) / DAY)
}

export function ageOn(iso: string, on = new Date()) {
  const [y, m, d] = iso.split('-').map(Number)
  let age = on.getFullYear() - y
  if (on.getMonth() + 1 < m || (on.getMonth() + 1 === m && on.getDate() < d)) age--
  return age
}

export function formatDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function formatDayMonth(date: Date) {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
}

/** Same pick for everyone all day; changes at midnight. */
export function dailyIndex(length: number, from = new Date()) {
  const key = from.getFullYear() * 1000 + Math.floor((startOfDay(from).getTime() - new Date(from.getFullYear(), 0, 1).getTime()) / DAY)
  return key % length
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
