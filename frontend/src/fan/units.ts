import { creditFor } from '../lib/credits'
import type { Member, Song, Unit } from '../lib/types'

export interface SvtUnit {
  slug: string
  name: string
  native?: string
  kind: 'team' | 'sub-unit'
  /** the three teams list their members by Member.unit; sub-units name them */
  team?: Unit
  members?: string[]
  since: string
  blurb: string
  /** releases the site doesn't keep as albums */
  releases?: string[]
}

export const UNITS: SvtUnit[] = [
  {
    slug: 'hiphop',
    name: 'Hip-hop Team',
    kind: 'team',
    team: 'hiphop',
    since: '2015',
    blurb: 'Raps, swagger and the loudest stage presence: the leader S.Coups with Wonwoo, Mingyu and Vernon.',
  },
  {
    slug: 'vocal',
    name: 'Vocal Team',
    kind: 'team',
    team: 'vocal',
    since: '2015',
    blurb: 'The voices: Woozi, the producer, with Jeonghan, Joshua, DK and Seungkwan. Ballads, harmonies and the high notes.',
  },
  {
    slug: 'performance',
    name: 'Performance Team',
    kind: 'team',
    team: 'performance',
    since: '2015',
    blurb: 'The dancers behind every formation: Hoshi, the choreographer, with Jun, The8 and Dino.',
  },
  {
    slug: 'leaders',
    name: 'SVT Leaders',
    kind: 'sub-unit',
    members: ['scoups', 'hoshi', 'woozi'],
    since: '2017',
    blurb: 'The three team leaders together, first on “Change Up”.',
  },
  {
    slug: 'bss',
    name: 'BSS',
    native: '부석순 · BooSeokSoon',
    kind: 'sub-unit',
    members: ['seungkwan', 'hoshi', 'dk'],
    since: '2018',
    blurb: 'Seungkwan, Hoshi and DK: the comedy unit, all energy and bright songs.',
    releases: ['Just Do It (2018)', 'Second Wind (2023)', 'Teleparty (2025)'],
  },
  {
    slug: 'jxw',
    name: 'Jeonghan × Wonwoo',
    kind: 'sub-unit',
    members: ['jeonghan', 'wonwoo'],
    since: '2024',
    blurb: 'Jeonghan and Wonwoo, cool and calm, released just before Jeonghan’s enlistment.',
    releases: ['This Man (2024)'],
  },
  {
    slug: 'hxw',
    name: 'Hoshi × Woozi',
    kind: 'sub-unit',
    members: ['hoshi', 'woozi'],
    since: '2025',
    blurb: 'The 96-line performance leader and producer, together as a duo.',
  },
  {
    slug: 'cxm',
    name: 'S.Coups × Mingyu',
    kind: 'sub-unit',
    members: ['scoups', 'mingyu'],
    since: '2025',
    blurb: 'The leader and Mingyu: the hip-hop line’s tallest pair.',
  },
]

export function unitMembers(unit: SvtUnit, members: Member[]) {
  const list = unit.team ? members.filter((m) => m.unit === unit.team) : members.filter((m) => unit.members?.includes(m.slug))
  return list.sort((a, b) => a.order - b.order)
}

/** The unit's own songs: the team's songs, or songs credited to exactly the sub-unit's members. */
export function unitSongs(unit: SvtUnit, songs: Song[], members: Member[]) {
  const want = new Set(unitMembers(unit, members).map((m) => m.slug))
  return songs.filter((s) => {
    if (!s.note) return false
    const credit = creditFor(s, members)
    if (unit.team) return credit.unit === unit.team
    if (unit.slug === 'leaders') return /\bleaders\b/i.test(s.note)
    return credit.members.length === want.size && credit.members.every((m) => want.has(m.slug))
  })
}

/** A soft gradient of the members' colours, for the unit's cards. */
export function unitGradient(list: Member[]) {
  if (!list.length) return 'var(--accent)'
  if (list.length === 1) return list[0].color
  return `linear-gradient(120deg, ${list.map((m, i) => `${m.color} ${Math.round((i / (list.length - 1)) * 100)}%`).join(', ')})`
}
