import { describe, expect, it } from 'vitest'
import { safeNotificationLink, unreadBadge, weekLabel } from './report'

describe('weekLabel', () => {
  it('formats one month', () => {
    expect(weekLabel({ week: '2026-W46', start: '2026-11-09T00:00:00Z', end: '2026-11-16T00:00:00Z' })).toBe(
      '2026-W46 · 9–15 Nov 2026',
    )
  })
  it('formats across months', () => {
    expect(weekLabel({ week: '2026-W49', start: '2026-11-30T00:00:00Z', end: '2026-12-07T00:00:00Z' })).toMatch(
      /^2026-W49 · 30 Nov – 6 Des 2026$/,
    )
  })
  it('falls back to the id on bad dates', () => {
    expect(weekLabel({ week: '2026-W46', start: 'x', end: 'y' })).toBe('2026-W46')
  })
})

describe('unreadBadge', () => {
  it('hides zero and caps', () => {
    expect(unreadBadge(0)).toBeNull()
    expect(unreadBadge(undefined)).toBeNull()
    expect(unreadBadge(7)).toBe('7')
    expect(unreadBadge(150)).toBe('99+')
  })
})

describe('safeNotificationLink', () => {
  it('only allows in-app paths', () => {
    expect(safeNotificationLink('/lab/runs/1')).toBe('/lab/runs/1')
    expect(safeNotificationLink('//evil.example')).toBeNull()
    expect(safeNotificationLink('https://evil.example')).toBeNull()
    expect(safeNotificationLink(null)).toBeNull()
  })
})
