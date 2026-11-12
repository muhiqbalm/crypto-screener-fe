'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, PlayCircle, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { StatusPill } from '@/components/ui/status-pill'
import { Term } from '@/components/ui/term'
import { describeError } from '@/components/shell/error-copy'
import { notify } from '@/lib/utils/toast'
import { formatNumber } from '@/lib/utils/format'
import { arenaHref } from '@/lib/lab/arena'
import { PAPER_START_BALANCE, mirrorSizing, paperAccountName, templateDefaults } from '@/lib/lab/paper'
import { PRESET_LABEL_RE, presetName, suggestLabel } from '@/lib/lab/planning'
import { useLabPresets, useSavePresetFromRun } from '@/lib/queries/lab-insights'
import { usePaperAccounts, useStartPaper } from '@/lib/queries/paper'
import type { LabId, LabRunDetail, LabTemplate } from '@/lib/api/types/lab'
import type { LabPreset } from '@/lib/api/types/lab-insights'

function idValue(v: string): LabId {
  return /^\d+$/.test(v) ? Number(v) : v
}

/**
 * One dialog for "Simpan sebagai preset & mulai paper": the preset label (pre-filled) and the
 * paper account. It reuses the paper flow of Paper berjalan (W3b): by default a new simulated
 * account of 10,000 USDT whose position size mirrors the preset's test (mirrorSizing), so
 * "Sesuai uji?" compares like with like; useStartPaper reuses an untouched "Paper <preset>"
 * account or creates it, then watches the preset with auto-paper. A retry after a partial
 * failure never saves the preset twice. On success: /lab/arena?highlight=<presetId>.
 * Paper only: no real order is ever sent.
 */
export function PresetPaperDialog({
  run,
  template,
  open,
  onOpenChange,
}: {
  run: LabRunDetail
  /** Template schema (defaults fill params a preset does not store). */
  template: Pick<LabTemplate, 'params'> | undefined
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const router = useRouter()
  const presetsQ = useLabPresets()
  const accountsQ = usePaperAccounts(open)
  const save = useSavePresetFromRun()
  const start = useStartPaper()

  const taken = (presetsQ.data ?? []).filter((p) => p.symbol === run.symbol && p.timeframe === run.timeframe).map((p) => p.label)
  // Suggested label follows the loaded presets until the user types one.
  const [labelInput, setLabelInput] = useState<string | null>(null)
  const label = labelInput ?? suggestLabel(run.mode, taken)
  // The preset stores the run's best params (optimize) or its params: size the account from those.
  const presetParams = run.mode === 'optimize' && run.best_params ? run.best_params : run.params
  const sizing = mirrorSizing(presetParams, templateDefaults(template))
  const [mode, setMode] = useState<'new' | 'existing'>(sizing.ok ? 'new' : 'existing')
  const [balance, setBalance] = useState(String(PAPER_START_BALANCE))
  const [accountId, setAccountId] = useState('')
  const [saved, setSaved] = useState<LabPreset | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const name = saved?.name ?? presetName(run.timeframe, run.symbol, label || '…')
  const labelOk = Boolean(saved) || (PRESET_LABEL_RE.test(label) && !taken.includes(label))
  const amount = Number(balance)
  const amountOk = Number.isFinite(amount) && amount > 0 && amount <= 1e9
  const canPaper = mode === 'new' ? sizing.ok && amountOk : Boolean(accountId)
  const failed = run.verdict === 'FAIL'

  const close = (v: boolean) => {
    if (busy) return
    if (!v) {
      setError(null)
      if (!saved) setLabelInput(null)
    }
    onOpenChange(v)
  }

  const go = async (withPaper: boolean) => {
    if (!labelOk || busy || (withPaper && !canPaper)) return
    setBusy(true)
    setError(null)
    let preset = saved
    try {
      if (!preset) {
        preset = await save.mutateAsync({ runId: run.id, label })
        setSaved(preset)
      }
      if (!withPaper) {
        notify.success(`Preset ${preset.name} tersimpan`, { description: 'Paper bisa dimulai nanti dari halaman Preset.' })
        onOpenChange(false)
        return
      }
      const ref = { id: preset.id, name: preset.name }
      const res = await start.mutateAsync(
        mode === 'new' && sizing.ok
          ? { preset: ref, sizing: { risk_pct: sizing.risk_pct, leverage_max: sizing.leverage_max }, startingBalance: amount }
          : { preset: ref, accountId: idValue(accountId) },
      )
      notify.success(`Preset ${preset.name} tersimpan, paper dimulai`, { description: 'Simulasi saja, tidak ada order sungguhan.' })
      onOpenChange(false)
      router.push(arenaHref(res.presetId))
    } catch (err) {
      const d = describeError(err)
      setError(preset ? `Preset ${preset.name} sudah tersimpan, tapi paper belum dimulai: ${d.message} Klik lagi untuk mencoba.` : `${d.message}${d.hint ? ` ${d.hint}` : ''}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={close}>
      <AlertDialogContent className="max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex flex-wrap items-center gap-2">
            Simpan sebagai preset &amp; mulai paper
            <StatusPill kind="paper" />
          </AlertDialogTitle>
          <AlertDialogDescription>
            Setting {run.mode === 'optimize' ? 'terbaik dari uji ini' : 'uji ini'} disimpan sebagai preset untuk{' '}
            <span className="num">{run.symbol} {run.timeframe}</span> (rapor dan jumlah percobaan ikut tersimpan), lalu sinyalnya dijalankan di akun
            simulasi. <b>Tidak ada order sungguhan</b> ke exchange.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 text-sm">
          {failed && (
            <div role="alert" className="flex gap-2 rounded-lg border border-bearish/40 bg-bearish/10 p-3 text-xs">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-bearish" aria-hidden="true" />
              <p>
                <b>Uji ini Gagal.</b> Preset tetap bisa disimpan dan dipaper, tapi ditandai Gagal dan tidak pernah dipilih otomatis. Hasil paper kemungkinan
                juga buruk.
              </p>
            </div>
          )}
          {!run.verdict && (
            <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
              Uji ini tidak punya rapor, jadi Paper berjalan tidak punya acuan untuk menilai &quot;Sesuai uji?&quot;.
            </p>
          )}

          <div className="space-y-1.5">
            <label htmlFor="pp-label" className="text-xs font-medium">Label preset</label>
            <Input
              id="pp-label"
              value={label}
              onChange={(e) => setLabelInput(e.target.value.trim())}
              maxLength={24}
              disabled={Boolean(saved)}
              className="font-mono"
              aria-invalid={!labelOk}
              aria-describedby="pp-label-hint"
            />
            <p id="pp-label-hint" className="text-2xs text-muted-foreground">
              Nama: <span className="num font-semibold text-foreground">{name}</span>
              {saved && ' (sudah tersimpan)'}
            </p>
            {!saved && label && !PRESET_LABEL_RE.test(label) && <p className="text-2xs text-bearish">Huruf, angka, _ atau titik, tanpa spasi, maksimal 24.</p>}
            {!saved && taken.includes(label) && <p className="text-2xs text-bearish">Nama ini sudah dipakai. Ganti labelnya.</p>}
          </div>

          <fieldset className="space-y-2">
            <legend className="mb-1 text-xs font-medium">Akun simulasi</legend>
            <label className="flex cursor-pointer items-start gap-2 rounded-lg border p-3 has-[:checked]:border-lab/50 has-[:checked]:bg-lab/[0.06]">
              <input type="radio" name="pp-account" className="mt-1" checked={mode === 'new'} disabled={!sizing.ok} onChange={() => setMode('new')} aria-label="Akun simulasi baru" />
              <span className="min-w-0 space-y-2">
                <span className="block font-medium">
                  Akun baru: <span className="num">{paperAccountName(name)}</span>
                </span>
                {sizing.ok ? (
                  <>
                    <span className="flex flex-wrap items-center gap-2">
                      <Label htmlFor="pp-balance" className="text-xs">Saldo awal (USDT)</Label>
                      <Input
                        id="pp-balance"
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
                  <span className="block text-xs text-warn">{sizing.reason} Pakai akun yang sudah ada, atau simpan presetnya saja.</span>
                )}
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2 rounded-lg border p-3 has-[:checked]:border-lab/50 has-[:checked]:bg-lab/[0.06]">
              <input type="radio" name="pp-account" className="mt-1" checked={mode === 'existing'} onChange={() => setMode('existing')} aria-label="Akun simulasi yang sudah ada" />
              <span className="min-w-0 flex-1 space-y-2">
                <span className="block font-medium">Akun yang sudah ada</span>
                <select
                  aria-label="Pilih akun simulasi"
                  value={accountId}
                  onChange={(e) => {
                    setAccountId(e.target.value)
                    setMode('existing')
                  }}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                >
                  <option value="" className="bg-popover">{accountsQ.isPending ? 'Memuat akun…' : '— pilih akun —'}</option>
                  {(accountsQ.data ?? []).map((a) => (
                    <option key={String(a.id)} value={String(a.id)} className="bg-popover">{a.name}</option>
                  ))}
                </select>
                <span className="block text-xs text-muted-foreground">Ukuran posisi mengikuti setelan akun itu, jadi hasilnya bisa beda dengan uji.</span>
              </span>
            </label>
          </fieldset>

          {error && <p role="alert" className="rounded-md border border-bearish/40 bg-bearish/[0.07] px-3 py-2 text-xs text-bearish">{error}</p>}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Batal</AlertDialogCancel>
          {!saved && (
            <Button variant="outline" onClick={() => go(false)} disabled={busy || !labelOk}>
              Simpan preset saja
            </Button>
          )}
          <Button onClick={() => go(true)} disabled={busy || !labelOk || !canPaper} variant={failed ? 'destructive' : 'default'} className="gap-1.5">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5" />}
            {saved ? 'Mulai paper' : failed ? 'Tetap simpan & mulai paper' : 'Simpan & mulai paper'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
