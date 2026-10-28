import { Link, useParams } from 'react-router-dom'
import { MemberAvatar } from '../components/MemberAvatar'
import { ApiError, Loading } from '../components/Status'
import { useMember, useMembers, useSongs } from '../lib/api'
import { memberTheme } from '../lib/color'
import { creditFor, songsFor } from '../lib/credits'
import { ageOn, DEBUT, daysSince, daysUntil, formatDate, formatDayMonth, nextAnniversary } from '../lib/dates'
import { usePageTheme } from '../lib/theme'
import { useOpenPlayer } from '../lib/useOpenPlayer'
import type { Member } from '../lib/types'

/** Enlistment and the countdown to discharge; nothing at all while it's not announced. */
function MilitaryService({ m }: { m: Member }) {
  const kind = [m.service_label, m.service_note].filter(Boolean).join(' · ')

  if (!m.enlistment_date) {
    if (m.service !== 'exempt' && m.service !== 'not_required') return null
    return (
      <section className="card service">
        <h3>Military service</h3>
        <p className="muted">{kind}</p>
      </section>
    )
  }

  const toStart = daysUntil(m.enlistment_date)
  const toEnd = m.discharge_date ? daysUntil(m.discharge_date) : null
  const total = m.discharge_date ? daysUntil(m.discharge_date) - toStart : null
  const served = total && toEnd !== null ? Math.min(1, Math.max(0, (total - toEnd) / total)) : 0

  let num: string
  let label: string
  if (toStart > 0) {
    num = String(toStart)
    label = `day${toStart === 1 ? '' : 's'} until enlistment`
  } else if (toEnd === null) {
    num = '🫡'
    label = 'Serving now · discharge date not announced'
  } else if (toEnd > 0) {
    num = String(toEnd)
    label = `day${toEnd === 1 ? '' : 's'} until discharge`
  } else {
    num = '💎'
    label = toEnd === 0 ? 'Discharged today. Welcome back!' : 'Discharged. Welcome back!'
  }

  return (
    <section className="card service">
      <div className="service__count">
        <span className="stat__num">{num}</span>
        <span className="stat__label">{label}</span>
      </div>
      <div className="service__info">
        <h3>Military service</h3>
        <dl className="facts">
          <dt>Service</dt>
          <dd>{kind}</dd>
          <dt>Enlisted</dt>
          <dd>{toStart > 0 ? `${formatDate(m.enlistment_date)} (upcoming)` : formatDate(m.enlistment_date)}</dd>
          {m.discharge_date && (
            <>
              <dt>{toEnd !== null && toEnd <= 0 ? 'Discharged' : 'Discharge'}</dt>
              <dd>
                {formatDate(m.discharge_date)}
                {toEnd !== null && toEnd > 0 && ' (expected)'}
              </dd>
            </>
          )}
        </dl>
        {toStart <= 0 && toEnd !== null && toEnd > 0 && (
          <div className="service__bar" role="progressbar" aria-valuenow={Math.round(served * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Service completed">
            <span style={{ width: `${served * 100}%` }} />
            <small>{Math.round(served * 100)}% served</small>
          </div>
        )}
      </div>
    </section>
  )
}

/** /members/:slug : one member's own page, in their colour. */
export function MemberDetail() {
  const { slug = '' } = useParams()
  const { data: m, error, loading } = useMember(slug)
  const all = useMembers()
  const songs = useSongs()
  const play = useOpenPlayer()
  usePageTheme(m ? memberTheme(m.color) : null)

  if (loading) return <Loading />
  if (error || !m) return <ApiError message={error ?? 'Not found'} />

  const bday = nextAnniversary(m.birthday)
  const list = all.data ?? []
  const i = list.findIndex((x) => x.slug === m.slug)
  const prev = list.length ? list[(i - 1 + list.length) % list.length] : null
  const next = list.length ? list[(i + 1) % list.length] : null
  const mates = list.filter((x) => x.unit === m.unit && x.slug !== m.slug)
  const theirs = songsFor(m, songs.data ?? [], list)
  const positions = m.position.split(/,\s*|\s*&\s*/).filter(Boolean)

  return (
    <article className="profile" style={{ ['--m' as string]: m.color }}>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/members">Members</Link>
        <span aria-hidden>/</span>
        <span>{m.unit_label}</span>
        <span aria-hidden>/</span>
        <span aria-current="page">{m.stage_name}</span>
      </nav>

      <header className="profile__hero card">
        <div className="profile__photo">
          {m.photo ? <img src={m.photo} alt={m.stage_name} /> : <MemberAvatar member={m} size="lg" />}
        </div>
        <div className="profile__head">
          <p className="eyebrow">
            {m.unit_label}
            {m.is_unit_leader && ' · Unit leader'}
          </p>
          <h1 className="profile__name">
            {m.stage_name} <span aria-hidden>{m.symbol}</span>
          </h1>
          <p className="profile__birthname">{m.birth_name}</p>
          <p className="profile__tagline">“{m.tagline}”</p>
          <div className="song__chips">
            {positions.map((p) => (
              <span key={p} className="chip">{p}</span>
            ))}
          </div>
          {theirs.length > 0 && (
            <div className="hero__ctas profile__ctas">
              <button className="btn" onClick={() => play(theirs[0], theirs)}>▶ Play {m.stage_name}'s songs</button>
            </div>
          )}
        </div>
      </header>

      <section className="profile__stats">
        <div className="card stat">
          <span className="stat__num">{ageOn(m.birthday)}</span>
          <span className="stat__label">years old</span>
        </div>
        <div className="card stat">
          <span className="stat__num">{bday.days === 0 ? '🎂' : bday.days}</span>
          <span className="stat__label">{bday.days === 0 ? 'Happy birthday!' : `days to the birthday · ${formatDayMonth(bday.date)}`}</span>
        </div>
        <div className="card stat">
          <span className="stat__num">{daysSince(DEBUT).toLocaleString()}</span>
          <span className="stat__label">days as SEVENTEEN</span>
        </div>
        <div className="card stat">
          <span className="stat__num">{songs.data ? theirs.length : '…'}</span>
          <span className="stat__label">unit, solo and duet songs</span>
        </div>
      </section>

      <div className="profile__grid">
        <section className="card">
          <h3>Profile</h3>
          <dl className="facts">
            <dt>Stage name</dt>
            <dd>{m.stage_name}</dd>
            <dt>Birth name</dt>
            <dd>{m.birth_name}</dd>
            <dt>Birthday</dt>
            <dd>{formatDate(m.birthday)}</dd>
            <dt>Hometown</dt>
            <dd>{m.birthplace}</dd>
            <dt>Unit</dt>
            <dd>{m.unit_label}{m.is_unit_leader && ' (leader)'}</dd>
            <dt>Position</dt>
            <dd>{m.position}</dd>
            <dt>Colour</dt>
            <dd><span className="profile__swatch" style={{ background: m.color }} aria-hidden /> <code>{m.color}</code></dd>
          </dl>
        </section>

        <section className="card">
          <h3>{m.unit_label}</h3>
          <p className="muted small">{m.is_unit_leader ? `${m.stage_name} leads the unit with:` : 'Unit-mates:'}</p>
          <ul className="mini-members">
            {mates.map((x) => (
              <li key={x.slug}>
                <Link to={`/members/${x.slug}`} style={{ ['--m' as string]: x.color }}>
                  <MemberAvatar member={x} size="sm" />
                  <span>
                    {x.stage_name}
                    {x.is_unit_leader && <small> · leader</small>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="card profile__facts">
          <h3>Fun facts</h3>
          <ul>
            {m.fun_facts.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </section>

        <MilitaryService m={m} />

      </div>

      {theirs.length > 0 && (
        <section className="card">
          <div className="section-head section-head--tight">
            <h3>{m.stage_name}'s unit, solo and duet songs</h3>
            <span className="muted small">{theirs.length} songs</span>
          </div>
          <ol className="song-list">
            {theirs.map((s) => (
              <li key={s.id}>
                <Link to={`/songs/${s.id}`}>
                  {s.album_cover ? <img src={s.album_cover} alt="" /> : <span className="song-list__art" aria-hidden>♪</span>}
                  <span>
                    <b>{s.title}</b>
                    <small>{s.album_title} · {creditFor(s, list).label}</small>
                  </span>
                  <span className="song-list__go" aria-hidden>›</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      <nav className="member-strip" aria-label="All members">
        {list.map((x) => (
          <Link key={x.slug} to={`/members/${x.slug}`} className={x.slug === m.slug ? 'is-on' : ''} title={x.stage_name} aria-current={x.slug === m.slug ? 'page' : undefined}>
            <MemberAvatar member={x} size="sm" />
            <span>{x.stage_name}</span>
          </Link>
        ))}
      </nav>

      {prev && next && (
        <nav className="pager">
          <Link to={`/members/${prev.slug}`} className="pager__link">
            <small>← Previous</small>
            <b>{prev.stage_name}</b>
          </Link>
          <Link to={`/members/${next.slug}`} className="pager__link pager__link--next">
            <small>Next →</small>
            <b>{next.stage_name}</b>
          </Link>
        </nav>
      )}
    </article>
  )
}
