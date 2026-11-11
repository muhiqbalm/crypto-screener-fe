'use client'

import Link from 'next/link'
import { Sparkles, Trophy, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Section } from '@/components/lab/Section'
import { signClass } from '@/components/lab/LabBadges'
import { formatPercent, valueOrDash } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import { diffFromDefaults, paramLabel } from '@/lib/lab/form'
import type { LabRunDetail, LabTemplate } from '@/lib/api/types/lab'
import { fmtDd, fmtPf, fmtVal } from './format'
import { ParamDiffTable } from './ParamDiffTable'

export function OptimizeSection({ run, template }: { run: LabRunDetail; template: LabTemplate | undefined }) {
  const diff = diffFromDefaults(template, run.best_params)
  const labelOf = (k: string) => {
    const spec = template?.params.find((p) => p.key === k)
    return spec ? paramLabel(spec) : k
  }
  const trials = run.top_trials ?? []
  return (
    <Section
      title="Hasil cari parameter"
      icon={<Sparkles className="h-4 w-4 text-lab" />}
      description={
        [
          run.n_trials ? `${run.trials_done ?? 0}/${run.n_trials} percobaan` : null,
          run.search?.params?.length ? `${run.search.params.length} parameter dicari` : null,
          run.objective ? `objektif: ${run.objective}` : null,
        ]
          .filter(Boolean)
          .join(' · ') || undefined
      }
      action={
        run.best_params ? (
          <Button asChild size="sm">
            <Link href={`/lab?from=${encodeURIComponent(String(run.id))}&use=best`}>
              <Wand2 />
              Uji parameter ini
            </Link>
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-5">
        <div className="space-y-2">
          <h3 className="text-xs font-semibold">Parameter terbaik vs default</h3>
          <ParamDiffTable rows={diff} emptyText="Parameter terbaik sama dengan default live." />
          <p className="text-2xs text-muted-foreground">Dipilih dari data in-sample saja. Rapor di atas sudah menguji parameter ini di holdout.</p>
        </div>

        {trials.length > 0 && (
          <div className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold"><Trophy className="h-3.5 w-3.5 text-warn" />Top {trials.length} kombinasi</h3>
            <div className="-mx-4 overflow-x-auto sm:mx-0 sm:rounded-lg sm:border sm:border-border">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="border-b border-border bg-muted/30">
                  <tr>
                    {['#', 'Parameter', 'Net', 'PF', 'Max DD', 'Trade', 'Segmen untung', ''].map((h, i) => (
                      <th key={h || i} className={cn('px-3 py-2 text-2xs font-medium uppercase tracking-wide text-muted-foreground', i >= 2 && i < 7 ? 'text-right' : 'text-left')}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {trials.map((t) => (
                    <tr key={t.rank} className={cn(t.rank === 1 && 'bg-lab/[0.05]')}>
                      <td className="px-3 py-2 font-mono text-xs font-bold">{t.rank}</td>
                      <td className="px-3 py-2">
                        {t.error ? (
                          <span className="text-xs text-bearish">{t.error}</span>
                        ) : (
                          <div className="flex max-w-[320px] flex-wrap gap-1">
                            {Object.entries(t.params).map(([k, v]) => (
                              <span key={k} className="rounded bg-muted px-1.5 py-0.5 font-mono text-3xs" title={k}>
                                {labelOf(k)}: <b>{fmtVal(v)}</b>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className={cn('px-3 py-2 text-right font-mono text-xs', signClass(t.metrics?.net_return_pct))}>{formatPercent(t.metrics?.net_return_pct, 1)}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs">{fmtPf(t.metrics?.profit_factor ?? null)}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-bearish">{fmtDd(t.metrics?.max_dd_pct ?? null)}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs">{valueOrDash(t.metrics?.trades)}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs">
                        {t.metrics?.segments ? `${t.metrics.profitable_segments ?? 0}/${t.metrics.segments}` : '—'}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                          <Link href={`/lab?from=${encodeURIComponent(String(run.id))}&use=trial&rank=${t.rank}`}>Uji kombinasi ini</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-2xs text-muted-foreground">Metrik di tabel ini dari data in-sample (walk-forward), bukan holdout.</p>
          </div>
        )}
      </div>
    </Section>
  )
}
