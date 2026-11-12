'use client'

import { useState } from 'react'
import { ArrowUpRight, Minus, Newspaper, RefreshCw, Search, TrendingDown, TrendingUp } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/shell/page'
import { EmptyState, ErrorState } from '@/components/shell/states'
import { Section } from '@/components/lab/Section'
import { AnswerCard } from '@/components/ui/answer-card'
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
    <span className={cn('inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-2xs font-semibold', st.className)}>
      <st.Icon className="h-3 w-3" aria-hidden="true" />
      {HEADLINE_TONE_LABEL[t]}
    </span>
  )
}

function HeadlineBalance({ items, className }: { items: NewsItem[]; className?: string }) {
  const c = toneCounts(items)
  const n = items.length
  return (
    <Section
      className={className}
      icon={<Newspaper className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
      title={<Term k="headline_sentiment" />}
      description="Ditebak dari kata kunci di judul, bukan dari isi artikel."
    >
      {n === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">Judul berita tidak tersedia saat ini.</p>
      ) : (
        <div className="space-y-3">
          <p className="num text-sm">
            <b className="text-bullish">{c.positif}</b> positif · <b className="text-bearish">{c.negatif}</b> negatif · <b>{c.netral}</b> netral
            <span className="text-muted-foreground"> dari {n} judul</span>
          </p>
          <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full" role="img" aria-label={`${c.positif} positif, ${c.negatif} negatif, ${c.netral} netral`}>
            {(['positif', 'netral', 'negatif'] as const).map((t) =>
              c[t] ? <span key={t} className={cn('h-full', TONE_STYLE[t].bar)} style={{ width: `${(c[t] / n) * 100}%` }} /> : null,
            )}
          </div>
          <p className="text-3xs text-muted-foreground">Urutan batang: positif · netral · negatif. Hanya konteks, bukan sinyal beli atau jual.</p>
        </div>
      )}
    </Section>
  )
}

function NewsCard({ item }: { item: NewsItem }) {
  const href = safeExternalUrl(item.linkUrl)
  return (
    <article className="flex flex-col justify-between gap-3 rounded-xl border bg-card p-4 shadow-xs">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <ToneBadge s={item.sentiment} />
          {item.publishedAt && (
            <time dateTime={item.publishedAt} className="num text-2xs text-muted-foreground">
              {formatAge(item.publishedAt)} · {formatTime(item.publishedAt)}
            </time>
          )}
        </div>
        <h3 className="text-sm font-semibold leading-snug">
          {href ? (
            <a href={href} target="_blank" rel="noopener noreferrer" className="hover:underline">
              {item.title}
            </a>
          ) : (
            item.title
          )}
        </h3>
        <p className="text-xs leading-relaxed text-muted-foreground">{item.summary}</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-2xs text-muted-foreground">{item.source}</span>
          {item.affectedSymbols.map((sym) => (
            <span key={sym} className="rounded border bg-muted/60 px-1.5 py-0.5 font-mono text-3xs font-semibold">
              {coinTag(sym)}
            </span>
          ))}
        </div>
        {href && (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-info hover:underline"
          >
            Baca artikel <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
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
        description="Suasana pasar dan judul berita kripto terbaru, sebelum kamu melihat koin."
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
        <div className="space-y-4" aria-busy="true">
          <Skeleton className="h-36 w-full rounded-xl" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
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
          <AnswerCard
            tone="info"
            title="Pasar sedang bagaimana?"
            answer={newsAnswer(intel)}
            metrics={[
              { label: 'Takut–serakah', value: fng ? `${Math.round(fng.value)} · ${zone?.label ?? '—'}` : 'tidak tersedia' },
              { label: 'Judul positif / negatif', value: items.length ? `${counts.positif} / ${counts.negatif}` : 'tidak tersedia', hint: items.length ? `dari ${items.length} judul` : undefined },
            ]}
            footer={<Freshness updatedAt={cachedAt} />}
          />

          {status === 'partial' && (
            <p role="status" className="rounded-lg border border-warn/40 bg-warn/10 px-4 py-2.5 text-xs text-warn">
              Sebagian data tidak tersedia: {missing.length ? missing.join(', ') : 'sebagian sumber'}. Bagian itu ditulis &quot;tidak tersedia&quot;.
            </p>
          )}

          <div className="grid items-start gap-4 md:grid-cols-2">
            <FearGreedCard value={fng?.value} classification={fng?.classification} />
            <HeadlineBalance items={items} />
          </div>

          <section aria-labelledby="judul-terbaru" className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 id="judul-terbaru" className="text-base font-semibold tracking-tight">
                Judul terbaru
              </h2>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                <div className="relative sm:w-64">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <Input
                    aria-label="Cari judul atau koin"
                    placeholder="Cari judul atau koin…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-9 pl-9 text-xs"
                  />
                </div>
                <Segmented
                  aria-label="Saring nada judul"
                  size="xs"
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
            </div>
            {shown.length === 0 ? (
              <EmptyState
                title={items.length ? 'Tidak ada judul yang cocok' : 'Judul berita tidak tersedia saat ini'}
                description={items.length ? 'Ubah pencarian atau saringan nada judul.' : 'Sumber RSS sedang tidak bisa diambil. Tidak ada judul yang ditebak.'}
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
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
