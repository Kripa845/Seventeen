import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties, PointerEvent } from 'react'
import { ApiError, Loading } from '../components/Status'
import { useCards } from '../fan/api'
import { useMembers } from '../lib/api'
import { send, useStudioData } from '../lib/studio'
import type { Binder as BinderData, Member, PhotoCard } from '../lib/types'
import '../fan/fan.css'

const PER_PAGE = 9
const RARITY_LABEL = { common: 'Common', rare: 'Rare ✦', special: 'Special ✦✦' }

/** A card that tilts toward the pointer, with a shine on rare and special cards. */
function Card({ card, big = false }: { card: PhotoCard; big?: boolean }) {
  const [tilt, setTilt] = useState<CSSProperties>({})
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    setTilt({
      transform: `rotateY(${(x - 0.5) * (big ? 22 : 14)}deg) rotateX(${(0.5 - y) * (big ? 22 : 14)}deg)`,
      ['--sx' as string]: `${x * 100}%`,
      ['--sy' as string]: `${y * 100}%`,
    })
  }
  return (
    <div className={`pcard pcard--${card.rarity} ${big ? 'pcard--big' : ''}`} style={tilt} onPointerMove={move} onPointerLeave={() => setTilt({})}>
      <img src={card.image} alt={card.title} loading="lazy" draggable={false} />
      <span className="pcard__shine" aria-hidden />
      <span className="pcard__foot">
        <b>{card.member_name}</b>
        <small>{card.title}</small>
      </span>
    </div>
  )
}

/** Today's pack: the cards come face down and flip one by one (or all at once). */
function PackOpening({ cards, wasNew, onClose }: { cards: PhotoCard[]; wasNew: Set<number>; onClose: () => void }) {
  const [shown, setShown] = useState<number[]>([])
  const all = shown.length === cards.length
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="pack" role="dialog" aria-modal="true" aria-label="Today's pack">
      <div className="pack__inner">
        <p className="eyebrow">Today's pack</p>
        <h2>{all ? 'Into the binder they go!' : 'Tap a card to turn it over'}</h2>
        <div className="pack__cards">
          {cards.map((c, i) => {
            const open = shown.includes(i)
            return (
              <button
                key={i}
                className={`pack__slot ${open ? 'is-open' : ''}`}
                style={{ ['--i' as string]: i }}
                onClick={() => !open && setShown((s) => [...s, i])}
                aria-label={open ? `${c.member_name}: ${c.title}` : `Card ${i + 1}, face down`}
              >
                <span className="pack__flip">
                  <span className="pack__back" aria-hidden>
                    <img src="/diamond.svg" alt="" width={40} height={40} />
                    <small>SVT</small>
                  </span>
                  <span className="pack__front">
                    <Card card={c} />
                    {wasNew.has(c.id) && cards.findIndex((x) => x.id === c.id) === i && <span className="pack__new">NEW</span>}
                    {c.rarity !== 'common' && <span className="pack__rarity">{RARITY_LABEL[c.rarity]}</span>}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
        <div className="pack__actions">
          {!all && <button className="btn btn--ghost" onClick={() => setShown(cards.map((_, i) => i))}>Turn them all over</button>}
          <button className="btn" onClick={onClose}>{all ? 'See my binder' : 'Later'}</button>
        </div>
      </div>
    </div>
  )
}

/** /binder : a photocard binder. One pack a day; admins upload the cards in the Studio. */
export function Binder() {
  const cards = useCards()
  const members = useMembers().data ?? []
  const binder = useStudioData<BinderData>('/me/binder/')
  const [filter, setFilter] = useState<string>('all')
  const [onlyMine, setOnlyMine] = useState(false)
  const [page, setPage] = useState(0)
  const [opening, setOpening] = useState<{ cards: PhotoCard[]; wasNew: Set<number> } | null>(null)
  const [zoom, setZoom] = useState<PhotoCard | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const counts = useMemo(() => binder.data?.counts ?? {}, [binder.data])
  const shown = useMemo(
    () =>
      (cards.data ?? []).filter(
        (c) => (filter === 'all' || (filter === 'ot13' ? !c.member : c.member === filter)) && (!onlyMine || counts[c.id]),
      ),
    [cards.data, filter, onlyMine, counts],
  )
  const pages = Math.max(1, Math.ceil(shown.length / PER_PAGE))
  const safePage = Math.min(page, pages - 1)

  if (cards.error) return <ApiError message={cards.error} />
  if (!cards.data || !binder.data) return <Loading />

  const total = cards.data.length
  const owned = cards.data.filter((c) => counts[c.id]).length
  const dupes = Object.values(counts).reduce((n, c) => n + Math.max(0, c - 1), 0)
  const withCards = members.filter((m) => cards.data!.some((c) => c.member === m.slug))
  const hasGroup = cards.data.some((c) => !c.member)

  const openPack = async () => {
    setBusy(true)
    setError(null)
    try {
      const before = counts
      const res = await send<BinderData>('POST', '/me/binder/')
      binder.setData(res)
      const pulled = res.pulled ?? []
      setOpening({ cards: pulled, wasNew: new Set(pulled.filter((c) => !before[c.id]).map((c) => c.id)) })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const memberProgress = (m: Member) => {
    const mine = cards.data!.filter((c) => c.member === m.slug)
    return { have: mine.filter((c) => counts[c.id]).length, of: mine.length }
  }

  const spread = shown.slice(safePage * PER_PAGE, safePage * PER_PAGE + PER_PAGE)
  const today = (binder.data.today ?? []).map((id) => cards.data!.find((c) => c.id === id)).filter(Boolean) as PhotoCard[]

  return (
    <div className="binder-page">
      <header className="page-head">
        <p className="eyebrow">Photocard binder · one pack a day</p>
        <h1>My binder</h1>
        <p className="muted">Open a pack of {binder.data.pack_size} cards every day and fill the pockets. Rare and special cards turn up less often.</p>
      </header>

      <section className="card binder-top">
        <div className="binder-progress">
          <b>{owned}</b>
          <span className="muted">of {total} cards{dupes ? ` · ${dupes} duplicate${dupes === 1 ? '' : 's'}` : ''}</span>
          <span className="binder-progress__bar" aria-hidden>
            <i style={{ width: `${total ? (owned / total) * 100 : 0}%` }} />
          </span>
        </div>
        <div className="binder-pack">
          {binder.data.pack_ready ? (
            <button className="btn binder-pack__btn" onClick={openPack} disabled={busy || !total}>
              <span aria-hidden>🎁</span> {busy ? 'Opening…' : "Open today's pack"}
            </button>
          ) : (
            <div className="binder-pack__done">
              <span className="muted small">Today's pack:</span>
              <span className="binder-pack__today">
                {today.map((c, i) => (
                  <button key={i} onClick={() => setZoom(c)} aria-label={`${c.member_name}: ${c.title}`}>
                    <img src={c.image} alt="" />
                  </button>
                ))}
              </span>
              <span className="muted small">Next pack tomorrow ✦</span>
            </div>
          )}
          {error && <p className="studio-error small">{error}</p>}
        </div>
      </section>

      {!total ? (
        <p className="muted card binder-empty">No photocards yet. Once an admin uploads some in the Studio, your first pack is waiting.</p>
      ) : (
        <>
          <div className="binder-filters" role="tablist" aria-label="Whose cards">
            <button className={`chip ${filter === 'all' ? 'is-on' : ''}`} onClick={() => (setFilter('all'), setPage(0))}>All</button>
            {hasGroup && <button className={`chip ${filter === 'ot13' ? 'is-on' : ''}`} onClick={() => (setFilter('ot13'), setPage(0))}>Group</button>}
            {withCards.map((m) => {
              const p = memberProgress(m)
              return (
                <button key={m.slug} className={`chip ${filter === m.slug ? 'is-on' : ''}`} style={{ ['--m' as string]: m.color }} onClick={() => (setFilter(m.slug), setPage(0))}>
                  {m.stage_name} <small>{p.have}/{p.of}</small>
                </button>
              )
            })}
            <span className="era-filters__gap" aria-hidden />
            <button className={`chip ${onlyMine ? 'is-on' : ''}`} aria-pressed={onlyMine} onClick={() => (setOnlyMine((v) => !v), setPage(0))}>Only cards I have</button>
          </div>

          <section className="binder" aria-label={`Binder page ${safePage + 1} of ${pages}`}>
            <div className="binder__rings" aria-hidden><i /><i /><i /></div>
            <div className="binder__sheet">
              {Array.from({ length: PER_PAGE }, (_, i) => {
                const c = spread[i]
                if (!c) return <span key={`e${i}`} className="pocket pocket--empty" aria-hidden />
                const n = counts[c.id] ?? 0
                return n ? (
                  <button key={c.id} className="pocket" onClick={() => setZoom(c)} aria-label={`${c.member_name}: ${c.title}${n > 1 ? `, ${n} copies` : ''}`}>
                    <Card card={c} />
                    {n > 1 && <span className="pocket__count">×{n}</span>}
                  </button>
                ) : (
                  <span key={c.id} className={`pocket pocket--missing pocket--${c.rarity}`} title="Not in your binder yet">
                    <span className="pocket__q" aria-hidden>?</span>
                    <b>{c.member_name}</b>
                    <small>{c.title}</small>
                    {c.rarity !== 'common' && <small className="pocket__rarity">{RARITY_LABEL[c.rarity]}</small>}
                  </span>
                )
              })}
            </div>
          </section>
          {!shown.length && <p className="muted">No cards here yet.</p>}
          {pages > 1 && (
            <nav className="binder-pager" aria-label="Binder pages">
              <button className="btn btn--ghost btn--small" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>← Page</button>
              <span className="muted small">Page {safePage + 1} of {pages}</span>
              <button className="btn btn--ghost btn--small" disabled={safePage >= pages - 1} onClick={() => setPage(safePage + 1)}>Page →</button>
            </nav>
          )}
        </>
      )}

      {opening && <PackOpening cards={opening.cards} wasNew={opening.wasNew} onClose={() => setOpening(null)} />}
      {zoom && (
        <div className="pack" role="dialog" aria-modal="true" aria-label={zoom.title} onClick={() => setZoom(null)}>
          <div className="pack__zoom" onClick={(e) => e.stopPropagation()}>
            <Card card={zoom} big />
            <p>
              <b>{zoom.member_name}</b> · {zoom.title} · {RARITY_LABEL[zoom.rarity]}
              {(counts[zoom.id] ?? 0) > 1 && ` · ×${counts[zoom.id]}`}
            </p>
            <button className="btn btn--ghost btn--small" onClick={() => setZoom(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
