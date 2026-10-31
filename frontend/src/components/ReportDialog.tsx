import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { send } from '../lib/studio'
import '../fan/fan.css'

const REASONS = [
  { value: 'unkind', label: 'Mean or hurtful' },
  { value: 'spam', label: 'Spam or ads' },
  { value: 'private', label: "Shares someone's private info" },
  { value: 'stolen', label: "Uses someone else's photos or work" },
  { value: 'other', label: 'Something else' },
]

/** Tell the admins about someone else's diary page or letter. They see it in Studio → Reports. */
export function ReportDialog({ kind, targetId, what, onClose }: { kind: 'diary' | 'letter'; targetId: number; what: string; onClose: () => void }) {
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await send('POST', '/reports/', { kind, target_id: targetId, reason, note: note.trim() })
      setSent(true)
    } catch (err) {
      setError((err as Error).message.replace(/^target id: /, ''))
    } finally {
      setBusy(false)
    }
  }

  return createPortal(
    <div className="pack report" role="dialog" aria-modal="true" aria-label={`Report ${what}`} onClick={onClose}>
      <div className="report__card card" onClick={(e) => e.stopPropagation()}>
        {sent ? (
          <div className="report__done" role="status">
            <span className="report__icon" aria-hidden>✓</span>
            <h2>Thanks for telling us</h2>
            <p className="muted">An admin will take a look. The writer isn't told who reported it.</p>
            <button className="btn btn--small" onClick={onClose} autoFocus>Done</button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <span className="report__icon report__icon--flag" aria-hidden>⚑</span>
            <h2>Report {what}</h2>
            <p className="muted small">What's wrong with it? Only the admins see reports.</p>
            <div className="report__reasons" role="radiogroup" aria-label="Reason">
              {REASONS.map((r) => (
                <label key={r.value} className={reason === r.value ? 'is-on' : ''}>
                  <input type="radio" name="reason" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} />
                  {r.label}
                </label>
              ))}
            </div>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} rows={2} placeholder="Anything else the admins should know? (optional)" />
            {error && <p className="small error-text">{error}</p>}
            <div className="report__actions">
              <button type="button" className="btn btn--ghost btn--small" onClick={onClose}>Cancel</button>
              <button className="btn btn--small" disabled={!reason || busy}>{busy ? 'Sending…' : 'Send report'}</button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  )
}
