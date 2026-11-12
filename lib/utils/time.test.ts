import { describe, expect, it } from 'vitest'
import {
  formatAge,
  formatClock,
  formatDate,
  formatDateTime,
  formatDuration,
  formatHorizon,
  formatTime,
  formatTimeframe,
  nextCandleClose,
  parseTimeframe,
  timeframeMs,
  toDate,
} from './time'

const NOW_2026 = Date.parse('2026-11-12T05:00:00Z') // 12 Nov 2026 12:00 WIB

describe('toDate', () => {
  it('reads ISO with and without zone, epoch seconds and ms', () => {
    expect(toDate('2026-11-12T01:00:00Z')?.toISOString()).toBe('2026-11-12T01:00:00.000Z')
    expect(toDate('2026-11-12T08:00:00+07:00')?.toISOString()).toBe('2026-11-12T01:00:00.000Z')
    expect(toDate('2026-11-12 01:00:00')?.toISOString()).toBe('2026-11-12T01:00:00.000Z')
    expect(toDate('2026-11-12')?.toISOString()).toBe('2026-11-12T00:00:00.000Z')
    expect(toDate(1_762_909_200)?.toISOString()).toBe('2025-11-12T01:00:00.000Z')
    expect(toDate(1_762_909_200_000)?.toISOString()).toBe('2025-11-12T01:00:00.000Z')
  })
  it('returns null for missing or invalid input', () => {
    for (const v of [null, undefined, '', 'nope', Number.NaN, new Date('x')]) expect(toDate(v)).toBeNull()
  })
})

describe('formatTime (WIB)', () => {
  it('writes "12 Nov 08:00 WIB"', () => {
    expect(formatTime('2026-11-12T01:00:00Z', { now: NOW_2026 })).toBe('12 Nov 08:00 WIB')
  })
  it('rolls the date over at 17:00 UTC', () => {
    expect(formatTime('2026-11-12T17:30:00Z', { now: NOW_2026 })).toBe('13 Nov 00:30 WIB')
  })
  it('shows the year only for other years (auto)', () => {
    expect(formatTime('2025-03-01T01:00:00Z', { now: NOW_2026 })).toBe('1 Mar 2025 08:00 WIB')
    expect(formatTime('2026-03-01T01:00:00Z', { now: NOW_2026, year: true })).toBe('1 Mar 2026 08:00 WIB')
  })
  it('uses Indonesian month names', () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    months.forEach((m, i) => {
      const iso = `2026-${String(i + 1).padStart(2, '0')}-10T03:00:00Z`
      expect(formatTime(iso, { now: NOW_2026, time: false })).toBe(`10 ${m}`)
    })
  })
  it('has date-only, clock-only and full variants', () => {
    expect(formatDate('2026-11-12T01:00:00Z')).toBe('12 Nov 2026')
    expect(formatClock('2026-11-12T05:02:00Z')).toBe('12:02 WIB')
    expect(formatDateTime('2026-11-12T01:00:09Z')).toBe('12 Nov 2026 08:00:09 WIB')
  })
  it('returns "—" for missing values', () => {
    expect(formatTime(null)).toBe('—')
  })
})

describe('formatAge', () => {
  it('reads like Indonesian speech', () => {
    expect(formatAge(NOW_2026 - 10_000, { now: NOW_2026 })).toBe('baru saja')
    expect(formatAge(NOW_2026 - 3 * 60_000, { now: NOW_2026 })).toBe('3 mnt lalu')
    expect(formatAge(NOW_2026 - 2 * 3_600_000, { now: NOW_2026 })).toBe('2 jam lalu')
    expect(formatAge(NOW_2026 - 3 * 86_400_000, { now: NOW_2026 })).toBe('3 hari lalu')
    expect(formatAge(NOW_2026 + 5 * 60_000, { now: NOW_2026 })).toBe('dalam 5 mnt')
    expect(formatAge(NOW_2026 + 20_000, { now: NOW_2026 })).toBe('baru saja')
  })
  it('falls back to the date after a week', () => {
    expect(formatAge('2026-10-01T01:00:00Z', { now: NOW_2026 })).toBe('1 Okt')
  })
})

describe('timeframes and horizons', () => {
  it('formatTimeframe writes units out', () => {
    expect(formatTimeframe('4h')).toBe('4 jam')
    expect(formatTimeframe('15m')).toBe('15 menit')
    expect(formatTimeframe('1d')).toBe('1 hari')
    expect(formatTimeframe('1w')).toBe('1 minggu')
    expect(formatTimeframe('1M')).toBe('1 bulan')
    expect(formatTimeframe('4H')).toBe('4 jam')
    expect(formatTimeframe('weird')).toBe('weird')
  })
  it('formatHorizon never writes "1h" for a day', () => {
    expect(formatHorizon('1d')).toBe('1 hari')
    expect(formatHorizon('7d')).toBe('7 hari')
    expect(formatHorizon('4h')).toBe('4 jam')
    expect(formatHorizon(24)).toBe('1 hari')
    expect(formatHorizon(6)).toBe('6 jam')
    for (const h of ['1d', '3d', '7d', 30 * 24]) expect(formatHorizon(h)).not.toMatch(/\dh\b/i)
  })
  it('parses and sizes timeframes', () => {
    expect(parseTimeframe('30m')).toEqual({ n: 30, unit: 'm' })
    expect(timeframeMs('4h')).toBe(14_400_000)
    expect(timeframeMs('1M')).toBeNull()
  })
  it('formatDuration uses at most two units', () => {
    expect(formatDuration(45_000)).toBe('45 dtk')
    expect(formatDuration(12 * 60_000)).toBe('12 mnt')
    expect(formatDuration(3_590_000)).toBe('1 jam')
    expect(formatDuration(200 * 60_000)).toBe('3 jam 20 mnt')
    expect(formatDuration(52 * 3_600_000)).toBe('2 hari 4 jam')
  })
})

describe('nextCandleClose', () => {
  it('finds the next 4H close (UTC-aligned)', () => {
    // 05:00 UTC → next 4H close 08:00 UTC = 15:00 WIB
    expect(nextCandleClose('4h', NOW_2026)?.toISOString()).toBe('2026-11-12T08:00:00.000Z')
    expect(formatClock(nextCandleClose('4h', '2026-11-12T08:00:00Z'))).toBe('19:00 WIB')
  })
  it('weekly candles close Monday 00:00 UTC', () => {
    const d = nextCandleClose('1w', '2026-11-12T05:00:00Z') // Thursday
    expect(d?.toISOString()).toBe('2026-11-16T00:00:00.000Z')
    expect(d?.getUTCDay()).toBe(1)
  })
})
