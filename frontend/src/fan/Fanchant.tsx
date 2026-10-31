import { useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { Lightstick } from '../components/Lightstick'
import { send } from '../lib/studio'
import type { Member, Song } from '../lib/types'
import { LYRICS_EXAMPLE, parseLyrics } from './lyrics'
import './fan.css'

/** The song page's lyrics with CARAT's fanchant picked out, concert mode, and (for admins) an editor. */
export function Fanchant({ song, members, color, color2 }: { song: Song; members: Member[]; color: string; color2: string }) {
  const { account } = useAuth()
  const [concert, setConcert] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saved, setSaved] = useState<string | null>(null) // what we last saved, until the song refetches
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lyrics = saved ?? song.lyrics ?? ''
  const lines = parseLyrics(lyrics)
  const staff = !!account?.is_staff

  const save = async () => {
    setBusy(true)
    setError(null)
    try {
      const fresh = await send<Song>('PATCH', `/songs/${song.id}/`, { lyrics: draft })
      setSaved(fresh.lyrics ?? '')
      setEditing(false)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card fanchant">
      <div className="section-head section-head--tight">
        <h3>Fanchant guide</h3>
        <div className="fanchant__actions">
          <button className="btn btn--small" onClick={() => setConcert(true)}>
            <span aria-hidden>💡</span> Concert mode
          </button>
          {staff && !editing && (
            <button className="btn btn--ghost btn--small" onClick={() => (setDraft(lyrics), setEditing(true))}>
              {lyrics ? 'Edit lyrics' : 'Add lyrics'}
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <div className="fanchant__editor">
          <p className="muted small">
            One line per lyric line. Put what CARATs chant in <code>[square brackets]</code>, and start a line with <code>#</code> to name a part
            (<code># Chorus</code>). Leave a blank line between verses.
          </p>
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={14} placeholder={LYRICS_EXAMPLE} aria-label="Lyrics and fanchant" />
          <div className="fanchant__editor-foot">
            {!draft && <button className="link-btn small" onClick={() => setDraft(LYRICS_EXAMPLE)}>Start from an example</button>}
            <span className="era-filters__gap" aria-hidden />
            <button className="btn btn--ghost btn--small" onClick={() => setEditing(false)} disabled={busy}>Cancel</button>
            <button className="btn btn--small" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save lyrics'}</button>
          </div>
          {error && <p className="studio-error small">{error}</p>}
          {draft && (
            <>
              <h4 className="muted small">Preview</h4>
              <Lines lines={parseLyrics(draft)} />
            </>
          )}
        </div>
      ) : lines.length ? (
        <>
          <p className="fanchant__legend small">
            <span className="fanchant__key">members sing</span>
            <span className="fanchant__key is-chant">CARAT chants</span>
          </p>
          <Lines lines={lines} />
        </>
      ) : (
        <p className="muted small">
          No fanchant for this song yet{staff ? ' — add the lyrics and mark the chant parts.' : '.'} Concert mode still turns your screen into a lightstick.
        </p>
      )}

      {concert && <Lightstick title={song.title} lyrics={lyrics} members={members} color={color} color2={color2} onClose={() => setConcert(false)} />}
    </section>
  )
}

function Lines({ lines }: { lines: ReturnType<typeof parseLyrics> }) {
  return (
    <div className="fanchant__lines">
      {lines.map((l, i) =>
        l.kind === 'part' ? (
          <h4 key={i} className="fanchant__part">{l.text}</h4>
        ) : l.kind === 'gap' ? (
          <span key={i} className="fanchant__gap" aria-hidden />
        ) : (
          <p key={i} className={`fanchant__line ${l.allChant ? 'is-all-chant' : ''}`}>
            {l.pieces.map((p, k) => (
              <span key={k} className={p.chant ? 'is-chant' : ''}>{p.text}</span>
            ))}
          </p>
        ),
      )}
    </div>
  )
}
