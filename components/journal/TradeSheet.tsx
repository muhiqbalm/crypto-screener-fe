'use client'

import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusPill } from '@/components/ui/status-pill'
import { Term } from '@/components/ui/term'
import { SideBadge } from '@/components/trading/SideBadge'
import { cn } from '@/lib/utils/cn'
import { displaySymbol, formatPrice, formatQty, formatR, formatUsdSigned, signClass } from '@/lib/utils/format'
import { formatTime } from '@/lib/utils/time'
import { notify } from '@/lib/utils/toast'
import { JOURNAL_SOURCE_LABEL, exitReasonLabel, isLiveSource, parseTags } from '@/lib/lab/paper'
import { usePatchJournal } from '@/lib/queries/paper'
import type { JournalEntry } from '@/lib/api/types/lab'

function Row({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b py-1.5 text-xs last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="num text-right">{children}</dd>
    </div>
  )
}

function NotesEditor({ entry }: { entry: JournalEntry }) {
  const patch = usePatchJournal()
  const [notes, setNotes] = useState(entry.notes ?? '')
  const [tags, setTags] = useState((entry.tags ?? []).join(', '))
  const dirty = notes !== (entry.notes ?? '') || tags !== (entry.tags ?? []).join(', ')
  const save = () =>
    patch.mutate(
      { id: entry.id, body: { notes, tags: parseTags(tags) } },
      {
        onSuccess: () => notify.success('Catatan disimpan'),
        onError: () => notify.error('Catatan gagal disimpan', { description: 'Coba lagi sebentar lagi.' }),
      },
    )
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">Catatan &amp; tag</h3>
      <label className="block space-y-1 text-xs">
        <span className="text-muted-foreground">Catatan</span>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Mis. entry telat, tunggu candle tutup" className="h-9 text-sm" />
      </label>
      <label className="block space-y-1 text-xs">
        <span className="text-muted-foreground">Tag, pisahkan dengan koma</span>
        <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="fomo, telat" className="h-9 font-mono text-sm" />
      </label>
      <Button size="sm" onClick={save} disabled={!dirty || patch.isPending}>
        {patch.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Check aria-hidden="true" />}
        Simpan catatan
      </Button>
    </section>
  )
}

/** One journal trade: every field, labelled PAPER or LIVE, plus the note/tag editor. */
export function TradeSheet({ entry, onClose }: { entry: JournalEntry | null; onClose: () => void }) {
  const live = isLiveSource(entry?.source)
  const costs = entry ? (entry.fees ?? 0) + (entry.funding ?? 0) : 0
  return (
    <Sheet open={Boolean(entry)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {entry && (
          <div className="space-y-5 p-5 pt-12">
            <header className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <SheetTitle className="text-lg font-bold">{displaySymbol(entry.symbol)}</SheetTitle>
                <SideBadge side={entry.side} />
                <StatusPill kind={live ? 'live' : 'paper'} />
              </div>
              <SheetDescription className="text-xs">
                {JOURNAL_SOURCE_LABEL[entry.source] ?? entry.source} · ditutup {formatTime(entry.exit_time)}
              </SheetDescription>
              {live && <p className="text-xs text-muted-foreground">Trade bot live memakai uang asli dan tidak dihitung di statistik paper.</p>}
            </header>
            <dl>
              <Row label="Hasil bersih">
                <span className={cn('font-semibold', signClass(entry.pnl))}>{formatUsdSigned(entry.pnl)}</span>
              </Row>
              <Row label={<Term k="r_multiple" short />}>
                <span className={signClass(entry.r_multiple)}>{entry.r_multiple === null ? 'tidak tersedia' : formatR(entry.r_multiple)}</span>
              </Row>
              <Row label="Masuk">
                {formatPrice(entry.entry_price)} · {formatTime(entry.entry_time)}
              </Row>
              <Row label="Keluar">{entry.exit_time ? `${formatPrice(entry.exit_price)} · ${exitReasonLabel(entry.exit_reason)}` : 'masih terbuka'}</Row>
              <Row label={<Term k="sl" short />}>{entry.sl === null ? 'tidak tersedia' : formatPrice(entry.sl)}</Row>
              <Row label={<Term k="tp" short />}>{entry.tp === null ? 'tidak ada' : formatPrice(entry.tp)}</Row>
              <Row label="Jumlah">{entry.qty === null ? 'tidak tersedia' : formatQty(entry.qty)}</Row>
              <Row label="Fee + funding">{entry.fees === null && entry.funding === null ? 'tidak tersedia' : formatUsdSigned(-Math.abs(costs))}</Row>
            </dl>
            <NotesEditor key={String(entry.id)} entry={entry} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
