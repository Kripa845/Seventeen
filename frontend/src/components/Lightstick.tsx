import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { parseLyrics } from '../fan/lyrics'
import type { Member } from '../lib/types'
import '../fan/fan.css'

type Mode = 'steady' | 'pulse' | 'wave' | 'members' | 'carat'

const MODES: { value: Mode; label: string }[] = [
  { value: 'steady', label: 'Steady' },
  { value: 'pulse', label: 'Pulse' },
  { value: 'wave', label: 'Wave' },
  { value: 'carat', label: 'Rose Quartz & Serenity' },
  { value: 'members', label: '13 colours' },
]

/**
 * Concert mode: the screen becomes a glowing CARAT bong in the theme's colours, with the song's
 * fanchant one line at a time underneath (tap, space or the arrow keys to move on). Colours change
 * gently; nothing flashes faster than once a second.
 */
export function Lightstick({ title, lyrics, members, color, color2, onClose }: {
  title: string
  lyrics: string
  members: Member[]
  color: string
  color2: string
  onClose: () => void
}) {
  const [mode, setMode] = useState<Mode>('pulse')
  const [line, setLine] = useState(0)
  const [tick, setTick] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  const lines = useMemo(() => parseLyrics(lyrics).filter((l) => l.kind !== 'gap'), [lyrics])

  // the part a line belongs to ("Chorus"), shown above it
  const partOf = (i: number) => {
    for (let j = i; j >= 0; j--) {
      const l = lines[j]
      if (l.kind === 'part') return l.text
    }
    return ''
  }
  const singable = lines.map((l, i) => ({ l, i })).filter((x) => x.l.kind === 'line')
  const at = singable[Math.min(line, singable.length - 1)]

  useEffect(() => {
    if (mode !== 'members') return
    const timer = setInterval(() => setTick((t) => t + 1), 1200)
    return () => clearInterval(timer)
  }, [mode])

  useEffect(() => {
    const el = root.current
    el?.requestFullscreen?.().catch(() => {
      /* not allowed: the overlay still fills the window */
    })
    // keep the phone's screen on while it's a lightstick
    let lock: { release: () => Promise<void> } | null = null
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }
    nav.wakeLock?.request('screen').then((l) => (lock = l)).catch(() => {})
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        setLine((n) => Math.min(n + 1, Math.max(0, singable.length - 1)))
      }
      if (e.key === 'ArrowLeft') setLine((n) => Math.max(0, n - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      lock?.release().catch(() => {})
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    }
  }, [onClose, singable.length])

  const memberColor = members.length ? members[tick % members.length] : null
  const glow =
    mode === 'members' && memberColor ? memberColor.color : mode === 'carat' ? '#F7CAC9' : color
  const glow2 = mode === 'members' && memberColor ? memberColor.color : mode === 'carat' ? '#92A8D1' : color2

  return (
    <div ref={root} className={`stick stick--${mode}`} style={{ ['--g' as string]: glow, ['--g2' as string]: glow2 } as CSSProperties} role="dialog" aria-modal="true" aria-label={`Concert mode: ${title}`}>
      <div className="stick__glow" aria-hidden />
      <div className="stick__top">
        <span className="stick__song">♪ {title}</span>
        <button className="stick__close" onClick={onClose} aria-label="Leave concert mode">✕</button>
      </div>

      <div className="stick__bong" aria-hidden>
        <svg viewBox="0 0 120 260" width="120" height="260">
          <defs>
            <linearGradient id="stick-gem" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fff" stopOpacity="0.95" />
              <stop offset="0.45" stopColor="var(--g)" />
              <stop offset="1" stopColor="var(--g2)" />
            </linearGradient>
          </defs>
          {/* the diamond head */}
          <path d="M60 8 L104 52 L60 118 L16 52 Z" fill="url(#stick-gem)" stroke="#fff" strokeOpacity="0.7" strokeWidth="2" />
          <path d="M16 52 H104 M38 30 L60 52 L82 30 M60 52 L60 118" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.5" fill="none" />
          {/* the handle */}
          <rect x="50" y="120" width="20" height="120" rx="9" fill="#EDEAF2" />
          <rect x="50" y="150" width="20" height="10" fill="#C9C3D6" />
          <circle cx="60" cy="200" r="4" fill="var(--g)" />
        </svg>
      </div>

      {at ? (
        <button className="stick__lyrics" onClick={() => setLine((n) => Math.min(n + 1, singable.length - 1))} aria-live="polite">
          <small>{partOf(at.i) || ' '}</small>
          <span className="stick__line">
            {at.l.kind === 'line' &&
              at.l.pieces.map((p, k) => (
                <span key={k} className={p.chant ? 'is-chant' : ''}>{p.text}</span>
              ))}
          </span>
          <small className="stick__next">
            {line + 1}/{singable.length} · tap or press space for the next line
          </small>
        </button>
      ) : (
        <p className="stick__lyrics stick__lyrics--none">No fanchant for this song yet. Just wave it! ✦</p>
      )}

      <div className="stick__bar">
        <div className="stick__modes" role="radiogroup" aria-label="Light">
          {MODES.map((m) => (
            <button key={m.value} role="radio" aria-checked={mode === m.value} className={mode === m.value ? 'is-on' : ''} onClick={() => setMode(m.value)}>
              {m.label}
            </button>
          ))}
        </div>
        {singable.length > 0 && (
          <div className="stick__nav">
            <button onClick={() => setLine((n) => Math.max(0, n - 1))} aria-label="Previous line">←</button>
            <button onClick={() => setLine(0)}>From the top</button>
            <button onClick={() => setLine((n) => Math.min(n + 1, singable.length - 1))} aria-label="Next line">→</button>
          </div>
        )}
      </div>
    </div>
  )
}
