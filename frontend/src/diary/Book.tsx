import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import type { DiaryPage } from '../lib/types'
import { pageName } from './kit'
import { IconChevron } from './Icons'
import { Sheet } from './Sheet'
import type { MemberMap } from './Sheet'

/** How many closed pages show on each side of the open spread. */
const WINDOW = 7
const OPEN = 6 // degrees: each open page leans in a little, like a real book
const SWEEP = 180 - 2 * OPEN // how far a turning page travels

type Half = 'l' | 'r'
type Flip = { dir: 1 | -1; from: DiaryPage; to: DiaryPage; key: number; auto: boolean }

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const ease = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2)

/**
 * Where a spread sits in the fan. d is its distance from the open spread:
 * 0 is open in the middle, negative pages stack on the left, positive on the right.
 */
function place(d: number, pw: number) {
  const n = Math.min(Math.abs(d), WINDOW + 1)
  const side = Math.sign(d)
  if (n === 0) return { spread: 'translate3d(0px, 0px, 0px) rotateY(0deg)', left: OPEN, right: -OPEN, shade: 0 }
  const x = side * (pw * 0.5 + pw * 0.14 * n)
  const z = -(pw * 0.22 + pw * 0.035 * n)
  return {
    spread: `translate3d(${x}px, 0px, ${z}px) rotateY(${side * 58}deg)`,
    // A closed spread folds its far half behind the half you can see.
    left: d > 0 ? 180 : 0,
    right: d < 0 ? -180 : 0,
    shade: Math.min(0.12 + n * 0.07, 0.6),
  }
}

/** Paper edges peeking out under an open page: more pages on that side, a thicker book. */
function edges(count: number, half: Half) {
  const layers = []
  for (let k = 1; k <= Math.min(count, 7); k++) {
    layers.push(`${half === 'l' ? -k * 1.3 : k * 1.3}px ${k}px 0 ${k % 2 ? '#ece5d6' : '#d3c9b6'}`)
  }
  layers.push('0 26px 50px -22px rgba(0, 0, 0, 0.7)')
  return layers.join(', ')
}

/** One half of a spread's artwork, clipped to its page. */
function Face({ page, half, members, back = false, edge, children }: {
  page: DiaryPage
  half: Half
  members: MemberMap
  back?: boolean
  edge?: string
  children?: ReactNode
}) {
  return (
    <div className={`leaf__face leaf__face--${half} ${back ? 'leaf__face--back' : ''}`} style={edge ? { boxShadow: edge } : undefined}>
      <div className={`leaf__sheet leaf__sheet--${half}`}>
        <Sheet page={page} members={members} />
      </div>
      {children}
    </div>
  )
}

function Leaf({ side, angle, page, members, edge }: { side: Half; angle: number; page: DiaryPage; members: MemberMap; edge?: string }) {
  // translateZ keeps a folded half 1px behind the visible one so they never flicker.
  const z = Math.abs(angle) > 90 ? 1 : 0
  return (
    <div className={`leaf leaf--${side}`} style={{ transform: `rotateY(${angle}deg) translateZ(${z}px)` }}>
      <Face page={page} half={side} members={members} edge={edge}>
        <div className="leaf__shade" />
      </Face>
      <div className="leaf__back" />
    </div>
  )
}

export function Book({
  pages,
  index,
  members,
  onIndex,
  onOpen,
  big = false,
}: {
  pages: DiaryPage[]
  index: number
  members: MemberMap
  onIndex: (i: number) => void
  onOpen: (page: DiaryPage) => void
  big?: boolean // photo albums: bigger spreads with less of the fan showing
}) {
  const stage = useRef<HTMLDivElement>(null)
  const world = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [flip, setFlip] = useState<Flip | null>(null)
  const [bump, setBump] = useState<Half | null>(null)
  const wheelAt = useRef(0)

  // The turning page is animated straight on the DOM (no re-render per frame).
  const turner = useRef<HTMLDivElement>(null)
  const frontShade = useRef<HTMLDivElement>(null)
  const backShade = useRef<HTMLDivElement>(null)
  const castL = useRef<HTMLDivElement>(null)
  const castR = useRef<HTMLDivElement>(null)
  const progress = useRef(0)
  const raf = useRef(0)
  const flipRef = useRef<Flip | null>(null)
  flipRef.current = flip

  useLayoutEffect(() => {
    const el = stage.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Spread size: big in the middle with room for the fanned pages either side,
  // and short enough that the toolbar stays on screen.
  const fitH = ((Math.max(window.innerHeight, 560) - (big ? 370 : 400)) * 4) / 3
  const wide = big ? Math.min(width * 0.7, 1160) : Math.min(width * 0.56, 820)
  const spreadW = Math.min(width < 640 ? width * (big ? 0.9 : 0.84) : wide, Math.max(fitH, 280))
  const pw = spreadW / 2
  const ph = spreadW * 0.75

  /** Draws the turning page at p (0 = where it started, 1 = landed on the other side). */
  const draw = (p: number) => {
    progress.current = p
    const f = flipRef.current
    if (!f || !turner.current) return
    const angle = f.dir > 0 ? -(OPEN + SWEEP * p) : OPEN + SWEEP * p
    const lift = 1 + Math.sin(p * Math.PI) * pw * 0.14
    // The page bows a little as it lifts, like real paper.
    const bow = 1 + Math.sin(p * Math.PI) * 0.02
    turner.current.style.transform = `translateZ(${lift}px) rotateY(${angle}deg) scaleY(${bow})`
    frontShade.current?.style.setProperty('opacity', String(Math.min(1, p * 1.8)))
    backShade.current?.style.setProperty('opacity', String(Math.min(1, (1 - p) * 1.8)))
    // Shadow the turning page throws on the pages underneath.
    const revealed = f.dir > 0 ? castR : castL
    const covered = f.dir > 0 ? castL : castR
    revealed.current?.style.setProperty('opacity', String((1 - p) * 0.9))
    covered.current?.style.setProperty('opacity', String(Math.max(0, p - 0.25) * 1.1))
  }

  const animate = (target: number, done: () => void) => {
    cancelAnimationFrame(raf.current)
    const start = progress.current
    const span = Math.abs(target - start)
    const duration = reduceMotion() ? 1 : 260 + 640 * span
    const t0 = performance.now()
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / duration)
      draw(start + (target - start) * ease(k))
      if (k < 1) raf.current = requestAnimationFrame(step)
      else done()
    }
    raf.current = requestAnimationFrame(step)
  }

  const finish = () => {
    progress.current = 0
    setFlip(null)
  }

  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  // A new turn starts drawn at its current progress; automatic ones play straight through.
  useLayoutEffect(() => {
    if (!flip) return
    draw(progress.current)
    if (flip.auto) animate(1, finish)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flip?.key])

  // Moving one page (click, keys, slider, swipe) turns the page; longer jumps riffle the fan.
  const currentId = pages[index]?.id
  const lastId = useRef(currentId)
  useLayoutEffect(() => {
    const prev = lastId.current
    lastId.current = currentId
    if (prev === undefined || currentId === undefined || prev === currentId) return
    const f = flipRef.current
    if (f && f.from.id === prev && f.to.id === currentId) {
      animate(1, finish) // a dragged page was let go past halfway
      return
    }
    cancelAnimationFrame(raf.current)
    const from = pages.findIndex((p) => p.id === prev)
    if (from < 0 || Math.abs(from - index) !== 1) {
      finish()
      return
    }
    progress.current = 0
    setFlip({ dir: index > from ? 1 : -1, from: pages[from], to: pages[index], key: performance.now(), auto: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId])

  const nudge = (half: Half) => {
    setBump(half)
    setTimeout(() => setBump(null), 450)
  }

  // ---------- Pointer: tap or drag a page to turn it; swipe elsewhere; tilt with the mouse ----------

  const gesture = useRef<{ half: Half | null; card: number | null; x: number; y: number; t: number; started: boolean; dir: 1 | -1; to: number } | null>(null)

  const tilt = (e: ReactPointerEvent) => {
    if (e.pointerType !== 'mouse' || gesture.current || reduceMotion() || !world.current || !stage.current) return
    const r = stage.current.getBoundingClientRect()
    const nx = (e.clientX - r.left) / r.width - 0.5
    const ny = (e.clientY - r.top) / r.height - 0.5
    world.current.style.transform = `rotateX(${(-ny * 3).toFixed(2)}deg) rotateY(${(nx * 4.5).toFixed(2)}deg)`
  }
  const untilt = () => {
    if (world.current) world.current.style.transform = ''
  }

  const down = (e: ReactPointerEvent) => {
    if (e.button !== 0) return
    // A song's play button on the open page plays instead of turning the page. The book may
    // still be easing into its tilt, so a press just beside the button counts too.
    const target = e.target as HTMLElement
    if (target.closest('.spread.is-open [data-song-play]')) return
    const near = [...(stage.current?.querySelectorAll<HTMLElement>('.spread.is-open [data-song-play]') ?? [])].find((b) => {
      const r = b.getBoundingClientRect()
      return r.width > 0 && e.clientX > r.left - 8 && e.clientX < r.right + 8 && e.clientY > r.top - 8 && e.clientY < r.bottom + 8
    })
    if (near) {
      e.preventDefault()
      near.click()
      return
    }
    const face = (e.target as HTMLElement).closest('.spread.is-open .leaf__face')
    const half: Half | null = face ? (face.closest('.leaf--l') ? 'l' : 'r') : null
    // Read now: once the stage captures the pointer, later events all target the stage.
    const card = (e.target as HTMLElement).closest<HTMLElement>('.spread[data-i]')
    gesture.current = { half, card: card ? Number(card.dataset.i) : null, x: e.clientX, y: e.clientY, t: performance.now(), started: false, dir: 1, to: index }
    stage.current?.setPointerCapture(e.pointerId)
    untilt()
  }

  const move = (e: ReactPointerEvent) => {
    const g = gesture.current
    if (!g) return tilt(e)
    const dx = e.clientX - g.x
    const dy = e.clientY - g.y
    if (!g.started) {
      if (!g.half || flipRef.current || Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return
      // Pull the right page leftwards to go forward, the left page rightwards to go back.
      const dir = g.half === 'r' ? 1 : -1
      if (Math.sign(dx) !== -dir) return
      const to = index + dir
      if (to < 0 || to >= pages.length) return
      Object.assign(g, { started: true, dir, to })
      progress.current = 0
      setFlip({ dir, from: pages[index], to: pages[to], key: performance.now(), auto: false })
      return
    }
    draw(Math.min(1, Math.max(0, (-g.dir * dx) / (pw * 1.6))))
  }

  const up = (e: ReactPointerEvent) => {
    const g = gesture.current
    gesture.current = null
    if (!g) return
    const dx = e.clientX - g.x
    const dy = e.clientY - g.y
    if (g.started) {
      const speed = (-g.dir * dx) / Math.max(1, performance.now() - g.t)
      if (progress.current > 0.35 || (speed > 0.45 && progress.current > 0.04)) onIndex(g.to)
      else animate(0, finish)
      return
    }
    const moved = Math.abs(dx) > 8 || Math.abs(dy) > 8
    if (g.half && !moved) {
      // Tap a page: right turns forward, left turns back.
      const to = index + (g.half === 'r' ? 1 : -1)
      if (to >= 0 && to < pages.length) onIndex(to)
      else nudge(g.half)
    } else if (!g.half && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      onIndex(Math.max(0, Math.min(pages.length - 1, index + (dx < 0 ? 1 : -1))))
    } else if (!moved) {
      // Tap a page in the fan to jump to it.
      if (g.card !== null) onIndex(g.card)
    }
  }

  // Horizontal trackpad swipes (and shift + wheel) turn the pages.
  useEffect(() => {
    const el = stage.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0
      if (Math.abs(dx) < 12) return
      e.preventDefault()
      const now = Date.now()
      if (now - wheelAt.current < 600) return
      wheelAt.current = now
      onIndex(Math.max(0, Math.min(pages.length - 1, index + Math.sign(dx))))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [index, pages.length, onIndex])

  const before = index
  const after = pages.length - 1 - index
  const turning = flip ? [flip.from.id, flip.to.id] : []

  return (
    <div
      ref={stage}
      className="book"
      style={{ '--ph': `${ph}px`, perspective: `${Math.max(spreadW * 2.6, 1400)}px` } as CSSProperties}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={() => {
        gesture.current = null
        if (flipRef.current && !flipRef.current.auto) animate(0, finish)
      }}
      onPointerLeave={untilt}
    >
      {width > 0 && <div className="book__floor" style={{ width: spreadW * 1.08, top: `calc(50% + ${ph / 2 - 18}px)` }} aria-hidden />}
      {width > 0 && (
        <div className="book__world" ref={world}>
          {pages.map((page, i) => {
            const d = i - index
            if (Math.abs(d) > WINDOW + 1) return null
            const p = place(d, pw)
            const classes = [
              'spread',
              d === 0 && 'is-open',
              d === 0 && index < pages.length - 1 && 'has-next',
              d === 0 && index > 0 && 'has-prev',
              d === 0 && bump && `bump-${bump}`,
              d === 0 && flip && 'is-covered',
              turning.includes(page.id) && 'is-snap',
              Math.abs(d) > WINDOW && 'is-hidden',
            ]
            return (
              <div
                key={page.id}
                data-i={i}
                className={classes.filter(Boolean).join(' ')}
                style={{ width: spreadW, height: ph, transform: p.spread, '--shade': p.shade } as CSSProperties}
                role="button"
                tabIndex={d === 0 || Math.abs(d) === 1 ? 0 : -1}
                aria-label={d === 0 ? `${pageName(page)}: press Enter to open` : `Go to ${pageName(page)}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    if (d === 0) onOpen(page)
                    else onIndex(i)
                  }
                }}
              >
                <Leaf side="l" angle={p.left} page={page} members={members} edge={d === 0 ? edges(before, 'l') : undefined} />
                <Leaf side="r" angle={p.right} page={page} members={members} edge={d === 0 ? edges(after, 'r') : undefined} />
              </div>
            )
          })}

          {flip && (
            // The pages lying open under the turning page, and the turning page itself.
            <div className="spread spread--turn" style={{ width: spreadW, height: ph }} aria-hidden>
              <div className="leaf leaf--l" style={{ transform: `rotateY(${OPEN}deg)` }}>
                <Face page={flip.dir > 0 ? flip.from : flip.to} half="l" members={members} edge={edges(before, 'l')}>
                  <div className="leaf__cast" ref={castL} />
                </Face>
              </div>
              <div className="leaf leaf--r" style={{ transform: `rotateY(${-OPEN}deg)` }}>
                <Face page={flip.dir > 0 ? flip.to : flip.from} half="r" members={members} edge={edges(after, 'r')}>
                  <div className="leaf__cast" ref={castR} />
                </Face>
              </div>
              <div className={`leaf leaf--${flip.dir > 0 ? 'r' : 'l'} leaf--turning`} ref={turner}>
                <Face page={flip.from} half={flip.dir > 0 ? 'r' : 'l'} members={members}>
                  <div className={`leaf__curl leaf__curl--${flip.dir > 0 ? 'r' : 'l'}`} ref={frontShade} />
                </Face>
                <Face page={flip.to} half={flip.dir > 0 ? 'l' : 'r'} members={members} back>
                  <div className={`leaf__curl leaf__curl--${flip.dir > 0 ? 'l' : 'r'}`} ref={backShade} />
                </Face>
              </div>
            </div>
          )}
        </div>
      )}
      {index > 0 && (
        <button className="book__turn book__turn--prev" aria-label="Previous page" onPointerDown={(e) => e.stopPropagation()} onClick={() => onIndex(index - 1)}>
          <IconChevron left />
        </button>
      )}
      {index < pages.length - 1 && (
        <button className="book__turn book__turn--next" aria-label="Next page" onPointerDown={(e) => e.stopPropagation()} onClick={() => onIndex(index + 1)}>
          <IconChevron />
        </button>
      )}
    </div>
  )
}
