import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { AlbumsEditor } from './AlbumsEditor'
import { CardsAdmin } from './CardsAdmin'
import { EventsAdmin } from './EventsAdmin'
import { GamesAdmin } from './GamesAdmin'
import { LettersAdmin } from './LettersAdmin'
import { MembersEditor } from './MembersEditor'
import { Overview } from './Overview'
import { PhotoAlbumsAdmin } from './PhotoAlbumsAdmin'
import { ThemesAdmin } from './ThemesAdmin'
import { ToastProvider } from './ui'
import { UserManagement } from './UserManagement'
import './studio.css'

const NAV: { group?: string; to: string; label: string; icon: string; end?: boolean }[] = [
  { to: '/studio', label: 'Overview', icon: '◆', end: true },
  { group: 'Content', to: '/studio/members', label: 'Members', icon: '☺' },
  { to: '/studio/music', label: 'Music management', icon: '♫' },
  { to: '/studio/photo-albums', label: 'Album management', icon: '▣' },
  { to: '/studio/calendar', label: 'Calendar', icon: '📅' },
  { to: '/studio/photocards', label: 'Photocards', icon: '🃏' },
  { group: 'Look', to: '/studio/themes', label: 'Themes management', icon: '✦' },
  { group: 'Community', to: '/studio/users', label: 'User management', icon: '♡' },
  { to: '/studio/games', label: 'Games management', icon: '🎮' },
  { to: '/studio/letters', label: 'Letters', icon: '💌' },
]

/** Old Studio links (before the sections were renamed) still work. */
function OldAlbumLink() {
  const { slug } = useParams()
  return <Navigate to={`/studio/music${slug ? `/${slug}` : ''}`} replace />
}

/** A signed-in viewer who wandered in. */
function AdminsOnly({ name }: { name: string }) {
  return (
    <div className="studio-login">
      <div className="studio-login__card">
        <img src="/diamond.svg" alt="" width={44} height={44} className="studio-login__gem" />
        <p className="eyebrow">Admin dashboard</p>
        <h1>Admins only</h1>
        <p className="muted">
          Hi {name}! This is where admins run the site. Your own playlist, bias and scores live on your dashboard.
        </p>
        <Link className="btn studio-login__go" to="/me">Go to my viewer dashboard</Link>
      </div>
    </div>
  )
}

/** The admin dashboard: /studio */
export function Studio() {
  const { account, logout } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()

  if (account === undefined) {
    return (
      <div className="studio-login">
        <span className="status__diamond" aria-hidden>◆</span>
      </div>
    )
  }
  if (!account) return <Navigate to={`/login?next=${encodeURIComponent(pathname)}`} replace />
  if (!account.is_staff) return <AdminsOnly name={account.display_name} />

  return (
    <ToastProvider>
      <div className="studio">
        <aside className="studio__side">
          <Link to="/studio" className="studio__brand">
            <img src="/diamond.svg" alt="" width={26} height={26} />
            <span>
              SVT <b>Admin</b>
            </span>
          </Link>
          <nav className="studio__nav">
            {NAV.map((n) => (
              <div key={n.to} className="studio__nav-item">
                {n.group && <span className="studio__nav-group">{n.group}</span>}
                <NavLink to={n.to} end={n.end}>
                  <span className="studio__nav-icon" aria-hidden>{n.icon}</span>
                  {n.label}
                </NavLink>
              </div>
            ))}
          </nav>
          <div className="studio__foot">
            <Link to="/me" className="studio__site">Viewer dashboard</Link>
            <a href="/?preview=landing" target="_blank" rel="noreferrer" className="studio__site">Landing page ↗</a>
            <div className="studio__user">
              <span className="studio__avatar" aria-hidden>{account.display_name[0]?.toUpperCase()}</span>
              <span className="studio__username">
                {account.display_name}
                <small>Admin</small>
              </span>
              <button
                className="link-btn"
                onClick={() => {
                  navigate('/')
                  logout()
                }}
              >
                Sign out
              </button>
            </div>
          </div>
        </aside>

        <main className="studio__main">
          <Routes>
            <Route index element={<Overview />} />
            <Route path="members/:slug?" element={<MembersEditor />} />
            <Route path="music/:slug?" element={<AlbumsEditor />} />
            <Route path="photo-albums" element={<PhotoAlbumsAdmin />} />
            <Route path="themes" element={<ThemesAdmin />} />
            <Route path="users" element={<UserManagement me={account.username} />} />
            <Route path="games" element={<GamesAdmin />} />
            <Route path="calendar" element={<EventsAdmin />} />
            <Route path="photocards" element={<CardsAdmin />} />
            <Route path="letters" element={<LettersAdmin />} />
            <Route path="albums/:slug?" element={<OldAlbumLink />} />
            <Route path="look" element={<Navigate to="/studio/themes" replace />} />
            <Route path="fans" element={<Navigate to="/studio/users" replace />} />
            <Route path="*" element={<Navigate to="/studio" replace />} />
          </Routes>
        </main>
      </div>
    </ToastProvider>
  )
}
