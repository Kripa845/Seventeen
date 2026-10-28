import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Loading } from '../components/Status'
import { CARAT_THEME } from '../lib/color'
import { spotifyEmbed } from '../lib/player'
import { send, upload, useStudioData } from '../lib/studio'
import { useTheme } from '../lib/theme'
import type { Album, Song, ThemeTokens } from '../lib/types'
import { ImageDrop } from './ImageDrop'
import { ThemeEditor } from './ThemeEditor'
import type { Preset } from './ThemeEditor'
import { TracksEditor } from './TracksEditor'
import { Field, SaveBar, Segmented, useToast } from './ui'

const KINDS = [
  ['mini', 'Mini album'],
  ['studio', 'Studio album'],
  ['repackage', 'Repackage'],
  ['special', 'Special album'],
  ['best', 'Best album'],
  ['single', 'Single album'],
] as const

type Lang = Album['language']
type Filter = 'all' | Lang | 'todo'

function Art({ a, size = 44 }: { a: Album; size?: number }) {
  return a.cover ? (
    <img className="al-art" src={a.cover} alt="" width={size} height={size} />
  ) : (
    <span
      className="al-art al-art--orb"
      style={{ width: size, height: size, background: `conic-gradient(from 120deg, ${a.theme.accent}, ${a.theme.accent2}, ${a.theme.accent})` }}
      aria-hidden
    />
  )
}

/* ---------- details ---------- */

const DETAIL_FIELDS = ['title', 'kind', 'language', 'release_date', 'era_mood', 'spotify_url'] as const
type Details = Pick<Album, (typeof DETAIL_FIELDS)[number]>
const pickDetails = (a: Album): Details => Object.fromEntries(DETAIL_FIELDS.map((k) => [k, a[k]])) as Details

function DetailsTab({ album, onSaved, onDeleted }: { album: Album; onSaved: (a: Album) => void; onDeleted: () => void }) {
  const toast = useToast()
  const [saved, setSaved] = useState(pickDetails(album))
  const [draft, setDraft] = useState(saved)
  const [busy, setBusy] = useState(false)
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)
  const set = <K extends keyof Details>(k: K, v: Details[K]) => setDraft({ ...draft, [k]: v })
  const spotifyBad = !!draft.spotify_url && !spotifyEmbed(draft.spotify_url)

  const save = async () => {
    setBusy(true)
    try {
      const fresh = await send<Album>('PATCH', `/albums/${album.slug}/`, draft)
      setSaved(pickDetails(fresh))
      setDraft(pickDetails(fresh))
      onSaved(fresh)
      toast(`${fresh.title} saved`)
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const cover = async (file: File | null) => {
    const fresh = file
      ? await upload<Album>(`/albums/${album.slug}/`, 'cover', file)
      : await send<Album>('PATCH', `/albums/${album.slug}/`, { cover: null })
    onSaved(fresh)
    toast(file ? 'Cover updated' : 'Cover removed')
  }

  const destroy = async () => {
    const n = album.songs?.length ?? 0
    if (!window.confirm(`Delete “${album.title}” and its ${n} songs? This can’t be undone.`)) return
    try {
      await send('DELETE', `/albums/${album.slug}/`)
      toast(`Deleted ${album.title}`)
      onDeleted()
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }

  return (
    <>
      <section className="card studio-card al-details">
        <ImageDrop
          src={album.cover}
          label="Cover"
          placeholder={<Art a={album} size={120} />}
          onUpload={(f) => cover(f)}
          onRemove={() => cover(null)}
        />
        <div className="form-grid">
          <Field label="Title" wide><input value={draft.title} onChange={(e) => set('title', e.target.value)} /></Field>
          <Field label="Type">
            <select value={draft.kind} onChange={(e) => set('kind', e.target.value)}>
              {KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          <Field label="Release date"><input type="date" value={draft.release_date} onChange={(e) => set('release_date', e.target.value)} /></Field>
          <Segmented<Lang>
            label="Release"
            value={draft.language}
            onChange={(v) => set('language', v)}
            options={[{ value: 'ko', label: 'Korean' }, { value: 'ja', label: 'Japanese' }]}
          />
          <Field label="Era mood" hint="One line, shown on cards and Now Playing" wide>
            <input value={draft.era_mood} maxLength={200} onChange={(e) => set('era_mood', e.target.value)} />
          </Field>
          <Field
            label="Spotify album link"
            hint={spotifyBad ? 'That doesn’t look like a Spotify album link.' : 'Adds a “Full album on Spotify” button.'}
            wide
          >
            <input value={draft.spotify_url} placeholder="https://open.spotify.com/album/…" onChange={(e) => set('spotify_url', e.target.value.trim())} />
          </Field>
        </div>
      </section>

      <section className="card studio-card danger">
        <div>
          <h2>Delete this album</h2>
          <p className="muted small">Removes the album, its cover and all its songs from the site.</p>
        </div>
        <button className="btn btn--ghost btn--small danger__btn" onClick={destroy}>Delete album</button>
      </section>

      <SaveBar dirty={dirty} busy={busy} onSave={save} onDiscard={() => setDraft(saved)} />
    </>
  )
}

/* ---------- theme ---------- */

function ThemeTab({ album, presets, onSaved }: { album: Album; presets: Preset[]; onSaved: (a: Album) => void }) {
  const toast = useToast()
  const [saved, setSaved] = useState<ThemeTokens>(album.theme)
  const [theme, setTheme] = useState<ThemeTokens>(album.theme)
  const [busy, setBusy] = useState(false)

  const save = async () => {
    setBusy(true)
    try {
      const fresh = await send<Album>('PATCH', `/albums/${album.slug}/`, { theme })
      setSaved(fresh.theme)
      onSaved(fresh)
      toast(`${album.title} theme saved`)
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <section className="card studio-card">
        <div className="studio-card__head">
          <h2>Era colours</h2>
          <Link className="link-arrow small" to={`/discography/${album.slug}`} target="_blank">See the era page ↗</Link>
        </div>
        <p className="muted small">Opening this album on the site restyles the whole page with these colours.</p>
        <ThemeEditor value={theme} onChange={setTheme} presets={presets.filter((p) => p.label !== album.title)} />
      </section>
      <SaveBar dirty={JSON.stringify(theme) !== JSON.stringify(saved)} busy={busy} onSave={save} onDiscard={() => setTheme(saved)} />
    </>
  )
}

/* ---------- new album ---------- */

function NewAlbum({ onCreated, onCancel }: { onCreated: (a: Album) => void; onCancel: () => void }) {
  const toast = useToast()
  const { site } = useTheme()
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState('mini')
  const [language, setLanguage] = useState<Lang>('ko')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const album = await send<Album>('POST', '/albums/', {
        title: title.trim(),
        kind,
        language,
        release_date: date,
        theme: site?.theme ?? CARAT_THEME,
      })
      toast(`Created ${album.title}`)
      onCreated(album)
    } catch (err) {
      toast((err as Error).message, 'error')
      setBusy(false)
    }
  }

  return (
    <form className="al-new card" onSubmit={submit}>
      <p className="eyebrow">New album</p>
      <Field label="Title"><input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus required /></Field>
      <div className="al-new__row">
        <Field label="Type">
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            {KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <Field label="Released"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></Field>
      </div>
      <Segmented<Lang> label="Release" value={language} onChange={setLanguage} options={[{ value: 'ko', label: 'Korean' }, { value: 'ja', label: 'Japanese' }]} />
      <div className="al-new__actions">
        <button type="button" className="btn btn--ghost btn--small" onClick={onCancel}>Cancel</button>
        <button className="btn btn--small" disabled={busy || !title.trim()}>{busy ? 'Creating…' : 'Create'}</button>
      </div>
    </form>
  )
}

/* ---------- page ---------- */

export function AlbumsEditor() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const list = useStudioData<Album[]>('/albums/')
  const songs = useStudioData<Song[]>('/songs/')
  const detail = useStudioData<Album>(slug ? `/albums/${slug}/` : null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [creating, setCreating] = useState(false)
  const [tab, setTab] = useState<'details' | 'theme' | 'tracks'>('tracks')

  const noLink = useMemo(() => {
    const m = new Map<string, number>()
    for (const s of songs.data ?? []) if (!s.youtube_url && !s.spotify_url) m.set(s.album_slug, (m.get(s.album_slug) ?? 0) + 1)
    return m
  }, [songs.data])

  if (list.error) return <p className="studio-error">{list.error}</p>
  if (!list.data) return <Loading />

  const albums = [...list.data].reverse()
  const q = query.trim().toLowerCase()
  const visible = albums.filter(
    (a) =>
      (!q || a.title.toLowerCase().includes(q) || a.title_track.toLowerCase().includes(q)) &&
      (filter === 'all' || (filter === 'todo' ? !a.cover || noLink.has(a.slug) : a.language === filter)),
  )
  const presets: Preset[] = albums.map((a) => ({ label: a.title, theme: a.theme }))
  const album = detail.data && detail.data.slug === slug ? detail.data : null
  const refresh = () => {
    list.reload()
    songs.reload()
  }

  return (
    <div className="studio-page studio-split">
      <aside className="studio-split__list al-list">
        <div className="al-list__head">
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search albums or songs…" aria-label="Search albums" />
          <button className="btn btn--small" onClick={() => setCreating(true)}>+ New</button>
        </div>
        <div className="al-list__filters">
          {(
            [
              ['all', 'All'],
              ['ko', 'Korean'],
              ['ja', 'Japanese'],
              ['todo', 'Needs work'],
            ] as const
          ).map(([v, l]) => (
            <button key={v} className={`chip ${filter === v ? 'is-on' : ''}`} onClick={() => setFilter(v)}>{l}</button>
          ))}
        </div>
        {creating && (
          <NewAlbum
            onCancel={() => setCreating(false)}
            onCreated={(a) => {
              setCreating(false)
              refresh()
              setTab('details')
              navigate(`/studio/music/${a.slug}`)
            }}
          />
        )}
        <ul className="al-items">
          {visible.map((a) => (
            <li key={a.slug}>
              <button className={`al-item ${a.slug === slug ? 'is-on' : ''}`} onClick={() => navigate(`/studio/music/${a.slug}`)}>
                <Art a={a} />
                <span className="al-item__text">
                  <b>{a.title}</b>
                  <small>{a.release_date.slice(0, 4)} · {a.title_track || a.kind}</small>
                </span>
                <span className="al-item__flags">
                  {!a.cover && <i title="No cover">◻</i>}
                  {noLink.has(a.slug) && <i title={`${noLink.get(a.slug)} songs without a link`}>{noLink.get(a.slug)}</i>}
                </span>
              </button>
            </li>
          ))}
          {visible.length === 0 && <li className="muted small al-items__empty">No albums match.</li>}
        </ul>
      </aside>

      <div className="studio-split__main">
        {!slug && (
          <div className="al-empty">
            <header className="studio-head">
              <p className="eyebrow">Albums & music</p>
              <h1>{albums.length} releases</h1>
              <p className="muted">
                Pick an album to change its cover and era colours, or to edit its songs and their YouTube / Spotify links.
              </p>
            </header>
            <div className="al-wall">
              {albums.slice(0, 12).map((a) => (
                <button key={a.slug} onClick={() => navigate(`/studio/music/${a.slug}`)} title={a.title}>
                  <Art a={a} size={96} />
                </button>
              ))}
            </div>
          </div>
        )}

        {slug && !album && (detail.error ? <p className="studio-error">{detail.error}</p> : <Loading />)}

        {album && (
          <div key={album.slug}>
            <header className="al-head" style={{ ['--a' as string]: album.theme.accent, ['--a2' as string]: album.theme.accent2 }}>
              <Art a={album} size={72} />
              <div>
                <p className="eyebrow">{album.kind_label} · {album.release_date.slice(0, 4)} · {album.language === 'ja' ? 'Japanese' : 'Korean'}</p>
                <h1>{album.title}</h1>
              </div>
              <Link className="link-arrow small al-head__view" to={`/discography/${album.slug}`} target="_blank">View on site ↗</Link>
            </header>

            <div className="tabs" role="tablist">
              {(
                [
                  ['tracks', `Tracks · ${album.songs?.length ?? 0}`],
                  ['details', 'Details & cover'],
                  ['theme', 'Era theme'],
                ] as const
              ).map(([v, l]) => (
                <button key={v} role="tab" aria-selected={tab === v} className={tab === v ? 'is-on' : ''} onClick={() => setTab(v)}>
                  {l}
                </button>
              ))}
            </div>

            {tab === 'details' && (
              <DetailsTab
                album={album}
                onSaved={(a) => {
                  detail.setData({ ...album, ...a })
                  refresh()
                }}
                onDeleted={() => {
                  refresh()
                  navigate('/studio/music')
                }}
              />
            )}
            {tab === 'theme' && (
              <ThemeTab
                album={album}
                presets={[{ label: 'Rose Quartz & Serenity', theme: CARAT_THEME }, ...presets]}
                onSaved={(a) => {
                  detail.setData({ ...album, ...a })
                  refresh()
                }}
              />
            )}
            {tab === 'tracks' && <TracksEditor album={album} onChanged={refresh} />}
          </div>
        )}
      </div>
    </div>
  )
}
