'use client'

import Link from 'next/link'
import { Layers, PlayCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Term } from '@/components/ui/term'
import { DeckCard, Meter, SectionHead } from '@/components/lab/arena/deck'
import { BasketAvatar, OutcomePill, PrePaperHint } from '@/components/lab/basket/BasketBits'
import { formatCount } from '@/lib/utils/format'
import { formatTimeframe } from '@/lib/utils/time'
import { basketHref, sizingText } from '@/lib/lab/basket'
import { useBaskets } from '@/lib/queries/basket'

/**
 * Preset page: each basket as ONE entry (one default strategy on a fixed coin list, one paper
 * account). Baskets come from the pre-registration seed, never from this page, so there is no
 * "Mulai paper" here: only progress and a link to Paper berjalan. Hidden while there is none.
 */
export function BasketPresetSection() {
  const q = useBaskets()
  const rows = q.data?.rows ?? []
  if (q.isPending || rows.length === 0) return null
  return (
    <section className="space-y-4" aria-label="Basket">
      <SectionHead
        icon={Layers}
        title={
          <>
            <Term k="basket" /> · satu strategi, banyak koin
          </>
        }
        sub="Parameter default di daftar koin tetap; semua koin masuk ke satu akun simulasi dan dihitung bersama menuju 30 transaksi."
      />
      <div className="grid gap-5 lg:grid-cols-2">
        {rows.map((r) => {
          const b = r.basket
          return (
            <DeckCard key={b.id} outline="lab" id={`basket-preset-${b.id}`} className="scroll-mt-24">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <BasketAvatar n={b.n_coins} size={44} />
                  <div className="min-w-0">
                    <h3 className="font-display text-lg font-semibold leading-snug tracking-tight [overflow-wrap:anywhere]">{b.name}</h3>
                    <div className="truncate text-[13px] text-muted-foreground">
                      {b.template_label} · {formatTimeframe(b.timeframe)} · {formatCount(b.n_coins)} koin
                    </div>
                  </div>
                </div>
                <OutcomePill status={r.evaluation.status} />
              </div>
              <p className="mt-4 text-[14px] text-muted-foreground">{sizingText(b.sizing, b.label)}, satu akun 10,000 USDT.</p>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-[13px]">
                  <span className="text-muted-foreground">Transaksi basket</span>
                  <span className="font-semibold tabular-nums">
                    {r.progress.n}/{r.progress.of}
                  </span>
                </div>
                <Meter value={Math.min(r.progress.n, r.progress.of)} max={r.progress.of} label={`${r.progress.n} dari ${r.progress.of} transaksi basket`} />
              </div>
              {r.progress.n === 0 && r.waiting.n > 0 && (
                <PrePaperHint
                  className="mt-3"
                  text={`${formatCount(r.waiting.n)} koin masih memegang posisi dari sebelum paper dimulai; paper menunggu sinyal berikutnya.`}
                />
              )}
              <div className="mt-5 border-t pt-4">
                <Button asChild size="sm" className="rounded-full">
                  <Link href={basketHref(b.id)}>
                    <PlayCircle aria-hidden="true" /> Lihat di Paper berjalan
                  </Link>
                </Button>
              </div>
            </DeckCard>
          )
        })}
      </div>
    </section>
  )
}
