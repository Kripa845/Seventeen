import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Loading } from '../components/Status'
import { useMembers } from '../lib/api'
import { send, useStudioData } from '../lib/studio'
import type { Letter } from '../lib/types'
import { LetterSheet } from '../pages/Letters'
import { useToast } from './ui'
import '../fan/fan.css'

type Tab = Letter['status']

const TABS: { value: Tab; label: string }[] = [
  { value: 'pending', label: 'Waiting for review' },
  { value: 'approved', label: 'Posted' },
  { value: 'hidden', label: 'Hidden' },
]

/** Studio → Letters: read fans' letters before they're posted. */
export function LettersAdmin() {
  const toast = useToast()
  const letters = useStudioData<Letter[]>('/letters/?all=1', { live: true })
  const members = useMembers().data ?? []
  const [tab, setTab] = useState<Tab>('pending')

  if (letters.error) return <p className="studio-error">{letters.error}</p>
  if (!letters.data) return <Loading />

  const bySlug = new Map(members.map((m) => [m.slug, m]))
  const shown = letters.data.filter((l) => l.status === tab)
  const count = (t: Tab) => letters.data!.filter((l) => l.status === t).length

  const review = async (l: Letter, status: Tab) => {
    try {
      const fresh = await send<Letter>('POST', `/letters/${l.id}/review/`, { status })
      letters.setData(letters.data!.map((x) => (x.id === l.id ? fresh : x)))
      toast(status === 'approved' ? `Posted to ${l.member_name}'s mailbox` : status === 'hidden' ? 'Hidden from fans' : 'Back in the review pile')
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }

  const remove = async (l: Letter) => {
    if (!window.confirm(`Delete ${l.author_name}'s letter for good?`)) return
    try {
      await send('DELETE', `/letters/${l.id}/`)
      letters.setData(letters.data!.filter((x) => x.id !== l.id))
      toast('Letter deleted')
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }

  return (
    <div className="studio-page">
      <header className="studio-head">
        <p className="eyebrow">Letters</p>
        <h1>Fan letters</h1>
        <p className="muted">
          Letters wait here until an admin posts them to the <Link to="/letters" target="_blank">mailbox ↗</Link>. Letters you write yourself are posted straight away.
        </p>
      </header>

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.value} role="tab" aria-selected={tab === t.value} className={tab === t.value ? 'is-active' : ''} onClick={() => setTab(t.value)}>
            {t.label} ({count(t.value)})
          </button>
        ))}
      </div>

      {shown.length ? (
        <ul className="letters-admin">
          {shown.map((l) => (
            <li key={l.id} className="card">
              <LetterSheet letter={l} member={l.member ? bySlug.get(l.member) : undefined} />
              <div className="letters-admin__actions">
                {l.status !== 'approved' && <button className="btn btn--small" onClick={() => review(l, 'approved')}>✓ Post it</button>}
                {l.status !== 'hidden' && <button className="btn btn--ghost btn--small" onClick={() => review(l, 'hidden')}>Hide</button>}
                {l.status === 'hidden' && <button className="btn btn--ghost btn--small" onClick={() => review(l, 'pending')}>Back to review</button>}
                <button className="icon-btn icon-btn--danger" title="Delete" onClick={() => remove(l)}>✕</button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted card studio-card">{tab === 'pending' ? 'All caught up ✦ No letters waiting.' : 'Nothing here.'}</p>
      )}
    </div>
  )
}
