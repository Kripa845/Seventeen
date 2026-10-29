export type Unit = 'hiphop' | 'vocal' | 'performance'

export interface Member {
  id: number
  slug: string
  stage_name: string
  birth_name: string
  birthday: string // YYYY-MM-DD
  birthplace: string
  unit: Unit
  unit_label: string
  is_unit_leader: boolean
  position: string
  color: string
  symbol: string
  tagline: string
  fun_facts: string[]
  photo: string | null
  service: '' | 'active' | 'alternative' | 'exempt' | 'not_required'
  service_label: string
  service_note: string
  enlistment_date: string | null // YYYY-MM-DD
  discharge_date: string | null // official or expected
  order: number
}

export interface ThemeTokens {
  bg: string
  surface: string
  text: string
  accent: string
  accent2: string
  font: 'serif' | 'sans' | 'display' | 'mono' | 'marker'
  pattern: 'sparkle' | 'grid' | 'waves' | 'stars' | 'petals' | 'daisies' | 'smileys' | 'signs' | 'flowers' | 'orbits' | 'suns' | 'billiards' | 'staves' | 'hoops' | 'film' | 'butterflies' | 'picks' | 'umbrellas' | 'roses' | 'books' | 'confetti' | 'ink' | 'footprints' | 'tangerines' | 'lemons' | 'leaves' | 'tiger' | 'none'
  dark: boolean
  /** Photos and decorations on top of the colours (see src/themes/). */
  skin?: 'none' | 'heaven' | 'darling' | 'leftright' | 'world' | 'attacca' | 'hot' | 'homerun' | 'maestro' | 'ajunice' | 'scoups' | 'jeonghan' | 'joshua' | 'jun' | 'dk' | 'wonwoo' | 'woozi' | 'the8' | 'dino' | 'seungkwan' | 'vernon' | 'mingyu' | 'hoshi'
}

export interface Song {
  id: number
  title: string
  native_title: string // Korean or Japanese title
  note: string // unit, solo or edition
  is_title_track: boolean
  disc: number
  track_number: number
  youtube_url: string
  spotify_url: string
  album_title: string
  album_slug: string
  album_spotify_url: string
  album_cover?: string | null // the album's uploaded cover
}

export interface Album {
  id: number
  slug: string
  title: string
  kind: string
  kind_label: string
  language: 'ko' | 'ja'
  release_date: string
  title_track: string
  era_mood: string
  theme: ThemeTokens
  cover: string | null
  spotify_url: string
  songs?: Song[]
}

export interface SiteSettings {
  theme: ThemeTokens
  hero_eyebrow: string
  hero_lede: string
  disabled_games: GameKey[]
  updated_at: string
}

export interface StudioUser {
  username: string
  is_staff: boolean
}

/** The signed-in person: a viewer (fan) or an admin (can use the Studio). */
export interface Account extends StudioUser {
  role: 'admin' | 'viewer'
  display_name: string
  bias: string | null // member slug
  date_joined: string
}

export interface AdminUser {
  id: number
  username: string
  display_name: string
  bias: string | null
  is_staff: boolean
  is_active: boolean
  date_joined: string
  last_login: string | null
  likes: number
  games: number
}

export type GameKey = 'memory' | 'unit_sort' | 'guess'

export interface AdminScore extends Score {
  username: string | null
}

export interface Score {
  id: number
  game: GameKey
  player: string
  score: number
  created_at: string
}

export type DiaryBook = 'diary' | 'album'
export type DiaryPaper = 'plain' | 'lined' | 'grid' | 'dots' | 'kraft' | 'blush' | 'night' | 'album' | 'linen'
export type DiaryFrame = 'none' | 'cutout' | 'polaroid' | 'tape' | 'round' | 'heart' | 'arch' | 'stamp' | 'film' | 'gold' | 'torn'
export type DiaryFont = 'hand' | 'cute' | 'marker' | 'type' | 'script' | 'serif' | 'bold' | 'pen' | 'round' | 'poster' | 'retro' | 'bubbly' | 'magazine' | 'pixel'
export type DiaryTextStyle = 'plain' | 'note' | 'label' | 'tape'
export type DiarySongStyle = 'card' | 'vinyl' | 'cassette'

/** x, y: the item's centre and w: its width, all in % of the spread. r: degrees. z: stacking order. */
interface DiaryItemBase {
  id: string
  x: number
  y: number
  w: number
  r: number
  z: number
}

export type DiaryItem = DiaryItemBase &
  (
    | { kind: 'photo'; photo: number; a: number; frame: DiaryFrame; caption: string }
    | { kind: 'member'; member: string; a: number; frame: DiaryFrame; caption: string }
    | { kind: 'sticker'; sticker: string }
    | { kind: 'text'; text: string; font: DiaryFont; style: DiaryTextStyle; size: number; color: string }
    // song: a SEVENTEEN song on the site; null means any song, by its YouTube / Spotify link
    | { kind: 'song'; song: number | null; style: DiarySongStyle; url?: string; title?: string; artist?: string }
    // video: an uploaded clip; null means a YouTube link (url)
    | { kind: 'video'; video: number | null; url?: string; a: number; frame: DiaryFrame; caption: string }
  )

export interface DiaryPage {
  id: number
  book: DiaryBook
  date: string | null // YYYY-MM-DD; photo album pages have none
  title: string
  paper: DiaryPaper
  items: DiaryItem[]
  is_private: boolean
  position: number // photo album order (Studio, Album management)
  author_name: string // who wrote it ('' for older pages)
  can_edit: boolean // you wrote it, or you're an admin
  photos: Record<string, string> // photo id -> url
  videos: Record<string, string> // video id -> url
  created_at: string
  updated_at: string
}
