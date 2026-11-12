'use client'

import { useState } from 'react'
import { BookmarkPlus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { apiErrorDetail } from '@/lib/api/errors'
import { notify } from '@/lib/utils/toast'
import { PRESET_LABEL_RE, presetName, suggestLabel } from '@/lib/lab/planning'
import { useLabPresets, useSavePresetFromRun } from '@/lib/queries/lab-insights'
import type { LabRunDetail } from '@/lib/api/types/lab'

/** "Simpan sebagai preset": names it {TF}-{COIN}-{Label} and snapshots the run's evidence. */
export function SavePresetButton({ run }: { run: LabRunDetail }) {
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [notes, setNotes] = useState('')
  const presetsQ = useLabPresets()
  const save = useSavePresetFromRun()
  const taken = (presetsQ.data ?? []).filter((p) => p.symbol === run.symbol && p.timeframe === run.timeframe).map((p) => p.label)
  const valid = PRESET_LABEL_RE.test(label)
  const name = presetName(run.timeframe, run.symbol, label || '…')
  const clash = taken.includes(label)

  const submit = () => {
    if (!valid || clash) return
    save.mutate(
      { runId: run.id, label, notes },
      {
        onSuccess: (p) => {
          notify.success(`Preset ${p.name} tersimpan`, { description: 'Bisa dipakai di Uji strategi, Banyak koin dan Paper berjalan.' })
          setOpen(false)
        },
        onError: (err) => notify.error('Gagal menyimpan preset', { description: apiErrorDetail(err) ?? undefined }),
      },
    )
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => {
          setLabel(suggestLabel(run.mode, taken))
          setNotes('')
          setOpen(true)
        }}
      >
        <BookmarkPlus className="h-3.5 w-3.5" />
        Simpan preset saja
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Simpan sebagai preset (tanpa paper)</AlertDialogTitle>
            <AlertDialogDescription>
              Preset = setting khusus untuk <span className="font-mono">{run.symbol} {run.timeframe}</span>
              {run.mode === 'optimize' ? ' (setting terbaik dari Cari setting terbaik)' : ''}. Rapor, angka data baru dan jumlah percobaan saat ini
              ikut disimpan sebagai bukti. Tiap koin dan timeframe wajar punya preset sendiri.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="preset-label" className="text-xs font-medium">Label</label>
              <Input id="preset-label" value={label} onChange={(e) => setLabel(e.target.value.trim())} maxLength={24} className="font-mono" aria-invalid={!valid || clash} />
              <p className="text-2xs text-muted-foreground">
                Nama: <span className="num font-semibold text-foreground">{name}</span>
              </p>
              {!valid && label && <p className="text-2xs text-bearish">Huruf/angka/_/. tanpa spasi, maks 24.</p>}
              {clash && <p className="text-2xs text-bearish">Nama ini sudah dipakai.</p>}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="preset-notes" className="text-xs font-medium">Catatan (opsional)</label>
              <Input id="preset-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} />
            </div>
            {run.verdict !== 'PASS' && (
              <p className="rounded-md border border-warn/30 bg-warn/10 px-2.5 py-2 text-2xs text-warn">
                {run.verdict === 'FAIL' ? 'Uji ini Gagal.' : 'Uji ini tidak punya rapor.'} Preset tetap bisa disimpan, tapi ditandai begitu dan tidak pernah dipilih otomatis sebagai &ldquo;preset terbaik&rdquo;.
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <Button onClick={submit} disabled={!valid || clash || save.isPending} className="gap-1.5">
              {save.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Simpan
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
