'use client'

/**
 * "Rekam jejak skor": how the live calls of each letter actually turned out, so the grade
 * itself is graded. Live numbers only; the rule's check on the historical simulation sits in
 * its own block with a SIMULASI pill and is never mixed into the live tiles. When the live
 * sample is too thin the panel says so with the count instead of showing a verdict.
 */
import Link from 'next/link'
import { ChevronRight, FlaskConical, Hourglass, Medal } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ProgressBar } from '@/components/ui/progress-bar'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/lab/outlook/OutlookBadges'
import { Fold } from '@/components/market/shared'
import { Panel } from '@/components/market/ui'
import { IconTitle } from '@/components/ui/icon-title'
import { GradeLetter } from '@/components/market/quality/GradeLetter'
import { useRekamSkor } from '@/lib/queries/outlook'
import { coinLabel, formatProb, formatWib, koinHref } from '@/lib/lab/outlook'
import { GRADE_LABEL, GRADE_TONE, GRADES, scoreVerdictText } from '@/lib/lab/quality'
import { formatCount, formatR, signClass } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import type { QualityGrade, RekamSkorResponse, ScoreGroup } from '@/lib/api/types/quality'

function GradeTile({ g, need }: { g: ScoreGroup; need: number }) {
  const has = g.n_done > 0
  return (
    <li className="flex min-w-0 flex-col rounded-2xl border bg-muted/20 p-4 sm:p-5">
      <div className="flex items-center gap-2.5">
        <GradeLetter grade={g.grade} size="md" decorative />
        <div className="min-w-0">
          <div className="text-base font-semibold leading-tight">Skor {g.grade}</div>
          <div className="break-words text-2xs text-muted-foreground">{GRADE_LABEL[g.grade]}</div>
        </div>
      </div>
      <div className={cn('num display mt-4 text-3xl font-bold', has && g.enough ? signClass(g.mean_r) : 'text-muted-foreground')}>
        {has ? formatR(g.mean_r) : '—'}
      </div>
      <div className="text-2xs text-muted-foreground">
        {has ? (g.enough ? `rata-rata live · untung ${formatProb(g.win_rate)}` : 'sementara, belum bermakna') : 'belum ada hasil'}
      </div>
      <p className="num mt-3 text-sm">
        <span className="font-semibold">{formatCount(g.n_calls)}</span> <span className="text-muted-foreground">panggilan ·</span>{' '}
        <span className="font-semibold">{formatCount(g.n_done)}</span> <span className="text-muted-foreground">selesai</span>
      </p>
      <ProgressBar className="mt-3" value={g.n_pos} max={need} size="sm" tone={g.enough ? GRADE_TONE[g.grade] : 'muted'}
        label="Posisi selesai" showValue valueText={`${formatCount(g.n_pos)} / ${formatCount(need)}`} />
      <p className={cn('mt-2 text-2xs', g.enough && g.verdict === 'negatif' ? 'text-bearish' : 'text-muted-foreground')}>{scoreVerdictText(g, need)}</p>
    </li>
  )
}

function answer(d: RekamSkorResponse): { text: string; tone: string } {
  if (!d.n_calls) return { text: 'Belum ada panggilan live yang tersimpan.', tone: 'text-muted-foreground' }
  if (!d.enough_any) {
    return {
      text: `Belum cukup data live: baru ${formatCount(d.n_pos_done)} posisi selesai dari ${formatCount(d.n_calls)} panggilan. `
        + `Sebuah skor dianggap teruji setelah ${formatCount(d.need_pos)} posisi selesai.`,
      tone: 'text-warn',
    }
  }
  const ready = GRADES.filter((g) => d.by_grade[g]?.enough)
  return {
    text: ready.map((g) => `Skor ${g}: ${formatR(d.by_grade[g].mean_r)} dari ${formatCount(d.by_grade[g].n_pos)} posisi`).join(' · ') + '.',
    tone: 'text-foreground',
  }
}

function SimCheck({ sim }: { sim: NonNullable<RekamSkorResponse['simulasi']> }) {
  const grades = GRADES.filter((g) => sim.by_grade[g])
  const max = Math.max(0.05, ...grades.map((g) => Math.abs(sim.by_grade[g]?.mean_r ?? 0)))
  return (
    <div className="rounded-2xl border border-dashed p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <FlaskConical className="h-4 w-4 text-lab" aria-hidden="true" />
        <span className="text-sm font-semibold">Uji aturan di simulasi historis</span>
        <Badge variant="lab" size="sm">SIMULASI · bukan hasil live</Badge>
      </div>
      <ul className="mt-3 space-y-2.5">
        {grades.map((g) => {
          const s = sim.by_grade[g as QualityGrade]!
          const w = Math.min(100, (Math.abs(s.mean_r ?? 0) / max) * 100)
          return (
            <li key={g} className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3">
              <GradeLetter grade={g} size="sm" />
              <span className="h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <span className={cn('block h-full rounded-full', (s.mean_r ?? 0) >= 0 ? 'bg-lab/70' : 'bg-bearish/70')} style={{ width: `${w}%` }} />
              </span>
              <span className="num text-right text-sm">
                <span className={cn('font-semibold', signClass(s.mean_r))}>{formatR(s.mean_r)}</span>
                <span className="text-2xs text-muted-foreground"> · {formatCount(s.n_pos)} posisi</span>
              </span>
            </li>
          )
        })}
      </ul>
      <p className="mt-3 text-2xs leading-relaxed text-muted-foreground">{sim.note}</p>
    </div>
  )
}

export function RekamSkorPanel({ className }: { className?: string }) {
  const q = useRekamSkor()
  const d = q.data
  return (
    <div id="rekam-skor" className={cn('scroll-mt-24', className)}>
    <Panel aria-labelledby="rekam-skor-title">
      <IconTitle icon={Medal} title={<span id="rekam-skor-title">Rekam jejak skor</span>}
        subtitle="Hasil nyata panggilan live per skor, dinilai setelah kejadian." className="mb-5" />
      {q.isPending ? (
        <Skeleton className="h-48 w-full rounded-2xl" />
      ) : q.error || !d ? (
        <p className="text-sm text-muted-foreground">Rekam jejak skor belum bisa dimuat.</p>
      ) : (
        <div className="space-y-5">
          {(() => {
            const a = answer(d)
            return (
              <p className={cn('flex items-start gap-2 text-base font-semibold leading-snug', a.tone)}>
                {!d.enough_any && <Hourglass className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />}
                {a.text}
              </p>
            )
          })()}
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            {GRADES.map((g) => <GradeTile key={g} g={d.by_grade[g]} need={d.need_pos} />)}
          </ul>
          <p className="text-2xs text-muted-foreground">
            {[
              d.first_graded ? `Sejak ${formatWib(d.first_graded)}` : null,
              d.n_backfilled > 0 ? `${formatCount(d.n_backfilled)} panggilan lama diberi skor belakangan dengan aturan yang sama` : null,
              d.n_no_letter > 0 ? `${formatCount(d.n_no_letter)} tidak dinilai (data basi / lewat SL)` : null,
              d.n_ungraded > 0 ? `${formatCount(d.n_ungraded)} panggilan lama tanpa skor` : null,
            ].filter(Boolean).join(' · ')}
          </p>
          {d.simulasi && <SimCheck sim={d.simulasi} />}
          {d.recent.length > 0 && (
            <Fold title={`Panggilan terakhir dengan skor (${d.recent.length})`} className="rounded-2xl">
              <ul className="divide-y divide-border/60">
                {d.recent.map((c) => (
                  <li key={c.id}>
                    <Link href={koinHref(c.symbol)} aria-label={`${coinLabel(c.symbol)} ${c.side.toUpperCase()}, skor ${c.kualitas ?? 'tidak dinilai'}`}
                      className="group flex min-h-12 flex-wrap items-center gap-x-3 gap-y-1 py-2.5 hover:bg-muted/30">
                      <GradeLetter grade={c.kualitas} size="sm" />
                      <span className="w-20 font-semibold">{coinLabel(c.symbol)}</span>
                      <span className={cn('text-sm font-semibold', c.side === 'long' ? 'text-bullish' : 'text-bearish')}>{c.side.toUpperCase()}</span>
                      <StatusBadge status={c.status} />
                      <span className="text-2xs text-muted-foreground">{formatWib(c.bar_close)}{c.basis === 'dihitung_ulang' ? ' · skor belakangan' : ''}</span>
                      <span className="ml-auto flex items-center gap-2">
                        {c.r_net !== null && c.status !== 'open' && <span className={cn('num font-semibold', signClass(c.r_net))}>{formatR(c.r_net)}</span>}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Fold>
          )}
          <Fold title="Cara skor dihitung" className="rounded-2xl">
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
              {d.rule.map((t) => <li key={t}>{t}</li>)}
              <li>{d.note}</li>
            </ul>
          </Fold>
        </div>
      )}
    </Panel>
    </div>
  )
}
