'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Loader2, PlayCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
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
import { describeError } from '@/components/shell/error-copy'
import { notify } from '@/lib/utils/toast'
import { formatNumber } from '@/lib/utils/format'
import { PRESET_LABEL_RE, arenaHighlightHref, presetName, suggestLabel } from '@/lib/lab/planning'
import { useLabPresets, useSavePresetFromRun, useWatchFromPreset } from '@/lib/queries/lab-insights'
import { useCreatePaperAccount, usePaperAccounts } from '@/lib/queries/paper'
import type { LabId, LabRunDetail } from '@/lib/api/types/lab'
import type { LabPreset } from '@/lib/api/types/lab-insights'

const NEW = 'new'
/** Same defaults as "Buat akun simulasi" in Jurnal. */
const NEW_ACCOUNT = { starting_balance: 10_000, risk_pct: 1, leverage_max: 5 }

function idValue(v: string): LabId {
  return /^\d+$/.test(v) ? Number(v) : v
}

/**
 * One dialog for "Simpan sebagai preset & mulai paper": label (pre-filled) + paper account
 * (default: a new 10,000 USDT simulation account). Uses the existing preset / paper / watch APIs:
 * save preset from run -> create account (if new) -> watch the preset with auto-paper. A retry
 * after a partial failure skips the steps that already succeeded. On success the user lands on
 * Paper berjalan with the preset highlighted (/lab/arena?highlight=<presetId>).
 * Paper only: no real order is ever sent.
 */
export function PresetPaperDialog({ run, open, onOpenChange }: { run: LabRunDetail; open: boolean; onOpenChange: (v: boolean) => void }) {
  const router = useRouter()
  const presetsQ = useLabPresets()
  const accountsQ = usePaperAccounts(open)
  const save = useSavePresetFromRun()
  const createAccount = useCreatePaperAccount()
  const watch = useWatchFromPreset()

  const taken = (presetsQ.data ?? []).filter((p) => p.symbol === run.symbol && p.timeframe === run.timeframe).map((p) => p.label)
  // Suggested label follows the loaded presets until the user types one.
  const [labelInput, setLabelInput] = useState<string | null>(null)
  const label = labelInput ?? suggestLabel(run.mode, taken)
  const [account, setAccount] = useState<string>(NEW)
  const [saved, setSaved] = useState<LabPreset | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const name = saved?.name ?? presetName(run.timeframe, run.symbol, label || '…')
  const valid = PRESET_LABEL_RE.test(label)
  const clash = !saved && taken.includes(label)
  const accountName = `Paper ${name}`.slice(0, 80)

  const reset = (v: boolean) => {
    if (!v && !busy) {
      setError(null)
      if (!saved) setLabelInput(null)
    }
    onOpenChange(v)
  }

  const go = async () => {
    if ((!saved && (!valid || clash)) || busy) return
    setBusy(true)
    setError(null)
    let preset = saved
    try {
      if (!preset) {
        preset = await save.mutateAsync({ runId: run.id, label })
        setSaved(preset)
      }
      let accountId = account
      if (accountId === NEW) {
        const acc = await createAccount.mutateAsync({ name: accountName, ...NEW_ACCOUNT })
        accountId = String(acc.id)
        setAccount(accountId) // a retry must not create a second account
      }
      await watch.mutateAsync({ id: preset.id, accountId: idValue(accountId) })
      notify.success(`Preset ${preset.name} tersimpan, paper dimulai`, { description: 'Simulasi di akun paper. Tidak ada order sungguhan.' })
      onOpenChange(false)
      router.push(arenaHighlightHref(preset.id))
    } catch (err) {
      const d = describeError(err)
      setError(preset ? `Preset ${preset.name} sudah tersimpan, tapi paper belum dimulai: ${d.message} Klik lagi untuk mencoba.` : `${d.message}${d.hint ? ` ${d.hint}` : ''}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={reset}>
      <AlertDialogContent className="max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex flex-wrap items-center gap-2">
            Simpan sebagai preset &amp; mulai paper
            <StatusPill kind="paper" />
          </AlertDialogTitle>
          <AlertDialogDescription>
            Setting {run.mode === 'optimize' ? 'terbaik dari uji ini' : 'uji ini'} disimpan sebagai preset untuk{' '}
            <span className="num">{run.symbol} {run.timeframe}</span>, lalu sinyalnya dijalankan otomatis di akun simulasi. Rapor dan jumlah
            percobaan ikut tersimpan sebagai bukti.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 text-sm">
          {run.verdict !== 'PASS' && (
            <p className="flex items-start gap-2 rounded-md border border-warn/40 bg-warn/10 px-3 py-2 text-xs text-warn">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Uji ini {run.verdict === 'FAIL' ? 'Gagal' : 'tidak punya rapor'}. Preset tetap bisa disimpan dan dipaper, tapi ditandai begitu dan
              tidak pernah dipilih otomatis sebagai preset terbaik.
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
              aria-invalid={!valid || clash}
              aria-describedby="pp-label-hint"
            />
            <p id="pp-label-hint" className="text-2xs text-muted-foreground">
              Nama: <span className="num font-semibold text-foreground">{name}</span>
              {saved && ' (sudah tersimpan)'}
            </p>
            {!saved && !valid && label && <p className="text-2xs text-bearish">Huruf, angka, _ atau titik, tanpa spasi, maksimal 24.</p>}
            {clash && <p className="text-2xs text-bearish">Nama ini sudah dipakai. Ganti labelnya.</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="pp-account" className="text-xs font-medium">Akun simulasi</label>
            {accountsQ.isPending ? (
              <Skeleton className="h-9 w-full" />
            ) : (
              <select
                id="pp-account"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value={NEW} className="bg-popover">Buat akun baru ({formatNumber(NEW_ACCOUNT.starting_balance, { digits: 0 })} USDT)</option>
                {(accountsQ.data ?? []).map((a) => (
                  <option key={String(a.id)} value={String(a.id)} className="bg-popover">
                    {a.name} · saldo {formatNumber(a.balance)} USDT
                  </option>
                ))}
              </select>
            )}
            <p className="text-2xs text-muted-foreground">
              {account === NEW
                ? `Akun baru "${accountName}": 10,000 USDT, risiko 1% per trade, leverage maks 5×.`
                : 'Sinyal preset ini ikut dijalankan di akun yang dipilih.'}
              {accountsQ.isError && ' Daftar akun gagal dimuat; akun baru tetap bisa dibuat.'}
            </p>
          </div>

          {error && <p role="alert" className="rounded-md border border-bearish/40 bg-bearish/[0.07] px-3 py-2 text-xs text-bearish">{error}</p>}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Batal</AlertDialogCancel>
          <Button onClick={go} disabled={busy || (!saved && (!valid || clash))} className="gap-1.5">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5" />}
            {saved ? 'Mulai paper' : 'Simpan & mulai paper'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
