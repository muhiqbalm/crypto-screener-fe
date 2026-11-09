import { describe, it, expect } from 'vitest'
import { positionLines, snapToBar, tradesToMarkers, unrealisedPct } from './overlay'

const H = 3600
const bars = [0, H, 2 * H, 3 * H].map((x) => 1_700_000_000 - (1_700_000_000 % H) + x)
const iso = (s: number) => new Date(s * 1000).toISOString()

describe('snapToBar', () => {
  it('snaps into the containing bar', () => {
    expect(snapToBar(bars[1] + 100, bars)).toBe(bars[1])
    expect(snapToBar(bars[3] + 10, bars)).toBe(bars[3])
  })
  it('returns null outside loaded range', () => {
    expect(snapToBar(bars[0] - 1, bars)).toBeNull()
    expect(snapToBar(bars[3] + 2 * H, bars)).toBeNull()
    expect(snapToBar(bars[0], [])).toBeNull()
  })
})

describe('tradesToMarkers', () => {
  it('creates entry + exit markers, colours exit by pnl, counts dropped', () => {
    const { markers, dropped } = tradesToMarkers(
      [
        { entry_time: iso(bars[0] + 5), exit_time: iso(bars[2]), side: 'long', entry_price: 100, exit_price: 110, exit_reason: 'tp' },
        { entry_time: iso(bars[1]), exit_time: iso(bars[3]), side: 'short', entry_price: 100, exit_price: 105, exit_reason: 'sl' },
        { entry_time: iso(bars[0] - 10 * H), exit_time: null, side: 'long', entry_price: 1, exit_price: null, exit_reason: null },
      ],
      bars,
    )
    expect(dropped).toBe(1)
    expect(markers).toHaveLength(4)
    expect(markers[0]).toMatchObject({ time: bars[0], shape: 'arrowUp', position: 'belowBar' })
    const shortEntry = markers.find((m) => m.text === 'S')!
    expect(shortEntry.shape).toBe('arrowDown')
    const slExit = markers.find((m) => m.text === 'x sl')!
    expect(slExit.color).toBe('#ef4444')
    const tpExit = markers.find((m) => m.text === 'x tp')!
    expect(tpExit.color).toBe('#22c55e')
    expect(markers.map((m) => m.time)).toEqual([...markers.map((m) => m.time)].sort((a, b) => a - b))
  })
})

describe('unrealisedPct / positionLines', () => {
  it('signs by side', () => {
    expect(unrealisedPct('long', 100, 110)).toBeCloseTo(10)
    expect(unrealisedPct('short', 100, 110)).toBeCloseTo(-10)
    expect(unrealisedPct('long', 100, null)).toBeNull()
  })
  it('emits entry/sl/tp lines and skips nulls', () => {
    expect(positionLines('w', { side: 'long', entry_price: 100, sl: 95, tp: null }).map((l) => l.title)).toEqual(['Entry L', 'SL'])
    expect(positionLines('w', null)).toEqual([])
  })
})
