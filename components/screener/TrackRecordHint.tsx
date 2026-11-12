'use client'

import { createContext, useContext, type ReactNode } from 'react'
import Link from 'next/link'
import { ArrowUpRight, History } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLabMe } from '@/lib/queries/lab'
import { useSignalTrackRecord } from '@/lib/queries/screener'
import { useSession } from '@/lib/utils/use-session'
import { cn } from '@/lib/utils/cn'
import {
  HORIZON_SHORT,
  TRACK_VERDICT,
  findTrack,
  isEnough,
  ledgerHref,
  ledgerSymbol,
  periodLabel,
  signedPct,
  trackLabel,
  trackLine,
  type TrackKey,
} from '@/lib/screener/track-record'
import type { SignalTrackRecord, TrackHorizonStats, TrackRecordItem } from '@/lib/api/types/ledger'

interface Ctx {
  data: SignalTrackRecord | undefined
  isAdmin: boolean
}

const TrackRecordContext = createContext<Ctx>({ data: undefined, isAdmin: false })

/** Loads the track record once for the whole screener (table + drawer). */
export function TrackRecordProvider({ children }: { children: ReactNode }) {
  const session = useSession()
  const loggedIn = Boolean(session?.accessToken)
  const q = useSignalTrackRecord(loggedIn)
  const me = useLabMe(loggedIn)
  const isAdmin = !me.isError && me.data?.is_admin === true
  return <TrackRecordContext.Provider value={{ data: q.data, isAdmin }}>{children}</TrackRecordContext.Provider>
}

const TONE_TEXT = {
  bullish: 'text-bullish',
  bearish: 'text-bearish',
  warn: 'text-warn',
  muted: 'text-muted-foreground/60',
} as const

/** Stop clicks/keys from reaching the screener row (which opens the drawer). Portals bubble in React. */
const stop = {
  onClick: (e: React.SyntheticEvent) => e.stopPropagation(),
  onKeyDown: (e: React.SyntheticEvent) => e.stopPropagation(),
}

function HorizonRow({ h, s }: { h: '1d' | '3d'; s: TrackHorizonStats | undefined }) {
  if (!s || !isEnough(s)) {
    return (
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground">{HORIZON_SHORT[h]}</span>
        <span className="text-muted-foreground">belum cukup data{s && s.n > 0 ? ` (n=${s.n})` : ''}</span>
      </div>
    )
  }
  const v = TRACK_VERDICT[s.verdict]
  const vb = TRACK_VERDICT[s.verdict_rel_btc]
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground">{HORIZON_SHORT[h]}</span>
        <Badge variant={v.tone} size="xs">{v.label}</Badge>
      </div>
      <div className="num flex flex-wrap gap-x-2">
        <span>hit {s.hit_rate === null ? '—' : `${Math.round(s.hit_rate * 100)}%`}</span>
        <span>rata-rata {signedPct(s.mean_pct)}</span>
        <span>vs BTC {signedPct(s.mean_rel_btc_pct)} <span className="text-muted-foreground">({vb.label.toLowerCase()})</span></span>
      </div>
      <div className="num text-3xs text-muted-foreground">
        n={s.n} · {s.days} hari · {s.coins} koin
        {s.mean_ci ? ` · CI 95% ${signedPct(s.mean_ci[0])} … ${signedPct(s.mean_ci[1])}` : ''}
      </div>
    </div>
  )
}

function Panel({ k, item, data }: { k: TrackKey; item: TrackRecordItem | null; data: SignalTrackRecord }) {
  const period = periodLabel(data.period)
  const rekonShare = item && item.n_signals > 0 ? item.n_rekon / item.n_signals : 0
  return (
    <div className="space-y-2 px-2 py-1.5 text-2xs leading-relaxed">
      <p className="eyebrow text-muted-foreground">Rekam jejak · {trackLabel(k)}</p>
      {!item ? (
        <p className="text-muted-foreground">Belum ada sinyal jenis ini yang tercatat.</p>
      ) : (
        <>
          <HorizonRow h="1d" s={item.stats['1d']} />
          <HorizonRow h="3d" s={item.stats['3d']} />
          <p className="text-3xs text-muted-foreground">
            Angka utama 1 hari. Jendela 3 hari saling tumpang tindih antar hari, jadi buktinya lebih lemah.
          </p>
        </>
      )}
      <div className="rounded-md border border-warn/30 bg-warn/[0.06] p-2 text-3xs text-muted-foreground">
        Hit = arah sinyal benar; return diukur <b>sebelum biaya</b> (fee, slippage, funding). Data baru
        {period ? ` ${period}` : ' beberapa minggu'}: <b>satu rezim pasar</b>
        {rekonShare > 0.5 ? ', sebagian besar dari rekonstruksi screener' : ''}. Petunjuk, bukan jaminan.
      </div>
    </div>
  )
}

/**
 * Compact "rekam jejak" indicator next to a screener signal: a small icon coloured by
 * the 1-day verdict (grey = belum cukup data). Hover shows one line; click opens the
 * detail with the honesty note and, for admins, a link to Catatan Sinyal.
 * Renders nothing when the track record is unavailable or the label is not a signal.
 */
export function TrackRecordHint({ k, symbol, className }: { k: TrackKey | null; symbol?: string; className?: string }) {
  const { data, isAdmin } = useContext(TrackRecordContext)
  if (!k || !data?.available) return null
  const item = findTrack(data, k)
  const s = item?.stats['1d']
  const verdict = s && isEnough(s) ? s.verdict : 'belum_cukup_data'
  const line = trackLine(k, item)
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        {...stop}
        aria-label={`Rekam jejak: ${line}`}
        title={line}
        className={cn(
          '-m-1.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          TONE_TEXT[TRACK_VERDICT[verdict].tone],
          className,
        )}
      >
        <History className="h-3.5 w-3.5" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent {...stop} align="start" className="w-72">
        <Panel k={k} item={item} data={data} />
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="text-xs">
              <Link href={ledgerHref(k)}>
                <ArrowUpRight /> Buka di Catatan Sinyal
              </Link>
            </DropdownMenuItem>
            {symbol && (
              <DropdownMenuItem asChild className="text-xs">
                <Link href={ledgerHref(k, ledgerSymbol(symbol))}>
                  <ArrowUpRight /> Hanya {ledgerSymbol(symbol).replace(/USDT$/, '')}
                </Link>
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** One-line explanation under the screener table (only when the track record loaded). */
export function TrackRecordFootnote() {
  const { data } = useContext(TrackRecordContext)
  if (!data?.available || data.items.length === 0) return null
  const period = periodLabel(data.period)
  return (
    <p className="flex items-start gap-1.5 border-t px-4 py-2 text-2xs text-muted-foreground">
      <History className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
      <span>
        Ikon rekam jejak di samping arah skor: seberapa sering arah jenis itu benar arahnya 1 hari kemudian
        (hijau terbukti, merah negatif, kuning belum terbukti, abu-abu belum cukup data). Sebelum biaya, dan baru
        satu rezim pasar{period ? ` (${period})` : ''}, sebagian besar dari rekonstruksi. Klik ikonnya untuk rincian.
      </span>
    </p>
  )
}
