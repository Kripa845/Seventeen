import { useEffect } from 'react'

/** Little ✦ sparkles that follow the mouse. Off for touch screens and reduced-motion users. */
export function SparkleTrail() {
  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!fine || calm) return

    let last = 0
    const glyphs = ['✦', '✧', '⋆', '◆']
    const onMove = (e: MouseEvent) => {
      const now = performance.now()
      if (now - last < 45) return
      last = now
      const s = document.createElement('span')
      s.className = 'sparkle'
      s.textContent = glyphs[Math.floor(Math.random() * glyphs.length)]
      s.style.left = `${e.clientX}px`
      s.style.top = `${e.clientY}px`
      s.style.setProperty('--dx', `${(Math.random() - 0.5) * 30}px`)
      s.style.fontSize = `${8 + Math.random() * 8}px`
      document.body.appendChild(s)
      s.addEventListener('animationend', () => s.remove())
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])
  return null
}
