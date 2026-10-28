import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { AccountButton } from '../auth/AccountButton'
import { useAuth } from '../auth/AuthProvider'
import { useTheme } from '../lib/theme'

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

  return (
    <header className="nav">
      <Link to={account ? '/me' : '/'} className="nav__logo" onClick={() => setOpen(false)}>
        <img src="/diamond.svg" alt="" width={22} height={22} />
        <span>SVT</span>
      </Link>

      <button className="nav__burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span />
        <span />
      </button>

      <nav className={`nav__links ${open ? 'is-open' : ''}`}>
        {account
          ? VIEWER_LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} onClick={() => setOpen(false)}>
                {l.label}
              </NavLink>
            ))
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
