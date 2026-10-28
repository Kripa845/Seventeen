import { useState } from 'react'
import { MemberAvatar } from '../../components/MemberAvatar'
import { shuffle } from '../../lib/dates'
import type { Member, Unit } from '../../lib/types'

const UNITS: { key: Unit; label: string }[] = [
  { key: 'hiphop', label: 'Hip-hop' },
  { key: 'vocal', label: 'Vocal' },
  { key: 'performance', label: 'Performance' },
]

export function UnitSorter({ members, onFinish }: { members: Member[]; onFinish: (score: number) => void }) {
  const [order, setOrder] = useState(() => shuffle(members))
  const [i, setI] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [flash, setFlash] = useState<'right' | 'wrong' | null>(null)
  const [start, setStart] = useState(() => Date.now())
  const [result, setResult] = useState<{ score: number; secs: number } | null>(null)

  const m = order[i]

  function answer(unit: Unit) {
    if (flash || result) return
    const ok = unit === m.unit
    const newCorrect = correct + (ok ? 1 : 0)
    setCorrect(newCorrect)
    setFlash(ok ? 'right' : 'wrong')
    setTimeout(() => {
      setFlash(null)
      if (i + 1 < order.length) setI(i + 1)
      else {
        const secs = Math.round((Date.now() - start) / 1000)
        const score = newCorrect * 100 + Math.max(0, 60 - secs) * 5
        setResult({ score, secs })
        onFinish(score)
      }
    }, ok ? 350 : 900)
  }

  function restart() {
    setOrder(shuffle(members))
    setI(0)
    setCorrect(0)
    setResult(null)
    setStart(Date.now())
  }

  if (result)
    return (
      <div className="game__result card">
        <h3>{correct === members.length ? 'Perfect sort! ✦' : 'Nice try, CARAT!'}</h3>
        <p>
          {correct}/{members.length} correct in {result.secs}s · score <b>{result.score}</b>
        </p>
        <button className="btn" onClick={restart}>Play again</button>
      </div>
    )

  return (
    <div className="game">
      <div className="game__bar">
        <span>Member <b>{i + 1}/{order.length}</b></span>
        <span>Correct <b>{correct}</b></span>
      </div>
      <div className={`sorter card ${flash ? `is-${flash}` : ''}`}>
        <MemberAvatar member={m} size="lg" />
        <h2>{m.stage_name}</h2>
        <p className="muted">Which unit is {m.stage_name} in?</p>
        {flash === 'wrong' && <p className="error-text">They're in the {UNITS.find((u) => u.key === m.unit)!.label} Unit</p>}
        <div className="sorter__buttons">
          {UNITS.map((u) => (
            <button key={u.key} className="btn" onClick={() => answer(u.key)}>
              {u.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
