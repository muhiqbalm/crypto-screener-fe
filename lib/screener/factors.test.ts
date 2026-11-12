import { describe, expect, it } from 'vitest'
import { FACTORS, findAsset, lsrText, momentumText, scoreFraction, scorePosition, SIGNAL_TEXT, TIER_TEXT } from './factors'
import { GLOSSARY } from '@/lib/glossary'
import type { AssetDetail } from '@/lib/api/types/screener'

const a = (symbol: string, composite_score: number | null) => ({ symbol, composite_score } as unknown as AssetDetail)
const ALL = [a('BTCUSDT', 0.02), a('ETHUSDT', -0.01), a('SOLUSDT', 0.05), a('XRPUSDT', null)]

describe('screener factor labels', () => {
  it('shows the score as a position among the coins that have one', () => {
    expect(scorePosition(ALL[2], ALL)).toEqual({ pos: 1, n: 3 })
    expect(scorePosition(ALL[1], ALL)).toEqual({ pos: 3, n: 3 })
    expect(scorePosition(ALL[3], ALL)).toBeNull()
    expect(scoreFraction({ pos: 1, n: 3 })).toBe(1)
    expect(scoreFraction({ pos: 3, n: 3 })).toBe(0)
    expect(scoreFraction(null)).toBeNull()
  })
  it('uses plain words for signals, tiers, momentum and the long/short ratio', () => {
    expect(SIGNAL_TEXT.BULLISH).toBe('naik')
    expect(TIER_TEXT.A).toBe('Kelompok atas')
    expect(momentumText('SELL')).toBe('turun')
    expect(momentumText(null)).toBe('tidak tersedia')
    expect(lsrText(1.8)).toBe('long ramai')
    expect(lsrText(0.5)).toBe('short ramai')
    expect(lsrText(1.1)).toBe('seimbang')
    expect(lsrText(null)).toBe('tidak tersedia')
  })
  it('names the two Binance long/short numbers apart (audit 2026-11-13 S2)', () => {
    // screener = top-trader ACCOUNT ratio, Arus besar = top-trader POSITION ratio
    expect(FACTORS.find((f) => f.key === 'lsr')?.label).toBe(GLOSSARY.long_short_ratio.label)
    expect(GLOSSARY.long_short_ratio.short).toBe('L/S akun top-trader')
    expect(GLOSSARY.top_trader_position_ratio.short).toBe('L/S posisi top-trader')
    expect(GLOSSARY.long_short_ratio.tip).toContain('seluruh pasar')
    expect(GLOSSARY.top_trader_position_ratio.tip).toContain('seluruh pasar')
  })
  it('finds a coin from a route param in any spelling', () => {
    expect(findAsset(ALL, 'eth')?.symbol).toBe('ETHUSDT')
    expect(findAsset(ALL, 'ETH/USDT:USDT')?.symbol).toBe('ETHUSDT')
    expect(findAsset(ALL, 'DOGE')).toBeNull()
    expect(findAsset(undefined, 'ETH')).toBeNull()
  })
})
