import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MemberAvatar } from '../components/MemberAvatar'
import { Loading } from '../components/Status'
import { CARAT_THEME, DARLING_THEME, HEAVEN_THEME, LEFTRIGHT_THEME, WORLD_THEME, ATTACCA_THEME, HOT_THEME, HOMERUN_THEME, mix } from '../lib/color'
import { send, useStudioData } from '../lib/studio'
import type { Album, Member, ThemeTokens } from '../lib/types'
import { LookAndFeel } from './LookAndFeel'
import { ThemeEditor, ThemePreview } from './ThemeEditor'
import type { Preset } from './ThemeEditor'
import { ColorInput, SaveBar, useToast } from './ui'

const TABS = [
  ['site', 'Site theme & words'],
  ['eras', 'Era themes'],
  ['members', 'Member colours'],
] as const
type Tab = (typeof TABS)[number][0]

/* ---------- era themes: a gallery of every album's look ---------- */

function EraThemes() {
  const toast = useToast()
  const { data: albums, setData } = useStudioData<Album[]>('/albums/')
  const [open, setOpen] = useState<string | null>(null)
  const [draft, setDraft] = useState<ThemeTokens | null>(null)
  const [busy, setBusy] = useState(false)

  if (!albums) return <Loading />
  const list = [...albums].reverse()
  const editing = list.find((a) => a.slug === open)
  const presets: Preset[] = [{ label: 'Rose Quartz & Serenity', theme: CARAT_THEME }, { label: '✿ Seventeenth Heaven', theme: HEAVEN_THEME }, { label: '☺ Darl+ing', theme: DARLING_THEME }, { label: '⇄ Left & Right', theme: LEFTRIGHT_THEME }, { label: '❀ World', theme: WORLD_THEME }, { label: '✦ Rock with you', theme: ATTACCA_THEME }, { label: '☀ Hot', theme: HOT_THEME }, { label: '; Home;Run', theme: HOMERUN_THEME }, ...list.map((a) => ({ label: a.title, theme: a.theme }))]

  const save = async () => {
    if (!editing || !draft) return
    setBusy(true)
    try {
      const fresh = await send<Album>('PATCH', `/albums/${editing.slug}/`, { theme: draft })
      setData(albums.map((a) => (a.slug === fresh.slug ? { ...a, theme: fresh.theme } : a)))
      toast(`${editing.title} theme saved`)
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <p className="muted themes__lede">Opening an album on the site restyles the whole page with its era's colours. Pick one to change it.</p>
      <div className="era-gallery">
        {list.map((a) => (
          <button
            key={a.slug}
            className={`era-gallery__item ${open === a.slug ? 'is-on' : ''}`}
            onClick={() => {
              setOpen(open === a.slug ? null : a.slug)
              setDraft(a.theme)
            }}
          >
            <ThemePreview theme={open === a.slug && draft ? draft : a.theme} title={a.title} subtitle={`${a.kind_label} · ${a.release_date.slice(0, 4)}`} />
          </button>
        ))}
      </div>

      {editing && draft && (
        <>
          <section className="card studio-card era-gallery__editor">
            <div className="studio-card__head">
              <h2>{editing.title}</h2>
              <button className="link-btn" onClick={() => setOpen(null)}>Close</button>
            </div>
            <ThemeEditor value={draft} onChange={setDraft} presets={presets.filter((p) => p.label !== editing.title)} />
          </section>
          <SaveBar
            dirty={JSON.stringify(draft) !== JSON.stringify(editing.theme)}
            busy={busy}
            onSave={save}
            onDiscard={() => setDraft(editing.theme)}
          />
        </>
      )}
    </>
  )
}

/* ---------- member colours: all thirteen at once ---------- */

function MemberColours() {
  const toast = useToast()
  const { data: members, setData } = useStudioData<Member[]>('/members/')
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  if (!members) return <Loading />
  const changed = members.filter((m) => drafts[m.slug] && drafts[m.slug] !== m.color)

  const save = async () => {
    setBusy(true)
    try {
      const fresh = await Promise.all(changed.map((m) => send<Member>('PATCH', `/members/${m.slug}/`, { color: drafts[m.slug] })))
      const bySlug = new Map(fresh.map((m) => [m.slug, m]))
      setData(members.map((m) => bySlug.get(m.slug) ?? m))
      setDrafts({})
      toast(`Saved ${fresh.length} colour${fresh.length === 1 ? '' : 's'}`)
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <p className="muted themes__lede">Each member's page and card is themed with their colour. Fans' dashboards wear their bias's colour too.</p>
      <div className="colour-grid">
        {members.map((m) => {
          const color = drafts[m.slug] ?? m.color
          return (
            <div
              key={m.slug}
              className={`colour-card ${drafts[m.slug] && drafts[m.slug] !== m.color ? 'is-dirty' : ''}`}
              style={{ background: `linear-gradient(160deg, ${mix(color, '#ffffff', 0.8)}, ${mix(color, '#ffffff', 0.5)})` }}
            >
              <MemberAvatar member={{ ...m, color }} size="sm" />
              <b>{m.stage_name}</b>
              <ColorInput label="Colour" value={color} onChange={(v) => setDrafts({ ...drafts, [m.slug]: v })} />
            </div>
          )
        })}
      </div>
      <SaveBar
        dirty={changed.length > 0}
        busy={busy}
        onSave={save}
        onDiscard={() => setDrafts({})}
        label={changed.length ? `Save ${changed.length} colour${changed.length === 1 ? '' : 's'}` : 'Save'}
      />
    </>
  )
}

/* ---------- page ---------- */

export function ThemesAdmin() {
  const [params, setParams] = useSearchParams()
  const tab = (TABS.find(([v]) => v === params.get('tab'))?.[0] ?? 'site') as Tab

  return (
    <div className="studio-page">
      <header className="studio-head">
        <p className="eyebrow">Themes management</p>
        <h1>Colours, fonts and moods</h1>
        <p className="muted">The site's own look, every era's look and every member's colour, in one place.</p>
      </header>

      <div className="tabs" role="tablist">
        {TABS.map(([v, l]) => (
          <button key={v} role="tab" aria-selected={tab === v} className={tab === v ? 'is-on' : ''} onClick={() => setParams(v === 'site' ? {} : { tab: v })}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'site' && <LookAndFeel />}
      {tab === 'eras' && <EraThemes />}
      {tab === 'members' && <MemberColours />}
    </div>
  )
}
