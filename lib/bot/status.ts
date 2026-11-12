/**
 * "Bot live aman?" — the one-sentence answer at the top of /bot (pure, no React).
 * Shared (feat/ux-shared-bot) so Beranda and /bot always say the same thing.
 *
 * Inputs: the 7-day "Cek bot live" report (useLiveCheck(VERDICT_BARS) = GET
 * /lab/live-check?bars=42) and the webhook summary (useBotStatus() = GET /lab/bot/status).
 * Output: a tone, one sentence, 2–3 facts and the row filter "Lihat bukti" should open with.
 * Times default to WIB (lib/utils/time); tests may inject their own formatters.
 */
import type { BotAccount, BotStatus } from '@/lib/api/types/bot'
import type { LiveCheckReport, LiveCheckRow, LiveCheckStatus } from '@/lib/api/types/livecheck'
import { formatAge, formatTime } from '@/lib/utils/time'

export type BotTone = 'ok' | 'warn' | 'bad' | 'wait'

/** BotTone -> AnswerCard `tone` (components/ui/answer-card). */
export const BOT_ANSWER_TONE: Record<BotTone, 'baik' | 'perlu_dicek' | 'buruk' | 'menunggu'> = {
  ok: 'baik',
  warn: 'perlu_dicek',
  bad: 'buruk',
  wait: 'menunggu',
}

/** BotTone -> StatusPill `kind` (components/ui/status-pill). */
export const BOT_STATUS_KIND: Record<BotTone, 'sehat' | 'perlu_dicek' | 'bermasalah' | 'menunggu'> = {
  ok: 'sehat',
  warn: 'perlu_dicek',
  bad: 'bermasalah',
  wait: 'menunggu',
}

/** 7 days of 4H bars: the window of the answer. */
export const VERDICT_BARS = 42
/** The check runs after every 4H close (+ hourly catch-up); older than this = late. */
export const LIVECHECK_STALE_MS = 6 * 3600 * 1000

export interface BotFact {
  label: string
  value: string
  tone?: BotTone
}

export interface BotVerdict {
  tone: BotTone
  /** One sentence that answers "Bot live aman?". */
  sentence: string
  facts: BotFact[]
  /** Row filter for "Lihat bukti". */
  focus: 'masalah' | 'semua'
}

export interface VerdictInput {
  /** useLiveCheck(VERDICT_BARS).data */
  live?: LiveCheckReport | null
  liveError?: boolean
  /** useBotStatus().data */
  bot?: BotStatus | null
  botError?: boolean
  /** Epoch ms (e.g. useNow()). null = unknown yet: the "data late" check is skipped. */
  now?: number | null
  /** ISO -> display time. Default formatTime: "11 Nov 04:00 WIB". */
  fmt?: (iso: string) => string
  /** ISO -> age. Default formatAge: "9 jam lalu". */
  age?: (iso: string) => string
}

export const ALERT_STATUS_LABEL: Record<string, string> = {
  success: 'berhasil',
  failed: 'gagal',
  rejected: 'ditolak',
}

export function alertStatusLabel(s: string | null | undefined): string {
  if (!s) return 'status tidak diketahui'
  return ALERT_STATUS_LABEL[s] ?? s
}

export function alertStatusTone(s: string | null | undefined): BotTone {
  return s === 'success' ? 'ok' : s === 'failed' ? 'bad' : s === 'rejected' ? 'warn' : 'wait'
}

/** Accounts whose webhook can actually trade: webhook on and the user account active. */
export function liveAccounts(bot: BotStatus | null | undefined): BotAccount[] {
  return (bot?.accounts ?? []).filter((a) => a.webhook_active && a.account_active)
}

function joinId(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? ''
  return `${parts.slice(0, -1).join(', ')} dan ${parts[parts.length - 1]}`
}

/** "1 sinyal tidak terkirim (Sel 11 Nov 04:00 WIB)" / "2 sinyal tidak terkirim, terakhir …". */
function countPhrase(rows: LiveCheckRow[], noun: string, fmt: (iso: string) => string): string | null {
  if (rows.length === 0) return null
  const latest = rows.reduce((a, b) => (Date.parse(b.bar_close_ts) > Date.parse(a.bar_close_ts) ? b : a))
  const when = fmt(latest.bar_close_ts)
  return rows.length === 1 ? `1 ${noun} (${when})` : `${rows.length} ${noun}, terakhir ${when}`
}

interface WebhookRead {
  fact: BotFact
  /** true = no account can trade, false = at least one can, null = unknown / loading. */
  off: boolean | null
  unknown: boolean
  noKey: string[]
}

function readWebhook(bot: BotStatus | null | undefined, botError: boolean | undefined): WebhookRead {
  if (!bot) {
    return botError
      ? { fact: { label: 'Webhook', value: 'tidak bisa dimuat', tone: 'warn' }, off: null, unknown: true, noKey: [] }
      : { fact: { label: 'Webhook', value: 'memuat…', tone: 'wait' }, off: null, unknown: false, noKey: [] }
  }
  if (!bot.available) {
    const why = bot.reason ? ` (${bot.reason})` : ''
    return { fact: { label: 'Webhook', value: `tidak tersedia${why}`, tone: 'warn' }, off: null, unknown: true, noKey: [] }
  }
  const live = liveAccounts(bot)
  if (live.length === 0) {
    return { fact: { label: 'Webhook', value: 'tidak aktif', tone: 'bad' }, off: true, unknown: false, noKey: [] }
  }
  const noKey = live.filter((a) => a.exchanges.length === 0).map((a) => a.label)
  return {
    fact: { label: 'Webhook', value: `aktif (${live.map((a) => a.label).join(', ')})`, tone: noKey.length ? 'warn' : 'ok' },
    off: false,
    unknown: false,
    noKey,
  }
}

function lastAlertFact(bot: BotStatus | null | undefined, fmt: (iso: string) => string): BotFact | null {
  if (!bot?.available) return null
  const a = bot.last_alert
  if (!a) return { label: 'Alert terakhir', value: 'belum ada yang diproses bot', tone: 'wait' }
  return { label: 'Alert terakhir', value: `${fmt(a.at)} · ${alertStatusLabel(a.status)}`, tone: alertStatusTone(a.status) }
}

export function botVerdict(input: VerdictInput): BotVerdict {
  const now = input.now ?? null
  const i = {
    ...input,
    fmt: input.fmt ?? ((iso: string) => formatTime(iso, now === null ? {} : { now })),
    age: input.age ?? ((iso: string) => formatAge(iso, now === null ? {} : { now })),
  }
  const live = i.live ?? null
  const wh = readWebhook(i.bot, i.botError)
  const alertFact = lastAlertFact(i.bot, i.fmt)

  if (!live && !i.bot) {
    return i.liveError || i.botError
      ? { tone: 'warn', sentence: 'Status bot belum bisa dimuat. Coba muat ulang halaman ini.', facts: [wh.fact], focus: 'semua' }
      : { tone: 'wait', sentence: 'Memuat status bot…', facts: [], focus: 'semua' }
  }

  const rows = live?.rows ?? []
  const by = (s: LiveCheckStatus) => rows.filter((r) => r.status === s)
  const problems = [...by('gagal'), ...by('tidak_terkirim')]
  const hard = problems.filter((r) => !r.perlu_dicek)
  const soft = problems.filter((r) => r.perlu_dicek)
  const priceDiff = by('harga_beda')
  const unexpected = by('tak_terduga')
  const expected = rows.filter((r) => r.expected)
  const judged = expected.filter((r) => r.status !== 'menunggu' && r.status !== 'tanpa_log')
  const ok = judged.filter((r) => r.status === 'cocok').length
  const waiting = expected.filter((r) => r.status === 'menunggu').length

  const signalFact: BotFact = !live
    ? { label: 'Sinyal 7 hari', value: i.liveError ? 'tidak bisa dimuat' : 'memuat…', tone: i.liveError ? 'warn' : 'wait' }
    : judged.length
      ? { label: 'Sinyal 7 hari', value: `${ok} dari ${judged.length} sesuai`, tone: ok === judged.length ? 'ok' : hard.length ? 'bad' : 'warn' }
      : { label: 'Sinyal 7 hari', value: expected.length ? `${expected.length} belum bisa dinilai` : 'belum ada sinyal', tone: 'wait' }
  const facts = [signalFact, wh.fact, ...(alertFact ? [alertFact] : [])]
  const focus: BotVerdict['focus'] = problems.length || priceDiff.length || unexpected.length ? 'masalah' : 'semua'
  const verdict = (tone: BotTone, sentence: string): BotVerdict => ({ tone, sentence, facts, focus })

  // 1. A signal the bot should have acted on and did not.
  if (hard.length) {
    const parts = [
      countPhrase(hard.filter((r) => r.status === 'tidak_terkirim'), 'sinyal tidak terkirim ke bot', i.fmt),
      countPhrase(hard.filter((r) => r.status === 'gagal'), 'sinyal gagal dieksekusi', i.fmt),
    ].filter((p): p is string => Boolean(p))
    return verdict('bad', `Belum aman: 7 hari terakhir ada ${joinId(parts)}.`)
  }
  // 2. Nothing can reach the exchange.
  if (wh.off === true) {
    return verdict(
      'warn',
      'Perlu dicek: webhook bot sedang tidak aktif, jadi alert TradingView ditolak dan posisi yang masih terbuka tidak ditutup otomatis.',
    )
  }
  // 3. The check itself is missing, failed or late.
  if (!live) return verdict('warn', 'Perlu dicek: data Cek bot live tidak bisa dimuat, jadi kecocokan sinyal belum bisa dinilai.')
  const lc = live.last_cycle
  if (!lc) return verdict('wait', 'Menunggu data: Cek bot live belum pernah dihitung. Biasanya jalan beberapa menit setelah candle 4H berikutnya tutup.')
  const finished = lc.finished ?? lc.started
  if (lc.error) return verdict('warn', `Perlu dicek: perhitungan Cek bot live terakhir gagal, jadi datanya belum yang terbaru.`)
  if (finished && now !== null && now - Date.parse(finished) > LIVECHECK_STALE_MS) {
    return verdict('warn', `Perlu dicek: Cek bot live terakhir dihitung ${i.age(finished)}, padahal biasanya tiap 4 jam.`)
  }

  // 4. Things a person should look at, but not a missed trade.
  const notes = [
    countPhrase(soft, 'sinyal menurut Lab tidak sampai ke bot, mungkin karena hitungan Lab beda dengan TradingView', i.fmt),
    countPhrase(priceDiff, 'dieksekusi dengan harga jauh dari harga sinyal', i.fmt),
    countPhrase(unexpected, 'kiriman ke bot tanpa sinyal strategi', i.fmt),
    wh.noKey.length ? `webhook aktif di akun ${wh.noKey.join(', ')} tapi API key exchange-nya belum ada` : null,
    wh.unknown ? 'status webhook tidak bisa dimuat' : null,
  ].filter((p): p is string => Boolean(p))
  if (notes.length) {
    const head = judged.length ? `${ok} dari ${judged.length} sinyal 7 hari terakhir sesuai, tapi ` : ''
    return verdict('warn', `Perlu dicek: ${head}${joinId(notes)}.`)
  }

  // 5. All clear.
  if (judged.length) {
    const tail = waiting ? ` ${waiting} sinyal terbaru masih menunggu hasil.` : ''
    return verdict('ok', `Ya, aman: ${ok} dari ${judged.length} sinyal strategi 7 hari terakhir dieksekusi bot sesuai rencana.${tail}`)
  }
  if (expected.length) {
    return verdict('wait', `Menunggu data: ${expected.length} sinyal 7 hari terakhir belum bisa dinilai (terlalu baru atau tanpa log).`)
  }
  return verdict('ok', 'Ya, aman: 7 hari terakhir strategi belum memberi sinyal, dan tidak ada kiriman tak terduga ke bot.')
}
