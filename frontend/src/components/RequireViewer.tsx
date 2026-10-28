import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Loading } from './Status'

/** The viewer dashboard's pages: signed-out visitors go to sign in, then come back here
 *  (with the query too, so a shared /memories?page=12 link still opens on its page). */
export function RequireViewer({ children }: { children: ReactNode }) {
  const { account } = useAuth()
  const { pathname, search } = useLocation()
  if (account === undefined) return <Loading />
  if (!account) return <Navigate to={`/login?next=${encodeURIComponent(pathname + search)}`} replace />
  return <>{children}</>
}
