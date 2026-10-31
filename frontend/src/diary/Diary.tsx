import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { toPng } from 'html-to-image'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { ReportDialog } from '../components/ReportDialog'
import { useAlbums, useMembers, useSongs } from '../lib/api'
import { usePlayer } from '../lib/player'
import type { DiaryPage } from '../lib/types'
import { Book } from './Book'
import { ALBUM_BOOK, DIARY_BOOK, diaryApi, longDate, monthLabel, pageName, pageText, todayIso, uid } from './kit'
import type { BookConfig } from './kit'
import { Editor, Reader } from './Editor'
import { IconBook, IconClose, IconEyeOff, IconGrid, IconMenu, IconMore, IconPlus, IconSearch, IconShare, IconTrash } from './Icons'
import { MusicProvider, pageSongs } from './music'
import type { DiaryMusic } from './music'
import { Sheet } from './Sheet'
import { VideoProvider } from './Video'
import type { MemberMap } from './Sheet'
import './diary.css'

type Popup = 'more' | 'menu' | 'new' | 'delete' | null

function Pop({ children, onClose, className = '' }: { children: ReactNode; onClose: () => void; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const out = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && onClose()
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    const t = setTimeout(() => window.addEventListener('pointerdown', out))
    window.addEventListener('keydown', esc)
    return () => {
      clearTimeout(t)
      window.removeEventListener('pointerdown', out)
      window.removeEventListener('keydown', esc)
    }
  }, [onClose])
  return (
    <div ref={ref} className={`dpop ${className}`} role="dialog">
      {children}
    </div>
  )
}

export function Diary() {
  return <Journal book={DIARY_BOOK} />
}

/** Photo albums: the same book, kept for photos, member photos, songs and videos. */
export function Memories() {
  return <Journal book={ALBUM_BOOK} />
}

function Journal({ book }: { book: BookConfig }) {
  const membersApi = useMembers()
  const songsApi = useSongs()
  const albumsApi = useAlbums()
  const player = usePlayer()
  const { account } = useAuth()
  // Signed-in viewers add diary pages and change their own; photo albums are added by admins.
  const canAdd = book.kind === 'diary' ? !!account : !!account?.is_staff
  const [params, setParams] = useSearchParams()

  const [pages, setPages] = useState<DiaryPage[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'book' | 'grid'>('book')
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [currentId, setCurrentId] = useState<number | null>(null)
  const [popup, setPopup] = useState<Popup>(null)
  const [editing, setEditing] = useState<{ page: DiaryPage; isNew: boolean } | null>(null)
  const [reading, setReading] = useState<DiaryPage | null>(null)
  const [newDate, setNewDate] = useState(todayIso())
  const [newTitle, setNewTitle] = useState('')
  const dated = book.kind === 'diary' // photo album pages have no dates
  const [toast, setToast] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [snap, setSnap] = useState<DiaryPage | null>(null) // the page being saved as a picture
  const [reporting, setReporting] = useState<DiaryPage | null>(null) // someone else's page, being reported
  const stopReporting = useCallback(() => setReporting(null), [])
  const snapRef = useRef<HTMLDivElement>(null)

  const members: MemberMap = useMemo(() => Object.fromEntries((membersApi.data ?? []).map((m) => [m.slug, m])), [membersApi.data])
  const music: DiaryMusic = useMemo(
    () => ({
      songs: songsApi.data ?? [],
      byId: Object.fromEntries((songsApi.data ?? []).map((s) => [s.id, s])),
      covers: Object.fromEntries((albumsApi.data ?? []).map((a) => [a.slug, a.cover])),
    }),
    [songsApi.data, albumsApi.data],
  )

  // Reload when the account changes: what you can see and change depends on it.
  const who = account === undefined ? undefined : (account?.username ?? '')
  useEffect(() => {
    if (who === undefined) return
    let alive = true
    diaryApi
      .list(book.kind)
      .then((list) => alive && (setPages(list), setError(null)))
      .catch((e: Error) => alive && setError(e.message))
    return () => {
      alive = false
    }
  }, [who, book.kind])

  const shown = useMemo(() => {
    if (!pages) return []
    const sorted = [...pages].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '') || a.position - b.position || a.id - b.id)
    const q = query.trim().toLowerCase()
    if (!q) return sorted
    const name = (slug: string) => members[slug]?.stage_name ?? ''
    const song = (item: { song: number | null }) => (item.song !== null ? music.byId[item.song]?.title ?? '' : '')
    return sorted.filter((p) => pageText(p, name, song).includes(q))
  }, [pages, query, members, music])

  // Which spread is open: the ?page= link, else the one you were on, else the newest.
  const linked = Number(params.get('page')) || null
  const wanted = currentId ?? linked
  let index = shown.findIndex((p) => p.id === wanted)
  if (index < 0) index = shown.length - 1
  const current = shown[index] ?? null
  const currentSongs = current ? pageSongs(current.items, music) : []
  const playingHere = !!player.current && currentSongs.some((s) => s.id === player.current!.id)

  const go = useCallback(
    (i: number) => {
      const page = shown[i]
      if (!page) return
      setCurrentId(page.id)
      setParams({ page: String(page.id) }, { replace: true })
    },
    [shown, setParams],
  )

  const flash = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2400)
  }

  // Save as image: the page is drawn off screen at a fixed size, then turned into a PNG.
  useEffect(() => {
    if (!snap) return
    let alive = true
    const node = snapRef.current
    const imgs = [...(node?.querySelectorAll('img') ?? [])]
    Promise.all(imgs.map((img) => (img.complete ? null : new Promise((ok) => ((img.onload = ok), (img.onerror = ok))))))
      .then(() => document.fonts?.ready)
      .then(() => (node ? toPng(node, { pixelRatio: 1, cacheBust: true }) : Promise.reject(new Error('nothing to save'))))
      .then((url) => {
        if (!alive) return
        const a = document.createElement('a')
        a.href = url
        a.download = `${pageName(snap).replace(/[^\w\- ]+/g, '').trim() || 'page'}.png`
        a.click()
        flash('Saved as a picture ♡')
      })
      .catch(() => alive && flash('Couldn’t make the picture. Try again?'))
      .finally(() => alive && setSnap(null))
    return () => {
      alive = false
    }
  }, [snap])

  // On this day: diary pages from the same day in earlier years.
  const onThisDay = useMemo(() => {
    if (!dated || !pages) return []
    const t = todayIso()
    return pages.filter((p) => p.date && p.date.slice(5) === t.slice(5) && p.date < t).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
  }, [dated, pages])
  const [hideMemory, setHideMemory] = useState(false)

  // Arrow keys turn pages.
  useEffect(() => {
    if (editing || reading || view !== 'book') return
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, select')) return
      if (e.key === 'ArrowLeft') go(Math.max(0, index - 1))
      if (e.key === 'ArrowRight') go(Math.min(shown.length - 1, index + 1))
      if (e.key === 'Home') go(0)
      if (e.key === 'End') go(shown.length - 1)
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [editing, reading, view, go, index, shown.length])

  const replace = (page: DiaryPage) => setPages((ps) => (ps ?? []).map((p) => (p.id === page.id ? page : p)))

  const create = async (date: string | null, title = '') => {
    setBusy(true)
    try {
      const page = await diaryApi.create({ book: book.kind, date, title: title.trim(), paper: book.paper })
      setPages((ps) => [...(ps ?? []), page])
      setQuery('')
      setCurrentId(page.id)
      setParams({ page: String(page.id) }, { replace: true })
      setPopup(null)
      setEditing({ page, isNew: true })
    } catch (e) {
      flash((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const duplicate = async (page: DiaryPage) => {
    // Uploaded photos and videos belong to their page, so the copy keeps everything else.
    const items = page.items
      .filter((i) => i.kind !== 'photo' && !(i.kind === 'video' && i.video !== null))
      .map((i) => ({ ...i, id: uid() }))
    try {
      const copy = await diaryApi.create({ book: book.kind, date: page.date, title: page.title, paper: page.paper, items, is_private: page.is_private })
      setPages((ps) => [...(ps ?? []), copy])
      setCurrentId(copy.id)
      flash(page.items.length > items.length ? 'Copied (uploaded photos and videos stay on the original page)' : 'Page copied')
    } catch (e) {
      flash((e as Error).message)
    }
    setPopup(null)
  }

  const togglePrivate = async (page: DiaryPage) => {
    try {
      replace(await diaryApi.save(page.id, { is_private: !page.is_private }))
      flash(page.is_private ? 'Everyone can see this page now' : 'Only you (and admins) can see this page now')
    } catch (e) {
      flash((e as Error).message)
    }
    setPopup(null)
  }

  const remove = async (page: DiaryPage) => {
    try {
      await diaryApi.remove(page.id)
      setPages((ps) => (ps ?? []).filter((p) => p.id !== page.id))
      setCurrentId(shown[index - 1]?.id ?? shown[index + 1]?.id ?? null)
    } catch (e) {
      flash((e as Error).message)
    }
    setPopup(null)
  }

  const share = async (page: DiaryPage) => {
    const url = `${location.origin}${book.path}?page=${page.id}`
    const title = pageName(page)
    try {
      if (navigator.share) await navigator.share({ title, url })
      else {
        await navigator.clipboard.writeText(url)
        flash('Link copied')
      }
    } catch {
      /* closed the share sheet */
    }
  }

  const jumpTo = (date: string) => {
    if (!date || !shown.length) return
    // The first page on or after that date, else the last one before it.
    const i = shown.findIndex((p) => (p.date ?? '') >= date)
    go(i < 0 ? shown.length - 1 : i)
    setView('book')
    setPopup(null)
  }

  const openPage = (page: DiaryPage) => (page.can_edit ? setEditing({ page, isNew: false }) : setReading(page))

  const addClick = () => {
    if (!canAdd) return
    setNewDate(todayIso())
    setNewTitle('')
    setPopup('new')
  }

  const closeEditor = async () => {
    const e = editing
    setEditing(null)
    // A brand-new page you didn't put anything on isn't kept.
    if (e?.isNew) {
      const saved = pages?.find((p) => p.id === e.page.id)
      if (saved && !saved.items.length && !saved.title) {
        await diaryApi.remove(saved.id).catch(() => null)
        setPages((ps) => (ps ?? []).filter((p) => p.id !== saved.id))
        setCurrentId(null)
      }
    }
  }

  const months = useMemo(() => {
    const groups: { label: string; items: { page: DiaryPage; i: number }[] }[] = []
    shown.forEach((page, i) => {
      const label = page.date ? monthLabel(page.date) : ''
      if (groups[groups.length - 1]?.label !== label) groups.push({ label, items: [] })
      groups[groups.length - 1].items.push({ page, i })
    })
    return groups.reverse()
  }, [shown])

  const total = pages?.length ?? 0
  const count = query ? `${shown.length} of ${total} pages` : `${total} ${total === 1 ? 'Page' : 'Pages'}`

  return (
    <MusicProvider value={music}>
      <VideoProvider>
        <section className={`diary diary--${view} diary--${book.kind}`}>
          <header className="diary__top">
            <div className="diary__views" role="group" aria-label="View">
              <button className={`dcircle ${view === 'book' ? 'is-on' : ''}`} onClick={() => setView('book')} aria-label="Book view" aria-pressed={view === 'book'}>
                <IconBook />
              </button>
              <button className={`dcircle ${view === 'grid' ? 'is-on' : ''}`} onClick={() => setView('grid')} aria-label="All pages" aria-pressed={view === 'grid'}>
                <IconGrid />
              </button>
            </div>

            <div className="diary__title">
              <h1>{book.title}</h1>
              <p>
                {current?.is_private && view === 'book' && (
                  <span className="diary__private" title="This page is private">
                    <IconEyeOff />
                  </span>
                )}
                {count}
              </p>
            </div>

            <div className="diary__tools-top">
              <div className={`dsearch ${searching || query ? 'is-open' : ''}`}>
                <input
                  className="dsearch__input"
                  placeholder={book.search}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setCurrentId(null)
                  }}
                  onBlur={() => setSearching(false)}
                  aria-label={`Search ${book.title.toLowerCase()}`}
                  tabIndex={searching || query ? 0 : -1}
                />
                {query && (
                  <button className="dsearch__clear" onClick={() => setQuery('')} aria-label="Clear search">
                    <IconClose />
                  </button>
                )}
                <button
                  className="dcircle"
                  aria-label="Search"
                  onClick={() => {
                    setSearching(true)
                    setTimeout(() => (document.querySelector('.dsearch__input') as HTMLInputElement | null)?.focus())
                  }}
                >
                  <IconSearch />
                </button>
              </div>
              <div className="dpop-anchor">
                <button className="dcircle" aria-label={`${book.title} menu`} aria-expanded={popup === 'menu'} onClick={() => setPopup(popup === 'menu' ? null : 'menu')}>
                  <IconMenu />
                </button>
                {popup === 'menu' && (
                  <Pop onClose={() => setPopup(null)} className="dpop--right">
                    {dated && (
                    <label className="dpop__field">
                      Jump to a date
                      <input type="date" className="dinput" onChange={(e) => jumpTo(e.target.value)} />
                    </label>
                    )}
                    <button onClick={() => (go(0), setPopup(null))} disabled={!shown.length}>⇤ First page</button>
                    <button onClick={() => (go(shown.length - 1), setPopup(null))} disabled={!shown.length}>Latest page ⇥</button>
                    {canAdd && dated && (
                      <button
                        onClick={() => {
                          const today = shown.find((p) => p.date === todayIso())
                          if (today) go(shown.indexOf(today))
                          else create(todayIso())
                          setPopup(null)
                        }}
                      >
                        ✎ Today’s page
                      </button>
                    )}
                  </Pop>
                )}
              </div>
            </div>
          </header>

          {onThisDay.length > 0 && !hideMemory && !query && (
            <div className="diary__memory" role="note">
              <span aria-hidden>🕰️</span>
              <span>
                <b>On this day</b> ·{' '}
                {onThisDay.slice(0, 3).map((p, k) => {
                  const years = Number(todayIso().slice(0, 4)) - Number(p.date!.slice(0, 4))
                  return (
                    <button
                      key={p.id}
                      className="diary__memory-link"
                      onClick={() => {
                        const i = shown.findIndex((x) => x.id === p.id)
                        if (i >= 0) go(i)
                        setView('book')
                      }}
                    >
                      {k > 0 && ', '}
                      {years} year{years === 1 ? '' : 's'} ago{p.title ? `: “${p.title}”` : ''}
                      {p.author_name && ` by ${p.author_name}`}
                    </button>
                  )
                })}
              </span>
              <button className="diary__memory-close" onClick={() => setHideMemory(true)} aria-label="Hide">
                <IconClose />
              </button>
            </div>
          )}

          {error && (
            <div className="diary__empty">
              <p><b>Couldn’t reach the backend</b> ({error}).</p>
              <p className="diary__muted">Is Django running? In the backend folder run <code>python manage.py runserver</code>.</p>
            </div>
          )}
          {!pages && !error && <div className="diary__empty"><span className="status__diamond" aria-hidden>◆</span> Opening…</div>}

          {pages && !shown.length && (
            <div className="diary__empty">
              {query ? (
                <p>No pages match “{query}”.</p>
              ) : (
                <div className="diary__cover">
                  <span className="diary__cover-gem" aria-hidden>◆</span>
                  <b>{book.cover}</b>
                  <span>{canAdd ? (book.kind === 'album' ? 'Tap + to start your first page of memories.' : 'Tap + to write your first page.') : 'Nothing here yet.'}</span>
                </div>
              )}
            </div>
          )}

          {view === 'book' && current && (
            <>
              <Book pages={shown} index={index} members={members} onIndex={go} onOpen={openPage} big={book.big} />
              <p className="diary__when">
                {current.date ? longDate(current.date) : <b>{current.title || 'Untitled page'}</b>}
                {current.date && current.title && <b> · {current.title}</b>}
                {current.author_name && <span className="diary__by"> · by {current.author_name}</span>}
                <button className="diary__open" onClick={() => openPage(current)}>
                  {current.can_edit ? '✎ Edit page' : '⤢ View page'}
                </button>
                {currentSongs.length > 0 && (
                  <button
                    className="diary__open diary__open--music"
                    onClick={() => (playingHere ? player.toggle() : player.play(currentSongs[0], currentSongs))}
                  >
                    {playingHere && player.playing ? '❚❚ Pause' : `♫ Play page songs (${currentSongs.length})`}
                  </button>
                )}
              </p>
              {shown.length > 1 && (
                <input
                  className="diary__scrub"
                  type="range"
                  min={0}
                  max={shown.length - 1}
                  value={index}
                  onChange={(e) => go(Number(e.target.value))}
                  aria-label="Scroll through pages"
                  style={{ '--p': `${(index / (shown.length - 1)) * 100}%` } as CSSProperties}
                />
              )}
            </>
          )}

          {view === 'grid' && shown.length > 0 && (
            <div className="dgrid">
              {months.map((m) => (
                <div key={m.label} className="dgrid__month">
                  <h2>{m.label}</h2>
                  <div className="dgrid__pages">
                    {[...m.items].reverse().map(({ page, i }) => (
                      <button
                        key={page.id}
                        className={`dthumb ${page.id === current?.id ? 'is-current' : ''}`}
                        onClick={() => {
                          go(i)
                          setView('book')
                        }}
                      >
                        <div className="dthumb__sheet">
                          <Sheet page={page} members={members} />
                        </div>
                        <span className="dthumb__label">
                          {page.is_private && <IconEyeOff />}
                          {page.date && longDate(page.date)}
                          {(page.title || !page.date) && <b>{page.title || 'Untitled page'}</b>}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {reporting && <ReportDialog kind="diary" targetId={reporting.id} what={`“${pageName(reporting)}”`} onClose={stopReporting} />}

          <footer className="diary__bar">
            <div className="dpop-anchor">
              <button className="dcircle" aria-label="More" disabled={!current} onClick={() => setPopup(popup === 'more' ? null : 'more')}>
                <IconMore />
              </button>
              {popup === 'more' && current && (
                <Pop onClose={() => setPopup(null)} className="dpop--up">
                  <button onClick={() => (openPage(current), setPopup(null))}>{current.can_edit ? '✎ Edit page' : '⤢ Open page'}</button>
                  {/* a copy is yours, so anyone who can add pages can copy one */}
                  {canAdd && <button onClick={() => duplicate(current)}>⧉ Duplicate</button>}
                  {current.can_edit && (
                    <button onClick={() => togglePrivate(current)}>{current.is_private ? '◉ Make public' : '◌ Make private'}</button>
                  )}
                  <button onClick={() => (setSnap(current), setPopup(null))} disabled={!!snap}>⤓ Save as image</button>
                  <button onClick={() => (setView(view === 'book' ? 'grid' : 'book'), setPopup(null))}>{view === 'book' ? '▦ All pages' : '📖 Book view'}</button>
                  {/* someone else's public diary page: tell the admins if something's wrong with it */}
                  {book.kind === 'diary' && !current.can_edit && !current.is_private && (
                    <button onClick={() => (setReporting(current), setPopup(null))}>⚑ Report page</button>
                  )}
                </Pop>
              )}
            </div>
            <button className="dcircle" aria-label="Share" disabled={!current} onClick={() => current && share(current)}>
              <IconShare />
            </button>
            {current?.can_edit && (
              <div className="dpop-anchor">
                <button className="dcircle" aria-label="Delete page" disabled={!current} onClick={() => setPopup('delete')}>
                  <IconTrash />
                </button>
                {popup === 'delete' && current && (
                  <Pop onClose={() => setPopup(null)} className="dpop--up">
                    <p className="dpop__text">
                      Delete <b>{pageName(current)}</b>? Its photos and videos are deleted too.
                    </p>
                    <div className="dpop__row">
                      <button className="dbtn" onClick={() => setPopup(null)}>Keep</button>
                      <button className="dbtn dbtn--danger" onClick={() => remove(current)}>Delete</button>
                    </div>
                  </Pop>
                )}
              </div>
            )}
            <div className="dpop-anchor">
              {/* Photo albums are made by admins only: viewers don't get an add button there. */}
              {canAdd && (
                <button className="dcircle" aria-label="New page" onClick={addClick}>
                  <IconPlus />
                </button>
              )}
              {popup === 'new' && (
                <Pop onClose={() => setPopup(null)} className="dpop--up">
                  <form
                    className="dform"
                    onSubmit={(e) => {
                      e.preventDefault()
                      create(dated ? newDate : null, newTitle)
                    }}
                  >
                    <b>New page</b>
                    {dated ? (
                      <input type="date" className="dinput" value={newDate} onChange={(e) => setNewDate(e.target.value)} required autoFocus />
                    ) : (
                      <input className="dinput" placeholder="Name it (optional), e.g. Attacca fan meeting" maxLength={80} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} autoFocus />
                    )}
                    <button className="dbtn dbtn--primary" disabled={busy || (dated && !newDate)}>{busy ? 'Opening…' : book.kind === 'album' ? 'Start the page' : 'Start writing'}</button>
                  </form>
                </Pop>
              )}
            </div>
          </footer>

          {toast && <div className="dtoast" role="status">{toast}</div>}

          {snap && (
            <div className="diary__snap" aria-hidden>
              <div ref={snapRef} className="diary__snap-sheet">
                <Sheet page={snap} members={members} />
              </div>
            </div>
          )}

          {editing && (
            <Editor
              key={editing.page.id}
              book={book}
              page={editing.page}
              members={members}
              memberList={membersApi.data ?? []}
              isNew={editing.isNew}
              onClose={closeEditor}
              onSaved={(page) => {
                replace(page)
                setEditing(null)
                setCurrentId(page.id)
                flash('Saved ♡')
              }}
            />
          )}
          {reading && <Reader page={reading} members={members} onClose={() => setReading(null)} />}
        </section>
      </VideoProvider>
    </MusicProvider>
  )
}

