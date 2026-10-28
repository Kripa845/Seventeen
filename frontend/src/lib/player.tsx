import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Album, Song } from './types'
import { loadYouTube, YT_ENDED, YT_PAUSED, YT_PLAYING } from './youtube'
import type { YTPlayer } from './youtube'

// SEVENTEEN's artist page on Spotify, used when a song has no link yet.
export const SPOTIFY_ARTIST_ID = '7nqOGRxlXj7N2JYbgNEjYH'

export type Repeat = 'off' | 'all' | 'one'

interface PlayerCtx {
  current: Song | null
  queue: Song[]
  index: number
  /** YouTube id of the current song, if it has one (those play as audio here). */
  videoId: string | null
  playing: boolean
  error: string | null
  shuffle: boolean
  repeat: Repeat
  showVideo: boolean
  play: (song: Song, queue?: Song[]) => void
  jump: (index: number) => void
  toggle: () => void
  next: () => void
  prev: () => void
  seek: (seconds: number) => void
  close: () => void
  toggleShuffle: () => void
  cycleRepeat: () => void
  setShowVideo: (show: boolean) => void
}

interface Progress {
  time: number
  duration: number
}

const Ctx = createContext<PlayerCtx | null>(null)
const ProgressCtx = createContext<Progress>({ time: 0, duration: 0 })

/**
 * One hidden YouTube player for the whole site, so music keeps going while you
 * move between pages. Time updates live in their own context so only the
 * progress bar re-renders while a song plays.
 */
export function PlayerProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<Song[]>([])
  const [index, setIndex] = useState(-1)
  const [nonce, setNonce] = useState(0) // bumps so playing the same song again restarts it
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shuffle, setShuffle] = useState(false)
  const [repeat, setRepeat] = useState<Repeat>('off')
  const [showVideo, setShowVideo] = useState(false)
  const [progress, setProgress] = useState<Progress>({ time: 0, duration: 0 })
  const [ready, setReady] = useState(false)
  const hostRef = useRef<HTMLDivElement>(null)
  const yt = useRef<YTPlayer | null>(null)
  const timeRef = useRef(0)
  const onEnded = useRef<() => void>(() => {})

  const current = index >= 0 ? (queue[index] ?? null) : null
  const videoId = current ? youtubeId(current.youtube_url) : null

  const step = useCallback(
    (dir: 1 | -1) => {
      setIndex((i) => {
        const n = queue.length
        if (!n) return -1
        if (shuffle && n > 1) {
          let j = i
          while (j === i) j = Math.floor(Math.random() * n)
          return j
        }
        return (i + dir + n) % n
      })
      setNonce((x) => x + 1)
    },
    [queue.length, shuffle],
  )

  useEffect(() => {
    onEnded.current = () => {
      if (repeat === 'one') {
        yt.current?.seekTo(0, true)
        yt.current?.playVideo()
      } else if (!shuffle && repeat === 'off' && index >= queue.length - 1) {
        setPlaying(false)
      } else {
        step(1)
      }
    }
  })

  // Create the player once.
  useEffect(() => {
    let cancelled = false
    const host = hostRef.current!
    loadYouTube().then((YT) => {
      if (cancelled) return
      const el = document.createElement('div')
      host.appendChild(el)
      yt.current = new YT.Player(el, {
        width: '100%',
        height: '100%',
        playerVars: { autoplay: 1, controls: 0, disablekb: 1, rel: 0, playsinline: 1, iv_load_policy: 3 },
        events: {
          onReady: () => setReady(true),
          onStateChange: (e) => {
            if (e.data === YT_PLAYING) {
              setPlaying(true)
              setError(null)
            } else if (e.data === YT_PAUSED) {
              setPlaying(false)
            } else if (e.data === YT_ENDED) {
              setPlaying(false)
              onEnded.current()
            }
          },
          onError: (e) => {
            setPlaying(false)
            setError(
              e.data === 101 || e.data === 150
                ? 'The owner of this video doesn’t allow it to play on other sites.'
                : 'This song can’t be played right now.',
            )
          },
        },
      })
    })
    return () => {
      cancelled = true
      yt.current?.destroy()
      yt.current = null
      host.innerHTML = ''
      setReady(false)
    }
  }, [])

  // Load whatever is current.
  useEffect(() => {
    const p = yt.current
    if (!ready || !p) return
    timeRef.current = 0
    setProgress({ time: 0, duration: 0 })
    setError(null)
    if (videoId) {
      p.loadVideoById(videoId)
    } else {
      p.stopVideo()
      setPlaying(false)
    }
  }, [ready, videoId, nonce])

  // Track the playhead while playing.
  useEffect(() => {
    if (!playing) return
    const t = setInterval(() => {
      const p = yt.current
      if (!p) return
      timeRef.current = p.getCurrentTime()
      setProgress({ time: timeRef.current, duration: p.getDuration() })
    }, 400)
    return () => clearInterval(t)
  }, [playing])

  const value = useMemo<PlayerCtx>(
    () => ({
      current,
      queue,
      index,
      videoId,
      playing,
      error,
      shuffle,
      repeat,
      showVideo,
      play: (song, q) => {
        const list = q && q.length ? q : [song]
        setQueue(list)
        setIndex(Math.max(0, list.findIndex((s) => s.id === song.id)))
        setNonce((x) => x + 1)
      },
      jump: (i) => {
        setIndex(i)
        setNonce((x) => x + 1)
      },
      toggle: () => {
        const p = yt.current
        if (!p || !videoId) return
        if (playing) p.pauseVideo()
        else p.playVideo()
      },
      next: () => step(1),
      prev: () => {
        // Like most players: restart the song unless you're right at its start.
        if (timeRef.current > 3) yt.current?.seekTo(0, true)
        else step(-1)
      },
      seek: (seconds) => {
        yt.current?.seekTo(seconds, true)
        timeRef.current = seconds
        setProgress((p) => ({ ...p, time: seconds }))
      },
      close: () => setIndex(-1),
      toggleShuffle: () => setShuffle((s) => !s),
      cycleRepeat: () => setRepeat((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off')),
      setShowVideo,
    }),
    [current, queue, index, videoId, playing, error, shuffle, repeat, showVideo, step],
  )

  return (
    <Ctx.Provider value={value}>
      <ProgressCtx.Provider value={progress}>
        {children}
        <div ref={hostRef} className={`yt-host ${showVideo && videoId ? 'is-visible' : ''}`} aria-hidden={!showVideo} />
      </ProgressCtx.Provider>
    </Ctx.Provider>
  )
}

export function usePlayer() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('usePlayer must be inside PlayerProvider')
  return ctx
}

export function usePlayerProgress() {
  return useContext(ProgressCtx)
}

export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds || 0))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

/** Accepts youtu.be/ID, youtube.com/watch?v=ID, /shorts/ID, /embed/ID */
export function youtubeId(url: string): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1) || null
    if (u.searchParams.get('v')) return u.searchParams.get('v')
    const m = u.pathname.match(/\/(embed|shorts)\/([\w-]{6,})/)
    return m ? m[2] : null
  } catch {
    return null
  }
}

/** A whole album as one player item, using the album's Spotify link. */
export function albumAsSong(a: Album): Song {
  return {
    id: -a.id,
    title: `${a.title} (full album)`,
    native_title: '',
    note: '',
    is_title_track: false,
    disc: 1,
    track_number: 0,
    youtube_url: '',
    spotify_url: a.spotify_url,
    album_title: a.title,
    album_slug: a.slug,
    album_spotify_url: a.spotify_url,
  }
}

/** open.spotify.com/track/ID → embed URL */
export function spotifyEmbed(url: string): string | null {
  const m = url?.match(/open\.spotify\.com\/(?:intl-\w+\/)?(track|album|playlist)\/(\w+)/)
  return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=generator` : null
}
