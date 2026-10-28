import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, Loading } from '../components/Status'
import { TrackList } from '../components/TrackList'
import { useAlbums, useSongs } from '../lib/api'
import { albumAsSong } from '../lib/player'
import { useOpenPlayer } from '../lib/useOpenPlayer'
import type { Album, Song } from '../lib/types'

const SECTIONS = [
  { lang: 'ko', id: 'korean', label: 'Korean releases' },
  { lang: 'ja', id: 'japanese', label: 'Japanese releases' },
] as const

function shuffled<T>(list: T[]): T[] {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function AlbumCard({ a, songs }: { a: Album; songs: Song[] }) {
  const play = useOpenPlayer()
  return (
    <section
      className="music-album card"
      style={{ ['--a' as string]: a.theme.accent, ['--a2' as string]: a.theme.accent2 }}
    >
      <Link to={`/discography/${a.slug}`} className="music-album__art" aria-label={`${a.title} era page`}>
        {a.cover ? <img src={a.cover} alt="" /> : <span className="music-album__orb" aria-hidden />}
      </Link>

      <div className="music-album__body">
        <p className="eyebrow">
          {a.kind_label} · {a.release_date.slice(0, 4)} · {songs.length} tracks
        </p>
        <h2 className={`music-album__title font-${a.theme.font}`}>
          <Link to={`/discography/${a.slug}`}>{a.title}</Link>
        </h2>
        <p className="muted small">{a.era_mood}</p>

        <TrackList songs={songs} limit={6} />

        <div className="music-album__actions">
          {songs.length > 1 && (
            <button className="btn btn--small" onClick={() => play(songs[0], songs)}>
              ▶ Play album
            </button>
          )}
          {a.spotify_url && (
            <button className="btn btn--small btn--ghost" onClick={() => play(albumAsSong(a))}>
              ♫ Full album on Spotify
            </button>
          )}
          <Link className="link-arrow small" to={`/discography/${a.slug}`}>
            Step into the era →
          </Link>
        </div>
      </div>
    </section>
  )
}

/** Every album with its full tracklist, all playable in the mini player. */
export function Music() {
  const albums = useAlbums()
  const songs = useSongs()
  const play = useOpenPlayer()
  const [query, setQuery] = useState('')

  const byAlbum = useMemo(() => {
    const map = new Map<string, Song[]>()
    for (const s of songs.data ?? []) map.set(s.album_slug, [...(map.get(s.album_slug) ?? []), s])
    return map
  }, [songs.data])

  // Title tracks in release order: the "greatest hits" queue.
  const titleTracks = useMemo(
    () => (albums.data ?? []).flatMap((a) => (byAlbum.get(a.slug) ?? []).filter((s) => s.is_title_track)),
    [albums.data, byAlbum],
  )

  const error = albums.error ?? songs.error
  if (error) return <ApiError message={error} />
  if (albums.loading || songs.loading) return <Loading />

  const q = query.trim().toLowerCase()
  const found = q
    ? (songs.data ?? []).filter((s) => [s.title, s.native_title, s.album_title, s.note].some((t) => t.toLowerCase().includes(q))).slice(0, 40)
    : []
  const total = songs.data?.length ?? 0
  const playable = songs.data?.filter((s) => s.youtube_url || s.spotify_url).length ?? 0

  return (
    <div>
      <header className="page-head">
        <p className="eyebrow">Press play</p>
        <h1>Music</h1>
        <p className="muted">
          {albums.data?.length} releases, {total} tracks. Music keeps playing in the player below while you explore the
          rest of the site.
        </p>
        {titleTracks.length > 0 && (
          <div className="hero__ctas music__ctas">
            <button className="btn" onClick={() => play(titleTracks[0], titleTracks)}>
              ▶ Play all title tracks
            </button>
            <button
              className="btn btn--ghost"
              onClick={() => {
                const q = shuffled(titleTracks)
                play(q[0], q)
              }}
            >
              ⤮ Shuffle
            </button>
          </div>
        )}
        <input className="music__search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a song, album or unit…" aria-label="Search songs" />
        <nav className="music__jump">
          {SECTIONS.map((s) => (
            <a key={s.id} className="chip" href={`#${s.id}`}>
              {s.label}
            </a>
          ))}
        </nav>
      </header>

      {q && (
        <section className="card music__results" aria-live="polite">
          <h3>{found.length ? `${found.length === 40 ? '40+' : found.length} song${found.length === 1 ? '' : 's'} for “${query.trim()}”` : `No songs match “${query.trim()}”`}</h3>
          <ol className="song-list">
            {found.map((s) => (
              <li key={s.id}>
                <Link to={`/songs/${s.id}`}>
                  {s.album_cover ? <img src={s.album_cover} alt="" /> : <span className="song-list__art" aria-hidden>♪</span>}
                  <span>
                    <b>{s.title}{s.is_title_track && ' ★'}</b>
                    <small>{s.album_title}{s.note && ` · ${s.note}`}</small>
                  </span>
                  <span className="song-list__go" aria-hidden>›</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      {SECTIONS.map((sec) => {
        const list = (albums.data ?? []).filter((a) => a.language === sec.lang).reverse()
        if (!list.length) return null
        return (
          <section key={sec.id} id={sec.id} className="music__section">
            <h2 className="music__heading">{sec.label}</h2>
            <div className="music">
              {list.map((a) => (
                <AlbumCard key={a.slug} a={a} songs={byAlbum.get(a.slug) ?? []} />
              ))}
            </div>
          </section>
        )
      })}

      <p className="muted small music__hint">
        {playable} of {total} tracks play their official MV or audio. Tap › beside any song for its own page.
      </p>
    </div>
  )
}
