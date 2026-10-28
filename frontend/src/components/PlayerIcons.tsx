/** Small stroke icons for the player controls. They inherit the text colour. */
const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export const IconShuffle = () => (
  <svg {...base}>
    <path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
  </svg>
)
export const IconPrev = () => (
  <svg {...base}>
    <path d="M19 20 9 12l10-8z" fill="currentColor" />
    <path d="M5 19V5" />
  </svg>
)
export const IconNext = () => (
  <svg {...base}>
    <path d="m5 4 10 8-10 8z" fill="currentColor" />
    <path d="M19 5v14" />
  </svg>
)
export const IconPlay = () => (
  <svg {...base} strokeWidth={0}>
    <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" fill="currentColor" />
  </svg>
)
export const IconPause = () => (
  <svg {...base} strokeWidth={0}>
    <rect x="6" y="5" width="4" height="14" rx="1.2" fill="currentColor" />
    <rect x="14" y="5" width="4" height="14" rx="1.2" fill="currentColor" />
  </svg>
)
export const IconRepeat = ({ one = false }: { one?: boolean }) => (
  <svg {...base}>
    <path d="m17 2 4 4-4 4" />
    <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
    <path d="m7 22-4-4 4-4" />
    <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    {one && <text x="12" y="14.5" fontSize="7" textAnchor="middle" fill="currentColor" stroke="none" fontWeight="700">1</text>}
  </svg>
)
export const IconDown = () => (
  <svg {...base}>
    <path d="m6 9 6 6 6-6" />
  </svg>
)
