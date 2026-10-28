import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { MemberAvatar } from '../components/MemberAvatar'
import { useMembers } from '../lib/api'
import { homeFor, useAuth } from './AuthProvider'

/** Split screen: a little welcome poster on one side, the form on the other. */
function AuthShell({ title, lede, children, art }: { title: string; lede: string; children: ReactNode; art: ReactNode }) {
  return (
    <div className="auth">
      <aside className="auth__art" aria-hidden>
        <div className="auth__glow" />
        {art}
      </aside>
      <section className="auth__panel">
        <p className="eyebrow">SEVENTEEN · for CARAT</p>
        <h1 className="auth__title">{title}</h1>
        <p className="muted auth__lede">{lede}</p>
        {children}
      </section>
    </div>
  )
}

function MemberRing() {
  const members = useMembers().data ?? []
  return (
    <div className="auth__ring">
      {members.map((m, i) => (
        <span key={m.slug} className="auth__ring-item" style={{ ['--i' as string]: i, ['--n' as string]: members.length }}>
          <MemberAvatar member={m} size="sm" />
        </span>
      ))}
      <img className="auth__gem" src="/diamond.svg" alt="" width={72} height={72} />
    </div>
  )
}

function PasswordInput({ value, onChange, autoComplete }: { value: string; onChange: (v: string) => void; autoComplete: string }) {
  const [shown, setShown] = useState(false)
  return (
    <span className="auth__pw">
      <input
        type={shown ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required
      />
      <button type="button" className="auth__peek" onClick={() => setShown((s) => !s)} aria-label={shown ? 'Hide password' : 'Show password'}>
        {shown ? 'Hide' : 'Show'}
      </button>
    </span>
  )
}

/** Field-by-field messages from the API ("username: That username is taken.") */
function splitErrors(message: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const part of message.split(' · ')) {
    const m = part.match(/^(username|password|display name|bias): (.*)$/)
    if (m) out[m[1]] = m[2]
    else out.form = out.form ? `${out.form} ${part}` : part
  }
  return out
}

export function LoginPage() {
  const { account, login } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (account) return <Navigate to={homeFor(account, next)} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const a = await login(username.trim(), password)
      navigate(homeFor(a, next), { replace: true })
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      lede="Sign in to your playlist, your bias and your game scores. Admins go straight to the Studio."
      art={<MemberRing />}
    >
      <form className="auth__form" onSubmit={submit}>
        <label className="auth__field">
          <span>Username</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus required />
        </label>
        <label className="auth__field">
          <span>Password</span>
          <PasswordInput value={password} onChange={setPassword} autoComplete="current-password" />
        </label>
        {error && <p className="auth__error" role="alert">{error}</p>}
        <button className="btn auth__submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <p className="auth__switch">
        New here? <Link to={`/register${next ? `?next=${encodeURIComponent(next)}` : ''}`}>Create a CARAT account</Link>
      </p>
    </AuthShell>
  )
}

export function RegisterPage() {
  const { account, register } = useAuth()
  const members = useMembers().data ?? []
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next')
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [bias, setBias] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  if (account) return <Navigate to={homeFor(account, next)} replace />

  const checks = [
    { ok: password.length >= 8, label: '8+ characters' },
    { ok: /\D/.test(password), label: 'not only numbers' },
    { ok: !!password && !password.toLowerCase().includes(username.toLowerCase() || '\u0000'), label: 'not your username' },
  ]
  const biasMember = members.find((m) => m.slug === bias)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErrors({})
    try {
      const a = await register({ username: username.trim(), password, display_name: displayName.trim(), bias })
      navigate(homeFor(a, next), { replace: true })
    } catch (err) {
      setErrors(splitErrors((err as Error).message))
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Join as a CARAT"
      lede="Make a free account to save songs to your own playlist, pick your bias and keep your game scores."
      art={
        biasMember ? (
          <div className="auth__bias" style={{ ['--m' as string]: biasMember.color }}>
            <MemberAvatar member={biasMember} size="lg" />
            <p className="auth__bias-name">{biasMember.stage_name}</p>
            <p className="auth__bias-tag">{biasMember.tagline}</p>
          </div>
        ) : (
          <MemberRing />
        )
      }
    >
      <form className="auth__form" onSubmit={submit}>
        <label className="auth__field">
          <span>What should we call you?</span>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={30} placeholder="Your CARAT name" autoFocus />
        </label>
        <label className="auth__field">
          <span>Username</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" maxLength={30} required placeholder="letters, numbers, . _ -" />
          {errors.username && <em className="auth__field-error">{errors.username}</em>}
        </label>
        <label className="auth__field">
          <span>Password</span>
          <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" />
          <span className="auth__checks">
            {checks.map((c) => (
              <i key={c.label} className={c.ok ? 'is-ok' : ''}>{c.ok ? '✓' : '·'} {c.label}</i>
            ))}
          </span>
          {errors.password && <em className="auth__field-error">{errors.password}</em>}
        </label>

        <div className="auth__field">
          <span>Your bias <small className="muted">(optional, you can change it later)</small></span>
          <div className="auth__biases" role="radiogroup" aria-label="Your bias">
            {members.map((m) => (
              <button
                key={m.slug}
                type="button"
                role="radio"
                aria-checked={bias === m.slug}
                className={bias === m.slug ? 'is-on' : ''}
                onClick={() => setBias(bias === m.slug ? null : m.slug)}
                title={m.stage_name}
              >
                <MemberAvatar member={m} size="sm" />
                <span>{m.stage_name}</span>
              </button>
            ))}
          </div>
        </div>

        {errors.form && <p className="auth__error" role="alert">{errors.form}</p>}
        <button className="btn auth__submit" disabled={busy}>{busy ? 'Creating your account…' : 'Create account'}</button>
      </form>
      <p className="auth__switch">
        Already have an account? <Link to={`/login${next ? `?next=${encodeURIComponent(next)}` : ''}`}>Sign in</Link>
      </p>
    </AuthShell>
  )
}
