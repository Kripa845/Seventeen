import { createContext, useCallback, useContext, useRef, useState } from 'react'
import type { ReactNode } from 'react'

/** A labelled form row. */
export function Field({ label, hint, wide, children }: { label: string; hint?: ReactNode; wide?: boolean; children: ReactNode }) {
  return (
    <label className={`sf ${wide ? 'sf--wide' : ''}`}>
      <span className="sf__label">{label}</span>
      {children}
      {hint && <span className="sf__hint">{hint}</span>}
    </label>
  )
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: ReactNode }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="sf">
      <span className="sf__label">{label}</span>
      <div className="seg" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            className={value === o.value ? 'is-on' : ''}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

const HEX = /^#[0-9a-f]{6}$/i

/** Colour wheel plus a hex box you can type or paste into. */
export function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (hex: string) => void }) {
  const [text, setText] = useState(value)
  const [shown, setShown] = useState(value)
  if (value !== shown) {
    setShown(value)
    setText(value)
  }
  return (
    <div className="sf color-in">
      <span className="sf__label">{label}</span>
      <div className="color-in__row">
        <span className="color-in__swatch" style={{ background: value }}>
          <input type="color" value={value} onChange={(e) => onChange(e.target.value.toUpperCase())} aria-label={`${label} colour`} />
        </span>
        <input
          className={`color-in__hex ${HEX.test(text) ? '' : 'is-bad'}`}
          value={text}
          spellCheck={false}
          maxLength={7}
          aria-label={`${label} hex code`}
          onChange={(e) => {
            const v = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`
            setText(v)
            if (HEX.test(v)) onChange(v.toUpperCase())
          }}
        />
      </div>
    </div>
  )
}

export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle__track" aria-hidden />
      <span>
        {label}
        {hint && <span className="sf__hint">{hint}</span>}
      </span>
    </label>
  )
}

/** The bar that appears when there are unsaved edits. */
export function SaveBar({ dirty, busy, onSave, onDiscard, label = 'Save changes' }: { dirty: boolean; busy: boolean; onSave: () => void; onDiscard?: () => void; label?: string }) {
  return (
    <div className={`savebar ${dirty ? 'is-dirty' : ''}`}>
      <span className="savebar__note">{dirty ? 'You have unsaved changes' : 'All changes saved'}</span>
      {onDiscard && dirty && (
        <button type="button" className="btn btn--ghost btn--small" onClick={onDiscard} disabled={busy}>
          Discard
        </button>
      )}
      <button type="button" className="btn btn--small" onClick={onSave} disabled={!dirty || busy}>
        {busy ? 'Saving…' : label}
      </button>
    </div>
  )
}

/* ---------- toasts ---------- */

interface Toast {
  id: number
  text: string
  kind: 'ok' | 'error'
}
const ToastCtx = createContext<(text: string, kind?: Toast['kind']) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const next = useRef(0)
  const push = useCallback((text: string, kind: Toast['kind'] = 'ok') => {
    const id = ++next.current
    setToasts((t) => [...t, { id, text, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 6000 : 2600)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.kind}`}>
            {t.kind === 'ok' ? '✓' : '!'} {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  return useContext(ToastCtx)
}
