import { Loading } from '../components/Status'
import { useAlbums } from '../lib/api'
import { AJUNICE_THEME, ATTACCA_THEME, CARAT_THEME, DARLING_THEME, HEAVEN_THEME, HOMERUN_THEME, HOT_THEME, JEONGHAN_THEME, JOSHUA_THEME, JUN_THEME, DK_THEME, WONWOO_THEME, WOOZI_THEME, LEFTRIGHT_THEME, MAESTRO_THEME, SCOUPS_THEME, WORLD_THEME, THE8_THEME, DINO_THEME, SEUNGKWAN_THEME, VERNON_THEME, MINGYU_THEME, HOSHI_THEME } from '../lib/color'
import { useTheme } from '../lib/theme'
import type { ThemeTokens } from '../lib/types'
import { ThemePreview } from '../studio/ThemeEditor'

/** The photo themes, each built from an era's MV and photos. */
const PHOTO_THEMES: { label: string; theme: ThemeTokens; era: string }[] = [
  { label: '✿ Seventeenth Heaven', theme: HEAVEN_THEME, era: '2023' },
  { label: '☺ Darl+ing', theme: DARLING_THEME, era: '2022' },
  { label: '⇄ Left & Right', theme: LEFTRIGHT_THEME, era: 'Heng:garæ · 2020' },
  { label: '❀ World', theme: WORLD_THEME, era: 'Sector 17 · 2022' },
  { label: '✦ Rock with you', theme: ATTACCA_THEME, era: 'Attacca · 2021' },
  { label: '☀ Hot', theme: HOT_THEME, era: 'Face the Sun · 2022' },
  { label: '; Home;Run', theme: HOMERUN_THEME, era: '; [Semicolon] · 2020' },
  { label: '♪ Maestro', theme: MAESTRO_THEME, era: '17 Is Right Here · 2024' },
  { label: '🏀 Aju Nice', theme: AJUNICE_THEME, era: 'Love & Letter Repackage · 2016' },
  { label: '📷 S.Coups aesthetics', theme: SCOUPS_THEME, era: 'his camera roll' },
  { label: '🦋 Jeonghan Aesthetics', theme: JEONGHAN_THEME, era: 'quiet film photos' },
  { label: '🎸 Joshua Aesthetics', theme: JOSHUA_THEME, era: 'soft days & guitar' },
  { label: '☂ Jun Aesthetics', theme: JUN_THEME, era: 'four seasons on a walk' },
  { label: '🌹 DK Aesthetics', theme: DK_THEME, era: 'black & white, a white rose' },
  { label: '🎙 Woozi Aesthetics', theme: WOOZI_THEME, era: 'confetti pink, the red mic, prod. by Woozi' },
  { label: '📚 Wonwoo Aesthetics', theme: WONWOO_THEME, era: 'a quiet reading room' },
  { label: '✎ The8 Aesthetics', theme: THE8_THEME, era: 'the painter’s gallery' },
  { label: '🦖 Dino Aesthetics', theme: DINO_THEME, era: 'black, white & café light' },
  { label: '🍊 Seungkwan Aesthetics', theme: SEUNGKWAN_THEME, era: 'a night walk over the bridges' },
  { label: '🍋 Vernon Aesthetics', theme: VERNON_THEME, era: 'a summer afternoon, a lemon' },
  { label: '🌿 Mingyu Aesthetics', theme: MINGYU_THEME, era: 'summer, a little out of focus' },
  { label: '🐯 Hoshi Aesthetics', theme: HOSHI_THEME, era: 'the tiger in the pines' },
]

/** /themes : wear any theme across the whole site (saved in this browser only). */
export function Themes() {
  const { pinned, pin, site } = useTheme()
  const albums = useAlbums()

  const card = (label: string, theme: ThemeTokens, subtitle: string) => {
    const wearing = pinned?.label === label
    return (
      <article key={label} className={`theme-card card ${wearing ? 'is-on' : ''}`}>
        <ThemePreview theme={theme} title={label.replace(/^\W+\s/, '')} subtitle={subtitle} />
        <div className="theme-card__foot">
          <b>{label}</b>
          <button className={`btn btn--small ${wearing ? 'btn--ghost' : ''}`} onClick={() => pin(wearing ? null : { label, tokens: theme })} aria-pressed={wearing}>
            {wearing ? 'Wearing ✓ · take off' : 'Wear it'}
          </button>
        </div>
      </article>
    )
  }

  return (
    <div className="themes-page">
      <header className="page-head">
        <p className="eyebrow">Themes</p>
        <h1>Dress the site in an era</h1>
        <p className="muted">
          Pick a look and the whole site wears it, on this device only. {pinned ? <>You're wearing <b>{pinned.label}</b>.</> : 'Right now you see the site’s own theme.'}
        </p>
        {pinned && (
          <div className="hero__ctas themes-page__reset">
            <button className="btn btn--ghost" onClick={() => pin(null)}>Back to the site’s theme</button>
          </div>
        )}
      </header>

      <section>
        <div className="section-head"><h2>Photo themes</h2></div>
        <div className="theme-grid">
          {card('Rose Quartz & Serenity', site?.theme ?? CARAT_THEME, 'the site’s own look')}
          {PHOTO_THEMES.map((t) => card(t.label, t.theme, t.era))}
        </div>
      </section>

      <section>
        <div className="section-head"><h2>Every era’s colours</h2></div>
        {albums.loading && <Loading />}
        <div className="theme-grid">
          {albums.data
            ?.slice()
            .reverse()
            .map((a) => card(a.title, a.theme, `${a.kind_label} · ${a.release_date.slice(0, 4)}`))}
        </div>
      </section>
    </div>
  )
}
