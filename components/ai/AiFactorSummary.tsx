'use client'

/**
 * Ringkasan AI (phase 1 of the AI plan): how the context factors (BTC regime, funding, open
 * interest, whale flow, Fear & Greed, news) relate to the Outlook direction, written by a model
 * from data BMTM already has. Every number was checked against that data in the backend.
 *
 * - `AiFactorCard`: full card on /koin/[simbol].
 * - `AiFactorLine`: compact version inside the best-opportunity card on /koin (no links or
 *   buttons: it sits inside a <Link>).
 *
 * Off / no summary: members see nothing; admins see one subtle line (the backend sends `note`
 * only to admins). Loading and errors (incl. 403) render nothing. Read-only: no actions.
 */
import { CircleAlert, CircleCheck, CircleMinus, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { IconChip } from '@/components/ui/icon-title'
import { InfoTip } from '@/components/ui/info-tip'
import { Panel } from '@/components/ui/hero-card'
import { Badge } from '@/components/ui/badge'
import type { Tone } from '@/components/ui/tone'
import { useAiFactors } from '@/lib/queries/ai'
import { formatTime } from '@/lib/utils/time'
import { cn } from '@/lib/utils/cn'
import type { AiEffect, AiFactor, AiSummary } from '@/lib/api/types/ai'

export const AI_LABEL = 'AI · bisa salah · bukan saran investasi'

const EFFECT: Record<AiEffect, { text: string; tone: Tone; icon: LucideIcon }> = {
  mendukung: { text: 'Mendukung', tone: 'info', icon: CircleCheck },
  melemahkan: { text: 'Melemahkan', tone: 'warn', icon: CircleAlert },
  netral: { text: 'Netral', tone: 'muted', icon: CircleMinus },
}

const wib = (iso: string | null | undefined) => formatTime(iso, { year: false })

function EffectPill({ effect }: { effect: AiEffect }) {
  const e = EFFECT[effect] ?? EFFECT.netral
  const Icon = e.icon
  return (
    <Badge variant={e.tone} className="shrink-0 gap-1 px-2.5 py-0.5 text-2xs">
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />{e.text}
    </Badge>
  )
}

function FactorItem({ f }: { f: AiFactor }) {
  return (
    <li className="flex min-w-0 flex-col gap-1.5 rounded-2xl border bg-muted/20 px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-2xs text-muted-foreground">{f.label}</span>
        <EffectPill effect={f.effect} />
      </div>
      <span className="min-w-0 break-words text-base font-semibold leading-snug">{f.value}</span>
      <span className="text-2xs text-muted-foreground">Sumber: {f.source}</span>
    </li>
  )
}

function counts(s: AiSummary): string {
  const n = (e: AiEffect) => s.factors.filter((f) => f.effect === e).length
  return [n('mendukung') && `${n('mendukung')} mendukung`, n('melemahkan') && `${n('melemahkan')} melemahkan`]
    .filter(Boolean)
    .join(' · ')
}

/** One subtle line for admins: off / pending / rejected. */
function AdminNote({ note, className }: { note: string; className?: string }) {
  return (
    <p className={cn('flex items-center gap-1.5 text-2xs text-muted-foreground', className)} data-testid="ai-note">
      <Sparkles className="h-3.5 w-3.5 shrink-0 text-lab/70" aria-hidden="true" />
      {note}
    </p>
  )
}

/** Full "Ringkasan AI" card for the coin page. */
export function AiFactorCard({ symbol, className }: { symbol: string; className?: string }) {
  const q = useAiFactors(symbol)
  const d = q.data
  if (!d || q.error) return null
  const s = d.summary
  if (!s) return d.note ? <AdminNote note={d.note} className={className} /> : null
  const meta = s.meta
  return (
    <Panel className={className} aria-label="Ringkasan AI">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <IconChip icon={Sparkles} tone="lab" />
          <div className="min-w-0">
            <h2 className="flex items-center gap-1 text-lg font-bold leading-tight tracking-tight">
              Ringkasan AI
              <InfoTip title="Ringkasan AI" label="Apa itu Ringkasan AI?">
                Ditulis model AI dari data yang sudah ada di BMTM: arah Outlook, kondisi pasar BTC, funding, open
                interest, arus whale, Fear &amp; Greed dan berita. Setiap angka dicek ke data sumber; ringkasan dengan
                angka di luar data tidak ditampilkan. AI tidak mengubah keputusan Outlook dan tidak pernah mengirim order.
              </InfoTip>
            </h2>
            <p className="text-sm text-muted-foreground">Faktor konteks terhadap arah Outlook</p>
          </div>
        </div>
        <span className="eyebrow text-lab">{d.label || AI_LABEL}</span>
      </div>

      <p className="mt-4 max-w-4xl display text-lg font-semibold leading-snug tracking-tight sm:text-xl">{s.sentence}</p>

      {s.factors.length > 0 && (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {s.factors.map((f) => <FactorItem key={f.factor} f={f} />)}
        </ul>
      )}

      {s.data_gaps.length > 0 && (
        <div className="mt-4 text-2xs text-muted-foreground">
          <span className="font-semibold">Data kosong (tidak ditebak):</span> {s.data_gaps.join(' ')}
        </div>
      )}

      <p className="mt-4 text-2xs text-muted-foreground">
        Data close 4H {wib(s.bar_close)} · dibuat {wib(s.created_at)}
        {meta?.model ? ` · ${meta.model}` : ''}
        {meta?.cost_usd !== undefined && meta?.cost_usd !== null ? ` · biaya $${meta.cost_usd.toFixed(4)}` : ''}
        {meta && meta.dropped_factors > 0 ? ` · ${meta.dropped_factors} faktor dibuang validasi` : ''}
      </p>
    </Panel>
  )
}

/** Compact Ringkasan AI inside the best-opportunity card on /koin (pure text, no controls). */
export function AiFactorLine({ symbol, className }: { symbol: string; className?: string }) {
  const q = useAiFactors(symbol)
  const d = q.data
  if (!d || q.error) return null
  const s = d.summary
  if (!s) return d.note ? <AdminNote note={d.note} className={cn('mt-4', className)} /> : null
  const c = counts(s)
  return (
    <div className={cn('mt-5 border-t border-border/60 pt-4', className)} data-testid="ai-line">
      <div className="eyebrow flex items-center gap-1.5 text-lab">
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />Ringkasan AI
      </div>
      <p className="mt-1.5 text-sm leading-relaxed">{s.sentence}</p>
      <p className="mt-1 text-2xs text-muted-foreground">
        {d.label || AI_LABEL} · data {wib(s.bar_close)}{c ? ` · ${c}` : ''}
      </p>
    </div>
  )
}
