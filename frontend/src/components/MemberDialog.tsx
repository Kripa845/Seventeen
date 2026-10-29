import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { ageOn, formatDate, formatDayMonth, nextAnniversary } from '../lib/dates'
import type { Member } from '../lib/types'
import { MilitaryService } from '../pages/MemberDetail'
import { MemberAvatar } from './MemberAvatar'

/** A member's details in a pop-up, for the landing page (where profiles need an account).
 *  Arrows, unit-mates and the keyboard (← →) move to other members; Esc or the backdrop closes it. */
export function MemberDialog({ member: m, members, onPick, onClose }: { member: Member; members: Member[]; onPick: (m: Member) => void; onClose: () => void }) {
  const { account } = useAuth()
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
  }, [])

  // a new member starts at the top
  useEffect(() => ref.current?.scrollTo({ top: 0 }), [m.slug])

  const i = members.findIndex((x) => x.slug === m.slug)
  const prev = members[(i - 1 + members.length) % members.length]
  const next = members[(i + 1) % members.length]
  const mates = members.filter((x) => x.unit === m.unit && x.slug !== m.slug)
  const bday = nextAnniversary(m.birthday)

  return (
    <dialog
      ref={ref}
      className="mdialog"
      style={{ ['--m' as string]: m.color }}
      aria-labelledby="mdialog-name"
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && ref.current?.close()} // the backdrop
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') onPick(prev)
        if (e.key === 'ArrowRight') onPick(next)
      }}
    >
      <div className="mdialog__body">
        <button className="mdialog__close" onClick={() => ref.current?.close()} aria-label="Close">✕</button>

        <header className="mdialog__hero">
          <div className="mdialog__photo">
            {m.photo ? <img src={m.photo} alt={m.stage_name} /> : <MemberAvatar member={m} size="lg" />}
          </div>
          <div>
            <p className="eyebrow">
              {m.unit_label}
              {m.is_unit_leader && ' · Unit leader'}
            </p>
            <h2 id="mdialog-name" className="mdialog__name">
              {m.stage_name} <span aria-hidden>{m.symbol}</span>
            </h2>
            <p className="mdialog__birthname">{m.birth_name}</p>
            <p className="mdialog__tagline">“{m.tagline}”</p>
          </div>
        </header>

        <ul className="mdialog__stats">
          <li><b>{ageOn(m.birthday)}</b><span>years old</span></li>
          <li><b>{bday.days === 0 ? '🎂' : bday.days}</b><span>{bday.days === 0 ? 'birthday today!' : `days to the birthday`}</span></li>
          <li><b>{formatDayMonth(bday.date)}</b><span>birthday</span></li>
        </ul>

        <dl className="facts mdialog__facts">
          <dt>Stage name</dt>
          <dd>{m.stage_name}</dd>
          <dt>Birth name</dt>
          <dd>{m.birth_name}</dd>
          <dt>Born</dt>
          <dd>{formatDate(m.birthday)}</dd>
          <dt>Hometown</dt>
          <dd>{m.birthplace}</dd>
          <dt>Unit</dt>
          <dd>{m.unit_label}{m.is_unit_leader && ' (leader)'}</dd>
          <dt>Position</dt>
          <dd>{m.position}</dd>
          <dt>Colour</dt>
          <dd><span className="profile__swatch" style={{ background: m.color }} aria-hidden /> <code>{m.color}</code></dd>
        </dl>

        {m.fun_facts.length > 0 && (
          <section className="mdialog__section">
            <h3>Fun facts</h3>
            <ul className="mdialog__funfacts">
              {m.fun_facts.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </section>
        )}

        <MilitaryService m={m} />

        {mates.length > 0 && (
          <section className="mdialog__section">
            <h3>{m.is_unit_leader ? `${m.stage_name} leads` : 'Unit-mates'}</h3>
            <ul className="mini-members">
              {mates.map((x) => (
                <li key={x.slug}>
                  <button style={{ ['--m' as string]: x.color }} onClick={() => onPick(x)}>
                    <MemberAvatar member={x} size="sm" />
                    <span>{x.stage_name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="mdialog__foot">
          <button className="btn btn--ghost btn--small" onClick={() => onPick(prev)} aria-label={`Previous: ${prev.stage_name}`}>← {prev.stage_name}</button>
          {account ? (
            <Link className="btn btn--small" to={`/members/${m.slug}`}>Full profile & songs →</Link>
          ) : (
            <Link className="btn btn--small" to={`/register?next=${encodeURIComponent(`/members/${m.slug}`)}`}>Sign up for the full profile</Link>
          )}
          <button className="btn btn--ghost btn--small" onClick={() => onPick(next)} aria-label={`Next: ${next.stage_name}`}>{next.stage_name} →</button>
        </footer>
      </div>
    </dialog>
  )
}
