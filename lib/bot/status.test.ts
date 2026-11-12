import { describe, expect, it } from 'vitest'
import type { BotStatus } from '@/lib/api/types/bot'
import type { LiveCheckReport, LiveCheckRow, LiveCheckStatus } from '@/lib/api/types/livecheck'
import { BOT_ANSWER_TONE, BOT_STATUS_KIND, alertStatusLabel, botVerdict, liveAccounts, type VerdictInput } from './status'

const NOW = Date.parse('2026-11-12T05:00:00Z')
const fmt = (iso: string) => `T(${iso.slice(5, 16)})`
const age = (iso: string) => `${Math.round((NOW - Date.parse(iso)) / 3_600_000)} jam lalu`

let id = 0
function row(status: LiveCheckStatus, close: string, extra: Partial<LiveCheckRow> = {}): LiveCheckRow {
  const expected = ['cocok', 'harga_beda', 'gagal', 'tidak_terkirim', 'menunggu', 'tanpa_log'].includes(status)
  return {
    id: ++id,
    bar_open_ts: new Date(Date.parse(close) - 4 * 3_600_000).toISOString(),
    bar_close_ts: close,
    status,
    perlu_dicek: false,
    causes: [],
    action: 'open',
    side: 'long',
    reason: null,
    price_diff_bps: null,
    expected: expected
      ? { action: 'open', side: 'long', alert: 'close', alert_at: null, price: 2000, exit_reason: null, variants: ['utama'], step: 1 }
      : null,
    delivery: null,
    computed_at: '2026-11-12T04:02:00Z',
    ...extra,
  }
}

function report(rows: LiveCheckRow[], cycle: LiveCheckReport['last_cycle'] = { finished: '2026-11-12T04:02:00Z' }): LiveCheckReport {
  const counts = { cocok: 0, harga_beda: 0, gagal: 0, tidak_terkirim: 0, tak_terduga: 0, menunggu: 0, tanpa_log: 0, diabaikan: 0 }
  for (const r of rows) counts[r.status]++
  return {
    preset: '4H-ETH-Basic',
    symbol: 'ETHUSDT',
    timeframe: '4h',
    since: '2026-10-01',
    price_bps: 30,
    window: { bars: 42, start: '2026-11-05T04:00:00Z', end: '2026-11-12T04:00:00Z' },
    summary: { counts, perlu_dicek: rows.filter((r) => r.perlu_dicek).length, rows: rows.length, expected: rows.filter((r) => r.expected).length, deliveries: 0 },
    rows,
    causes: {},
    last_cycle: cycle,
  }
}

const BOT_OK: BotStatus = {
  generated_at: '2026-11-12T05:00:00Z',
  window_days: 7,
  available: true,
  reason: null,
  active_accounts: 1,
  accounts: [
    { label: 'Rosyade', account_active: true, webhook_active: true, webhook_since: '2026-10-13T05:00:00Z', exchanges: ['binance'],
      last_alert: { at: '2026-11-12T04:00:05Z', symbol: 'ETHUSDT', action: 'close', side: 'short', status: 'success' },
      alerts_window: 3, failed_window: 0, rejected_window: 0 },
  ],
  last_alert: { at: '2026-11-12T04:00:05Z', symbol: 'ETHUSDT', action: 'close', side: 'short', status: 'success', label: 'Rosyade' },
}

const base = (o: Partial<VerdictInput>): VerdictInput => ({ now: NOW, fmt, age, ...o })

describe('botVerdict', () => {
  it('says yes when every judged signal matched, and mentions pending ones', () => {
    const v = botVerdict(base({
      live: report([row('cocok', '2026-11-10T04:00:00Z'), row('cocok', '2026-11-11T08:00:00Z'), row('menunggu', '2026-11-12T04:00:00Z')]),
      bot: BOT_OK,
    }))
    expect(v.tone).toBe('ok')
    expect(v.sentence).toBe('Ya, aman: 2 dari 2 sinyal strategi 7 hari terakhir cocok dengan eksekusi bot. 1 sinyal terbaru masih menunggu hasil.')
    expect(v.facts.map((f) => f.value)).toEqual(['2 dari 2 cocok', 'aktif (Rosyade)', 'T(11-12T04:00)'])
    expect(v.facts[2].hint).toBe('berhasil')
    expect(v.focus).toBe('semua')
  })

  it('is calm when the strategy gave no signal', () => {
    const v = botVerdict(base({ live: report([]), bot: BOT_OK }))
    expect(v.tone).toBe('ok')
    expect(v.sentence).toContain('belum memberi sinyal')
  })

  it('flags a missed or failed signal as not safe, with its time', () => {
    const v = botVerdict(base({
      live: report([row('cocok', '2026-11-10T04:00:00Z'), row('tidak_terkirim', '2026-11-11T04:00:00Z'), row('gagal', '2026-11-11T20:00:00Z')]),
      bot: BOT_OK,
    }))
    expect(v.tone).toBe('bad')
    expect(v.sentence).toBe(
      'Belum aman: 7 hari terakhir ada 1 sinyal tidak terkirim ke bot (T(11-11T04:00)) dan 1 sinyal gagal dieksekusi (T(11-11T20:00)).',
    )
    expect(v.focus).toBe('masalah')
  })

  it('counts several problems and names the latest', () => {
    const v = botVerdict(base({
      live: report([row('tidak_terkirim', '2026-11-08T04:00:00Z'), row('tidak_terkirim', '2026-11-11T04:00:00Z')]),
      bot: BOT_OK,
    }))
    expect(v.sentence).toContain('2 sinyal tidak terkirim ke bot, terakhir T(11-11T04:00)')
  })

  it('treats a miss that may be a Lab-vs-Pine difference as "perlu dicek", not "belum aman"', () => {
    const v = botVerdict(base({ live: report([row('tidak_terkirim', '2026-11-11T04:00:00Z', { perlu_dicek: true })]), bot: BOT_OK }))
    expect(v.tone).toBe('warn')
    expect(v.sentence).toMatch(/^Perlu dicek: 0 dari 1 sinyal 7 hari terakhir cocok, tapi 1 sinyal menurut Lab/)
  })

  it('reports price differences and unexpected deliveries', () => {
    const v = botVerdict(base({
      live: report([row('cocok', '2026-11-10T04:00:00Z'), row('harga_beda', '2026-11-11T04:00:00Z'), row('tak_terduga', '2026-11-11T12:00:00Z')]),
      bot: BOT_OK,
    }))
    expect(v.tone).toBe('warn')
    expect(v.sentence).toBe(
      'Perlu dicek: 1 dari 2 sinyal 7 hari terakhir cocok, tapi 1 dieksekusi dengan harga jauh dari harga sinyal (T(11-11T04:00)) dan 1 kiriman ke bot tanpa sinyal strategi (T(11-11T12:00)).',
    )
  })

  it('warns when no account can trade', () => {
    const off: BotStatus = { ...BOT_OK, active_accounts: 0, accounts: [{ ...BOT_OK.accounts[0], webhook_active: false, webhook_since: null }] }
    const v = botVerdict(base({ live: report([row('cocok', '2026-11-10T04:00:00Z')]), bot: off }))
    expect(v.tone).toBe('warn')
    expect(v.sentence).toContain('webhook bot sedang tidak aktif')
    expect(v.facts[1]).toEqual({ label: 'Webhook', value: 'tidak aktif', tone: 'bad' })
  })

  it('an account that is disabled does not count as live', () => {
    const disabled: BotStatus = { ...BOT_OK, accounts: [{ ...BOT_OK.accounts[0], account_active: false }] }
    expect(liveAccounts(disabled)).toEqual([])
  })

  it('warns when the active account has no exchange key', () => {
    const noKey: BotStatus = { ...BOT_OK, accounts: [{ ...BOT_OK.accounts[0], exchanges: [] }] }
    const v = botVerdict(base({ live: report([row('cocok', '2026-11-10T04:00:00Z')]), bot: noKey }))
    expect(v.tone).toBe('warn')
    expect(v.sentence).toContain('webhook aktif di akun Rosyade tapi API key exchange-nya belum ada')
  })

  it('does not claim "aman" when the webhook status could not be loaded', () => {
    const v = botVerdict(base({ live: report([row('cocok', '2026-11-10T04:00:00Z')]), bot: null, botError: true }))
    expect(v.tone).toBe('warn')
    expect(v.sentence).toContain('status webhook tidak bisa dimuat')
  })

  it('says the data is late when the check stopped running', () => {
    const v = botVerdict(base({ live: report([], { finished: '2026-11-11T19:00:00Z' }), bot: BOT_OK }))
    expect(v.tone).toBe('warn')
    expect(v.sentence).toBe('Perlu dicek: Cek bot live terakhir dihitung 10 jam lalu, padahal biasanya tiap 4 jam.')
  })

  it('waits when the check never ran, and reports a failed run', () => {
    expect(botVerdict(base({ live: report([], null), bot: BOT_OK })).tone).toBe('wait')
    const failed = botVerdict(base({ live: report([], { finished: '2026-11-12T04:02:00Z', error: 'boom' }), bot: BOT_OK }))
    expect(failed.tone).toBe('warn')
    expect(failed.sentence).toContain('gagal')
  })

  it('handles loading and total failure without inventing anything', () => {
    expect(botVerdict(base({})).tone).toBe('wait')
    const v = botVerdict(base({ liveError: true, botError: true }))
    expect(v.tone).toBe('warn')
    expect(v.sentence).toBe('Status bot belum bisa dimuat. Coba muat ulang halaman ini.')
  })

  it('never puts a passphrase-like field in the output', () => {
    const v = botVerdict(base({ live: report([]), bot: BOT_OK }))
    expect(JSON.stringify(v)).not.toMatch(/passphrase/i)
  })
})

describe('defaults for other pages (Beranda)', () => {
  it('formats times in WIB when no formatter is given, and skips the late check without a clock', () => {
    const v = botVerdict({
      live: report([row('tidak_terkirim', '2026-11-11T21:00:00Z')], { finished: '2026-11-01T00:00:00Z' }),
      bot: BOT_OK,
    })
    expect(v.tone).toBe('bad')
    expect(v.sentence).toContain('(12 Nov 04:00 WIB)')
    expect(v.facts[2]).toEqual({ label: 'Alert terakhir', value: '12 Nov 11:00 WIB', hint: 'berhasil', tone: 'ok' })
  })

  it('maps tones onto AnswerCard and StatusPill', () => {
    expect(BOT_ANSWER_TONE).toEqual({ ok: 'baik', warn: 'perlu_dicek', bad: 'buruk', wait: 'menunggu' })
    expect(BOT_STATUS_KIND.bad).toBe('bermasalah')
  })
})

describe('alertStatusLabel', () => {
  it('translates bot statuses', () => {
    expect(alertStatusLabel('success')).toBe('berhasil')
    expect(alertStatusLabel('rejected')).toBe('ditolak')
    expect(alertStatusLabel(null)).toBe('status tidak diketahui')
  })
})
