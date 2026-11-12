'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bookmark, CandlestickChart, FlaskConical, Loader2, Lock, PlayCircle, Trash2, TriangleAlert } from 'lucide-react'
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
import { AnswerCard, type AnswerTone } from '@/components/ui/answer-card'
import { Button } from '@/components/ui/button'
import { NextStep } from '@/components/ui/next-step'
import { ResponsiveTable, type ResponsiveColumn } from '@/components/ui/responsive-table'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Term } from '@/components/ui/term'
import { VerdictBadge } from '@/components/ui/verdict-badge'
import { ErrorState, LoadingState } from '@/components/shell/states'
import { Section } from '@/components/lab/Section'
import { PaperProgress, PresetStatusPill } from '@/components/lab/arena/PaperBits'
import { StartPaperDialog } from '@/components/lab/arena/StartPaperDialog'
import { apiErrorDetail } from '@/lib/api/errors'
import { cn } from '@/lib/utils/cn'
import { displaySymbol, formatCount, formatNumber, formatPct, signClass } from '@/lib/utils/format'
import { formatTime, formatTimeframe } from '@/lib/utils/time'
import { notify } from '@/lib/utils/toast'
import { sortTimeframes } from '@/lib/lab/timeframes'
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
                {strategyLabel(p.template_id, templates)} · {displaySymbol(p.symbol)} {formatTimeframe(p.timeframe)}
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

// ── table ──────────────────────────────────────────────────────────────────

function useColumns(templates: LabTemplate[] | undefined, onAction: (d: NonNullable<Dialog>) => void): ResponsiveColumn<Row>[] {
  return useMemo(
    () => [
      {
        key: 'preset',
        header: 'Preset',
        mobile: 'title',
        cell: ({ p }) => (
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              {p.readonly ? (
                <Lock className="h-3.5 w-3.5 shrink-0 text-lab" aria-label="Terkunci: setting bot live, tidak bisa diubah atau dihapus" />
              ) : (
                <Bookmark className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              )}
              <span className="num truncate font-semibold">{p.name}</span>
            </div>
            <div className="truncate text-3xs font-normal text-muted-foreground">
              {strategyLabel(p.template_id, templates)} · {formatTimeframe(p.timeframe)}
              {p.live_reference && ' · setting bot live'}
            </div>
          </div>
        ),
      },
      {
        key: 'status',
        header: <Term k="preset_status" short />,
        mobileLabel: 'Status',
        mobile: 'badge',
        cell: ({ status }) => (
          <div className="flex flex-col items-start gap-1">
            <PresetStatusPill status={status} />
            {status.progress && (
              <span className="num hidden text-3xs text-muted-foreground sm:inline">
                {status.progress.n}/{status.progress.of} transaksi
              </span>
            )}
            {status.paperStopped && <span className="hidden text-3xs text-warn sm:inline">paper otomatis mati</span>}
          </div>
        ),
      },
      {
        key: 'net',
        header: 'Hasil uji',
        mobile: 'field',
        align: 'right',
        cell: ({ p }) => (
          <span className={cn('num', signClass(p.holdout?.net_return_pct))}>
            {p.holdout ? formatPct(p.holdout.net_return_pct, { digits: 1, signed: true }) : '—'}
          </span>
        ),
      },
      {
        key: 'dd',
        header: <Term k="max_drawdown" short />,
        mobileLabel: 'Turun terdalam',
        mobile: 'field',
        align: 'right',
        cell: ({ p }) => (
          <span className="num">{p.holdout?.max_dd_pct === null || p.holdout?.max_dd_pct === undefined ? '—' : formatPct(-Math.abs(p.holdout.max_dd_pct), { digits: 1 })}</span>
        ),
      },
      {
        key: 'trades',
        header: 'Transaksi uji',
        mobileLabel: 'Transaksi',
        mobile: 'field',
        align: 'right',
        cell: ({ p }) => <span className="num">{p.holdout?.trades === null || p.holdout?.trades === undefined ? '—' : formatCount(p.holdout.trades)}</span>,
      },
      {
        key: 'pf',
        header: <Term k="profit_factor" short />,
        mobile: 'hidden',
        align: 'right',
        cell: ({ p }) => <span className="num">{p.holdout?.profit_factor === null || p.holdout?.profit_factor === undefined ? '—' : formatNumber(p.holdout.profit_factor)}</span>,
      },
      {
        key: 'tries',
        header: 'Percobaan',
        mobile: 'hidden',
        cell: ({ p }) =>
          p.snooping ? (
            <span className={cn('num inline-flex items-center gap-1 text-2xs', manyAttempts(p) ? 'text-warn' : 'text-muted-foreground')}>
              {manyAttempts(p) && <TriangleAlert className="h-3 w-3" aria-label="Sudah banyak dicoba" />}
              {p.snooping.runs} uji · {p.snooping.timeframes} TF
            </span>
          ) : (
            <span className="text-2xs text-muted-foreground">—</span>
          ),
      },
      {
        key: 'actions',
        header: <span className="sr-only">Aksi</span>,
        mobile: 'hidden',
        align: 'right',
        cell: ({ p, status }) => (
          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            {status.kind === 'paper' || status.kind === 'menyimpang' ? (
              <Button asChild size="sm" variant="outline" className="h-7 gap-1 text-xs">
                <Link href={arenaHref(p.id)}>Lihat paper</Link>
              </Button>
            ) : (
              <Button size="sm" className="h-7 gap-1 text-xs" onClick={() => onAction({ kind: 'paper', preset: p })}>
                <PlayCircle className="h-3.5 w-3.5" aria-hidden="true" /> Mulai paper
              </Button>
            )}
            <Button asChild size="sm" variant="ghost" className="h-7 gap-1 text-xs">
              <Link href={`/lab?preset=${encodeURIComponent(String(p.id))}`}>
                <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" /> Uji
              </Link>
            </Button>
          </div>
        ),
      },
    ],
    [templates, onAction],
  )
}

// ── page ───────────────────────────────────────────────────────────────────

function answerOf(rows: Row[]): { tone: AnswerTone; text: string } {
  const n = (k: PresetStatus['kind']) => rows.filter((r) => r.status.kind === k).length
  const paper = n('paper') + n('menyimpang')
  const parts = [
    `${rows.length} preset`,
    paper ? `${paper} berjalan di paper${n('menyimpang') ? ` (${n('menyimpang')} menyimpang)` : ''}` : 'belum ada yang berjalan di paper',
    `${n('lolos')} lolos uji menunggu dijalankan`,
    `${n('gagal')} gagal`,
    `${n('belum_diuji')} belum diuji`,
  ]
  const tone: AnswerTone = n('menyimpang') ? 'perlu_dicek' : 'info'
  const next = n('lolos') ? ' Langkah berikutnya: pilih preset yang lolos lalu tekan Mulai paper.' : ''
  return { tone, text: `${parts.join(', ')}.${next}` }
}

export function PresetsView() {
  const q = useLabPresets()
  const templatesQ = useLabTemplates()
  const arenaQ = useArenaReport()
  const [dialog, setDialog] = useState<Dialog>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const templates = templatesQ.data
  const reviewN = arenaQ.data?.review_min_trades ?? REVIEW_MIN_TRADES
  const rows: Row[] = useMemo(
    () => (q.data ?? []).map((p) => ({ p, status: presetStatus(p, arenaQ.data?.rows, reviewN) })),
    [q.data, arenaQ.data, reviewN],
  )
  const onAction = useMemo(() => (d: NonNullable<Dialog>) => setDialog(d), [])
  const cols = useColumns(templates, onAction)
  const coins = Array.from(new Set(rows.map((r) => r.p.symbol)))
  const open = rows.find((r) => String(r.p.id) === openId) ?? null
  const defaults = (p: LabPreset) => templateDefaults(templates?.find((t) => t.id === p.template_id))

  if (q.isPending) return <LoadingState rows={6} label="Memuat preset…" />
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} title="Preset tidak bisa dimuat" />
  if (rows.length === 0) {
    return (
      <NextStep
        title="Belum ada preset"
        description="Preset dibuat dari hasil uji yang sudah selesai: buka satu hasil lalu pilih Simpan sebagai preset."
        action={{ label: 'Buka Hasil uji', href: '/lab/hasil', icon: FlaskConical }}
      />
    )
  }
  const a = answerOf(rows)

  return (
    <div className="space-y-5">
      <AnswerCard
        tone={a.tone}
        title="Preset kamu"
        answer={a.text}
        evidenceHref={arenaQ.data?.rows.length ? '/lab/arena' : undefined}
        evidenceLabel="Buka Paper berjalan"
        footer={
          arenaQ.isError ? (
            <span className="text-warn">Status paper tidak tersedia: Paper berjalan tidak bisa dimuat.</span>
          ) : (
            <span>Status &quot;Lolos/Gagal&quot; adalah rapor saat preset disimpan. Paper dinilai setelah {reviewN} transaksi.</span>
          )
        }
      />

      {coins.map((c) => {
        const list = rows.filter((r) => r.p.symbol === c)
        const order = sortTimeframes(Array.from(new Set(list.map((r) => r.p.timeframe))))
        list.sort((x, y) => order.indexOf(x.p.timeframe) - order.indexOf(y.p.timeframe) || Number(y.p.live_reference) - Number(x.p.live_reference))
        return (
          <Section
            key={c}
            id={`coin-${c}`}
            title={<span className="num">{displaySymbol(c)}</span>}
            icon={<Bookmark className="h-4 w-4 text-lab" aria-hidden="true" />}
            description={`${list.length} preset · ${order.map(formatTimeframe).join(', ')}`}
          >
            <ResponsiveTable
              rows={list}
              columns={cols}
              rowKey={(r) => String(r.p.id)}
              onRowClick={(r) => setOpenId(String(r.p.id))}
              rowLabel={(r) => `Detail dan aksi ${r.p.name}`}
              caption={`Preset ${displaySymbol(c)}`}
            />
          </Section>
        )
      })}

      <details className="rounded-xl border bg-card px-4 py-3 text-sm sm:px-5">
        <summary className="cursor-pointer select-none font-semibold tracking-tight">Tentang preset</summary>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-muted-foreground">
          <li>
            Satu preset = satu strategi dengan parameter tetap untuk satu koin dan timeframe. Namanya <span className="num">{'{TF}-{KOIN}-{Label}'}</span>, mis.{' '}
            <span className="num">4H-ETH-Basic</span>.
          </li>
          <li>
            <span className="num">4H-ETH-Basic</span> adalah setting bot live ETH 4H. Preset ini terkunci: tidak bisa diubah atau dihapus. Jangan berharap setting itu
            cocok di koin atau timeframe lain.
          </li>
          <li>Simpan preset dari hasil uji yang sudah selesai. Rapor Lolos/Gagal di sini adalah rapor saat preset disimpan.</li>
          <li>
            &quot;Mulai paper&quot; membuat akun simulasi 10,000 USDT dengan ukuran posisi seperti uji, lalu menjalankan sinyal preset di sana. Tidak ada order
            sungguhan.
          </li>
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
