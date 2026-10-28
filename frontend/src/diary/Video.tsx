import { createContext, useContext, useEffect, useState } from 'react'
import type { KeyboardEvent, MouseEvent, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { usePlayer, youtubeId } from '../lib/player'
import type { DiaryItem } from '../lib/types'
import { youtubeThumb } from '../lib/youtube'
import { IconClose } from './Icons'

type VideoItem = Extract<DiaryItem, { kind: 'video' }>
type Playing = { src?: string; youtube?: string; caption: string }

const OpenVideo = createContext<(v: Playing) => void>(() => {})

/**
 * Plays a video full screen over the book. Pages only show a still with a ▶, so a
 * book full of clips stays light; the site's music pauses while a video plays.
 */
export function VideoProvider({ children }: { children: ReactNode }) {
  const [playing, setPlaying] = useState<Playing | null>(null)
  const player = usePlayer()

  const open = (v: Playing) => {
    if (player.playing) player.toggle()
    setPlaying(v)
  }

  useEffect(() => {
    if (!playing) return
    const key = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && setPlaying(null)
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [playing])

  return (
    <OpenVideo.Provider value={open}>
      {children}
      {playing &&
        createPortal(
          <div className="dvideo-box" role="dialog" aria-modal aria-label={playing.caption || 'Video'} onClick={() => setPlaying(null)}>
            <button className="dbtn dbtn--icon dvideo-box__close" onClick={() => setPlaying(null)} aria-label="Close">
              <IconClose />
            </button>
            <div className="dvideo-box__frame" onClick={(e) => e.stopPropagation()}>
              {playing.youtube ? (
                <iframe
                  src={`https://www.youtube.com/embed/${playing.youtube}?autoplay=1&rel=0`}
                  title={playing.caption || 'Video'}
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                />
              ) : (
                <video src={playing.src} controls autoPlay playsInline />
              )}
              {playing.caption && <p className="dvideo-box__caption">{playing.caption}</p>}
            </div>
          </div>,
          document.body,
        )}
    </OpenVideo.Provider>
  )
}

/** A video on a page: the first frame (or the YouTube thumbnail) with a play button. */
export function VideoStill({ item, videos }: { item: VideoItem; videos: Record<string, string> }) {
  const open = useContext(OpenVideo)
  const src = item.video !== null ? videos[item.video] : undefined
  const yt = item.video === null ? youtubeId(item.url ?? '') : null

  const start = (e: MouseEvent | KeyboardEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (src || yt) open({ src, youtube: yt ?? undefined, caption: item.caption })
  }

  return (
    <>
      {src ? (
        // #t=0.1 makes the browser show the first frame instead of black
        <video className="dvideo__still" src={`${src}#t=0.1`} preload="metadata" muted playsInline tabIndex={-1} />
      ) : yt ? (
        <img className="dvideo__still" src={youtubeThumb(yt, 'hq')} alt="" draggable={false} loading="lazy" />
      ) : (
        <span className="ditem__missing">video</span>
      )}
      <span
        role="button"
        tabIndex={0}
        data-song-play
        className="dvideo__play"
        aria-label={`Play video${item.caption ? `: ${item.caption}` : ''}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={start}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && start(e)}
      >
        ▶
      </span>
      {yt && <span className="dvideo__badge">YouTube</span>}
    </>
  )
}
