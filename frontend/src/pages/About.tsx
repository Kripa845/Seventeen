import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'

const SECTIONS: { id: string; icon: string; title: string; body: ReactNode }[] = [
  {
    id: 'unofficial',
    icon: '◆',
    title: 'An unofficial fan site',
    body: (
      <>
        <p>
          This site is made by a CARAT, for CARATs. It isn't run by, connected to or approved by SEVENTEEN, PLEDIS Entertainment or HYBE.
          SEVENTEEN, their names, music, photos and album artwork belong to PLEDIS Entertainment and their owners.
        </p>
        <p>
          Music plays through official YouTube and Spotify embeds, so the views and streams go to the official uploads. If you own something on this
          site and want it taken down, contact the site's admin and it will be removed.
        </p>
      </>
    ),
  },
  {
    id: 'privacy',
    icon: '♡',
    title: 'What we keep about you',
    body: (
      <>
        <p>When you make an account, the site stores:</p>
        <ul>
          <li>your username, display name, bias and (only if you add it) your email, used for nothing but password resets;</li>
          <li>what you make here: diary pages with their photos and videos, letters, liked songs, photocards and game scores;</li>
          <li>a sign-in cookie, so you stay signed in. There are no ads and no tracking cookies.</li>
        </ul>
        <p>
          Your password is stored scrambled (hashed): nobody, admins included, can read it. Admins can see the posts you share and, to keep the
          community safe, can hide or delete them. Private diary pages are seen only by you and the admins.
        </p>
      </>
    ),
  },
  {
    id: 'rules',
    icon: '✦',
    title: 'Be kind',
    body: (
      <ul>
        <li>No hate, bullying or mean comments, about the members or about other fans.</li>
        <li>Don't share anyone's private information, or photos and fan art that aren't yours to share.</li>
        <li>No spam or ads.</li>
        <li>See something wrong? Use ⚑ Report on the diary page or letter. Only admins see reports.</li>
      </ul>
    ),
  },
  {
    id: 'your-data',
    icon: '⌂',
    title: 'Your account, your choice',
    body: (
      <p>
        You can change your name, email and password, or delete your account, at any time from the Account card on your dashboard. Deleting it
        removes your diary pages, letters, playlist and photocards for good; game scores stay on the leaderboards without your name.
      </p>
    ),
  },
]

/** /about : who runs this (nobody official), what's stored about you, and the house rules. Open to everyone. */
export function About() {
  const { account } = useAuth()
  return (
    <div className="about">
      <header className="page-head">
        <p className="eyebrow">About · privacy · rules</p>
        <h1>About this site</h1>
        <p className="muted">The short version: a fan project, no ads, no tracking, and you're in control of your account.</p>
        <nav className="about__toc" aria-label="On this page">
          {SECTIONS.map((s) => (
            <a key={s.id} className="chip" href={`#${s.id}`}>
              <span aria-hidden>{s.icon}</span> {s.title}
            </a>
          ))}
        </nav>
      </header>
      <div className="about__grid">
        {SECTIONS.map((s) => (
          <section key={s.id} id={s.id} className="card about__card">
            <span className="about__icon" aria-hidden>{s.icon}</span>
            <h2>{s.title}</h2>
            {s.body}
          </section>
        ))}
      </div>
      <p className="about__back">
        {account ? <Link className="btn" to="/me">Back to my dashboard</Link> : <Link className="btn" to="/register">Join as a CARAT</Link>}
      </p>
    </div>
  )
}
