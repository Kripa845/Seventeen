import { useEffect, useMemo, useState } from 'react'
import { shuffle } from '../../lib/dates'
import type { Member } from '../../lib/types'

interface Card {
  key: number
  member: Member
}

const PAIRS = 8

function newDeck(members: Member[]): Card[] {
  const picked = shuffle(members).slice(0, PAIRS)
  return shuffle([...picked, ...picked]).map((member, key) => ({ key, member }))
}

export function MemoryMatch({ members, onFinish }: { members: Member[]; onFinish: (score: number) => void }) {
  const [deck, setDeck] = useState(() => newDeck(members))
  const [open, setOpen] = useState<number[]>([])
  const [matched, setMatched] = useState<Set<string>>(new Set())
  const [moves, setMoves] = useState(0)
  const [start, setStart] = useState<number | null>(null)
  const [now, setNow] = useState(Date.now())

  const done = matched.size === PAIRS
  const seconds = start ? Math.floor(((done ? now : Date.now()) - start) / 1000) : 0
  const score = useMemo(() => Math.max(100, 2000 - moves * 40 - seconds * 10), [moves, seconds])

  useEffect(() => {
    if (!start || done) return
    const t = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(t)
  }, [start, done])

  useEffect(() => {
    if (done) onFinish(score)
    // only fire once when the board is cleared
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done])

  function flip(i: number) {
    if (open.length === 2 || open.includes(i) || matched.has(deck[i].member.slug)) return
    if (!start) setStart(Date.now())
    const nextOpen = [...open, i]
    setOpen(nextOpen)
    if (nextOpen.length === 2) {
      setMoves((m) => m + 1)
      const [a, b] = nextOpen
      if (deck[a].member.slug === deck[b].member.slug) {
        setMatched((s) => new Set(s).add(deck[a].member.slug))
        setNow(Date.now())
        setOpen([])
      } else {
        setTimeout(() => setOpen([]), 750)
      }
    }
  }

  function restart() {
    setDeck(newDeck(members))
    setOpen([])
    setMatched(new Set())
    setMoves(0)
    setStart(null)
  }

  return (
    <div className="game">
      <div className="game__bar">
        <span>Moves <b>{moves}</b></span>
        <span>Time <b>{seconds}s</b></span>
        <span>Pairs <b>{matched.size}/{PAIRS}</b></span>
        <button className="btn btn--ghost btn--small" onClick={restart}>Shuffle</button>
      </div>

      <div className="memory">
        {deck.map((c, i) => {
          const isUp = open.includes(i) || matched.has(c.member.slug)
          return (
            <button
              key={c.key}
              className={`memory__card ${isUp ? 'is-up' : ''} ${matched.has(c.member.slug) ? 'is-matched' : ''}`}
              onClick={() => flip(i)}
              aria-label={isUp ? c.member.stage_name : 'Hidden card'}
            >
              <span className="memory__back" aria-hidden>◆</span>
              <span className="memory__front" style={{ background: c.member.color }}>
                <span className="memory__symbol">{c.member.symbol}</span>
                <span className="memory__name">{c.member.stage_name}</span>
              </span>
            </button>
          )
        })}
      </div>

      {done && (
        <div className="game__result card">
          <h3>All pairs found! ✦</h3>
          <p>
            {moves} moves in {seconds}s · score <b>{score}</b>
          </p>
          <button className="btn" onClick={restart}>Play again</button>
        </div>
      )}
    </div>
  )
}
