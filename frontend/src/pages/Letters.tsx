import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MemberAvatar } from '../components/MemberAvatar'
import { ReportDialog } from '../components/ReportDialog'
import { ApiError, Loading } from '../components/Status'
import { useLetters } from '../fan/api'
import { useMembers } from '../lib/api'
import { send } from '../lib/studio'
import type { Letter, LetterPaper, Member } from '../lib/types'
import '../fan/fan.css'

const PAPERS: { value: LetterPaper; label: string }[] = [
  { value: 'rose', label: 'Rose Quartz' },
  { value: 'serenity', label: 'Serenity' },
  { value: 'cream', label: 'Cream' },
  { value: 'mint', label: 'Mint' },
  { value: 'lilac', label: 'Lilac' },
  { value: 'night', label: 'Night sky' },
]
const MAX = 2000

const when = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

/** The open letter, on its paper. */
export function LetterSheet({ letter, member }: { letter: Pick<Letter, 'body' | 'paper' | 'member_name' | 'author_name' | 'created_at'>; member?: Member }) {
  return (
    <div className={`letter letter--${letter.paper}`} style={member ? { ['--m' as string]: member.color } : undefined}>
      <p className="letter__to">Dear {letter.member_name},</p>
      <div className="letter__body">
        {letter.body.split('\n').map((line, i) => (
          <p key={i}>{line || ' '}</p>
        ))}
      </div>
      <p className="letter__from">
        <span>
          with love, <b>{letter.author_name}</b>
        </span>
        <small>{when(letter.created_at)}</small>
      </p>
    </div>
  )
}

function Envelope({ letter, member, onOpen }: { letter: Letter; member?: Member; onOpen: () => void }) {
  return (
    <button
      className={`envelope envelope--${letter.paper} ${letter.status !== 'approved' ? 'is-pending' : ''}`}
      style={{ ['--m' as string]: member?.color ?? 'var(--accent)' }}
      onClick={onOpen}
      aria-label={`Letter to ${letter.member_name} from ${letter.author_name}`}
    >
      <span className="envelope__flap" aria-hidden />
      <span className="envelope__seal" aria-hidden>{member?.symbol ?? '💎'}</span>
      <span className="envelope__to">To {letter.member_name}</span>
      <span className="envelope__from">from {letter.author_name}{letter.is_mine && ' (you)'}</span>
      <span className="envelope__peek">{letter.body.slice(0, 70)}{letter.body.length > 70 && '…'}</span>
      {letter.status === 'pending' && <span className="envelope__stamp">Waiting for review</span>}
      {letter.status === 'hidden' && <span className="envelope__stamp envelope__stamp--hidden">Not shown</span>}
    </button>
  )
}

function Composer({ members, to, onSent }: { members: Member[]; to: string; onSent: (l: Letter) => void }) {
  const [member, setMember] = useState(to)
  const [paper, setPaper] = useState<LetterPaper>('rose')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState(false)
  useEffect(() => setMember(to), [to])
  const m = members.find((x) => x.slug === member)

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      const letter = await send<Letter>('POST', '/letters/', { member: member || null, paper, body })
      setBody('')
      setPreview(false)
      onSent(letter)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card composer">
      <h2>Write a letter</h2>
      <div className="composer__row">
        <label className="composer__field">
          <span className="small muted">To</span>
          <select value={member} onChange={(e) => setMember(e.target.value)}>
            <option value="">All of SEVENTEEN</option>
            {members.map((x) => (
              <option key={x.slug} value={x.slug}>{x.stage_name}</option>
            ))}
          </select>
        </label>
        <div className="composer__field">
          <span className="small muted">Paper</span>
          <div className="composer__papers" role="radiogroup" aria-label="Paper">
            {PAPERS.map((p) => (
              <button
                key={p.value}
                type="button"
                role="radio"
                aria-checked={paper === p.value}
                title={p.label}
                aria-label={p.label}
                className={`composer__paper letter--${p.value} ${paper === p.value ? 'is-on' : ''}`}
                onClick={() => setPaper(p.value)}
              />
            ))}
          </div>
        </div>
      </div>
      {preview ? (
        <LetterSheet letter={{ body: body.trim() || '…', paper, member_name: m?.stage_name ?? 'SEVENTEEN', author_name: 'you', created_at: new Date().toISOString() }} member={m} />
      ) : (
        <textarea
          className={`composer__text letter--${paper}`}
          value={body}
          maxLength={MAX}
          rows={7}
          onChange={(e) => setBody(e.target.value)}
          placeholder={`Dear ${m?.stage_name ?? 'SEVENTEEN'},\n\nThank you for…`}
          aria-label="Your letter"
        />
      )}
      <div className="composer__foot">
        <span className="muted small">{body.length}/{MAX} · an admin reads every letter before it's posted</span>
        <button className="btn btn--ghost btn--small" type="button" onClick={() => setPreview((v) => !v)}>{preview ? 'Keep writing' : 'Preview'}</button>
        <button className="btn btn--small" type="button" onClick={submit} disabled={busy || body.trim().length < 5}>
          {busy ? 'Sending…' : 'Send it 💌'}
        </button>
      </div>
      {error && <p className="studio-error small">{error}</p>}
    </section>
  )
}

/** /letters : fan letters to the members, shown once an admin approves them. ?to=<slug> opens a member's mailbox. */
export function Letters() {
  const [params, setParams] = useSearchParams()
  const box = params.get('to') // null: every letter · 'all': to the whole group · a member slug
  const members = useMembers()
  const letters = useLetters(box)
  const [open, setOpen] = useState<Letter | null>(null)
  const [reporting, setReporting] = useState<Letter | null>(null)
  const stopReporting = useCallback(() => setReporting(null), [])
  const [sent, setSent] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (members.error) return <ApiError message={members.error} />
  if (!members.data) return <Loading />
  const bySlug = new Map(members.data.map((m) => [m.slug, m]))
  const pick = (to: string | null) => setParams(to ? { to } : {}, { replace: true })

  const takeBack = async (l: Letter) => {
    if (!window.confirm('Take this letter back? It will be deleted.')) return
    await send('DELETE', `/letters/${l.id}/`)
    setOpen(null)
  }

  return (
    <div className="letters-page">
      <header className="page-head">
        <p className="eyebrow">Letters to SEVENTEEN</p>
        <h1>The mailbox</h1>
        <p className="muted">Write to one member or to all thirteen. Every letter is read by an admin first, then posted here for every CARAT to open.</p>
      </header>

      <nav className="mailboxes" aria-label="Mailboxes">
        <button className={`mailbox ${box === null ? 'is-on' : ''}`} onClick={() => pick(null)}>
          <span className="mailbox__icon" aria-hidden>📬</span>
          <small>Every letter</small>
        </button>
        <button className={`mailbox ${box === 'all' ? 'is-on' : ''}`} onClick={() => pick('all')}>
          <span className="mailbox__icon" aria-hidden>💎</span>
          <small>SEVENTEEN</small>
        </button>
        {members.data.map((m) => (
          <button key={m.slug} className={`mailbox ${box === m.slug ? 'is-on' : ''}`} style={{ ['--m' as string]: m.color }} onClick={() => pick(m.slug)}>
            <MemberAvatar member={m} size="sm" />
            <small>{m.stage_name}</small>
          </button>
        ))}
      </nav>

      <div className="letters-layout">
        <section>
          {sent && <p className="card letters-sent">💌 Sent! Your letter to {sent} is waiting for an admin to read it. You can see it here meanwhile.</p>}
          {letters.error && <ApiError message={letters.error} />}
          {!letters.data && !letters.error && <Loading />}
          {letters.data && !letters.data.length && (
            <p className="muted card letters-empty">No letters in this mailbox yet. Be the first to write one!</p>
          )}
          <div className="envelopes">
            {letters.data?.map((l) => (
              <Envelope key={l.id} letter={l} member={l.member ? bySlug.get(l.member) : undefined} onOpen={() => setOpen(l)} />
            ))}
          </div>
        </section>
        <Composer
          members={members.data}
          to={box && box !== 'all' ? box : ''}
          onSent={(l) => {
            setSent(l.member_name)
            setTimeout(() => setSent(null), 8000)
          }}
        />
      </div>

      {open && (
        <div className="pack" role="dialog" aria-modal="true" aria-label={`Letter to ${open.member_name}`} onClick={() => setOpen(null)}>
          <div className="letter-open" onClick={(e) => e.stopPropagation()}>
            <LetterSheet letter={open} member={open.member ? bySlug.get(open.member) : undefined} />
            <div className="letter-open__actions">
              {open.status === 'pending' && <span className="chip chip--small">Waiting for review</span>}
              {open.is_mine && <button className="btn btn--ghost btn--small" onClick={() => takeBack(open)}>Take it back</button>}
              {!open.is_mine && open.status === 'approved' && (
                <button className="btn btn--ghost btn--small" onClick={() => setReporting(open)}>⚑ Report</button>
              )}
              <button className="btn btn--small" onClick={() => setOpen(null)}>Fold it up</button>
            </div>
          </div>
        </div>
      )}
      {reporting && <ReportDialog kind="letter" targetId={reporting.id} what={`${reporting.author_name}'s letter`} onClose={stopReporting} />}
    </div>
  )
}
