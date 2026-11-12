import { describe, expect, it } from 'vitest'
import { axisPrice, change24h, chartTickLabel, chartTimeLabel, pctChange, previousClose, toChartTime, type Candle } from './candles'
import { chartSearch, DEFAULT_TF, parseSymbol, parseTf, tfLong, TF_SECONDS } from './params'

describe('chart URL params', () => {
  it('defaults to the team timeframe and accepts ?tf= in any case', () => {
    expect(DEFAULT_TF).toBe('4h')
    expect(parseTf('4H')).toBe('4h')
    expect(parseTf('1D')).toBe('1d')
    expect(parseTf('2h')).toBeNull()
    expect(parseTf(null)).toBeNull()
    expect(tfLong('1h')).toBe('1 jam')
    expect(tfLong('2h')).toBe('2h')
  })

  it('accepts full and base symbols, rejects junk', () => {
    expect(parseSymbol('solusdt')).toBe('SOLUSDT')
    expect(parseSymbol('ETH')).toBe('ETHUSDT')
    expect(parseSymbol('1000PEPEUSDT')).toBe('1000PEPEUSDT')
    expect(parseSymbol('BTC/USDT')).toBeNull()
    expect(parseSymbol('<script>')).toBeNull()
  })

  it('patches the query string and keeps ?watch / ?run', () => {
    expect(chartSearch('symbol=ETHUSDT&watch=7', { tf: '1h' })).toBe('?symbol=ETHUSDT&watch=7&tf=1h')
    expect(chartSearch('run=3&tf=4h', { tf: null })).toBe('?run=3')
    expect(chartSearch('', { tf: null })).toBe('')
  })
})

describe('WIB chart time', () => {
  const t = Date.parse('2026-11-12T01:00:00Z') / 1000 // 08:00 WIB
  it('shifts UTC seconds by 7 hours and prints WIB wall time', () => {
    expect(toChartTime(t) - t).toBe(7 * 3600)
    expect(chartTimeLabel(toChartTime(t))).toBe('12 Nov 08:00')
    expect(chartTimeLabel(toChartTime(Date.parse('2026-11-11T17:00:00Z') / 1000), true)).toBe('12 Nov 2026')
  })

  it('labels the price axis in exchange style', () => {
    expect(axisPrice(67420.5)).toBe('67,420.50')
    expect(axisPrice(2.34567)).toBe('2.3457')
    expect(axisPrice(0.00001234)).toBe('0.00001234')
  })

  it('formats axis ticks with Indonesian months', () => {
    const c = toChartTime(Date.parse('2026-05-01T17:30:00Z') / 1000) // 2 Mei 00:30 WIB
    expect(chartTickLabel(c, 0)).toBe('2026')
    expect(chartTickLabel(c, 1)).toBe('Mei')
    expect(chartTickLabel(c, 2)).toBe('2 Mei')
    expect(chartTickLabel(c, 3)).toBe('00:30')
    expect(chartTickLabel(c, 4)).toBe('00:30:00')
  })
})

describe('price change', () => {
  const step = TF_SECONDS['4h']
  const t0 = Date.parse('2026-11-10T00:00:00Z') / 1000
  const candles: Candle[] = Array.from({ length: 13 }, (_, i) => ({ time: t0 + i * step, open: 100 + i, high: 101 + i, low: 99 + i, close: 100 + i }))

  it('compares with the previous candle, also when a new candle just started', () => {
    expect(pctChange(100, 101)).toBeCloseTo(1)
    expect(pctChange(0, 1)).toBeNull()
    const last = candles[candles.length - 1]
    expect(previousClose(candles, last.time)).toBe(111)
    expect(previousClose(candles, last.time + step)).toBe(112) // websocket opened the next candle
    expect(previousClose(candles, t0)).toBeNull()
  })

  it('computes 24h change only when the loaded candles reach back far enough', () => {
    const current = candles[12] // opens 2026-11-12 00:00, closes 04:00
    // 24h before its close = 2026-11-11 04:00 -> the candle that closed then (index 6) closed at 106
    expect(change24h(candles, current, step)).toBeCloseTo(((112 - 106) / 106) * 100)
    expect(change24h(candles.slice(8), current, step)).toBeNull()
    expect(change24h(candles, null, step)).toBeNull()
  })
})
