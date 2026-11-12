'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronRight, Compass, RefreshCw, Shuffle, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '@/components/shell/states'
import { Chip } from '@/components/lab/Section'
import { OutlookTrackRecord } from '@/components/lab/outlook/OutlookTrackRecord'
import { AiFactorLine } from '@/components/ai/AiFactorSummary'
import { Fold } from '@/components/market/shared'
import { BentoGrid, BigStat, bigUsd, CoinAvatar, ConfidenceDots, CountUp, DirectionChip, EvidenceBar, HeroCard, Panel, Pill, TitledPanel } from '@/components/market/ui'
import { IconChip, IconTitle } from '@/components/ui/icon-title'
import { AnswerCard } from '@/components/ui/answer-card'
import { Freshness } from '@/components/ui/freshness'
import { Segmented } from '@/components/ui/segmented'
import { GradeLetter } from '@/components/market/quality/GradeLetter'
import { QualityPopover } from '@/components/market/quality/QualityPopover'
import { RekamSkorPanel } from '@/components/market/quality/RekamSkorPanel'
import { evidenceShort, GRADE_HINT, GRADES, gradeOf, isBestCall } from '@/lib/lab/quality'
import { termLabel } from '@/lib/glossary'
import { useSavedInputs } from '@/components/market/useSavedInputs'
import { useOutlook, useRefreshOutlook } from '@/lib/queries/outlook'
import {
  coinLabel,
  EMPTY_FILTERS,
  FASE_HINT,
  FASE_TEXT,
  faseOf,
  filterRows,
  formatR,
  koinHref,
  liveNote,
  PELUANG_TEXT,
  PELUANG_TONE,
  peluangRows,
  sortRows,
  type Arah,
  type OutlookFilters,
} from '@/lib/lab/outlook'
import { apiErrorDetail } from '@/lib/api/errors'
import { formatCount, formatPrice, formatRR, formatUsd, signClass } from '@/lib/utils/format'
import { notify } from '@/lib/utils/toast'
import { cn } from '@/lib/utils/cn'
import type { Keyakinan, OutlookRow } from '@/lib/api/types/outlook'
import type { QualityGrade } from '@/lib/api/types/quality'

export const DISCLAIMER =
  'Informasi, bukan saran investasi. Arah mengikuti strategi yang bisa salah; angka dolar adalah hitungan, bukan janji hasil.'

/**
 * "Peluang terbaik" card: coin, big direction, skor, R:R and dollars as big numbers, levels, evidence bar.
 * The whole card is one link (stretched over the card) with the skor button on top of it, so the
 * breakdown opens without leaving the page and no button sits inside a link.
 */
function PeluangCard({ r, hero = false }: { r: OutlookRow; hero?: boolean }) {
  const pl = r.plan
  const pj = r.projection
  const cal = r.bias.calib?.stats
  const zone = pl?.entry_zone
  const tp = r.strategy.tp
  const fase = faseOf(r)
  const side = r.strategy.side
  const note = liveNote(r)
  const size = hero ? 'xl' : 'lg'
  const ev = r.kualitas?.evidence
  const short = evidenceShort(ev)
  return (
    <div className={cn('group rounded-3xl has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-info', hero && 'md:col-span-2')}>
      <HeroCard interactive glow={side === 'long' ? 'bullish' : side === 'short' ? 'bearish' : 'brand'} className="h-full">
        <div className="flex flex-wrap items-center gap-3">
          <CoinAvatar symbol={r.symbol} size={hero ? 'lg' : 'md'} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn('display font-bold tracking-tight', hero ? 'text-3xl' : 'text-2xl')}>{coinLabel(r.symbol)}</span>
              {r.peluang?.rank && <span className="num text-sm font-semibold text-muted-foreground">#{r.peluang.rank}</span>}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <ConfidenceDots level={r.bias.keyakinan} />
              {fase && <Pill tone={fase === 'baru' ? 'info' : 'muted'} title={FASE_HINT[fase]}>{FASE_TEXT[fase]}</Pill>}
            </div>
          </div>
          <span className="ml-auto"><DirectionChip direction={r.bias.bias} size="lg" /></span>
        </div>
        {r.kualitas && (
          <div className="relative z-10 mt-4 -ml-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <QualityPopover q={r.kualitas} size={hero ? 'lg' : 'md'} symbol={coinLabel(r.symbol)} />
            {hero && r.kualitas.base_reason && <span className="min-w-0 max-w-md text-2xs text-muted-foreground">{r.kualitas.why_none ?? r.kualitas.base_reason}</span>}
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <BigStat label={termLabel('rr')} size={size} className="col-span-2 sm:col-span-1"
            value={pl?.rr ? <CountUp value={pl.rr} format={(v) => formatRR(v)} /> : '—'} />
          <BigStat label={termLabel('money_at_tp')} size={size} tone={signClass(pj?.at_tp?.net)}
            value={pj?.available && pj.at_tp ? <CountUp value={pj.at_tp.net} format={bigUsd} /> : '—'}
            sub={pj?.available ? `modal ${formatUsd(pj.capital)}` : undefined} />
          <BigStat label={termLabel('money_at_sl')} size={size} tone={signClass(pj?.at_sl?.net)}
            value={pj?.available && pj.at_sl ? <CountUp value={pj.at_sl.net} format={bigUsd} /> : '—'}
            sub={pj?.available ? 'simulasi, termasuk biaya' : undefined} />
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <LevelTile className="col-span-2 sm:col-span-1" label={termLabel('zona_entry')} value={zone ? `${formatPrice(zone[0])}–${formatPrice(zone[1])}` : formatPrice(r.price)} dot="bg-info" />
          <LevelTile label={termLabel('sl')} value={formatPrice(r.strategy.sl)} dot="bg-bearish" />
          <LevelTile label={termLabel('tp')} value={tp !== null && tp !== undefined ? formatPrice(tp) : 'tidak ada'} dot="bg-bullish" />
        </dl>

        {cal && cal.n_cases > 0 && (
          <div className="mt-5">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 text-2xs text-muted-foreground">
              <span>{short ? short.split(' · ')[0] : `Kasus serupa · ${formatCount(cal.n_pos)} posisi`}</span>
              <span className={cn('num text-sm font-semibold', signClass(cal.mean_r))}>
                rata-rata {formatR(cal.mean_r)}
                {ev?.half_r !== null && ev?.half_r !== undefined && <span className="font-normal text-muted-foreground"> ±{Math.abs(ev.half_r).toFixed(2)}R</span>}
              </span>
            </div>
            <EvidenceBar pTp={cal.p_tp} pSl={cal.p_sl} pBatal={cal.p_batal} showLegend={hero} />
          </div>
        )}
        {note && <p className="mt-3 text-2xs text-warn">{note}</p>}
        {hero && <AiFactorLine symbol={r.symbol} />}
        <Link href={koinHref(r.symbol)}
          className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-info after:absolute after:inset-0 after:rounded-3xl after:content-[''] focus-visible:outline-none">
          Lihat rencana {coinLabel(r.symbol)} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
        </Link>
      </HeroCard>
    </div>
  )
}

function LevelTile({ label, value, dot, className }: { label: string; value: React.ReactNode; dot: string; className?: string }) {
  return (
    <div className={cn('min-w-0 rounded-2xl border bg-muted/30 px-4 py-3', className)}>
      <dt className="eyebrow flex items-center gap-2">
        <span className={cn('h-2 w-2 rounded-full', dot)} aria-hidden="true" />{label}
      </dt>
      <dd className="num mt-1 break-words text-base font-semibold">{value}</dd>
    </div>
  )
}

/** Direction mix of all coins (SHORT / NETRAL / LONG) as one bar, like the team briefing. */
function ArahCard({ rows, positive }: { rows: OutlookRow[]; positive: number }) {
  const ok = rows.filter((r) => !r.unavailable)
  const short = ok.filter((r) => r.strategy?.side === 'short').length
  const long = ok.filter((r) => r.strategy?.side === 'long').length
  const netral = ok.length - short - long
  const baru = ok.filter((r) => r.strategy?.fresh).length
  const pct = (n: number) => `${ok.length ? (n / ok.length) * 100 : 0}%`
  return (
    <TitledPanel title="Arah strategi" icon={Compass} className="h-full">
      <BigStat label="Punya arah" size="xl" value={<>{formatCount(short + long)}<span className="text-xl font-semibold text-muted-foreground"> / {formatCount(ok.length)} koin</span></>} />
      <div className="mt-5 flex h-10 w-full overflow-hidden rounded-xl text-sm font-bold" role="img"
        aria-label={`SHORT ${short}, NETRAL ${netral}, LONG ${long}`}>
        {short > 0 && <span className="flex items-center justify-center bg-bearish text-bearish-foreground" style={{ width: pct(short) }}>{short}</span>}
        {netral > 0 && <span className="flex items-center justify-center bg-muted text-muted-foreground" style={{ width: pct(netral) }}>{netral}</span>}
        {long > 0 && <span className="flex items-center justify-center bg-bullish text-bullish-foreground" style={{ width: pct(long) }}>{long}</span>}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-2xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-bearish" />SHORT {short}</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-muted-foreground/40" />NETRAL {netral}</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-bullish" />LONG {long}</span>
      </div>
      <dl className="mt-5 divide-y divide-border/60 rounded-2xl border bg-muted/30">
        <div className="flex items-center justify-between px-4 py-3">
          <dt className="text-sm text-muted-foreground">Bukti positif</dt>
          <dd className={cn('display tabular-nums text-2xl font-bold', positive > 0 && 'text-bullish')}>{formatCount(positive)}</dd>
        </div>
        {ok.some((r) => r.kualitas !== undefined) && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <dt className="text-sm text-muted-foreground">Skor</dt>
            <dd className="flex items-center gap-2.5">
              {GRADES.map((g) => (
                <span key={g} className="inline-flex items-center gap-1" title={GRADE_HINT[g]}>
                  <GradeLetter grade={g} size="xs" decorative />
                  <span className="num text-base font-bold" aria-label={`skor ${g}: ${ok.filter((r) => gradeOf(r) === g).length} koin`}>
                    {ok.filter((r) => gradeOf(r) === g).length}
                  </span>
                </span>
              ))}
            </dd>
          </div>
        )}
        <div className="flex items-center justify-between px-4 py-3">
          <dt className="text-sm text-muted-foreground">Posisi baru di close 4H terakhir</dt>
          <dd className="display tabular-nums text-2xl font-bold">{formatCount(baru)}</dd>
        </div>
      </dl>
    </TitledPanel>
  )
}

/** Compact row for calls without positive evidence. The coin name is the (stretched) link. */
function CallRow({ r }: { r: OutlookRow }) {
  const cal = r.bias.calib?.stats
  const fase = faseOf(r)
  const p = r.peluang
  return (
    <li className="group relative flex min-h-16 flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 transition-colors hover:bg-muted/40 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-inset has-[a:focus-visible]:ring-info sm:px-6">
        <span className="flex w-32 shrink-0 items-center gap-3">
          <CoinAvatar symbol={r.symbol} />
          <Link href={koinHref(r.symbol)} className="display text-base font-bold after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
            {coinLabel(r.symbol)}
          </Link>
        </span>
        <DirectionChip direction={r.bias.bias} />
        {r.kualitas !== undefined && <QualityPopover q={r.kualitas} size="sm" className="relative z-10" symbol={coinLabel(r.symbol)} />}
        <span className="flex items-center gap-2">
          <ConfidenceDots level={r.bias.keyakinan} />
          {fase && <span className="hidden text-2xs text-muted-foreground sm:inline">· {FASE_TEXT[fase].toLowerCase()}</span>}
        </span>
        <span className="ml-auto flex items-center gap-4 text-sm">
          {r.plan?.rr ? <span className="num hidden text-muted-foreground sm:inline" title={termLabel('rr')}>{termLabel('rr', { short: true })} <span className="font-semibold text-foreground">{formatRR(r.plan.rr)}</span></span> : null}
          {cal && cal.n_cases > 0 && <span className={cn('num font-semibold', signClass(cal.mean_r))}>{formatR(cal.mean_r)}</span>}
          {p && r.kualitas === undefined && <Pill tone={PELUANG_TONE[p.label]} title={p.reason}>{PELUANG_TEXT[p.label]}</Pill>}
          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
        </span>
    </li>
  )
}

const ARAH: [Arah, string][] = [['long', 'Long'], ['short', 'Short']]
type Urut = 'peluang' | 'kualitas'
const URUT: { value: Urut; label: string }[] = [{ value: 'peluang', label: 'Peluang' }, { value: 'kualitas', label: 'Skor' }]
const KEYAKINAN: [Keyakinan, string][] = [['tinggi', 'Tinggi'], ['sedang', 'Sedang'], ['rendah', 'Rendah']]
const CHIP = 'h-9 px-4 text-sm'

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
  const [urut, setUrut] = useState<Urut>('peluang')
  const all = useMemo(() => q.data?.rows ?? [], [q.data])
  const calls = useMemo(() => {
    const ranked = peluangRows(filterRows(all, filters))
    return urut === 'kualitas' ? sortRows(ranked, 'kualitas', true) : ranked
  }, [all, filters, urut])
  const best = calls.filter(isBestCall)
  const rest = calls.filter((r) => !isBestCall(r))
  const hasGrades = all.some((r) => r.kualitas !== undefined)
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
    return <div className="grid gap-5 lg:grid-cols-3" aria-busy="true"><Skeleton className="h-80 rounded-3xl lg:col-span-2" /><Skeleton className="h-80 rounded-3xl" /><Skeleton className="h-64 rounded-3xl lg:col-span-3" /></div>
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

  const topNames = best.slice(0, 3).map((r) => `${coinLabel(r.symbol)} ${r.bias.bias}${gradeOf(r) ? ` (${gradeOf(r)})` : ''}`).join(', ')
  const filtered = filters.arah.size || filters.keyakinan.size || filters.baru || filters.posisi || filters.kualitas?.size
  return (
    <div className="space-y-8">
      <AnswerCard
        tone={best.length ? 'baik' : directional ? 'perlu_dicek' : 'menunggu'}
        answer={best.length
          ? `${best.length} peluang dengan bukti positif: ${topNames}.`
          : directional
            ? `Belum ada peluang dengan bukti positif. ${directional} koin punya arah.`
            : 'Semua strategi NETRAL. Tunggu close 4H berikutnya.'}
        footer={<Freshness dataLabel="Data close 4H" dataAt={closeIso} updatedAt={meta?.computed_at} timeframe="4h" nextDelayMin={4} stale={stale} />}
      />

      <div className="flex flex-wrap items-center gap-2" aria-label="Filter">
        {ARAH.map(([v, label]) => (
          <Chip key={v} active={filters.arah.has(v)} onClick={() => setFilters((f) => ({ ...f, arah: toggle(f.arah, v) }))} className={CHIP}>{label}</Chip>
        ))}
        <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
        {KEYAKINAN.map(([v, label]) => (
          <Chip key={v} active={filters.keyakinan.has(v)} onClick={() => setFilters((f) => ({ ...f, keyakinan: toggle(f.keyakinan, v) }))} className={CHIP}>{label}</Chip>
        ))}
        {hasGrades && (
          <>
            <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
            <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Skor</span>
            {GRADES.map((g) => (
              <Chip key={g} active={filters.kualitas?.has(g)} title={`Skor ${g}: ${GRADE_HINT[g]}`}
                onClick={() => setFilters((f) => ({ ...f, kualitas: toggle(f.kualitas ?? new Set<QualityGrade>(), g) }))}
                className={cn(CHIP, 'min-w-9 px-3 font-bold')}>
                {g}
              </Chip>
            ))}
          </>
        )}
        <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
        <Chip active={filters.baru} onClick={() => setFilters((f) => ({ ...f, baru: !f.baru }))} className={CHIP}>Posisi baru</Chip>
        {q.data?.positions_available && (
          <Chip active={filters.posisi === 'ada'} onClick={() => setFilters((f) => ({ ...f, posisi: f.posisi === 'ada' ? null : 'ada' }))} className={CHIP}>
            Sudah ada posisi
          </Chip>
        )}
        {hasGrades && (
          <span className="ml-auto inline-flex items-center gap-2">
            <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Urut</span>
            <Segmented aria-label="Urutkan peluang" options={URUT} value={urut} onChange={setUrut} />
          </span>
        )}
        {admin && (
          <Button variant="outline" onClick={onRefresh} disabled={busy || refresh.isPending} className={cn('h-9 gap-2 rounded-full px-4 text-sm', !hasGrades && 'ml-auto')}>
            <RefreshCw className={cn('h-4 w-4', busy && 'animate-spin')} />
            {busy ? `Menghitung… ${q.data?.refresh?.progress?.done ?? 0}/${q.data?.refresh?.progress?.total || '—'}` : 'Hitung ulang'}
          </Button>
        )}
      </div>

      <section aria-labelledby="peluang-terbaik" className="space-y-5">
        <div>
          <h2 id="peluang-terbaik" className="display flex items-center gap-3 text-2xl font-bold">
            <IconChip icon={Target} /> Peluang terbaik
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasGrades ? 'Skor A atau B: kasus serupa di masa lalu terbukti untung.' : 'Kasus serupa di masa lalu terbukti untung.'}
          </p>
        </div>
        <BentoGrid>
          {best.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed p-8 text-center md:col-span-2">
              <Target className="h-10 w-10 text-muted-foreground/60" aria-hidden="true" />
              <p className="text-base font-semibold">Belum ada peluang dengan bukti positif{filtered ? ' (dengan filter ini)' : ''}.</p>
              <p className="text-sm text-muted-foreground">Koin lain tetap ada di daftar di bawah.</p>
            </div>
          ) : (
            <PeluangCard r={best[0]} hero />
          )}
          <ArahCard rows={all} positive={best.length} />
          {best.slice(1).map((r) => <PeluangCard key={r.symbol} r={r} />)}
        </BentoGrid>
      </section>

      <Panel className="overflow-hidden p-0 sm:p-0" aria-label="Arah lain">
        <IconTitle icon={Shuffle} title={<>Arah lain <span className="font-normal text-muted-foreground">({rest.length})</span></>}
          subtitle={hasGrades ? 'Ada posisi, tapi skornya C/D atau tidak dinilai: bukti belum positif.' : 'Ada posisi, tapi bukti historisnya belum positif.'} className="px-5 pb-4 pt-5 sm:px-6 sm:pt-6" />
        {rest.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-muted-foreground sm:px-6">Tidak ada.</p>
        ) : (
          <ul className="divide-y divide-border/60 border-t">{rest.map((r) => <CallRow key={r.symbol} r={r} />)}</ul>
        )}
      </Panel>

      {hasGrades && <RekamSkorPanel />}

      <Fold title={`${netral.length} koin NETRAL (tanpa posisi)`}>
        {netral.length === 0 ? (
          <p className="text-sm text-muted-foreground">Tidak ada.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {netral.map((r) => (
              <li key={r.symbol}>
                <Link href={koinHref(r.symbol)} className="inline-flex items-center gap-2 rounded-full border py-1 pl-1 pr-3.5 text-sm hover:bg-muted/50">
                  <CoinAvatar symbol={r.symbol} />
                  <span className="font-semibold">{coinLabel(r.symbol)}</span>
                  {r.bias?.condong && <span className="text-2xs text-muted-foreground">condong {r.bias.condong}</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-2xs text-muted-foreground">&ldquo;Condong&rdquo; hanya dari faktor konteks, belum terbukti sebagai sinyal.</p>
        {unavailable.length > 0 && (
          <p className="mt-1 text-2xs text-muted-foreground">Tidak tersedia: {unavailable.map((r) => coinLabel(r.symbol)).join(', ')}.</p>
        )}
      </Fold>

      {q.data && (
        <Fold title="Rekam jejak Outlook & uji historis">
          <OutlookTrackRecord data={q.data} />
        </Fold>
      )}

      <Fold title="Cara menghitung">
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
          {(q.data?.method.text ?? []).map((t) => <li key={t}>{t}</li>)}
          <li>Dolar: masuk di close 4H terakhir dengan SL/TP strategi, termasuk komisi 0.05% + slippage 0.05% per sisi, tanpa funding. Modal diubah di halaman koin.</li>
        </ul>
      </Fold>
      <p className="text-2xs text-muted-foreground">{DISCLAIMER}</p>
    </div>
  )
}
