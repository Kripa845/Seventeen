import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loading } from '../components/Status'
import { send, useStudioData } from '../lib/studio'
import { useTheme } from '../lib/theme'
import type { AdminScore, GameKey, SiteSettings } from '../lib/types'
import { Toggle, useToast } from './ui'

const GAMES: { key: GameKey; name: string; emoji: string; path: string }[] = [
  { key: 'memory', name: 'Memory Match', emoji: '🃏', path: 'memory' },
  { key: 'unit_sort', name: 'Unit Sorter', emoji: '🧭', path: 'unit-sorter' },
  { key: 'guess', name: 'Guess the Member', emoji: '🔮', path: 'guess' },
]

function when(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Leaderboards and switches for the three games. */
export function GamesAdmin() {
  const toast = useToast()
  const { setSite } = useTheme()
  const scores = useStudioData<AdminScore[]>('/scores/?all=1')
  const site = useStudioData<SiteSettings>('/site/')
  const [game, setGame] = useState<GameKey>('memory')
  const [query, setQuery] = useState('')

  const stats = useMemo(() => {
    const out = new Map<GameKey, { plays: number; players: number; top: number; avg: number; week: number }>()
    for (const g of GAMES) {
      const list = (scores.data ?? []).filter((s) => s.game === g.key)
      const total = list.reduce((n, s) => n + s.score, 0)
      out.set(g.key, {
        plays: list.length,
        players: new Set(list.map((s) => s.username ?? `guest:${s.player}`)).size,
        top: list.reduce((m, s) => Math.max(m, s.score), 0),
        avg: list.length ? Math.round(total / list.length) : 0,
        week: list.filter((s) => Date.now() - new Date(s.created_at).getTime() < 7 * 86_400_000).length,
      })
    }
    return out
  }, [scores.data])

  if (scores.error || site.error) return <p className="studio-error">{scores.error ?? site.error}</p>
  if (!scores.data || !site.data) return <Loading />

  const disabled = new Set(site.data.disabled_games)
  const active = GAMES.find((g) => g.key === game)!
  const q = query.trim().toLowerCase()
  const board = scores.data
    .filter((s) => s.game === game && (!q || s.player.toLowerCase().includes(q) || (s.username ?? '').toLowerCase().includes(q)))
    .sort((a, b) => b.score - a.score || a.created_at.localeCompare(b.created_at))

  const setPaused = async (key: GameKey, paused: boolean) => {
    const next = paused ? [...disabled, key] : [...disabled].filter((k) => k !== key)
    try {
      const fresh = await send<SiteSettings>('PATCH', '/site/', { disabled_games: next })
      site.setData(fresh)
      setSite(fresh)
      toast(`${GAMES.find((g) => g.key === key)!.name} is ${paused ? 'paused' : 'back on'}`)
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }

  const removeScore = async (s: AdminScore) => {
    if (!window.confirm(`Remove ${s.player}'s score of ${s.score}?`)) return
    try {
      await send('DELETE', `/scores/${s.id}/`)
      scores.setData(scores.data!.filter((x) => x.id !== s.id))
      toast('Score removed')
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }

  const clear = async () => {
    if (!window.confirm(`Clear the whole ${active.name} leaderboard (${board.length} scores)? This can't be undone.`)) return
    try {
      const { deleted } = await send<{ deleted: number }>('POST', '/scores/clear/', { game })
      scores.setData(scores.data!.filter((s) => s.game !== game))
      toast(`Cleared ${deleted} scores`)
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }

  return (
    <div className="studio-page">
      <header className="studio-head">
        <p className="eyebrow">Games management</p>
        <h1>Games & leaderboards</h1>
        <p className="muted">Pause a game, tidy up a leaderboard, or start a fresh season.</p>
      </header>

      <section className="ga-cards">
        {GAMES.map((g) => {
          const s = stats.get(g.key)!
          const paused = disabled.has(g.key)
          return (
            <div
              key={g.key}
              role="button"
              tabIndex={0}
              className={`card ga-card ${game === g.key ? 'is-on' : ''} ${paused ? 'is-paused' : ''}`}
              onClick={() => setGame(g.key)}
              onKeyDown={(e) => e.key === 'Enter' && setGame(g.key)}
            >
              <div className="ga-card__top">
                <span className="ga-card__emoji" aria-hidden>{g.emoji}</span>
                <div>
                  <b>{g.name}</b>
                  <small>{paused ? 'Paused: hidden from fans' : 'Live on the site'}</small>
                </div>
              </div>
              <dl className="ga-card__stats">
                <div><dt>plays</dt><dd>{s.plays}</dd></div>
                <div><dt>players</dt><dd>{s.players}</dd></div>
                <div><dt>top score</dt><dd>{s.top}</dd></div>
                <div><dt>average</dt><dd>{s.avg}</dd></div>
              </dl>
              <div className="ga-card__foot" onClick={(e) => e.stopPropagation()}>
                <Toggle label={paused ? 'Off' : 'On'} checked={!paused} onChange={(on) => setPaused(g.key, !on)} />
                <span className="muted small">{s.week} this week</span>
              </div>
            </div>
          )
        })}
      </section>

      <section className="card studio-card">
        <div className="studio-card__head">
          <h2>
            {active.emoji} {active.name} leaderboard
          </h2>
          <Link className="link-arrow small" to={`/games/${active.path}`} target="_blank">Open the game ↗</Link>
        </div>
        <div className="fans__bar">
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search players…" aria-label="Search players" />
          <span className="muted small">{board.length} score{board.length === 1 ? '' : 's'} · the site shows the top 10</span>
        </div>

        {board.length === 0 ? (
          <p className="muted ga-empty">No scores yet.</p>
        ) : (
          <ol className="ga-board">
            {board.map((s, i) => (
              <li key={s.id} className={i < 10 ? 'is-top' : ''}>
                <span className="ga-board__rank">{i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span>
                <span className="ga-board__who">
                  <b>{s.player}</b>
                  <small>{s.username ? `@${s.username}` : 'guest'} · {when(s.created_at)}</small>
                </span>
                <span className="ga-board__score">{s.score}</span>
                <button className="icon-btn icon-btn--danger" title="Remove this score" onClick={() => removeScore(s)}>✕</button>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="card studio-card danger">
        <div>
          <h2>Start a new season</h2>
          <p className="muted small">Clears every {active.name} score. Fans' dashboards lose those scores too.</p>
        </div>
        <button className="btn btn--ghost btn--small danger__btn" onClick={clear} disabled={board.length === 0 && !query}>
          Clear leaderboard
        </button>
      </section>
    </div>
  )
}
