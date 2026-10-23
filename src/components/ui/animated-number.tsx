import { useEffect, useRef, useState } from 'react'

interface AnimatedNumberProps {
  value: number
  format: (value: number) => string
  /** Milliseconds for the count to settle. */
  duration?: number
  className?: string
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Counts from the previous value to the new one, so changes in totals are seen. */
export function AnimatedNumber({ value, format, duration = 700, className }: AnimatedNumberProps) {
  const [shown, setShown] = useState(value)
  const from = useRef(0)

  const still = reducedMotion()

  useEffect(() => {
    const start = from.current
    if (start === value || still) {
      from.current = value
      return
    }
    const began = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - began) / duration)
      const eased = 1 - Math.pow(1 - t, 4)
      const next = start + (value - start) * eased
      setShown(next)
      from.current = next
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, duration, still])

  return (
    <span className={className} aria-label={format(value)}>
      <span aria-hidden>{format(still ? value : shown)}</span>
    </span>
  )
}
