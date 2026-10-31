import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Countdown } from '../components/Countdown'
import { MemberAvatar } from '../components/MemberAvatar'
import { ApiError, Loading } from '../components/Status'
import { useEvents } from '../fan/api'
import { MEMBER_THEMES } from '../fan/birthday'
import { daysFrom, entriesBetween, EVENT_EMOJI, isoOf } from '../fan/calendar'
import type { CalendarEntry } from '../fan/calendar'
import { useMembers } from '../lib/api'
import '../fan/fan.css'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const LEGEND = [
  { emoji: '🎂', label: 'Birthday' },
  { emoji: '💎', label: 'Anniversary' },
  { emoji: EVENT_EMOJI.comeback, label: 'Comeback' },
  { emoji: EVENT_EMOJI.concert, label: 'Concert' },
  { emoji: EVENT_EMOJI.fanmeeting, label: 'Fan meeting' },
  { emoji: EVENT_EMOJI.broadcast, label: 'Broadcast' },
]

/** Every date of the year as an all-day event, for phone and laptop calendars. */
function downloadIcs(entries: CalendarEntry[]) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'
  const esc = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n')
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SVT fan site//CARAT calendar//EN', 'CALSCALE:GREGORIAN']
  for (const e of entries) {
    const day = isoOf(e.date).replace(/-/g, '')
    const end = isoOf(new Date(e.date.getFullYear(), e.date.getMonth(), e.date.getDate() + 1)).replace(/-/g, '')
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.key}@svt-fan-site`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${day}`,
      `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:${esc(`${e.emoji} ${e.title}`)}`,
      `DESCRIPTION:${esc(e.detail)}`,
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  const url = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/calendar' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'seventeen-calendar.ics'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** /calendar : birthdays, the anniversary and the comebacks and concerts admins add. */
export function Calendar() {
  const members = useMembers()
  const events = useEvents()
  const today = new Date()
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [picked, setPicked] = useState<string>(() => isoOf(today))

  const first = month
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0)
  const entries = useMemo(
    () => (members.data ? entriesBetween(members.data, events.data ?? [], first, last) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- first/last follow month
    [members.data, events.data, month],
  )
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEntry[]>()
    for (const e of entries) map.set(isoOf(e.date), [...(map.get(isoOf(e.date)) ?? []), e])
    return map
  }, [entries])

  if (members.error) return <ApiError message={members.error} />
  if (!members.data) return <Loading />

  const lead = (first.getDay() + 6) % 7 // Monday first
  const cells: (Date | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: last.getDate() }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1)),
  ]
  while (cells.length % 7) cells.push(null)

  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1))
  const pickedEntries = byDay.get(picked) ?? []
  const [py, pm, pd] = picked.split('-').map(Number)
  const pickedDate = new Date(py, pm - 1, pd)
  const year = entriesBetween(members.data, events.data ?? [], new Date(today.getFullYear(), 0, 1), new Date(today.getFullYear() + 1, 11, 31))

  return (
    <div className="cal-page">
      <header className="page-head">
        <p className="eyebrow">Birthdays · anniversary · comebacks</p>
        <h1>CARAT calendar</h1>
        <p className="muted">Every member's birthday, debut day and the comebacks and concerts we know about. On a member's birthday the whole site wears their theme.</p>
        <div className="cal-legend">
          {LEGEND.map((l) => (
            <span key={l.label} className="chip chip--small"><span aria-hidden>{l.emoji}</span> {l.label}</span>
          ))}
          <button className="btn btn--ghost btn--small" onClick={() => downloadIcs(year)}>⤓ Add to my calendar (.ics)</button>
        </div>
      </header>

      <Countdown link={false} />

      <div className="cal-layout">
        <section className="card cal">
          <div className="cal__head">
            <button className="btn btn--ghost btn--small" onClick={() => shift(-1)} aria-label="Previous month">←</button>
            <h2>{month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</h2>
            <button className="btn btn--ghost btn--small" onClick={() => shift(1)} aria-label="Next month">→</button>
            {(month.getMonth() !== today.getMonth() || month.getFullYear() !== today.getFullYear()) && (
              <button
                className="chip chip--small"
                onClick={() => {
                  setMonth(new Date(today.getFullYear(), today.getMonth(), 1))
                  setPicked(isoOf(today))
                }}
              >
                Today
              </button>
            )}
          </div>
          <div className="cal__grid" role="grid" aria-label="Days of the month">
            {WEEKDAYS.map((d) => (
              <span key={d} className="cal__weekday" role="columnheader">{d}</span>
            ))}
            {cells.map((d, i) => {
              if (!d) return <span key={`x${i}`} className="cal__day cal__day--blank" aria-hidden />
              const iso = isoOf(d)
              const list = byDay.get(iso) ?? []
              const isToday = iso === isoOf(today)
              return (
                <button
                  key={iso}
                  role="gridcell"
                  aria-selected={picked === iso}
                  className={`cal__day ${isToday ? 'is-today' : ''} ${picked === iso ? 'is-picked' : ''} ${list.length ? 'has-entries' : ''}`}
                  style={list[0] ? { ['--c' as string]: list[0].color } : undefined}
                  onClick={() => setPicked(iso)}
                  aria-label={`${d.getDate()} ${month.toLocaleDateString('en-GB', { month: 'long' })}${list.length ? `: ${list.map((e) => e.title).join(', ')}` : ''}`}
                >
                  <span className="cal__num">{d.getDate()}</span>
                  <span className="cal__marks">
                    {list.slice(0, 3).map((e) =>
                      e.member ? (
                        <span key={e.key} className="cal__face" title={e.title}><MemberAvatar member={e.member} size="sm" /></span>
                      ) : (
                        <span key={e.key} className="cal__emoji" title={e.title}>{e.emoji}</span>
                      ),
                    )}
                  </span>
                  {list[0] && <span className="cal__label">{list[0].member ? list[0].member.stage_name : list[0].title}</span>}
                </button>
              )
            })}
          </div>
        </section>

        <aside className="card cal-day">
          <p className="eyebrow">
            {pickedDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            {(() => {
              const n = daysFrom(pickedDate, today)
              return n === 0 ? ' · today' : n > 0 ? ` · in ${n} day${n === 1 ? '' : 's'}` : ` · ${-n} day${n === -1 ? '' : 's'} ago`
            })()}
          </p>
          {pickedEntries.length ? (
            <ul className="cal-day__list">
              {pickedEntries.map((e) => (
                <li key={e.key} style={{ ['--c' as string]: e.color }}>
                  {e.member ? <MemberAvatar member={e.member} size="md" /> : <span className="cal-day__emoji" aria-hidden>{e.emoji}</span>}
                  <div>
                    <h3>{e.title}</h3>
                    <p className="muted small">{e.detail}</p>
                    {e.member && (
                      <p className="small">
                        <Link to={`/members/${e.member.slug}`}>{e.member.stage_name}'s profile →</Link>
                        {MEMBER_THEMES[e.member.slug] && <span className="muted"> · the site wears his theme all day</span>}
                      </p>
                    )}
                    {e.member && <p className="small"><Link to={`/letters?to=${e.member.slug}`}>Write him a birthday letter 💌</Link></p>}
                    {e.event?.link && <p className="small"><a href={e.event.link} target="_blank" rel="noreferrer">More about it ↗</a></p>}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Nothing on this day. Pick a marked day to see what's on.</p>
          )}
          <h4 className="cal-day__sub">This month</h4>
          {entries.length ? (
            <ul className="cal-month">
              {entries.map((e) => (
                <li key={e.key}>
                  <button onClick={() => setPicked(isoOf(e.date))} style={{ ['--c' as string]: e.color }}>
                    <b>{e.date.getDate()}</b>
                    <span aria-hidden>{e.emoji}</span>
                    <span>{e.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small">A quiet month.</p>
          )}
        </aside>
      </div>
    </div>
  )
}
