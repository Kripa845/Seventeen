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
