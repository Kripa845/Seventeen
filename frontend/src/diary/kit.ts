import type { CSSProperties } from 'react'
import { send } from '../lib/studio'
import type { DiaryBook, DiaryFont, DiaryFrame, DiaryItem, DiaryPage, DiaryPaper, DiaryTextStyle } from '../lib/types'

// ---------- What can go on a page ----------

export const EMOJI = [
  '💎', '💖', '💗', '🌸', '✨', '⭐', '🌟', '🎀', '🎂', '🎉', '🎤', '🎧', '🎶', '📸', '💌', '🌈',
  '☁️', '🌙', '🍓', '🍑', '🍊', '🧸', '🦋', '🐯', '🐱', '🐶', '🍀', '🔥', '🫶', '🥹', '😭', '💐',
]

export type LabelStyle = 'ransom' | 'pill' | 'bubble' | 'stamp' | 'tag' | 'badge' | 'script'

/** Word stickers. Stored on the page by key, e.g. "label:carat". */
export const LABELS: Record<string, { text: string; style: LabelStyle }> = {
  'label:svt': { text: 'SEVENTEEN', style: 'ransom' },
  'label:carat': { text: 'CARAT ♡', style: 'pill' },
  'label:saythename': { text: 'Say the name!', style: 'bubble' },
  'label:ajunice': { text: 'AJU NICE!', style: 'stamp' },
  'label:verynice': { text: 'Very Nice ✦', style: 'pill' },
  'label:goingsvt': { text: 'GOING SVT', style: 'tag' },
  'label:17': { text: '17', style: 'badge' },
  'label:righthere': { text: 'right here', style: 'script' },
  'label:concert': { text: 'CONCERT DAY', style: 'ransom' },
  'label:bestday': { text: 'best day ever', style: 'tag' },
  'label:onrepeat': { text: 'on repeat ♫', style: 'bubble' },
  'label:bias': { text: 'my bias ♡', style: 'stamp' },
}

export const TAPES = ['tape:pink', 'tape:blue', 'tape:mint', 'tape:lilac', 'tape:check', 'tape:stripe', 'tape:dots', 'tape:gold']
export const SHAPES = ['shape:heart', 'shape:star', 'shape:sparkle', 'shape:diamond', 'shape:flower', 'shape:cloud']

/** How wide a new sticker starts, in % of the spread. */
export function stickerWidth(key: string) {
  if (key.startsWith('label:')) return LABELS[key]?.style === 'badge' ? 9 : 22
  if (key.startsWith('tape:')) return 18
  return 9
}

/** How wide a new song starts, in % of the spread. */
export const SONG_WIDTHS = { card: 27, vinyl: 17, cassette: 23 } as const

export const FONTS: Record<DiaryFont, { label: string; family: string }> = {
  hand: { label: 'Handwriting', family: "'Caveat', cursive" },
  cute: { label: 'Cute', family: "'Gaegu', cursive" },
  marker: { label: 'Marker', family: "'Permanent Marker', cursive" },
  type: { label: 'Typewriter', family: "'Special Elite', monospace" },
  script: { label: 'Script', family: "'Pinyon Script', cursive" },
  serif: { label: 'Serif', family: "'Cormorant Garamond', serif" },
  bold: { label: 'Bold', family: "'Unbounded', sans-serif" },
}

export const TEXT_STYLES: Record<DiaryTextStyle, string> = {
  plain: 'Plain',
  note: 'Sticky note',
  label: 'Label',
  tape: 'On tape',
}

export const INKS = ['#2B2B2B', '#FFFFFF', '#C25E73', '#E8476B', '#7D93C9', '#2F5DA8', '#3E8E6B', '#D9A400', '#8A5BC2']

export const FRAMES: Record<DiaryFrame, string> = {
  cutout: 'Sticker',
  polaroid: 'Polaroid',
  tape: 'Taped',
  round: 'Round',
  heart: 'Heart',
  arch: 'Arch',
  stamp: 'Stamp',
  film: 'Film strip',
  gold: 'Gold frame',
  torn: 'Torn paper',
  none: 'Plain',
}

export const PAPERS: Record<DiaryPaper, string> = {
  plain: 'Cream',
  lined: 'Lined',
  grid: 'Grid',
  dots: 'Dots',
  kraft: 'Kraft',
  blush: 'Blush',
  night: 'Night',
  album: 'Black album',
  linen: 'Linen',
}

/** Quick starts in the Text tab. */
export const TEXT_PRESETS: { label: string; text: string; font: DiaryFont; style: DiaryTextStyle; size: number; color: string; w: number }[] = [
  { label: 'Dear diary…', text: 'Dear diary,\n', font: 'hand', style: 'plain', size: 3.4, color: '#2B2B2B', w: 34 },
  { label: 'Sticky note', text: 'remember this ♡', font: 'hand', style: 'note', size: 3, color: '#2B2B2B', w: 22 },
  { label: 'Big title', text: 'BEST DAY', font: 'marker', style: 'plain', size: 6.5, color: '#E8476B', w: 40 },
  { label: 'Cute 귀여운', text: '오늘도 고마워 ♡', font: 'cute', style: 'plain', size: 3.4, color: '#C25E73', w: 30 },
  { label: 'Label', text: 'SET LIST', font: 'type', style: 'label', size: 2.4, color: '#2B2B2B', w: 18 },
  { label: 'Script', text: 'forever & always', font: 'script', style: 'plain', size: 4.5, color: '#2F5DA8', w: 34 },
]

// ---------- Helpers ----------

/** Positions an item on the spread: centre at (x, y), width w, all in % of the spread. */
export function itemStyle(item: DiaryItem): CSSProperties {
  return {
    left: `${item.x}%`,
    top: `${item.y}%`,
    width: `${item.w}%`,
    zIndex: item.z,
    transform: `translate(-50%, -50%) rotate(${item.r}deg)`,
  }
}

export function uid() {
  return Math.random().toString(36).slice(2, 10)
}

export const topZ = (items: DiaryItem[]) => items.reduce((z, i) => Math.max(z, i.z), 0)

/** A little tilt, so things look placed by hand. */
export const tilt = () => Math.round((Math.random() * 10 - 5) * 10) / 10

export function parseDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayIso() {
  const t = new Date()
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
}

export const longDate = (iso: string) =>
  parseDate(iso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

/** How a page is named in labels: its date in the diary, its title in the photo albums. */
export function pageName(page: Pick<DiaryPage, 'date' | 'title'>) {
  if (!page.date) return page.title || 'Untitled page'
  return `${longDate(page.date)}${page.title ? ` · ${page.title}` : ''}`
}

export const monthLabel = (iso: string) => parseDate(iso).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

/** Everything searchable on a page: date, title, words and member names. */
export function pageText(page: DiaryPage, memberName: (slug: string) => string, songTitle: (item: { song: number | null }) => string = () => '') {
  const parts = page.date ? [page.date, longDate(page.date), page.title] : [page.title]
  for (const item of page.items) {
    if (item.kind === 'text') parts.push(item.text)
    if (item.kind === 'photo' || item.kind === 'video') parts.push(item.caption)
    if (item.kind === 'member') parts.push(item.caption, memberName(item.member))
    if (item.kind === 'sticker' && LABELS[item.sticker]) parts.push(LABELS[item.sticker].text)
    if (item.kind === 'song') parts.push(item.title ?? '', item.artist ?? '', songTitle(item))
  }
  return parts.join(' ').toLowerCase()
}

/**
 * Shrinks big photos before upload (max 1600px) so the book stays quick.
 * PNGs stay PNG so cut-out stickers keep their see-through edges.
 */
export async function prepareImage(file: File): Promise<{ file: File; aspect: number }> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const { naturalWidth: w, naturalHeight: h } = img
    const aspect = h / w
    const scale = Math.min(1, 1600 / Math.max(w, h))
    if (scale === 1 && file.size < 1.5 * 1024 * 1024) return { file, aspect }
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(w * scale)
    canvas.height = Math.round(h * scale)
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
    const png = file.type === 'image/png' || file.type === 'image/webp'
    const type = png ? 'image/png' : 'image/jpeg'
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, type, 0.88))
    if (!blob) return { file, aspect }
    const name = file.name.replace(/\.\w+$/, '') + (png ? '.png' : '.jpg')
    return { file: new File([blob], name, { type }), aspect }
  } finally {
    URL.revokeObjectURL(url)
  }
}

// ---------- API ----------

export type PageDraft = Pick<DiaryPage, 'book' | 'date' | 'title' | 'paper' | 'items' | 'is_private'>

export const diaryApi = {
  list: (book: DiaryBook) => send<DiaryPage[]>('GET', `/diary/?book=${book}`),
  create: (draft: Partial<PageDraft>) => send<DiaryPage>('POST', '/diary/', draft),
  save: (id: number, draft: Partial<PageDraft>) => send<DiaryPage>('PATCH', `/diary/${id}/`, draft),
  remove: (id: number) => send<null>('DELETE', `/diary/${id}/`),
  /** Every photo album page id, in the new order (staff). */
  reorder: (ids: number[]) => send<DiaryPage[]>('POST', '/diary/reorder/', { ids }),
  upload: (id: number, file: File) => {
    const form = new FormData()
    form.append('image', file)
    return send<{ id: number; image: string }>('POST', `/diary/${id}/photos/`, form)
  },
  uploadVideo: (id: number, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return send<{ id: number; file: string }>('POST', `/diary/${id}/videos/`, form)
  },
}

// ---------- The two books ----------

/** What differs between the diary and the photo albums; everything else is shared. */
export interface BookConfig {
  kind: DiaryBook
  path: string
  title: string
  cover: string
  search: string
  paper: DiaryPaper // new pages start on this
  big: boolean // albums get bigger spreads
}

export const DIARY_BOOK: BookConfig = {
  kind: 'diary',
  path: '/diary',
  title: 'Diary',
  cover: 'CARAT Diary',
  search: 'Search words, members, dates…',
  paper: 'plain',
  big: false,
}

export const ALBUM_BOOK: BookConfig = {
  kind: 'album',
  path: '/memories',
  title: 'Photo albums',
  cover: 'SEVENTEEN Memories',
  search: 'Search captions, members, songs, dates…',
  paper: 'album',
  big: true,
}

export const MAX_VIDEO_MB = 100

/** A video's height / width, read from the file before it's uploaded. */
export function videoAspect(file: File): Promise<number> {
  return new Promise((ok) => {
    const url = URL.createObjectURL(file)
    const v = document.createElement('video')
    v.preload = 'metadata'
    v.onloadedmetadata = () => {
      ok(v.videoWidth ? Math.round((v.videoHeight / v.videoWidth) * 1000) / 1000 : 0.5625)
      URL.revokeObjectURL(url)
    }
    v.onerror = () => {
      ok(0.5625)
      URL.revokeObjectURL(url)
    }
    v.src = url
  })
}
