import { Link, NavLink, useLocation } from 'react-router-dom'
import { MemberAvatar } from '../components/MemberAvatar'
import { useMembers } from '../lib/api'
import { useAuth } from './AuthProvider'

/** Nav corner: "Log in" and "Sign up" when signed out; your face (and the admin dashboard,
 *  for admins) when signed in. */
export function AccountButton() {
  const { account } = useAuth()
  const members = useMembers().data
  const { pathname, search } = useLocation()

  if (account === undefined) return <span className="acct acct--loading" aria-hidden />
  if (!account) {
    const next = pathname === '/' || pathname === '/login' || pathname === '/register' ? '' : `?next=${encodeURIComponent(pathname + search)}`
    return (
      <div className="acct">
        <Link to={`/login${next}`} className="acct__login">Log in</Link>
        <Link to={`/register${next}`} className="acct--signin">Sign up</Link>
      </div>
    )
  }

  const bias = members?.find((m) => m.slug === account.bias)
  return (
    <div className="acct">
      {account.role === 'admin' && (
        <Link to="/studio" className="acct__studio" title="Admin dashboard" aria-label="Admin dashboard">
          <span className="acct__studio-icon" aria-hidden>⚙</span>
          <span className="acct__studio-label">Admin</span>
        </Link>
      )}
      <NavLink to="/me" className="acct__me" title="My dashboard">
        {bias ? (
          <MemberAvatar member={bias} size="sm" />
        ) : (
          <span className="acct__initial" aria-hidden>{account.display_name[0]?.toUpperCase()}</span>
        )}
        <span className="acct__name">{account.display_name}</span>
      </NavLink>
    </div>
  )
}
