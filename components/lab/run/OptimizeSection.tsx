'use client'

import Link from 'next/link'
import { Sparkles, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Section } from '@/components/lab/Section'
import { formatNumber, formatPct, signClass } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import { diffFromDefaults, isLiveTemplate, paramLabel } from '@/lib/lab/form'
import { importanceByKey, insidePlateau, plateauText } from '@/lib/lab/importance'
import { useLabImportance } from '@/lib/queries/lab'
import type { LabRunDetail, LabTemplate } from '@/lib/api/types/lab'
import { fmtDd, fmtPf, fmtVal } from './format'
import { ParamDiffTable } from './ParamDiffTable'

interface RangeRow {
  key: string
  label: string
  best: string
  spread: string | null
  plateau: string | null
  inside: boolean | null
}

/** Searched params: best value, spread over the top combinations, and the research plateau. */
export function safeRanges(run: LabRunDetail, template: LabTemplate | undefined, plateauOf: (k: string) => { text: string | null; inside: boolean | null }): RangeRow[] {
  const trials = (run.top_trials ?? []).filter((t) => !t.error)
  const keys = run.search?.params?.length ? run.search.params : Object.keys(trials[0]?.params ?? {})
  return keys.map((k) => {
    const spec = template?.params.find((p) => p.key === k)
    const nums = trials.map((t) => Number(t.params[k])).filter((v) => Number.isFinite(v))
    const lo = nums.length ? Math.min(...nums) : null
    const hi = nums.length ? Math.max(...nums) : null
    const p = plateauOf(k)
    return {
      key: k,
      label: spec ? paramLabel(spec) : k,
      best: fmtVal(run.best_params?.[k]),
      spread: lo === null || hi === null ? null : lo === hi ? fmtVal(lo) : `${fmtVal(lo)}–${fmtVal(hi)}`,
      plateau: p.text,
      inside: p.inside,
    }
  })
}

export function OptimizeSection({ run, template }: { run: LabRunDetail; template: LabTemplate | undefined }) {
  const importanceQ = useLabImportance(run.template_id, run.timeframe)
  const imp = importanceByKey(importanceQ.data)
  const diff = diffFromDefaults(template, run.best_params)
  const trials = run.top_trials ?? []
  const labelOf = (k: string) => {
    const spec = template?.params.find((p) => p.key === k)
    return spec ? paramLabel(spec) : k
  }
  const ranges = safeRanges(run, template, (k) => ({ text: plateauText(imp.get(k)), inside: insidePlateau(imp.get(k), run.best_params?.[k]) }))
  const ok = trials.filter((t) => !t.error).length
  return (
    <Section
      title="Hasil Cari setting terbaik"
      icon={<Sparkles className="h-4 w-4 text-lab" />}
      description={[
        run.n_trials ? `${formatNumber(run.trials_done ?? 0, { digits: 0 })}/${formatNumber(run.n_trials, { digits: 0 })} percobaan` : null,
        run.search?.params?.length ? `${run.search.params.length} parameter dicari` : null,
        'juara dipilih di data latih (Sharpe × bagian waktu yang untung), tidak pernah di data baru',
      ]
        .filter(Boolean)
        .join(' · ')}
    >
      <div className="space-y-5">
        <div className="space-y-2">
          <h3 className="text-xs font-semibold">Rentang aman, bukan satu angka</h3>
          {ranges.length === 0 ? (
            <p className="text-sm text-muted-foreground">Server tidak mengirim parameter yang dicari.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[480px] text-sm">
                <thead className="border-b border-border bg-muted/30">
                  <tr>
                    {['Parameter', 'Terbaik', `${ok} teratas`, 'Stabil di riset'].map((h, i) => (
                      <th key={h} className={cn('px-3 py-2 text-2xs font-medium uppercase tracking-wide text-muted-foreground', i === 0 ? 'text-left' : 'text-right')}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {ranges.map((r) => (
                    <tr key={r.key}>
                      <td className="px-3 py-2 text-xs">{r.label}</td>
                      <td className="num px-3 py-2 text-right text-xs font-semibold">{r.best}</td>
                      <td className="num px-3 py-2 text-right text-xs">{r.spread ?? '—'}</td>
                      <td className="num px-3 py-2 text-right text-xs">
                        {r.plateau ?? <span className="text-muted-foreground">tidak tersedia</span>}
                        {r.inside === false && <span className="block text-3xs text-warn">terbaik di luar rentang</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-2xs text-muted-foreground">
            Kalau kombinasi teratas tersebar jauh, nilai terbaik kemungkinan kebetulan. Lebih aman memakai nilai di tengah rentang yang sama-sama bagus
            {ranges.some((r) => r.plateau) ? ' dan, bila ada, di dalam rentang stabil riset' : ''}. Rapor di atas sudah menguji setting terbaik ini sekali di data
            baru; menguji ulang berarti memakai data baru yang sama lagi.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-semibold">Setting terbaik vs default</h3>
            {run.best_params && (
              <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                <Link href={`/lab?from=${encodeURIComponent(String(run.id))}&use=best`}>Ubah setting terbaik</Link>
              </Button>
            )}
          </div>
          <ParamDiffTable rows={diff} live={isLiveTemplate(run.template_id)} emptyText="Setting terbaik sama dengan default." />
        </div>

        {trials.length > 0 && (
          <div className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold"><Trophy className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />{trials.length} kombinasi teratas</h3>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="border-b border-border bg-muted/30">
                  <tr>
                    {['#', 'Parameter', 'Hasil', 'PF', 'Turun terdalam', 'Trade', 'Waktu untung', ''].map((h, i) => (
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
                          <span className="text-xs text-bearish">Kombinasi ini error</span>
                        ) : (
                          <div className="flex max-w-[320px] flex-wrap gap-1">
                            {Object.entries(t.params).map(([k, v]) => (
                              <span key={k} className="rounded bg-muted px-1.5 py-0.5 font-mono text-3xs">
                                {labelOf(k)}: <b>{fmtVal(v)}</b>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className={cn('px-3 py-2 text-right font-mono text-xs', signClass(t.metrics?.net_return_pct))}>{formatPct(t.metrics?.net_return_pct, { signed: true })}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs">{fmtPf(t.metrics?.profit_factor ?? null)}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-bearish">{fmtDd(t.metrics?.max_dd_pct ?? null)}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs">{formatNumber(t.metrics?.trades, { digits: 0 })}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs">
                        {t.metrics?.segments ? `${t.metrics.profitable_segments ?? 0}/${t.metrics.segments}` : '—'}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                          <Link href={`/lab?from=${encodeURIComponent(String(run.id))}&use=trial&rank=${t.rank}`}>Isi form</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-2xs text-muted-foreground">Angka di tabel ini dari data latih (uji maju bertahap), bukan data baru.</p>
          </div>
        )}
      </div>
    </Section>
  )
}
