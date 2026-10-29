import type { CSSProperties, ReactNode } from 'react'
import { mix } from '../lib/color'
import type { DiaryItem, DiaryPage, Member } from '../lib/types'
import { FONTS, itemStyle, LABELS, parseDate } from './kit'
import { SongCard } from './SongCard'
import { VideoStill } from './Video'

export type MemberMap = Record<string, Member>

function Ransom({ text }: { text: string }) {
  return (
    <>
      {[...text].map((ch, i) => (
        <span key={i} className={`ransom__ch ransom__ch--${i % 5}`} style={{ rotate: `${((i * 37) % 11) - 5}deg` }}>
          {ch === ' ' ? ' ' : ch}
        </span>
      ))}
    </>
  )
}

const SHAPES: Record<string, ReactNode> = {
  heart: <path d="M50 88 12 50C-4 32 10 6 32 10c9 2 14 8 18 15 4-7 9-13 18-15 22-4 36 22 20 40Z" fill="#ff6f91" />,
  star: <path d="m50 6 13 28 30 4-22 21 6 30-27-15-27 15 6-30L7 38l30-4Z" fill="#ffd34e" />,
  sparkle: <path d="M50 4C54 34 66 46 96 50 66 54 54 66 50 96 46 66 34 54 4 50 34 46 46 34 50 4Z" fill="#a8c5ff" />,
  diamond: (
    <g strokeLinejoin="round">
      <path d="M20 18h60l16 22-46 52L4 40Z" fill="#f7cac9" />
      <path d="M4 40h92M36 18l-6 22 20 52 20-52-6-22M30 40l20-22 20 22" fill="none" stroke="#c25e73" strokeWidth="3" />
      <path d="M20 18h60l16 22-46 52L4 40Z" fill="none" stroke="#c25e73" strokeWidth="3" />
    </g>
  ),
  flower: (
    <g>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="50" cy="27" rx="17" ry="24" fill="#ffb3c7" transform={`rotate(${a} 50 50)`} />
      ))}
      <circle cx="50" cy="50" r="13" fill="#ffd34e" />
    </g>
  ),
  cloud: <path d="M26 78a18 18 0 0 1-2-36 24 24 0 0 1 46-8 20 20 0 0 1 8 44Z" fill="#fff" stroke="#9fb4e6" strokeWidth="3" />,
  // the CARAT light stick: a rose quartz diamond on a white handle
  lightstick: (
    <g strokeLinejoin="round">
      <rect x="43" y="52" width="14" height="44" rx="7" fill="#f4f2fa" stroke="#9aa3c4" strokeWidth="3" />
      <path d="M50 4 76 24 66 54H34L24 24Z" fill="#f7cac9" stroke="#7d93c9" strokeWidth="3" />
      <path d="M24 24h52M50 4l-9 20 9 30 9-30Z" fill="none" stroke="#7d93c9" strokeWidth="2.5" />
    </g>
  ),
  crown: (
    <g strokeLinejoin="round">
      <path d="M12 72 16 28l20 20 14-30 14 30 20-20 4 44Z" fill="#ffd34e" stroke="#c99a1a" strokeWidth="3" />
      <rect x="12" y="72" width="76" height="12" rx="3" fill="#f2b81e" stroke="#c99a1a" strokeWidth="3" />
      <circle cx="50" cy="60" r="5" fill="#ff6f91" />
    </g>
  ),
  note: (
    <g fill="#7d93c9">
      <ellipse cx="26" cy="78" rx="14" ry="10" transform="rotate(-20 26 78)" />
      <ellipse cx="76" cy="68" rx="14" ry="10" transform="rotate(-20 76 68)" />
      <path d="M36 76V20l52-12v58h-6V18L42 27v49Z" />
    </g>
  ),
  moon: (
    <g>
      <path d="M62 8a42 42 0 1 0 30 64A34 34 0 1 1 62 8Z" fill="#ffe08a" stroke="#e7b33c" strokeWidth="3" />
      <path d="m78 22 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" fill="#fff3b0" />
    </g>
  ),
  bow: (
    <g fill="#ff8fb1" stroke="#e8476b" strokeWidth="3" strokeLinejoin="round">
      <path d="M50 48C34 26 8 26 10 44s26 22 40 4Z" />
      <path d="M50 48C66 26 92 26 90 44s-26 22-40 4Z" />
      <path d="M46 52 32 90l12-4 6 8 4-42Z" />
      <path d="M54 52l14 38-12-4-6 8-4-42Z" />
      <circle cx="50" cy="48" r="8" />
    </g>
  ),
  butterfly: (
    <g strokeLinejoin="round">
      <path d="M48 50C30 18 6 22 10 40c3 12 20 14 38 10Z" fill="#d6c4ff" stroke="#8a5bc2" strokeWidth="3" />
      <path d="M52 50C70 18 94 22 90 40c-3 12-20 14-38 10Z" fill="#d6c4ff" stroke="#8a5bc2" strokeWidth="3" />
      <path d="M48 54C34 66 22 86 36 86c8 0 12-14 12-32Z" fill="#a8c5ff" stroke="#8a5bc2" strokeWidth="3" />
      <path d="M52 54c14 12 26 32 12 32-8 0-12-14-12-32Z" fill="#a8c5ff" stroke="#8a5bc2" strokeWidth="3" />
      <rect x="46" y="30" width="8" height="52" rx="4" fill="#4a3a6b" />
    </g>
  ),
  smile: (
    <g>
      <circle cx="50" cy="50" r="42" fill="#ffd34e" stroke="#e0a800" strokeWidth="3" />
      <circle cx="36" cy="40" r="5" fill="#3a2a10" />
      <circle cx="64" cy="40" r="5" fill="#3a2a10" />
      <path d="M30 58c8 16 32 16 40 0" fill="none" stroke="#3a2a10" strokeWidth="5" strokeLinecap="round" />
      <circle cx="26" cy="58" r="6" fill="#ff8fb1" opacity="0.6" />
      <circle cx="74" cy="58" r="6" fill="#ff8fb1" opacity="0.6" />
    </g>
  ),
  rainbow: (
    <g fill="none" strokeWidth="8" strokeLinecap="round">
      <path d="M8 78a42 42 0 0 1 84 0" stroke="#ff6f91" />
      <path d="M18 78a32 32 0 0 1 64 0" stroke="#ffd34e" />
      <path d="M28 78a22 22 0 0 1 44 0" stroke="#7fd3a8" />
      <path d="M38 78a12 12 0 0 1 24 0" stroke="#7d93c9" />
    </g>
  ),
  camera: (
    <g strokeLinejoin="round">
      <rect x="8" y="28" width="84" height="56" rx="10" fill="#f7cac9" stroke="#2b2b2b" strokeWidth="3" />
      <path d="M32 28l6-10h24l6 10" fill="#f7cac9" stroke="#2b2b2b" strokeWidth="3" />
      <circle cx="50" cy="56" r="17" fill="#fff" stroke="#2b2b2b" strokeWidth="3" />
      <circle cx="50" cy="56" r="8" fill="#7d93c9" />
      <circle cx="78" cy="40" r="4" fill="#e8476b" />
    </g>
  ),
  cherry: (
    <g>
      <path d="M32 66C40 40 52 22 70 12M68 62C66 40 64 26 70 12" fill="none" stroke="#3e8e6b" strokeWidth="4" strokeLinecap="round" />
      <path d="M70 12c10-4 20 0 22 8-10 4-18 0-22-8Z" fill="#7fd3a8" />
      <circle cx="30" cy="72" r="16" fill="#e8476b" />
      <circle cx="68" cy="70" r="16" fill="#e8476b" />
      <circle cx="24" cy="66" r="4" fill="#fff" opacity="0.7" />
      <circle cx="62" cy="64" r="4" fill="#fff" opacity="0.7" />
    </g>
  ),
}

function Sticker({ id }: { id: string }) {
  const label = LABELS[id]
  if (label)
    return (
      <span className={`stk-label stk-label--${label.style}`} style={{ '--len': Math.max(label.text.length, 3) } as CSSProperties}>
        {label.style === 'ransom' ? <Ransom text={label.text} /> : label.text}
      </span>
    )
  if (id.startsWith('tape:')) return <span className={`stk-tape stk-tape--${id.slice(5)}`} />
  if (id.startsWith('shape:'))
    return (
      <svg className="stk-shape" viewBox="0 0 100 100" aria-hidden>
        {SHAPES[id.slice(6)]}
      </svg>
    )
  return <span className="stk-emoji">{id}</span>
}

function MemberFace({ member }: { member: Member | undefined }) {
  if (member?.photo) return <img src={member.photo} alt={member.stage_name} draggable={false} />
  const color = member?.color ?? '#c25e73'
  return (
    <span className="ditem__face" style={{ background: `linear-gradient(145deg, ${mix(color, '#ffffff', 0.4)}, ${color})` }}>
      {member?.symbol ?? '◆'}
    </span>
  )
}

/** What an item looks like, without its position. */
export function ItemContent({
  item,
  photos,
  videos = {},
  members,
  items = [],
}: {
  item: DiaryItem
  photos: Record<string, string>
  videos?: Record<string, string>
  members: MemberMap
  items?: DiaryItem[] // the rest of the page, so a song can queue the page's other songs
}) {
  if (item.kind === 'sticker') return <Sticker id={item.sticker} />
  if (item.kind === 'song') return <SongCard item={item} items={items} />

  if (item.kind === 'text')
    return (
      <div
        className={`dtext dtext--${item.style}`}
        style={{ fontFamily: FONTS[item.font].family, fontSize: `${item.size}cqw`, color: item.color }}
      >
        {item.text || ' '}
      </div>
    )

  const member = item.kind === 'member' ? members[item.member] : undefined
  return (
    <figure className={`frame frame--${item.frame}`}>
      <div className="frame__pic" style={{ aspectRatio: `1 / ${item.a}` }}>
        {item.kind === 'photo' ? (
          photos[item.photo] ? <img src={photos[item.photo]} alt={item.caption} draggable={false} loading="lazy" /> : <span className="ditem__missing">photo</span>
        ) : item.kind === 'video' ? (
          <VideoStill item={item} videos={videos} />
        ) : (
          <MemberFace member={member} />
        )}
      </div>
      {item.frame === 'polaroid' && <figcaption>{item.caption}</figcaption>}
      {item.frame !== 'polaroid' && item.caption && <figcaption className="frame__tag">{item.caption}</figcaption>}
    </figure>
  )
}

/** The date written in the top corner of every spread. */
function DateStamp({ page }: { page: Pick<DiaryPage, 'date' | 'title'> }) {
  // Photo album pages have no date: just their title, if they have one.
  if (!page.date)
    return page.title ? (
      <div className="stamp" aria-hidden>
        <span className="stamp__title">{page.title}</span>
      </div>
    ) : null
  const d = parseDate(page.date)
  return (
    <div className="stamp" aria-hidden>
      <span className="stamp__day">{d.getDate()}</span>
      <span className="stamp__rest">
        <b>{d.toLocaleDateString('en-GB', { weekday: 'short' })}</b>
        {d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
      </span>
      {page.title && <span className="stamp__title">{page.title}</span>}
    </div>
  )
}

/**
 * A whole spread (two facing pages) at any size: everything inside is measured in
 * cqw, so the same page renders as a thumbnail, in the 3D book or in the editor.
 */
export function Sheet({
  page,
  members,
  photos,
  videos,
  children,
}: {
  page: Pick<DiaryPage, 'date' | 'title' | 'paper' | 'items'> & { photos?: Record<string, string>; videos?: Record<string, string> }
  members: MemberMap
  photos?: Record<string, string>
  videos?: Record<string, string>
  children?: ReactNode
}) {
  return (
    <div className="sheet">
      <div className={`sheet__page paper--${page.paper}`}>
        <DateStamp page={page} />
        {children ??
          page.items.map((item) => (
            <div key={item.id} className={`ditem ditem--${item.kind}`} style={itemStyle(item)}>
              <ItemContent item={item} photos={photos ?? page.photos ?? {}} videos={videos ?? page.videos ?? {}} members={members} items={page.items} />
            </div>
          ))}
        <div className="sheet__spine" aria-hidden />
      </div>
    </div>
  )
}
