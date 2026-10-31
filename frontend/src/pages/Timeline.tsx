import { Fragment, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, Loading } from '../components/Status'
import { useEvents } from '../fan/api'
import { useAlbums, useMembers } from '../lib/api'
import { formatDate } from '../lib/dates'
import { useTheme } from '../lib/theme'
import type { Album, Member, ThemeTokens } from '../lib/types'
import '../fan/fan.css'

type Moment =
  | { kind: 'era'; date: string; album: Album }
  | { kind: 'milestone'; date: string; emoji: string; title: string; text: string; color?: string; member?: Member }

const PREVIEW_KEY = 'svt-timeline-preview'

/** /timeline : the whole story on one line, debut to today. Hovering an era dresses the site in it. */
export function Timeline() {
  const albums = useAlbums()
  const members = useMembers()
  const events = useEvents()
  const { setOverride, pin, pinned } = useTheme()
  const [preview, setPreview] = useState(() => {
    try {
      return localStorage.getItem(PREVIEW_KEY) !== 'off'
    } catch {
      return true
    }
  })
  const [hovered, setHovered] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)

  // whatever happens, leave the site in its own theme when the page closes
  useEffect(() => () => {
    window.clearTimeout(timer.current)
    setOverride(null)
  }, [setOverride])

  const show = (slug: string | null, theme: ThemeTokens | null) => {
    window.clearTimeout(timer.current)
    if (!preview) return
    // a short wait, so sweeping the mouse down the line doesn't flash every era
    timer.current = window.setTimeout(() => {
      setHovered(slug)
      setOverride(theme)
    }, theme ? 180 : 120)
  }

  const togglePreview = () => {
    const next = !preview
    setPreview(next)
    if (!next) setOverride(null)
    try {
      localStorage.setItem(PREVIEW_KEY, next ? 'on' : 'off')
    } catch {
      /* fine for this visit */
    }
  }

  if (albums.error) return <ApiError message={albums.error} />
  if (!albums.data) return <Loading />

  const today = new Date().toISOString().slice(0, 10)
  const moments: Moment[] = [
    { kind: 'milestone' as const, date: '2015-05-26', emoji: '💎', title: 'Debut', text: 'Thirteen boys, three teams, one group: SEVENTEEN debuts with 17 Carat and “Adore U”.' },
    ...albums.data.map((a): Moment => ({ kind: 'era', date: a.release_date, album: a })),
    ...(members.data ?? []).flatMap((m): Moment[] => [
      ...(m.enlistment_date && m.enlistment_date <= today
        ? [{ kind: 'milestone' as const, date: m.enlistment_date, emoji: '🎖️', title: `${m.stage_name} enlists`, text: m.service_note || m.service_label || 'Military service begins.', color: m.color, member: m }]
        : []),
      ...(m.discharge_date && m.discharge_date <= today
        ? [{ kind: 'milestone' as const, date: m.discharge_date, emoji: '🏠', title: `${m.stage_name} is back`, text: 'Service done. Welcome home!', color: m.color, member: m }]
        : []),
    ]),
    ...(events.data ?? [])
      .filter((e) => e.date <= today && e.kind !== 'comeback')
      .map((e): Moment => ({ kind: 'milestone', date: e.date, emoji: e.kind === 'concert' ? '🏟️' : '✨', title: e.title, text: e.note || e.kind_label })),
  ].sort((a, b) => a.date.localeCompare(b.date))

  const years = new Date().getFullYear() - 2015

  return (
    <div className="story">
      <header className="page-head">
        <p className="eyebrow">2015 → today · {years} years · {albums.data.length} eras</p>
        <h1>The SEVENTEEN story</h1>
        <p className="muted">Every era and milestone on one line. Point at an era and the whole site tries on its look; “Wear it” keeps it.</p>
        <button className={`chip ${preview ? 'is-on' : ''}`} aria-pressed={preview} onClick={togglePreview}>
          {preview ? '✦ Previewing eras on hover' : 'Preview eras on hover: off'}
        </button>
      </header>

      <ol className="story__line">
        {moments.map((m, i) => {
          const year = m.date.slice(0, 4)
          const newYear = year !== moments[i - 1]?.date.slice(0, 4)
          const side = i % 2 ? 'is-right' : 'is-left'
          return (
            <Fragment key={`${m.kind}-${m.date}-${i}`}>
              {newYear && (
                <li className="story__year" aria-label={year}>
                  <span>{year}</span>
                </li>
              )}
              {m.kind === 'era' ? (
                <li
                  className={`story__item story__item--era ${side} ${hovered === m.album.slug ? 'is-previewing' : ''}`}
                  onMouseEnter={() => show(m.album.slug, m.album.theme)}
                  onMouseLeave={() => show(null, null)}
                  onFocus={() => show(m.album.slug, m.album.theme)}
                  onBlur={() => show(null, null)}
                  style={{ ['--a' as string]: m.album.theme.accent, ['--a2' as string]: m.album.theme.accent2 }}
                >
                  <span className="story__dot" aria-hidden />
                  <div className="story__card" style={{ background: m.album.theme.bg, color: m.album.theme.text }}>
                    {m.album.cover ? <img className="story__cover" src={m.album.cover} alt="" loading="lazy" /> : <span className="story__orb" aria-hidden />}
                    <div className="story__body">
                      <span className="story__date">{formatDate(m.date)} · {m.album.kind_label}</span>
                      <Link to={`/discography/${m.album.slug}`} className={`story__title font-${m.album.theme.font}`}>{m.album.title}</Link>
                      {m.album.title_track && <span className="story__track">♪ {m.album.title_track}</span>}
                      {m.album.era_mood && <span className="story__mood">{m.album.era_mood}</span>}
                      <span className="story__actions">
                        <button
                          className="btn btn--small"
                          onClick={() => {
                            pin({ label: m.album.title, tokens: m.album.theme })
                            setOverride(null)
                          }}
                        >
                          {pinned?.label === m.album.title ? '✓ Wearing it' : 'Wear it'}
                        </button>
                        <Link className="btn btn--ghost btn--small" to={`/discography/${m.album.slug}`}>Open the era</Link>
                      </span>
                    </div>
                  </div>
                </li>
              ) : (
                <li className={`story__item story__item--milestone ${side}`} style={m.color ? { ['--a' as string]: m.color } : undefined}>
                  <span className="story__dot story__dot--milestone" aria-hidden>{m.emoji}</span>
                  <div className={`story__note card ${m.member?.photo ? 'story__note--photo' : ''}`}>
                    {m.member?.photo && <img className="story__face" src={m.member.photo} alt={m.member.stage_name} loading="lazy" />}
                    <span className="story__date">{formatDate(m.date)}</span>
                    <b>{m.title}</b>
                    <span className="muted small">{m.text}</span>
                  </div>
                </li>
              )}
            </Fragment>
          )
        })}
        <li className="story__year story__year--now">
          <span>Now</span>
        </li>
        <li className={`story__item story__item--milestone ${moments.length % 2 ? 'is-right' : 'is-left'}`}>
          <span className="story__dot story__dot--milestone" aria-hidden>💎</span>
          <div className="story__note card">
            <b>And CARAT is still here</b>
            <span className="muted small">The next chapter is on the <Link to="/calendar">calendar</Link>.</span>
          </div>
        </li>
      </ol>
    </div>
  )
}
