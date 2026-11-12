import { describe, expect, it } from 'vitest'
import type { OutlookResponse } from '@/lib/api/types/outlook'
import type { ArenaReport } from '@/lib/api/types/arena'
import type { ReportWeek, WeeklyReport } from '@/lib/api/types/report'
import type { ScreenerResponse } from '@/lib/api/types/screener'
import {
  assistantSummary,
  attentionItems,
  lastSnapshotWeek,
  paperSummary,
  pickWatchCoins,
  planLine,
  reportLines,
  topScreenerCoins,
  unreadNotifications,
} from './logic'

const NOW = Date.parse('2026-11-12T05:00:00Z')

function row(coin: string, bias: 'LONG' | 'SHORT' | 'NETRAL', o: Record<string, unknown> = {}) {
  return {
    symbol: `${coin}USDT`,
    coin,
    last_bar_close: '2026-11-12T04:00:00Z',
    strategy: { fresh: false, entry_time: '2026-11-11T12:00:00Z', sl: 100, tp: 130, ...(o.strategy as object) },
    bias: { bias, keyakinan: (o.keyakinan as string) ?? 'sedang' },
    projection: { rr: 1.5 },
    explanation: { summary: `${coin} alasan.` },
    ...o,
  }
}

const v1 = (rows: unknown[]) => ({ meta: { last_bar: '2026-11-12T04:00:00Z', computed_at: '2026-11-12T04:03:00Z' }, rows }) as unknown as OutlookResponse

describe('pickWatchCoins', () => {
  it('v1: only LONG/SHORT, posisi baru first, then keyakinan, max 5', () => {
    const data = v1([
      row('AAA', 'LONG', { keyakinan: 'rendah' }),
      row('BBB', 'SHORT', { keyakinan: 'tinggi' }),
      row('CCC', 'LONG', { keyakinan: 'rendah', strategy: { fresh: true } }),
      row('DDD', 'NETRAL'),
      row('EEE', 'LONG'),
      row('FFF', 'SHORT'),
      row('GGG', 'LONG'),
      row('HHH', 'LONG', { keyakinan: 'rendah' }),
    ])
    const w = pickWatchCoins(data, { now: NOW })
    expect(w.coins.map((c) => c.coin)).toEqual(['CCC', 'BBB', 'EEE', 'FFF', 'GGG'])
    expect(w.moreWithDirection).toBe(2)
    expect(w.netral).toBe(1)
    expect(w.ranked).toBe(false)
    expect(w.coins[0].fresh).toBe(true)
    expect(w.coins[0].href).toBe('/koin/CCC')
    expect(w.coins[1].since).toBe('11 Nov 19:00 WIB')
    expect(w.coins[1].reason).toBe('BBB alasan.')
  })

  it('v2: follows the backend ranking and reads plan + peluang', () => {
    const data = {
      ...v1([
        row('AAA', 'LONG', { plan: { sl: 90, tp: 150, rr: 2.4, fase: 'berjalan' }, peluang: { label: 'belum_jelas' } }),
        row('BBB', 'SHORT', { plan: { sl: 110, tp: 80, rr: 1.8, fase: 'baru' }, peluang: { label: 'positif' } }),
      ]),
      ranking: ['BBBUSDT', 'AAAUSDT'],
    } as unknown as OutlookResponse
    const w = pickWatchCoins(data, { now: NOW })
    expect(w.ranked).toBe(true)
    expect(w.coins.map((c) => c.coin)).toEqual(['BBB', 'AAA'])
    expect(w.coins[0]).toMatchObject({ fresh: true, peluang: 'Terbukti positif', peluangPositive: true, sl: 110, tp: 80, rr: 1.8 })
    expect(w.coins[1].peluang).toBe('Belum jelas')
  })

  it('skips rows with errors and handles no data', () => {
    expect(pickWatchCoins(v1([row('AAA', 'LONG', { error: 'x' })])).coins).toEqual([])
    expect(pickWatchCoins(undefined).coins).toEqual([])
  })

  it('planLine shows only what exists, exchange style', () => {
    expect(planLine(2274, 1860, 1.83)).toBe('Batal jika $2,274.00 · Target $1,860.00 · R:R 1.8 : 1')
    expect(planLine(null, null, null)).toBeNull()
  })
})

describe('screener fallback', () => {
  it('takes the top 3 screener coins', () => {
    const data = {
      summary: {
        top_3_assets: [
          { symbol: 'ETH/USDT:USDT', rank: 1, composite_score: 1.2, signal: 'BULLISH', confidence_pct: null, confidence_tier: 'HIGH' },
          { symbol: 'SOL/USDT:USDT', rank: 2, composite_score: 0.9, signal: 'BEARISH', confidence_pct: null, confidence_tier: null },
        ],
      },
    } as unknown as ScreenerResponse
    expect(topScreenerCoins(data).map((c) => [c.coin, c.href])).toEqual([
      ['ETH', '/koin/ETH'],
      ['SOL', '/koin/SOL'],
    ])
  })
})

describe('attentionItems', () => {
  it('orders kritis → penting → info and keeps max 3', () => {
    const items = attentionItems(
      {
        bot: { tone: 'bad', sentence: 'Belum aman: 7 hari terakhir ada 1 sinyal tidak terkirim ke bot (12 Nov 03:00 WIB).' },
        arena: { rows: [{ preset: { label: '4H-SOL-v1', name: 'x' }, drift: { status: 'menyimpang' } }] } as unknown as ArenaReport,
        outlook: v1([row('AAA', 'SHORT', { strategy: { fresh: true } }), row('BBB', 'LONG', { strategy: { fresh: true } })]),
      },
      { now: NOW },
    )
    expect(items.map((i) => i.level)).toEqual(['kritis', 'penting', 'info'])
    expect(items[0].text).toBe('7 hari terakhir ada 1 sinyal tidak terkirim ke bot (12 Nov 03:00 WIB).')
    expect(items[0].href).toBe('/bot')
    expect(items[1].text).toContain('4H-SOL-v1')
    expect(items[2].text).toBe('AAA: strategi baru masuk SHORT (keyakinan sedang).')
  })

  it('bot row carries the facts that are not OK, hint included', () => {
    const [it0] = attentionItems({
      bot: {
        tone: 'bad',
        sentence: 'Belum aman: 1 sinyal gagal dieksekusi.',
        facts: [
          { label: 'Sinyal 7 hari', value: '3 dari 4 sesuai', tone: 'bad' },
          { label: 'Webhook', value: 'aktif (Rosyade)', tone: 'ok' },
          { label: 'Alert terakhir', value: '12 Nov 11:00 WIB', hint: 'gagal', tone: 'bad' },
        ],
      },
    })
    expect(it0.detail).toBe('Sinyal 7 hari: 3 dari 4 sesuai · Alert terakhir: 12 Nov 11:00 WIB (gagal)')
  })

  it('uses the same bot answer as /bot: warn → penting, ok/wait → nothing', () => {
    expect(attentionItems({ bot: { tone: 'warn', sentence: 'Perlu dicek: webhook bot sedang tidak aktif.' } })[0]).toMatchObject({
      level: 'penting',
      text: 'Webhook bot sedang tidak aktif.',
    })
    expect(attentionItems({ bot: { tone: 'ok', sentence: 'Ya, aman: 3 dari 3.' } })).toEqual([])
    expect(attentionItems({ bot: { tone: 'wait', sentence: 'Memuat status bot…' } })).toEqual([])
    expect(attentionItems({})).toEqual([])
  })
})

describe('paper & report', () => {
  it('summarises the arena against the review target', () => {
    const a = {
      review_min_trades: 30,
      rows: [
        { preset: { label: 'A', name: 'a' }, stats: { n_closed: 31 }, drift: { status: 'sesuai' } },
        { preset: { label: 'B', name: 'b' }, stats: { n_closed: 7 }, drift: { status: 'menyimpang' } },
      ],
    } as unknown as ArenaReport
    expect(paperSummary(a)).toEqual({ presets: 2, ready: 1, drifting: 1, target: 30, leader: { name: 'A', closed: 31 } })
    expect(paperSummary(undefined)).toBeNull()
  })

  it('uses the last frozen week, never the running one', () => {
    const w = (week: string, start: string, current: boolean, snapshot: boolean) => ({ week, start, end: start, current, snapshot, generated_at: null }) as ReportWeek
    expect(lastSnapshotWeek([w('W0', '2026-11-09', true, false), w('W1', '2026-11-02', false, true), w('W2', '2026-10-26', false, true)])?.week).toBe('W1')
    expect(lastSnapshotWeek([w('W0', '2026-11-09', true, false)])).toBeNull()
  })

  it('report lines only from available sections', () => {
    const r = {
      sections: {
        paper: { available: true, best: { preset: '4H-ETH-v2', week_return_pct: 2.14 } },
        live_bot: { available: true, signals: 6, orders: 6, executed: 6 },
        ledger: { available: false, signals_week: 9 },
      },
    } as unknown as WeeklyReport
    expect(reportLines(r)).toEqual(['Paper terbaik: 4H-ETH-v2 +2.1%', 'Bot live: 6 dari 6 order tereksekusi (6 alert)'])
    expect(reportLines(undefined)).toEqual([])
  })

  it('unread notifications, max 3', () => {
    const n = (id: number, read: boolean) => ({ id, read, type: 'job', title: `n${id}`, body: null, link: null, created_at: '' })
    expect(unreadNotifications([n(1, false), n(2, true), n(3, false), n(4, false), n(5, false)]).map((x) => x.id)).toEqual([1, 3, 4])
  })
})

describe('assistantSummary', () => {
  it('builds sentences only from data that exists', () => {
    const watch = pickWatchCoins(v1([row('AAA', 'SHORT', { strategy: { fresh: true } })]), { now: NOW })
    const items = assistantSummary({
      market: 'Pasar: BTC datar.',
      watch,
      bot: { sentence: 'Ya, aman: 3 dari 3 sinyal strategi 7 hari terakhir dieksekusi bot sesuai rencana.' },
      paper: { presets: 3, ready: 0, drifting: 1, target: 30, leader: null },
    })
    expect(items.map((i) => i.text)).toEqual([
      'Pasar: BTC datar.',
      'Koin teratas: AAA SHORT, keyakinan sedang, posisi baru.',
      'Ya, aman: 3 dari 3 sinyal strategi 7 hari terakhir dieksekusi bot sesuai rencana.',
      'Paper: 3 preset berjalan, 0 siap dinilai, 1 menyimpang.',
    ])
    expect(assistantSummary({})).toEqual([])
  })
})
