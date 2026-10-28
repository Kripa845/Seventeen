import { createContext, useContext } from 'react'
import { youtubeId } from '../lib/player'
import type { DiaryItem, Song } from '../lib/types'
import { youtubeThumb } from '../lib/youtube'

export type SongItem = Extract<DiaryItem, { kind: 'song' }>

/** The site's songs and album covers, loaded once by the Diary page for every spread. */
export interface DiaryMusic {
  songs: Song[]
  byId: Record<number, Song>
  covers: Record<string, string | null> // album slug -> cover
}

const MusicCtx = createContext<DiaryMusic>({ songs: [], byId: {}, covers: {} })
export const MusicProvider = MusicCtx.Provider
export const useDiaryMusic = () => useContext(MusicCtx)

/** Same link, same id, so the player knows when this song is the one playing. */
function linkId(url: string) {
  let h = 0
  for (const ch of url) h = (h * 31 + ch.charCodeAt(0)) | 0
  return -(1_000_000 + (Math.abs(h) % 1_000_000_000))
}

/** The song a diary item plays: one of SEVENTEEN's from the site, or any song by its link. */
export function songFor(item: SongItem, music: DiaryMusic): Song | null {
  if (item.song !== null) return music.byId[item.song] ?? null
  const url = item.url ?? ''
  const spotify = url.includes('spotify.com')
  return {
    id: linkId(url),
    title: item.title || 'Untitled song',
    native_title: '',
    note: item.artist ?? '',
    is_title_track: false,
    disc: 1,
    track_number: 0,
    youtube_url: spotify ? '' : url,
    spotify_url: spotify ? url : '',
    album_title: item.artist || 'From my diary',
    album_slug: '',
    album_spotify_url: '',
  }
}

export const artistOf = (item: SongItem) => (item.song !== null ? 'SEVENTEEN' : item.artist || '')

/** Album cover if the site has one, else the video's thumbnail. */
export function artFor(song: Song, music: DiaryMusic): string | null {
  const cover = song.album_slug ? music.covers[song.album_slug] : null
  if (cover) return cover
  const id = youtubeId(song.youtube_url)
  return id ? youtubeThumb(id, 'hq') : null
}

/** Every playable song on a page, in the order they sit on it (left to right). */
export function pageSongs(items: DiaryItem[], music: DiaryMusic): Song[] {
  return items
    .filter((i): i is SongItem => i.kind === 'song')
    .sort((a, b) => a.x - b.x)
    .map((i) => songFor(i, music))
    .filter((s): s is Song => !!s)
}
