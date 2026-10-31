import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Lightstick } from '../components/Lightstick'
import { useMembers } from '../lib/api'
import { useTheme } from '../lib/theme'

/** /lightstick : concert mode without picking a song first, glowing in the site's current theme. */
export function LightStickPage() {
  const { active } = useTheme()
  const members = useMembers()
  const navigate = useNavigate()
  const { key } = useLocation()
  // back to wherever they came from; opened straight from a link, go to the dashboard
  const close = useCallback(() => (key === 'default' ? navigate('/me') : navigate(-1)), [key, navigate])

  return (
    <Lightstick
      title="Moonpetal light stick"
      lyrics=""
      members={members.data ?? []}
      color={active.accent}
      color2={active.accent2}
      onClose={close}
      emptyText="Just wave it! ✦ For a song's fanchant, open Concert mode on its song page."
    />
  )
}
