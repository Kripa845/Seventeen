export function Loading({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="status" role="status">
      <span className="status__diamond" aria-hidden>◆</span> {label}…
    </div>
  )
}

export function ApiError({ message }: { message: string }) {
  return (
    <div className="status status--error" role="alert">
      <p>
        <b>Couldn't reach the backend</b> ({message}).
      </p>
      <p className="muted">
        Is Django running? In the <code>backend</code> folder run <code>python manage.py runserver</code>.
      </p>
    </div>
  )
}
