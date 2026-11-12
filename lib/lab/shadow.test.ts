import { describe, expect, it } from 'vitest'
import { actionLabel, bps, defaultChoice, duration, kLabel, pickCell, ttlLabel } from './shadow'
import type { ShadowCell } from '@/lib/api/types/shadow'

describe('shadow formatting', () => {
  it('formats bps and durations', () => {
    expect(bps(3.21)).toBe('+3.2 bps')
    expect(bps(-0.04, 2)).toBe('−0.04 bps')
    expect(bps(0)).toBe('0.0 bps')
    expect(bps(null)).toBe('—')
    expect(duration(7)).toBe('7 dtk')
    expect(duration(250)).toBe('4 mnt 10 dtk')
    expect(duration(3900)).toBe('1 jam 5 mnt')
    expect(duration(undefined)).toBe('—')
  })

  it('labels k, ttl and actions', () => {
    expect(kLabel(0)).toBe('Di close')
    expect(kLabel(0.25)).toBe('+0.25×ATR')
    expect(kLabel(-0.1)).toBe('−0.1×ATR')
    expect(ttlLabel(15)).toBe('15 mnt')
    expect(ttlLabel(240)).toBe('4 jam')
    expect(actionLabel({ action: 'close', side: 'short' })).toBe('Tutup SHORT')
  })

  it('picks defaults and grid cells', () => {
    expect(defaultChoice([-0.1, 0, 0.25], [5, 240])).toEqual({ k: 0, ttl: 240 })
    expect(defaultChoice([0.1], [])).toEqual({ k: 0.1, ttl: 240 })
    const cell = { k: 0.25, ttl_min: 15, n: 1 } as ShadowCell
    expect(pickCell([cell], 0.25, 15)).toBe(cell)
    expect(pickCell([cell], 0, 15)).toBeUndefined()
  })
})
