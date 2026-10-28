import { useState } from 'react'
import type { FormEvent } from 'react'
import { MemberAvatar } from '../components/MemberAvatar'
import { Loading } from '../components/Status'
import { useMembers } from '../lib/api'
import { send, useStudioData } from '../lib/studio'
import type { AdminUser } from '../lib/types'
import { Field, Segmented, useToast } from './ui'

type Filter = 'all' | 'viewers' | 'admins' | 'off'

function ago(iso: string | null) {
  if (!iso) return 'never'
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  return days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`
}

function makePassword() {
  const abc = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  return Array.from(bytes, (b) => abc[b % abc.length]).join('')
}

/** A password shown once, with a copy button. */
function OneTimePassword({ who, password, onDone }: { who: string; password: string; onDone: () => void }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="otp card" role="alert">
      <div>
        <b>New password for {who}</b>
        <p className="muted small">Shown only now. Send it to them privately; they can change it on their dashboard.</p>
      </div>
      <code className="otp__pw">{password}</code>
      <button
        className="btn btn--small"
        onClick={() => {
          navigator.clipboard?.writeText(password).then(() => setCopied(true), () => {})
        }}
      >
        {copied ? 'Copied ✓' : 'Copy'}
      </button>
      <button className="link-btn" onClick={onDone}>Done</button>
    </div>
  )
}

function AddAccount({ onAdded, onCancel }: { onAdded: (u: AdminUser, password: string) => void; onCancel: () => void }) {
  const toast = useToast()
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState(makePassword)
  const [role, setRole] = useState<'viewer' | 'admin'>('viewer')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const u = await send<AdminUser>('POST', '/users/', {
        username: username.trim(),
        display_name: displayName.trim(),
        password,
        is_staff: role === 'admin',
      })
      onAdded(u, password)
    } catch (err) {
      toast((err as Error).message, 'error')
      setBusy(false)
    }
  }

  return (
    <form className="card studio-card um-add" onSubmit={submit}>
      <h2>Add an account</h2>
      <div className="form-grid">
        <Field label="Username"><input value={username} onChange={(e) => setUsername(e.target.value)} required maxLength={30} autoFocus /></Field>
        <Field label="Display name"><input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={30} placeholder="Optional" /></Field>
        <Field label="Password" hint="A strong one is filled in for you.">
          <span className="um-add__pw">
            <input value={password} onChange={(e) => setPassword(e.target.value)} required spellCheck={false} />
            <button type="button" className="btn btn--small btn--ghost" onClick={() => setPassword(makePassword())}>New</button>
          </span>
        </Field>
        <Segmented<'viewer' | 'admin'>
          label="Role"
          value={role}
          onChange={setRole}
          options={[
            { value: 'viewer', label: 'Viewer' },
            { value: 'admin', label: 'Admin' },
          ]}
        />
      </div>
      <div className="um-add__actions">
        <button type="button" className="btn btn--ghost btn--small" onClick={onCancel}>Cancel</button>
        <button className="btn btn--small" disabled={busy || !username.trim()}>{busy ? 'Adding…' : 'Add account'}</button>
      </div>
    </form>
  )
}

/** Every account: add people, switch roles, reset passwords, switch accounts off or delete them. */
export function UserManagement({ me }: { me: string }) {
  const toast = useToast()
  const members = useMembers().data ?? []
  const { data: users, setData, error } = useStudioData<AdminUser[]>('/users/')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [busy, setBusy] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)
  const [shown, setShown] = useState<{ who: string; password: string } | null>(null)

  if (error) return <p className="studio-error">{error}</p>
  if (!users) return <Loading />

  const run = async (u: AdminUser, job: () => Promise<void>) => {
    setBusy(u.id)
    try {
      await job()
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(null)
    }
  }
  const update = (u: AdminUser, patch: Partial<Pick<AdminUser, 'is_staff' | 'is_active'>>, message: string) =>
    run(u, async () => {
      const fresh = await send<AdminUser>('PATCH', `/users/${u.id}/`, patch)
      setData(users.map((x) => (x.id === u.id ? fresh : x)))
      toast(message)
    })
  const resetPassword = (u: AdminUser) => {
    if (!window.confirm(`Give ${u.display_name} a new password? Their old one stops working.`)) return
    run(u, async () => {
      const { password } = await send<{ password: string }>('POST', `/users/${u.id}/reset_password/`)
      setShown({ who: u.display_name, password })
    })
  }
  const remove = (u: AdminUser) => {
    if (!window.confirm(`Delete ${u.display_name}'s account (@${u.username})? Their playlist goes too. This can't be undone.`)) return
    run(u, async () => {
      await send('DELETE', `/users/${u.id}/`)
      setData(users.filter((x) => x.id !== u.id))
      toast(`Deleted @${u.username}`)
    })
  }

  const q = query.trim().toLowerCase()
  const list = users.filter(
    (u) =>
      (!q || u.username.toLowerCase().includes(q) || u.display_name.toLowerCase().includes(q)) &&
      (filter === 'all' ||
        (filter === 'admins' && u.is_staff) ||
        (filter === 'viewers' && !u.is_staff && u.is_active) ||
        (filter === 'off' && !u.is_active)),
  )
  const admins = users.filter((u) => u.is_staff).length
  const newThisWeek = users.filter((u) => Date.now() - new Date(u.date_joined).getTime() < 7 * 86_400_000).length

  return (
    <div className="studio-page">
      <header className="studio-head studio-head--row">
        <div>
          <p className="eyebrow">User management</p>
          <h1>Accounts</h1>
          <p className="muted">Viewers get their own dashboard; admins also get this one.</p>
        </div>
        {!adding && <button className="btn" onClick={() => setAdding(true)}>+ Add account</button>}
      </header>

      <section className="ov-stats">
        <div className="ov-stat card"><span className="ov-stat__num">{users.length - admins}</span><span className="ov-stat__label">viewers</span></div>
        <div className="ov-stat card"><span className="ov-stat__num">{admins}</span><span className="ov-stat__label">admins</span></div>
        <div className="ov-stat card"><span className="ov-stat__num">{newThisWeek}</span><span className="ov-stat__label">joined this week</span></div>
      </section>

      {adding && (
        <AddAccount
          onCancel={() => setAdding(false)}
          onAdded={(u, password) => {
            setData([u, ...users])
            setAdding(false)
            setShown({ who: u.display_name, password })
            toast(`Added @${u.username}`)
          }}
        />
      )}
      {shown && <OneTimePassword who={shown.who} password={shown.password} onDone={() => setShown(null)} />}

      <section className="card studio-card">
        <div className="fans__bar">
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name…" aria-label="Search accounts" />
          <div className="al-list__filters">
            {(
              [
                ['all', 'All'],
                ['viewers', 'Viewers'],
                ['admins', 'Admins'],
                ['off', 'Switched off'],
              ] as const
            ).map(([v, l]) => (
              <button key={v} className={`chip ${filter === v ? 'is-on' : ''}`} onClick={() => setFilter(v)}>{l}</button>
            ))}
          </div>
        </div>

        <ul className="fans">
          {list.map((u) => {
            const bias = members.find((m) => m.slug === u.bias)
            const self = u.username === me
            const off = busy === u.id
            return (
              <li key={u.id} className={`fan ${u.is_active ? '' : 'is-off'}`}>
                <span className="fan__face">
                  {bias ? <MemberAvatar member={bias} size="sm" /> : <span className="studio__avatar">{u.display_name[0]?.toUpperCase()}</span>}
                </span>
                <span className="fan__who">
                  <b>
                    {u.display_name}
                    {self && <span className="fan__you"> (you)</span>}
                  </b>
                  <small>
                    @{u.username} · joined {ago(u.date_joined)} · last seen {ago(u.last_login)}
                    {bias && ` · ${bias.stage_name} stan`}
                  </small>
                </span>
                <span className="fan__stats">
                  <span title="Songs in their playlist">♥ {u.likes}</span>
                  <span title="Games saved">🎮 {u.games}</span>
                </span>
                <span className={`fan__role ${u.is_staff ? 'is-admin' : ''}`}>{u.is_staff ? 'Admin' : u.is_active ? 'Viewer' : 'Off'}</span>
                <span className="fan__actions">
                  {self ? (
                    <span className="muted small">That's you</span>
                  ) : (
                    <>
                      <button
                        className="btn btn--small btn--ghost"
                        disabled={off || !u.is_active}
                        onClick={() => {
                          if (!u.is_staff && !window.confirm(`Make ${u.display_name} an admin? They'll be able to change everything here.`)) return
                          update(u, { is_staff: !u.is_staff }, u.is_staff ? `${u.display_name} is a viewer now` : `${u.display_name} is an admin now`)
                        }}
                      >
                        {u.is_staff ? 'Make viewer' : 'Make admin'}
                      </button>
                      <details className="um-more">
                        <summary aria-label={`More for ${u.display_name}`}>⋯</summary>
                        {/* picking anything closes the menu */}
                        <div className="um-more__menu" onClick={(e) => ((e.currentTarget.parentElement as HTMLDetailsElement).open = false)}>
                          <button disabled={off} onClick={() => resetPassword(u)}>Reset password</button>
                          <button
                            disabled={off}
                            onClick={() => update(u, { is_active: !u.is_active }, u.is_active ? `${u.display_name} can't sign in now` : `${u.display_name} can sign in again`)}
                          >
                            {u.is_active ? 'Switch off' : 'Switch on'}
                          </button>
                          <button className="is-danger" disabled={off} onClick={() => remove(u)}>Delete account</button>
                        </div>
                      </details>
                    </>
                  )}
                </span>
              </li>
            )
          })}
          {list.length === 0 && <li className="muted small fans__empty">Nobody matches.</li>}
        </ul>
      </section>
    </div>
  )
}
