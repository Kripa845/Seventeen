import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  IconDown,
  IconNext,
  IconPause,
  IconPlay,
  IconPrev,
  IconRepeat,
  IconShuffle,
} from '../components/PlayerIcons'
import { LikeButton } from '../auth/LikeButton'
import { useApi } from '../lib/api'
import { formatTime, spotifyEmbed, usePlayer, usePlayerProgress } from '../lib/player'
import type { Album } from '../lib/types'
import { youtubeThumb } from '../lib/youtube'

interface BatteryManager extends EventTarget {
  level: number
}

/** The device's real battery level, where the browser shares it (Chrome, Edge). */
function useBattery() {
  const [level, setLevel] = useState<number | null>(null)
  useEffect(() => {
    const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryManager> }
    let battery: BatteryManager | null = null
    const update = () => battery && setLevel(Math.round(battery.level * 100))
    nav.getBattery?.().then((b) => {
      battery = b
      update()
      b.addEventListener('levelchange', update)
    }).catch(() => {})
    return () => battery?.removeEventListener('levelchange', update)
  }, [])
  return level
}

/** Bars that look like a Spotify code; they dance while music plays. */
function Waveform({ seed, playing }: { seed: number; playing: boolean }) {
  const bars = useMemo(() => {
    let x = Math.abs(seed) * 7919 + 17
    return Array.from({ length: 23 }, (_, i) => {
      x = (x * 9301 + 49297) % 233280
      const centre = 1 - Math.abs(i - 11) / 12
      return 0.22 + 0.78 * (0.55 * (x / 233280) + 0.45 * centre)
    })
  }, [seed])
  return (
    <div className={`np-wave ${playing ? 'is-playing' : ''}`} aria-hidden>
      {bars.map((h, i) => (
        <span key={i} style={{ ['--h' as string]: h, animationDelay: `${(i % 7) * -0.17}s` }} />
      ))}
    </div>
  )
}

function Progress() {
  const { time, duration } = usePlayerProgress()
  const { seek, videoId } = usePlayer()
  const pct = duration ? (Math.min(time, duration) / duration) * 100 : 0
  return (
    <div className="np-progress">
      <input
        type="range"
        min={0}
        max={duration || 1}
        step={0.1}
        value={Math.min(time, duration || 1)}
        onChange={(e) => seek(Number(e.target.value))}
        disabled={!videoId || !duration}
        aria-label="Seek"
        style={{ ['--p' as string]: `${pct}%` }}
      />
      <div className="np-progress__times">
        <span>{formatTime(time)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  )
}

function Clock() {
  const { time } = usePlayerProgress()
  return <span className="np__clock">{formatTime(time)}</span>
}

/** Full-screen "now playing" view: audio only, styled like a little music player. */
export function NowPlaying() {
  const navigate = useNavigate()
  const p = usePlayer()
  const { current, queue, index, videoId, playing } = p
  const battery = useBattery()
  const album = useApi<Album>(current ? `/albums/${current.album_slug}/` : null).data
  // Index into the artwork candidates below; past the end shows the era orb.
  const [artStep, setArtStep] = useState(0)

  const close = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate('/music')
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return
      if (e.key === ' ') {
        e.preventDefault()
        p.toggle()
      } else if (e.key === 'Escape') close()
      else if (e.key === 'ArrowRight' && e.shiftKey) p.next()
      else if (e.key === 'ArrowLeft' && e.shiftKey) p.prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  useEffect(() => {
    setArtStep(0)
  }, [videoId])

  if (!current) {
    return (
      <div className="np np--empty">
        <div className="np__inner">
          <div className="np__empty">
            <p className="np__script-sm">Nothing playing</p>
            <Link className="np__pill" to="/music">Pick a song →</Link>
          </div>
        </div>
      </div>
    )
  }

  // The uploaded cover first, then YouTube's artwork; each one that fails to load falls through to the next.
  const artCandidates = [
    album?.cover,
    videoId && youtubeThumb(videoId, 'maxres'),
    videoId && youtubeThumb(videoId, 'hq'),
  ].filter((x): x is string => !!x)
  const art = artCandidates[artStep] ?? null
  const letterboxed = !!videoId && art === youtubeThumb(videoId, 'hq')
  const nextArt = () => setArtStep((s) => s + 1)
  const spotify = !videoId ? (spotifyEmbed(current.spotify_url) ?? spotifyEmbed(current.album_spotify_url)) : null
  const upNext = queue.slice(index + 1, index + 5)
  const year = album?.release_date.slice(0, 4)
  const longTitle = current.title.length > 18

  return (
    <div
      className={`np ${playing ? 'is-playing' : ''}`}
      style={album ? { ['--np-label' as string]: album.theme.accent, ['--np-label2' as string]: album.theme.accent2 } : undefined}
    >
      <div className="np__inner">
        <header className="np__status">
          <div className="np__status-left">
            <button className="np__icon-btn" onClick={close} aria-label="Close player">
              <IconDown />
            </button>
            <span className="np__signal" aria-hidden>
              <i /><i /><i /><i />
            </span>
          </div>
          <Clock />
          <div className="np__status-right">
            {battery !== null && (
              <span className="np__battery" aria-label={`Battery ${battery}%`}>
                {battery}%
                <span className="np__battery-icon"><span style={{ width: `${battery}%` }} /></span>
              </span>
            )}
          </div>
        </header>

        <div className="np__stage">
          <section className="np__deck" aria-label="Player">
            <div className="np__artwrap">
              <div className="np__vinyl" aria-hidden>
                <div className="np__disc">
                  <span className="np__label" />
                </div>
              </div>
              {art ? (
                <div className={`np__art ${letterboxed ? 'is-letterboxed' : ''}`}>
                  <img
                    src={art}
                    alt={`${current.album_title} artwork`}
                    onError={nextArt}
                    // YouTube answers a missing maxres thumbnail with a 120×90 placeholder
                    onLoad={(e) => e.currentTarget.naturalWidth <= 120 && nextArt()}
                  />
                </div>
              ) : (
                <div className="np__art np__art--orb" aria-hidden />
              )}
            </div>

            {videoId ? (
              <>
                <Progress />
                <div className="np-ctrl">
                  <button className={p.shuffle ? 'is-on' : ''} onClick={p.toggleShuffle} aria-label="Shuffle" aria-pressed={p.shuffle}>
                    <IconShuffle />
                  </button>
                  <button onClick={p.prev} aria-label="Previous">
                    <IconPrev />
                  </button>
                  <button className="np-ctrl__main" onClick={p.toggle} aria-label={playing ? 'Pause' : 'Play'}>
                    {playing ? <IconPause /> : <IconPlay />}
                  </button>
                  <button onClick={p.next} aria-label="Next">
                    <IconNext />
                  </button>
                  <button
                    className={p.repeat !== 'off' ? 'is-on' : ''}
                    onClick={p.cycleRepeat}
                    aria-label={`Repeat: ${p.repeat}`}
                  >
                    <IconRepeat one={p.repeat === 'one'} />
                  </button>
                </div>
              </>
            ) : spotify ? (
              <iframe
                className="np__spotify"
                src={spotify}
                title={`${current.title} on Spotify`}
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
              />
            ) : (
              <div className="np__nolink">
                <p>This song has no link yet.</p>
                <a
                  className="np__pill"
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`SEVENTEEN ${current.title}`)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Find it on YouTube ↗
                </a>
                <div className="np-ctrl np-ctrl--compact">
                  <button onClick={p.prev} aria-label="Previous"><IconPrev /></button>
                  <button onClick={p.next} aria-label="Next"><IconNext /></button>
                </div>
              </div>
            )}
            {p.error && <p className="np__error">{p.error}</p>}
          </section>

          <section className="np__text">
            <h1 className={`np__title ${longTitle ? 'is-long' : ''}`}>{current.title}</h1>
            <p className="np__album">
              {current.native_title && <span className="np__native">{current.native_title} · </span>}
              <Link to={`/discography/${current.album_slug}`}>{current.album_title}</Link>
              <LikeButton song={current} className="np__like" />
            </p>

            <Waveform seed={current.id} playing={playing} />

            <p className="np__blurb">
              {current.track_number > 0 && (
                <>
                  Track {current.track_number}
                  {current.disc > 1 && ` on disc ${current.disc}`} of {current.album_title}
                  {year && `, ${year}`}.{' '}
                </>
              )}
              {current.note && <>{current.note}. </>}
              {album?.era_mood && <>{album.era_mood}.</>}
            </p>

            {upNext.length > 0 && (
              <div className="np__next">
                <p className="np__next-label">Up next</p>
                <ol>
                  {upNext.map((s, i) => (
                    <li key={s.id}>
                      <button onClick={() => p.jump(index + 1 + i)}>
                        <span>{s.title}</span>
                        <span className="np__next-meta">{s.album_title}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {videoId && (
              <button className="np__link" onClick={() => p.setShowVideo(!p.showVideo)}>
                {p.showVideo ? 'Hide video' : 'Show video'}
              </button>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
