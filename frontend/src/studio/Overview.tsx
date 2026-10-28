import { Link } from 'react-router-dom'
import { Loading } from '../components/Status'
import { useAuth } from '../auth/AuthProvider'
import { useStudioData } from '../lib/studio'
import type { AdminScore, AdminUser, Album, Member, Song } from '../lib/types'

function Meter({ label, done, total, to }: { label: string; done: number; total: number; to: string }) {
  const pct = total ? Math.round((done / total) * 100) : 0
  return (
    <Link to={to} className="ov-stat card">
      <span className="ov-stat__num">
        {done}
        <small>/{total}</small>
      </span>
      <span className="ov-stat__label">{label}</span>
      <span className="ov-stat__meter" aria-hidden>
        <span style={{ width: `${pct}%` }} />
      </span>
    </Link>
  )
}

function greeting() {
  const h = new Date().getHours()
  return h < 5 ? 'Up late' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

const SECTIONS = [
  { to: '/studio/members', icon: '☺', title: 'Members', text: 'Photos, profiles, units and fun facts.' },
  { to: '/studio/music', icon: '♫', title: 'Music management', text: 'Albums, covers, tracklists and song links.' },
  { to: '/studio/photo-albums', icon: '▣', title: 'Album management', text: 'Memories photo album pages: order, names and who sees them.' },
  { to: '/studio/themes', icon: '✦', title: 'Themes management', text: 'The site look, era themes and member colours.' },
  { to: '/studio/users', icon: '♡', title: 'User management', text: 'Accounts, roles and passwords.' },
  { to: '/studio/games', icon: '🎮', title: 'Games management', text: 'Leaderboards, stats and pausing games.' },
]

export function Overview() {
  const { account } = useAuth()
  const members = useStudioData<Member[]>('/members/').data
  const albums = useStudioData<Album[]>('/albums/').data
  const songs = useStudioData<Song[]>('/songs/').data
  const users = useStudioData<AdminUser[]>('/users/').data
  const scores = useStudioData<AdminScore[]>('/scores/?all=1').data

  if (!members || !albums || !songs || !users || !scores) return <Loading />

  const photos = members.filter((m) => m.photo).length
  const covers = albums.filter((a) => a.cover).length
  const linked = songs.filter((s) => s.youtube_url || s.spotify_url).length
  const noPhoto = members.filter((m) => !m.photo)
  const noCover = albums.filter((a) => !a.cover)
  const noLink = songs.length - linked

  return (
    <div className="studio-page">
      <header className="studio-head">
        <p className="eyebrow">Admin dashboard</p>
        <h1>
          {greeting()}, {account?.display_name ?? 'CARAT'} ✦
        </h1>
        <p className="muted">Everything on the site, in one place.</p>
      </header>

      <section className="ov-sections">
        {SECTIONS.map((s) => (
          <Link key={s.to} to={s.to} className="ov-section card">
            <span className="ov-section__icon" aria-hidden>{s.icon}</span>
            <b>{s.title}</b>
            <small>{s.text}</small>
          </Link>
        ))}
      </section>

      <h2 className="ov-heading">Community</h2>
      <section className="ov-stats ov-stats--4">
        <Link to="/studio/users" className="ov-stat card">
          <span className="ov-stat__num">{users.filter((u) => !u.is_staff).length}</span>
          <span className="ov-stat__label">viewers · {users.filter((u) => u.is_staff).length} admins</span>
        </Link>
        <Link to="/studio/users" className="ov-stat card">
          <span className="ov-stat__num">{users.filter((u) => Date.now() - new Date(u.date_joined).getTime() < 7 * 86_400_000).length}</span>
          <span className="ov-stat__label">joined this week</span>
        </Link>
        <Link to="/studio/games" className="ov-stat card">
          <span className="ov-stat__num">{scores.length}</span>
          <span className="ov-stat__label">games played · {scores.filter((s) => Date.now() - new Date(s.created_at).getTime() < 7 * 86_400_000).length} this week</span>
        </Link>
        <div className="ov-stat card">
          <span className="ov-stat__num">{users.reduce((n, u) => n + u.likes, 0)}</span>
          <span className="ov-stat__label">songs ♥ by fans</span>
        </div>
      </section>

      <h2 className="ov-heading">Content</h2>
      <section className="ov-stats">
        <Meter label="members with a photo" done={photos} total={members.length} to="/studio/members" />
        <Meter label="albums with a cover" done={covers} total={albums.length} to="/studio/music" />
        <Meter label="songs that play" done={linked} total={songs.length} to="/studio/music" />
      </section>

      <div className="ov-grid">
        <section className="card ov-todo">
          <h2>To do</h2>
          <ul>
            {noPhoto.length > 0 && (
              <li>
                <span className="ov-todo__dot" aria-hidden />
                <div>
                  <b>{noPhoto.length} members need a photo</b>
                  <p className="muted small">{noPhoto.slice(0, 6).map((m) => m.stage_name).join(', ')}{noPhoto.length > 6 && '…'}</p>
                </div>
                <Link className="btn btn--small" to={`/studio/members/${noPhoto[0].slug}`}>Add photos</Link>
              </li>
            )}
            {noCover.length > 0 && (
              <li>
                <span className="ov-todo__dot" aria-hidden />
                <div>
                  <b>{noCover.length} albums need a cover</b>
                  <p className="muted small">Covers show on the Eras timeline, album pages and Now Playing.</p>
                </div>
                <Link className="btn btn--small" to={`/studio/music/${noCover[noCover.length - 1].slug}`}>Add covers</Link>
              </li>
            )}
            {noLink > 0 && (
              <li>
                <span className="ov-todo__dot" aria-hidden />
                <div>
                  <b>{noLink} songs have no link</b>
                  <p className="muted small">Paste a YouTube or Spotify link and they'll play.</p>
                </div>
                <Link className="btn btn--small btn--ghost" to="/studio/music">Open tracks</Link>
              </li>
            )}
            {!noPhoto.length && !noCover.length && !noLink && <li className="muted">Nothing left: the site is complete ✦</li>}
          </ul>
        </section>

        <section className="card ov-quick">
          <h2>Make it yours</h2>
          <Link to="/studio/themes" className="ov-quick__item">
            <span aria-hidden>✦</span>
            <div>
              <b>Change the site's colours</b>
              <p className="muted small">Pick a theme, font and pattern, and edit the home-page words.</p>
            </div>
          </Link>
          <Link to="/studio/music" className="ov-quick__item">
            <span aria-hidden>♫</span>
            <div>
              <b>Add a new comeback</b>
              <p className="muted small">Create an album, give it a look and add its songs.</p>
            </div>
          </Link>
          <div className="ov-quick__item">
            <span aria-hidden>⇪</span>
            <div>
              <b>Lots of pictures at once?</b>
              <p className="muted small">
                Put them in <code>backend/images/members</code> and <code>backend/images/albums</code>, then run{' '}
                <code>python manage.py import_images</code>.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
