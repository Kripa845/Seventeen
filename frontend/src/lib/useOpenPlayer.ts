import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlayer } from './player'
import type { Song } from './types'

/** Start a song and open the full-screen Now Playing page. */
export function useOpenPlayer() {
  const { play } = usePlayer()
  const navigate = useNavigate()
  return useCallback(
    (song: Song, queue?: Song[]) => {
      play(song, queue)
      navigate('/now-playing')
    },
    [play, navigate],
  )
}
