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

/** Maestro (17 Is Right Here): the black stage under one spotlight, the orchestra, laser-red strings and the score. */
export const MAESTRO_THEME: ThemeTokens = {
  bg: '#0B0D12',
  surface: '#13161D',
  text: '#EEF2F7',
  accent: '#E3263A',
  accent2: '#8FB8D8',
  font: 'serif',
  pattern: 'staves',
  dark: true,
  skin: 'maestro',
}

/** Aju Nice (Very Nice): summer sky, the striped school building, the basketball hoop and the orange piano. */
export const AJUNICE_THEME: ThemeTokens = {
  bg: '#EAF6FB',
  surface: '#FFFDF7',
  text: '#1F3442',
  accent: '#1FA9C0',
  accent2: '#FF7A3D',
  font: 'display',
  pattern: 'hoops',
  dark: false,
  skin: 'ajunice',
}

/** S.Coups aesthetics: his camera roll. Warm film grain, charcoal and cream, an amber date stamp, Milan at night. */
export const SCOUPS_THEME: ThemeTokens = {
  bg: '#141210',
  surface: '#1E1B18',
  text: '#F2E8D8',
  accent: '#E8A04A',
  accent2: '#8FA7B8',
  font: 'serif',
  pattern: 'film',
  dark: true,
  skin: 'scoups',
}

/** Jeonghan Aesthetics: quiet film photos, charcoal blue, the dusty sky, beige plaid and a white butterfly. */
export const JEONGHAN_THEME: ThemeTokens = {
  bg: '#15171B',
  surface: '#1F232A',
  text: '#ECE8E0',
  accent: '#C9B79A',
  accent2: '#8FA0B4',
  font: 'serif',
  pattern: 'butterflies',
  dark: true,
  skin: 'jeonghan',
}

/** Joshua Aesthetics: soft and unhurried. Cream and white, sage and latte, guitar picks and strings, the white studio. */
export const JOSHUA_THEME: ThemeTokens = {
  bg: '#F6F3EE',
  surface: '#FFFFFF',
  text: '#1E1D1B',
  accent: '#6E8B74',
  accent2: '#D9B48F',
  font: 'sans',
  pattern: 'picks',
  dark: false,
  skin: 'joshua',
}

/** Jun Aesthetics: a walk through the seasons. Stone and cream, sea-mist blue, ginkgo gold, blossoms, the sea and a clear umbrella in the rain. */
export const JUN_THEME: ThemeTokens = {
  bg: '#EEEDE9',
  surface: '#FBFAF7',
  text: '#1B1C1F',
  accent: '#4F6B7D',
  accent2: '#C9A43F',
  font: 'serif',
  pattern: 'umbrellas',
  dark: false,
  skin: 'jun',
}

/** DK Aesthetics: a black-and-white photo show. Gallery white and ink black, denim blue, round glasses and a white rose. */
export const DK_THEME: ThemeTokens = {
  bg: '#F3F2EF',
  surface: '#FFFFFF',
  text: '#141416',
  accent: '#3F6A99',
  accent2: '#9C7A5B',
  font: 'sans',
  pattern: 'roses',
  dark: false,
  skin: 'dk',
}

/** Wonwoo Aesthetics: a quiet reading room at night. Graphite and paper cream, sage and dusty mauve, square glasses, an open book and a library card. */
export const WONWOO_THEME: ThemeTokens = {
  bg: '#121314',
  surface: '#1C1D1F',
  text: '#E9E6DF',
  accent: '#9DB09A',
  accent2: '#B99AA6',
  font: 'serif',
  pattern: 'books',
  dark: true,
  skin: 'wonwoo',
}

/** Woozi Aesthetics: the producer's booth and the encore. Stage black, confetti pink, stage-light blue, a red mic and thick black frames. */
export const WOOZI_THEME: ThemeTokens = {
  bg: '#14141B',
  surface: '#1C1C26',
  text: '#F3EFF4',
  accent: '#F29BB8',
  accent2: '#8FB0D9',
  font: 'sans',
  pattern: 'confetti',
  dark: true,
  skin: 'woozi',
}

/** The8 Aesthetics: the painter's gallery. Gallery white, charcoal ink, olive and butterfly blue, ink-brush circles, round glasses and framed photos. */
export const THE8_THEME: ThemeTokens = {
  bg: '#F2F1EE',
  surface: '#FFFFFF',
  text: '#1A1A1A',
  accent: '#5F6340',
  accent2: '#7FA7C9',
  font: 'sans',
  pattern: 'ink',
  dark: false,
  skin: 'the8',
}

/** Dino Aesthetics: black-and-white portraits warming into colour, café lights, the green hoodie and the orange sleeve. */
export const DINO_THEME: ThemeTokens = {
  bg: '#111111',
  surface: '#1B1B1A',
  text: '#F2EDE4',
  accent: '#E8642C',
  accent2: '#2F5A3F',
  font: 'sans',
  pattern: 'footprints',
  dark: true,
  skin: 'dino',
}

/** Seungkwan Aesthetics: a night walk over the bridges. Midnight navy, the mint of the green bridge, city lights and a Jeju tangerine. */
export const SEUNGKWAN_THEME: ThemeTokens = {
  bg: '#0F1626',
  surface: '#172036',
  text: '#F4EFE6',
  accent: '#7FD3BE',
  accent2: '#FF9B3D',
  font: 'sans',
  pattern: 'tangerines',
  dark: true,
  skin: 'seungkwan',
}

/** Vernon Aesthetics: a summer afternoon. Pale sky and white, sky-blue shirts, lemon yellow, the stripes of a knit tie and gold wire glasses. */
export const VERNON_THEME: ThemeTokens = {
  bg: '#F4F7FA',
  surface: '#FFFFFF',
  text: '#1A2433',
  accent: '#4A7FB8',
  accent2: '#E8B92E',
  font: 'sans',
  pattern: 'lemons',
  dark: false,
  skin: 'vernon',
}

/** Mingyu Aesthetics: summer, a little out of focus. Cream film paper, grass and vine green, the Capri sea, white linen and a puppy. */
export const MINGYU_THEME: ThemeTokens = {
  bg: '#F1EEE6',
  surface: '#FBFAF5',
  text: '#1B211A',
  accent: '#3F7A3A',
  accent2: '#1F4E8C',
  font: 'serif',
  pattern: 'leaves',
  dark: false,
  skin: 'mingyu',
}

/** Hoshi Aesthetics: the tiger in the pines. Deep forest green, tiger orange and leaf green, stripes and paw prints, the willow by the river. */
export const HOSHI_THEME: ThemeTokens = {
  bg: '#0F1712',
  surface: '#18221A',
  text: '#F4F1E6',
  accent: '#F29A38',
  accent2: '#9CC27A',
  font: 'display',
  pattern: 'tiger',
  dark: true,
  skin: 'hoshi',
}
