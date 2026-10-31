/** Lyrics with the fanchant marked: "[like this]" is what CARATs chant, and a line that starts
 *  with "#" names a part ("# Chorus"). Members' names in a chant line are just text. */

export interface LyricPiece {
  text: string
  chant: boolean
}

export type LyricLine =
  | { kind: 'part'; text: string }
  | { kind: 'line'; pieces: LyricPiece[]; allChant: boolean }
  | { kind: 'gap' }

export function parseLyrics(raw: string): LyricLine[] {
  const out: LyricLine[] = []
  for (const line of raw.split('\n')) {
    const t = line.trim()
    if (!t) {
      if (out.length && out[out.length - 1].kind !== 'gap') out.push({ kind: 'gap' })
      continue
    }
    if (t.startsWith('#')) {
      out.push({ kind: 'part', text: t.replace(/^#+\s*/, '') })
      continue
    }
    const pieces: LyricPiece[] = []
    const re = /\[([^\]]*)\]/g
    let last = 0
    for (let m = re.exec(t); m; m = re.exec(t)) {
      if (m.index > last) pieces.push({ text: t.slice(last, m.index), chant: false })
      if (m[1].trim()) pieces.push({ text: m[1], chant: true })
      last = m.index + m[0].length
    }
    if (last < t.length) pieces.push({ text: t.slice(last), chant: false })
    out.push({ kind: 'line', pieces, allChant: pieces.every((p) => p.chant || !p.text.trim()) })
  }
  while (out.length && out[out.length - 1].kind === 'gap') out.pop()
  return out
}

export const LYRICS_EXAMPLE = `# Intro
[S.COUPS! JEONGHAN! JOSHUA! JUN! HOSHI! WONWOO! WOOZI!]
[DK! MINGYU! THE8! SEUNGKWAN! VERNON! DINO! SEVENTEEN!]

# Verse 1
A line the members sing
Another line [and the part CARAT shouts]

# Chorus
[Everyone sings this whole line]`
