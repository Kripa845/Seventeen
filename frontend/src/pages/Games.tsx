import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Leaderboard } from '../components/Leaderboard'
import { ApiError, Loading } from '../components/Status'
import { useMembers } from '../lib/api'
import { useTheme } from '../lib/theme'
import type { GameKey } from '../lib/types'
import { GuessMember } from './games/GuessMember'
import { MemoryMatch } from './games/MemoryMatch'
import { UnitSorter } from './games/UnitSorter'

const GAMES: { key: GameKey; path: string; name: string; emoji: string; blurb: string }[] = [
  { key: 'memory', path: 'memory', name: 'Memory Match', emoji: '🃏', blurb: 'Flip cards and find all eight member pairs in as few moves as you can.' },
  { key: 'unit_sort', path: 'unit-sorter', name: 'Unit Sorter', emoji: '🧭', blurb: 'Hip-hop, Vocal or Performance? Sort all thirteen as fast as you can.' },
  { key: 'guess', path: 'guess', name: 'Guess the Member', emoji: '🔮', blurb: 'One clue, four choices. Build a streak for bonus points.' },
]

export function Games() {
  const { game } = useParams()
  const members = useMembers()
  const [lastScore, setLastScore] = useState<number | null>(null)
  const active = GAMES.find((g) => g.path === game)
  const paused = new Set(useTheme().site?.disabled_games ?? [])

  if (!active)
    return (
      <div>
        <header className="page-head">
          <p className="eyebrow">Play</p>
          <h1>Games</h1>
          <p className="muted">Little games for CARATs. Save your score to the leaderboard.</p>
        </header>
        <div className="game-list">
          {GAMES.map((g) =>
            paused.has(g.key) ? (
              <div key={g.key} className="game-tile card is-paused" aria-disabled>
                <span className="game-tile__emoji" aria-hidden>{g.emoji}</span>
                <h2>{g.name}</h2>
                <p className="muted">{g.blurb}</p>
                <span className="chip chip--small">Paused for now</span>
              </div>
            ) : (
              <Link key={g.key} to={`/games/${g.path}`} className="game-tile card">
                <span className="game-tile__emoji" aria-hidden>{g.emoji}</span>
                <h2>{g.name}</h2>
                <p className="muted">{g.blurb}</p>
                <span className="link-arrow">Play →</span>
              </Link>
            ),
          )}
        </div>
      </div>
    )

  if (paused.has(active.key))
    return (
      <div className="page-head">
        <Link className="link-arrow back" to="/games">← All games</Link>
        <h1>
          {active.emoji} {active.name}
        </h1>
        <p className="muted">This game is paused for now. Try one of the others!</p>
      </div>
    )

  const props = { members: members.data ?? [], onFinish: setLastScore }

  return (
    <div>
      <Link className="link-arrow back" to="/games" onClick={() => setLastScore(null)}>← All games</Link>
      <header className="page-head">
        <h1>
          {active.emoji} {active.name}
        </h1>
        <p className="muted">{active.blurb}</p>
      </header>
      {members.loading && <Loading />}
      {members.error && <ApiError message={members.error} />}
      {members.data && (
        <div className="game-layout" key={active.key}>
          {active.key === 'memory' && <MemoryMatch {...props} />}
          {active.key === 'unit_sort' && <UnitSorter {...props} />}
          {active.key === 'guess' && <GuessMember {...props} />}
          <Leaderboard game={active.key} pendingScore={lastScore} />
        </div>
      )}
    </div>
  )
}
