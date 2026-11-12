/**
 * Unit tests for formatting utilities (Task 4.1)
 * Requirements: 6.14, 11.3, 19.1, 19.2, 19.3, 19.4, 19.5, 19.6
 */

import { describe, it, expect } from 'vitest'
import {
  valueOrDash,
  formatPrice,
  formatUsd,
  formatUsdSigned,
  formatQty,
  baseAsset,
  displaySymbol,
  signClass,
  formatAmount,
  isUsdStable,
  formatPercent,
  formatVolume,
  formatFunding,
  formatScore,
  formatTimestamp,
} from './format'

const DASH = '—'

// ---------------------------------------------------------------------------
// valueOrDash
// ---------------------------------------------------------------------------
describe('valueOrDash', () => {
  it('returns "—" for null', () => {
    expect(valueOrDash(null)).toBe(DASH)
  })

  it('returns "—" for undefined', () => {
    expect(valueOrDash(undefined)).toBe(DASH)
  })

  it('returns "—" for NaN', () => {
    expect(valueOrDash(NaN)).toBe(DASH)
  })

  it('returns string representation for a number', () => {
    expect(valueOrDash(42)).toBe('42')
  })

  it('returns string representation for a string', () => {
    expect(valueOrDash('hello')).toBe('hello')
  })

  it('returns "0" for zero', () => {
    expect(valueOrDash(0)).toBe('0')
  })
})

// ---------------------------------------------------------------------------
// formatPrice
// ---------------------------------------------------------------------------
describe('formatPrice', () => {
  it('returns "—" for null', () => {
    expect(formatPrice(null)).toBe(DASH)
  })

  it('returns "—" for undefined', () => {
    expect(formatPrice(undefined)).toBe(DASH)
  })

  it('returns "—" for NaN', () => {
    expect(formatPrice(NaN)).toBe(DASH)
  })

  it('formats values >= 1 with 2 decimal places', () => {
    expect(formatPrice(1234.56)).toBe('$1,234.56')
  })

  it('formats values < 1 with up to 6 decimal places', () => {
    const result = formatPrice(0.000123)
    expect(result).toContain('$')
    expect(result).toContain('0.000123')
  })

  it('keeps significant digits for tiny prices', () => {
    expect(formatPrice(0.00001234)).toBe('$0.00001234')
    expect(formatPrice(0.0000098765)).toBe('$0.000009877')
    expect(formatPrice(0.5)).toBe('$0.50')
    expect(formatPrice(0)).toBe('$0.00')
  })

  it('formats exactly 1.00', () => {
    expect(formatPrice(1)).toBe('$1.00')
  })

  it('formats large values with commas', () => {
    expect(formatPrice(67420.5)).toBe('$67,420.50')
  })

  it('keeps enough decimals for mid-priced coins', () => {
    expect(formatPrice(2.34567)).toBe('$2.3457')
    expect(formatPrice(12.3456)).toBe('$12.3456')
    expect(formatPrice(145.1234)).toBe('$145.123')
    expect(formatPrice(145.1)).toBe('$145.10')
    expect(formatPrice(-3.5)).toBe('−$3.50')
  })
})

describe('formatUsd / formatUsdSigned', () => {
  it('always uses 2 decimals', () => {
    expect(formatUsd(1234.5)).toBe('$1,234.50')
    expect(formatUsd(0.004)).toBe('$0.00')
    expect(formatUsd(null)).toBe(DASH)
  })
  it('signs amounts', () => {
    expect(formatUsdSigned(12.3)).toBe('+$12.30')
    expect(formatUsdSigned(-4)).toBe('−$4.00')
    expect(formatUsdSigned(0)).toBe('$0.00')
  })
})

describe('formatAmount', () => {
  it('shows stablecoins as USD and other assets in their own unit', () => {
    expect(formatAmount(1550.5, 'USDT')).toBe('$1,550.50')
    expect(formatAmount(0.0315, 'BTC')).toBe('0.0315 BTC')
    expect(isUsdStable('usdc')).toBe(true)
    expect(isUsdStable('ETH')).toBe(false)
  })
})

describe('formatQty / baseAsset / displaySymbol / signClass', () => {
  it('removes float noise from quantities', () => {
    expect(formatQty(0.1 + 0.2)).toBe('0.3')
    expect(formatQty(12500)).toBe('12,500')
  })
  it('strips USDT-M suffixes', () => {
    expect(baseAsset('BTC/USDT:USDT')).toBe('BTC')
    expect(displaySymbol('ETH/USDT:USDT')).toBe('ETH/USDT')
  })
  it('maps sign to colour class', () => {
    expect(signClass(1)).toBe('text-bullish')
    expect(signClass(-1)).toBe('text-bearish')
    expect(signClass(0)).toBe('text-foreground')
  })
})

// ---------------------------------------------------------------------------
// formatPercent
// ---------------------------------------------------------------------------
describe('formatPercent', () => {
  it('returns "—" for null', () => {
    expect(formatPercent(null)).toBe(DASH)
  })

  it('returns "—" for undefined', () => {
    expect(formatPercent(undefined)).toBe(DASH)
  })

  it('returns "—" for NaN', () => {
    expect(formatPercent(NaN)).toBe(DASH)
  })

  it('adds "+" prefix for positive values', () => {
    expect(formatPercent(1.234)).toBe('+1.23%')
  })

  it('adds "−" (minus sign) prefix for negative values', () => {
    expect(formatPercent(-0.5)).toBe('−0.50%')
  })

  it('never signs zero', () => {
    expect(formatPercent(0)).toBe('0.00%')
    expect(formatPercent(-0.001)).toBe('0.00%')
  })

  it('respects custom fractionDigits', () => {
    expect(formatPercent(1.23456, 4)).toBe('+1.2346%')
  })

  it('produces exactly the specified number of fraction digits', () => {
    const result = formatPercent(5, 3)
    // Should be "+5.000%"
    expect(result).toBe('+5.000%')
  })

  it('ends with "%"', () => {
    expect(formatPercent(3.14)).toMatch(/%$/)
  })
})

// ---------------------------------------------------------------------------
// formatVolume
// ---------------------------------------------------------------------------
describe('formatVolume', () => {
  it('returns "—" for null', () => {
    expect(formatVolume(null)).toBe(DASH)
  })

  it('returns "—" for undefined', () => {
    expect(formatVolume(undefined)).toBe(DASH)
  })

  it('returns "—" for NaN', () => {
    expect(formatVolume(NaN)).toBe(DASH)
  })

  it('formats billions with B suffix', () => {
    expect(formatVolume(1_500_000_000)).toBe('$1.50B')
  })

  it('formats millions with M suffix', () => {
    expect(formatVolume(1_500_000)).toBe('$1.50M')
  })

  it('formats thousands with K suffix', () => {
    expect(formatVolume(1_500)).toBe('$1.50K')
  })

  it('formats small values without suffix', () => {
    expect(formatVolume(500)).toBe('$500.00')
  })

  it('handles negative values', () => {
    expect(formatVolume(-1_000_000)).toBe('−$1.00M')
  })
})

// ---------------------------------------------------------------------------
// formatFunding
// ---------------------------------------------------------------------------
describe('formatFunding', () => {
  it('returns "—" for null', () => {
    expect(formatFunding(null)).toBe(DASH)
  })

  it('returns "—" for undefined', () => {
    expect(formatFunding(undefined)).toBe(DASH)
  })

  it('returns "—" for NaN', () => {
    expect(formatFunding(NaN)).toBe(DASH)
  })

  it('formats positive funding rate (already in percent) with "+" prefix', () => {
    expect(formatFunding(0.01)).toBe('+0.0100%')
  })

  it('formats negative funding rate (already in percent) with "−" prefix', () => {
    expect(formatFunding(-0.01)).toBe('−0.0100%')
  })

  it('does not scale the value by 100', () => {
    expect(formatFunding(0.0525)).toBe('+0.0525%')
  })

  it('ends with "%"', () => {
    expect(formatFunding(0.005)).toMatch(/%$/)
  })
})

// ---------------------------------------------------------------------------
// formatScore
// ---------------------------------------------------------------------------
describe('formatScore', () => {
  it('returns "—" for null', () => {
    expect(formatScore(null)).toBe(DASH)
  })

  it('returns "—" for undefined', () => {
    expect(formatScore(undefined)).toBe(DASH)
  })

  it('returns "—" for NaN', () => {
    expect(formatScore(NaN)).toBe(DASH)
  })

  it('formats score with 2 decimal places', () => {
    expect(formatScore(7.5)).toBe('7.50')
  })

  it('formats integer score with 2 decimal places', () => {
    expect(formatScore(100)).toBe('100.00')
  })

  it('formats zero', () => {
    expect(formatScore(0)).toBe('0.00')
  })
})

// ---------------------------------------------------------------------------
// formatTimestamp
// ---------------------------------------------------------------------------
describe('formatTimestamp', () => {
  it('returns "—" for null', () => {
    expect(formatTimestamp(null)).toBe(DASH)
  })

  it('returns "—" for undefined', () => {
    expect(formatTimestamp(undefined)).toBe(DASH)
  })

  it('returns "—" for empty string', () => {
    expect(formatTimestamp('')).toBe(DASH)
  })

  it('returns "—" for invalid date string', () => {
    expect(formatTimestamp('not-a-date')).toBe(DASH)
  })

  it('keeps the fixed YYYY-MM-DD HH:mm:ss layout (callers slice it), in WIB, with the zone after it', () => {
    expect(formatTimestamp('2025-01-15T12:00:00Z')).toBe('2025-01-15 19:00:00 WIB')
    expect(formatTimestamp('2025-06-01T20:30:45Z')).toBe('2025-06-02 03:30:45 WIB')
    expect(formatTimestamp('2025-06-01T20:30:45Z').slice(0, 10)).toBe('2025-06-02')
    expect(formatTimestamp('2025-06-01T20:30:45Z').slice(0, 16)).toBe('2025-06-02 03:30')
  })

  it('treats a timestamp without zone as UTC (backend convention)', () => {
    expect(formatTimestamp('2025-06-01 08:30:45')).toBe('2025-06-01 15:30:45 WIB')
  })
})
