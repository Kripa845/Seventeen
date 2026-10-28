import type { Member, Song, Unit } from './types'

const UNIT_WORDS: [RegExp, Unit][] = [
  [/\bvocal (team|unit)\b/i, 'vocal'],
  [/\bhip-?hop (team|unit)\b/i, 'hiphop'],
  [/\bperformance (team|unit)\b/i, 'performance'],
]

export interface Credit {
  label: string // the song's note ("Vocal Team", "Hoshi & Woozi"…), or "SEVENTEEN"
  members: Member[] // empty for the full group
  unit: Unit | null
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Who sings a song, read from its note ("Vocal Team", "Hoshi & Woozi", "SVT Leaders", "DK solo"…).
 *  A song with no names in its note is the full group. */
export function creditFor(song: Song, members: Member[]): Credit {
  const note = song.note
  const found = new Map<string, Member>()
  let unit: Unit | null = null
  for (const [re, u] of UNIT_WORDS) {
    if (re.test(note)) {
      unit = u
      for (const m of members) if (m.unit === u) found.set(m.slug, m)
    }
  }
  if (/\bleaders\b/i.test(note)) for (const m of members) if (m.is_unit_leader) found.set(m.slug, m)
  for (const m of members) if (new RegExp(`\\b${escape(m.stage_name)}\\b`, 'i').test(note)) found.set(m.slug, m)

  const list = [...found.values()].sort((a, b) => a.order - b.order)
  if (!list.length) return { label: 'SEVENTEEN', members: [], unit: null }
  return { label: note, members: list, unit }
}

/** Songs a member sings outside the full group: their unit's songs, solos, duets and leader tracks. */
export function songsFor(member: Member, songs: Song[], members: Member[]) {
  return songs.filter((s) => s.note && creditFor(s, members).members.some((m) => m.slug === member.slug))
}
