import { Link, useLocation } from 'react-router-dom'
import { usePlayer, usePlayerProgress } from '../lib/player'
import { IconNext, IconPause, IconPlay, IconPrev } from './PlayerIcons'

function Bar() {
  const { time, duration } = usePlayerProgress()
  return <span className="player__bar" style={{ width: duration ? `${(time / duration) * 100}%` : 0 }} aria-hidden />
}

/**
 * Lives in the layout, so music keeps playing while you move between pages.
 * Audio only; tap it to open the full Now Playing page.
 */
export function MiniPlayer() {
  const { current, queue, videoId, playing, toggle, next, prev, close } = usePlayer()
  const { pathname } = useLocation()
  if (!current || pathname === '/now-playing') return null

  return (
    <aside className="player" aria-label="Music player">
      <Link to="/now-playing" className="player__info" aria-label="Open player">
        <span className={`player__disc ${playing ? 'is-spinning' : ''}`} aria-hidden>◆</span>
        <div>
          <p className="player__title">{current.title}</p>
          <p className="player__meta">{videoId ? current.album_title : `${current.album_title} · open player`}</p>
        </div>
      </Link>

      <div className="player__controls">
        {queue.length > 1 && (
          <button onClick={prev} aria-label="Previous"><IconPrev /></button>
        )}
        {videoId && (
          <button className="player__main" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? <IconPause /> : <IconPlay />}
          </button>
        )}
        {queue.length > 1 && (
          <button onClick={next} aria-label="Next"><IconNext /></button>
        )}
        <button onClick={close} aria-label="Close player">✕</button>
      </div>
      <Bar />
    </aside>
  )
}
