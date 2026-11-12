'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, RefreshCw, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '@/components/shell/states'
import { Chip, Section } from '@/components/lab/Section'
import { BiasBadge, FaseBadge, KeyakinanBadge, PeluangBadge } from '@/components/lab/outlook/OutlookBadges'
import { OutlookTrackRecord } from '@/components/lab/outlook/OutlookTrackRecord'
import { Fold } from '@/components/market/shared'
import { AnswerCard } from '@/components/ui/answer-card'
import { Freshness } from '@/components/ui/freshness'
import { useSavedInputs } from '@/components/market/useSavedInputs'
import { useOutlook, useRefreshOutlook } from '@/lib/queries/outlook'
import {
  callLabel,
  coinLabel,
  driverText,
  EMPTY_FILTERS,
  faseOf,
  filterRows,
  formatProb,
  formatR,
  formatWib,
  kDariN,
  koinHref,
  liveNote,
  peluangRows,
  type Arah,
  type OutlookFilters,
} from '@/lib/lab/outlook'
import { apiErrorDetail } from '@/lib/api/errors'
import { formatCount, formatPrice, formatRR, formatScore, formatUsd, formatUsdSigned, signClass } from '@/lib/utils/format'
import { notify } from '@/lib/utils/toast'
import { cn } from '@/lib/utils/cn'
import type { Keyakinan, OutlookRow } from '@/lib/api/types/outlook'

export const DISCLAIMER =
  'Informasi, bukan saran investasi. Arah mengikuti strategi yang bisa salah; angka dolar adalah hitungan, bukan janji hasil.'

function Level({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: string }) {
  return (
    <div className="min-w-0">
      <div className="eyebrow">{label}</div>
      <div className={cn('num break-words text-sm font-semibold', tone)}>{value}</div>
      {hint !== undefined && <div className="break-words text-3xs text-muted-foreground">{hint}</div>}
    </div>
  )
}

/** "Peluang terbaik" card: decision, which preset drives it, plan levels, money, evidence. */
function PeluangCard({ r }: { r: OutlookRow }) {
  const pl = r.plan
  const pj = r.projection
  const cal = r.bias.calib?.stats
  const zone = pl?.entry_zone
  const tp = r.strategy.tp
  return (
    <Link
      href={koinHref(r.symbol)}
      className="group block rounded-xl border bg-card p-3.5 shadow-xs transition-colors hover:border-foreground/20 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {r.peluang?.rank && <span className="num text-xs text-muted-foreground">#{r.peluang.rank}</span>}
        <span className="font-mono text-sm font-bold">{coinLabel(r.symbol)}</span>
        <BiasBadge bias={r.bias} />
        <KeyakinanBadge bias={r.bias} />
        <FaseBadge fase={faseOf(r)} />
      </div>
      <p className="mt-1.5 text-2xs text-muted-foreground">{driverText(r)}</p>
      {pl?.saran && <p className="mt-1.5 text-xs leading-snug">{pl.saran}</p>}
      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
        <Level label="Zona entry" value={zone ? `${formatPrice(zone[0])}–${formatPrice(zone[1])}` : formatPrice(r.price)} />
        <Level label="Batal jika (SL)" value={formatPrice(r.strategy.sl)} tone="text-bearish"
          hint={pl?.r_unit_pct !== undefined ? `${formatScore(pl.r_unit_pct, 1)}% dari harga` : undefined} />
        <Level label="Target (TP)" value={tp !== null && tp !== undefined ? formatPrice(tp) : 'tidak ada'} tone="text-bullish"
          hint={pl?.target_typical ? `target realistis ${formatPrice(pl.target_typical)}` : undefined} />
        <Level label="Untung : rugi" value={pl?.rr ? formatRR(pl.rr) : '—'}
          hint={pl?.valid_until ? `berlaku s/d ${formatWib(pl.valid_until)}` : undefined} />
      </div>
      {pj?.available && (
        <p className="mt-2.5 text-xs">
          <span className="text-muted-foreground">Modal {formatUsd(pj.capital)}: </span>
          di TP <span className={cn('num font-semibold', signClass(pj.at_tp?.net))}>{formatUsdSigned(pj.at_tp?.net)}</span>
          {' · '}di SL <span className={cn('num font-semibold', signClass(pj.at_sl?.net))}>{formatUsdSigned(pj.at_sl?.net)}</span>
          <Badge variant="muted" size="xs" className="ml-1.5">SIMULASI</Badge>
        </p>
      )}
      {cal && cal.n_cases > 0 && (
        <p className="mt-1 text-2xs text-muted-foreground">
          Kasus serupa: rata-rata <span className={cn('num', signClass(cal.mean_r))}>{formatR(cal.mean_r)}</span> · TP dulu{' '}
          {formatProb(cal.p_tp)} · SL dulu {formatProb(cal.p_sl)} · {formatCount(cal.n_pos)} posisi
        </p>
      )}
      {r.changes?.[0] && <p className="mt-1 line-clamp-1 text-2xs text-info">Berubah: {r.changes[0]}</p>}
      <span className="mt-1 inline-flex items-center gap-0.5 text-2xs text-muted-foreground group-hover:text-foreground">
        Rencana lengkap & alasan <ChevronRight className="h-3 w-3" aria-hidden="true" />
      </span>
    </Link>
  )
}

/** Compact row for calls without positive evidence: one line of facts, one line naming the strategy. */
function CallRow({ r }: { r: OutlookRow }) {
  const cal = r.bias.calib?.stats
  const k = kDariN(r)
  return (
    <li>
      <Link href={koinHref(r.symbol)} className="block px-4 py-2.5 hover:bg-muted/40 sm:px-5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="w-16 shrink-0 font-mono text-xs font-bold">{coinLabel(r.symbol)}</span>
          <BiasBadge bias={r.bias} />
          <span className="whitespace-nowrap text-2xs text-muted-foreground">{callLabel(r)}</span>
          <span className="ml-auto flex items-center gap-3 whitespace-nowrap text-2xs">
            {k && <span className="hidden text-muted-foreground md:inline">{k.k} dari {k.n} konteks searah</span>}
            {r.plan?.rr && <span className="num text-muted-foreground">R:R {formatRR(r.plan.rr)}</span>}
            {cal && cal.n_cases > 0 && <span className={cn('num', signClass(cal.mean_r))}>{formatR(cal.mean_r)}</span>}
            <PeluangBadge p={r.peluang} />
            <ChevronRight className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
          </span>
        </div>
        <p className="mt-0.5 truncate text-3xs text-muted-foreground">{driverText(r)}</p>
      </Link>
    </li>
  )
}

const ARAH: [Arah, string][] = [['long', 'Long'], ['short', 'Short']]
const KEYAKINAN: [Keyakinan, string][] = [['tinggi', 'Tinggi'], ['sedang', 'Sedang'], ['rendah', 'Rendah']]

function toggle<T>(s: Set<T>, v: T): Set<T> {
  const n = new Set(s)
  if (n.has(v)) n.delete(v)
  else n.add(v)
  return n
}

export function OutlookView() {
  const [inputs] = useSavedInputs()
  const q = useOutlook(inputs)
  const refresh = useRefreshOutlook()
  const [filters, setFilters] = useState<OutlookFilters>(EMPTY_FILTERS)
  const all = useMemo(() => q.data?.rows ?? [], [q.data])
  const calls = useMemo(() => peluangRows(filterRows(all, filters)), [all, filters])
  const best = calls.filter((r) => r.peluang?.label === 'positif')
  const rest = calls.filter((r) => r.peluang?.label !== 'positif')
  const netral = useMemo(() => all.filter((r) => !r.unavailable && !r.strategy?.side), [all])
  const unavailable = all.filter((r) => r.unavailable)
  const busy = q.data?.refresh?.status === 'queued' || q.data?.refresh?.status === 'running'
  const admin = q.data?.can_refresh === true
  const meta = q.data?.meta
  const closeIso = meta?.last_bar ? new Date(Date.parse(meta.last_bar) + 4 * 3600_000).toISOString() : null
  const stale = all.some((r) => r.stale)
  const directional = all.filter((r) => !r.unavailable && r.strategy?.side).length

  const onRefresh = () =>
    refresh.mutate(undefined, {
      onSuccess: () => notify.info('Outlook dijadwalkan', { description: 'Dihitung ulang di worker Lab (±4 menit).' }),
      onError: (e) => notify.error('Gagal menjadwalkan', { description: apiErrorDetail(e) ?? undefined }),
    })

  if (q.isPending) {
    return <div className="space-y-2" aria-busy="true">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
  }
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} title="Gagal memuat Outlook." />
  if (all.length === 0) {
    return (
      <EmptyState
        title="Outlook belum dihitung"
        description={busy ? 'Sedang dihitung pertama kali (±4 menit) — halaman ikut diperbarui.' : 'Outlook dihitung otomatis setelah setiap close candle 4 jam.'}
        action={admin ? <Button size="sm" onClick={onRefresh} disabled={busy || refresh.isPending}>Hitung sekarang</Button> : undefined}
      />
    )
  }

  const topNames = best.slice(0, 3).map((r) => `${coinLabel(r.symbol)} ${r.bias.bias}`).join(', ')
  return (
    <div className="space-y-4">
      <AnswerCard
        tone={best.length ? 'baik' : directional ? 'perlu_dicek' : 'menunggu'}
        answer={best.length
          ? `${best.length} peluang dengan bukti historis positif sekarang: ${topNames}.`
          : directional
            ? `Belum ada peluang dengan bukti positif. ${directional} koin punya arah, tapi bukti historisnya belum meyakinkan.`
            : 'Semua strategi sedang tidak berposisi (NETRAL). Tunggu posisi baru setelah close 4H berikutnya.'}
        metrics={[
          { label: 'Bukti positif', value: formatCount(best.length), hint: 'panggilan' },
          { label: 'Punya arah', value: formatCount(directional), hint: `dari ${formatCount(all.length - unavailable.length)} koin` },
          { label: 'Posisi baru', value: formatCount(all.filter((r) => r.strategy?.fresh).length), hint: 'di close 4H terakhir' },
        ]}
        footer={<Freshness dataLabel="Data close 4H" dataAt={closeIso} updatedAt={meta?.computed_at} timeframe="4h" nextDelayMin={4} stale={stale} />}
      />

      <div className="flex flex-wrap items-center gap-1.5" aria-label="Filter">
        {ARAH.map(([v, label]) => (
          <Chip key={v} active={filters.arah.has(v)} onClick={() => setFilters((f) => ({ ...f, arah: toggle(f.arah, v) }))} className="h-7 px-2.5">{label}</Chip>
        ))}
        <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
        {KEYAKINAN.map(([v, label]) => (
          <Chip key={v} active={filters.keyakinan.has(v)} onClick={() => setFilters((f) => ({ ...f, keyakinan: toggle(f.keyakinan, v) }))} className="h-7 px-2.5">{label}</Chip>
        ))}
        <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
        <Chip active={filters.baru} onClick={() => setFilters((f) => ({ ...f, baru: !f.baru }))} className="h-7 px-2.5">Posisi baru</Chip>
        {q.data?.positions_available && (
          <Chip active={filters.posisi === 'ada'} onClick={() => setFilters((f) => ({ ...f, posisi: f.posisi === 'ada' ? null : 'ada' }))} className="h-7 px-2.5">
            Sudah ada posisi
          </Chip>
        )}
        {admin && (
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={busy || refresh.isPending} className="ml-auto h-7 gap-1.5 text-xs">
            <RefreshCw className={cn('h-3.5 w-3.5', busy && 'animate-spin')} />
            {busy ? `Menghitung… ${q.data?.refresh?.progress?.done ?? 0}/${q.data?.refresh?.progress?.total || '—'}` : 'Hitung ulang'}
          </Button>
        )}
      </div>

      <Section
        title="Peluang terbaik"
        icon={<Target className="h-4 w-4" aria-hidden="true" />}
        description="Hanya panggilan yang kasus serupanya di masa lalu terbukti untung (batas bawah 95% di atas nol). Diurutkan dari nilai harapannya."
      >
        {best.length === 0 ? (
          <p className="rounded-md border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
            Tidak ada panggilan dengan bukti positif saat ini{filters.arah.size || filters.keyakinan.size || filters.baru ? ' (dengan filter ini)' : ''}.
            Panggilan lain tetap terlihat di bawah.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {best.map((r) => <PeluangCard key={r.symbol} r={r} />)}
          </div>
        )}
        {best.map((r) => liveNote(r)).filter(Boolean).map((t) => (
          <p key={t as string} className="mt-2 text-2xs text-warn">{t}</p>
        ))}
      </Section>

      <Section
        title={`Arah lain (${rest.length})`}
        description="Strategi punya posisi, tapi bukti historis panggilan serupa belum positif. Lihat sebagai informasi."
        bodyClassName="px-0 pb-2 pt-1 sm:px-0 sm:pb-2"
      >
        {rest.length === 0 ? (
          <p className="px-4 py-3 text-xs text-muted-foreground sm:px-5">Tidak ada.</p>
        ) : (
          <ul className="divide-y divide-border/60">{rest.map((r) => <CallRow key={r.symbol} r={r} />)}</ul>
        )}
      </Section>

      <Fold title={`${netral.length} koin tanpa arah (NETRAL) — lihat`}>
        {netral.length === 0 ? (
          <p className="text-xs text-muted-foreground">Tidak ada.</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {netral.map((r) => (
              <li key={r.symbol}>
                <Link href={koinHref(r.symbol)} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted/50">
                  <span className="font-mono font-semibold">{coinLabel(r.symbol)}</span>
                  {r.bias?.condong && <span className="text-3xs text-muted-foreground">condong {r.bias.condong}</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-2xs text-muted-foreground">
          NETRAL = strategi utama koin itu sedang tidak memegang posisi. &ldquo;Condong&rdquo; hanya dari faktor konteks dan belum terbukti sebagai sinyal.
        </p>
        {unavailable.length > 0 && (
          <p className="mt-1 text-2xs text-muted-foreground">Tidak tersedia: {unavailable.map((r) => coinLabel(r.symbol)).join(', ')}.</p>
        )}
      </Fold>

      {q.data && (
        <Fold title="Rekam jejak Outlook & uji historis">
          <OutlookTrackRecord data={q.data} />
        </Fold>
      )}

      <Fold title="Cara arah, keyakinan & peluang dihitung">
        <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-muted-foreground">
          {(q.data?.method.text ?? []).map((t) => <li key={t}>{t}</li>)}
          <li>Untung/rugi dolar: jika masuk di harga close 4H terakhir dengan SL/TP strategi saat ini, termasuk komisi 0.05% + slippage 0.05% per sisi; funding tidak termasuk. Modal diubah di halaman koin.</li>
        </ul>
      </Fold>
      <p className="text-2xs text-muted-foreground">{DISCLAIMER}</p>
    </div>
  )
}
