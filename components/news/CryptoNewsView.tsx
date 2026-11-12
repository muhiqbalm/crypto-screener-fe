'use client'

import { useState } from 'react'
import { ArrowUpRight, Minus, Newspaper, RefreshCw, Search, TrendingDown, TrendingUp } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/shell/page'
import { EmptyState, ErrorState } from '@/components/shell/states'
import { DeckCard, IconBadge, SectionTitle, TONE_TEXT } from '@/components/bot/kit/Tiles'
import { Button } from '@/components/ui/button'
import { Freshness } from '@/components/ui/freshness'
import { Input } from '@/components/ui/input'
import { Segmented } from '@/components/ui/segmented'
import { Skeleton } from '@/components/ui/skeleton'
import { Term } from '@/components/ui/term'
import { useIntelNews } from '@/lib/queries/intel'
import { safeExternalUrl } from '@/lib/utils/safe-url'
import { formatAge, formatTime } from '@/lib/utils/time'
import { cn } from '@/lib/utils/cn'
import { fngZone } from '@/lib/intel/fng'
import {
  HEADLINE_TONE_LABEL,
  coinTag,
  filterNews,
  headlineTone,
  newsAnswer,
  toneCounts,
  type HeadlineTone,
  type ToneFilter,
} from '@/lib/intel/news'
import type { NewsItem } from '@/lib/api/types/intel'
import { FearGreedCard } from './FearGreedCard'

const TONE_STYLE: Record<HeadlineTone, { Icon: typeof TrendingUp; className: string; bar: string }> = {
  positif: { Icon: TrendingUp, className: 'border-bullish/30 bg-bullish/10 text-bullish', bar: 'bg-bullish/70' },
  negatif: { Icon: TrendingDown, className: 'border-bearish/30 bg-bearish/10 text-bearish', bar: 'bg-bearish/70' },
  netral: { Icon: Minus, className: 'border-border bg-muted/50 text-muted-foreground', bar: 'bg-muted-foreground/40' },
}

const MISSING_LABEL: Record<string, string> = {
  fearAndGreed: 'indeks takut–serakah',
  news: 'judul berita',
  catalystBias: 'ringkasan sentimen judul',
}

function ToneBadge({ s }: { s: NewsItem['sentiment'] }) {
  const t = headlineTone(s)
  const st = TONE_STYLE[t]
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-bold', st.className)}>
      <st.Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {HEADLINE_TONE_LABEL[t]}
    </span>
  )
}

function HeadlineBalance({ items, className }: { items: NewsItem[]; className?: string }) {
  const c = toneCounts(items)
  const n = items.length
  const lead = c.positif > c.negatif ? 'ok' : c.negatif > c.positif ? 'bad' : 'plain'
  return (
    <DeckCard className={cn('flex flex-col gap-4', className)}>
      <div className="flex items-center gap-3">
        <IconBadge icon={Newspaper} />
        <p className="text-[17px] font-semibold">
          <Term k="headline_sentiment" />
        </p>
      </div>
      {n === 0 ? (
        <p className="text-[16px] text-muted-foreground">Judul berita tidak tersedia saat ini.</p>
      ) : (
        <>
          <p className="num flex items-baseline gap-2 text-[40px] font-bold leading-none tracking-tight">
            <span className="text-bullish">{c.positif}</span>
            <span className="text-[24px] text-muted-foreground">:</span>
            <span className="text-bearish">{c.negatif}</span>
          </p>
          <p className={cn('text-[15px] font-semibold', TONE_TEXT[lead])}>
            {lead === 'ok' ? 'Lebih banyak positif' : lead === 'bad' ? 'Lebih banyak negatif' : 'Berimbang'}
            <span className="font-normal text-muted-foreground"> · {c.netral} netral dari {n}</span>
          </p>
          <div className="flex h-3 w-full gap-1 overflow-hidden rounded-full" role="img" aria-label={`${c.positif} positif, ${c.negatif} negatif, ${c.netral} netral`}>
            {(['positif', 'netral', 'negatif'] as const).map((t) =>
              c[t] ? <span key={t} className={cn('h-full rounded-full', TONE_STYLE[t].bar)} style={{ width: `${(c[t] / n) * 100}%` }} /> : null,
            )}
          </div>
          <p className="mt-auto text-[13px] text-muted-foreground">Ditebak dari kata kunci di judul.</p>
        </>
      )}
    </DeckCard>
  )
}

function NewsCard({ item }: { item: NewsItem }) {
  const href = safeExternalUrl(item.linkUrl)
  return (
    <article className="flex flex-col gap-4 rounded-3xl border border-border/70 bg-card p-6 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ToneBadge s={item.sentiment} />
        {item.publishedAt && (
          <time dateTime={item.publishedAt} title={formatTime(item.publishedAt)} className="num text-[13px] text-muted-foreground">
            {formatAge(item.publishedAt)}
          </time>
        )}
      </div>
      <h3 className="line-clamp-3 text-[17px] font-semibold leading-snug">
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="hover:underline">
            {item.title}
          </a>
        ) : (
          item.title
        )}
      </h3>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {item.affectedSymbols.map((sym) => (
            <span key={sym} className="rounded-full border border-border/70 bg-muted/60 px-2.5 py-0.5 text-[13px] font-semibold">
              {coinTag(sym)}
            </span>
          ))}
        </div>
        {href && (
          <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[14px] font-semibold text-info hover:underline">
            {item.source} <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </a>
        )}
      </div>
    </article>
  )
}

/** /news "Sentimen & berita": market mood (Fear & Greed) and the latest headlines, answer first. */
export function CryptoNewsView() {
  const { data: intel, isPending, error, isFetching, refetch } = useIntelNews()
  const [search, setSearch] = useState('')
  const [tone, setTone] = useState<ToneFilter>('semua')

  const fng = intel?.fearAndGreed ?? null
  const items: NewsItem[] = intel?.news ?? []
  const status = intel?.status ?? null
  const missing = (intel?.unavailableFields ?? []).map((f) => MISSING_LABEL[f]).filter(Boolean)
  const counts = toneCounts(items)
  const shown = filterNews(items, tone, search)
  const zone = fng ? fngZone(fng.value, fng.classification) : null
  const cachedAt = typeof intel?.cachedAt === 'number' ? intel.cachedAt : undefined

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Pasar"
        eyebrowIcon={Newspaper}
        title="Sentimen & berita"
        description="Suasana pasar dan judul berita terbaru, sebelum melihat koin."
        help={{
          apaIni:
            'Konteks pasar: seberapa takut atau serakah pasar (indeks alternative.me) dan nada judul berita kripto terbaru dari CoinTelegraph. Ini konteks, bukan sinyal beli atau jual.',
          caraPakai: [
            'Baca kalimat di kartu paling atas.',
            'Zona ekstrem (sangat takut / sangat serakah) layak diperhatikan, tapi bukan perintah.',
            'Nada judul hanya ditebak dari kata kunci; baca artikelnya sebelum mengambil keputusan.',
          ],
          istilah: ['fear_greed', 'headline_sentiment'],
        }}
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn(isFetching && 'animate-spin')} aria-hidden="true" />
            Muat ulang
          </Button>
        }
      />

      {isPending ? (
        <div className="grid gap-6 lg:grid-cols-3" aria-busy="true">
          <Skeleton className="h-72 w-full rounded-3xl lg:col-span-2" />
          <Skeleton className="h-72 w-full rounded-3xl" />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} message="Sentimen dan berita belum bisa dimuat." />
      ) : status === 'unavailable' ? (
        <ErrorState
          title="Sumber data sedang tidak bisa diambil"
          message="Indeks takut–serakah dan judul berita tidak tersedia saat ini. Tidak ada angka yang ditebak."
          onRetry={() => refetch()}
        />
      ) : (
        <>
          {status === 'partial' && (
            <p role="status" className="rounded-2xl border border-warn/40 bg-warn/10 px-4 py-3 text-[14px] text-warn">
              Sebagian data tidak tersedia: {missing.length ? missing.join(', ') : 'sebagian sumber'}.
            </p>
          )}

          <div className="grid items-stretch gap-6 lg:grid-cols-3">
            <FearGreedCard
              className="lg:col-span-2"
              value={fng?.value}
              classification={fng?.classification}
              sentence={zone ? `Pasar sedang ${zone.label.toLowerCase()}.` : undefined}
              footer={<Freshness updatedAt={cachedAt} />}
            />
            <HeadlineBalance items={items} />
          </div>
          <p className="sr-only">{newsAnswer(intel)}</p>

          <section aria-labelledby="judul-terbaru" className="space-y-5">
            <SectionTitle
              icon={Newspaper}
              id="judul-terbaru"
              title="Judul terbaru"
              action={
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                <div className="relative sm:w-64">
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <Input
                    aria-label="Cari judul atau koin"
                    placeholder="Cari judul atau koin…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-10 rounded-full pl-10 text-[15px]"
                  />
                </div>
                <Segmented
                  aria-label="Saring nada judul"
                  size="sm"
                  value={tone}
                  onChange={(v) => setTone(v as ToneFilter)}
                  options={[
                    { value: 'semua', label: `Semua ${items.length}` },
                    { value: 'positif', label: `Positif ${counts.positif}` },
                    { value: 'negatif', label: `Negatif ${counts.negatif}` },
                    { value: 'netral', label: `Netral ${counts.netral}` },
                  ]}
                />
              </div>
              }
            />
            {shown.length === 0 ? (
              <EmptyState
                title={items.length ? 'Tidak ada judul yang cocok' : 'Judul berita tidak tersedia saat ini'}
                description={items.length ? 'Ubah pencarian atau saringan nada judul.' : 'Sumber RSS sedang tidak bisa diambil. Tidak ada judul yang ditebak.'}
              />
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {shown.map((item) => (
                  <NewsCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </PageContainer>
  )
}
