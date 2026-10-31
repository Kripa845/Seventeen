import { useEffect, useRef, useState } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { AccountButton } from '../auth/AccountButton'
import { useAuth } from '../auth/AuthProvider'
import { useTheme } from '../lib/theme'
import '../fan/fan.css'

/** The viewer dashboard, for any signed-in account. */
const VIEWER_LINKS = [
  { to: '/me', label: 'Dashboard', icon: '⌂', end: true },
  { to: '/members', label: 'Members', icon: '♡' },
  { to: '/discography', label: 'Eras', icon: '◎' },
  { to: '/music', label: 'Music', icon: '♫' },
  { to: '/themes', label: 'Themes', icon: '✦' },
  { to: '/games', label: 'Games', icon: '🎮' },
  { to: '/diary', label: 'Diary', icon: '📔' },
  { to: '/memories', label: 'Memories', icon: '▣' },
]

/** For CARATs: under "More" so the bar stays one line. */
const MORE_LINKS = [
  { to: '/calendar', label: 'Calendar', icon: '📅' },
  { to: '/units', label: 'Units', icon: '⬡' },
  { to: '/timeline', label: 'The story', icon: '⟿' },
  { to: '/binder', label: 'Photocard binder', icon: '🃏' },
  { to: '/letters', label: 'Letters', icon: '💌' },
  { to: '/lightstick', label: 'Light stick', icon: '💡' },
]

function More({ onPick }: { onPick: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { pathname } = useLocation()
  const here = MORE_LINKS.some((l) => pathname === l.to || pathname.startsWith(`${l.to}/`))
  useEffect(() => {
    if (!open) return
    const out = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('pointerdown', out)
    window.addEventListener('keydown', esc)
    return () => {
      window.removeEventListener('pointerdown', out)
      window.removeEventListener('keydown', esc)
    }
  }, [open])
  return (
    <div ref={ref} className={`nav-more ${open ? 'is-open' : ''}`}>
      <button className={`nav-more__btn ${here ? 'active' : ''}`} aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((o) => !o)}>
        More <span aria-hidden>▾</span>
      </button>
      <div className="nav-more__menu">
        <span className="nav-more__title" aria-hidden>For CARATs</span>
        {MORE_LINKS.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            onClick={() => {
              setOpen(false)
              onPick()
            }}
          >
            <span aria-hidden>{l.icon}</span> {l.label}
          </NavLink>
        ))}
      </div>
    </div>
  )
}

/** Signed out: the sections of the landing page. */
const LANDING_LINKS = [
  { hash: 'about', label: 'About', icon: '◆' },
  { hash: 'members', label: 'Members', icon: '♡' },
  { hash: 'eras', label: 'Eras', icon: '◎' },
  { hash: 'music', label: 'Music', icon: '♫' },
  { hash: 'join', label: 'For CARATs', icon: '✦' },
]

export function Nav() {
  const { pinned, pin } = useTheme()
  const { account } = useAuth()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const bar = useRef<HTMLElement>(null)
  const { pathname } = useLocation()
  // which of the three areas this is (the admin dashboard has its own layout and label)
  const area = !account ? null : pathname === '/' ? 'Landing preview' : 'Viewer dashboard'
  const close = () => setOpen(false)

  // the bar tightens up once the page scrolls under it
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // the phone menu closes on Esc or a tap outside it
  useEffect(() => {
    if (!open) return
    const out = (e: PointerEvent) => !bar.current?.contains(e.target as Node) && setOpen(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('pointerdown', out)
    window.addEventListener('keydown', esc)
    return () => {
      window.removeEventListener('pointerdown', out)
      window.removeEventListener('keydown', esc)
    }
  }, [open])

  const era = pinned && (
    <button className="chip nav__era" onClick={() => pin(null)} title={`Wearing ${pinned.label}: go back to the site's own theme`}>
      <span className="nav__era-dot" aria-hidden /> <b>{pinned.label}</b> <span aria-hidden>✕</span>
    </button>
  )

  return (
    <header ref={bar} className={`nav ${open ? 'is-open' : ''} ${scrolled ? 'is-scrolled' : ''}`}>
      <Link to={account ? '/me' : '/'} className="nav__logo" onClick={close}>
        <img src="/diamond.svg" alt="" width={22} height={22} />
        <span className="nav__brand">
          <span>SVT</span>
          {area && <small className="nav__area">{area}</small>}
        </span>
      </Link>

      <nav id="nav-menu" className="nav__links" aria-label="Site">
        {account
          ? [
              ...VIEWER_LINKS.map((l) => (
                <NavLink key={l.to} to={l.to} end={l.end} onClick={close}>
                  <span className="nav__icon" aria-hidden>{l.icon}</span>
                  {l.label}
                </NavLink>
              )),
              <More key="more" onPick={close} />,
            ]
          : account === null &&
            LANDING_LINKS.map((l) => (
              <a key={l.hash} href={`/#${l.hash}`} onClick={close}>
                <span className="nav__icon" aria-hidden>{l.icon}</span>
                {l.label}
              </a>
            ))}
        {era && <div className="nav__era-menu">{era}</div>}
      </nav>

      {era && <div className="nav__era-bar">{era}</div>}

      <AccountButton />

      <button className="nav__burger" aria-label={open ? 'Close menu' : 'Open menu'} aria-controls="nav-menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span />
        <span />
        <span />
      </button>
    </header>
  )
}
