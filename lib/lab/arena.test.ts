import { describe, expect, it } from 'vitest'
import {
  arenaAnswer,
  arenaHref,
  arenaLinks,
  baseSlots,
  checkValues,
  driftPlain,
  groupRows,
  groupSeries,
  lastActionLabel,
  normaliseCurve,
  parseHighlight,
  presetStatus,
  sortRows,
} from './arena'
import type { ArenaCurveSeries, ArenaReport, ArenaRow, DriftCheck, DriftStatus } from '@/lib/api/types/arena'

const row = (id: number, name: string, coin: string, family: string, ret: number | null): ArenaRow =>
  ({
    preset: { id, name, coin, family, base: `${coin}-x` },
    account: { id: id + 100 },
    watch: { id: id + 200 },
    stats: { return_pct: ret },
  }) as unknown as ArenaRow

const series = (id: number, coin: string, family: string, base: string, pts: [string, number][]): ArenaCurveSeries => ({
  preset_id: id, name: `p${id}`, coin, family, base, account_id: id, starting_balance: 10000,
  points: pts.map(([t, equity]) => ({ t, equity })),
})

describe('arena helpers', () => {
  it('groups by coin and by sizing family in a fixed family order', () => {
    const rows = [row(1, 'a', 'SOL', 'VT60', 0), row(2, 'b', 'ETH', '1x', 0), row(3, 'c', 'ETH', '2x', 0)]
    expect(groupRows(rows, 'all').map((g) => g.items.length)).toEqual([3])
    expect(groupRows(rows, 'coin').map((g) => g.key)).toEqual(['ETH', 'SOL'])
    expect(groupRows(rows, 'family').map((g) => g.key)).toEqual(['2x', '1x', 'VT60'])
    expect(groupRows(rows, 'family')[0].label).toBe('Ukuran 2× (bawaan)')
  })

  it('sorts by return, ties and nulls by name', () => {
    const r = sortRows([row(1, 'b', 'ETH', '2x', 0), row(2, 'a', 'ETH', '2x', 0), row(3, 'c', 'ETH', '2x', 5), row(4, 'd', 'ETH', '2x', null)])
    expect(r.map((x) => x.preset.name)).toEqual(['c', 'a', 'b', 'd'])
  })

  it('keeps colour slots stable per base and never cycles', () => {
    const slots = baseSlots(['SOL-Opt', 'ETH-v2', 'ETH-Basic', 'BTC-Opt', 'ETH-v2', 'XRP-New'])
    expect(slots).toEqual({ 'BTC-Opt': 0, 'ETH-Basic': 1, 'ETH-v2': 2, 'SOL-Opt': 3, 'XRP-New': null })
  })

  it('normalises equity to % of the starting balance, deduped and sorted', () => {
    const s = series(1, 'ETH', '2x', 'ETH-v2', [
      ['2026-11-11T10:00:00Z', 10000],
      ['2026-11-11T12:00:00Z', 9500],
      ['2026-11-11T11:00:00Z', 10200],
      ['2026-11-11T12:00:00Z', 9800],
    ])
    expect(normaliseCurve(s).map((p) => Number(p.value.toFixed(6)))).toEqual([0, 2, -2])
    expect(groupSeries([s], 'coin')[0].key).toBe('ETH')
  })

  it('formats drift checks per unit', () => {
    const c = (key: DriftCheck['key'], observed: number | null, expected: number | null, range: [number, number] | null) =>
      ({ key, label: '', status: 'belum_cukup', observed, expected, range, note: '' }) as DriftCheck
    expect(checkValues(c('frequency', 0, 0.04, [0, 1]))).toEqual({ observed: '0 entry', expected: '0.0 entry', range: '0–1' })
    expect(checkValues(c('win_rate', null, 37.25, null))).toEqual({ observed: '—', expected: '37.3%', range: '—' })
    expect(checkValues(c('trade_return', 1.2, -0.5, [-1, 2])).range).toBe('-1.00% s/d +2.00%')
    expect(checkValues(c('drawdown', -3.2, -31.1, [-37.6, 0])).range).toBe('batas -37.6%')
    expect(checkValues(c('avg_r', 0.5, null, null)).observed).toBe('+0.50R')
  })

  it('labels last action and builds links', () => {
    expect(lastActionLabel(null)).toBe('Belum ada transaksi')
    expect(lastActionLabel({ time: 't', kind: 'close', side: 'short', price: 1, reason: 'hard_sl', pnl: -1, source: 'paper_auto' })).toBe('Tutup Short · Kena batal jika (SL)')
    expect(arenaLinks(row(7, 'x', 'ETH', '2x', 0))).toEqual({
      preset: '/lab/presets#preset-7',
      journal: '/journal?account_id=107',
      watch: '/chart?watch=207',
    })
  })
})

// ── Paper berjalan: answer, preset status, highlight ──────────────────────────

const paperRow = (
  id: number,
  name: string,
  closed: number,
  status: DriftStatus,
  opts: { active?: boolean; auto?: boolean; checks?: DriftCheck[]; hasBacktest?: boolean } = {},
): ArenaRow =>
  ({
    preset: { id, name, coin: 'ETH', family: '2x', base: 'ETH-x' },
    account: { id: id + 100 },
    watch: { id: id + 200, active: opts.active ?? true, autopaper_enabled: opts.auto ?? true },
    stats: { return_pct: 0, n_closed: closed },
    drift: { status, has_backtest: opts.hasBacktest ?? true, checks: opts.checks ?? [], summary: 'x' },
  }) as unknown as ArenaRow

const report = (rows: ArenaRow[]): ArenaReport => ({ generated_at: 't', review_min_trades: 30, method: {} as ArenaReport['method'], rows })

describe('arenaAnswer', () => {
  it('says so when nothing runs', () => {
    expect(arenaAnswer(report([])).tone).toBe('info')
  })

  it('puts drifting presets first, by name', () => {
    const a = arenaAnswer(report([paperRow(1, '4H-ETH-Basic', 12, 'belum_cukup'), paperRow(2, '4H-SOL-Opt', 9, 'menyimpang')]))
    expect(a.tone).toBe('perlu_dicek')
    expect(a.text).toContain('1 dari 2 preset paper menyimpang')
    expect(a.text).toContain('4H-SOL-Opt')
    expect(a.drifting.map((r) => r.preset.id)).toEqual([2])
  })

  it('waits for 30 trades without any "siap live" wording', () => {
    const a = arenaAnswer(report([paperRow(1, 'a', 12, 'belum_cukup'), paperRow(2, 'b', 4, 'belum_cukup')]))
    expect(a.tone).toBe('menunggu')
    expect(a.text).toContain('terbanyak 12/30')
    expect(a.maxClosed).toBe(12)
    expect(a.closedTotal).toBe(16)
    for (const r of [a, arenaAnswer(report([paperRow(1, 'a', 31, 'sesuai')]))]) {
      expect(r.text.toLowerCase()).not.toContain('siap live')
      expect(r.text.toLowerCase()).not.toContain('siap')
    }
  })

  it('is good once presets reached 30 trades and none drift', () => {
    const a = arenaAnswer(report([paperRow(1, 'a', 31, 'sesuai'), paperRow(2, 'b', 5, 'belum_cukup')]))
    expect(a.tone).toBe('baik')
    expect(a.text).toContain('1 dari 2 preset sudah mencapai 30 transaksi dan 1 di antaranya sesuai hasil uji')
  })
})

describe('driftPlain', () => {
  const bad: DriftCheck = { key: 'win_rate', label: 'Win rate', status: 'menyimpang', observed: 20, expected: 50, range: [30, 70], note: '' }
  it('names failing checks in plain words, no statistics jargon', () => {
    const t = driftPlain(paperRow(1, 'a', 9, 'menyimpang', { checks: [bad] }))
    expect(t).toContain('persentase menang')
    expect(t).not.toMatch(/binomial|poisson|wilson|interval/i)
  })
  it('explains missing backtest and small samples', () => {
    expect(driftPlain(paperRow(1, 'a', 0, 'belum_cukup', { hasBacktest: false }))).toContain('tidak menyimpan hasil uji')
    expect(driftPlain(paperRow(1, 'a', 7, 'belum_cukup'))).toContain('7/30')
  })
})

describe('presetStatus', () => {
  const rows = [paperRow(1, 'a', 7, 'belum_cukup'), paperRow(2, 'b', 3, 'menyimpang'), paperRow(3, 'c', 2, 'belum_cukup', { auto: false })]
  it('uses the saved verdict when no paper runs', () => {
    expect(presetStatus({ id: 9, verdict: 'PASS' }, rows).kind).toBe('lolos')
    expect(presetStatus({ id: 9, verdict: 'FAIL' }, rows).kind).toBe('gagal')
    expect(presetStatus({ id: 9, verdict: null }, rows).kind).toBe('belum_diuji')
    expect(presetStatus({ id: 9, verdict: null }, undefined).progress).toBeNull()
  })
  it('shows paper progress toward 30, and drift wins over the verdict', () => {
    const s = presetStatus({ id: '1', verdict: 'FAIL' }, rows)
    expect(s.kind).toBe('paper')
    expect(s.verdict).toBe('gagal')
    expect(s.progress).toEqual({ n: 7, of: 30 })
    expect(presetStatus({ id: 2, verdict: 'PASS' }, rows).kind).toBe('menyimpang')
  })
  it('falls back to the verdict when auto-paper is off, and says paper stopped', () => {
    const s = presetStatus({ id: 3, verdict: 'PASS' }, rows)
    expect(s.kind).toBe('lolos')
    expect(s.paperStopped).toBe(true)
    expect(s.row?.preset.id).toBe(3)
  })
})

describe('highlight param', () => {
  it('accepts plain positive ids only', () => {
    expect(parseHighlight('12')).toBe(12)
    for (const v of [null, '', '0', '-1', '1e3', 'abc', '12;drop', '1234567890']) expect(parseHighlight(v)).toBeNull()
  })
  it('builds the link', () => {
    expect(arenaHref(5)).toBe('/lab/arena?highlight=5')
    expect(arenaHref(null)).toBe('/lab/arena')
  })
})
