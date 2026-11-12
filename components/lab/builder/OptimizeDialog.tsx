'use client'

import { useState } from 'react'
import { AlertTriangle, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { RuntimeEstimate } from '@/components/lab/RuntimeEstimate'
import { estimateLevel, needsAck } from '@/lib/lab/planning'
import { isLiveTemplate, paramLabel, type OptimizeConfig } from '@/lib/lab/form'
import { plateauText } from '@/lib/lab/importance'
import { useLabEstimate } from '@/lib/queries/lab-insights'
import type { LabTemplate } from '@/lib/api/types/lab'
import type { LabEstimateRequest } from '@/lib/api/types/lab-insights'
import type { LabImportanceParam } from '@/lib/api/types/lab-uji'

/** Walk-forward finding of the parameter research (spec 05 §5.2, riset 12 Nov 2026). */
const RESEARCH = { date: '12 Nov 2026', donchianOptimised: '0.11', donchianDefault: '0.29', rosyadeOptimised: '−0.17' }

/**
 * Warning + summary before "Cari setting terbaik": research says optimising tends to overfit,
 * so this is the secondary action and the user confirms with eyes open. The optimize estimate is
 * only requested while the dialog is open.
 */
export function OptimizeDialog({
  open,
  onOpenChange,
  template,
  search,
  importance,
  estimateBody,
  pending,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  template: LabTemplate
  search: OptimizeConfig
  importance: Map<string, LabImportanceParam>
  estimateBody: LabEstimateRequest | null
  pending: boolean
  onConfirm: () => void
}) {
  const [ack, setAck] = useState(false)
  const estimateQ = useLabEstimate(open ? estimateBody : null)
  const keys = template.params.filter((p) => search.ranges[p.key]?.enabled)
  const blocked = needsAck(estimateLevel(estimateQ.data)) && !ack
  return (
    <AlertDialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setAck(false)
        onOpenChange(v)
      }}
    >
      <AlertDialogContent className="max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>Cari setting terbaik?</AlertDialogTitle>
          <AlertDialogDescription>
            Lab mencoba {search.nTrials} kombinasi di data latih, lalu menguji pemenangnya sekali di data baru (holdout). Rapornya tetap jujur.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-2 rounded-2xl border border-warn/40 bg-warn/10 px-3 py-2 text-warn">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>
              Mencari setting sering hanya menemukan kebetulan masa lalu. Di riset {RESEARCH.date}, setting hasil pencarian rata-rata lebih
              buruk di data baru daripada default: Donchian 4H Sharpe {RESEARCH.donchianOptimised} vs {RESEARCH.donchianDefault} tanpa
              diutak-atik, Rosyade {RESEARCH.rosyadeOptimised}.
              {isLiveTemplate(template.id) ? ' Untuk Rosyade, 4H-ETH-Basic yang disetel manual tetap yang terbaik di ETH 4H.' : ''} Kalau Lolos,
              jalankan paper lebih lama.
            </p>
          </div>
          <div className="space-y-1">
            <p className="font-medium">Yang dicari ({keys.length} parameter)</p>
            {keys.length === 0 ? (
              <p className="text-bearish">Belum ada parameter yang dipilih. Pilih di Lanjutan → Pengaturan Cari setting terbaik.</p>
            ) : (
              <ul className="space-y-1">
                {keys.map((p) => {
                  const r = search.ranges[p.key]
                  const plateau = plateauText(importance.get(p.key))
                  return (
                    <li key={p.key} className="flex flex-wrap justify-between gap-x-3 rounded-xl bg-muted/40 px-3 py-2">
                      <span>{paramLabel(p)}</span>
                      <span className="num text-muted-foreground">
                        {r.min}–{r.max}
                        {plateau && <> · riset stabil {plateau}</>}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
            <p className="text-2xs text-muted-foreground">Hasilnya ditampilkan sebagai rentang dari kombinasi teratas, bukan hanya satu angka terbaik.</p>
          </div>
          <RuntimeEstimate estimate={estimateQ.data} loading={estimateQ.isFetching} ack={ack} onAck={setAck} />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <Button onClick={onConfirm} disabled={pending || blocked || keys.length === 0} className="gap-1.5">
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Tetap cari setting terbaik
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
