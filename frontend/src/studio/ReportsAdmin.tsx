import { useState } from 'react'
import { Loading } from '../components/Status'
import { send, useStudioData } from '../lib/studio'
import { useToast } from './ui'
import '../fan/fan.css'

interface Report {
  id: number
  kind: 'diary' | 'letter'
  target_id: number
  reason: string
  reason_label: string
  note: string
  reporter_name: string
  status: 'open' | 'resolved'
  outcome: '' | 'dismissed' | 'hidden' | 'deleted'
  created_at: string
  resolved_at: string | null
  // null once the post was deleted
  target: { title: string; author_name: string; body?: string; is_private?: boolean; status?: string } | null
}

type Tab = Report['status']
type Action = 'dismiss' | 'hide' | 'delete'

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

/** Studio → Reports: fans flag diary pages and letters; admins keep, hide or delete them. */
export function ReportsAdmin() {
  const toast = useToast()
  const reports = useStudioData<Report[]>('/reports/', { live: true })
  const [tab, setTab] = useState<Tab>('open')

  if (reports.error) return <p className="studio-error">{reports.error}</p>
  if (!reports.data) return <Loading />

  const shown = reports.data.filter((r) => r.status === tab)
  const count = (t: Tab) => reports.data!.filter((r) => r.status === t).length

  const resolve = async (r: Report, action: Action) => {
    if (action === 'delete' && !window.confirm(`Delete this ${r.kind === 'diary' ? 'diary page' : 'letter'} for good?`)) return
    try {
      await send('POST', `/reports/${r.id}/resolve/`, { action })
      reports.reload()
      toast(action === 'dismiss' ? 'Kept: report closed' : action === 'hide' ? 'Hidden from fans' : 'Deleted')
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }

  return (
    <div className="studio-page">
      <header className="studio-head">
        <p className="eyebrow">Reports</p>
        <h1>Reported posts</h1>
        <p className="muted">
          Fans can report someone else's diary page or letter. Keep it, hide it (a diary page turns private, a letter leaves the mailbox) or delete it.
          Closing one report closes every report on the same post.
        </p>
      </header>

      <div className="tabs" role="tablist">
        {(['open', 'resolved'] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'is-active' : ''} onClick={() => setTab(t)}>
            {t === 'open' ? 'To review' : 'Done'} ({count(t)})
          </button>
        ))}
      </div>

      {shown.length ? (
        <ul className="reports-admin">
          {shown.map((r) => (
            <li key={r.id} className="card reports-admin__item">
              <div className="reports-admin__head">
                <span className="chip chip--small">{r.kind === 'diary' ? '📔 Diary page' : '💌 Letter'}</span>
                <span className="reports-admin__reason">⚑ {r.reason_label}</span>
                <span className="muted small">by {r.reporter_name} · {when(r.created_at)}</span>
              </div>
              {r.note && <p className="reports-admin__note">“{r.note}”</p>}
              {r.target ? (
                <div className="reports-admin__post">
                  <b>{r.target.title}</b>
                  <span className="muted small"> · written by {r.target.author_name || 'nobody (older page)'}</span>
                  {r.target.body && <p className="reports-admin__body">{r.target.body}</p>}
                  {r.kind === 'diary' && (
                    <a className="link-arrow small" href={`/diary?page=${r.target_id}`} target="_blank" rel="noreferrer">
                      Open the page ↗
                    </a>
                  )}
                </div>
              ) : (
                <p className="muted small">The post has been deleted.</p>
              )}
              {r.status === 'open' ? (
                <div className="reports-admin__actions">
                  <button className="btn btn--ghost btn--small" onClick={() => resolve(r, 'dismiss')}>Keep it</button>
                  {r.target && <button className="btn btn--small" onClick={() => resolve(r, 'hide')}>Hide it</button>}
                  {r.target && <button className="btn btn--small btn--danger" onClick={() => resolve(r, 'delete')}>Delete it</button>}
                </div>
              ) : (
                <p className="small muted">
                  {r.outcome === 'dismissed' ? 'Kept' : r.outcome === 'hidden' ? 'Hidden' : 'Deleted'}
                  {r.resolved_at && ` · ${when(r.resolved_at)}`}
                </p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted card studio-card">{tab === 'open' ? 'All clear ✦ Nothing reported.' : 'No closed reports yet.'}</p>
      )}
    </div>
  )
}
