import { useRef, useState } from 'react'
import type { ReactNode } from 'react'

const MAX_MB = 10

/** Drag an image onto it (or click) to upload straight away. */
export function ImageDrop({
  src,
  label,
  round = false,
  placeholder,
  onUpload,
  onRemove,
}: {
  src: string | null
  label: string
  round?: boolean
  placeholder?: ReactNode
  onUpload: (file: File) => Promise<void>
  onRemove?: () => Promise<void>
}) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const take = async (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return setError('That isn’t an image.')
    if (file.size > MAX_MB * 1024 * 1024) return setError(`Images up to ${MAX_MB} MB, please.`)
    setError(null)
    setBusy(true)
    try {
      await onUpload(file)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  const remove = async () => {
    if (!onRemove) return
    setBusy(true)
    try {
      await onRemove()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="drop-wrap">
      <button
        type="button"
        className={`drop ${round ? 'drop--round' : ''} ${over ? 'is-over' : ''} ${busy ? 'is-busy' : ''}`}
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          take(e.dataTransfer.files[0])
        }}
        aria-label={`${src ? 'Replace' : 'Upload'} ${label}`}
      >
        {src ? <img src={src} alt="" /> : <span className="drop__placeholder">{placeholder}</span>}
        <span className="drop__veil">
          <span className="drop__icon" aria-hidden>{busy ? '◌' : '⇪'}</span>
          {busy ? 'Uploading…' : src ? 'Drop or click to replace' : 'Drop a picture or click'}
        </span>
      </button>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => take(e.target.files?.[0])} />
      <div className="drop__actions">
        <span className="sf__label">{label}</span>
        {src && onRemove && (
          <button type="button" className="link-btn" onClick={remove} disabled={busy}>
            Remove
          </button>
        )}
      </div>
      {error && <p className="studio-error">{error}</p>}
    </div>
  )
}
