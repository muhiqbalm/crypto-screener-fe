'use client'

import { useState } from 'react'
import { ArrowUpRight, Minus, Newspaper, RefreshCw, Search, TrendingDown, TrendingUp } from 'lucide-react'
import { PageContainer, PageHeader, SectionHeading } from '@/components/shell/page'
import { EmptyState, ErrorState } from '@/components/shell/states'
import { Badge } from '@/components/ui/badge'
import { CoinAvatar } from '@/components/ui/coin-avatar'
import { Panel } from '@/components/ui/hero-card'
import { IconChip } from '@/components/ui/icon-title'
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

const TONE_STYLE: Record<HeadlineTone, { Icon: typeof TrendingUp; variant: 'bullish' | 'bearish' | 'muted'; bar: string }> = {
  positif: { Icon: TrendingUp, variant: 'bullish', bar: 'bg-bullish' },
  negatif: { Icon: TrendingDown, variant: 'bearish', bar: 'bg-bearish' },
  netral: { Icon: Minus, variant: 'muted', bar: 'bg-muted-foreground/50' },
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
    <Badge variant={st.variant} className="relative z-10">
      <st.Icon aria-hidden="true" />
      {HEADLINE_TONE_LABEL[t]}
    </Badge>
  )
}

function HeadlineBalance({ items, className }: { items: NewsItem[]; className?: string }) {
  const c = toneCounts(items)
  const n = items.length
  const lead = c.positif > c.negatif ? 'positif' : c.negatif > c.positif ? 'negatif' : 'imbang'
  return (
    <Panel className={cn('flex flex-col gap-5', className)} aria-label="Sentimen judul">
      <div className="flex items-center gap-3">
        <IconChip icon={Newspaper} tone="info" />
        <h2 className="text-lg font-bold">
          <Term k="headline_sentiment" />
        </h2>
      </div>
      {n === 0 ? (
        <p className="text-base text-muted-foreground">Judul berita tidak tersedia saat ini.</p>
      ) : (
        <>
          <div className="space-y-2">
            <p className="num display flex items-baseline gap-2 text-5xl font-extrabold leading-none">
              <span className="text-bullish">{c.positif}</span>
              <span className="text-2xl text-muted-foreground">:</span>
              <span className="text-bearish">{c.negatif}</span>
            </p>
            <p className={cn('text-base font-semibold', lead === 'positif' ? 'text-bullish' : lead === 'negatif' ? 'text-bearish' : 'text-foreground')}>
              {lead === 'positif' ? 'Lebih banyak positif' : lead === 'negatif' ? 'Lebih banyak negatif' : 'Berimbang'}
            </p>
          </div>
          <div className="space-y-3">
            <div className="flex h-3.5 w-full gap-1 overflow-hidden rounded-full" role="img" aria-label={`${c.positif} positif, ${c.negatif} negatif, ${c.netral} netral dari ${n} judul`}>
              {(['positif', 'netral', 'negatif'] as const).map((t) =>
                c[t] ? <span key={t} className={cn('h-full rounded-full', TONE_STYLE[t].bar)} style={{ width: `${(c[t] / n) * 100}%` }} /> : null,
              )}
            </div>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-hidden="true">
              {(['positif', 'netral', 'negatif'] as const).map((t) => (
                <li key={t} className="inline-flex items-center gap-1.5">
                  <span className={cn('h-2.5 w-2.5 rounded-[3px]', TONE_STYLE[t].bar)} />
                  <b className="num">{c[t]}</b>
                  <span className="text-muted-foreground">{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-auto text-2xs text-muted-foreground">{n} judul terbaru · ditebak dari kata kunci di judul.</p>
        </>
      )}
    </Panel>
  )
}

function NewsCard({ item }: { item: NewsItem }) {
  const href = safeExternalUrl(item.linkUrl)
  return (
    <Panel as="article" interactive={Boolean(href)} className="relative flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ToneBadge s={item.sentiment} />
        {item.publishedAt && (
          <time dateTime={item.publishedAt} title={formatTime(item.publishedAt)} className="num text-2xs text-muted-foreground">
            {formatAge(item.publishedAt)}
          </time>
        )}
      </div>
      <h3 className="line-clamp-3 text-lg font-bold leading-snug">
        {href ? (
          // The whole card is the link (stretched), so it lifts on hover like other clickable cards.
          <a href={href} target="_blank" rel="noopener noreferrer" className="after:absolute after:inset-0 after:rounded-3xl hover:underline focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring">
            {item.title}
          </a>
        ) : (
          item.title
        )}
      </h3>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3">
          {item.affectedSymbols.map((sym) => {
            const tag = coinTag(sym)
            return (
              <span key={sym} className="inline-flex items-center gap-1.5 text-sm font-semibold">
                {tag !== 'Umum' && <CoinAvatar symbol={sym} size="sm" />}
                {tag}
              </span>
            )
          })}
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-info">
          {item.source}
          {href && <ArrowUpRight className="h-4 w-4" aria-hidden="true" />}
        </span>
      </div>
    </Panel>
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
            <p role="status" className="rounded-2xl border border-warn/40 bg-warn/10 px-4 py-3 text-xs text-warn">
              Sebagian data tidak tersedia: {missing.length ? missing.join(', ') : 'sebagian sumber'}.
            </p>
          )}

          <div className="grid gap-5 lg:grid-cols-3 lg:gap-6">
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
            <SectionHeading title={<span id="judul-terbaru">Judul terbaru</span>} />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative sm:w-72">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  aria-label="Cari judul atau koin"
                  placeholder="Cari judul atau koin…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 rounded-full pl-10 text-sm"
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
            {shown.length === 0 ? (
              <EmptyState
                title={items.length ? 'Tidak ada judul yang cocok' : 'Judul berita tidak tersedia saat ini'}
                description={items.length ? 'Ubah pencarian atau saringan nada judul.' : 'Sumber RSS sedang tidak bisa diambil. Tidak ada judul yang ditebak.'}
              />
            ) : (
              <div className="grid gap-5 md:grid-cols-2 lg:gap-6">
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
