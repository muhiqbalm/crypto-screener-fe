'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bookmark, CandlestickChart, CircleDashed, FlaskConical, Layers, Loader2, Lock, MoreHorizontal, PlayCircle, Trash2, TriangleAlert, XCircle } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { NextStep } from '@/components/ui/next-step'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Term } from '@/components/ui/term'
import { VerdictBadge } from '@/components/ui/verdict-badge'
import { ErrorState, LoadingState } from '@/components/shell/states'
import { PaperProgress, PresetStatusPill } from '@/components/lab/arena/PaperBits'
import { BigNumber, CardLink, CoinAvatar, CountUp, DeckCard, Meter, signTone, type Tone } from '@/components/lab/arena/deck'
import { StartPaperDialog } from '@/components/lab/arena/StartPaperDialog'
import { apiErrorDetail } from '@/lib/api/errors'
import { cn } from '@/lib/utils/cn'
import { coinOf, formatCount, formatNumber, formatPct, signClass } from '@/lib/utils/format'
import { formatTime, formatTimeframe } from '@/lib/utils/time'
import { notify } from '@/lib/utils/toast'
import { PRESET_STATUS_COPY, REVIEW_MIN_TRADES, arenaHref, driftPlain, presetStatus, strategyLabel, type PresetStatus } from '@/lib/lab/arena'
import { templateDefaults } from '@/lib/lab/paper'
import { useArenaReport } from '@/lib/queries/arena'
import { useLabTemplates } from '@/lib/queries/lab'
import { useDeletePreset, useLabPresets, useWatchFromPreset } from '@/lib/queries/lab-insights'
import type { LabPreset } from '@/lib/api/types/lab-insights'
import type { LabTemplate } from '@/lib/api/types/lab'

/** Same "many attempts" rule as the weekly report (SNOOP_RULE). */
const manyAttempts = (p: LabPreset) => Boolean(p.snooping && (p.snooping.runs >= 4 || p.snooping.timeframes >= 3 || p.snooping.trials >= 100))

type Dialog = { kind: 'paper' | 'watch' | 'delete'; preset: LabPreset } | null

interface Row {
  p: LabPreset
  status: PresetStatus
}

// ── confirm: watch only / delete ───────────────────────────────────────────

function WatchDialog({ preset, onClose }: { preset: LabPreset; onClose: () => void }) {
  const router = useRouter()
  const watch = useWatchFromPreset()
  const failed = preset.verdict === 'FAIL'
  return (
    <AlertDialog open onOpenChange={(o) => !o && !watch.isPending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Pantau sinyal <span className="num">{preset.name}</span>?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Lab menghitung sinyal preset ini tiap candle {formatTimeframe(preset.timeframe)} tutup dan menampilkannya di Chart. Tanpa paper dan tanpa order
            sungguhan. Untuk melihat hasilnya di akun simulasi, pakai &quot;Mulai paper&quot;.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {failed && (
          <p role="alert" className="flex gap-2 rounded-lg border border-bearish/40 bg-bearish/10 p-3 text-sm">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-bearish" aria-hidden="true" />
            Preset ini Gagal di uji jujur. Sinyalnya kemungkinan tidak bisa diandalkan.
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={watch.isPending}>Batal</AlertDialogCancel>
          <Button
            disabled={watch.isPending}
            onClick={() =>
              watch.mutate(
                { id: preset.id },
                {
                  onSuccess: (res) => {
                    notify.success(`Memantau ${preset.name}`, { description: 'Sinyal tampil di Chart. Tidak ada order sungguhan.' })
                    onClose()
                    router.push(`/chart?watch=${encodeURIComponent(String(res.watch_id))}`)
                  },
                  onError: (e) => notify.error('Pantauan gagal dibuat', { description: apiErrorDetail(e) ?? 'Coba lagi sebentar lagi.' }),
                },
              )
            }
          >
            {watch.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <CandlestickChart aria-hidden="true" />}
            Pantau di Chart
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function DeleteDialog({ preset, running, onClose }: { preset: LabPreset; running: boolean; onClose: () => void }) {
  const del = useDeletePreset()
  return (
    <AlertDialog open onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Hapus preset <span className="num">{preset.name}</span>?
          </AlertDialogTitle>
          <AlertDialogDescription>Uji dan pantauan yang sudah dibuat dari preset ini tidak ikut terhapus.</AlertDialogDescription>
        </AlertDialogHeader>
        {running && (
          <p role="alert" className="flex gap-2 rounded-lg border border-warn/40 bg-warn/10 p-3 text-sm">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden="true" />
            Preset ini sedang berjalan di paper. Menghapusnya menyembunyikan paper ini dari Klasemen, tapi pantauan dan akun simulasinya tetap jalan. Matikan
            paper otomatis di Chart dulu kalau ingin berhenti.
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              del.mutate(preset.id, {
                onSuccess: () => notify.info(`${preset.name} dihapus`),
                onError: (e) => notify.error('Preset gagal dihapus', { description: apiErrorDetail(e) ?? 'Coba lagi sebentar lagi.' }),
              })
            }
          >
            Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ── detail sheet (all actions; the only way to act on phones) ───────────────

function Metric({ label, value, className }: { label: React.ReactNode; value: React.ReactNode; className?: string }) {
  return (
    <div className="min-w-0 rounded-lg border bg-card p-2.5">
      <div className="text-3xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn('num mt-0.5 text-sm font-semibold', className)}>{value}</div>
    </div>
  )
}

function PresetSheet({
  row,
  templates,
  reviewN,
  onClose,
  onAction,
}: {
  row: Row | null
  templates: LabTemplate[] | undefined
  reviewN: number
  onClose: () => void
  onAction: (d: NonNullable<Dialog>) => void
}) {
  const p = row?.p
  const st = row?.status
  const h = p?.holdout
  const running = st?.kind === 'paper' || st?.kind === 'menyimpang'
  return (
    <Sheet open={Boolean(row)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {p && st && (
          <div className="space-y-5 p-5 pt-12">
            <header className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <SheetTitle className="num text-lg font-bold">{p.name}</SheetTitle>
                <PresetStatusPill status={st} />
                {p.readonly && (
                  <span className="inline-flex items-center gap-1 text-2xs text-muted-foreground">
                    <Lock className="h-3 w-3" aria-hidden="true" /> terkunci
                  </span>
                )}
              </div>
              <SheetDescription className="text-xs">
                {strategyLabel(p.template_id, templates)} · {coinOf(p.symbol)} {formatTimeframe(p.timeframe)}
                {p.live_reference && ' · setting yang sama dengan bot live'}
              </SheetDescription>
              <p className="text-sm">{PRESET_STATUS_COPY[st.kind].hint}</p>
              {st.row && running && <p className="text-sm text-muted-foreground">{driftPlain(st.row, reviewN)}</p>}
              {st.paperStopped && <p className="text-xs text-warn">Akun simulasinya ada, tapi paper otomatis sedang mati.</p>}
              {st.progress && <PaperProgress n={st.progress.n} of={st.progress.of} className="max-w-[240px]" />}
            </header>

            <div className="flex flex-wrap gap-2">
              {running ? (
                <Button asChild size="sm">
                  <Link href={arenaHref(p.id)}>
                    <PlayCircle aria-hidden="true" /> Lihat di Paper berjalan
                  </Link>
                </Button>
              ) : (
                <Button size="sm" onClick={() => onAction({ kind: 'paper', preset: p })}>
                  <PlayCircle aria-hidden="true" /> Mulai paper
                </Button>
              )}
              <Button asChild size="sm" variant="outline">
                <Link href={`/lab?preset=${encodeURIComponent(String(p.id))}`}>
                  <FlaskConical aria-hidden="true" /> Uji ulang
                </Link>
              </Button>
              <Button size="sm" variant="outline" onClick={() => onAction({ kind: 'watch', preset: p })}>
                <CandlestickChart aria-hidden="true" /> Pantau sinyal saja
              </Button>
              {!p.readonly && (
                <Button size="sm" variant="ghost" className="text-bearish" onClick={() => onAction({ kind: 'delete', preset: p })}>
                  <Trash2 aria-hidden="true" /> Hapus
                </Button>
              )}
            </div>

            <section className="space-y-2">
              <h3 className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                Hasil uji saat disimpan <VerdictBadge verdict={p.verdict} emptyLabel="tanpa rapor" />
              </h3>
              {h ? (
                <>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <Metric label={<Term k="net_return" short noTip />} value={formatPct(h.net_return_pct, { digits: 1, signed: true })} className={signClass(h.net_return_pct)} />
                    <Metric label={<Term k="profit_factor" short noTip />} value={h.profit_factor === null ? '—' : formatNumber(h.profit_factor)} />
                    <Metric label={<Term k="max_drawdown" short noTip />} value={h.max_dd_pct === null ? '—' : formatPct(-Math.abs(h.max_dd_pct), { digits: 1 })} />
                    <Metric label="Transaksi" value={h.trades === null ? '—' : formatCount(h.trades)} />
                    <Metric label={<Term k="win_rate" short noTip />} value={formatPct(h.win_rate_pct, { digits: 0 })} />
                    <Metric
                      label={<Term k="cost_stress" short noTip />}
                      value={formatPct(h.stress_net_return_pct, { digits: 1, signed: true })}
                      className={signClass(h.stress_net_return_pct)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Diukur di <Term k="holdout" short />
                    {h.start && h.end ? ` ${formatTime(h.start, { time: false, year: true })} – ${formatTime(h.end, { time: false, year: true })}` : ''}, setelah
                    biaya.
                    {p.source_run_id !== null && (
                      <>
                        {' '}
                        Dari{' '}
                        <Link href={`/lab/runs/${encodeURIComponent(String(p.source_run_id))}`} className="text-info hover:underline">
                          uji #{String(p.source_run_id)}
                        </Link>
                        .
                      </>
                    )}
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {p.live_reference
                    ? 'Tidak tersedia di Lab: preset ini dibuat dari setting bot live tanpa rapor. Acuan ujinya ada di dokumen riset.'
                    : 'Tidak tersedia: preset ini disimpan tanpa rapor uji jujur.'}
                </p>
              )}
            </section>

            {p.snooping && (
              <section className={cn('space-y-1 rounded-lg border p-3 text-xs', manyAttempts(p) && 'border-warn/40 bg-warn/[0.06]')}>
                <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                  {manyAttempts(p) && <TriangleAlert className="h-4 w-4 text-warn" aria-hidden="true" />}
                  <Term k="data_snooping" />
                </h3>
                <p className="text-muted-foreground">
                  Saat disimpan, strategi ini sudah diuji {p.snooping.runs}× di koin ini ({p.snooping.timeframes} timeframe
                  {p.snooping.trials ? `, ${formatCount(p.snooping.trials)} kombinasi setting` : ''}). Data barunya dipakai {p.snooping.holdout_touches}×.
                  {manyAttempts(p) && ' Makin banyak mencoba, makin besar peluang hasil terbaik cuma kebetulan.'}
                </p>
              </section>
            )}
            {p.notes && <p className="text-xs text-muted-foreground">Catatan: {p.notes}</p>}
            <p className="text-3xs text-muted-foreground">
              Dipakai di {p.usage.runs} uji dan {p.usage.watches} pantauan · disimpan {formatTime(p.created_at)}
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

// ── cards ──────────────────────────────────────────────────────────────────

const ORDER: PresetStatus['kind'][] = ['menyimpang', 'paper', 'lolos', 'belum_diuji', 'gagal']

type Filter = 'semua' | 'paper' | 'lolos' | 'belum_diuji' | 'gagal'
const FILTERS: { value: Filter; label: string; match: (k: PresetStatus['kind']) => boolean }[] = [
  { value: 'semua', label: 'Semua', match: () => true },
  { value: 'paper', label: 'Di paper', match: (k) => k === 'paper' || k === 'menyimpang' },
  { value: 'lolos', label: 'Lolos', match: (k) => k === 'lolos' },
  { value: 'belum_diuji', label: 'Belum diuji', match: (k) => k === 'belum_diuji' },
  { value: 'gagal', label: 'Gagal', match: (k) => k === 'gagal' },
]

function PresetCard({ row, templates, onDetail, onAction }: { row: Row; templates: LabTemplate[] | undefined; onDetail: () => void; onAction: (d: NonNullable<Dialog>) => void }) {
  const { p, status } = row
  const h = p.holdout
  const running = status.kind === 'paper' || status.kind === 'menyimpang'
  return (
    <DeckCard outline={status.kind === 'menyimpang' ? 'warn' : undefined} id={`preset-${p.id}`} className="scroll-mt-24">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <CoinAvatar coin={p.symbol} size={44} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {p.readonly && <Lock className="h-4 w-4 shrink-0 text-lab" aria-label="Terkunci: setting bot live" />}
              <h3 className="font-display truncate text-lg font-semibold tracking-tight">{p.name}</h3>
            </div>
            <div className="truncate text-[13px] text-muted-foreground">
              {strategyLabel(p.template_id, templates)} · {formatTimeframe(p.timeframe)}
              {p.live_reference && ' · setting bot live'}
            </div>
          </div>
        </div>
        <PresetStatusPill status={status} />
      </div>

      <div className="mt-5 grid grid-cols-3 gap-4">
        <BigNumber
          label="Hasil uji"
          value={h?.net_return_pct === null || h?.net_return_pct === undefined ? '—' : <CountUp value={h.net_return_pct} format={(v) => formatPct(v, { digits: 1, signed: true })} />}
          tone={signTone(h?.net_return_pct)}
          size="sm"
        />
        <BigNumber
          label="Drawdown"
          value={h?.max_dd_pct === null || h?.max_dd_pct === undefined ? '—' : formatPct(-Math.abs(h.max_dd_pct), { digits: 1 })}
          tone={h?.max_dd_pct ? 'bearish' : undefined}
          size="sm"
        />
        <BigNumber label="Transaksi uji" value={h?.trades === null || h?.trades === undefined ? '—' : formatCount(h.trades)} size="sm" />
      </div>

      <div className="mt-5 min-h-[44px]">
        {status.progress ? (
          <div className="space-y-2">
            <div className="flex justify-between text-[13px]">
              <span className="text-muted-foreground">Transaksi paper</span>
              <span className="font-semibold tabular-nums">
                {status.progress.n}/{status.progress.of}
              </span>
            </div>
            <Meter value={status.progress.n} max={status.progress.of} tone={status.kind === 'menyimpang' ? 'warn' : 'lab'} label={`${status.progress.n} dari ${status.progress.of} transaksi paper`} />
          </div>
        ) : (
          <p className="text-[13px] text-muted-foreground">
            {status.paperStopped ? 'Paper otomatis mati.' : status.kind === 'gagal' ? 'Gagal uji jujur saat disimpan.' : !h ? 'Belum punya rapor uji.' : 'Belum dijalankan di paper.'}
          </p>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t pt-4">
        {running ? (
          <Button asChild size="sm" className="rounded-full">
            <Link href={arenaHref(p.id)}>
              <PlayCircle aria-hidden="true" /> Lihat paper
            </Link>
          </Button>
        ) : (
          <Button size="sm" className="rounded-full" variant={status.kind === 'gagal' ? 'outline' : 'default'} onClick={() => onAction({ kind: 'paper', preset: p })}>
            <PlayCircle aria-hidden="true" /> Mulai paper
          </Button>
        )}
        <Button asChild size="sm" variant="outline" className="rounded-full">
          <Link href={`/lab?preset=${encodeURIComponent(String(p.id))}`}>
            <FlaskConical aria-hidden="true" /> Uji ulang
          </Link>
        </Button>
        <Button size="sm" variant="ghost" className="ml-auto rounded-full" onClick={onDetail} aria-label={`Detail dan aksi lain ${p.name}`}>
          <MoreHorizontal aria-hidden="true" /> Detail
        </Button>
      </div>
    </DeckCard>
  )
}

// ── page ───────────────────────────────────────────────────────────────────

export function PresetsView() {
  const q = useLabPresets()
  const templatesQ = useLabTemplates()
  const arenaQ = useArenaReport()
  const [dialog, setDialog] = useState<Dialog>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('semua')
  const templates = templatesQ.data
  const reviewN = arenaQ.data?.review_min_trades ?? REVIEW_MIN_TRADES
  const rows: Row[] = useMemo(
    () =>
      (q.data ?? [])
        .map((p) => ({ p, status: presetStatus(p, arenaQ.data?.rows, reviewN) }))
        .sort((x, y) => ORDER.indexOf(x.status.kind) - ORDER.indexOf(y.status.kind) || x.p.symbol.localeCompare(y.p.symbol) || x.p.name.localeCompare(y.p.name)),
    [q.data, arenaQ.data, reviewN],
  )
  const onAction = useMemo(() => (d: NonNullable<Dialog>) => setDialog(d), [])
  const open = rows.find((r) => String(r.p.id) === openId) ?? null
  const defaults = (p: LabPreset) => templateDefaults(templates?.find((t) => t.id === p.template_id))

  if (q.isPending) return <LoadingState rows={6} label="Memuat preset…" />
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} title="Preset tidak bisa dimuat" />
  if (rows.length === 0) {
    return (
      <NextStep
        title="Belum ada preset"
        description="Buka satu hasil uji yang selesai, lalu pilih Simpan sebagai preset."
        action={{ label: 'Buka Hasil uji', href: '/lab/hasil', icon: FlaskConical }}
      />
    )
  }
  const n = (k: PresetStatus['kind']) => rows.filter((r) => r.status.kind === k).length
  const paper = n('paper') + n('menyimpang')
  const shown = rows.filter((r) => FILTERS.find((f) => f.value === filter)!.match(r.status.kind))
  const heroTone: Tone = n('menyimpang') ? 'warn' : paper ? 'lab' : 'info'
  const answer = paper
    ? `${paper} preset berjalan di paper${n('menyimpang') ? `, ${n('menyimpang')} menyimpang` : ''}. ${n('lolos') ? `${n('lolos')} lolos uji siap kamu jalankan.` : 'Tidak ada preset lolos yang menunggu.'}`
    : n('lolos')
      ? `Belum ada yang di paper. ${n('lolos')} preset lolos uji siap kamu jalankan.`
      : 'Belum ada yang di paper, dan belum ada preset yang lolos uji.'

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
        <DeckCard hero fill icon={Layers} iconTone={heroTone} eyebrow={`${rows.length} preset`} className="col-span-2 lg:row-span-2">
          <p className="text-xl font-semibold leading-snug tracking-tight sm:text-2xl">{answer}</p>
          <div className="mt-auto space-y-3 pt-6">
            <p className="text-[15px] text-muted-foreground">Lolos/Gagal = rapor saat disimpan. Paper dinilai setelah {reviewN} transaksi.</p>
            {arenaQ.data?.rows.length ? <CardLink href="/lab/arena">Buka Paper berjalan</CardLink> : null}
            {arenaQ.isError && <p className="text-[13px] text-warn">Status paper tidak tersedia saat ini.</p>}
          </div>
        </DeckCard>
        <DeckCard icon={PlayCircle} iconTone="lab" title="Di paper">
          <BigNumber label="Preset" value={<CountUp value={paper} format={(v) => formatCount(Math.round(v))} />} size="lg" hint={n('menyimpang') ? `${n('menyimpang')} menyimpang` : 'semua sesuai sejauh ini'} />
        </DeckCard>
        <DeckCard icon={Bookmark} iconTone="bullish" title="Lolos, belum jalan">
          <BigNumber label="Preset" value={<CountUp value={n('lolos')} format={(v) => formatCount(Math.round(v))} />} tone={n('lolos') ? 'bullish' : undefined} size="lg" hint="siap Mulai paper" />
        </DeckCard>
        <DeckCard icon={CircleDashed} iconTone="muted" title="Belum diuji">
          <BigNumber label="Preset" value={formatCount(n('belum_diuji'))} size="lg" hint="tanpa rapor uji" />
        </DeckCard>
        <DeckCard icon={XCircle} iconTone="bearish" title="Gagal">
          <BigNumber label="Preset" value={formatCount(n('gagal'))} tone={n('gagal') ? 'bearish' : undefined} size="lg" hint="gagal uji jujur" />
        </DeckCard>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Saring preset">
        {FILTERS.map((f) => {
          const count = rows.filter((r) => f.match(r.status.kind)).length
          const active = filter === f.value
          return (
            <button
              key={f.value}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(f.value)}
              className={cn(
                'inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
                active ? 'border-info/50 bg-info/12 text-info' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              {f.label}
              <span className="tabular-nums opacity-70">{count}</span>
            </button>
          )
        })}
      </div>

      {shown.length === 0 ? (
        <p className="rounded-3xl border border-dashed p-8 text-center text-[15px] text-muted-foreground">Tidak ada preset dengan status ini.</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {shown.map((row) => (
            <PresetCard key={String(row.p.id)} row={row} templates={templates} onDetail={() => setOpenId(String(row.p.id))} onAction={onAction} />
          ))}
        </div>
      )}

      <details className="rounded-3xl border bg-card px-6 py-4">
        <summary className="cursor-pointer select-none text-[17px] font-semibold tracking-tight">Tentang preset</summary>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-muted-foreground">
          <li>Satu preset = satu strategi dengan parameter tetap untuk satu koin dan timeframe, mis. 4H-ETH-Basic.</li>
          <li>4H-ETH-Basic adalah setting bot live ETH 4H: terkunci, tidak bisa diubah atau dihapus.</li>
          <li>&quot;Mulai paper&quot; membuat akun simulasi 10,000 USDT dengan ukuran posisi seperti uji. Tidak ada order sungguhan.</li>
        </ul>
      </details>

      <PresetSheet row={open} templates={templates} reviewN={reviewN} onClose={() => setOpenId(null)} onAction={(d) => { setOpenId(null); setDialog(d) }} />
      {dialog?.kind === 'paper' && (
        <StartPaperDialog
          preset={{ ...dialog.preset, params: dialog.preset.params as Record<string, unknown> }}
          defaults={defaults(dialog.preset)}
          open
          onOpenChange={(o) => !o && setDialog(null)}
        />
      )}
      {dialog?.kind === 'watch' && <WatchDialog preset={dialog.preset} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'delete' && (
        <DeleteDialog
          preset={dialog.preset}
          running={['paper', 'menyimpang'].includes(rows.find((r) => r.p.id === dialog.preset.id)?.status.kind ?? '')}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  )
}
