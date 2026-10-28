import { useState } from 'react'
import { MemberAvatar } from '../../components/MemberAvatar'
import { formatDate, shuffle } from '../../lib/dates'
import type { Member } from '../../lib/types'

const ROUNDS = 8

interface Question {
  answer: Member
  clue: string
  label: string
  options: Member[]
}

function makeQuestions(members: Member[]): Question[] {
  return shuffle(members)
    .slice(0, ROUNDS)
    .map((answer) => {
      const clues: [string, string][] = [
        ['Born', formatDate(answer.birthday)],
        ['Hometown', answer.birthplace],
        ['Birth name', answer.birth_name],
        ['Tagline', `“${answer.tagline}”`],
        ...answer.fun_facts.map((f): [string, string] => ['Fun fact', f]),
      ]
      // Clues that would give the answer away (mentioning their own name) are skipped.
      const fair = clues.filter(([, c]) => !c.toLowerCase().includes(answer.stage_name.toLowerCase()))
      const [label, clue] = fair[Math.floor(Math.random() * fair.length)]
      const others = shuffle(members.filter((m) => m.slug !== answer.slug)).slice(0, 3)
      return { answer, label, clue, options: shuffle([answer, ...others]) }
    })
}

export function GuessMember({ members, onFinish }: { members: Member[]; onFinish: (score: number) => void }) {
  const [qs, setQs] = useState(() => makeQuestions(members))
  const [round, setRound] = useState(0)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [finished, setFinished] = useState(false)

  const q = qs[round]

  function choose(m: Member) {
    if (picked) return
    setPicked(m.slug)
    const ok = m.slug === q.answer.slug
    const gained = ok ? 100 + streak * 25 : 0
    const total = score + gained
    setScore(total)
    setStreak(ok ? streak + 1 : 0)
    setTimeout(() => {
      setPicked(null)
      if (round + 1 < ROUNDS) setRound(round + 1)
      else {
        setFinished(true)
        onFinish(total)
      }
    }, 1100)
  }

  function restart() {
    setQs(makeQuestions(members))
    setRound(0)
    setScore(0)
    setStreak(0)
    setFinished(false)
  }

  if (finished)
    return (
      <div className="game__result card">
        <h3>Quiz complete ✦</h3>
        <p>
          Final score <b>{score}</b>
        </p>
        <button className="btn" onClick={restart}>Play again</button>
      </div>
    )

  return (
    <div className="game">
      <div className="game__bar">
        <span>Round <b>{round + 1}/{ROUNDS}</b></span>
        <span>Score <b>{score}</b></span>
        {streak > 1 && <span>Streak <b>🔥 {streak}</b></span>}
      </div>
      <div className="guess card">
        <p className="eyebrow">{q.label}</p>
        <p className="guess__clue">{q.clue}</p>
        <div className="guess__options">
          {q.options.map((m) => {
            const state = !picked ? '' : m.slug === q.answer.slug ? 'is-right' : m.slug === picked ? 'is-wrong' : 'is-dim'
            return (
              <button key={m.slug} className={`guess__opt ${state}`} onClick={() => choose(m)}>
                <MemberAvatar member={m} size="sm" />
                <span>{m.stage_name}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
