import type { ThemeTokens } from './types'

function toRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(full, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function toHex([r, g, b]: number[]): string {
  return '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')
}

/** Mix colour a toward colour b by t (0 = a, 1 = b). */
export function mix(a: string, b: string, t: number): string {
  const A = toRgb(a)
  const B = toRgb(b)
  return toHex(A.map((v, i) => v + (B[i] - v) * t))
}

export function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG contrast ratio between two colours (1 to 21; 4.5+ reads comfortably). */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** Black or white, whichever reads better on top of `hex`. */
export function readableOn(hex: string): string {
  return luminance(hex) > 0.45 ? '#1a1620' : '#ffffff'
}

/** Darken a colour until white text on it is readable (roughly 4.5:1). */
export function deepen(hex: string): string {
  let c = hex
  for (let i = 0; i < 12 && luminance(c) > 0.18; i++) c = mix(c, '#2a1f33', 0.12)
  return c
}

export function memberTheme(color: string): ThemeTokens {
  return {
    bg: mix(color, '#ffffff', 0.86),
    surface: '#ffffff',
    text: '#2b2433',
    accent: deepen(color),
    accent2: color,
    font: 'serif',
    pattern: 'sparkle',
    dark: false,
  }
}

/** The default look: CARAT's Rose Quartz & Serenity. */
export const CARAT_THEME: ThemeTokens = {
  bg: '#FBF6F8',
  surface: '#FFFFFF',
  text: '#2E2A3B',
  accent: '#C25E73',
  accent2: '#7D93C9',
  font: 'serif',
  pattern: 'sparkle',
  dark: false,
}

export const THEME_FONTS: Record<ThemeTokens['font'], string> = {
  serif: "'Cormorant Garamond', Georgia, serif",
  sans: "'Plus Jakarta Sans', system-ui, sans-serif",
  display: "'Unbounded', 'Plus Jakarta Sans', sans-serif",
  mono: "'Space Mono', ui-monospace, monospace",
  marker: "'Permanent Marker', 'Caveat', cursive",
}

/** Seventeenth Heaven: night sky, smiley daisies, neon-yellow lettering and pink sparkles. */
export const HEAVEN_THEME: ThemeTokens = {
  bg: '#0B1238',
  surface: '#17205A',
  text: '#FFF7E0',
  accent: '#FFD93D',
  accent2: '#FF5FA2',
  font: 'marker',
  pattern: 'daisies',
  dark: true,
  skin: 'heaven',
}

/** Darl+ing: sunlit cream walls, crayon smileys, sunflowers and the golden-grass field. */
export const DARLING_THEME: ThemeTokens = {
  bg: '#FFF6E6',
  surface: '#FFFCF4',
  text: '#3B2A1E',
  accent: '#F2A33A',
  accent2: '#4F86D9',
  font: 'serif',
  pattern: 'smileys',
  dark: false,
  skin: 'darling',
}

/** Left & Right (Heng:garæ): summer sky, the brick wall, road signs, traffic lights and the poster's red. */
export const LEFTRIGHT_THEME: ThemeTokens = {
  bg: '#D9ECF7',
  surface: '#FFFFFF',
  text: '#1C2433',
  accent: '#E3262E',
  accent2: '#2F6FD0',
  font: 'display',
  pattern: 'signs',
  dark: false,
  skin: 'leftright',
}

/** World (Sector 17): the CARAT Flower Market street, royal-blue shop fronts, flower buckets and the neon night. */
export const WORLD_THEME: ThemeTokens = {
  bg: '#F4F7FC',
  surface: '#FFFFFF',
  text: '#1F2A44',
  accent: '#1F4FA8',
  accent2: '#F28CAB',
  font: 'display',
  pattern: 'flowers',
  dark: false,
  skin: 'world',
}

/** Rock with you (Attacca): the dark stage, hot-pink curtain light, LED strips, orbits and sparkles. */
export const ATTACCA_THEME: ThemeTokens = {
  bg: '#0D0F1E',
  surface: '#171A2E',
  text: '#F3F0F7',
  accent: '#FF2D6F',
  accent2: '#7AA7FF',
  font: 'serif',
  pattern: 'orbits',
  dark: true,
  skin: 'attacca',
}

/** Hot (Face the Sun): the desert night, the neon flame sun, the orange stage skyline and yellow scribbled lettering. */
export const HOT_THEME: ThemeTokens = {
  bg: '#120806',
  surface: '#22100B',
  text: '#FFE9D2',
  accent: '#FF5A1F',
  accent2: '#FFD23F',
  font: 'marker',
  pattern: 'suns',
  dark: true,
  skin: 'hot',
}

/** Home;Run (; [Semicolon]): the smoky pool hall, blue felt, marquee gold and the copper script. */
export const HOMERUN_THEME: ThemeTokens = {
  bg: '#14110F',
  surface: '#221D1A',
  text: '#F2E6D4',
  accent: '#D79A72',
  accent2: '#1E52A8',
  font: 'serif',
  pattern: 'billiards',
  dark: true,
  skin: 'homerun',
}
