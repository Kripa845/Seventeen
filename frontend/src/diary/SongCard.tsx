import type { KeyboardEvent, MouseEvent } from 'react'
import { usePlayer } from '../lib/player'
import type { DiaryItem } from '../lib/types'
import { artFor, artistOf, pageSongs, songFor, useDiaryMusic } from './music'
import type { SongItem } from './music'

/**
 * A song stuck on a page. The play button plays it through the site's player
 * (the mini player keeps going while you turn pages), with the page's other songs queued after it.
 */
export function SongCard({ item, items }: { item: SongItem; items: DiaryItem[] }) {
  const music = useDiaryMusic()
  const { current, playing, play, toggle } = usePlayer()
  const song = songFor(item, music)

  if (!song) {
    return <div className={`dsong dsong--${item.style} dsong--missing`}>♫ {music.songs.length ? 'song not found' : 'loading…'}</div>
  }

  const art = artFor(song, music)
  const isCurrent = current?.id === song.id
  const on = isCurrent && playing
  const artist = artistOf(item)

  const start = (e: MouseEvent | KeyboardEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (isCurrent) toggle()
    else play(song, pageSongs(items, music))
  }
  // A span, not a button: thumbnails in the grid are buttons already.
  const playButton = (
    <span
      role="button"
      tabIndex={0}
      data-song-play
      className="dsong__play"
      aria-label={`${on ? 'Pause' : 'Play'} ${song.title}`}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={start}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && start(e)}
    >
      {on ? '❚❚' : '▶'}
    </span>
  )
  const cover = art ? <img src={art} alt="" draggable={false} loading="lazy" /> : <span className="dsong__noart">♫</span>

  if (item.style === 'vinyl')
    return (
      <div className={`dsong dsong--vinyl ${on ? 'is-on' : ''}`}>
        <div className="dsong__sleeve">{cover}</div>
        <div className="dsong__disc">
          <div className="dsong__label">{cover}</div>
        </div>
        {playButton}
        <span className="dsong__name">{song.title}</span>
      </div>
    )

  if (item.style === 'cassette')
    return (
      <div className={`dsong dsong--cassette ${on ? 'is-on' : ''}`}>
        <div className="dsong__tape-label">
          <b>{song.title}</b>
          {artist && <small>{artist}</small>}
        </div>
        <div className="dsong__window">
          <i className="dsong__reel" />
          <span className="dsong__ribbon" />
          <i className="dsong__reel" />
        </div>
        {playButton}
      </div>
    )

  return (
    <div className={`dsong dsong--card ${on ? 'is-on' : ''}`}>
      <div className="dsong__art">{cover}</div>
      <div className="dsong__text">
        <b>{song.title}</b>
        <small>{artist}</small>
        <span className="dsong__bars" aria-hidden>
          <i /> <i /> <i /> <i />
        </span>
      </div>
      {playButton}
    </div>
  )
}
