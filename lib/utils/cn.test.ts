import { describe, expect, it } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('keeps the text colour next to text-glow', () => {
    expect(cn('text-bearish', 'text-glow')).toBe('text-bearish text-glow')
    expect(cn('text-glow', 'text-bullish')).toBe('text-glow text-bullish')
  })

  it('keeps the ring colour next to ring-gradient', () => {
    expect(cn('ring-1 ring-primary', 'ring-gradient')).toBe('ring-1 ring-primary ring-gradient')
  })

  it('treats the custom 2xs/3xs sizes as font sizes, not colours', () => {
    expect(cn('text-2xs', 'text-muted-foreground')).toBe('text-2xs text-muted-foreground')
    expect(cn('text-sm', 'text-2xs')).toBe('text-2xs')
  })

  it('still merges ordinary conflicts', () => {
    expect(cn('text-bearish', 'text-bullish')).toBe('text-bullish')
    expect(cn('p-4', 'p-6')).toBe('p-6')
  })
})
