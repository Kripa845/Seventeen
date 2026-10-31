import { Link, useParams } from 'react-router-dom'
import { LikeButton } from '../auth/LikeButton'
import { MemberAvatar } from '../components/MemberAvatar'
import { ApiError, Loading } from '../components/Status'
import { TrackList } from '../components/TrackList'
import { Fanchant } from '../fan/Fanchant'
import { useApi, useMembers, useSong } from '../lib/api'
import { creditFor } from '../lib/credits'
import { formatDate } from '../lib/dates'
import { usePlayer } from '../lib/player'
import type { Album } from '../lib/types'
import { useOpenPlayer } from '../lib/useOpenPlayer'

/** /songs/:id : one song, dressed in its album's era. */
export function SongDetail() {
  const { id = '' } = useParams()
  const { data: s, error, loading } = useSong(id)
  const album = useApi<Album>(s ? `/albums/${s.album_slug}/` : null) // waits for the song
  const members = useMembers().data ?? []
  const { current, playing } = usePlayer()
  const play = useOpenPlayer()
  const a = s && album.data?.slug === s.album_slug ? album.data : null

  if (loading) return <Loading />
  if (error || !s) return <ApiError message={error ?? 'Not found'} />

  const tracks = a?.songs ?? []
  const i = tracks.findIndex((t) => t.id === s.id)
  const prev = i > 0 ? tracks[i - 1] : null
  const next = i >= 0 && i < tracks.length - 1 ? tracks[i + 1] : null
  const discs = new Set(tracks.map((t) => t.disc)).size
  const credit = creditFor(s, members)
  const isCurrent = current?.id === s.id
  const cover = a?.cover ?? s.album_cover

  return (
    <article className="song">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/music">Music</Link>
        <span aria-hidden>/</span>
        <Link to={`/discography/${s.album_slug}`}>{s.album_title}</Link>
        <span aria-hidden>/</span>
        <span aria-current="page">{s.title}</span>
      </nav>

      <header className="song__hero card" style={a ? { ['--a' as string]: a.theme.accent, ['--a2' as string]: a.theme.accent2 } : undefined}>
        <Link to={`/discography/${s.album_slug}`} className="song__art" aria-label={`${s.album_title} album page`}>
          {cover ? <img src={cover} alt="" /> : <span className="song__orb" aria-hidden />}
          {isCurrent && playing && <span className="song__eq" aria-label="Playing now"><i /><i /><i /></span>}
        </Link>
        <div className="song__head">
          <p className="eyebrow">
            {s.is_title_track ? 'Title track' : 'Track'} · {s.album_title}
            {a && ` · ${a.release_date.slice(0, 4)}`}
          </p>
          <h1 className="song__title">{s.title}</h1>
          {s.native_title && <p className="song__native">{s.native_title}</p>}
          <div className="song__chips">
            {s.is_title_track && <span className="chip">★ Title track</span>}
            {s.note && <span className="chip">{s.note}</span>}
            {a && <span className="chip">{a.language === 'ja' ? 'Japanese release' : 'Korean release'}</span>}
          </div>
          <div className="hero__ctas song__ctas">
            {s.youtube_url || s.spotify_url ? (
              <button className="btn" onClick={() => play(s, tracks.length ? tracks : [s])}>
                {isCurrent && playing ? '♫ Playing · open player' : s.youtube_url ? '▶ Watch & listen' : '▶ Listen on Spotify'}
              </button>
            ) : (
              <span className="muted small">No MV or audio link yet.</span>
            )}
            <LikeButton song={s} />
            {s.youtube_url && <a className="btn btn--ghost btn--small" href={s.youtube_url} target="_blank" rel="noreferrer">YouTube ↗</a>}
            {s.spotify_url && <a className="btn btn--ghost btn--small" href={s.spotify_url} target="_blank" rel="noreferrer">Spotify ↗</a>}
          </div>
        </div>
      </header>

      <div className="song__grid">
        <section className="card">
          <h3>About the song</h3>
          <dl className="facts">
            <dt>Album</dt>
            <dd><Link to={`/discography/${s.album_slug}`}>{s.album_title}</Link>{a && ` · ${a.kind_label}`}</dd>
            {a && (
              <>
                <dt>Released</dt>
                <dd>{formatDate(a.release_date)}</dd>
              </>
            )}
            <dt>Track</dt>
            <dd>
              {discs > 1 && `Disc ${s.disc}, `}
              {s.track_number}
              {tracks.length > 0 && ` of ${tracks.filter((t) => t.disc === s.disc).length}`}
            </dd>
            {s.native_title && (
              <>
                <dt>Original title</dt>
                <dd>{s.native_title}</dd>
              </>
            )}
          </dl>
        </section>

        <section className="card song__credit">
          <h3>Who's on it</h3>
          {credit.members.length ? (
            <>
              <p className="muted small">{credit.label}</p>
              <ul className="mini-members">
                {credit.members.map((m) => (
                  <li key={m.slug}>
                    <Link to={`/members/${m.slug}`} style={{ ['--m' as string]: m.color }}>
                      <MemberAvatar member={m} size="sm" />
                      <span>{m.stage_name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <p className="muted small">The whole team{s.note ? ` · ${s.note}` : ''}</p>
              <ul className="mini-members mini-members--tight">
                {members.map((m) => (
                  <li key={m.slug}>
                    <Link to={`/members/${m.slug}`} title={m.stage_name} aria-label={m.stage_name}>
                      <MemberAvatar member={m} size="sm" />
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>

      <Fanchant key={s.id} song={s} members={members} color={a?.theme.accent ?? '#F7CAC9'} color2={a?.theme.accent2 ?? '#92A8D1'} />

      {tracks.length > 0 && (
        <section className="card">
          <div className="section-head section-head--tight">
            <h3>More from {s.album_title}</h3>
            <Link className="link-arrow small" to={`/discography/${s.album_slug}`}>Album page →</Link>
          </div>
          <TrackList songs={tracks} limit={8} />
        </section>
      )}

      {(prev || next) && (
        <nav className="pager">
          {prev ? (
            <Link to={`/songs/${prev.id}`} className="pager__link">
              <small>← Previous track</small>
              <b>{prev.title}</b>
            </Link>
          ) : <span />}
          {next ? (
            <Link to={`/songs/${next.id}`} className="pager__link pager__link--next">
              <small>Next track →</small>
              <b>{next.title}</b>
            </Link>
          ) : <span />}
        </nav>
      )}
    </article>
  )
}
