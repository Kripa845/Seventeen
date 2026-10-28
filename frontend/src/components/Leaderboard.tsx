import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { fetchScores, postScore } from '../lib/api'
import type { GameKey, Score } from '../lib/types'

const NAME_KEY = 'svt-player-name'

function savedName() {
  try {
    return localStorage.getItem(NAME_KEY) ?? ''
  } catch {
    return ''
  }
}

/** Top-10 board from Django, plus a form to save the score you just got. */
export function Leaderboard({ game, pendingScore }: { game: GameKey; pendingScore: number | null }) {
  const { account } = useAuth()
  const [scores, setScores] = useState<Score[] | null>(null)
  const [name, setName] = useState(savedName)

  // Signed in: use your display name (the score also lands on your dashboard).
  useEffect(() => {
    if (account) setName(account.display_name)
  }, [account])
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchScores(game).then(setScores).catch(() => setScores([]))
  }, [game])

  useEffect(() => {
    setSaved(false)
  }, [pendingScore])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (pendingScore === null || !name.trim()) return
    try {
      await postScore(game, name.trim(), pendingScore)
      try {
        localStorage.setItem(NAME_KEY, name.trim())
      } catch {
        /* ignore */
      }
      setSaved(true)
      setError(null)
      setScores(await fetchScores(game))
    } catch {
      setError('Could not save — is Django running?')
    }
  }

  return (
    <section className="board card">
      <h3>CARAT leaderboard</h3>
      {pendingScore !== null && !saved && (
        <form className="board__form" onSubmit={submit}>
          <input
            value={name}
            maxLength={30}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your CARAT name"
            aria-label="Your name"
          />
          <button className="btn" disabled={!name.trim()}>
            Save {pendingScore}
          </button>
        </form>
      )}
      {saved && (
        <p className="muted">
          Saved! ✦ {account ? <Link to="/me">See it on your dashboard →</Link> : <><Link to="/register">Make an account</Link> to keep your scores.</>}
        </p>
      )}
      {error && <p className="error-text">{error}</p>}
      {scores === null ? (
        <p className="muted">Loading…</p>
      ) : scores.length === 0 ? (
        <p className="muted">No scores yet. Be the first!</p>
      ) : (
        <ol className="board__list">
          {scores.map((s) => (
            <li key={s.id}>
              <span>{s.player}</span>
              <b>{s.score}</b>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
