import { useEffect } from 'react'
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { LoginPage, RegisterPage } from './auth/AuthPages'
import { AuthProvider, homeFor, useAuth } from './auth/AuthProvider'
import { Dashboard } from './auth/Dashboard'
import { BirthdayBanner } from './components/BirthdayBanner'
import { MiniPlayer } from './components/MiniPlayer'
import { Nav } from './components/Nav'
import { RequireViewer } from './components/RequireViewer'
import { Loading } from './components/Status'
import { Diary, Memories } from './diary/Diary'
import { SparkleTrail } from './components/SparkleTrail'
import { useContentSync } from './lib/api'
import { PlayerProvider } from './lib/player'
import { ThemeProvider } from './lib/theme'
import { AlbumDetail } from './pages/AlbumDetail'
import { Binder } from './pages/Binder'
import { Calendar } from './pages/Calendar'
import { Discography } from './pages/Discography'
import { Games } from './pages/Games'
import { Home } from './pages/Home'
import { Letters } from './pages/Letters'
import { MemberDetail } from './pages/MemberDetail'
import { Music } from './pages/Music'
import { NowPlaying } from './pages/NowPlaying'
import { SongDetail } from './pages/SongDetail'
import { Members } from './pages/Members'
import { Themes } from './pages/Themes'
import { Timeline } from './pages/Timeline'
import { UnitDetail, Units } from './pages/Units'
import { Studio } from './studio/Studio'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

/** /albums/<slug> is another way to reach an album page. */
function AlbumAlias() {
  const { slug = '' } = useParams()
  return <Navigate to={`/discography/${slug}`} replace />
}

/** The landing page is for visitors. Signed in, / takes you to your own dashboard
 *  (viewer or admin); /?preview=landing still shows the landing page, under a banner. */
function Landing() {
  const { account } = useAuth()
  const [params] = useSearchParams()
  if (account === undefined) return <Loading />
  if (account && params.get('preview') !== 'landing') return <Navigate to={homeFor(account, null)} replace />
  return (
    <>
      {account && (
        <div className="preview-bar card">
          <span>
            <b>Previewing the landing page</b> · this is what signed-out visitors see
          </span>
          <Link className="btn" to={homeFor(account, null)}>
            Back to my {account.is_staff ? 'admin' : 'viewer'} dashboard
          </Link>
        </div>
      )}
      <Home />
    </>
  )
}

function NotFound() {
  return (
    <div className="page-head">
      <h1>Lost in the 17th dimension</h1>
      <p className="muted">That page doesn't exist.</p>
      <Link className="btn" to="/">Back home</Link>
    </div>
  )
}

/** Three areas: the landing page (/, open to all), the viewer dashboard (signed in)
 *  and the admin dashboard (/studio, staff), which has its own full-screen layout. */
function Layout() {
  const { pathname } = useLocation()
  useContentSync() // admin changes (like a new album cover) reach open pages without a reload
  if (pathname === '/studio' || pathname.startsWith('/studio/')) {
    return (
      <>
        <Routes>
          <Route path="/studio/*" element={<Studio />} />
        </Routes>
        <MiniPlayer />
      </>
    )
  }

  return (
    <>
      <SparkleTrail />
      <div className="bg-pattern" aria-hidden />
      <Nav />
      <BirthdayBanner />
      <main className="main">
        <Routes>
          {/* the landing page: open to everyone */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          {/* the viewer dashboard: any signed-in account (admins too) */}
          <Route path="/me" element={<RequireViewer><Dashboard /></RequireViewer>} />
          <Route path="/members" element={<RequireViewer><Members /></RequireViewer>} />
          <Route path="/members/:slug" element={<RequireViewer><MemberDetail /></RequireViewer>} />
          <Route path="/discography" element={<RequireViewer><Discography /></RequireViewer>} />
          <Route path="/discography/:slug" element={<RequireViewer><AlbumDetail /></RequireViewer>} />
          <Route path="/albums/:slug" element={<AlbumAlias />} />
          <Route path="/music" element={<RequireViewer><Music /></RequireViewer>} />
          <Route path="/songs/:id" element={<RequireViewer><SongDetail /></RequireViewer>} />
          <Route path="/now-playing" element={<RequireViewer><NowPlaying /></RequireViewer>} />
          <Route path="/themes" element={<RequireViewer><Themes /></RequireViewer>} />
          <Route path="/games" element={<RequireViewer><Games /></RequireViewer>} />
          <Route path="/games/:game" element={<RequireViewer><Games /></RequireViewer>} />
          <Route path="/diary" element={<RequireViewer><Diary /></RequireViewer>} />
          <Route path="/memories" element={<RequireViewer><Memories /></RequireViewer>} />
          <Route path="/calendar" element={<RequireViewer><Calendar /></RequireViewer>} />
          <Route path="/units" element={<RequireViewer><Units /></RequireViewer>} />
          <Route path="/units/:slug" element={<RequireViewer><UnitDetail /></RequireViewer>} />
          <Route path="/timeline" element={<RequireViewer><Timeline /></RequireViewer>} />
          <Route path="/binder" element={<RequireViewer><Binder /></RequireViewer>} />
          <Route path="/letters" element={<RequireViewer><Letters /></RequireViewer>} />
          {/* the admin dashboard (/studio) is above, with its own layout */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <footer className="footer">
        Made with ◆ by a CARAT · Unofficial fan site · Music via YouTube & Spotify embeds · SEVENTEEN © PLEDIS Entertainment
      </footer>
      <MiniPlayer />
    </>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PlayerProvider>
          <BrowserRouter>
            <ScrollToTop />
            <Layout />
          </BrowserRouter>
        </PlayerProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
