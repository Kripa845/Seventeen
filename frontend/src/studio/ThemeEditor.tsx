import { contrast, deepen, readableOn, THEME_FONTS } from '../lib/color'
import type { ThemeTokens } from '../lib/types'
import { ColorInput, Segmented, Toggle } from './ui'

export interface Preset {
  label: string
  theme: ThemeTokens
}

const COLORS: { key: 'bg' | 'surface' | 'text' | 'accent' | 'accent2'; label: string }[] = [
  { key: 'bg', label: 'Background' },
  { key: 'surface', label: 'Cards' },
  { key: 'text', label: 'Text' },
  { key: 'accent', label: 'Accent' },
  { key: 'accent2', label: 'Second accent' },
]

const PATTERNS: ThemeTokens['pattern'][] = ['sparkle', 'stars', 'petals', 'daisies', 'smileys', 'signs', 'flowers', 'orbits', 'suns', 'billiards', 'waves', 'grid', 'none']

/** A little mock page drawn with the theme, so you see it before saving. */
export function ThemePreview({ theme, title = 'SEVENTEEN', subtitle = 'for CARAT, since 2015' }: { theme: ThemeTokens; title?: string; subtitle?: string }) {
  const button = theme.dark ? theme.accent : deepen(theme.accent)
  return (
    <div
      className={`tp tp--${theme.pattern} ${theme.skin && theme.skin !== 'none' ? `tp--${theme.skin}` : ''}`}
      style={{ background: theme.bg, color: theme.text, ['--tp-accent' as string]: theme.accent, ['--tp-accent2' as string]: theme.accent2 }}
      aria-label="Theme preview"
    >
      <div className="tp__nav" style={{ background: theme.surface }}>
        <b>◆ SVT</b>
        <span>Home</span>
        <span>Eras</span>
        <span className="tp__navon" style={{ background: button, color: readableOn(button) }}>Music</span>
      </div>
      <p className="tp__eyebrow" style={{ color: theme.accent }}>{subtitle}</p>
      <p className="tp__title" style={{ fontFamily: THEME_FONTS[theme.font] }}>{title}</p>
      <div className="tp__row">
        <span className="tp__btn" style={{ background: button, color: readableOn(button) }}>Meet the members</span>
        <span className="tp__ghost" style={{ borderColor: theme.text }}>Explore</span>
      </div>
      <div className="tp__card" style={{ background: theme.surface }}>
        <span className="tp__orb" aria-hidden />
        <div>
          <b>Thunder</b>
          <small>Happy Burstday · 2025</small>
        </div>
        <span className="tp__chip" style={{ background: theme.accent2, color: readableOn(theme.accent2) }}>Title</span>
      </div>
    </div>
  )
}

export function ThemeEditor({ value, onChange, presets = [] }: { value: ThemeTokens; onChange: (t: ThemeTokens) => void; presets?: Preset[] }) {
  const set = <K extends keyof ThemeTokens>(key: K, v: ThemeTokens[K]) => onChange({ ...value, [key]: v })
  const textRatio = contrast(value.text, value.bg)
  const cardRatio = contrast(value.text, value.surface)
  const worst = Math.min(textRatio, cardRatio)

  return (
    <div className="te">
      <div className="te__controls">
        {presets.length > 0 && (
          <div className="sf">
            <span className="sf__label">Start from a look</span>
            <div className="te__presets">
              {presets.map((p) => (
                <button key={p.label} type="button" className="preset" onClick={() => onChange(p.theme)} title={`Use ${p.label}`}>
                  <span className="preset__dots" aria-hidden>
                    <i style={{ background: p.theme.bg }} />
                    <i style={{ background: p.theme.accent }} />
                    <i style={{ background: p.theme.accent2 }} />
                  </span>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="te__colors">
          {COLORS.map((c) => (
            <ColorInput key={c.key} label={c.label} value={value[c.key]} onChange={(v) => set(c.key, v)} />
          ))}
        </div>

        <p className={`te__contrast ${worst >= 4.5 ? 'is-ok' : worst >= 3 ? 'is-meh' : 'is-bad'}`}>
          <b>{worst >= 4.5 ? 'Easy to read' : worst >= 3 ? 'A bit faint' : 'Hard to read'}</b> · text contrast {worst.toFixed(1)}:1
          {worst < 4.5 && ' (aim for 4.5 or more: make the text darker or the background lighter)'}
        </p>

        <Segmented
          label="Heading font"
          value={value.font}
          onChange={(v) => set('font', v)}
          options={(Object.keys(THEME_FONTS) as ThemeTokens['font'][]).map((f) => ({
            value: f,
            label: (
              <span className="te__font">
                <span style={{ fontFamily: THEME_FONTS[f] }}>Aa</span>
                {f}
              </span>
            ),
          }))}
        />

        <Segmented
          label="Background pattern"
          value={value.pattern}
          onChange={(v) => set('pattern', v)}
          options={PATTERNS.map((p) => ({ value: p, label: p }))}
        />

        <Segmented<'none' | 'heaven' | 'darling' | 'leftright' | 'world' | 'attacca' | 'hot' | 'homerun'>
          label="Photo skin"
          value={value.skin ?? 'none'}
          onChange={(v) => set('skin', v)}
          options={[
            { value: 'none', label: 'None' },
            { value: 'heaven', label: '✿ Seventeenth Heaven' },
            { value: 'darling', label: '☺ Darl+ing' },
            { value: 'leftright', label: '⇄ Left & Right' },
            { value: 'world', label: '❀ World' },
            { value: 'attacca', label: '✦ Rock with you' },
            { value: 'hot', label: '☀ Hot' },
            { value: 'homerun', label: '; Home;Run' },
          ]}
        />

        <Toggle label="Dark theme" hint="Tells the browser to use dark scrollbars and form controls" checked={value.dark} onChange={(v) => set('dark', v)} />
      </div>

      <div className="te__preview">
        <ThemePreview theme={value} />
      </div>
    </div>
  )
}
