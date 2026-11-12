import { describe, expect, it } from 'vitest'
import {
  MINUS,
  coinOf,
  formatBps,
  formatCount,
  formatNumber,
  formatPct,
  formatR,
  formatRR,
  formatScore,
  formatUsd,
  formatUsdCompact,
  formatUsdSigned,
} from './format'

describe('exchange-style numbers (CEO decision K5)', () => {
  it('uses comma thousands and dot decimals', () => {
    expect(formatNumber(1234.56)).toBe('1,234.56')
    expect(formatNumber(1234567.891, { digits: 1 })).toBe('1,234,567.9')
    expect(formatCount(12500)).toBe('12,500')
    expect(formatUsd(1234.5)).toBe('$1,234.50')
  })
  it('never uses Indonesian separators', () => {
    for (const s of [formatNumber(1234.5), formatUsd(1234.5), formatPct(1234.5)]) {
      expect(s).not.toMatch(/\d\.\d{3}(,|$)/)
      expect(s).not.toMatch(/\d,\d{1,2}$/)
    }
  })
  it('writes negatives with the real minus sign', () => {
    expect(MINUS).toBe('−')
    expect(formatNumber(-3)).toBe(`${MINUS}3.00`)
    expect(formatUsd(-3.2)).toBe(`${MINUS}$3.20`)
    expect(formatUsdSigned(-4)).toBe(`${MINUS}$4.00`)
    expect(formatPct(-0.5, { signed: true })).toBe(`${MINUS}0.5%`)
    expect(formatScore(-0.1234)).toBe(`${MINUS}0.12`)
    for (const s of [formatNumber(-1), formatUsd(-1), formatPct(-1), formatR(-1), formatBps(-1)]) {
      expect(s).not.toContain('-')
    }
  })
  it('never signs zero, also after rounding', () => {
    expect(formatPct(0, { signed: true })).toBe('0.0%')
    expect(formatPct(-0.04, { signed: true })).toBe('0.0%')
    expect(formatNumber(-0.001)).toBe('0.00')
    expect(formatUsdSigned(0)).toBe('$0.00')
    expect(formatR(0)).toBe('0.00R')
  })
  it('signs positives only when asked', () => {
    expect(formatPct(56.25)).toBe('56.3%')
    expect(formatPct(1.2, { signed: true })).toBe('+1.2%')
    expect(formatNumber(2, { signed: true, digits: 0 })).toBe('+2')
  })
  it('supports min/max decimals', () => {
    expect(formatNumber(1.5, { maxDigits: 4 })).toBe('1.5')
    expect(formatNumber(1.23456, { maxDigits: 4 })).toBe('1.2346')
    expect(formatNumber(2, { minDigits: 1, maxDigits: 3 })).toBe('2.0')
  })
  it('formats R, R:R, bps and compact USD', () => {
    expect(formatR(0.14)).toBe('+0.14R')
    expect(formatRR(1.83)).toBe('1.8 : 1')
    expect(formatBps(3.24)).toBe('+3.2 bps')
    expect(formatUsdCompact(1_234_567, { signed: true })).toBe('+$1.2M')
    expect(formatUsdCompact(-350_000)).toBe(`${MINUS}$350K`)
  })
  it('returns "—" for missing values', () => {
    for (const f of [formatNumber, formatPct, formatR, formatRR, formatBps, formatUsdCompact, formatCount]) {
      expect(f(null as unknown as number)).toBe('—')
      expect(f(Number.NaN)).toBe('—')
      expect(f(Number.POSITIVE_INFINITY)).toBe('—')
    }
  })
  it('coinOf strips the quote currency', () => {
    expect(coinOf('ETHUSDT')).toBe('ETH')
    expect(coinOf('ETH/USDT:USDT')).toBe('ETH')
    expect(coinOf('1000PEPEUSDT')).toBe('1000PEPE')
  })
})
