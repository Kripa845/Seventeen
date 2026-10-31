import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Loading } from '../components/Status'
import { EVENT_EMOJI } from '../fan/calendar'
import { send, useStudioData } from '../lib/studio'
import { useTheme } from '../lib/theme'
import type { EventKind, SiteSettings, SvtEvent } from '../lib/types'
import { Field, Toggle, useToast } from './ui'
import '../fan/fan.css'

const KINDS: { value: EventKind; label: string }[] = [
  { value: 'comeback', label: 'Comeback' },
  { value: 'concert', label: 'Concert' },
  { value: 'fanmeeting', label: 'Fan meeting' },
  { value: 'broadcast', label: 'Broadcast' },
  { value: 'other', label: 'Other' },
]

const BLANK = { title: '', date: '', kind: 'comeback' as EventKind, note: '', link: '' }

/** Studio → Calendar: comebacks, concerts and other dates, plus the birthday-theme switch. */
export function EventsAdmin() {
  const toast = useToast()
  const { setSite } = useTheme()
  const events = useStudioData<SvtEvent[]>('/events/')
  const site = useStudioData<SiteSettings>('/site/')
  const [form, setForm] = useState(BLANK)
  const [editing, setEditing] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  if (events.error || site.error) return <p className="studio-error">{events.error ?? site.error}</p>
  if (!events.data || !site.data) return <Loading />

  const today = new Date().toISOString().slice(0, 10)
  const upcoming = events.data.filter((e) => e.date >= today)
  const past = events.data.filter((e) => e.date < today).reverse()

  const save = async () => {
    setBusy(true)
    try {
      const body = { ...form, title: form.title.trim() }
      const saved = editing
        ? await send<SvtEvent>('PATCH', `/events/${editing}/`, body)
        : await send<SvtEvent>('POST', '/events/', body)
      const rest = events.data!.filter((e) => e.id !== saved.id)
      events.setData([...rest, saved].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id))
      toast(editing ? 'Date updated' : 'Added to the calendar')
      setForm(BLANK)
      setEditing(null)
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (e: SvtEvent) => {
    if (!window.confirm(`Take “${e.title}” off the calendar?`)) return
    try {
      await send('DELETE', `/events/${e.id}/`)
      events.setData(events.data!.filter((x) => x.id !== e.id))
      if (editing === e.id) {
        setEditing(null)
        setForm(BLANK)
      }
      toast('Removed')
    } catch (err) {
      toast((err as Error).message, 'error')
    }
  }

  const setBirthdays = async (on: boolean) => {
    try {
      const fresh = await send<SiteSettings>('PATCH', '/site/', { birthday_themes: on })
      site.setData(fresh)
      setSite(fresh)
      toast(on ? 'Birthday themes are on' : 'Birthday themes are off')
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }

  const row = (e: SvtEvent) => (
    <li key={e.id} className={editing === e.id ? 'is-on' : ''}>
      <span className="ev-list__emoji" aria-hidden>{EVENT_EMOJI[e.kind]}</span>
      <span className="ev-list__what">
        <b>{e.title}</b>
        <small className="muted">
          {new Date(`${e.date}T00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} · {e.kind_label}
          {e.note && ` · ${e.note}`}
        </small>
      </span>
      <button
        className="btn btn--ghost btn--small"
        onClick={() => {
          setEditing(e.id)
          setForm({ title: e.title, date: e.date, kind: e.kind, note: e.note, link: e.link })
        }}
      >
        Edit
      </button>
      <button className="icon-btn icon-btn--danger" title="Remove" onClick={() => remove(e)}>✕</button>
    </li>
  )

  return (
    <div className="studio-page">
      <header className="studio-head">
        <p className="eyebrow">Calendar</p>
        <h1>Dates for CARAT</h1>
        <p className="muted">
          Birthdays and the anniversary are on the <Link to="/calendar" target="_blank">calendar ↗</Link> by themselves. Add comebacks, concerts and
          everything else here; the next one counts down on the dashboards.
        </p>
      </header>

      <section className="card studio-card">
        <div className="studio-card__head">
          <h2>🎂 Birthday themes</h2>
        </div>
        <Toggle
          label="Wear the birthday member's theme for the day"
          hint="On a member's birthday the whole site switches to his theme (fans can turn it off for themselves). DK and Vernon share 18 February: DK has the morning, Vernon the afternoon."
          checked={site.data.birthday_themes}
          onChange={setBirthdays}
        />
        <p className="muted small">
          Try one: <a href="/me?birthday=hoshi" target="_blank" rel="noreferrer">preview Hoshi's birthday ↗</a> (open <code>/me?birthday=</code> to stop previewing).
        </p>
      </section>

      <section className="card studio-card">
        <div className="studio-card__head">
          <h2>{editing ? 'Edit the date' : 'Add a date'}</h2>
          {editing && <button className="link-btn small" onClick={() => (setEditing(null), setForm(BLANK))}>Cancel editing</button>}
        </div>
        <form
          className="ev-form"
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          <Field label="What">
            <input value={form.title} maxLength={100} required placeholder="e.g. 13th mini album" onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <Field label="When">
            <input type="date" value={form.date} required onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label="Kind">
            <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as EventKind })}>
              {KINDS.map((k) => (
                <option key={k.value} value={k.value}>{EVENT_EMOJI[k.value]} {k.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Note" hint="Optional: a city, a channel, a time">
            <input value={form.note} maxLength={200} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </Field>
          <Field label="Link" hint="Optional: tickets or the announcement">
            <input type="url" value={form.link} placeholder="https://" onChange={(e) => setForm({ ...form, link: e.target.value })} />
          </Field>
          <div className="ev-form__go">
            <button className="btn btn--small" disabled={busy || !form.title.trim() || !form.date}>{busy ? 'Saving…' : editing ? 'Save' : 'Add to the calendar'}</button>
          </div>
        </form>
      </section>

      <section className="card studio-card">
        <div className="studio-card__head">
          <h2>Coming up ({upcoming.length})</h2>
        </div>
        {upcoming.length ? <ul className="ev-list">{upcoming.map(row)}</ul> : <p className="muted small">Nothing announced yet.</p>}
        {past.length > 0 && (
          <details className="ev-past">
            <summary>Past dates ({past.length}) · past concerts and fan meetings also appear on the story timeline</summary>
            <ul className="ev-list">{past.map(row)}</ul>
          </details>
        )}
      </section>
    </div>
  )
}
