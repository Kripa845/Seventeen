import { useLocation, useNavigate } from 'react-router-dom'
import type { Song } from '../lib/types'
import { useAuth } from './AuthProvider'

/** ♥ a song into your playlist. Signed out, it takes you to sign in and back. */
export function LikeButton({ song, className = '' }: { song: Song; className?: string }) {
  const { likes, toggleLike } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  if (song.id < 0) return null // a whole-album item, not a song
  const liked = likes.has(song.id)

  return (
    <button
      type="button"
      className={`like-btn ${liked ? 'is-liked' : ''} ${className}`}
      aria-pressed={liked}
      aria-label={liked ? `Remove ${song.title} from your playlist` : `Add ${song.title} to your playlist`}
      title={liked ? 'In your playlist' : 'Add to your playlist'}
      onClick={async (e) => {
        e.stopPropagation()
        const ok = await toggleLike(song)
        if (!ok) navigate(`/login?next=${encodeURIComponent(location.pathname)}`)
      }}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
        <path
          d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.6 4.5 7.1 4.5c2 0 3.4 1.1 4.9 2.9 1.5-1.8 2.9-2.9 4.9-2.9 3.5 0 5.7 3.5 4.4 6.8-1.8 4.6-9.3 9.2-9.3 9.2z"
          fill={liked ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}
