import { Fragment, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, Loading } from '../components/Status'
import { useAlbums } from '../lib/api'
import { formatDate } from '../lib/dates'
import type { Album } from '../lib/types'

type Lang = 'all' | Album['language']

const eraVars = (a: Album) => ({
  background: a.theme.bg,
  color: a.theme.text,
  ['--a' as string]: a.theme.accent,
  ['--a2' as string]: a.theme.accent2,
})

/** The record that slides out of the sleeve, with the cover on its label. */
function Vinyl({ album }: { album: Album }) {
  return (
    <span className="eras__vinyl" aria-hidden>
      <span className="eras__label" style={album.cover ? { backgroundImage: `url(${album.cover})` } : undefined} />
    </span>
  )
}

/** /discography : every era as a record sleeve, grouped by year; each one opens its own album page. */
export function Discography() {
  const { data, error, loading } = useAlbums()
  const [lang, setLang] = useState<Lang>('all')
  const [kind, setKind] = useState<string>('all')

  const kinds = [...new Map((data ?? []).map((a) => [a.kind, a.kind_label])).entries()]
  const shown = (data ?? []).filter((a) => (lang === 'all' || a.language === lang) && (kind === 'all' || a.kind === kind))
  const byDate = [...(data ?? [])].sort((a, b) => a.release_date.localeCompare(b.release_date))
  const latest = byDate[byDate.length - 1]
  // each era keeps its place in the whole story, whatever the filters
  const number = (a: Album) => byDate.indexOf(a) + 1
  const years = [...shown.reduce((m, a) => m.set(a.release_date.slice(0, 4), [...(m.get(a.release_date.slice(0, 4)) ?? []), a]), new Map<string, Album[]>())]

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

      {data && shown.length > 0 && (
        <div className="timeline eras">
          {latest && lang === 'all' && kind === 'all' && (
            <Link to={`/discography/${latest.slug}`} className="eras__feature" style={eraVars(latest)}>
              {latest.cover && <img className="eras__feature-bg" src={latest.cover} alt="" aria-hidden />}
              <span className="eras__feature-art">
                <Vinyl album={latest} />
                {latest.cover ? <img className="eras__sleeve" src={latest.cover} alt="" /> : <span className="eras__sleeve eras__sleeve--orb" aria-hidden />}
              </span>
              <span className="eras__feature-text">
                <span className="eras__eyebrow">Latest era · No. {String(number(latest)).padStart(2, '0')}</span>
                <span className={`eras__feature-title font-${latest.theme.font}`}>{latest.title}</span>
                <span className="eras__meta">{latest.kind_label} · {formatDate(latest.release_date)}</span>
                {latest.title_track && <span className="eras__track">♪ {latest.title_track}</span>}
                {latest.era_mood && <span className="eras__mood">{latest.era_mood}</span>}
                <span className="btn eras__cta">Open the era →</span>
              </span>
            </Link>
          )}

          <ol className="eras__grid">
            {years.map(([year, albums]) => (
              <Fragment key={year}>
                <li className="eras__year" style={{ ['--i' as string]: 0 }}>
                  <h2 className="eras__year-num">{year}</h2>
                  <span className="eras__year-count">{albums.length} {albums.length === 1 ? 'release' : 'releases'}</span>
                </li>
                {albums.map((a, i) => (
                  <li key={a.slug} style={{ ['--i' as string]: i + 1 }}>
                    <Link to={`/discography/${a.slug}`} className="era-card" style={eraVars(a)}>
                      <span className="era-card__no">No. {String(number(a)).padStart(2, '0')}</span>
                      <span className="era-card__stage">
                        <Vinyl album={a} />
                        {a.cover ? <img className="eras__sleeve" src={a.cover} alt="" loading="lazy" /> : <span className="eras__sleeve eras__sleeve--orb" aria-hidden />}
                      </span>
                      <span className="era-card__kind">{a.kind_label} · {a.release_date.slice(0, 7).replace('-', ' · ')}</span>
                      <span className={`era-card__title font-${a.theme.font}`}>{a.title}</span>
                      {a.title_track && <span className="era-card__track">♪ {a.title_track}</span>}
                      {a.era_mood && <span className="era-card__mood">{a.era_mood}</span>}
                      <span className="era-card__go" aria-hidden>Open the era →</span>
                    </Link>
                  </li>
                ))}
              </Fragment>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
