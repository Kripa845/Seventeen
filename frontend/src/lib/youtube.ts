/** Minimal typings and a one-time loader for the YouTube IFrame Player API. */

export interface YTPlayer {
  loadVideoById(id: string): void
  playVideo(): void
  pauseVideo(): void
  stopVideo(): void
  seekTo(seconds: number, allowSeekAhead: boolean): void
  getCurrentTime(): number
  getDuration(): number
  destroy(): void
}

interface YTEvent {
  data: number
}

interface YTOptions {
  width: string
  height: string
  playerVars: Record<string, number | string>
  events: {
    onReady?: () => void
    onStateChange?: (e: YTEvent) => void
    onError?: (e: YTEvent) => void
  }
}

interface YTNamespace {
  Player: new (el: HTMLElement, options: YTOptions) => YTPlayer
}

declare global {
  interface Window {
    YT?: YTNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

/** YT.PlayerState values */
export const YT_ENDED = 0
export const YT_PLAYING = 1
export const YT_PAUSED = 2

let loading: Promise<YTNamespace> | null = null

export function loadYouTube(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  loading ??= new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      resolve(window.YT!)
    }
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.async = true
    document.head.appendChild(script)
  })
  return loading
}

/**
 * Artwork from a video's thumbnail. "maxres" is 16:9 with no bars, so a centred square crop
 * of an official-audio upload is exactly the album cover; not every video has one, so fall
 * back to "hq" (4:3 with letterbox bars, which the page crops off).
 */
export function youtubeThumb(id: string, size: 'maxres' | 'hq' = 'maxres'): string {
  return `https://i.ytimg.com/vi/${id}/${size}default.jpg`
}
