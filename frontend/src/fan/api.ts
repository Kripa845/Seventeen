import { useApi } from '../lib/api'
import type { Letter, PhotoCard, SvtEvent } from '../lib/types'

export const useEvents = () => useApi<SvtEvent[]>('/events/')
export const useCards = () => useApi<PhotoCard[]>('/cards/')
export const useLetters = (member: string | null) => useApi<Letter[]>(`/letters/${member ? `?member=${member}` : ''}`)
