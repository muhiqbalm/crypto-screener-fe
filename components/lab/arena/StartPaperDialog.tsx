'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, PlayCircle, TriangleAlert } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StatusPill } from '@/components/ui/status-pill'
import { Term } from '@/components/ui/term'
import { apiErrorDetail } from '@/lib/api/errors'
import { formatNumber } from '@/lib/utils/format'
import { formatTimeframe } from '@/lib/utils/time'
import { notify } from '@/lib/utils/toast'
import { arenaHref } from '@/lib/lab/arena'
import { PAPER_START_BALANCE, mirrorSizing, paperAccountName } from '@/lib/lab/paper'
import { usePaperAccounts, useStartPaper } from '@/lib/queries/paper'
import type { LabId } from '@/lib/api/types/lab'

export interface StartPaperPreset {
  id: LabId
  name: string
  timeframe: string
  verdict: string | null
  live_reference?: boolean
  params: Record<string, unknown> | null
}

/**
 * Confirm step for "Mulai paper". Default: a new simulated account (10,000 USDT) whose
 * position size mirrors the preset's test, so Paper berjalan can compare like with like.
 * Extra warning for a GAGAL preset; a note for a preset without a test report.
 * On success it navigates to /lab/arena?highlight=<presetId>.
 */
export function StartPaperDialog({
  preset,
  defaults,
  open,
  onOpenChange,
}: {
  preset: StartPaperPreset
  /** Template defaults (lib/lab/paper templateDefaults), for presets that store only overrides. */
  defaults: Record<string, unknown>
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const start = useStartPaper()
  const accountsQ = usePaperAccounts(open)
  const sizing = mirrorSizing(preset.params, defaults)
  const [mode, setMode] = useState<'new' | 'existing'>(sizing.ok ? 'new' : 'existing')
  const [balance, setBalance] = useState(String(PAPER_START_BALANCE))
  const [accountId, setAccountId] = useState('')
  const amount = Number(balance)
  const amountOk = Number.isFinite(amount) && amount > 0 && amount <= 1e9
  const canStart = mode === 'new' ? sizing.ok && amountOk : Boolean(accountId)
  const failed = preset.verdict === 'FAIL'
  const untested = !preset.verdict && !preset.live_reference

  const submit = () =>
    start.mutate(
      mode === 'new' && sizing.ok
        ? { preset, sizing: { risk_pct: sizing.risk_pct, leverage_max: sizing.leverage_max }, startingBalance: amount }
        : { preset, accountId },
      {
        onSuccess: (res) => {
          notify.success(`Paper ${preset.name} dimulai`, { description: 'Simulasi saja, tidak ada order sungguhan.' })
          onOpenChange(false)
          router.push(arenaHref(res.presetId))
        },
        onError: (e) => notify.error('Paper gagal dimulai', { description: apiErrorDetail(e) ?? 'Coba lagi sebentar lagi.' }),
      },
    )

  return (
    <AlertDialog open={open} onOpenChange={(o) => !start.isPending && onOpenChange(o)}>
      <AlertDialogContent className="max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex flex-wrap items-center gap-2">
            Mulai paper untuk <span className="num">{preset.name}</span>? <StatusPill kind="paper" />
          </AlertDialogTitle>
          <AlertDialogDescription>
            Lab menghitung sinyal preset ini tiap candle {formatTimeframe(preset.timeframe)} tutup lalu membuka posisi di akun simulasi.{' '}
            <b>Tidak ada order sungguhan</b> ke exchange. Hasilnya muncul di Paper berjalan.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {failed && (
          <div role="alert" className="flex gap-2 rounded-lg border border-bearish/40 bg-bearish/10 p-3 text-sm">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-bearish" aria-hidden="true" />
            <p>
              <b>Preset ini Gagal di uji jujur.</b> Hasil paper kemungkinan juga buruk. Jalankan hanya kalau kamu memang ingin melihat perilakunya di pasar
              sekarang.
            </p>
          </div>
        )}
        {untested && (
          <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
            Preset ini belum diuji, jadi Paper berjalan tidak punya acuan untuk menilai &quot;Sesuai uji?&quot;.
          </p>
        )}

        <fieldset className="space-y-3">
          <legend className="sr-only">Akun simulasi</legend>
          <label className="flex cursor-pointer items-start gap-2 rounded-lg border p-3 has-[:checked]:border-lab/50 has-[:checked]:bg-lab/[0.06]">
            <input type="radio" name="paper-account" className="mt-1" checked={mode === 'new'} disabled={!sizing.ok} onChange={() => setMode('new')} />
            <span className="min-w-0 space-y-2 text-sm">
              <span className="block font-medium">
                Akun simulasi baru: <span className="num">{paperAccountName(preset.name)}</span>
              </span>
              {sizing.ok ? (
                <>
                  <span className="flex flex-wrap items-center gap-2">
                    <Label htmlFor="paper-balance" className="text-xs">Saldo awal (USDT)</Label>
                    <Input
                      id="paper-balance"
                      inputMode="decimal"
                      value={balance}
                      onChange={(e) => setBalance(e.target.value.replace(/[^\d.]/g, ''))}
                      disabled={mode !== 'new'}
                      aria-invalid={!amountOk}
                      className="h-8 w-32 font-mono text-sm"
                    />
                    {amountOk && <span className="num text-xs text-muted-foreground">{formatNumber(amount)} USDT</span>}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    <Term k="mirror_sizing" variant="underline" />: {sizing.summary}.
                  </span>
                </>
              ) : (
                <span className="block text-xs text-warn">{sizing.reason} Pakai akun yang sudah ada, atau ubah sizing di Uji strategi.</span>
              )}
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-2 rounded-lg border p-3 has-[:checked]:border-lab/50 has-[:checked]:bg-lab/[0.06]">
            <input type="radio" name="paper-account" className="mt-1" checked={mode === 'existing'} onChange={() => setMode('existing')} />
            <span className="min-w-0 flex-1 space-y-2 text-sm">
              <span className="block font-medium">Pakai akun simulasi yang sudah ada</span>
              <select
                aria-label="Pilih akun simulasi"
                value={accountId}
                onChange={(e) => {
                  setAccountId(e.target.value)
                  setMode('existing')
                }}
                className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
              >
                <option value="" className="bg-popover">
                  {accountsQ.isPending ? 'Memuat akun…' : '— pilih akun —'}
                </option>
                {(accountsQ.data ?? []).map((a) => (
                  <option key={String(a.id)} value={String(a.id)} className="bg-popover">
                    {a.name}
                  </option>
                ))}
              </select>
              <span className="block text-xs text-muted-foreground">
                Ukuran posisi mengikuti setelan akun itu, jadi hasilnya bisa beda dengan uji. Akun yang dipakai bersama juga mencampur hasil di Klasemen.
              </span>
            </span>
          </label>
        </fieldset>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={start.isPending}>Batal</AlertDialogCancel>
          <Button onClick={submit} disabled={!canStart || start.isPending} variant={failed ? 'destructive' : 'default'}>
            {start.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <PlayCircle aria-hidden="true" />}
            {failed ? 'Tetap mulai paper' : 'Mulai paper'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
