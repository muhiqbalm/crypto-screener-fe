'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, RefreshCw, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Segmented } from '@/components/ui/segmented'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState, errorKind } from '@/components/shell/states'
import { Chip, Section } from '@/components/lab/Section'
import { BiasBadge, FactorChips, KeyakinanText, PresetCell } from '@/components/lab/outlook/OutlookBadges'
import { Disclaimer, OutlookDetailSheet } from '@/components/lab/outlook/OutlookDetailSheet'
import { useOutlook, useRefreshOutlook } from '@/lib/queries/outlook'
import {
  coinLabel,
  DEFAULT_INPUTS,
  filterRows,
  formatWib,
  parseBounded,
  sortRows,
  type OutlookFilter,
  type OutlookSortKey,
} from '@/lib/lab/outlook'
import { relativeTime } from '@/lib/lab/form'
import { apiErrorDetail } from '@/lib/api/errors'
import { formatPrice, formatScore, formatUsdSigned, signClass } from '@/lib/utils/format'
import { notify } from '@/lib/utils/toast'
import { cn } from '@/lib/utils/cn'
import type { OutlookInputs, OutlookRow, Sizing } from '@/lib/api/types/outlook'

const FILTERS: [OutlookFilter, string][] = [
  ['long', 'Long'],
  ['short', 'Short'],
  ['fresh', 'Sinyal baru'],
  ['pass', 'Preset LOLOS saja'],
]

const COLS: { key: OutlookSortKey | null; label: string; title?: string; right?: boolean; hide?: string }[] = [
  { key: 'symbol', label: 'Koin' },
  { key: 'bias', label: 'Bias', title: 'Arah = posisi strategi; faktor lain hanya mengubah keyakinan' },
  { key: 'since', label: 'Strategi', title: 'Posisi strategi Rosyade 4H + sejak kapan' },
  { key: null, label: 'Entry / SL / TP', right: true, hide: 'hidden md:table-cell' },
  { key: 'profit_tp', label: 'Profit TP', right: true, title: 'Profit bersih di TP jika masuk sekarang (biaya termasuk)' },
  { key: 'loss_sl', label: 'Rugi SL', right: true, title: 'Rugi bersih di SL jika masuk sekarang (biaya termasuk)' },
  { key: 'rr', label: 'R:R', right: true, hide: 'hidden sm:table-cell' },
  { key: null, label: 'Preset', hide: 'hidden lg:table-cell' },
  { key: 'support', label: 'Faktor', title: 'Urut: skor dukungan faktor lain', hide: 'hidden xl:table-cell' },
]

const th = 'px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground'

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

function InputsBar({ onChange }: { onChange: (i: OutlookInputs) => void }) {
  const [capital, setCapital] = useState(String(DEFAULT_INPUTS.capital))
  const [leverage, setLeverage] = useState(String(DEFAULT_INPUTS.leverage))
  const [riskPct, setRiskPct] = useState(String(DEFAULT_INPUTS.risk_pct))
  const [sizing, setSizing] = useState<Sizing>('notional')
  const cap = parseBounded(capital, 1, 1e9)
  const lev = parseBounded(leverage, 1, 20)
  const risk = parseBounded(riskPct, 0.1, 10)
  const valid = cap !== null && lev !== null && (sizing === 'notional' || risk !== null)
  const next = useDebounced(
    valid ? { capital: cap as number, leverage: lev as number, sizing, risk_pct: risk ?? 1 } : null,
    400,
  )
  const key = next ? `${next.capital}|${next.leverage}|${next.sizing}|${next.risk_pct}` : ''
  useEffect(() => {
    if (next) onChange(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label htmlFor="ol-capital" className="text-xs">Modal (USDT)</Label>
        <Input id="ol-capital" inputMode="decimal" value={capital} onChange={(e) => setCapital(e.target.value)}
          aria-invalid={cap === null} className={cn('h-8 w-32 font-mono text-sm', cap === null && 'border-bearish')} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="ol-lev" className="text-xs">Leverage</Label>
        <Input id="ol-lev" inputMode="decimal" value={leverage} onChange={(e) => setLeverage(e.target.value)}
          aria-invalid={lev === null} className={cn('h-8 w-20 font-mono text-sm', lev === null && 'border-bearish')} />
      </div>
      <div className="space-y-1">
        <span className="block text-xs font-medium">Ukuran posisi</span>
        <Segmented<Sizing>
          aria-label="Mode ukuran posisi"
          value={sizing}
          onChange={setSizing}
          options={[
            { value: 'notional', label: 'Modal × leverage' },
            { value: 'risk', label: 'Risiko % di SL' },
          ]}
        />
      </div>
      {sizing === 'risk' && (
        <div className="space-y-1">
          <Label htmlFor="ol-risk" className="text-xs">Risiko (% modal)</Label>
          <Input id="ol-risk" inputMode="decimal" value={riskPct} onChange={(e) => setRiskPct(e.target.value)}
            aria-invalid={risk === null} className={cn('h-8 w-20 font-mono text-sm', risk === null && 'border-bearish')} />
        </div>
      )}
      <p className="basis-full text-2xs text-muted-foreground">
        Default 1× (posisi = modal). Riset Lab: 2× terlalu berisiko untuk strategi ini (drawdown terlalu dalam).
        {!valid && <span className="text-bearish"> Isi modal 1–1.000.000.000 dan leverage 1–20.</span>}
      </p>
    </div>
  )
}

function Row({ r, onOpen }: { r: OutlookRow; onOpen: () => void }) {
  if (r.unavailable) {
    return (
      <tr>
        <td className="px-3 py-2 font-mono text-xs font-semibold">{coinLabel(r.symbol)}</td>
        <td colSpan={COLS.length - 1} className="px-3 py-2 text-xs text-muted-foreground">
          Tidak tersedia{r.error ? `: ${r.error}` : ''}
        </td>
      </tr>
    )
  }
  const st = r.strategy
  const pj = r.projection
  return (
    <tr
      className={cn('cursor-pointer hover:bg-muted/40', st.fresh && 'bg-info/[0.05]', r.stale && 'opacity-70')}
      onClick={onOpen}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onOpen())}
      tabIndex={0}
      aria-label={`Detail outlook ${coinLabel(r.symbol)}`}
    >
      <td className="px-3 py-2">
        <div className="font-mono text-xs font-semibold">{coinLabel(r.symbol)}</div>
        <div className="font-mono text-[10px] text-muted-foreground">{formatPrice(r.price)}</div>
      </td>
      <td className="px-3 py-2">
        <BiasBadge bias={r.bias} />
        <div><KeyakinanText bias={r.bias} /></div>
      </td>
      <td className="px-3 py-2 text-xs">
        {st.side ? (
          <>
            <span className={cn('font-semibold', st.side === 'long' ? 'text-bullish' : 'text-bearish')}>{st.side.toUpperCase()}</span>
            {st.fresh && <Badge variant="info" size="xs" className="ml-1"><Sparkles aria-hidden="true" />BARU</Badge>}
            <div className="text-[10px] text-muted-foreground">sejak {formatWib(st.entry_at)}</div>
          </>
        ) : (
          <span className="text-muted-foreground">FLAT</span>
        )}
      </td>
      <td className="hidden px-3 py-2 text-right font-mono text-[11px] tabular-nums md:table-cell">
        {st.side ? (
          <>
            <div>{formatPrice(st.entry_price)}</div>
            <div className="text-bearish">{formatPrice(st.sl)}</div>
            <div className="text-bullish">{formatPrice(st.tp)}</div>
          </>
        ) : '—'}
      </td>
      <td className={cn('px-3 py-2 text-right font-mono text-xs tabular-nums', signClass(pj?.at_tp?.net))}>
        {pj?.available ? formatUsdSigned(pj.at_tp?.net) : '—'}
      </td>
      <td className={cn('px-3 py-2 text-right font-mono text-xs tabular-nums', signClass(pj?.at_sl?.net))}>
        {pj?.available ? formatUsdSigned(pj.at_sl?.net) : '—'}
      </td>
      <td className="hidden px-3 py-2 text-right font-mono text-xs tabular-nums sm:table-cell">
        {pj?.rr ? formatScore(pj.rr, 2) : '—'}
      </td>
      <td className="hidden max-w-[11rem] px-3 py-2 lg:table-cell"><PresetCell strategy={st} /></td>
      <td className="hidden px-3 py-2 xl:table-cell"><FactorChips factors={r.factors} side={st.side} /></td>
    </tr>
  )
}

export function OutlookView() {
  const [inputs, setInputs] = useState<OutlookInputs>(DEFAULT_INPUTS)
  const q = useOutlook(inputs)
  const refresh = useRefreshOutlook()
  const [active, setActive] = useState<Set<OutlookFilter>>(new Set())
  const [sort, setSort] = useState<{ key: OutlookSortKey; desc: boolean }>({ key: 'keyakinan', desc: true })
  const [open, setOpen] = useState<string | null>(null)
  const rows = useMemo(() => sortRows(filterRows(q.data?.rows ?? [], active), sort.key, sort.desc), [q.data, active, sort])
  const busy = q.data?.refresh?.status === 'queued' || q.data?.refresh?.status === 'running'
  const meta = q.data?.meta

  const toggleFilter = (f: OutlookFilter) =>
    setActive((s) => {
      const n = new Set(s)
      if (n.has(f)) n.delete(f)
      else n.add(f)
      return n
    })
  const toggleSort = (key: OutlookSortKey) =>
    setSort((s) => (s.key === key ? { key, desc: !s.desc } : { key, desc: key !== 'symbol' }))

  const onRefresh = () =>
    refresh.mutate(undefined, {
      onSuccess: () => notify.info('Outlook dijadwalkan', { description: 'Dihitung ulang di worker Lab (±3 menit untuk 29 koin).' }),
      onError: (e) => notify.error('Gagal menjadwalkan', { description: apiErrorDetail(e) ?? undefined }),
    })

  const counts = useMemo(() => {
    const all = q.data?.rows ?? []
    return {
      long: all.filter((r) => r.strategy?.side === 'long').length,
      short: all.filter((r) => r.strategy?.side === 'short').length,
      flat: all.filter((r) => !r.unavailable && !r.strategy?.side).length,
    }
  }, [q.data])

  return (
    <div className="space-y-4">
      <Disclaimer />
      <Section
        title="Modal & ukuran posisi"
        description="Dipakai untuk menghitung profit/rugi dalam dolar di TP dan SL. Tidak ada order yang dikirim."
      >
        <InputsBar onChange={setInputs} />
      </Section>

      <Section
        title="Outlook semua koin"
        description={
          meta?.computed_at
            ? `Close 4H: ${formatWib(meta.last_bar ? new Date(Date.parse(meta.last_bar) + 4 * 3600_000).toISOString() : null)} · dihitung ${relativeTime(meta.computed_at)} · otomatis tiap close 4H · ${counts.long} long, ${counts.short} short, ${counts.flat} flat`
            : 'Dihitung otomatis setelah setiap close candle 4H.'
        }
        action={
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={busy || refresh.isPending} className="h-8 gap-1.5 text-xs">
            <RefreshCw className={cn('h-3.5 w-3.5', busy && 'animate-spin')} />
            {busy ? `Menghitung… ${q.data?.refresh?.progress?.done ?? 0}/${q.data?.refresh?.progress?.total || '—'}` : 'Hitung ulang'}
          </Button>
        }
      >
        <div className="mb-3 flex flex-wrap items-center gap-1.5" aria-label="Filter">
          {FILTERS.map(([v, label]) => (
            <Chip key={v} active={active.has(v)} onClick={() => toggleFilter(v)} className="h-7 px-2.5">{label}</Chip>
          ))}
          {meta?.fear_greed && (
            <span className="ml-auto text-2xs text-muted-foreground" title="Fear & Greed pasar (alternative.me): konteks, bukan sinyal">
              Fear & Greed: <span className="num font-medium text-foreground">{meta.fear_greed.value}</span> ({meta.fear_greed.classification})
            </span>
          )}
        </div>
        {q.isPending ? (
          <div className="space-y-2" aria-busy="true">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : q.error ? (
          <ErrorState kind={errorKind(q.error)} onRetry={() => q.refetch()} message="Gagal memuat Outlook Koin." />
        ) : (q.data?.rows ?? []).length === 0 ? (
          <EmptyState
            title="Outlook belum dihitung"
            description={busy ? 'Sedang dihitung pertama kali (±3 menit) — halaman update otomatis.' : 'Klik "Hitung ulang" untuk menghitung pertama kali.'}
          />
        ) : rows.length === 0 ? (
          <EmptyState title="Tidak ada koin yang cocok dengan filter" />
        ) : (
          <div className="-mx-4 overflow-x-auto sm:mx-0 sm:rounded-lg sm:border sm:border-border/60">
            <table className="w-full text-sm sm:min-w-[640px]">
              <thead className="border-b border-border/60 bg-muted/30">
                <tr>
                  {COLS.map((c) => (
                    <th key={c.label} className={cn(th, c.right ? 'text-right' : 'text-left', c.hide)} title={c.title}
                      aria-sort={c.key && sort.key === c.key ? (sort.desc ? 'descending' : 'ascending') : undefined}>
                      {c.key ? (
                        <button type="button" onClick={() => toggleSort(c.key as OutlookSortKey)} className="inline-flex items-center gap-1 uppercase hover:text-foreground">
                          {c.label}
                          {sort.key === c.key && (sort.desc ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}
                        </button>
                      ) : c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {rows.map((r) => <Row key={r.symbol} r={r} onOpen={() => setOpen(r.symbol)} />)}
              </tbody>
            </table>
          </div>
        )}
        <details className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          <summary className="cursor-pointer font-medium text-foreground">Cara bias & keyakinan dihitung</summary>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {(q.data?.method.text ?? []).map((t) => <li key={t}>{t}</li>)}
            <li>Profit/rugi dihitung jika masuk sekarang di harga close 4H terakhir, dengan SL/TP strategi saat ini, termasuk komisi 0,05% + slippage 0,05% per sisi; funding tidak termasuk.</li>
            <li>Chip faktor: + mengarah long, − mengarah short, 0 netral, · tidak tersedia. Arahkan kursor untuk detail.</li>
          </ul>
        </details>
      </Section>
      <OutlookDetailSheet symbol={open} inputs={inputs} onClose={() => setOpen(null)} />
    </div>
  )
}
