/** Pure helpers for "Cek bot live vs strategi" (no React). */
import type { LiveCheckCause, LiveCheckRow, LiveCheckStatus } from '@/lib/api/types/livecheck'

export type Tone = 'bullish' | 'bearish' | 'warn' | 'info' | 'muted'

export const STATUS_COPY: Record<LiveCheckStatus, { label: string; short: string; tone: Tone; hint: string }> = {
  cocok: { label: 'Cocok', short: 'Cocok', tone: 'bullish', hint: 'Sinyal Lab ada, kiriman TradingView ada, order tereksekusi.' },
  harga_beda: {
    label: 'Harga beda',
    short: 'Harga beda',
    tone: 'warn',
    hint: 'Tereksekusi, tapi harga eksekusi jauh dari harga sinyal Lab (di atas ambang).',
  },
  gagal: {
    label: 'Terkirim tapi gagal / ditolak',
    short: 'Gagal / ditolak',
    tone: 'bearish',
    hint: 'TradingView mengirim, tapi bot tidak membuka/menutup posisi. Lihat alasannya.',
  },
  tidak_terkirim: {
    label: 'Sinyal tidak terkirim',
    short: 'Tidak terkirim',
    tone: 'bearish',
    hint: 'Lab menghitung ada sinyal, tapi tidak ada kiriman TradingView sama sekali.',
  },
  tak_terduga: {
    label: 'Tak terduga',
    short: 'Tak terduga',
    tone: 'info',
    hint: 'Ada kiriman ke webhook, tapi Lab tidak menghitung sinyal di bar itu.',
  },
  menunggu: { label: 'Menunggu', short: 'Menunggu', tone: 'muted', hint: 'Terlalu baru untuk dinilai.' },
  tanpa_log: {
    label: 'Tanpa data log',
    short: 'Tanpa log',
    tone: 'muted',
    hint: 'Tidak ada log yang mencakup waktu ini, jadi tidak bisa dicek.',
  },
  diabaikan: {
    label: 'Uji manual',
    short: 'Uji manual',
    tone: 'muted',
    hint: 'Klien selain TradingView (mis. curl) memanggil webhook. Tidak dihitung.',
  },
}

export const CAUSE_LABEL: Record<LiveCheckCause, string> = {
  warmup: 'warm-up',
  biaya: 'sensitif biaya',
  intrabar: 'SL/TP intrabar',
  beda_bar: 'beda 1 bar',
  beda_waktu_exit: 'waktu exit beda',
  varian_lain: 'varian Lab lain',
  data_belum: 'data belum masuk',
  tengah_bar: 'di tengah bar',
}

/** Worst first: what the timeline cell of a bar shows. */
const SEVERITY: LiveCheckStatus[] = [
  'gagal',
  'tidak_terkirim',
  'tak_terduga',
  'harga_beda',
  'menunggu',
  'cocok',
  'tanpa_log',
  'diabaikan',
]

export type StatusFilter = 'semua' | 'masalah' | 'perlu_dicek' | LiveCheckStatus

export const PROBLEM: LiveCheckStatus[] = ['gagal', 'tidak_terkirim', 'tak_terduga', 'harga_beda']

export function filterRows(rows: LiveCheckRow[], f: StatusFilter): LiveCheckRow[] {
  if (f === 'semua') return rows
  if (f === 'masalah') return rows.filter((r) => PROBLEM.includes(r.status))
  if (f === 'perlu_dicek') return rows.filter((r) => r.perlu_dicek)
  return rows.filter((r) => r.status === f)
}

export interface BarCell {
  /** ISO open time of the 4H bar */
  open: string
  status: LiveCheckStatus | null
  perlu: boolean
  n: number
}

const STEP_MS = 4 * 3600 * 1000

/** One cell per 4H bar in [start, end), oldest first, carrying the worst status of its rows. */
export function barCells(rows: LiveCheckRow[], startIso: string, endIso: string): BarCell[] {
  const start = Date.parse(startIso)
  const end = Date.parse(endIso)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return []
  const byBar = new Map<number, LiveCheckRow[]>()
  for (const r of rows) {
    const t = Date.parse(r.bar_open_ts)
    if (!Number.isFinite(t)) continue
    const list = byBar.get(t) ?? []
    list.push(r)
    byBar.set(t, list)
  }
  const out: BarCell[] = []
  for (let t = start; t < end; t += STEP_MS) {
    const list = byBar.get(t) ?? []
    let status: LiveCheckStatus | null = null
    for (const s of SEVERITY) {
      if (list.some((r) => r.status === s)) {
        status = s
        break
      }
    }
    out.push({ open: new Date(t).toISOString(), status, perlu: list.some((r) => r.perlu_dicek), n: list.length })
  }
  return out
}

/** "Open Long" / "Close Short" / "—" (nginx-only deliveries carry no action). */
export function signalLabel(action: string | null | undefined, side: string | null | undefined): string {
  if (!action || !side) return '—'
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  return `${cap(action)} ${cap(side)}`
}

/** What the webhook answered: "202 · 30 ms", "nginx 499 · app 500 (11.3 dtk)". */
export function httpLabel(nginx: number | null | undefined, app: number | null | undefined, ms?: number | null): string {
  const dur = ms === null || ms === undefined ? '' : ms >= 1000 ? ` (${(ms / 1000).toFixed(1)} dtk)` : ` (${Math.round(ms)} ms)`
  if (nginx && app && nginx !== app) return `nginx ${nginx} · app ${app}${dur}`
  const s = nginx ?? app
  return s ? `${s}${dur}` : '—'
}

export const EXIT_REASON: Record<string, string> = {
  hard_sl: 'Stop loss',
  hard_tp: 'Take profit',
  liquidation: 'Likuidasi',
  atr_trailing: 'ATR trailing',
  ema_exit: 'EMA exit',
  structure_break: 'Structure break',
  ob_exit: 'OB exit',
  rsi_exit: 'RSI exit',
  dcb_reverse: 'DCB reverse',
  dcb_vol_exit: 'DCB vol exit',
}

export function exitReasonLabel(r: string | null | undefined): string {
  if (!r) return '—'
  return EXIT_REASON[r] ?? r.replace(/_/g, ' ')
}

/** Epoch seconds -> ISO string (for formatTimestamp). */
export function epochIso(s: number | null | undefined): string | null {
  return s === null || s === undefined || !Number.isFinite(s) ? null : new Date(s * 1000).toISOString()
}
