import { Fragment, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, Loading } from '../components/Status'
import { useAlbums } from '../lib/api'
import type { Album } from '../lib/types'

type Lang = 'all' | Album['language']

/** /discography : every era on a timeline; each one opens its own album page. */
export function Discography() {
  const { data, error, loading } = useAlbums()
  const [lang, setLang] = useState<Lang>('all')
  const [kind, setKind] = useState<string>('all')

  const kinds = [...new Map((data ?? []).map((a) => [a.kind, a.kind_label])).entries()]
  const shown = (data ?? []).filter((a) => (lang === 'all' || a.language === lang) && (kind === 'all' || a.kind === kind))

  return (
    <div>
      <header className="page-head">
        <p className="eyebrow">2015 → now · {data?.length ?? '…'} releases</p>
        <h1>Every era</h1>
        <p className="muted">Each era has its own colours and mood. Open one for its album page, tracklist and title tracks.</p>
        <div className="era-filters" aria-label="Filter eras">
          {(
            [
              ['all', 'All'],
              ['ko', 'Korean'],
              ['ja', 'Japanese'],
            ] as const
          ).map(([v, l]) => (
            <button key={v} className={`chip ${lang === v ? 'is-on' : ''}`} aria-pressed={lang === v} onClick={() => setLang(v)}>{l}</button>
          ))}
          <span className="era-filters__gap" aria-hidden />
          <button className={`chip ${kind === 'all' ? 'is-on' : ''}`} aria-pressed={kind === 'all'} onClick={() => setKind('all')}>Every type</button>
          {kinds.map(([v, l]) => (
            <button key={v} className={`chip ${kind === v ? 'is-on' : ''}`} aria-pressed={kind === v} onClick={() => setKind(v)}>{l}</button>
          ))}
        </div>
      </header>

      {loading && <Loading />}
      {error && <ApiError message={error} />}
      {data && !shown.length && <p className="muted">No eras match those filters.</p>}

      <ol className="timeline">
        {shown.map((a, i) => {
          const year = a.release_date.slice(0, 4)
          return (
            <Fragment key={a.slug}>
              {year !== shown[i - 1]?.release_date.slice(0, 4) && <li className="timeline__year" aria-hidden>{year}</li>}
              <li className="timeline__item">
                <span className="timeline__dot" style={{ background: a.theme.accent }} aria-hidden />
                <Link
                  to={`/discography/${a.slug}`}
                  className="era-card"
                  style={{
                    background: a.theme.bg,
                    color: a.theme.text,
                    ['--a' as string]: a.theme.accent,
                    ['--a2' as string]: a.theme.accent2,
                  }}
                >
                  {a.cover ? <img className="era-card__cover" src={a.cover} alt="" /> : <span className="era-card__orb" aria-hidden />}
                  <span className="era-card__kind">{a.kind_label} · {a.release_date.slice(0, 7).replace('-', ' · ')}</span>
                  <span className={`era-card__title font-${a.theme.font}`}>{a.title}</span>
                  {a.title_track && <span className="era-card__track">♪ {a.title_track}</span>}
                  <span className="era-card__mood">{a.era_mood}</span>
                  <span className="era-card__go" aria-hidden>Open the era →</span>
                </Link>
              </li>
            </Fragment>
          )
        })}
      </ol>
    </div>
  )
}
