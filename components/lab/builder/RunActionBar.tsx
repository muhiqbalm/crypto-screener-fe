'use client'

import { Info, Loader2, Play, ShieldCheck, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RuntimeEstimate } from '@/components/lab/RuntimeEstimate'
import { cn } from '@/lib/utils/cn'
import { estimateLevel, formatDuration, needsAck } from '@/lib/lab/planning'
import type { LabRunMode } from '@/lib/api/types/lab'
import type { LabEstimate } from '@/lib/api/types/lab-insights'

const ACTIONS: { mode: LabRunMode; label: string; short: string; hint: string; Icon: typeof Play }[] = [
  { mode: 'backtest', label: 'Backtest', short: 'Backtest', hint: 'cepat, tanpa rapor', Icon: Play },
  { mode: 'validate', label: 'Validasi', short: 'Validasi', hint: 'rapor LOLOS/GAGAL', Icon: ShieldCheck },
  { mode: 'optimize', label: 'Cari Parameter Terbaik', short: 'Cari terbaik', hint: 'optimize + uji holdout', Icon: Sparkles },
]

/** Sticky bottom bar of the run builder: summary, runtime estimates per mode, submit buttons. */
export function RunActionBar({
  summary,
  submitError,
  pendingMode,
  disabled,
  nTrials,
  estimates,
  estimating,
  ack,
  onAck,
  onSubmit,
}: {
  summary: React.ReactNode
  submitError: string | null
  pendingMode: LabRunMode | null
  disabled: boolean
  nTrials: number
  estimates: Partial<Record<LabRunMode, LabEstimate | undefined>>
  estimating: boolean
  ack: boolean
  onAck: (v: boolean) => void
  onSubmit: (mode: LabRunMode) => void
}) {
  // The box shows the heaviest mode that has a warning, else validate.
  const worst = (['optimize', 'validate'] as const).find((m) => estimateLevel(estimates[m]) !== 'ok') ?? 'validate'
  const blocked = (m: LabRunMode) => needsAck(estimateLevel(estimates[m])) && !ack
  return (
    <div className="sticky bottom-3 z-30">
      <div className="space-y-3 rounded-xl border border-border bg-background/90 p-3 shadow-lg backdrop-blur-md sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-0.5">
            <p className="truncate text-sm font-semibold">{summary}</p>
            <p className="flex items-center gap-1.5 text-2xs text-muted-foreground">
              <Info className="h-3 w-3 shrink-0" />
              Validasi &amp; optimize diuji jujur di periode holdout yang dikunci — tidak bisa diintip optimizer.
            </p>
            {submitError && <p role="alert" className="text-xs text-bearish">{submitError}</p>}
          </div>
          <div className="grid grid-cols-3 gap-2 lg:flex lg:shrink-0">
            {ACTIONS.map(({ mode, label, short, hint, Icon }) => {
              const est = estimates[mode]
              return (
                <Button
                  key={mode}
                  type="button"
                  variant={mode === 'validate' ? 'default' : 'outline'}
                  onClick={() => onSubmit(mode)}
                  disabled={disabled || blocked(mode)}
                  title={blocked(mode) ? 'Centang "Saya paham" di perkiraan waktu dulu' : undefined}
                  className={cn('h-auto flex-col gap-0 px-2 py-2 whitespace-normal sm:px-4', mode === 'optimize' && 'border-lab/50 text-lab hover:text-lab')}
                >
                  <span className="flex items-center gap-1.5 text-xs font-semibold sm:text-sm">
                    {pendingMode === mode ? <Loader2 className="animate-spin" /> : <Icon />}
                    <span className="sm:hidden">{short}</span>
                    <span className="hidden sm:inline">{label}</span>
                  </span>
                  <span className="hidden text-3xs font-normal opacity-75 sm:block">
                    {mode === 'optimize' ? `${nTrials} percobaan` : hint}
                    {est ? ` · ${formatDuration(est.longest_s)}` : ''}
                  </span>
                </Button>
              )
            })}
          </div>
        </div>
        <RuntimeEstimate estimate={estimates[worst]} loading={estimating} ack={ack} onAck={onAck} />
      </div>
    </div>
  )
}
