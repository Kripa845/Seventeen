import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, DragEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { MemberAvatar } from '../components/MemberAvatar'
import { usePlayer } from '../lib/player'
import type { DiaryFrame, DiaryItem, DiaryPage, DiaryPaper, DiarySongStyle, Member, Song } from '../lib/types'
import {
  diaryApi,
  EMOJI,
  itemStyle,
  MAX_VIDEO_MB,
  FONTS,
  FRAMES,
  INKS,
  LABELS,
  pageName,
  PAPERS,
  prepareImage,
  SHAPES,
  stickerWidth,
  SONG_WIDTHS,
  TAPES,
  TEXT_PRESETS,
  TEXT_STYLES,
  tilt,
  topZ,
  uid,
  videoAspect,
} from './kit'
import type { BookConfig, PageDraft } from './kit'
import { IconClose, IconEyeOff, IconRedo, IconRotate, IconUndo } from './Icons'
import { artFor, useDiaryMusic } from './music'
import { ItemContent, Sheet } from './Sheet'
import type { MemberMap } from './Sheet'

type Tab = 'photos' | 'members' | 'music' | 'videos' | 'stickers' | 'text' | 'page'
type Gesture = { mode: 'move' | 'rotate' | 'scale'; id: string; start: DiaryItem; px: number; py: number; cx: number; cy: number }

const TABS: { key: Tab; label: string }[] = [
  { key: 'photos', label: 'Photos' },
  { key: 'members', label: 'Members' },
  { key: 'music', label: 'Music' },
  { key: 'videos', label: 'Videos' },
  { key: 'stickers', label: 'Stickers' },
  { key: 'text', label: 'Text' },
  { key: 'page', label: 'Page' },
]

const SONG_STYLES: Record<DiarySongStyle, string> = { card: 'Card', vinyl: 'Vinyl', cassette: 'Cassette' }

/** Photo albums keep to pictures, songs and videos; the diary has stickers and words instead of videos. */
const tabsFor = (book: BookConfig) =>
  TABS.filter((t) => (book.kind === 'album' ? t.key !== 'stickers' && t.key !== 'text' : t.key !== 'videos'))

const YOUTUBE = /^https:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\/\S+$/

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Fits a 4:3 spread inside the space it is given. */
function useFit() {
  const box = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => {
      const { width: w, height: h } = e.contentRect
      setWidth(Math.floor(Math.min(w, (h * 4) / 3)))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return { box, width }
}

/** Read-only, full-size view of a spread for visitors. */
export function Reader({ page, members, onClose }: { page: DiaryPage; members: MemberMap; onClose: () => void }) {
  const { box, width } = useFit()
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [onClose])

  return createPortal(
    <div className="dedit dedit--read" role="dialog" aria-modal aria-label={pageName(page)} onClick={onClose}>
      <header className="dedit__bar">
        <span className="dedit__when">
          {page.date ? (
            <>
              {pageName({ date: page.date, title: '' })}
              {page.title && <b> · {page.title}</b>}
            </>
          ) : (
            <b>{pageName(page)}</b>
          )}
        </span>
        <button className="dbtn dbtn--icon" onClick={onClose} aria-label="Close">
          <IconClose />
        </button>
      </header>
      <div className="dedit__stage" ref={box}>
        <div className="dedit__canvas" style={{ width }} onClick={(e) => e.stopPropagation()}>
          <Sheet page={page} members={members} />
        </div>
      </div>
    </div>,
    document.body,
  )
}

export function Editor({
  book,
  page,
  members,
  memberList,
  isNew,
  onSaved,
  onClose,
}: {
  book: BookConfig
  page: DiaryPage
  members: MemberMap
  memberList: Member[]
  isNew: boolean
  onSaved: (page: DiaryPage) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState<Omit<PageDraft, 'book'>>({
    date: page.date,
    title: page.title,
    paper: page.paper,
    items: page.items,
    is_private: page.is_private,
  })
  const [photos, setPhotos] = useState(page.photos)
  const [videos, setVideos] = useState(page.videos ?? {})
  const [ytLink, setYtLink] = useState({ url: '', caption: '' })
  const tabs = tabsFor(book)
  const big = book.kind === 'album'
  const [selected, setSelected] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>(isNew || big ? 'photos' : 'stickers')
  const [past, setPast] = useState<DiaryItem[][]>([])
  const [future, setFuture] = useState<DiaryItem[][]>([])
  const [uploading, setUploading] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dropping, setDropping] = useState(false)
  const [songQuery, setSongQuery] = useState('')
  const [link, setLink] = useState({ title: '', artist: '', url: '' })
  const music = useDiaryMusic()
  const player = usePlayer()
  const lastEdit = useRef({ key: '', at: 0 })
  const gesture = useRef<Gesture | null>(null)
  const canvas = useRef<HTMLDivElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const videoInput = useRef<HTMLInputElement>(null)
  const textArea = useRef<HTMLTextAreaElement>(null)
  const { box, width } = useFit()

  const items = draft.items
  const current = items.find((i) => i.id === selected) ?? null
  const dirty =
    JSON.stringify(draft) !==
    JSON.stringify({ date: page.date, title: page.title, paper: page.paper, items: page.items, is_private: page.is_private })

  // The latest items, for code that runs between renders (drags, uploads).
  const latest = useRef(items)
  latest.current = items

  /** Change the items, remembering the old ones for undo. Quick edits to the same thing merge into one step. */
  const commit = useCallback((next: DiaryItem[], key = '') => {
    const now = Date.now()
    const merge = key && lastEdit.current.key === key && now - lastEdit.current.at < 900
    lastEdit.current = { key, at: now }
    if (!merge) {
      const before = latest.current
      setPast((p) => [...p.slice(-60), before])
      setFuture([])
    }
    latest.current = next
    setDraft((d) => ({ ...d, items: next }))
  }, [])

  const update = useCallback(
    (id: string, patch: Partial<DiaryItem>, key = `edit:${id}`) => {
      commit(
        items.map((i) => (i.id === id ? ({ ...i, ...patch } as DiaryItem) : i)),
        key,
      )
    },
    [items, commit],
  )

  const add = (item: Omit<DiaryItem, 'id' | 'z' | 'r' | 'x' | 'y'> & Partial<DiaryItem>) => {
    const spread = items.length % 6
    const full = {
      x: 50 + (spread - 2.5) * 5,
      y: 46 + (spread % 3) * 4,
      r: tilt(),
      ...item,
      id: uid(),
      z: topZ(items) + 1,
    } as DiaryItem
    commit([...items, full])
    setSelected(full.id)
    return full
  }

  const remove = (id: string) => {
    commit(items.filter((i) => i.id !== id))
    setSelected(null)
  }

  const duplicate = (id: string) => {
    const it = items.find((i) => i.id === id)
    if (!it) return
    const copy = { ...it, id: uid(), x: it.x + 3, y: it.y + 3, z: topZ(items) + 1 }
    commit([...items, copy])
    setSelected(copy.id)
  }

  const layer = (id: string, dir: 1 | -1) => {
    const sorted = [...items].sort((a, b) => a.z - b.z)
    const at = sorted.findIndex((i) => i.id === id)
    const to = clamp(at + dir, 0, sorted.length - 1)
    if (at === to) return
    ;[sorted[at], sorted[to]] = [sorted[to], sorted[at]]
    const z = new Map(sorted.map((i, n) => [i.id, n + 1]))
    commit(items.map((i) => ({ ...i, z: z.get(i.id)! })))
  }

  const undo = () => {
    if (!past.length) return
    setFuture((f) => [items, ...f])
    setDraft((d) => ({ ...d, items: past[past.length - 1] }))
    setPast((p) => p.slice(0, -1))
    lastEdit.current = { key: '', at: 0 }
  }
  const redo = () => {
    if (!future.length) return
    setPast((p) => [...p, items])
    setDraft((d) => ({ ...d, items: future[0] }))
    setFuture((f) => f.slice(1))
    lastEdit.current = { key: '', at: 0 }
  }

  // ---------- Photos ----------

  /** Puts a freshly uploaded photo or video on the page, near where it was dropped. */
  const placeNew = (item: Partial<DiaryItem>, n: number, at?: { x: number; y: number }) => {
    const now = latest.current
    const full = {
      x: 30 + ((now.length * 11) % 40),
      y: 40 + ((now.length * 7) % 25),
      r: tilt(),
      ...item,
      ...(at ? { x: clamp(at.x + n * 4, 0, 100), y: clamp(at.y + n * 4, 0, 100) } : {}),
      id: uid(),
      z: topZ(now) + 1,
    } as DiaryItem
    commit([...now, full])
    setSelected(full.id)
  }

  const uploadFiles = async (files: File[], at?: { x: number; y: number }) => {
    const images = files.filter((f) => f.type.startsWith('image/'))
    const clips = big ? files.filter((f) => f.type.startsWith('video/')) : []
    if (!images.length && !clips.length) return setError(big ? 'Those aren’t photos or videos.' : 'Those aren’t images.')
    setError(null)
    setUploading((n) => n + images.length + clips.length)
    let n = 0
    for (const original of images) {
      try {
        if (original.size > 25 * 1024 * 1024) throw new Error('Images up to 25 MB, please.')
        const { file, aspect } = await prepareImage(original)
        const res = await diaryApi.upload(page.id, file)
        setPhotos((p) => ({ ...p, [res.id]: res.image }))
        // Album photos start bigger: they're the whole point of the page.
        const w = big ? (aspect > 1.3 ? 30 : 36) : aspect > 1.3 ? 22 : 28
        placeNew({ kind: 'photo', photo: res.id, a: Math.round(aspect * 1000) / 1000, w, frame: big ? 'none' : 'cutout', caption: '' }, n++, at)
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setUploading((u) => u - 1)
      }
    }
    for (const clip of clips) {
      try {
        if (clip.size > MAX_VIDEO_MB * 1024 * 1024) throw new Error(`Videos up to ${MAX_VIDEO_MB} MB, please.`)
        const aspect = await videoAspect(clip)
        const res = await diaryApi.uploadVideo(page.id, clip)
        setVideos((v) => ({ ...v, [res.id]: res.file }))
        placeNew({ kind: 'video', video: res.id, a: aspect, w: aspect > 1 ? 24 : 40, frame: 'none', caption: '' }, n++, at)
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setUploading((u) => u - 1)
      }
    }
  }

  // Paste a picture straight onto the page.
  useEffect(() => {
    const paste = (e: ClipboardEvent) => {
      const files = [...(e.clipboardData?.files ?? [])]
      if (files.some((f) => f.type.startsWith('image/') || (big && f.type.startsWith('video/')))) {
        e.preventDefault()
        uploadFiles(files)
      }
    }
    window.addEventListener('paste', paste)
    return () => window.removeEventListener('paste', paste)
  })

  // ---------- Dragging, rotating, resizing ----------

  const startGesture = (e: ReactPointerEvent, item: DiaryItem, mode: Gesture['mode']) => {
    e.stopPropagation()
    e.preventDefault()
    setSelected(item.id)
    const rect = canvas.current!.getBoundingClientRect()
    gesture.current = {
      mode,
      id: item.id,
      start: item,
      px: e.clientX,
      py: e.clientY,
      cx: rect.left + (item.x / 100) * rect.width,
      cy: rect.top + (item.y / 100) * rect.height,
    }
    commit(items, `gesture:${uid()}`) // one undo step for the whole drag
  }

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const g = gesture.current
      if (!g || !canvas.current) return
      const rect = canvas.current.getBoundingClientRect()
      const s = g.start
      let patch: Partial<DiaryItem>
      if (g.mode === 'move') {
        patch = {
          x: clamp(s.x + ((e.clientX - g.px) / rect.width) * 100, -10, 110),
          y: clamp(s.y + ((e.clientY - g.py) / rect.height) * 100, -10, 110),
        }
      } else if (g.mode === 'rotate') {
        const a0 = Math.atan2(g.py - g.cy, g.px - g.cx)
        const a1 = Math.atan2(e.clientY - g.cy, e.clientX - g.cx)
        let r = s.r + ((a1 - a0) * 180) / Math.PI
        r = ((((r + 180) % 360) + 360) % 360) - 180
        if (!e.shiftKey) for (const snap of [-90, 0, 90, 180, -180]) if (Math.abs(r - snap) < 3) r = snap
        patch = { r: Math.round(r * 10) / 10 }
      } else {
        const d0 = Math.hypot(g.px - g.cx, g.py - g.cy) || 1
        const k = Math.hypot(e.clientX - g.cx, e.clientY - g.cy) / d0
        const w = clamp(s.w * k, 3, 100)
        patch = { w: Math.round(w * 100) / 100 }
        if (s.kind === 'text') patch = { ...patch, size: clamp(s.size * (w / s.w), 1, 20) } as Partial<DiaryItem>
      }
      setDraft((d) => ({ ...d, items: d.items.map((i) => (i.id === g.id ? ({ ...i, ...patch } as DiaryItem) : i)) }))
    }
    const up = () => (gesture.current = null)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [])

  // ---------- Saving ----------

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      onSaved(await diaryApi.save(page.id, draft))
    } catch (e) {
      setError((e as Error).message)
      setSaving(false)
    }
  }

  const close = () => {
    if (dirty && !window.confirm('Leave without saving your changes?')) return
    onClose()
  }

  // ---------- Keyboard ----------

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement).closest('input, textarea, select')
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault()
        save()
        return
      }
      if (typing) return
      if (e.key === 'Escape') {
        if (selected) setSelected(null)
        else close()
      } else if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        redo()
      } else if (current && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault()
        remove(current.id)
      } else if (current && mod && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        duplicate(current.id)
      } else if (current && e.key.startsWith('Arrow')) {
        e.preventDefault()
        const step = e.shiftKey ? 2 : 0.4
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
        update(current.id, { x: current.x + dx, y: current.y + dy }, `nudge:${current.id}`)
      }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  })

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  // ---------- Pieces of the panel ----------

  const dropAt = (e: DragEvent) => {
    e.preventDefault()
    setDropping(false)
    const rect = canvas.current!.getBoundingClientRect()
    uploadFiles([...e.dataTransfer.files], {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    })
  }

  const addSticker = (key: string) => add({ kind: 'sticker', sticker: key, w: stickerWidth(key) })

  const addSong = (song: number | null, extra: Partial<Extract<DiaryItem, { kind: 'song' }>> = {}) =>
    add({ kind: 'song', song, style: 'card', w: SONG_WIDTHS.card, ...extra })

  const q = songQuery.trim().toLowerCase()
  const songResults: Song[] = q
    ? music.songs.filter((s) => `${s.title} ${s.native_title} ${s.album_title}`.toLowerCase().includes(q)).slice(0, 40)
    : music.songs.filter((s) => s.is_title_track).slice().reverse()
  const linkOk = /^https:\/\/(www\.|m\.|music\.)?(youtube\.com|youtu\.be|open\.spotify\.com)\/\S+$/.test(link.url.trim())

  const inspector = current && (
    <div className="dinspect">
      <div className="dinspect__row">
        <span className="dinspect__what">
          {current.kind === 'photo' ? 'Photo' : current.kind === 'member' ? members[current.member]?.stage_name ?? 'Member' : current.kind === 'text' ? 'Text' : current.kind === 'song' ? 'Song' : current.kind === 'video' ? 'Video' : 'Sticker'}
        </span>
        <button className="dbtn dbtn--small" onClick={() => layer(current.id, 1)} title="Bring forward">⬆ Forward</button>
        <button className="dbtn dbtn--small" onClick={() => layer(current.id, -1)} title="Send backward">⬇ Back</button>
        <button className="dbtn dbtn--small" onClick={() => update(current.id, { r: 0 })}>Straighten</button>
        <button className="dbtn dbtn--small" onClick={() => duplicate(current.id)}>Duplicate</button>
        <button className="dbtn dbtn--small dbtn--danger" onClick={() => remove(current.id)}>Delete</button>
      </div>

      {(current.kind === 'photo' || current.kind === 'member' || current.kind === 'video') && (
        <div className="dinspect__row">
          <div className="dseg" role="group" aria-label="Frame">
            {(Object.keys(FRAMES) as DiaryFrame[]).map((f) => (
              <button key={f} className={current.frame === f ? 'is-on' : ''} onClick={() => update(current.id, { frame: f })}>
                {FRAMES[f]}
              </button>
            ))}
          </div>
          <input
            className="dinput"
            placeholder={current.frame === 'polaroid' ? 'Write on the polaroid…' : 'Caption (optional)'}
            value={current.caption}
            maxLength={80}
            onChange={(e) => update(current.id, { caption: e.target.value })}
          />
        </div>
      )}

      {current.kind === 'text' && (
        <>
          <textarea
            ref={textArea}
            className="dinput dinput--area"
            value={current.text}
            maxLength={600}
            rows={3}
            placeholder="Write something…"
            onChange={(e) => update(current.id, { text: e.target.value })}
            style={{ fontFamily: FONTS[current.font].family }}
          />
          <div className="dinspect__row">
            <select className="dinput dinput--select" value={current.font} onChange={(e) => update(current.id, { font: e.target.value as typeof current.font })} aria-label="Font">
              {Object.entries(FONTS).map(([k, f]) => (
                <option key={k} value={k}>{f.label}</option>
              ))}
            </select>
            <div className="dseg" role="group" aria-label="Style">
              {Object.entries(TEXT_STYLES).map(([k, label]) => (
                <button key={k} className={current.style === k ? 'is-on' : ''} onClick={() => update(current.id, { style: k as typeof current.style })}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="dinspect__row">
            <div className="dinks" role="group" aria-label="Colour">
              {INKS.map((c) => (
                <button key={c} style={{ background: c }} className={current.color === c ? 'is-on' : ''} onClick={() => update(current.id, { color: c })} aria-label={c} />
              ))}
              <input type="color" value={current.color} onChange={(e) => update(current.id, { color: e.target.value.toUpperCase() })} aria-label="Any colour" />
            </div>
            <label className="dslider">
              Size
              <input type="range" min={1.2} max={12} step={0.1} value={current.size} onChange={(e) => update(current.id, { size: Number(e.target.value) })} />
            </label>
          </div>
        </>
      )}

      {current.kind === 'sticker' && <p className="dhint">Drag the corner to resize, the top handle to rotate.</p>}

      {current.kind === 'song' && (
        <>
          <div className="dinspect__row">
            <div className="dseg" role="group" aria-label="Look">
              {(Object.keys(SONG_STYLES) as DiarySongStyle[]).map((st) => (
                <button
                  key={st}
                  className={current.style === st ? 'is-on' : ''}
                  onClick={() => update(current.id, { style: st, w: SONG_WIDTHS[st] })}
                >
                  {SONG_STYLES[st]}
                </button>
              ))}
            </div>
          </div>
          {current.song === null && (
            <div className="dinspect__row">
              <input className="dinput" value={current.title ?? ''} maxLength={100} placeholder="Song title" onChange={(e) => update(current.id, { title: e.target.value })} />
              <input className="dinput" value={current.artist ?? ''} maxLength={80} placeholder="Artist" onChange={(e) => update(current.id, { artist: e.target.value })} />
            </div>
          )}
          <p className="dhint">Press ▶ on the song to play it. On the page, it plays with the page’s other songs queued after it.</p>
        </>
      )}
    </div>
  )

  const panels: Record<Tab, ReactNode> = {
    photos: (
      <div className="dpanel__body">
        <button
          className={`ddrop ${dropping ? 'is-over' : ''}`}
          onClick={() => fileInput.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDropping(true)
          }}
          onDragLeave={() => setDropping(false)}
          onDrop={dropAt}
        >
          <span className="ddrop__icon" aria-hidden>⇪</span>
          <b>{uploading ? `Uploading ${uploading}…` : 'Add photos'}</b>
          <span>
            Click, drop them here or on the page, or paste (Ctrl+V). PNG cut-outs keep their shape.
            {big && ' Videos can be dropped here too.'}
          </span>
        </button>
        <input
          ref={fileInput}
          type="file"
          accept={big ? 'image/*,video/*' : 'image/*'}
          multiple
          hidden
          onChange={(e) => {
            uploadFiles([...(e.target.files ?? [])])
            e.target.value = ''
          }}
        />
      </div>
    ),
    videos: (
      <div className="dpanel__body">
        <button className="ddrop" onClick={() => videoInput.current?.click()}>
          <span className="ddrop__icon" aria-hidden>▶</span>
          <b>{uploading ? `Uploading ${uploading}…` : 'Add videos'}</b>
          <span>MP4, WebM or MOV up to {MAX_VIDEO_MB} MB. Click, or drop them on the page. Press ▶ on a video to watch it.</span>
        </button>
        <input
          ref={videoInput}
          type="file"
          accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v"
          multiple
          hidden
          onChange={(e) => {
            uploadFiles([...(e.target.files ?? [])])
            e.target.value = ''
          }}
        />
        <p className="dpanel__h">From YouTube</p>
        <form
          className="dlink"
          onSubmit={(e) => {
            e.preventDefault()
            if (!YOUTUBE.test(ytLink.url.trim())) return
            add({ kind: 'video', video: null, url: ytLink.url.trim(), a: 0.5625, w: 40, frame: 'none', caption: ytLink.caption.trim() })
            setYtLink({ url: '', caption: '' })
          }}
        >
          <input className="dinput" placeholder="YouTube link (MV, fancam, live…)" value={ytLink.url} onChange={(e) => setYtLink((l) => ({ ...l, url: e.target.value }))} />
          <input className="dinput" placeholder="Caption (optional)" maxLength={80} value={ytLink.caption} onChange={(e) => setYtLink((l) => ({ ...l, caption: e.target.value }))} />
          {ytLink.url && !YOUTUBE.test(ytLink.url.trim()) && <span className="dhint">Use a youtube.com or youtu.be link.</span>}
          <button className="dbtn dbtn--primary" disabled={!YOUTUBE.test(ytLink.url.trim())}>+ Add video</button>
        </form>
      </div>
    ),
    members: (
      <div className="dpanel__body">
        <div className="dmembers">
          {memberList.map((m) => (
            <button
              key={m.slug}
              className="dmember"
              onClick={() => add({ kind: 'member', member: m.slug, a: 1.2, w: 16, frame: 'polaroid', caption: m.stage_name })}
            >
              <MemberAvatar member={m} size="sm" />
              <span>{m.stage_name}</span>
            </button>
          ))}
        </div>
        <p className="dhint">Members without a photo show their emoji. Add photos in Studio → Members.</p>
      </div>
    ),
    stickers: (
      <div className="dpanel__body">
        <p className="dpanel__h">Words</p>
        <div className="dstickers dstickers--wide">
          {Object.keys(LABELS).map((k) => (
            <button key={k} className="dsticker dsticker--wide" onClick={() => addSticker(k)} aria-label={LABELS[k].text}>
              <ItemContent item={{ kind: 'sticker', sticker: k, id: k, x: 0, y: 0, w: 0, r: 0, z: 0 }} photos={{}} members={members} />
            </button>
          ))}
        </div>
        <p className="dpanel__h">Emoji</p>
        <div className="dstickers">
          {EMOJI.map((k) => (
            <button key={k} className="dsticker dsticker--emoji" onClick={() => addSticker(k)}>
              {k}
            </button>
          ))}
        </div>
        <p className="dpanel__h">Doodles &amp; tape</p>
        <div className="dstickers">
          {[...SHAPES, ...TAPES].map((k) => (
            <button key={k} className="dsticker" onClick={() => addSticker(k)} aria-label={k.split(':')[1]}>
              <ItemContent item={{ kind: 'sticker', sticker: k, id: k, x: 0, y: 0, w: 0, r: 0, z: 0 }} photos={{}} members={members} />
            </button>
          ))}
        </div>
      </div>
    ),
    text: (
      <div className="dpanel__body">
        <div className="dpresets">
          {TEXT_PRESETS.map((p) => (
            <button
              key={p.label}
              className="dpreset"
              style={{ fontFamily: FONTS[p.font].family, color: p.color } as CSSProperties}
              onClick={() => {
                add({ kind: 'text', text: p.text, font: p.font, style: p.style, size: p.size, color: p.color, w: p.w, r: p.style === 'plain' ? 0 : tilt() })
                setTimeout(() => textArea.current?.focus(), 30)
              }}
            >
              <span className={`dtext dtext--${p.style}`}>{p.label}</span>
            </button>
          ))}
        </div>
      </div>
    ),
    music: (
      <div className="dpanel__body">
        <input
          className="dinput"
          type="search"
          placeholder="Search SEVENTEEN songs or albums…"
          value={songQuery}
          onChange={(e) => setSongQuery(e.target.value)}
          aria-label="Search songs"
        />
        <p className="dpanel__h">{q ? `${songResults.length} songs` : 'Title tracks'}</p>
        <div className="dsongs">
          {!music.songs.length && <p className="dhint">Loading songs…</p>}
          {songResults.map((s) => {
            const art = artFor(s, music)
            const on = player.current?.id === s.id && player.playing
            return (
              <div key={s.id} className="dsongrow">
                <button
                  className="dsongrow__art"
                  onClick={() => (player.current?.id === s.id ? player.toggle() : player.play(s, [s]))}
                  aria-label={`${on ? 'Pause' : 'Preview'} ${s.title}`}
                  disabled={!s.youtube_url && !s.spotify_url}
                >
                  {art ? <img src={art} alt="" loading="lazy" /> : <span>♫</span>}
                  <i aria-hidden>{on ? '❚❚' : '▶'}</i>
                </button>
                <span className="dsongrow__text">
                  <b>{s.title}</b>
                  <small>{s.album_title}</small>
                </span>
                <button className="dbtn dbtn--small" onClick={() => addSong(s.id)}>
                  + Add
                </button>
              </div>
            )
          })}
        </div>
        <p className="dpanel__h">Any other song</p>
        <form
          className="dlink"
          onSubmit={(e) => {
            e.preventDefault()
            if (!linkOk || !link.title.trim()) return
            addSong(null, { url: link.url.trim(), title: link.title.trim(), artist: link.artist.trim() })
            setLink({ title: '', artist: '', url: '' })
          }}
        >
          <input className="dinput" placeholder="YouTube or Spotify link" value={link.url} onChange={(e) => setLink((l) => ({ ...l, url: e.target.value }))} />
          <div className="dinspect__row">
            <input className="dinput" placeholder="Title" maxLength={100} value={link.title} onChange={(e) => setLink((l) => ({ ...l, title: e.target.value }))} />
            <input className="dinput" placeholder="Artist" maxLength={80} value={link.artist} onChange={(e) => setLink((l) => ({ ...l, artist: e.target.value }))} />
          </div>
          {link.url && !linkOk && <span className="dhint">Use a youtube.com, youtu.be or open.spotify.com link.</span>}
          <button className="dbtn dbtn--primary" disabled={!linkOk || !link.title.trim()}>+ Add song</button>
        </form>
      </div>
    ),
    page: (
      <div className="dpanel__body">
        <p className="dpanel__h">Paper</p>
        <div className="dpapers">
          {(Object.keys(PAPERS) as DiaryPaper[]).map((p) => (
            <button key={p} className={`dpaper paper--${p} ${draft.paper === p ? 'is-on' : ''}`} onClick={() => setDraft((d) => ({ ...d, paper: p }))}>
              <span>{PAPERS[p]}</span>
            </button>
          ))}
        </div>
        <label className="dswitch">
          <input type="checkbox" checked={draft.is_private} onChange={(e) => setDraft((d) => ({ ...d, is_private: e.target.checked }))} />
          <span className="dswitch__track" aria-hidden />
          <span>
            <IconEyeOff /> Private page <small>Only signed-in staff can see it</small>
          </span>
        </label>
      </div>
    ),
  }

  return createPortal(
    <div className="dedit" role="dialog" aria-modal aria-label="Edit diary page">
      <header className="dedit__bar">
        <button className="dbtn" onClick={close}>Cancel</button>
        <div className="dedit__meta">
          {!big && (
            <input
              type="date"
              className="dinput dinput--date"
              value={draft.date ?? ''}
              required
              onChange={(e) => e.target.value && setDraft((d) => ({ ...d, date: e.target.value }))}
              aria-label="Date"
            />
          )}
          <input
            className="dinput dinput--title"
            value={draft.title}
            maxLength={80}
            placeholder={big ? 'Name this page (e.g. Attacca fan meeting)' : 'Title (optional)'}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            aria-label="Title"
          />
        </div>
        <div className="dedit__actions">
          <button className="dbtn dbtn--icon" onClick={undo} disabled={!past.length} aria-label="Undo" title="Undo (Ctrl+Z)">
            <IconUndo />
          </button>
          <button className="dbtn dbtn--icon" onClick={redo} disabled={!future.length} aria-label="Redo" title="Redo (Ctrl+Shift+Z)">
            <IconRedo />
          </button>
          <button className="dbtn dbtn--primary" onClick={save} disabled={saving || uploading > 0}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </header>

      <div className="dedit__body">
        <div
          className="dedit__stage"
          ref={box}
          onPointerDown={() => setSelected(null)}
          onDragOver={(e) => {
            e.preventDefault()
            setDropping(true)
          }}
          onDragLeave={() => setDropping(false)}
          onDrop={dropAt}
        >
          <div className={`dedit__canvas ${dropping ? 'is-over' : ''}`} style={{ width }} ref={canvas}>
            <Sheet page={draft} members={members} photos={photos} videos={videos}>
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`ditem ditem--${item.kind} is-editable ${selected === item.id ? 'is-selected' : ''}`}
                  style={itemStyle(item)}
                  onPointerDown={(e) => startGesture(e, item, 'move')}
                  onDoubleClick={() => item.kind === 'text' && textArea.current?.focus()}
                >
                  <ItemContent item={item} photos={photos} videos={videos} members={members} items={items} />
                  {selected === item.id && (
                    <>
                      <span className="handle handle--rotate" onPointerDown={(e) => startGesture(e, item, 'rotate')} aria-hidden>
                        <IconRotate />
                      </span>
                      <span className="handle handle--scale" onPointerDown={(e) => startGesture(e, item, 'scale')} aria-hidden />
                      <button
                        className="handle handle--delete"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => remove(item.id)}
                        aria-label="Delete"
                      >
                        ×
                      </button>
                    </>
                  )}
                </div>
              ))}
            </Sheet>
            {!items.length && (
              <p className="dedit__empty">
                {big ? 'Add photos, members, songs and videos from the panel ↓' : 'Add photos, members, stickers and notes from the panel ↓'}
              </p>
            )}
          </div>
        </div>

        <aside className="dpanel">
          {error && (
            <p className="dpanel__error" role="alert">
              {error} <button onClick={() => setError(null)} aria-label="Dismiss">×</button>
            </p>
          )}
          {inspector}
          <nav className="dtabs" role="tablist">
            {tabs.map((t) => (
              <button key={t.key} role="tab" aria-selected={tab === t.key} className={tab === t.key ? 'is-on' : ''} onClick={() => setTab(t.key)}>
                {t.label}
              </button>
            ))}
          </nav>
          {panels[tab]}
        </aside>
      </div>
    </div>,
    document.body,
  )
}
