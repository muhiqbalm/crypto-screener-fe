import { describe, expect, it } from 'vitest'
import {
  OUTCOME_COPY,
  basketAnswer,
  basketHref,
  fidelityText,
  gateItems,
  mergeKlasemen,
  parseBasketParam,
  prePaperHint,
  sizingText,
  skipReasonLabel,
  sortCoins,
} from './basket'
import type { ArenaRow } from '@/lib/api/types/arena'
import type { BasketCoin, BasketFidelity, BasketRow } from '@/lib/api/types/basket'

const fid = (o: Partial<BasketFidelity> = {}): BasketFidelity => ({
  expected: 0, matched: 0, coverage: null, closed_pairs: 0, median_abs_diff_pp: null, engine_closed: 0, engine_pf: null,
  engine_pf_infinite: false, extra_paper: 0, coverage_ok: false, diff_ok: false, ...o,
})

const basket = (o: { id?: number; n?: number; ret?: number | null; waiting?: number; status?: BasketRow['evaluation']['status']; next?: BasketRow['evaluation']['next']; kill?: BasketRow['evaluation']['kill']; checkpoints?: BasketRow['evaluation']['checkpoints'] } = {}): BasketRow =>
  ({
    basket: { id: o.id ?? 1, name: `4H-BASKET-B${o.id ?? 1}`, n_coins: 29, sizing: { mode: 'risk', risk_pct: 0.25 } },
    stats: { return_pct: o.ret ?? null },
    progress: { n: o.n ?? 0, of: 30 },
    gate: { trades: o.n ?? 0, need_trades: 30, coins: 7, need_coins: 8, entry_days: 4, need_entry_days: 10, days: 6.7, need_days: 28 },
    waiting: { n: o.waiting ?? 0, coins: [] },
    evaluation: { status: o.status ?? 'BELUM', deadline: '2027-02-05T00:00:00Z', kill: o.kill ?? null, checkpoints: o.checkpoints ?? [], next: o.next ?? null },
  }) as unknown as BasketRow

const coin = (c: string, status: BasketCoin['status'], trades = 0): BasketCoin => ({ coin: c, status, trades }) as unknown as BasketCoin

describe('basket helpers', () => {
  it('parses ?basket= and builds the link', () => {
    expect(parseBasketParam('7')).toBe(7)
    expect([parseBasketParam(null), parseBasketParam('0'), parseBasketParam('x'), parseBasketParam('1e3')]).toEqual([null, null, null, null])
    expect(basketHref(3)).toBe('/lab/arena?basket=3')
  })

  it('writes the pre-paper hint only for an unmirrored position from before paper, at the fill time in WIB', () => {
    const sp = { side: 'short', entry_time: '2026-11-08T20:00:00Z', opened_before_paper: true, mirrored: false }
    const t = prePaperHint(sp, '4h')!
    expect(t).toContain('posisi SHORT sejak 9 Nov')
    expect(t).toContain('07:00 WIB')
    expect(t).toContain('(sebelum paper dimulai), paper menunggu sinyal berikutnya.')
    expect(prePaperHint({ ...sp, mirrored: true }, '4h')).toBeNull()
    expect(prePaperHint({ ...sp, opened_before_paper: false }, '4h')).toBeNull()
    expect(prePaperHint({ ...sp, entry_time: null }, '4h')).toBeNull()
    expect(prePaperHint(null, '4h')).toBeNull()
  })

  it('lists the four checkpoint conditions', () => {
    const items = gateItems({ trades: 31, need_trades: 30, coins: 12, need_coins: 8, entry_days: 9, need_entry_days: 10, days: 27.9, need_days: 28 })
    expect(items.map((i) => [i.key, i.have, i.need, i.done])).toEqual([
      ['trades', 31, 30, true],
      ['days', 27, 28, false],
      ['coins', 12, 8, true],
      ['entry_days', 9, 10, false],
    ])
  })

  it('describes the sizing rule', () => {
    expect(sizingText({ mode: 'risk', risk_pct: 0.25 } as never)).toBe('Risiko 0.25% saldo per transaksi')
    expect(sizingText({ mode: 'slot_engine', slots: 28 } as never, 'RosyadeVT60')).toBe('Modal dibagi 28 koin, ukuran ikut gejolak (VT60)')
    expect(sizingText({ mode: 'slot_engine', slots: 3 } as never, 'X')).toBe('Modal dibagi 3 koin, ukuran dari engine')
  })

  it('sorts coins: problems, open positions, most trades, name', () => {
    const out = sortCoins([coin('ZEC', 'menunggu_sinyal', 2), coin('ADA', 'posisi_terbuka', 0), coin('BTC', 'menunggu_sinyal', 5), coin('SOL', 'error'), coin('ETH', 'menunggu_sinyal_baru')])
    expect(out.map((c) => c.coin)).toEqual(['SOL', 'ADA', 'BTC', 'ZEC', 'ETH'])
  })

  it('answers from the pre-registered outcome', () => {
    expect(basketAnswer(basket({ waiting: 5 })).text).toBe(
      'Belum ada transaksi tertutup. 5 koin masih memegang posisi dari sebelum paper dimulai; paper menunggu sinyal baru.',
    )
    expect(basketAnswer(basket()).text).toBe('Belum ada transaksi tertutup; paper menunggu sinyal baru di 29 koin.')
    const due = basketAnswer(basket({ n: 31, next: { checkpoint: 1, due: '2026-12-14T00:00:00Z', earliest: '2026-12-14T00:00:00Z' } }))
    expect(due.text).toContain('31/30 transaksi dari 7 koin. Checkpoint 1 dijadwalkan 14 Des')
    const cp = { checkpoint: 1, at: '2026-12-14T00:00:00Z', trades: 34, pf: 1.43, pf_infinite: false, invalid_reasons: [] } as never
    expect(basketAnswer(basket({ status: 'LULUS', checkpoints: [cp] }))).toEqual({
      tone: 'bullish',
      text: 'Checkpoint 1: lulus (PF 1.43, 34 transaksi). Paper diteruskan; ini bukan izin live.',
    })
    expect(basketAnswer(basket({ status: 'GAGAL', kill: { at: '2026-12-01T00:00:00Z', dd_pct: -15.4 } })).text).toContain('turun −15.4% dari puncak')
    const bad = { ...(cp as object), invalid_reasons: ['cakupan'] } as never
    expect(basketAnswer(basket({ status: 'TIDAK_SAH', checkpoints: [bad] })).text).toContain('kurang dari 90% sinyal engine diikuti paper')
    expect(OUTCOME_COPY.LULUS.hint).toContain('bukan izin live')
  })

  it('explains fidelity and skips in words', () => {
    expect(fidelityText(fid())).toBe('Belum ada sinyal engine sejak paper dimulai.')
    expect(fidelityText(fid({ expected: 12, matched: 11, median_abs_diff_pp: 0.041 }))).toBe('11/12 sinyal engine diikuti paper, selisih hasil median 0.04 poin %.')
    expect(skipReasonLabel('cap_total')).toBe('batas notional total')
    expect(skipReasonLabel('paper_error: long SL 1.8 must be below the fill 1.7')).toBe('paper menolak posisi (harga sudah lewat stop)')
  })

  it('ranks presets and baskets together, a basket as one entry', () => {
    const p = (id: number, name: string, ret: number | null) => ({ preset: { id, name }, stats: { return_pct: ret } }) as unknown as ArenaRow
    const out = mergeKlasemen([p(1, '4H-ETH-Basic', 1.2), p(2, '4H-SOL-Opt', null)], [basket({ id: 9, ret: 3.4 }), basket({ id: 8, ret: null })])
    expect(out.map((e) => e.key)).toEqual(['b9', 'p1', 'b8', 'p2'])
  })
})
