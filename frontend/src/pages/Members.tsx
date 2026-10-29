import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MemberAvatar } from '../components/MemberAvatar'
import { ApiError, Loading } from '../components/Status'
import { useMembers } from '../lib/api'
import { formatDayMonth, nextAnniversary } from '../lib/dates'
import type { Member, Unit } from '../lib/types'

const UNITS: { key: Unit; name: string; blurb: string }[] = [
  { key: 'hiphop', name: 'Hip-hop Unit', blurb: 'The rap line: flow, swagger and attitude.' },
  { key: 'vocal', name: 'Vocal Unit', blurb: 'The voices behind every ballad and high note.' },
  { key: 'performance', name: 'Performance Unit', blurb: 'The dancers who make the choreography unforgettable.' },
]

/** A member's card: the whole card opens their page. */
function MemberCard({ m }: { m: Member }) {
  const bday = nextAnniversary(m.birthday)
  return (
    <Link to={`/members/${m.slug}`} className="mcard card" style={{ ['--m' as string]: m.color }}>
      <span className="mcard__photo">
        {m.photo ? <img src={m.photo} alt="" loading="lazy" /> : <MemberAvatar member={m} size="md" />}
      </span>
      <span className="mcard__body">
        <b className="mcard__name">
          {m.stage_name} <span aria-hidden>{m.symbol}</span>
        </b>
        <small>{m.position}</small>
        <small className="mcard__meta">
          🎂 {formatDayMonth(bday.date)}
          {bday.days <= 30 && ` · in ${bday.days === 0 ? 'today!' : `${bday.days} days`}`}
        </small>
      </span>
      {m.is_unit_leader && <span className="chip chip--small mcard__leader">Unit leader</span>}
      <span className="mcard__go" aria-hidden>Profile →</span>
    </Link>
  )
}

export function Members() {
  const { data, error, loading } = useMembers()
  const [filter, setFilter] = useState<Unit | 'all'>('all')
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const matches = (m: Member) => !q || [m.stage_name, m.birth_name, m.position, m.birthplace].some((t) => t.toLowerCase().includes(q))

  return (
    <div>
      <header className="page-head">
        <p className="eyebrow">13 members · 3 units</p>
        <h1>The members</h1>
        <p className="muted">Open a member to see their full profile, songs and unit-mates.</p>
        <div className="tabs" role="tablist">
          {(['all', 'hiphop', 'vocal', 'performance'] as const).map((k) => (
            <button key={k} role="tab" aria-selected={filter === k} className={filter === k ? 'is-active' : ''} onClick={() => setFilter(k)}>
              {k === 'all' ? 'All' : UNITS.find((u) => u.key === k)!.name.replace(' Unit', '')}
            </button>
          ))}
        </div>
        <input className="members__search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, position or hometown…" aria-label="Search members" />
      </header>

      {loading && <Loading />}
      {error && <ApiError message={error} />}

      {data && q && !data.some(matches) && <p className="muted">Nobody matches “{query}”.</p>}
      {data &&
        UNITS.filter((u) => (filter === 'all' || filter === u.key) && data.some((m) => m.unit === u.key && matches(m))).map((u) => (
          <section key={u.key} className="unit">
            <div className="unit__head">
              <h2>{u.name}</h2>
              <p className="muted">{u.blurb}</p>
            </div>
            <div className="member-grid">
              {data
                .filter((m) => m.unit === u.key && matches(m))
                .map((m) => (
                  <MemberCard key={m.slug} m={m} />
                ))}
            </div>
          </section>
        ))}
    </div>
  )
}
