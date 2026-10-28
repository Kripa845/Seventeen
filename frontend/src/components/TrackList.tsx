import { Fragment, useState } from 'react'
import { Link } from 'react-router-dom'
import { LikeButton } from '../auth/LikeButton'
import { usePlayer } from '../lib/player'
import { useOpenPlayer } from '../lib/useOpenPlayer'
import type { Song } from '../lib/types'

/** An album's tracks with disc headings; long lists start folded to `limit` rows.
 *  A row plays the song; the arrow beside it opens the song's own page. */
export function TrackList({ songs, limit }: { songs: Song[]; limit?: number }) {
  const { current, playing } = usePlayer()
  const play = useOpenPlayer()
  const [open, setOpen] = useState(false)
  const folded = !open && limit !== undefined && songs.length > limit + 2
  const shown = folded ? songs.slice(0, limit) : songs
  const discs = new Set(songs.map((s) => s.disc)).size > 1

  return (
    <>
      <ol className="tracks">
        {shown.map((s, i) => (
          <Fragment key={s.id}>
            {discs && s.disc !== shown[i - 1]?.disc && <li className="tracks__disc">Disc {s.disc}</li>}
            <li className={`tracks__row ${current?.id === s.id ? 'is-playing' : ''}`}>
              <button onClick={() => play(s, songs)}>
                <span className="tracks__num">{s.track_number}</span>
                <span className="tracks__name">
                  <span className="tracks__line">
                    <span className="tracks__title">{s.title}</span>
                    {s.native_title && <span className="tracks__native">{s.native_title}</span>}
                    {s.is_title_track && <span className="chip chip--small">Title</span>}
                    {s.youtube_url ? null : s.spotify_url ? <span className="chip chip--small">Spotify</span> : (
                      <span className="tracks__nolink" title="No link yet: add one in admin">no link</span>
                    )}
                  </span>
                  {s.note && <span className="tracks__note">{s.note}</span>}
                </span>
                <span className="tracks__play" aria-hidden>{current?.id === s.id && playing ? '♫' : '▶'}</span>
              </button>
              <LikeButton song={s} />
              <Link className="tracks__open" to={`/songs/${s.id}`} aria-label={`${s.title}: song page`} title="Song page">›</Link>
            </li>
          </Fragment>
        ))}
      </ol>
      {limit !== undefined && songs.length > limit + 2 && (
        <button className="tracks__more link-arrow" onClick={() => setOpen((o) => !o)}>
          {open ? 'Show fewer' : `Show all ${songs.length} tracks`}
        </button>
      )}
    </>
  )
}
