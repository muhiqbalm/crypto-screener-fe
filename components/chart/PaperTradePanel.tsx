'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { UseQueryResult } from '@tanstack/react-query'
import { AlertTriangle, ArrowDownRight, ArrowUpRight, FileText, Loader2, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { signClass } from '@/components/lab/LabBadges'
import { formatPrice, formatQty, formatScore, formatUsd, formatUsdSigned } from '@/lib/utils/format'
import { notify } from '@/lib/utils/toast'
import { cn } from '@/lib/utils/cn'
import {
  PAPER_LABEL,
  computePaperSize,
  unrealisedPnl,
  validatePaperOrder,
} from '@/lib/lab/paper'
import { useClosePaperPosition, useCreatePaperOrder, useSetAutopaper } from '@/lib/queries/paper'
import { sameId, type LabId } from '@/lib/api/types/lab'
import type { LabWatch, LabWatchPosition, PaperAccount, PaperPosition, PaperSide } from '@/lib/api/types/lab'

export interface PaperDraft {
  side: PaperSide | null
  sl: string
  tp: string
  qty: string
  note: string
}

export const EMPTY_DRAFT: PaperDraft = { side: null, sl: '', tp: '', qty: '', note: '' }

interface Props {
  symbol: string
  lastPrice: number | null
  accounts: UseQueryResult<PaperAccount[]>
  account: PaperAccount | null
  onAccountChange: (id: string) => void
  positions: PaperPosition[]
  positionsLoading: boolean
  draft: PaperDraft
  onDraftChange: (d: PaperDraft) => void
  watchId: string | null
  watch: LabWatch | null
  strategyPosition: LabWatchPosition | null
}

export function PaperBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border border-warn/40 bg-warn/15 px-1.5 py-0.5 font-mono text-3xs font-bold text-warn',
        className,
      )}
    >
      {PAPER_LABEL}
    </span>
  )
}

export function PaperTradePanel(p: Props) {
  const [confirming, setConfirming] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [closingId, setClosingId] = useState<LabId | null>(null)
  const order = useCreatePaperOrder()
  const close = useClosePaperPosition()
  const autopaper = useSetAutopaper()

  const { draft, account } = p
  const set = (patch: Partial<PaperDraft>) => {
    setConfirming(false)
    p.onDraftChange({ ...draft, ...patch })
  }

  const size = computePaperSize({
    equity: account?.equity,
    riskPct: account?.risk_pct,
    leverageMax: account?.leverage_max,
    entry: p.lastPrice,
    sl: draft.sl.trim() === '' ? null : Number(draft.sl),
  })
  const qtyOverride = draft.qty.trim() === '' ? null : Number(draft.qty)

  const pickSide = (side: PaperSide) => {
    const sp = p.strategyPosition
    // Prefill from the strategy only when it holds the same side and the user has not typed anything.
    if (sp && sp.side.toLowerCase() === side && draft.sl === '' && draft.tp === '') {
      set({ side, sl: sp.sl !== null ? String(sp.sl) : '', tp: sp.tp !== null ? String(sp.tp) : '' })
    } else set({ side })
  }

  const review = () => {
    const errs = validatePaperOrder({ side: draft.side, price: p.lastPrice, sl: draft.sl, tp: draft.tp })
    if (!account) errs.account = 'Pilih akun paper'
    if (qtyOverride !== null && (!Number.isFinite(qtyOverride) || qtyOverride <= 0)) errs.qty = 'Qty harus angka > 0'
    setErrors(errs)
    if (Object.keys(errs).length === 0) setConfirming(true)
  }

  const submit = () => {
    if (!account || !draft.side) return
    order.mutate(
      {
        account_id: account.id,
        symbol: p.symbol,
        side: draft.side,
        sl: Number(draft.sl),
        ...(draft.tp.trim() ? { tp: Number(draft.tp) } : {}),
        ...(qtyOverride !== null ? { qty: qtyOverride } : {}),
        ...(draft.note.trim() ? { note: draft.note.trim() } : {}),
        ...(p.watchId ? { watch_id: p.watchId } : {}),
      },
      {
        onSuccess: () => {
          notify.success('Order PAPER tercatat', { description: 'Bukan order sungguhan — masuk jurnal.' })
          setConfirming(false)
          p.onDraftChange(EMPTY_DRAFT)
        },
        onError: () => notify.error('Order PAPER gagal', { description: 'Server Lab menolak atau tidak bisa dihubungi.' }),
      },
    )
  }

  const autoOn = Boolean(p.watch?.autopaper?.enabled && (!account || sameId(p.watch?.autopaper?.account_id, account.id)))

  return (
    <Card className="border-warn/30">
      <CardHeader className="space-y-2 pb-2">
        <CardTitle className="flex items-center justify-between gap-2 text-sm font-semibold tracking-tight">
          <span>Paper Trade</span>
          <Link href="/journal" className="inline-flex items-center gap-1 text-3xs font-semibold normal-case text-info hover:underline">
            <FileText className="h-3 w-3" /> Jurnal
          </Link>
        </CardTitle>
        <PaperBadge />
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Account */}
        {p.accounts.isPending ? (
          <Skeleton className="h-9 w-full" />
        ) : p.accounts.isError ? (
          <p className="text-xs text-bearish">
            Gagal memuat akun paper.{' '}
            <button type="button" className="underline cursor-pointer" onClick={() => p.accounts.refetch()}>Coba lagi</button>
          </p>
        ) : (p.accounts.data ?? []).length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Belum ada akun paper. <Link href="/journal" className="underline">Buat akun di halaman Jurnal</Link>.
          </p>
        ) : (
          <div className="space-y-1">
            <label htmlFor="paper-account" className="text-2xs font-medium">Akun paper</label>
            <select
              id="paper-account"
              value={account?.id ?? ''}
              onChange={(e) => p.onAccountChange(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-xs shadow-sm"
            >
              {(p.accounts.data ?? []).map((a) => (
                <option key={String(a.id)} value={String(a.id)} className="bg-popover">
                  {a.name} · equity {formatUsd(a.equity)}
                </option>
              ))}
            </select>
            {account && (
              <p className="font-mono text-3xs text-muted-foreground">
                Risk {account.risk_pct ?? '—'}% · leverage maks {account.leverage_max ?? '—'}x
              </p>
            )}
          </div>
        )}

        {account && (
          <>
            {/* Side */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                aria-pressed={draft.side === 'long'}
                onClick={() => pickSide('long')}
                className={cn('gap-1', draft.side === 'long' && 'border-bullish bg-bullish/15 text-bullish')}
              >
                <ArrowUpRight /> Long
              </Button>
              <Button
                type="button"
                variant="outline"
                aria-pressed={draft.side === 'short'}
                onClick={() => pickSide('short')}
                className={cn('gap-1', draft.side === 'short' && 'border-bearish bg-bearish/15 text-bearish')}
              >
                <ArrowDownRight /> Short
              </Button>
            </div>
            {errors.side && <p className="text-2xs text-bearish">{errors.side}</p>}

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label htmlFor="paper-sl" className="text-2xs font-medium">Stop loss *</label>
                <Input id="paper-sl" type="number" inputMode="decimal" step="any" value={draft.sl} onChange={(e) => set({ sl: e.target.value })} className={cn('h-8 font-mono text-xs', errors.sl && 'border-bearish')} />
              </div>
              <div className="space-y-1">
                <label htmlFor="paper-tp" className="text-2xs font-medium">Take profit</label>
                <Input id="paper-tp" type="number" inputMode="decimal" step="any" value={draft.tp} onChange={(e) => set({ tp: e.target.value })} className={cn('h-8 font-mono text-xs', errors.tp && 'border-bearish')} />
              </div>
            </div>
            {(errors.sl || errors.tp || errors.price) && (
              <p className="text-2xs text-bearish">{errors.sl ?? errors.tp ?? errors.price}</p>
            )}
            {p.strategyPosition && (
              <button
                type="button"
                className="text-2xs text-info underline cursor-pointer"
                onClick={() =>
                  set({
                    side: p.strategyPosition!.side.toLowerCase() === 'short' ? 'short' : 'long',
                    sl: p.strategyPosition!.sl !== null ? String(p.strategyPosition!.sl) : '',
                    tp: p.strategyPosition!.tp !== null ? String(p.strategyPosition!.tp) : '',
                  })
                }
              >
                Isi dari posisi strategi ({p.strategyPosition.side})
              </button>
            )}
            <p className="text-3xs text-muted-foreground">Garis SL/TP draft tampil di chart (oranye putus-putus). Ubah lewat input.</p>

            {/* Size */}
            <div className="rounded-md border border-border bg-muted/20 p-2 text-2xs">
              {size ? (
                <div className="space-y-0.5 font-mono">
                  <div className="flex justify-between"><span className="text-muted-foreground">Risiko</span><span>{formatUsd(size.riskAmount)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Qty (perkiraan)</span><span>{formatScore(size.qty, 4)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Notional</span><span>{formatUsd(size.notional)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Leverage efektif</span><span>{formatScore(size.leverage, 2)}x</span></div>
                  {size.capped && <p className="pt-1 font-sans text-warn">Ukuran dipotong oleh leverage maks akun.</p>}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  {account.risk_pct === undefined || account.risk_pct === null
                    ? 'Ukuran dihitung backend dari risk % akun.'
                    : 'Isi SL untuk lihat ukuran posisi dari risk %.'}
                </p>
              )}
              <p className="pt-1 text-3xs text-muted-foreground">Fill pakai harga market saat server menerima order; backend menghitung ulang ukuran.</p>
            </div>

            <details className="text-2xs">
              <summary className="cursor-pointer text-muted-foreground">Opsi lanjutan</summary>
              <div className="mt-2 space-y-2">
                <div className="space-y-1">
                  <label htmlFor="paper-qty" className="font-medium">Qty manual (opsional)</label>
                  <Input id="paper-qty" type="number" inputMode="decimal" step="any" value={draft.qty} onChange={(e) => set({ qty: e.target.value })} className={cn('h-8 font-mono text-xs', errors.qty && 'border-bearish')} />
                </div>
                <div className="space-y-1">
                  <label htmlFor="paper-note" className="font-medium">Catatan</label>
                  <Input id="paper-note" value={draft.note} onChange={(e) => set({ note: e.target.value })} className="h-8 text-xs" />
                </div>
              </div>
            </details>

            {!confirming ? (
              <Button type="button" className="w-full" onClick={review} disabled={!draft.side}>
                Review order PAPER
              </Button>
            ) : (
              <div role="alertdialog" aria-label="Konfirmasi order paper" className="space-y-2 rounded-md border border-warn/50 bg-warn/10 p-3 text-xs">
                <p className="flex items-center gap-1.5 font-bold text-warn">
                  <AlertTriangle className="h-3.5 w-3.5" /> Konfirmasi — {PAPER_LABEL}
                </p>
                <p className="font-mono">
                  {draft.side?.toUpperCase()} {p.symbol} @ market (~{formatPrice(p.lastPrice)}) · SL {draft.sl}
                  {draft.tp ? ` · TP ${draft.tp}` : ''}
                  {qtyOverride !== null ? ` · qty ${draft.qty}` : size ? ` · qty ~${formatScore(size.qty, 4)}` : ''}
                </p>
                <div className="flex gap-2">
                  <Button type="button" size="sm" className="flex-1" onClick={submit} disabled={order.isPending}>
                    {order.isPending && <Loader2 className="animate-spin" />}
                    Ya, catat PAPER
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setConfirming(false)}>
                    Batal
                  </Button>
                </div>
              </div>
            )}

            {/* Auto-follow */}
            {p.watchId && (
              <div className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
                <label htmlFor="autopaper" className="text-2xs">
                  <span className="font-medium">Auto-follow strategi</span>
                  <span className="block text-3xs text-muted-foreground">Sinyal watch ini otomatis dicatat sebagai PAPER di akun ini.</span>
                </label>
                <Switch
                  id="autopaper"
                  checked={autoOn}
                  disabled={autopaper.isPending}
                  onCheckedChange={(enabled) =>
                    autopaper.mutate(
                      { watchId: p.watchId!, accountId: account.id, enabled },
                      {
                        onSuccess: () => notify.info(enabled ? 'Auto-follow PAPER aktif' : 'Auto-follow PAPER mati'),
                        onError: () => notify.error('Gagal mengubah auto-follow'),
                      },
                    )
                  }
                />
              </div>
            )}

            {/* Open positions */}
            <div className="space-y-1.5">
              <h3 className="eyebrow">
                Posisi paper terbuka · {p.symbol}
              </h3>
              {p.positionsLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : p.positions.length === 0 ? (
                <p className="text-2xs text-muted-foreground">Tidak ada.</p>
              ) : (
                <ul className="space-y-1.5">
                  {p.positions.map((pos) => {
                    const upnl = unrealisedPnl(pos, p.lastPrice) ?? pos.unrealized_pnl ?? null
                    return (
                      <li key={pos.id} className="flex items-center justify-between gap-2 rounded border border-border px-2 py-1.5 font-mono text-2xs">
                        <span>
                          <span className={pos.side === 'long' ? 'text-bullish' : 'text-bearish'}>{pos.side.toUpperCase()}</span>{' '}
                          {formatQty(pos.qty)} @ {formatPrice(pos.entry_price)}
                          <span className={cn('ml-2', signClass(upnl))}>
                            {upnl === null ? '—' : formatUsdSigned(upnl)}
                          </span>
                        </span>
                        {sameId(closingId, pos.id) ? (
                          <span className="flex gap-1">
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-6 px-2 text-3xs"
                              disabled={close.isPending}
                              onClick={() =>
                                close.mutate(pos.id, {
                                  onSuccess: () => {
                                    notify.success('Posisi PAPER ditutup')
                                    setClosingId(null)
                                  },
                                  onError: () => notify.error('Gagal menutup posisi paper'),
                                })
                              }
                            >
                              Yakin
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 px-1" onClick={() => setClosingId(null)} aria-label="Batal tutup">
                              <X />
                            </Button>
                          </span>
                        ) : (
                          <Button size="sm" variant="outline" className="h-6 px-2 text-3xs" onClick={() => setClosingId(pos.id)}>
                            Tutup
                          </Button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
