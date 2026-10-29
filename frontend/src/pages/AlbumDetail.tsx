import { Link, useParams } from 'react-router-dom'
import { ApiError, Loading } from '../components/Status'
import { TrackList } from '../components/TrackList'
import { useAlbum, useAlbums } from '../lib/api'
import { formatDate } from '../lib/dates'
import { albumAsSong } from '../lib/player'
import { useOpenPlayer } from '../lib/useOpenPlayer'
import { useTheme } from '../lib/theme'
import type { Album } from '../lib/types'

/** A small cover card linking to another album. */
export function AlbumChip({ a }: { a: Album }) {
  return (
    <Link to={`/discography/${a.slug}`} className="album-chip" style={{ ['--a' as string]: a.theme.accent, ['--a2' as string]: a.theme.accent2 }}>
      {a.cover ? <img src={a.cover} alt="" /> : <span className="album-chip__orb" aria-hidden />}
      <span>
        <b>{a.title}</b>
        <small>{a.kind_label} · {formatDate(a.release_date)}</small>
      </span>
    </Link>
  )
}

/** /discography/:slug : one album's own page, in its era's colours. */
export function AlbumDetail() {
  const { slug = '' } = useParams()
  const { data: a, error, loading } = useAlbum(slug)
  const all = useAlbums()
  const { pinned, pin } = useTheme()
  const play = useOpenPlayer()

  if (loading) return <Loading />
  if (error || !a) return <ApiError message={error ?? 'Not found'} />

  const songs = a.songs ?? []
  const lead = songs.find((s) => s.is_title_track)
  const wearing = pinned?.label === a.title
  const list = all.data ?? []
  const i = list.findIndex((x) => x.slug === a.slug)
  const prev = i > 0 ? list[i - 1] : null
  const next = i >= 0 && i < list.length - 1 ? list[i + 1] : null
  const titles = songs.filter((s) => s.is_title_track)
  const discs = new Set(songs.map((s) => s.disc)).size
  const year = a.release_date.slice(0, 4)
  const sameYear = list.filter((x) => x.slug !== a.slug && x.release_date.startsWith(year))

  return (
    <article className="album">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/discography">Eras</Link>
        <span aria-hidden>/</span>
        <span>{year}</span>
        <span aria-hidden>/</span>
        <span aria-current="page">{a.title}</span>
      </nav>

      <header className="album__hero" style={{ ['--a' as string]: a.theme.accent, ['--a2' as string]: a.theme.accent2 }}>
        <div className="album__art">
          {a.cover ? <img src={a.cover} alt={`${a.title} cover`} /> : <div className="album__orb" aria-hidden />}
        </div>
        <div>
          <p className="eyebrow">
            {a.kind_label} · {formatDate(a.release_date)}
          </p>
          <h1 className="album__title">{a.title}</h1>
          <p className="album__mood">{a.era_mood}</p>
          <ul className="album__facts">
            <li><b>{formatDate(a.release_date)}</b><span>released</span></li>
            <li><b>{a.kind_label}</b><span>{a.language === 'ja' ? 'Japanese release' : 'Korean release'}</span></li>
            <li><b>{songs.length}</b><span>{discs > 1 ? `tracks on ${discs} discs` : 'tracks'}</span></li>
          </ul>
          {titles.length > 0 && (
            <p className="album__titles">
              <span className="muted small">Title track{titles.length > 1 ? 's' : ''}:</span>
              {titles.map((t) => (
                <Link key={t.id} className="chip" to={`/songs/${t.id}`}>★ {t.title}</Link>
              ))}
            </p>
          )}
          <div className="hero__ctas">
            {songs[0] && (
              <button className="btn" onClick={() => play(lead ?? songs[0], songs)}>
                {lead ? `▶ Play “${lead.title}”` : '▶ Play album'}
              </button>
            )}
            {a.spotify_url && (
              <button className="btn btn--ghost" onClick={() => play(albumAsSong(a))}>
                ♫ Full album on Spotify
              </button>
            )}
            <button
              className="btn btn--ghost"
              onClick={() => pin(wearing ? null : { label: a.title, tokens: a.theme })}
            >
              {wearing ? 'Stop wearing this era' : '✦ Wear this era site-wide'}
            </button>
          </div>
        </div>
      </header>

      <section className="card">
        <h3>Tracks · {songs.length}</h3>
        <TrackList songs={songs} />
        <p className="muted small">Tap a song to play it, or › to open its own page.</p>
      </section>

      <section className="palette card">
        <h3>Era palette</h3>
        <div className="palette__row">
          {(['bg', 'surface', 'text', 'accent', 'accent2'] as const).map((k) => (
            <div key={k} className="palette__swatch">
              <span style={{ background: a.theme[k] }} />
              <code>{a.theme[k]}</code>
            </div>
          ))}
        </div>
      </section>

      {sameYear.length > 0 && (
        <section>
          <div className="section-head"><h2>Also from {year}</h2></div>
          <div className="album-row">
            {sameYear.map((x) => (
              <AlbumChip key={x.slug} a={x} />
            ))}
          </div>
        </section>
      )}

      <nav className="pager">
        {prev ? (
          <Link to={`/discography/${prev.slug}`} className="pager__link">
            <small>← Earlier era</small>
            <b>{prev.title}</b>
          </Link>
        ) : <span />}
        {next ? (
          <Link to={`/discography/${next.slug}`} className="pager__link pager__link--next">
            <small>Later era →</small>
            <b>{next.title}</b>
          </Link>
        ) : <span />}
      </nav>
    </article>
  )
}
