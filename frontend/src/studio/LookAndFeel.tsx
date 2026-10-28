import { useState } from 'react'
import { Loading } from '../components/Status'
import { CARAT_THEME, DARLING_THEME, HEAVEN_THEME, LEFTRIGHT_THEME, WORLD_THEME, ATTACCA_THEME, HOT_THEME, HOMERUN_THEME } from '../lib/color'
import { send, useStudioData } from '../lib/studio'
import { usePageTheme, useTheme } from '../lib/theme'
import type { Album, SiteSettings } from '../lib/types'
import { ThemeEditor } from './ThemeEditor'
import type { Preset } from './ThemeEditor'
import { Field, SaveBar, useToast } from './ui'

type Draft = Pick<SiteSettings, 'theme' | 'hero_eyebrow' | 'hero_lede'>

function Editor({ site }: { site: SiteSettings }) {
  const { setSite, pinned, pin } = useTheme()
  const toast = useToast()
  const albums = useStudioData<Album[]>('/albums/').data
  const [saved, setSaved] = useState<Draft>({ theme: site.theme, hero_eyebrow: site.hero_eyebrow, hero_lede: site.hero_lede })
  const [draft, setDraft] = useState<Draft>(saved)
  const [busy, setBusy] = useState(false)
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)

  usePageTheme(draft.theme) // the whole Studio previews the theme while you edit

  const presets: Preset[] = [
    { label: 'Rose Quartz & Serenity', theme: CARAT_THEME },
    { label: '✿ Seventeenth Heaven', theme: HEAVEN_THEME },
    { label: '☺ Darl+ing', theme: DARLING_THEME },
    { label: '⇄ Left & Right', theme: LEFTRIGHT_THEME },
    { label: '❀ World', theme: WORLD_THEME },
    { label: '✦ Rock with you', theme: ATTACCA_THEME },
    { label: '☀ Hot', theme: HOT_THEME },
    { label: '; Home;Run', theme: HOMERUN_THEME },
    ...(albums ?? []).map((a) => ({ label: a.title, theme: a.theme })).reverse(),
  ]

  const save = async () => {
    setBusy(true)
    try {
      const fresh = await send<SiteSettings>('PATCH', '/site/', draft)
      setSite(fresh)
      setSaved({ theme: fresh.theme, hero_eyebrow: fresh.hero_eyebrow, hero_lede: fresh.hero_lede })
      toast('Site look saved')
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <p className="muted themes__lede">
        Used on every page that doesn't have its own era or member colours. This dashboard previews your changes as you go.
      </p>

      {pinned && (
        <div className="studio-note">
          You're wearing the <b>{pinned.label}</b> era on this device, so the site shows that instead of this look.{' '}
          <button className="link-btn" onClick={() => pin(null)}>Stop wearing it</button>
        </div>
      )}

      <section className="card studio-card">
        <div className="studio-card__head">
          <h2>Theme</h2>
          <button className="link-btn" onClick={() => setDraft({ ...draft, theme: CARAT_THEME })}>
            Reset to Rose Quartz & Serenity
          </button>
        </div>
        <ThemeEditor value={draft.theme} onChange={(theme) => setDraft({ ...draft, theme })} presets={presets} />
      </section>

      <section className="card studio-card">
        <h2>Home page words</h2>
        <div className="form-grid">
          <Field label="Small line above the title" hint={`${draft.hero_eyebrow.length}/80`}>
            <input value={draft.hero_eyebrow} maxLength={80} onChange={(e) => setDraft({ ...draft, hero_eyebrow: e.target.value })} />
          </Field>
          <Field label="Welcome message" hint={`${draft.hero_lede.length}/300`} wide>
            <textarea rows={3} value={draft.hero_lede} maxLength={300} onChange={(e) => setDraft({ ...draft, hero_lede: e.target.value })} />
          </Field>
        </div>
      </section>

      <SaveBar dirty={dirty} busy={busy} onSave={save} onDiscard={() => setDraft(saved)} />
    </div>
  )
}

export function LookAndFeel() {
  const { data, error } = useStudioData<SiteSettings>('/site/')
  if (error) return <p className="studio-error">{error}</p>
  if (!data) return <Loading />
  return <Editor key={data.updated_at} site={data} />
}
