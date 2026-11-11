'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Bookmark, CandlestickChart, FlaskConical, Loader2, Lock, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { ErrorPanel } from '@/components/shell/ErrorPanel'
import { EmptyState, Section } from '@/components/lab/Section'
import { VerdictBadge, signClass } from '@/components/lab/LabBadges'
import { presetTone } from '@/components/lab/PresetSelect'
import { ApiError, apiErrorDetail } from '@/lib/api/errors'
import { formatPercent, formatScore, valueOrDash } from '@/lib/utils/format'
import { notify } from '@/lib/utils/toast'
import { cn } from '@/lib/utils/cn'
import { sortTimeframes } from '@/lib/lab/timeframes'
import { familyName } from '@/lib/lab/planning'
import { useLabTemplates } from '@/lib/queries/lab'
import { useDeletePreset, useLabPresets, useWatchFromPreset } from '@/lib/queries/lab-insights'
import { usePaperAccounts } from '@/lib/queries/paper'
import type { LabPreset } from '@/lib/api/types/lab-insights'

function WatchButtons({ preset }: { preset: LabPreset }) {
  const router = useRouter()
  const watch = useWatchFromPreset()
  const [open, setOpen] = useState(false)
  const [account, setAccount] = useState('')
  const accountsQ = usePaperAccounts(open)
  const start = (accountId?: string) =>
    watch.mutate(
      { id: preset.id, accountId },
      {
        onSuccess: (res) => {
          notify.success(`Memantau ${preset.name}`, { description: accountId ? 'Paper otomatis aktif (simulasi, tanpa order sungguhan).' : 'Sinyal tampil di Chart.' })
          router.push(`/chart?watch=${encodeURIComponent(String(res.watch_id))}`)
        },
        onError: (err) => notify.error('Gagal membuat watch', { description: apiErrorDetail(err) ?? undefined }),
      },
    )
  return (
    <>
      <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" disabled={watch.isPending} onClick={() => start()}>
        {watch.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CandlestickChart className="h-3.5 w-3.5" />}
        Pantau
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <Button size="sm" variant="ghost" className="h-7 text-xs">+ Paper otomatis</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pantau {preset.name} + paper otomatis</AlertDialogTitle>
            <AlertDialogDescription>
              Sinyal preset ini dieksekusi otomatis di akun <b>paper</b> (simulasi). Tidak ada order sungguhan ke exchange.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {accountsQ.isPending ? (
            <Skeleton className="h-9 w-full" />
          ) : (accountsQ.data ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">Belum ada akun paper. Buat dulu di <Link href="/journal" className="underline">Jurnal</Link>.</p>
          ) : (
            <select aria-label="Akun paper" value={account} onChange={(e) => setAccount(e.target.value)} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
              <option value="" className="bg-popover">— pilih akun paper —</option>
              {(accountsQ.data ?? []).map((a) => <option key={String(a.id)} value={String(a.id)} className="bg-popover">{a.name}</option>)}
            </select>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction disabled={!account} onClick={() => start(account)}>Mulai paper otomatis</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function DeleteButton({ preset }: { preset: LabPreset }) {
  const del = useDeletePreset()
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-bearish" aria-label={`Hapus ${preset.name}`}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus preset {preset.name}?</AlertDialogTitle>
          <AlertDialogDescription>Run dan watch yang sudah dibuat dari preset ini tidak ikut terhapus.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction onClick={() => del.mutate(preset.id, { onSuccess: () => notify.info(`${preset.name} dihapus`), onError: (e) => notify.error('Gagal menghapus', { description: apiErrorDetail(e) ?? undefined }) })}>
            Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function PresetRow({ p }: { p: LabPreset }) {
  const h = p.holdout
  const many = p.snooping && (p.snooping.runs >= 4 || p.snooping.timeframes >= 3 || p.snooping.trials >= 100)
  return (
    <tr className={cn(p.live_reference && 'bg-lab/[0.04]')}>
      <td className="px-3 py-2.5">
        <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold', presetTone(p))}>
          {p.readonly ? <Lock className="h-3 w-3" aria-label="read-only" /> : <Bookmark className="h-3 w-3" aria-hidden="true" />}
          <span className="num">{p.name}</span>
        </span>
        {p.live_reference && <span className="ml-1.5 text-3xs font-medium uppercase tracking-wide text-lab">referensi live</span>}
        {p.template_id !== 'rosyade_family' && <span className="ml-1.5 font-mono text-3xs text-muted-foreground">{p.template_id}</span>}
        {p.notes && <span className="mt-0.5 block max-w-[320px] text-3xs text-muted-foreground">{p.notes}</span>}
      </td>
      <td className="px-3 py-2.5">
        {p.live_reference ? <span className="text-2xs text-muted-foreground">setting live</span> : p.verdict ? <VerdictBadge verdict={p.verdict} /> : <span className="text-2xs text-muted-foreground">tanpa rapor</span>}
        {p.source_run_id !== null && (
          <Link href={`/lab/runs/${encodeURIComponent(String(p.source_run_id))}`} className="block text-3xs text-muted-foreground hover:underline">dari run #{String(p.source_run_id)}</Link>
        )}
      </td>
      <td className="num px-3 py-2.5 text-right text-xs">{h?.profit_factor === null || h?.profit_factor === undefined ? '—' : formatScore(h.profit_factor)}</td>
      <td className={cn('num px-3 py-2.5 text-right text-xs', signClass(h?.net_return_pct))}>{formatPercent(h?.net_return_pct ?? null, 1)}</td>
      <td className={cn('num px-3 py-2.5 text-right text-xs', typeof h?.max_dd_pct === 'number' && 'text-bearish')}>{h?.max_dd_pct === null || h?.max_dd_pct === undefined ? '—' : `−${formatScore(Math.abs(h.max_dd_pct), 1)}%`}</td>
      <td className="num px-3 py-2.5 text-right text-xs">{valueOrDash(h?.trades)}</td>
      <td className="px-3 py-2.5 text-2xs text-muted-foreground">
        {p.snooping ? (
          <span className={cn('num inline-flex items-center gap-1', many && 'text-warn')} title="Jumlah percobaan untuk koin + strategi ini saat preset disimpan">
            {many && <AlertTriangle className="h-3 w-3" aria-hidden="true" />}
            {p.snooping.runs} run · {p.snooping.timeframes} TF{p.snooping.trials ? ` · ${p.snooping.trials} percobaan` : ''}
          </span>
        ) : '—'}
        <span className="block">dipakai {p.usage.runs} run · {p.usage.watches} watch</span>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex flex-wrap items-center justify-end gap-1">
          <Button asChild size="sm" className="h-7 gap-1.5 text-xs">
            <Link href={`/lab?preset=${encodeURIComponent(String(p.id))}`}><FlaskConical className="h-3.5 w-3.5" />Uji</Link>
          </Button>
          <WatchButtons preset={p} />
          {!p.readonly && <DeleteButton preset={p} />}
        </div>
      </td>
    </tr>
  )
}

export function PresetsView() {
  const q = useLabPresets()
  const templatesQ = useLabTemplates()
  const presets = q.data ?? []
  const family = (templatesQ.data ?? []).length > 1
    ? (templatesQ.data ?? []).map((t) => t.name).join(' / ')
    : familyName(templatesQ.data?.[0]?.name)
  const coins = Array.from(new Set(presets.map((p) => p.symbol)))

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-lab/30 bg-lab/[0.06] px-4 py-3 text-xs text-muted-foreground">
        <p>
          {(templatesQ.data ?? []).length > 1 ? 'Logika strategi per template' : 'Satu logika strategi'} (<span className="font-medium text-foreground">{family}</span>), <b className="text-foreground">parameter berbeda per koin &amp; timeframe</b>. Preset bernama{' '}
          <span className="num text-foreground">{'{TF}-{KOIN}-{Label}'}</span>, mis. <span className="num text-foreground">4H-ETH-Basic</span> atau <span className="num text-foreground">1H-BTC-Opt1</span>.
        </p>
        <p className="mt-1">
          <span className="num text-foreground">4H-ETH-Basic</span> = setting live ETH 4H, terkunci (tidak bisa diubah/dihapus). Jangan berharap setting itu cocok di koin atau timeframe lain — uji & simpan preset sendiri. Simpan preset dari halaman detail run yang sudah selesai.
        </p>
      </div>

      {q.isPending ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : q.error ? (
        <Section><ErrorPanel kind={q.error instanceof ApiError ? q.error.kind : 'server'} onRetry={() => q.refetch()} messageOverride="Gagal memuat preset dari server Lab." /></Section>
      ) : presets.length === 0 ? (
        <Section><EmptyState icon={<Bookmark className="h-8 w-8" />} title="Belum ada preset" description="Buka run yang sudah selesai, lalu klik Simpan sebagai preset." /></Section>
      ) : (
        coins.map((c) => {
          const list = presets.filter((p) => p.symbol === c)
          const order = sortTimeframes(Array.from(new Set(list.map((p) => p.timeframe))))
          list.sort((a, b) => order.indexOf(a.timeframe) - order.indexOf(b.timeframe) || Number(b.live_reference) - Number(a.live_reference))
          return (
            <Section key={c} title={<span className="num">{c.replace(/USDT$/, '')}</span>} icon={<Bookmark className="h-4 w-4 text-lab" />} description={`${list.length} preset · ${order.join(', ')}`}>
              <div className="-mx-4 overflow-x-auto sm:mx-0 sm:rounded-lg sm:border sm:border-border">
                <table className="w-full min-w-[860px] text-sm">
                  <thead className="border-b border-border bg-muted/30">
                    <tr>
                      {['Preset', 'Rapor saat disimpan', 'PF holdout', 'Return holdout', 'Max DD', 'Trade', 'Percobaan', ''].map((hd, i) => (
                        <th key={hd || i} className={cn('px-3 py-2 text-2xs font-medium uppercase tracking-wide text-muted-foreground', i >= 2 && i <= 5 ? 'text-right' : 'text-left')}>{hd}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {list.map((p) => <PresetRow key={String(p.id)} p={p} />)}
                  </tbody>
                </table>
              </div>
            </Section>
          )
        })
      )}
    </div>
  )
}
