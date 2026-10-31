import { useEffect, useRef, useState } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { AccountButton } from '../auth/AccountButton'
import { useAuth } from '../auth/AuthProvider'
import { useTheme } from '../lib/theme'
import '../fan/fan.css'

/** The viewer dashboard, for any signed-in account. */
const VIEWER_LINKS = [
  { to: '/me', label: 'Dashboard', end: true },
  { to: '/members', label: 'Members' },
  { to: '/discography', label: 'Eras' },
  { to: '/music', label: 'Music' },
  { to: '/themes', label: 'Themes' },
  { to: '/games', label: 'Games' },
  { to: '/diary', label: 'Diary' },
  { to: '/memories', label: 'Memories' },
]

/** For CARATs: under "More" so the bar stays one line. */
const MORE_LINKS = [
  { to: '/calendar', label: 'Calendar', icon: '📅' },
  { to: '/units', label: 'Units', icon: '⬡' },
  { to: '/timeline', label: 'The story', icon: '⟿' },
  { to: '/binder', label: 'Photocard binder', icon: '🃏' },
  { to: '/letters', label: 'Letters', icon: '💌' },
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
  { hash: 'about', label: 'About' },
  { hash: 'members', label: 'Members' },
  { hash: 'eras', label: 'Eras' },
  { hash: 'music', label: 'Music' },
  { hash: 'join', label: 'For CARATs' },
]

export function Nav() {
  const { pinned, pin } = useTheme()
  const { account } = useAuth()
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  // which of the three areas this is (the admin dashboard has its own layout and label)
  const area = !account ? null : pathname === '/' ? 'Landing preview' : 'Viewer dashboard'

  return (
    <header className="nav">
      <Link to={account ? '/me' : '/'} className="nav__logo" onClick={() => setOpen(false)}>
        <img src="/diamond.svg" alt="" width={22} height={22} />
        <span>SVT</span>
      </Link>
      {area && <span className="nav__area">{area}</span>}

      <button className="nav__burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span />
        <span />
      </button>

      <nav className={`nav__links ${open ? 'is-open' : ''}`}>
        {account
          ? [
              ...VIEWER_LINKS.map((l) => (
                <NavLink key={l.to} to={l.to} end={l.end} onClick={() => setOpen(false)}>
                  {l.label}
                </NavLink>
              )),
              <More key="more" onPick={() => setOpen(false)} />,
            ]
          : account === null &&
            LANDING_LINKS.map((l) => (
              <a key={l.hash} href={`/#${l.hash}`} onClick={() => setOpen(false)}>
                {l.label}
              </a>
            ))}
      </nav>

      {pinned && (
        <button className="chip nav__era" onClick={() => pin(null)} title="Go back to the site's own theme">
          Wearing <b>{pinned.label}</b> ✕
        </button>
      )}

      <AccountButton />
    </header>
  )
}
