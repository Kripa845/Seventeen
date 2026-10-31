import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loading } from '../components/Status'
import { useAlbums, useMembers } from '../lib/api'
import { send, useStudioData } from '../lib/studio'
import type { CardRarity, PhotoCard } from '../lib/types'
import { useToast } from './ui'
import '../fan/fan.css'

const RARITIES: { value: CardRarity; label: string }[] = [
  { value: 'common', label: 'Common' },
  { value: 'rare', label: 'Rare ✦' },
  { value: 'special', label: 'Special ✦✦' },
]
const MAX_MB = 10

/** Studio → Photocards: upload the cards fans collect in their binders. */
export function CardsAdmin() {
  const toast = useToast()
  const cards = useStudioData<PhotoCard[]>('/cards/')
  const members = useMembers().data ?? []
  const albums = useAlbums().data ?? []
  const input = useRef<HTMLInputElement>(null)
  const [member, setMember] = useState('')
  const [album, setAlbum] = useState('')
  const [rarity, setRarity] = useState<CardRarity>('common')
  const [uploading, setUploading] = useState(0)
  const [over, setOver] = useState(false)
  const [filter, setFilter] = useState('all')

  if (cards.error) return <p className="studio-error">{cards.error}</p>
  if (!cards.data) return <Loading />

  const upload = async (files: FileList | File[]) => {
    const list = [...files].filter((f) => f.type.startsWith('image/'))
    if (!list.length) return toast('Pick image files', 'error')
    setUploading(list.length)
    const made: PhotoCard[] = []
    for (const file of list) {
      if (file.size > MAX_MB * 1024 * 1024) {
        toast(`${file.name} is over ${MAX_MB} MB`, 'error')
        setUploading((n) => n - 1)
        continue
      }
      const form = new FormData()
      form.append('image', file)
      const m = members.find((x) => x.slug === member)
      const name = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim()
      form.append('title', (name || m?.stage_name || 'SEVENTEEN').slice(0, 80))
      if (member) form.append('member', member)
      if (album) form.append('album', album)
      form.append('rarity', rarity)
      form.append('order', String(cards.data!.length + made.length + 1))
      try {
        made.push(await send<PhotoCard>('POST', '/cards/', form))
      } catch (e) {
        toast(`${file.name}: ${(e as Error).message}`, 'error')
      }
      setUploading((n) => n - 1)
    }
    if (made.length) {
      cards.setData([...cards.data!, ...made])
      toast(`${made.length} card${made.length === 1 ? '' : 's'} added`)
    }
    if (input.current) input.current.value = ''
  }

  const edit = async (card: PhotoCard, patch: Partial<Pick<PhotoCard, 'title' | 'member' | 'rarity' | 'album'>>) => {
    try {
      const fresh = await send<PhotoCard>('PATCH', `/cards/${card.id}/`, patch)
      cards.setData(cards.data!.map((c) => (c.id === card.id ? fresh : c)))
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }

  const remove = async (card: PhotoCard) => {
    if (!window.confirm(`Delete the card “${card.title}”? It disappears from every binder.`)) return
    try {
      await send('DELETE', `/cards/${card.id}/`)
      cards.setData(cards.data!.filter((c) => c.id !== card.id))
      toast('Card deleted')
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }

  const shown = cards.data.filter((c) => filter === 'all' || (filter === 'ot13' ? !c.member : c.member === filter))
  const count = (r: CardRarity) => cards.data!.filter((c) => c.rarity === r).length

  return (
    <div className="studio-page">
      <header className="studio-head">
        <p className="eyebrow">Photocards</p>
        <h1>Photocard binder</h1>
        <p className="muted">
          Every signed-in fan opens a pack of 3 cards a day and collects them in their <Link to="/binder" target="_blank">binder ↗</Link>. Rare cards
          come up 4 times less often than common ones, special ones 10 times less.
        </p>
      </header>

      <section className="card studio-card">
        <div className="studio-card__head">
          <h2>Add cards</h2>
          <span className="muted small">
            {cards.data.length} cards · {count('common')} common · {count('rare')} rare · {count('special')} special
          </span>
        </div>
        <div className="cards-up">
          <label className="sf">
            <span className="sf__label">Member</span>
            <select value={member} onChange={(e) => setMember(e.target.value)}>
              <option value="">Group card (OT13)</option>
              {members.map((m) => (
                <option key={m.slug} value={m.slug}>{m.stage_name}</option>
              ))}
            </select>
          </label>
          <label className="sf">
            <span className="sf__label">Era</span>
            <select value={album} onChange={(e) => setAlbum(e.target.value)}>
              <option value="">Any era</option>
              {albums.map((a) => (
                <option key={a.slug} value={a.slug}>{a.title}</option>
              ))}
            </select>
          </label>
          <label className="sf">
            <span className="sf__label">Rarity</span>
            <select value={rarity} onChange={(e) => setRarity(e.target.value as CardRarity)}>
              {RARITIES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </label>
        </div>
        <div
          className={`cards-drop ${over ? 'is-over' : ''}`}
          role="button"
          tabIndex={0}
          onClick={() => input.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && input.current?.click()}
          onDragOver={(e) => (e.preventDefault(), setOver(true))}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setOver(false)
            upload(e.dataTransfer.files)
          }}
        >
          {uploading ? `Uploading… ${uploading} to go` : 'Drop photos here, or click to pick several. Each photo becomes a card (portrait photos look best).'}
          <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && upload(e.target.files)} />
        </div>
      </section>

      <section className="card studio-card">
        <div className="studio-card__head">
          <h2>All cards</h2>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Show cards of">
            <option value="all">Everyone</option>
            <option value="ot13">Group cards</option>
            {members.map((m) => (
              <option key={m.slug} value={m.slug}>{m.stage_name}</option>
            ))}
          </select>
        </div>
        {shown.length ? (
          <ul className="cards-admin">
            {shown.map((c) => (
              <li key={c.id} className={`cards-admin__item is-${c.rarity}`}>
                <img src={c.image} alt="" loading="lazy" />
                <input
                  defaultValue={c.title}
                  maxLength={80}
                  aria-label="Card name"
                  onBlur={(e) => e.target.value.trim() && e.target.value !== c.title && edit(c, { title: e.target.value })}
                />
                <select value={c.member ?? ''} onChange={(e) => edit(c, { member: e.target.value || null })} aria-label="Member">
                  <option value="">Group (OT13)</option>
                  {members.map((m) => (
                    <option key={m.slug} value={m.slug}>{m.stage_name}</option>
                  ))}
                </select>
                <div className="cards-admin__row">
                  <select value={c.rarity} onChange={(e) => edit(c, { rarity: e.target.value as CardRarity })} aria-label="Rarity">
                    {RARITIES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  <button className="icon-btn icon-btn--danger" title="Delete card" onClick={() => remove(c)}>✕</button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted small">No cards yet. Add some above and fans can start collecting.</p>
        )}
      </section>
    </div>
  )
}
