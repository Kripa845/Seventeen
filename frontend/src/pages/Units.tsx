import { Link, useParams } from 'react-router-dom'
import { MemberAvatar } from '../components/MemberAvatar'
import { ApiError, Loading } from '../components/Status'
import { TrackList } from '../components/TrackList'
import { unitGradient, unitMembers, unitSongs, UNITS } from '../fan/units'
import type { SvtUnit } from '../fan/units'
import { useAlbums, useMembers, useSongs } from '../lib/api'
import type { Member } from '../lib/types'
import '../fan/fan.css'

function UnitCard({ unit, members, songCount }: { unit: SvtUnit; members: Member[]; songCount: number }) {
  const list = unitMembers(unit, members)
  return (
    <Link to={`/units/${unit.slug}`} className="unit-card card" style={{ ['--g' as string]: unitGradient(list) }}>
      <span className="unit-card__band" aria-hidden />
      <span className="unit-card__faces">
        {list.map((m) => (
          <MemberAvatar key={m.slug} member={m} size="sm" />
        ))}
      </span>
      <span className="eyebrow">{unit.kind === 'team' ? 'Team' : 'Sub-unit'} · since {unit.since}</span>
      <b className="unit-card__name">{unit.name}</b>
      {unit.native && <small className="muted">{unit.native}</small>}
      <small className="muted">{list.map((m) => m.stage_name).join(' · ')}</small>
      <span className="unit-card__meta">
        {songCount ? `${songCount} song${songCount === 1 ? '' : 's'} on the site` : unit.releases?.length ? `${unit.releases.length} release${unit.releases.length === 1 ? '' : 's'}` : 'Unit page'} →
      </span>
    </Link>
  )
}

/** /units : the three teams and the sub-units. */
export function Units() {
  const members = useMembers()
  const songs = useSongs()
  if (members.error) return <ApiError message={members.error} />
  if (!members.data) return <Loading />
  const all = songs.data ?? []
  return (
    <div>
      <header className="page-head">
        <p className="eyebrow">13 members + 3 teams + 1 group = 17</p>
        <h1>Units</h1>
        <p className="muted">SEVENTEEN is three teams in one group, and the members keep finding new ways to pair up.</p>
      </header>
      {(['team', 'sub-unit'] as const).map((kind) => (
        <section key={kind} className="unit-section">
          <h2>{kind === 'team' ? 'The three teams' : 'Sub-units'}</h2>
          <div className="unit-grid">
            {UNITS.filter((u) => u.kind === kind).map((u) => (
              <UnitCard key={u.slug} unit={u} members={members.data!} songCount={unitSongs(u, all, members.data!).length} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

/** /units/:slug : one unit's members, songs and the albums they're on. */
export function UnitDetail() {
  const { slug = '' } = useParams()
  const members = useMembers()
  const songs = useSongs()
  const albums = useAlbums()
  const unit = UNITS.find((u) => u.slug === slug)

  if (!unit) {
    return (
      <div className="page-head">
        <h1>No such unit</h1>
        <Link className="btn" to="/units">All units</Link>
      </div>
    )
  }
  if (members.error) return <ApiError message={members.error} />
  if (!members.data) return <Loading />

  const list = unitMembers(unit, members.data)
  const tracks = unitSongs(unit, songs.data ?? [], members.data)
  const onAlbums = (albums.data ?? []).filter((a) => tracks.some((t) => t.album_slug === a.slug))
  const others = UNITS.filter((u) => u.slug !== unit.slug && unitMembers(u, members.data!).some((m) => list.includes(m)))

  return (
    <article className="unit-page" style={{ ['--g' as string]: unitGradient(list) }}>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/units">Units</Link>
        <span aria-hidden>/</span>
        <span aria-current="page">{unit.name}</span>
      </nav>

      <header className="unit-hero card">
        <span className="unit-hero__band" aria-hidden />
        <p className="eyebrow">{unit.kind === 'team' ? 'Team' : 'Sub-unit'} · since {unit.since}</p>
        <h1>{unit.name}</h1>
        {unit.native && <p className="muted">{unit.native}</p>}
        <p>{unit.blurb}</p>
        <ul className="unit-hero__members">
          {list.map((m) => (
            <li key={m.slug}>
              <Link to={`/members/${m.slug}`} style={{ ['--m' as string]: m.color }}>
                <MemberAvatar member={m} size="lg" />
                <b>{m.stage_name}</b>
                <small className="muted">{m.position.split(',')[0]}</small>
              </Link>
            </li>
          ))}
        </ul>
      </header>

      <div className="unit-cols">
        <section className="card">
          <h3>{unit.kind === 'team' ? 'Team songs' : 'Their songs'}</h3>
          {tracks.length ? (
            <TrackList songs={tracks} />
          ) : (
            <p className="muted small">No songs credited to exactly this line-up on the site yet.</p>
          )}
          {unit.releases && (
            <>
              <h4>Releases</h4>
              <ul className="unit-releases">
                {unit.releases.map((r) => (
                  <li key={r}>💿 {r}</li>
                ))}
              </ul>
            </>
          )}
        </section>
        <aside className="unit-side">
          {onAlbums.length > 0 && (
            <section className="card">
              <h3>On these albums</h3>
              <ul className="unit-albums">
                {onAlbums.map((a) => (
                  <li key={a.slug}>
                    <Link to={`/discography/${a.slug}`} style={{ ['--a' as string]: a.theme.accent }}>
                      {a.cover ? <img src={a.cover} alt="" /> : <span className="unit-albums__orb" aria-hidden />}
                      <span>
                        <b>{a.title}</b>
                        <small className="muted">{a.release_date.slice(0, 4)}</small>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {others.length > 0 && (
            <section className="card">
              <h3>Also with these members</h3>
              <ul className="unit-others">
                {others.map((u) => (
                  <li key={u.slug}>
                    <Link to={`/units/${u.slug}`} className="chip">{u.name}</Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </article>
  )
}
