import { useState } from 'react'
import type { FormEvent } from 'react'
import { spotifyEmbed, usePlayer, youtubeId } from '../lib/player'
import { send } from '../lib/studio'
import type { Album, Song } from '../lib/types'
import { SaveBar, Toggle, useToast } from './ui'

const FIELDS = ['title', 'native_title', 'note', 'is_title_track', 'disc', 'track_number', 'youtube_url', 'spotify_url'] as const
const order = (a: Song, b: Song) => a.disc - b.disc || a.track_number - b.track_number

function LinkInput({ kind, value, onChange }: { kind: 'YouTube' | 'Spotify'; value: string; onChange: (v: string) => void }) {
  const ok = kind === 'YouTube' ? !!youtubeId(value) : !!spotifyEmbed(value)
  const state = !value ? 'empty' : ok ? 'ok' : 'bad'
  return (
    <label className={`link-in link-in--${state}`}>
      <span className="link-in__tag">{kind === 'YouTube' ? '▶' : '♫'}</span>
      <input
        value={value}
        placeholder={kind === 'YouTube' ? 'YouTube link' : 'Spotify track link'}
        spellCheck={false}
        onChange={(e) => onChange(e.target.value.trim())}
        aria-label={`${kind} link`}
      />
      <span className="link-in__state" aria-hidden>{state === 'ok' ? '✓' : state === 'bad' ? '!' : ''}</span>
    </label>
  )
}

export function TracksEditor({ album, onChanged }: { album: Album; onChanged: () => void }) {
  const toast = useToast()
  const { play, current, playing } = usePlayer()
  const [rows, setRows] = useState<Song[]>([...(album.songs ?? [])].sort(order))
  const [drafts, setDrafts] = useState<Record<number, Song>>({})
  const [onlyMissing, setOnlyMissing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  const view = rows.map((r) => drafts[r.id] ?? r)
  const dirty = rows.filter((r) => drafts[r.id] && JSON.stringify(drafts[r.id]) !== JSON.stringify(r))
  // Judge "without a link" by what's saved, so a row doesn't vanish while you type its link.
  const unlinked = new Set(rows.filter((r) => !r.youtube_url && !r.spotify_url).map((r) => r.id))
  const missing = unlinked.size
  const shown = onlyMissing ? view.filter((s) => unlinked.has(s.id)) : view
  const edit = (id: number, patch: Partial<Song>) =>
    setDrafts((d) => ({ ...d, [id]: { ...(d[id] ?? rows.find((r) => r.id === id)!), ...patch } }))

  const saveAll = async () => {
    setBusy(true)
    try {
      const fresh = await Promise.all(
        dirty.map((r) => {
          const d = drafts[r.id]
          return send<Song>('PATCH', `/songs/${r.id}/`, Object.fromEntries(FIELDS.map((f) => [f, d[f]])))
        }),
      )
      const byId = new Map(fresh.map((s) => [s.id, s]))
      setRows((rs) => rs.map((r) => byId.get(r.id) ?? r).sort(order))
      setDrafts({})
      onChanged()
      toast(`Saved ${fresh.length} song${fresh.length === 1 ? '' : 's'}`)
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (s: Song) => {
    if (!window.confirm(`Delete “${s.title}” from ${album.title}?`)) return
    try {
      await send('DELETE', `/songs/${s.id}/`)
      setRows((rs) => rs.filter((r) => r.id !== s.id))
      setDrafts((d) => {
        const rest = { ...d }
        delete rest[s.id]
        return rest
      })
      onChanged()
      toast(`Deleted “${s.title}”`)
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }

  const add = async (e: FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    const last = rows[rows.length - 1]
    try {
      const song = await send<Song>('POST', '/songs/', {
        album: album.id,
        title: newTitle.trim(),
        disc: last?.disc ?? 1,
        track_number: (last?.track_number ?? 0) + 1,
      })
      setRows((rs) => [...rs, song].sort(order))
      setNewTitle('')
      onChanged()
      toast(`Added “${song.title}”`)
    } catch (err) {
      toast((err as Error).message, 'error')
    }
  }

  const playable = view.filter((s) => youtubeId(s.youtube_url))

  return (
    <div className="tracks-ed">
      <div className="tracks-ed__bar">
        <span className="muted small">
          {rows.length} songs · {rows.length - missing} play{missing > 0 && ` · ${missing} without a link`}
        </span>
        <Toggle label="Only songs without a link" checked={onlyMissing} onChange={setOnlyMissing} />
      </div>

      <ol className="tr-list">
        {shown.map((s) => {
          const isDirty = dirty.some((d) => d.id === s.id)
          const canPlay = !!youtubeId(s.youtube_url)
          const isCurrent = current?.id === s.id
          return (
            <li key={s.id} className={`tr-row ${isDirty ? 'is-dirty' : ''}`}>
              <div className="tr-row__nums">
                <input type="number" min={1} value={s.disc} onChange={(e) => edit(s.id, { disc: Number(e.target.value) || 1 })} aria-label="Disc" title="Disc" />
                <input type="number" min={1} value={s.track_number} onChange={(e) => edit(s.id, { track_number: Number(e.target.value) || 1 })} aria-label="Track number" title="Track number" />
              </div>
              <div className="tr-row__names">
                <input className="tr-row__title" value={s.title} onChange={(e) => edit(s.id, { title: e.target.value })} aria-label="Title" />
                <div className="tr-row__sub">
                  <input value={s.native_title} placeholder="Korean / Japanese title" onChange={(e) => edit(s.id, { native_title: e.target.value })} aria-label="Korean or Japanese title" />
                  <input value={s.note} placeholder="Unit, solo, feat…" onChange={(e) => edit(s.id, { note: e.target.value })} aria-label="Note" />
                </div>
              </div>
              <div className="tr-row__links">
                <LinkInput kind="YouTube" value={s.youtube_url} onChange={(v) => edit(s.id, { youtube_url: v })} />
                <LinkInput kind="Spotify" value={s.spotify_url} onChange={(v) => edit(s.id, { spotify_url: v })} />
              </div>
              <div className="tr-row__actions">
                <button
                  type="button"
                  className={`icon-btn ${s.is_title_track ? 'is-star' : ''}`}
                  aria-pressed={s.is_title_track}
                  title={s.is_title_track ? 'Title track' : 'Mark as title track'}
                  onClick={() => edit(s.id, { is_title_track: !s.is_title_track })}
                >
                  ★
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  disabled={!canPlay}
                  title={canPlay ? 'Preview' : 'Add a YouTube link to preview'}
                  onClick={() => play(s, playable)}
                >
                  {isCurrent && playing ? '♫' : '▶'}
                </button>
                <button type="button" className="icon-btn icon-btn--danger" title="Delete song" onClick={() => remove(s)}>
                  ✕
                </button>
              </div>
            </li>
          )
        })}
        {shown.length === 0 && <li className="muted tr-empty">{onlyMissing ? 'Every song has a link ✦' : 'No songs yet. Add the first one below.'}</li>}
      </ol>

      <form className="tr-add" onSubmit={add}>
        <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="New song title" aria-label="New song title" />
        <button className="btn btn--small" disabled={!newTitle.trim()}>+ Add song</button>
      </form>

      <SaveBar
        dirty={dirty.length > 0}
        busy={busy}
        onSave={saveAll}
        onDiscard={() => setDrafts({})}
        label={dirty.length ? `Save ${dirty.length} song${dirty.length === 1 ? '' : 's'}` : 'Save'}
      />
    </div>
  )
}
