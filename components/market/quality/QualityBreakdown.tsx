'use client'

/**
 * The parts of one skor kualitas, in plain Indonesian: the similar cases (outcome mix,
 * average and its 95% range), which factors agree (only proven ones count), the live record
 * of the same group, and any step down. Used in the popover on cards and inline on the coin page.
 */
import Link from 'next/link'
import { AlertTriangle, ArrowRight, Check, Minus, X } from 'lucide-react'
import { GradeLetter } from '@/components/market/quality/GradeLetter'
import { EvidenceBar } from '@/components/market/ui'
import { agreeWord, checkStatus, GRADE_LABEL, GRADE_TONE, isGrade, rangeBar, rangeText } from '@/lib/lab/quality'
import { factorValueText } from '@/lib/lab/outlook'
import { formatCount, formatR, signClass } from '@/lib/utils/format'
import { TONE_BG } from '@/components/ui/tone'
import { cn } from '@/lib/utils/cn'
import type { OutlookKualitas, QualityCheck, QualityEvidence } from '@/lib/api/types/quality'

/** −0.5R … +0.5R axis with the 95% range as a band and the average as a dot. */
export function RangeBar({ ev, tone = 'info', className }: {
  ev: Pick<QualityEvidence, 'lo95_r' | 'hi95_r' | 'mean_r'> | null | undefined
  tone?: keyof typeof TONE_BG
  className?: string
}) {
  const b = rangeBar(ev)
  if (!b) return null
  return (
    <div className={className}>
      <div className="relative h-3" role="img" aria-label={`Rentang 95% ${rangeText(ev as QualityEvidence) ?? '—'}, rata-rata ${formatR(ev?.mean_r)}`}>
        <span className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-muted" />
        <span className={cn('absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full opacity-40', TONE_BG[tone])}
          style={{ left: `${b.lo}%`, width: `${Math.max(1, b.hi - b.lo)}%` }} />
        <span className="absolute top-0 h-3 w-px bg-foreground/50" style={{ left: `${b.zero}%` }} />
        <span className={cn('absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-background', TONE_BG[tone])}
          style={{ left: `${b.mean}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-2xs text-muted-foreground" aria-hidden="true">
        <span>−0.5R</span><span>0</span><span>+0.5R</span>
      </div>
    </div>
  )
}

function CheckIcon({ c }: { c: QualityCheck }) {
  if (!c.available || c.agree === 0) return <Minus className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
  if (c.agree > 0) return <Check className="h-4 w-4 shrink-0 text-bullish" aria-hidden="true" />
  return <X className="h-4 w-4 shrink-0 text-bearish" aria-hidden="true" />
}

function checkValue(c: QualityCheck): string {
  return c.value ? factorValueText(c.value) : 'tidak tersedia'
}

export function QualityBreakdown({ q, showHeader = true, showLink = true, className }: {
  q: OutlookKualitas
  showHeader?: boolean
  showLink?: boolean
  className?: string
}) {
  const g = isGrade(q.grade) ? q.grade : null
  const ev = q.evidence
  const proven = q.checks.filter((c) => c.proven)
  const unproven = q.checks.filter((c) => !c.proven && c.available)
  const live = q.live
  const tone = g ? GRADE_TONE[g] : 'muted'
  return (
    <div className={cn('space-y-4 text-sm', className)}>
      {showHeader && (
        <div className="flex items-start gap-3">
          <GradeLetter grade={g} size="lg" decorative />
          <div className="min-w-0">
            <p className="text-base font-bold">{g ? `Skor ${g} · ${GRADE_LABEL[g]}` : 'Tidak dinilai'}</p>
            <p className="mt-0.5 text-2xs leading-relaxed text-muted-foreground">{q.why_none ?? q.base_reason}</p>
          </div>
        </div>
      )}

      {ev && (
        <section aria-label="Kasus serupa">
          <p className="eyebrow">Kasus serupa · {ev.scope === 'semua_strategi' ? 'semua strategi' : 'strategi ini'}</p>
          <p className="mt-1.5 leading-relaxed">{q.outcome_text}</p>
          <EvidenceBar className="mt-2.5" pTp={ev.p_tp} pSl={ev.p_sl} pBatal={ev.p_batal} />
          <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <span className="text-2xs text-muted-foreground">Rata-rata · rentang 95%</span>
            <span className="num text-sm font-semibold">
              <span className={signClass(ev.mean_r)}>{formatR(ev.mean_r)}</span>
              <span className="text-muted-foreground"> · {rangeText(ev) ?? '—'}</span>
            </span>
          </div>
          <RangeBar ev={ev} tone={tone === 'muted' ? 'muted' : tone} className="mt-1.5" />
          <p className="mt-1.5 text-2xs text-muted-foreground">Dasar: {ev.label}. Sampel kecil = rentang lebar = skor lebih rendah.</p>
        </section>
      )}

      {q.checks.length > 0 && (
        <section aria-label="Kesesuaian">
          <p className="eyebrow">Kesesuaian arah</p>
          {proven.length > 0 ? (
            <ul className="mt-1.5 space-y-1.5">
              {proven.map((c) => (
                <li key={c.key} className="flex items-start gap-2">
                  <CheckIcon c={c} />
                  <span className="min-w-0">
                    <span className="font-medium">{c.label}</span>
                    <span className="text-muted-foreground"> {checkValue(c)} · {agreeWord(c)}</span>
                    <span className={cn('block text-2xs', c.effect < 0 ? 'text-bearish' : 'text-muted-foreground')}>{checkStatus(c).text}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1.5 text-2xs text-muted-foreground">Belum ada faktor terbukti untuk panggilan ini; hanya faktor terbukti yang dihitung.</p>
          )}
          {unproven.length > 0 && (
            <p className="mt-2 text-2xs leading-relaxed text-muted-foreground">
              Belum terbukti, tidak dihitung: {unproven.map((c) => `${c.label} ${agreeWord(c)}`).join(' · ')}.
            </p>
          )}
        </section>
      )}

      {live && (
        <section aria-label="Rekam jejak live">
          <p className="eyebrow">Rekam jejak live · kelompok yang sama</p>
          {live.enough ? (
            <p className="mt-1.5">
              Rata-rata <span className={cn('num font-semibold', signClass(live.mean_r))}>{formatR(live.mean_r)}</span> dari{' '}
              {formatCount(live.n_pos)} posisi{live.negative ? ' — jelas negatif, skor diturunkan.' : '.'}
            </p>
          ) : (
            <p className="mt-1.5 text-muted-foreground">
              {formatCount(live.n_pos)} dari {formatCount(live.need_pos)} posisi selesai — belum dihitung.
              {live.n_done > 0 && <> Sementara <span className={cn('num font-semibold', signClass(live.mean_r))}>{formatR(live.mean_r)}</span>.</>}
            </p>
          )}
        </section>
      )}

      {q.adjustments.length > 0 && (
        <ul className="space-y-1.5 rounded-2xl bg-warn/10 p-3 text-2xs text-warn">
          {q.adjustments.map((a) => (
            <li key={a.text} className="flex items-start gap-1.5">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />{a.text}
            </li>
          ))}
        </ul>
      )}

      {q.basis === 'dihitung_ulang' && (
        <p className="text-2xs text-muted-foreground">Skor diberikan belakangan dengan aturan yang sama (panggilan sebelum skor ada).</p>
      )}

      {showLink && (
        <Link href="/koin#rekam-skor" className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-info hover:underline">
          Rekam jejak skor <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  )
}
