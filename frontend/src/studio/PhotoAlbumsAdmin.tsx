import { useState } from 'react'
import type { DragEvent, FormEvent } from 'react'
import { Loading } from '../components/Status'
import { ALBUM_BOOK, diaryApi, uid } from '../diary/kit'
import { useStudioData } from '../lib/studio'
import type { DiaryPage } from '../lib/types'
import { useToast } from './ui'

type Filter = 'all' | 'public' | 'private' | 'empty'

function counts(page: DiaryPage) {
  const n = { photos: 0, members: 0, songs: 0, videos: 0 }
  for (const i of page.items) {
    if (i.kind === 'photo') n.photos++
    else if (i.kind === 'member') n.members++
    else if (i.kind === 'song') n.songs++
    else if (i.kind === 'video') n.videos++
  }
  return n
}

/** The first uploaded photo on the page, for the row's thumbnail. */
function cover(page: DiaryPage) {
  for (const i of page.items) if (i.kind === 'photo' && page.photos[String(i.photo)]) return page.photos[String(i.photo)]
  return null
}

function words(page: DiaryPage) {
  return [page.title, ...page.items.map((i) => ('caption' in i ? i.caption : 'title' in i ? (i.title ?? '') : ''))].join(' ').toLowerCase()
}

const pageLink = (page: DiaryPage) => `${ALBUM_BOOK.path}?page=${page.id}`

function NewPage({ onAdded, onCancel }: { onAdded: (p: DiaryPage) => void; onCancel: () => void }) {
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      onAdded(await diaryApi.create({ book: 'album', title: title.trim(), paper: ALBUM_BOOK.paper }))
    } catch (err) {
      toast((err as Error).message, 'error')
      setBusy(false)
    }
  }
  return (
    <form className="card studio-card pa-new" onSubmit={submit}>
      <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Page title, e.g. Follow tour Seoul" aria-label="Page title" autoFocus />
      <button type="button" className="btn btn--ghost btn--small" onClick={onCancel}>Cancel</button>
      <button className="btn btn--small" disabled={busy}>{busy ? 'Adding…' : 'Add page'}</button>
    </form>
  )
}

/** Every Memories photo album page: add, rename, reorder, hide, copy or delete them. */
export function PhotoAlbumsAdmin() {
  const toast = useToast()
  const { data: pages, setData, error } = useStudioData<DiaryPage[]>('/diary/?book=album')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [busy, setBusy] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)
  const [renaming, setRenaming] = useState<{ id: number; title: string } | null>(null)
  const [dragging, setDragging] = useState<number | null>(null)

  if (error) return <p className="studio-error">{error}</p>
  if (!pages) return <Loading />

  const ordered = [...pages].sort((a, b) => a.position - b.position || a.id - b.id)
  const put = (fresh: DiaryPage) => setData(pages.map((p) => (p.id === fresh.id ? fresh : p)))

  const run = async (page: DiaryPage, job: () => Promise<void>) => {
    setBusy(page.id)
    try {
      await job()
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(null)
    }
  }

  const saveOrder = async (next: DiaryPage[]) => {
    const before = pages
    // show the new order at once; the server's answer replaces it
    setData(next.map((p, i) => ({ ...p, position: i + 1 })))
    try {
      setData(await diaryApi.reorder(next.map((p) => p.id)))
    } catch (e) {
      setData(before)
      toast((e as Error).message, 'error')
    }
  }
  const move = (from: number, to: number) => {
    if (to < 0 || to >= ordered.length || from === to) return
    const next = [...ordered]
    next.splice(to, 0, ...next.splice(from, 1))
    saveOrder(next)
  }

  const rename = (page: DiaryPage, title: string) => {
    setRenaming(null)
    if (title.trim() === page.title) return
    run(page, async () => {
      put(await diaryApi.save(page.id, { title }))
      toast('Renamed')
    })
  }
  const togglePrivate = (page: DiaryPage) =>
    run(page, async () => {
      put(await diaryApi.save(page.id, { is_private: !page.is_private }))
      toast(page.is_private ? 'Everyone can see this page now' : 'Only admins can see this page now')
    })
  const duplicate = (page: DiaryPage) =>
    run(page, async () => {
      // Uploaded photos and videos belong to their page, so the copy keeps everything else.
      const items = page.items.filter((i) => i.kind !== 'photo' && !(i.kind === 'video' && i.video !== null)).map((i) => ({ ...i, id: uid() }))
      const copy = await diaryApi.create({ book: 'album', title: page.title ? `${page.title} (copy)` : '', paper: page.paper, items, is_private: page.is_private })
      setData([...pages, copy])
      toast(page.items.length > items.length ? 'Copied to the end (uploaded photos and videos stay on the original)' : 'Copied to the end')
    })
  const remove = (page: DiaryPage) => {
    const n = counts(page)
    const files = n.photos + n.videos
    if (!window.confirm(`Delete "${page.title || 'Untitled page'}"?${files ? ` Its ${files} uploaded photo${files === 1 ? '' : 's'} and video${files === 1 ? '' : 's'} go too.` : ''} This can't be undone.`)) return
    run(page, async () => {
      await diaryApi.remove(page.id)
      setData(pages.filter((p) => p.id !== page.id))
      toast('Page deleted')
    })
  }

  const q = query.trim().toLowerCase()
  const list = ordered.filter(
    (p) =>
      (!q || words(p).includes(q)) &&
      (filter === 'all' || (filter === 'public' && !p.is_private) || (filter === 'private' && p.is_private) || (filter === 'empty' && p.items.length === 0)),
  )
  // Reordering only makes sense when every page is in view.
  const canMove = !q && filter === 'all'
  const totals = pages.reduce(
    (t, p) => {
      const n = counts(p)
      return { photos: t.photos + n.photos, videos: t.videos + n.videos, hidden: t.hidden + (p.is_private ? 1 : 0) }
    },
    { photos: 0, videos: 0, hidden: 0 },
  )

  const drop = (e: DragEvent, to: number) => {
    e.preventDefault()
    const from = ordered.findIndex((p) => p.id === dragging)
    setDragging(null)
    if (from >= 0) move(from, to)
  }

  return (
    <div className="studio-page">
      <header className="studio-head studio-head--row">
        <div>
          <p className="eyebrow">Album management</p>
          <h1>Photo albums</h1>
          <p className="muted">
            The pages of <a href={ALBUM_BOOK.path} target="_blank" rel="noreferrer">Memories</a>, in the order fans flip through them. Open a page there to lay out its photos.
          </p>
        </div>
        {!adding && <button className="btn" onClick={() => setAdding(true)}>+ New page</button>}
      </header>

      <section className="ov-stats ov-stats--4">
        <div className="ov-stat card"><span className="ov-stat__num">{pages.length}</span><span className="ov-stat__label">pages</span></div>
        <div className="ov-stat card"><span className="ov-stat__num">{totals.photos}</span><span className="ov-stat__label">photos</span></div>
        <div className="ov-stat card"><span className="ov-stat__num">{totals.videos}</span><span className="ov-stat__label">videos</span></div>
        <div className="ov-stat card"><span className="ov-stat__num">{totals.hidden}</span><span className="ov-stat__label">admins only</span></div>
      </section>

      {adding && (
        <NewPage
          onCancel={() => setAdding(false)}
          onAdded={(p) => {
            setData([...pages, p])
            setAdding(false)
            toast('Page added at the end')
          }}
        />
      )}

      <section className="card studio-card">
        <div className="fans__bar">
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search titles and captions…" aria-label="Search photo album pages" />
          <div className="al-list__filters">
            {(
              [
                ['all', 'All'],
                ['public', 'Public'],
                ['private', 'Admins only'],
                ['empty', 'Empty'],
              ] as const
            ).map(([v, l]) => (
              <button key={v} className={`chip ${filter === v ? 'is-on' : ''}`} onClick={() => setFilter(v)}>{l}</button>
            ))}
          </div>
          {!canMove && <span className="muted small">Clear the search and filter to reorder.</span>}
        </div>

        <ol className="pa-list">
          {list.map((page) => {
            const i = ordered.indexOf(page)
            const n = counts(page)
            const img = cover(page)
            const off = busy === page.id
            return (
              <li
                key={page.id}
                className={`pa-row ${page.is_private ? 'is-private' : ''} ${dragging === page.id ? 'is-dragging' : ''}`}
                draggable={canMove && !renaming}
                onDragStart={() => setDragging(page.id)}
                onDragEnd={() => setDragging(null)}
                onDragOver={(e) => canMove && dragging !== null && e.preventDefault()}
                onDrop={(e) => drop(e, i)}
              >
                <span className="pa-row__num" title={canMove ? 'Drag to move' : undefined}>{canMove && <span className="pa-row__grip" aria-hidden>⠿</span>}{i + 1}</span>
                <span className="pa-row__thumb">{img ? <img src={img} alt="" loading="lazy" /> : <span aria-hidden>▣</span>}</span>
                <span className="pa-row__who">
                  {renaming?.id === page.id ? (
                    <form onSubmit={(e) => (e.preventDefault(), rename(page, renaming.title))}>
                      <input
                        value={renaming.title}
                        onChange={(e) => setRenaming({ id: page.id, title: e.target.value })}
                        onBlur={() => rename(page, renaming.title)}
                        onKeyDown={(e) => e.key === 'Escape' && setRenaming(null)}
                        maxLength={80}
                        aria-label="Page title"
                        autoFocus
                      />
                    </form>
                  ) : (
                    <b>{page.title || <span className="muted">Untitled page</span>}</b>
                  )}
                  <small>
                    {n.photos} photo{n.photos === 1 ? '' : 's'} · {n.videos} video{n.videos === 1 ? '' : 's'} · {n.songs} song{n.songs === 1 ? '' : 's'} · {n.members} member photo{n.members === 1 ? '' : 's'}
                  </small>
                </span>
                <span className={`fan__role ${page.is_private ? '' : 'is-admin'}`}>{page.is_private ? 'Admins only' : 'Public'}</span>
                <span className="fan__actions">
                  {canMove && (
                    <>
                      <button className="btn btn--small btn--ghost" disabled={i === 0} onClick={() => move(i, i - 1)} aria-label={`Move ${page.title || 'page'} up`}>↑</button>
                      <button className="btn btn--small btn--ghost" disabled={i === ordered.length - 1} onClick={() => move(i, i + 1)} aria-label={`Move ${page.title || 'page'} down`}>↓</button>
                    </>
                  )}
                  <a className="btn btn--small" href={pageLink(page)} target="_blank" rel="noreferrer">Open</a>
                  <details className="um-more">
                    <summary aria-label={`More for ${page.title || 'this page'}`}>⋯</summary>
                    {/* picking anything closes the menu */}
                    <div className="um-more__menu" onClick={(e) => ((e.currentTarget.parentElement as HTMLDetailsElement).open = false)}>
                      <button disabled={off} onClick={() => setRenaming({ id: page.id, title: page.title })}>Rename</button>
                      <button disabled={off} onClick={() => togglePrivate(page)}>{page.is_private ? 'Show to everyone' : 'Hide (admins only)'}</button>
                      <button disabled={off} onClick={() => duplicate(page)}>Duplicate</button>
                      {canMove && i > 0 && <button disabled={off} onClick={() => move(i, 0)}>Move to the start</button>}
                      {canMove && i < ordered.length - 1 && <button disabled={off} onClick={() => move(i, ordered.length - 1)}>Move to the end</button>}
                      <button className="is-danger" disabled={off} onClick={() => remove(page)}>Delete page</button>
                    </div>
                  </details>
                </span>
              </li>
            )
          })}
          {list.length === 0 && <li className="muted small fans__empty">{pages.length ? 'No pages match.' : 'No photo album pages yet. Add one to start.'}</li>}
        </ol>
      </section>
    </div>
  )
}
