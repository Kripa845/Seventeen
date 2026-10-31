import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { MemberAvatar } from '../components/MemberAvatar'
import { Countdown } from '../components/Countdown'
import { MemberDialog } from '../components/MemberDialog'
import { ApiError, Loading } from '../components/Status'
import { useAlbums, useMembers, useSongs } from '../lib/api'
import { dailyIndex, DEBUT, daysSince, formatDayMonth, nextAnniversary } from '../lib/dates'
import { useTheme } from '../lib/theme'
import type { Member, Unit } from '../lib/types'

const UNITS: { unit: Unit; name: string; text: string }[] = [
  { unit: 'hiphop', name: 'Hip-hop Unit', text: 'The rappers: sharp verses, bold stage presence and a lot of the group’s swagger.' },
  { unit: 'vocal', name: 'Vocal Team', text: 'The singers: the harmonies, the ballads and the high notes that carry every chorus.' },
  { unit: 'performance', name: 'Performance Team', text: 'The dancers: they build the choreography that makes thirteen people move as one.' },
]

/** What a signed-in account opens up. */
const LOCKED = [
  { icon: '🎮', title: 'Games', text: 'Memory match, unit sorter and guess-the-member, with a CARAT leaderboard.' },
  { icon: '📔', title: 'Diary', text: 'A scrapbook of concert days, comebacks and little moments.' },
  { icon: '▣', title: 'Memories', text: 'Photo albums of photos, member pictures, songs and videos.' },
  { icon: '♫', title: 'Music & playlist', text: 'Every song with its MV, and a playlist of the ones you heart.' },
  { icon: '✦', title: 'Themes', text: 'Wear any era’s look across the whole site.' },
  { icon: '☺', title: 'Your bias', text: 'Pick a member and your dashboard shows their colour.' },
  { icon: '📅', title: 'CARAT calendar', text: 'Every birthday, the anniversary and the comebacks, with countdowns.' },
  { icon: '🃏', title: 'Photocard binder', text: 'Open a pack of cards every day and fill your binder.' },
  { icon: '💌', title: 'Letters', text: 'Write to a member and read other CARATs’ letters.' },
  { icon: '💡', title: 'Fanchant & concert mode', text: 'The chants for every song, and your phone as a lightstick.' },
]

/** The landing page: open to everyone. The rest of the site is behind a free account. */
export function Home() {
  const members = useMembers()
  const albums = useAlbums()
  const songs = useSongs()
  const { site } = useTheme()
  const { account } = useAuth()
  const [shown, setShown] = useState<Member | null>(null) // the member whose details are open

  const anniversary = nextAnniversary('2015-05-26')
  const nextBirthday = members.data
    ?.map((m) => ({ m, ...nextAnniversary(m.birthday) }))
    .sort((a, b) => a.days - b.days)[0]
  const todays = members.data?.[dailyIndex(members.data.length)]
  const latest = albums.data?.slice(-4).reverse()
  const titleTracks = songs.data?.filter((s) => s.is_title_track)
  const latestTracks = titleTracks?.slice(-6).reverse()
  const years = new Date().getFullYear() - DEBUT.getFullYear()

  // Signed in: the buttons lead to your dashboard instead.
  const ctas = account ? (
    <>
      <Link className="btn" to={account.is_staff ? '/studio' : '/me'}>{account.is_staff ? 'Open the admin dashboard' : 'Open my viewer dashboard'}</Link>
      {account.is_staff && <Link className="btn btn--ghost" to="/me">Open the viewer dashboard</Link>}
    </>
  ) : (
    <>
      <Link className="btn" to="/register">Sign up free</Link>
      <Link className="btn btn--ghost" to="/login">Log in</Link>
    </>
  )

  return (
    <div className="home landing">
      <section className="hero">
        <p className="eyebrow">{site?.hero_eyebrow ?? 'for CARAT, since 2015'}</p>
        <h1 className="hero__title">
          SEVENTEEN
          <span className="hero__equation" aria-label="13 members, 3 units, 1 team">
            13 <i>+</i> 3 <i>+</i> 1
          </span>
        </h1>
        <p className="hero__lede">
          {site?.hero_lede ??
            'Thirteen members, three units, one team. Welcome to a home for CARATs: meet the boys, wander through every era, and sign up to play, listen and keep your memories.'}
        </p>
        <div className="hero__ctas">{ctas}</div>
      </section>

      <section className="stats">
        <div className="stat card">
          <span className="stat__num">{daysSince(DEBUT).toLocaleString()}</span>
          <span className="stat__label">days since debut</span>
        </div>
        <div className="stat card">
          <span className="stat__num">{members.data?.length ?? 13}</span>
          <span className="stat__label">members in 3 units</span>
        </div>
        <div className="stat card">
          <span className="stat__num">{albums.data?.length ?? '…'}</span>
          <span className="stat__label">albums and eras</span>
        </div>
        <div className="stat card">
          <span className="stat__num">{songs.data?.length ?? '…'}</span>
          <span className="stat__label">songs · {titleTracks?.length ?? '…'} title tracks</span>
        </div>
        <div className="stat card">
          <span className="stat__num">{anniversary.days === 0 ? '🎉' : anniversary.days}</span>
          <span className="stat__label">{anniversary.days === 0 ? 'Happy anniversary!' : 'days to the anniversary (26 May)'}</span>
        </div>
        {nextBirthday && (
          <div className="stat card">
            <span className="stat__num">{nextBirthday.days === 0 ? '🎂' : nextBirthday.days}</span>
            <span className="stat__label">
              {nextBirthday.days === 0
                ? `Happy birthday, ${nextBirthday.m.stage_name}!`
                : `days to ${nextBirthday.m.stage_name}'s birthday · ${formatDayMonth(nextBirthday.date)}`}
            </span>
          </div>
        )}
      </section>

      <Countdown link={!!account} />

      <section id="about" className="landing-about card">
        <div>
          <p className="eyebrow">Who are SEVENTEEN?</p>
          <h2>Thirteen members, three units, one team</h2>
          <p>
            SEVENTEEN is a K-pop group from Pledis Entertainment that debuted on 26 May 2015 with the mini album <i>17 Carat</i> and its
            title track “Adore U”. That's {years} years of music, and the name says it all: <b>13 members + 3 units + 1 team = 17</b>.
          </p>
          <p>
            They're known as “self-producing idols”: Woozi writes and produces most of their songs, Hoshi leads the choreography, and
            the members write lyrics, rap verses and dances together. Leader S.Coups keeps all thirteen as one team. Their fans are
            called <b>CARAT</b>, and the official colours are Rose Quartz and Serenity.
          </p>
        </div>
        <ul className="landing-facts">
          <li><b>2015</b><span>debut with “Adore U”</span></li>
          <li><b>13</b><span>members</span></li>
          <li><b>3</b><span>units</span></li>
          <li><b>CARAT</b><span>the fandom</span></li>
        </ul>
      </section>

      {members.error && <ApiError message={members.error} />}

      <section id="members">
        <div className="section-head">
          <h2>The members</h2>
          <span className="muted small landing-hint">Tap a member for their details</span>
          <Link className="link-arrow" to="/members">{account ? 'Full profiles →' : 'Sign in for full profiles →'}</Link>
        </div>
        {members.loading && <Loading />}
        <div className="landing-units">
          {UNITS.map((u) => {
            const list = members.data?.filter((m) => m.unit === u.unit) ?? []
            return (
              <article key={u.unit} className="landing-unit card">
                <h3>{list[0]?.unit_label || u.name}</h3>
                <p className="muted small">{u.text}</p>
                <ul>
                  {list.map((m) => (
                    <li key={m.slug} style={{ ['--m' as string]: m.color }}>
                      <button className="landing-unit__member" onClick={() => setShown(m)} aria-haspopup="dialog">
                        <MemberAvatar member={m} size="sm" />
                        <span>
                          <b>
                            {m.stage_name}
                            {m.is_unit_leader && <span className="landing-unit__leader"> · leader</span>}
                          </b>
                          <small>{m.position}</small>
                        </span>
                        <span className="landing-unit__more" aria-hidden>›</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </article>
            )
          })}
        </div>

        {todays && (
          <div className="today card landing-today" style={{ ['--m' as string]: todays.color }}>
            <MemberAvatar member={todays} size="lg" />
            <div>
              <p className="eyebrow">Member of the day</p>
              <h2>{todays.stage_name}</h2>
              <p className="today__tagline">{todays.tagline}</p>
              <p className="muted small">{todays.unit_label} · {todays.position} · birthday {formatDayMonth(nextAnniversary(todays.birthday).date)}</p>
              <button className="link-arrow landing-today__more" onClick={() => setShown(todays)} aria-haspopup="dialog">More about {todays.stage_name} →</button>
            </div>
          </div>
        )}
        {shown && members.data && (
          <MemberDialog member={shown} members={members.data} onPick={setShown} onClose={() => setShown(null)} />
        )}
      </section>

      <section id="eras">
        <div className="section-head">
          <h2>Latest eras</h2>
          <Link className="link-arrow" to="/discography">{account ? `All ${albums.data?.length ?? ''} eras →` : 'Sign in to explore every era →'}</Link>
        </div>
        {albums.loading && <Loading />}
        <div className="era-grid">
          {latest?.map((a) => (
            <div
              key={a.slug}
              className="era-tile"
              style={{ background: a.theme.bg, color: a.theme.text, ['--a' as string]: a.theme.accent, ['--a2' as string]: a.theme.accent2 }}
            >
              <span className="era-tile__orb" aria-hidden />
              <span className="era-tile__year">{a.release_date.slice(0, 4)} · {a.kind_label}</span>
              <span className="era-tile__title">{a.title}</span>
              {a.title_track && <span className="era-tile__track">♪ {a.title_track}</span>}
            </div>
          ))}
        </div>
      </section>

      <section id="music">
        <div className="section-head">
          <h2>Recent title tracks</h2>
          <Link className="link-arrow" to="/music">{account ? 'Listen →' : 'Sign in to listen →'}</Link>
        </div>
        {songs.loading && <Loading />}
        <ol className="landing-tracks card">
          {latestTracks?.map((s) => (
            <li key={s.id}>
              {s.album_cover ? <img src={s.album_cover} alt="" width={44} height={44} /> : <span className="landing-tracks__art" aria-hidden>♪</span>}
              <span>
                <b>{s.title}</b>
                <small>{s.album_title}</small>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section id="join" className="landing-join">
        <div className="section-head">
          <h2>{account ? 'Your CARAT space' : 'More for CARATs with an account'}</h2>
        </div>
        <div className="landing-locked">
          {LOCKED.map((l) => (
            <div key={l.title} className={`landing-lock card ${account ? 'is-open' : ''}`}>
              <span className="landing-lock__icon" aria-hidden>{l.icon}</span>
              <b>{l.title}</b>
              <p className="muted small">{l.text}</p>
              {!account && <span className="landing-lock__badge">🔒 Sign in</span>}
            </div>
          ))}
        </div>
        <div className="games-teaser card">
          <div>
            <h2>{account ? `Welcome back, ${account.display_name}` : 'Join free in a few seconds'}</h2>
            <p className="muted">
              {account
                ? 'Your dashboard has members, eras, music, themes, games, the diary and memories.'
                : 'A viewer account opens up the games, the diary, the photo albums, music, themes and your own dashboard.'}
            </p>
          </div>
          <div className="hero__ctas">{ctas}</div>
        </div>
      </section>
    </div>
  )
}
