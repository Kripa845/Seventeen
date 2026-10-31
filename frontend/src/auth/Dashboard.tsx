import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Countdown } from '../components/Countdown'
import { MemberAvatar } from '../components/MemberAvatar'
import { Loading } from '../components/Status'
import { useMembers } from '../lib/api'
import { formatDayMonth, nextAnniversary } from '../lib/dates'
import { usePlayer } from '../lib/player'
import { send, useStudioData } from '../lib/studio'
import type { Account, GameKey, Score, Song } from '../lib/types'
import { useOpenPlayer } from '../lib/useOpenPlayer'
import { useAuth } from './AuthProvider'
import { LikeButton } from './LikeButton'

const GAME_NAMES: Record<GameKey, { name: string; emoji: string; path: string }> = {
  memory: { name: 'Memory Match', emoji: '🃏', path: 'memory' },
  unit_sort: { name: 'Unit Sorter', emoji: '🧭', path: 'unit-sorter' },
  guess: { name: 'Guess the Member', emoji: '🔮', path: 'guess' },
}

function daysSinceIso(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return Math.max(0, Math.floor((Date.now() - new Date(y, m - 1, d).getTime()) / 86_400_000))
}

function shuffled<T>(list: T[]): T[] {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Everything a signed-in account opens up. */
const SECTIONS = [
  { to: '/members', icon: '☺', title: 'Members', text: 'Profiles, units and fun facts' },
  { to: '/discography', icon: '◆', title: 'Eras', text: 'Every album and its theme' },
  { to: '/music', icon: '♫', title: 'Music', text: 'MVs, Spotify and your hearts' },
  { to: '/themes', icon: '✦', title: 'Themes', text: 'Wear an era across the site' },
  { to: '/games', icon: '🎮', title: 'Games', text: 'Play and climb the leaderboard' },
  { to: '/diary', icon: '📔', title: 'Diary', text: 'The CARAT scrapbook' },
  { to: '/memories', icon: '▣', title: 'Memories', text: 'Photo albums and videos' },
  { to: '/calendar', icon: '📅', title: 'Calendar', text: 'Birthdays, comebacks, concerts' },
  { to: '/units', icon: '⬡', title: 'Units', text: 'The teams and the sub-units' },
  { to: '/timeline', icon: '⟿', title: 'The story', text: 'Debut to today, try on every era' },
  { to: '/binder', icon: '🃏', title: 'Binder', text: 'A photocard pack every day' },
  { to: '/letters', icon: '💌', title: 'Letters', text: 'Write to the members' },
  { to: '/lightstick', icon: '💡', title: 'Light stick', text: 'Concert mode, in your hand' },
]

/* ---------- playlist ---------- */

function Playlist() {
  const { likes } = useAuth()
  // live: a cover an admin uploads (or changes) shows up here without a reload.
  const { data } = useStudioData<Song[]>('/me/likes/', { live: true })
  const open = useOpenPlayer()
  const { current, playing } = usePlayer()
  // Show what's liked right now, so un-hearting a song here removes it straight away.
  const songs = (data ?? []).filter((s) => likes.has(s.id))

  return (
    <section className="card dash-card dash-playlist">
      <div className="dash-card__head">
        <div>
          <h2>My playlist</h2>
          <p className="muted small">{songs.length ? `${songs.length} song${songs.length === 1 ? '' : 's'} you ♥` : 'Songs you ♥ land here.'}</p>
        </div>
        {songs.length > 0 && (
          <div className="dash-card__actions">
            <button className="btn btn--small" onClick={() => open(songs[0], songs)}>▶ Play all</button>
            <button
              className="btn btn--small btn--ghost"
              onClick={() => {
                const q = shuffled(songs)
                open(q[0], q)
              }}
            >
              ⤮ Shuffle
            </button>
          </div>
        )}
      </div>

      {!data ? (
        <Loading />
      ) : songs.length === 0 ? (
        <div className="dash-empty">
          <span aria-hidden>♡</span>
          <p>Tap the heart next to any song on the <Link to="/music">Music</Link> page or in the player to save it here.</p>
        </div>
      ) : (
        <ol className="dash-songs">
          {songs.map((s, i) => (
            <li key={s.id} className={current?.id === s.id ? 'is-playing' : ''}>
              <button className="dash-songs__play" onClick={() => open(s, songs)}>
                <span className="dash-songs__num">{current?.id === s.id && playing ? '♫' : i + 1}</span>
                <span className="dash-songs__art" aria-hidden>
                  {s.album_cover ? <img src={s.album_cover} alt="" loading="lazy" /> : '♫'}
                </span>
                <span className="dash-songs__text">
                  <b>{s.title}</b>
                  <small>{s.album_title}</small>
                </span>
              </button>
              <LikeButton song={s} />
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

/* ---------- games ---------- */

function MyGames() {
  const { data } = useStudioData<Score[]>('/me/scores/')
  const best = useMemo(() => {
    const m = new Map<GameKey, Score>()
    for (const s of data ?? []) if (!m.has(s.game) || m.get(s.game)!.score < s.score) m.set(s.game, s)
    return m
  }, [data])

  return (
    <section className="card dash-card">
      <div className="dash-card__head">
        <div>
          <h2>My games</h2>
          <p className="muted small">Scores you save while signed in.</p>
        </div>
        <Link className="link-arrow small" to="/games">Play →</Link>
      </div>
      <div className="dash-games">
        {(Object.keys(GAME_NAMES) as GameKey[]).map((g) => {
          const b = best.get(g)
          const plays = (data ?? []).filter((s) => s.game === g).length
          return (
            <Link key={g} to={`/games/${GAME_NAMES[g].path}`} className="dash-game">
              <span className="dash-game__emoji" aria-hidden>{GAME_NAMES[g].emoji}</span>
              <span className="dash-game__name">{GAME_NAMES[g].name}</span>
              <span className="dash-game__best">{b ? b.score : '—'}</span>
              <span className="dash-game__meta">{plays ? `best of ${plays} game${plays === 1 ? '' : 's'}` : 'not played yet'}</span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

/* ---------- bias ---------- */

function BiasPicker({ account }: { account: Account }) {
  const { saveProfile } = useAuth()
  const members = useMembers().data ?? []
  const [busy, setBusy] = useState<string | null>(null)

  const pick = async (slug: string | null) => {
    setBusy(slug ?? 'none')
    try {
      await saveProfile({ bias: slug })
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="card dash-card">
      <div className="dash-card__head">
        <div>
          <h2>My bias</h2>
          <p className="muted small">Your dashboard shows their colour.</p>
        </div>
        {account.bias && <button className="link-btn" onClick={() => pick(null)}>Clear</button>}
      </div>
      <div className="dash-biases" role="radiogroup" aria-label="Your bias">
        {members.map((m) => (
          <button
            key={m.slug}
            role="radio"
            aria-checked={account.bias === m.slug}
            className={`${account.bias === m.slug ? 'is-on' : ''} ${busy === m.slug ? 'is-busy' : ''}`}
            onClick={() => pick(account.bias === m.slug ? null : m.slug)}
          >
            <MemberAvatar member={m} size="sm" />
            <span>{m.stage_name}</span>
          </button>
        ))}
      </div>
    </section>
  )
}

/* ---------- account ---------- */

function AccountSettings({ account }: { account: Account }) {
  const { saveProfile, logout } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState(account.display_name)
  const [nameNote, setNameNote] = useState<string | null>(null)
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [pwNote, setPwNote] = useState<{ ok: boolean; text: string } | null>(null)
  const [email, setEmail] = useState(account.email)
  const [emailNote, setEmailNote] = useState<{ ok: boolean; text: string } | null>(null)
  const [leaving, setLeaving] = useState(false)
  const [leavePw, setLeavePw] = useState('')
  const [leaveNote, setLeaveNote] = useState<string | null>(null)

  useEffect(() => setName(account.display_name), [account.display_name])
  useEffect(() => setEmail(account.email), [account.email])

  const saveEmail = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await saveProfile({ email: email.trim() })
      setEmailNote({ ok: true, text: email.trim() ? 'Saved ✓ You can reset your password by email now.' : 'Email removed.' })
    } catch (err) {
      setEmailNote({ ok: false, text: (err as Error).message.replace(/^email: /, '') })
    }
  }

  const deleteAccount = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await send('DELETE', '/me/account/', { password: leavePw })
      // the session is gone: go to the landing page and let the app notice
      window.location.assign('/')
    } catch (err) {
      setLeaveNote((err as Error).message.replace(/^password: /, ''))
    }
  }

  const saveName = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await saveProfile({ display_name: name.trim() })
      setNameNote('Saved ✓')
    } catch (err) {
      setNameNote((err as Error).message)
    }
  }

  const changePw = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await send('POST', '/me/password/', { old_password: oldPw, new_password: newPw })
      setOldPw('')
      setNewPw('')
      setPwNote({ ok: true, text: 'Password changed ✓' })
    } catch (err) {
      setPwNote({ ok: false, text: (err as Error).message.replace(/^(old|new) password: /, '') })
    }
  }

  return (
    <section className="card dash-card dash-account">
      <h2>Account</h2>
      <form className="dash-form" onSubmit={saveName}>
        <label>
          <span>Display name</span>
          <span className="dash-form__row">
            <input value={name} maxLength={30} onChange={(e) => { setName(e.target.value); setNameNote(null) }} />
            <button className="btn btn--small" disabled={name.trim() === account.display_name}>Save</button>
          </span>
        </label>
        {nameNote && <p className="small muted">{nameNote}</p>}
      </form>

      <form className="dash-form" onSubmit={saveEmail}>
        <label>
          <span>Email <small className="muted">(only for resetting a forgotten password)</small></span>
          <span className="dash-form__row">
            <input type="email" value={email} maxLength={254} placeholder="you@example.com" autoComplete="email" onChange={(e) => { setEmail(e.target.value); setEmailNote(null) }} />
            <button className="btn btn--small" disabled={email.trim().toLowerCase() === account.email}>Save</button>
          </span>
        </label>
        {emailNote && <p className={`small ${emailNote.ok ? 'muted' : 'error-text'}`}>{emailNote.text}</p>}
      </form>

      <form className="dash-form" onSubmit={changePw}>
        <span className="dash-form__label">Change password</span>
        <input type="password" placeholder="Current password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} autoComplete="current-password" required />
        <input type="password" placeholder="New password (8+ characters)" value={newPw} onChange={(e) => setNewPw(e.target.value)} autoComplete="new-password" required />
        <button className="btn btn--small btn--ghost" disabled={!oldPw || newPw.length < 8}>Change password</button>
        {pwNote && <p className={`small ${pwNote.ok ? 'muted' : 'error-text'}`}>{pwNote.text}</p>}
      </form>

      <div className="dash-account__foot">
        <span className="muted small">Signed in as <b>@{account.username}</b></span>
        <button
          className="btn btn--small btn--ghost"
          onClick={() => {
            // Leave first, or this page would bounce you to the sign-in screen as you sign out.
            navigate('/')
            logout()
          }}
        >
          Sign out
        </button>
      </div>

      <div className="dash-danger">
        {leaving ? (
          <form className="dash-form" onSubmit={deleteAccount}>
            <span className="dash-form__label">Delete my account</span>
            <p className="small muted">
              This deletes your account, your diary pages (with their photos and videos), letters, playlist and photocards. Game scores stay on the
              leaderboards without your name. It can't be undone.
            </p>
            <input type="password" placeholder="Your password, to confirm" value={leavePw} onChange={(e) => { setLeavePw(e.target.value); setLeaveNote(null) }} autoComplete="current-password" required />
            {leaveNote && <p className="small error-text">{leaveNote}</p>}
            <span className="dash-form__row">
              <button type="button" className="btn btn--small btn--ghost" onClick={() => (setLeaving(false), setLeavePw(''), setLeaveNote(null))}>Keep my account</button>
              <button className="btn btn--small btn--danger" disabled={!leavePw}>Delete for good</button>
            </span>
          </form>
        ) : (
          <button className="link-danger small" onClick={() => setLeaving(true)}>Delete my account…</button>
        )}
      </div>
    </section>
  )
}

/* ---------- page ---------- */

/** /me : the viewer dashboard, home for every signed-in account. Admins get it too,
 *  plus a door to the admin dashboard (the Studio). */
export function Dashboard() {
  const { account, likes } = useAuth()
  const members = useMembers().data
  const bias = members?.find((m) => m.slug === account?.bias)

  if (account === undefined) return <Loading />
  if (!account) return <Navigate to="/login?next=/me" replace />

  const days = daysSinceIso(account.date_joined)
  const birthday = bias ? nextAnniversary(bias.birthday) : null
  const hour = new Date().getHours()
  const hello = hour < 5 ? 'Up late' : hour < 12 ? 'Good morning' : hour < 18 ? 'Hi' : 'Good evening'

  return (
    <div className="dash">
      <header className="dash-hero card" style={bias ? { ['--m' as string]: bias.color } : undefined}>
        <div className="dash-hero__avatar">
          {bias ? <MemberAvatar member={bias} size="lg" /> : <span className="dash-hero__initial">{account.display_name[0]?.toUpperCase()}</span>}
        </div>
        <div className="dash-hero__text">
          <p className="eyebrow">
            {account.role === 'admin' ? 'Admin · CARAT' : 'CARAT'} · joined {days === 0 ? 'today' : `${days} day${days === 1 ? '' : 's'} ago`}
          </p>
          <h1>
            {hello}, {account.display_name} ✦
          </h1>
          <p className="muted">
            {bias ? `${bias.stage_name} stan · ${bias.tagline}` : 'Pick your bias below and your dashboard shows their colour.'}
          </p>
        </div>
        {account.role === 'admin' && (
          <Link to="/studio" className="btn dash-hero__studio">Open the admin dashboard →</Link>
        )}
      </header>

      <section className="dash-stats">
        <div className="card dash-stat">
          <span className="dash-stat__num">{likes.size}</span>
          <span className="dash-stat__label">songs in my playlist</span>
        </div>
        <div className="card dash-stat">
          <span className="dash-stat__num">{days}</span>
          <span className="dash-stat__label">days as a member here</span>
        </div>
        {bias && birthday ? (
          <Link to={`/members/${bias.slug}`} className="card dash-stat">
            <span className="dash-stat__num">{birthday.days === 0 ? '🎂' : birthday.days}</span>
            <span className="dash-stat__label">
              {birthday.days === 0 ? `Happy birthday, ${bias.stage_name}!` : `days to ${bias.stage_name}'s birthday · ${formatDayMonth(birthday.date)}`}
            </span>
          </Link>
        ) : (
          <Link to="/members" className="card dash-stat">
            <span className="dash-stat__num">13</span>
            <span className="dash-stat__label">members to choose a bias from</span>
          </Link>
        )}
      </section>

      <Countdown />

      <nav className="dash-sections" aria-label="Your CARAT space">
        {SECTIONS.map((s) => (
          <Link key={s.to} to={s.to} className="card dash-section">
            <span className="dash-section__icon" aria-hidden>{s.icon}</span>
            <b>{s.title}</b>
            <small>{s.text}</small>
          </Link>
        ))}
      </nav>

      <div className="dash-grid">
        <div className="dash-col">
          <Playlist />
          <MyGames />
        </div>
        <div className="dash-col">
          <BiasPicker account={account} />
          <AccountSettings account={account} />
        </div>
      </div>
    </div>
  )
}
