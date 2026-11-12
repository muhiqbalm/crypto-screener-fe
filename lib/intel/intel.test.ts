import { describe, expect, it } from 'vitest'
import type { IntelNewsResponse, IntelWhalesResponse, NewsItem } from '@/lib/api/types/intel'
import { coinTag, filterNews, headlineTone, newsAnswer, toneCounts } from './news'
import { coinPath, flowSide, leanOf, liveRatios, whaleAnswer, windowPhrase } from './whales'

const ratio = (symbol: string, longPct: number) => ({ symbol, longPct, shortPct: 100 - longPct, lsRatio: null, updated: 'live' })

describe('whales', () => {
  it('uses one band for every lean (same as the backend stance)', () => {
    expect(leanOf(55)).toBe('seimbang')
    expect(leanOf(55.1)).toBe('long')
    expect(leanOf(45)).toBe('seimbang')
    expect(leanOf(44.9)).toBe('short')
    expect(leanOf(null)).toBeNull()
  })

  it('drops placeholder ratios', () => {
    expect(liveRatios([ratio('BTC', 60), { ...ratio('ETH', 50), updated: 'Cached' }])).toHaveLength(1)
  })

  it('answers with the lean, the coins and the large-trade flow', () => {
    const intel: IntelWhalesResponse = {
      topTraderRatios: [ratio('BTCUSDT', 56), ratio('ETHUSDT', 58), ratio('SOLUSDT', 54), ratio('DOGEUSDT', 56)],
      largeTradeBuyUsd: 2_100_000,
      largeTradeSellUsd: 3_200_000,
      largeTradeWindowSeconds: 740,
    }
    const a = whaleAnswer(intel)
    expect(a.lean).toBe('long')
    expect(a.sentence).toBe(
      'Trader besar condong long: rata-rata 56% posisi long di BTC, ETH, SOL dan DOGE. Transaksi besar ±12 menit terakhir lebih banyak jual (beli $2.1M, jual $3.2M).',
    )
  })

  it('states short leans as the short share and says when data is missing', () => {
    expect(whaleAnswer({ topTraderRatios: [ratio('BTC', 40)] }).sentence).toBe('Trader besar condong short: rata-rata 60% posisi short di BTC.')
    expect(whaleAnswer(null).sentence).toBe('Data posisi trader besar tidak tersedia saat ini.')
  })

  it('formats windows, flows and dollars', () => {
    expect(windowPhrase(45)).toBe('±45 detik')
    expect(windowPhrase(740)).toBe('±12 menit')
    expect(windowPhrase(null)).toBeNull()
    expect(flowSide(105, 100)).toBe('seimbang')
    expect(flowSide(200, 100)).toBe('beli')
    expect(flowSide(null, 100)).toBeNull()
    expect(coinPath('BTCUSDT')).toBe('/koin/BTC')
    expect(coinPath('doge')).toBe('/koin/DOGE')
  })
})

const item = (id: string, sentiment: NewsItem['sentiment'], title = id, syms = ['BTC']): NewsItem => ({
  id, title, summary: `${title} summary`, source: 'CoinTelegraph', sourceType: 'tier1', timestamp: null,
  publishedAt: '2026-11-12T03:00:00Z', category: 'Macro', sentiment, impactScore: 70, affectedSymbols: syms, readTime: null, linkUrl: null,
})

describe('news', () => {
  const items = [item('a', 'BULLISH', 'ETF approved'), item('b', 'BEARISH', 'Exchange hacked', ['ETH']), item('c', 'NEUTRAL'), item('d', 'BEARISH')]

  it('maps keyword sentiment to plain tones and filters by tone and search', () => {
    expect(headlineTone('BULLISH')).toBe('positif')
    expect(toneCounts(items)).toEqual({ positif: 1, negatif: 2, netral: 1 })
    expect(filterNews(items, 'negatif', '').map((n) => n.id)).toEqual(['b', 'd'])
    expect(filterNews(items, 'semua', 'eth').map((n) => n.id)).toEqual(['b'])
    expect(coinTag('CRYPTO')).toBe('Umum')
  })

  it('answers with the mood and the headline balance, honest about missing data', () => {
    const intel: IntelNewsResponse = { fearAndGreed: { value: 38, classification: 'Fear' }, news: items }
    expect(newsAnswer(intel)).toBe(
      'Pasar sedang takut (38 dari 100). Dari 4 judul berita terbaru, 1 positif, 2 negatif dan 1 netral (lebih banyak negatif, ditebak dari kata kunci di judul).',
    )
    expect(newsAnswer({ fearAndGreed: null, news: [] })).toBe('Indeks takut–serakah tidak tersedia saat ini. Judul berita tidak tersedia saat ini.')
  })
})
