import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { MemberAvatar } from '../components/MemberAvatar'
import { Loading } from '../components/Status'
import { mix } from '../lib/color'
import { send, upload, useStudioData } from '../lib/studio'
import type { Member, Unit } from '../lib/types'
import { ImageDrop } from './ImageDrop'
import { ColorInput, Field, SaveBar, Segmented, Toggle, useToast } from './ui'

const EDITABLE = [
  'stage_name', 'birth_name', 'birthday', 'birthplace', 'unit', 'is_unit_leader',
  'position', 'color', 'symbol', 'tagline', 'fun_facts',
  'service', 'service_note', 'enlistment_date', 'discharge_date',
] as const
type Draft = Pick<Member, (typeof EDITABLE)[number]>

const pick = (m: Member): Draft => Object.fromEntries(EDITABLE.map((k) => [k, m[k]])) as Draft

function MemberForm({ member, onSaved }: { member: Member; onSaved: (m: Member) => void }) {
  const toast = useToast()
  const [saved, setSaved] = useState<Draft>(pick(member))
  const [draft, setDraft] = useState<Draft>(saved)
  const [busy, setBusy] = useState(false)
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft({ ...draft, [k]: v })
  const preview = { ...member, ...draft }

  const save = async () => {
    setBusy(true)
    try {
      const fresh = await send<Member>('PATCH', `/members/${member.slug}/`, { ...draft, fun_facts: draft.fun_facts.filter((f) => f.trim()) })
      setSaved(pick(fresh))
      setDraft(pick(fresh))
      onSaved(fresh)
      toast(`${fresh.stage_name} saved`)
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const photo = async (file: File | null) => {
    const fresh = file
      ? await upload<Member>(`/members/${member.slug}/`, 'photo', file)
      : await send<Member>('PATCH', `/members/${member.slug}/`, { photo: null })
    onSaved(fresh)
    toast(file ? 'Photo updated' : 'Photo removed')
  }

  return (
    <>
      <div className="me-top">
        <ImageDrop
          src={member.photo}
          label="Photo"
          round
          placeholder={<span className="me-top__symbol" style={{ background: draft.color }}>{draft.symbol}</span>}
          onUpload={(f) => photo(f)}
          onRemove={() => photo(null)}
        />
        <div
          className="me-preview"
          style={{ background: `linear-gradient(150deg, ${mix(draft.color, '#ffffff', 0.78)}, ${mix(draft.color, '#ffffff', 0.45)})` }}
        >
          <MemberAvatar member={preview} size="md" />
          <div>
            <p className="eyebrow" style={{ color: mix(draft.color, '#2b2433', 0.55) }}>{draft.position || 'Position'}</p>
            <p className="me-preview__name">{draft.stage_name || 'Name'}</p>
            <p className="me-preview__tag">{draft.tagline}</p>
          </div>
          <Link className="link-arrow small me-preview__link" to={`/members/${member.slug}`} target="_blank">View page ↗</Link>
        </div>
      </div>

      <section className="card studio-card">
        <h2>Profile</h2>
        <div className="form-grid">
          <Field label="Stage name"><input value={draft.stage_name} onChange={(e) => set('stage_name', e.target.value)} /></Field>
          <Field label="Birth name"><input value={draft.birth_name} onChange={(e) => set('birth_name', e.target.value)} /></Field>
          <Field label="Birthday"><input type="date" value={draft.birthday} onChange={(e) => set('birthday', e.target.value)} /></Field>
          <Field label="Birthplace"><input value={draft.birthplace} onChange={(e) => set('birthplace', e.target.value)} /></Field>
          <Field label="Position"><input value={draft.position} onChange={(e) => set('position', e.target.value)} /></Field>
          <Field label="Emoji" hint="Shown when there's no photo">
            <input className="input-emoji" value={draft.symbol} maxLength={8} onChange={(e) => set('symbol', e.target.value)} />
          </Field>
          <Field label="Tagline" wide><input value={draft.tagline} maxLength={200} onChange={(e) => set('tagline', e.target.value)} /></Field>
        </div>
      </section>

      <section className="card studio-card">
        <h2>Unit & colour</h2>
        <div className="form-grid">
          <Segmented<Unit>
            label="Unit"
            value={draft.unit}
            onChange={(v) => set('unit', v)}
            options={[
              { value: 'hiphop', label: 'Hip-hop' },
              { value: 'vocal', label: 'Vocal' },
              { value: 'performance', label: 'Performance' },
            ]}
          />
          <Toggle label="Unit leader" checked={draft.is_unit_leader} onChange={(v) => set('is_unit_leader', v)} />
          <ColorInput label="Member colour (their page's theme)" value={draft.color} onChange={(v) => set('color', v)} />
        </div>
      </section>

      <section className="card studio-card">
        <h2>Military service</h2>
        <div className="form-grid">
          <Segmented<Member['service']>
            label="Service"
            value={draft.service}
            onChange={(v) => set('service', v)}
            options={[
              { value: '', label: 'Not announced' },
              { value: 'active', label: 'Active duty' },
              { value: 'alternative', label: 'Social service' },
              { value: 'exempt', label: 'Exempt' },
              { value: 'not_required', label: 'Not required' },
            ]}
          />
          <Field label="Note" hint="e.g. Army military band">
            <input value={draft.service_note} maxLength={120} onChange={(e) => set('service_note', e.target.value)} />
          </Field>
          <Field label="Enlistment date">
            <input type="date" value={draft.enlistment_date ?? ''} onChange={(e) => set('enlistment_date', e.target.value || null)} />
          </Field>
          <Field label="Discharge date" hint="Official or expected; the member page counts down to it">
            <input type="date" value={draft.discharge_date ?? ''} onChange={(e) => set('discharge_date', e.target.value || null)} />
          </Field>
        </div>
      </section>

      <section className="card studio-card">
        <h2>Fun facts</h2>
        <ol className="fact-list">
          {draft.fun_facts.map((fact, i) => (
            <li key={i}>
              <input
                value={fact}
                placeholder="Something CARATs love about them"
                onChange={(e) => set('fun_facts', draft.fun_facts.map((f, j) => (j === i ? e.target.value : f)))}
              />
              <button
                type="button"
                className="icon-btn"
                aria-label="Remove fact"
                onClick={() => set('fun_facts', draft.fun_facts.filter((_, j) => j !== i))}
              >
                ✕
              </button>
            </li>
          ))}
        </ol>
        <button type="button" className="btn btn--ghost btn--small" onClick={() => set('fun_facts', [...draft.fun_facts, ''])}>
          + Add a fact
        </button>
      </section>

      <SaveBar dirty={dirty} busy={busy} onSave={save} onDiscard={() => setDraft(saved)} />
    </>
  )
}

export function MembersEditor() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { data: members, setData, error } = useStudioData<Member[]>('/members/')

  if (error) return <p className="studio-error">{error}</p>
  if (!members) return <Loading />
  const member = members.find((m) => m.slug === slug)
  if (!member) return <MemberGrid members={members} onPick={(s) => navigate(`/studio/members/${s}`)} />

  return (
    <div className="studio-page studio-split">
      <aside className="studio-split__list">
        <MemberGrid members={members} current={member.slug} onPick={(s) => navigate(`/studio/members/${s}`)} compact />
      </aside>
      <div className="studio-split__main">
        <header className="studio-head studio-head--tight">
          <p className="eyebrow">Members</p>
          <h1>{member.stage_name}</h1>
        </header>
        <MemberForm key={member.slug} member={member} onSaved={(m) => setData(members.map((x) => (x.slug === m.slug ? m : x)))} />
      </div>
    </div>
  )
}

function MemberGrid({ members, current, onPick, compact = false }: { members: Member[]; current?: string; onPick: (slug: string) => void; compact?: boolean }) {
  const missing = members.filter((m) => !m.photo).length
  return (
    <div className={compact ? '' : 'studio-page'}>
      {!compact && (
        <header className="studio-head">
          <p className="eyebrow">Members</p>
          <h1>The thirteen</h1>
          <p className="muted">
            Pick a member to change their photo, colour, tagline and fun facts.
            {missing > 0 && ` ${missing} still need a photo.`}
          </p>
        </header>
      )}
      <div className={`mg ${compact ? 'mg--compact' : ''}`}>
        {members.map((m) => (
          <button key={m.slug} className={`mg__item ${m.slug === current ? 'is-on' : ''}`} onClick={() => onPick(m.slug)}>
            <MemberAvatar member={m} size={compact ? 'sm' : 'md'} />
            <span className="mg__name">{m.stage_name}</span>
            {!compact && <span className="mg__unit">{m.unit_label}</span>}
            {!m.photo && <span className="mg__badge">no photo</span>}
          </button>
        ))}
      </div>
    </div>
  )
}
