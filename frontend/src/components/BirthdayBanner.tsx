import { Link } from 'react-router-dom'
import { useTheme } from '../lib/theme'
import '../fan/fan.css'

/** On a member's birthday: a ribbon under the nav, and a way back to your usual theme for the day. */
export function BirthdayBanner() {
  const { birthday, birthdayMember, setBirthdayOn } = useTheme()
  if (!birthdayMember) return null
  const m = birthdayMember
  if (!birthday) {
    return (
      <div className="bday-ribbon bday-ribbon--off">
        🎂 It's {m.stage_name}'s birthday ·{' '}
        <button className="link-btn" onClick={() => setBirthdayOn(true)}>wear his theme</button>
      </div>
    )
  }
  return (
    <div className="bday-ribbon" style={{ ['--m' as string]: m.color }} role="note">
      <span className="bday-ribbon__confetti" aria-hidden>🎉</span>
      <span>
        <b>Happy birthday, {m.stage_name}!</b> {m.symbol} The site is wearing his theme today.
      </span>
      <Link className="chip chip--small" to={`/letters?to=${m.slug}`}>Write him a letter 💌</Link>
      <button className="link-btn small" onClick={() => setBirthdayOn(false)}>Wear my usual theme</button>
    </div>
  )
}
