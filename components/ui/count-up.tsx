'use client'

import { useEffect, useRef, useState } from 'react'

function reducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return true
  }
}

/**
 * Counts a number up the first time it scrolls into view (ease-out, ~0.9 s),
 * then follows later value changes without animating. Shows the final value
 * immediately under prefers-reduced-motion, on the server and in tests
 * (no IntersectionObserver). `format` turns the number into text, e.g.
 * (n) => formatUsd(n).
 */
export function CountUp({
  value,
  format = (n) => String(Math.round(n)),
  duration = 900,
  className,
}: {
  value: number
  format?: (n: number) => string
  duration?: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const done = useRef(false)
  const [shown, setShown] = useState<number | null>(null)

  useEffect(() => {
    const el = ref.current
    if (done.current || !el || typeof IntersectionObserver === 'undefined' || reducedMotion() || !Number.isFinite(value)) {
      done.current = true
      return
    }
    let raf = 0
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return
        io.disconnect()
        const start = performance.now()
        const tick = (t: number) => {
          const p = Math.min(1, (t - start) / duration)
          const eased = 1 - Math.pow(1 - p, 3)
          setShown(value * eased)
          if (p < 1) raf = requestAnimationFrame(tick)
          else {
            done.current = true
            setShown(null)
          }
        }
        raf = requestAnimationFrame(tick)
      },
      { threshold: 0.3 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
    // Animate once, for the first value only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <span ref={ref} className={className}>
      {format(shown ?? value)}
    </span>
  )
}
