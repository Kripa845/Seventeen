import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { parseLyrics } from '../fan/lyrics'
import type { Member } from '../lib/types'
import '../fan/fan.css'

const MoonpetalStick = lazy(() => import('./MoonpetalStick'))

type Mode = 'steady' | 'pulse' | 'wave' | 'members' | 'carat'

const icon = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {d}
  </svg>
)

const MODES: { value: Mode; label: string; icon: ReactNode }[] = [
  { value: 'steady', label: 'Steady', icon: icon(<circle cx="12" cy="12" r="5" fill="currentColor" />) },
  { value: 'pulse', label: 'Pulse', icon: icon(<><circle cx="12" cy="12" r="3" fill="currentColor" /><circle cx="12" cy="12" r="7" opacity="0.6" /><circle cx="12" cy="12" r="10.5" opacity="0.3" /></>) },
  { value: 'wave', label: 'Wave', icon: icon(<path d="M2 12c2.5-4 5-4 7.5 0s5 4 7.5 0 3.5-3 5-1.5" />) },
  { value: 'carat', label: 'Rose Quartz & Serenity', icon: icon(<path d="M12 3 20 9.5 12 21 4 9.5Z M4 9.5h16 M8.5 9.5 12 3l3.5 6.5L12 21" />) },
  { value: 'members', label: '13 colours', icon: icon(<><circle cx="8" cy="9" r="3.2" /><circle cx="16" cy="9" r="3.2" /><circle cx="12" cy="16" r="3.2" /></>) },
]

const HOUSE_KEY = 'svt-concert-house'

/** Other CARATs' light sticks out in the stands: fixed spots, so they don't jump between renders. */
const CROWD = Array.from({ length: 46 }, (_, i) => {
  const r = (n: number) => ((Math.sin(i * 97.3 + n * 13.7) + 1) / 2) % 1
  return { x: r(1) * 100, y: 55 + r(2) * 45, size: 4 + r(3) * 7, delay: r(4) * 4, tone: i % 3 }
})

/**
 * Concert mode: the screen becomes the Moonpetal light stick (3D) glowing in the theme's colours, out in
 * the stands with the rest of the crowd, with the song's fanchant one line at a time underneath (tap,
 * space or the arrow keys to move on). House lights switch between the dark arena and a daytime
 * stadium. Colours change gently; nothing flashes faster than once a second.
 */
export function Lightstick({ title, lyrics, members, color, color2, onClose, emptyText = 'No fanchant for this song yet. Just wave it! ✦' }: {
  title: string
  lyrics: string
  members: Member[]
  color: string
  color2: string
  onClose: () => void
  emptyText?: string
}) {
  const [mode, setMode] = useState<Mode>('pulse')
  const [line, setLine] = useState(0)
  const [tick, setTick] = useState(0)
  const [house, setHouse] = useState<'dark' | 'light'>(() => {
    try {
      return localStorage.getItem(HOUSE_KEY) === 'light' ? 'light' : 'dark'
    } catch {
      return 'dark'
    }
  })
  const root = useRef<HTMLDivElement>(null)
  const [flat, setFlat] = useState(false) // no WebGL: fall back to the drawn stick
  const noWebGL = useCallback(() => setFlat(true), [])
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
  const next = () => setLine((n) => Math.min(n + 1, Math.max(0, singable.length - 1)))
  const prev = () => setLine((n) => Math.max(0, n - 1))

  const toggleHouse = () => {
    const v = house === 'dark' ? 'light' : 'dark'
    setHouse(v)
    try {
      localStorage.setItem(HOUSE_KEY, v)
    } catch {
      /* fine for this visit */
    }
  }

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

  const memberColor = mode === 'members' && members.length ? members[tick % members.length] : null
  const glow = memberColor ? memberColor.color : mode === 'carat' ? '#F7CAC9' : color
  const glow2 = memberColor ? memberColor.color : mode === 'carat' ? '#92A8D1' : color2
  const modeLabel = MODES.find((m) => m.value === mode)!.label

  // on <body>, so no transformed page wrapper can trap the fixed overlay inside the page
  return createPortal(
    <div
      ref={root}
      className={`stick stick--${mode} stick--${house}`}
      style={{ ['--g' as string]: glow, ['--g2' as string]: glow2 } as CSSProperties}
      role="dialog"
      aria-modal="true"
      aria-label={`Concert mode: ${title}`}
    >
      <div className="stick__glow" aria-hidden />
      <div className="stick__beams" aria-hidden>
        <i />
        <i />
        <i />
      </div>
      <div className="stick__crowd" aria-hidden>
        {CROWD.map((c, i) => (
          <i key={i} className={`tone-${c.tone}`} style={{ left: `${c.x}%`, top: `${c.y}%`, width: c.size, height: c.size, animationDelay: `-${c.delay}s` }} />
        ))}
      </div>

      <header className="stick__top">
        <div className="stick__title">
          <span className="stick__live"><i aria-hidden /> Concert mode</span>
          <span className="stick__song">{title}</span>
        </div>
        <div className="stick__tools">
          <button
            className="stick__icon"
            onClick={toggleHouse}
            aria-pressed={house === 'light'}
            aria-label={house === 'dark' ? 'House lights on' : 'House lights off'}
            title={house === 'dark' ? 'House lights on' : 'House lights off'}
          >
            {house === 'dark'
              ? icon(<><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" /></>)
              : icon(<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />)}
          </button>
          <button className="stick__icon" onClick={onClose} aria-label="Leave concert mode" title="Leave (Esc)">
            {icon(<path d="M6 6l12 12M18 6 6 18" />)}
          </button>
        </div>
      </header>

      <div className="stick__stage">
        <span className="stick__spot" aria-hidden />
        {flat ? (
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
        ) : (
          <div className="stick__bong stick__bong--3d">
            <Suspense fallback={<span className="stick__loading">Lighting up…</span>}>
              <MoonpetalStick color={glow} color2={glow2} mode={mode} onFail={noWebGL} />
            </Suspense>
          </div>
        )}
        <span className="stick__now" aria-live="polite">
          {memberColor ? (
            <><i style={{ background: memberColor.color }} aria-hidden /> {memberColor.stage_name}</>
          ) : (
            <><i aria-hidden /> {modeLabel}</>
          )}
        </span>
        {!flat && <span className="stick__hint">Drag to spin · tap the stick to flash</span>}
      </div>

      <div className="stick__panel">
        {at ? (
          <div className="stick__lyrics">
            <button className="stick__step" onClick={prev} disabled={line === 0} aria-label="Previous line">
              {icon(<path d="M15 5l-7 7 7 7" />)}
            </button>
            <button className="stick__read" onClick={next} aria-live="polite">
              <span className="stick__part">{partOf(at.i) || 'Fanchant'}</span>
              <span key={line} className="stick__line">
                {at.l.kind === 'line' &&
                  at.l.pieces.map((p, k) => (
                    <span key={k} className={p.chant ? 'is-chant' : ''}>{p.text}</span>
                  ))}
              </span>
              <span className="stick__progress" aria-hidden>
                <i style={{ width: `${((line + 1) / singable.length) * 100}%` }} />
              </span>
              <span className="stick__count">
                {line + 1} / {singable.length}
                <span className="stick__keys"> · tap, space or → for the next line</span>
              </span>
            </button>
            <button className="stick__step" onClick={next} disabled={line >= singable.length - 1} aria-label="Next line">
              {icon(<path d="M9 5l7 7-7 7" />)}
            </button>
            {line > 0 && (
              <button className="stick__again" onClick={() => setLine(0)}>
                {icon(<path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5" />)} From the top
              </button>
            )}
          </div>
        ) : (
          <p className="stick__lyrics stick__lyrics--none">
            <span className="stick__part">Fanchant</span>
            <span className="stick__line">{emptyText}</span>
          </p>
        )}

        <div className="stick__modes" role="radiogroup" aria-label="Light">
          {MODES.map((m) => (
            <button
              key={m.value}
              role="radio"
              aria-checked={mode === m.value}
              className={`stick__mode stick__mode--${m.value} ${mode === m.value ? 'is-on' : ''}`}
              onClick={() => setMode(m.value)}
            >
              <span className="stick__mode-icon">{m.icon}</span>
              <span className="stick__mode-label">{m.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  )
}
