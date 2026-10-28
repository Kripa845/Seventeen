import { mix } from '../lib/color'
import type { Member } from '../lib/types'

/** Shows the member's photo if one was uploaded in Django admin, otherwise a soft gradient with their symbol. */
export function MemberAvatar({ member, size = 'md' }: { member: Member; size?: 'sm' | 'md' | 'lg' }) {
  const style = {
    background: `linear-gradient(145deg, ${mix(member.color, '#ffffff', 0.35)}, ${member.color})`,
  }
  return (
    <div className={`avatar avatar--${size}`} style={style}>
      {member.photo ? (
        <img src={member.photo} alt={member.stage_name} loading="lazy" />
      ) : (
        <span className="avatar__symbol" aria-hidden>
          {member.symbol}
        </span>
      )}
    </div>
  )
}
