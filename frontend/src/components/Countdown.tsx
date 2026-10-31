import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useEvents } from '../fan/api'
import { daysFrom, upcoming } from '../fan/calendar'
import { useMembers } from '../lib/api'
import { formatDayMonth } from '../lib/dates'
import '../fan/fan.css'

const pad = (n: number) => String(n).padStart(2, '0')

/** The next birthday, anniversary or comeback, ticking down to the second, and the few after it. */
export function Countdown({ more = 4, link = true }: { more?: number; link?: boolean }) {
  const members = useMembers().data
  const events = useEvents().data
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  if (!members) return null
  const list = upcoming(members, events ?? [], more + 1, now)
  const [next, ...rest] = list
  if (!next) return null

  const left = Math.max(0, next.date.getTime() - now.getTime())
  const today = daysFrom(next.date, now) === 0
  const d = Math.floor(left / 86_400_000)
  const h = Math.floor(left / 3_600_000) % 24
  const m = Math.floor(left / 60_000) % 60
  const s = Math.floor(left / 1000) % 60

  return (
    <section className="countdown card" style={{ ['--c' as string]: next.color }} aria-label="Coming up">
      <div className="countdown__main">
        <p className="eyebrow">{today ? 'Today' : `Coming up · ${formatDayMonth(next.date)}`}</p>
        <h2 className="countdown__title">
          <span aria-hidden>{next.emoji}</span> {today && next.kind === 'birthday' ? `Happy birthday, ${next.member!.stage_name}!` : next.title}
        </h2>
        <p className="muted small">{next.detail}</p>
        {today ? (
          <p className="countdown__today">It's today! 🎉</p>
        ) : (
          <div className="countdown__clock" role="timer" aria-label={`${d} days, ${h} hours, ${m} minutes to go`}>
            <span><b>{d}</b><small>days</small></span>
            <span><b>{pad(h)}</b><small>hours</small></span>
            <span><b>{pad(m)}</b><small>min</small></span>
            <span><b>{pad(s)}</b><small>sec</small></span>
          </div>
        )}
      </div>
      {rest.length > 0 && (
        <ol className="countdown__list">
          {rest.map((e) => {
            const days = daysFrom(e.date, now)
            return (
              <li key={e.key} style={{ ['--c' as string]: e.color }}>
                <span className="countdown__dot" aria-hidden>{e.emoji}</span>
                <span className="countdown__what">
                  <b>{e.title}</b>
                  <small>{formatDayMonth(e.date)}</small>
                </span>
                <span className="countdown__in">{days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`}</span>
              </li>
            )
          })}
        </ol>
      )}
      {link && <Link className="link-arrow small countdown__more" to="/calendar">The full calendar →</Link>}
    </section>
  )
}
