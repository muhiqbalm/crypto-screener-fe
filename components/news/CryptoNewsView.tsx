'use client'

import { PageContainer, PageHeader } from '@/components/shell/page'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorPanel } from '@/components/shell/ErrorPanel'
import { useIntelNews } from '@/lib/queries/intel'
import { ApiError } from '@/lib/api/errors'
import { safeExternalUrl } from '@/lib/utils/safe-url'
import type { NewsItem } from '@/lib/api/types/intel'
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  Search,
  RefreshCw,
  Gauge,
  Zap,
  Globe2,
  CalendarClock,
  ArrowUpRight,
  Newspaper,
} from 'lucide-react'

export function CryptoNewsView() {
  const { data: intel, isPending, error, isFetching, refetch } = useIntelNews()
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [selectedSentiment, setSelectedSentiment] = useState<string>('ALL')

  // Zero Static Mocking: no invented fallback numbers or headlines. The
  // backend returns null + `unavailableFields` for anything it cannot source.
  const fng = intel?.fearAndGreed ?? null
  const newsList: NewsItem[] = intel?.news ?? []
  const status = intel?.status ?? null
  const missing = intel?.unavailableFields ?? []
  const catalystBias = intel?.catalystBias ?? null
  const bullishCount = newsList.filter((n) => n.sentiment === 'BULLISH').length
  const bearishCount = newsList.filter((n) => n.sentiment === 'BEARISH').length
  const bullShare = newsList.length > 0 ? Math.round((bullishCount / newsList.length) * 100) : null
  const snapshotTime =
    typeof intel?.cachedAt === 'number'
      ? new Date(intel.cachedAt * 1000).toLocaleTimeString()
      : null

  const filteredNews = newsList.filter((item) => {
    const matchCategory = selectedCategory === 'ALL' || item.category === selectedCategory
    const matchSentiment = selectedSentiment === 'ALL' || item.sentiment === selectedSentiment
    const matchSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.summary.toLowerCase().includes(search.toLowerCase()) ||
      item.affectedSymbols.some((s) => s.toLowerCase().includes(search.toLowerCase()))
    return matchCategory && matchSentiment && matchSearch
  })

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Pasar"
        eyebrowIcon={Newspaper}
        title="Berita & sentimen"
        description="Headline RSS CoinTelegraph dengan tag sentimen berbasis kata kunci, plus indeks Fear & Greed dari Alternative.me."
        actions={
          <>
            {snapshotTime && (
              <Badge variant="muted" className="num font-normal">
                Snapshot {snapshotTime}
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={isFetching ? 'animate-spin' : ''} aria-hidden="true" />
              Muat ulang
            </Button>
          </>
        }
      />

      {isPending ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : error ? (
        <ErrorPanel
          kind={error instanceof ApiError ? error.kind : 'server'}
          onRetry={() => refetch()}
          messageOverride="News feed is unavailable right now."
        />
      ) : status === 'unavailable' ? (
        <ErrorPanel
          kind="server"
          onRetry={() => refetch()}
          messageOverride="News and Fear & Greed sources are unavailable right now (upstream fetch failed)."
        />
      ) : (
      <>
      {status === 'partial' && (
        <div
          role="status"
          className="rounded-lg border border-warn/40 bg-warn/10 px-4 py-2.5 text-xs text-warn"
        >
          Partial snapshot — unavailable: {missing.length > 0 ? missing.join(', ') : 'some sources'}.
        </div>
      )}

      {/* Intelligence Metric Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Fear & Greed Index */}
        <Card className="border-border bg-gradient-to-b from-card/90 to-card/40 backdrop-blur-md shadow-sm hover:border-bullish/30 transition-all">
          <CardHeader className="p-5 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Fear &amp; Greed Index</span>
              <div className="h-8 w-8 rounded-lg bg-bullish/10 border border-bullish/20 flex items-center justify-center">
                <Gauge className="h-4 w-4 text-bullish" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-mono font-black text-bullish">{fng ? fng.value : '—'}</span>
              <span className="text-xs font-mono text-muted-foreground">/ 100</span>
              {fng?.classification && (
                <Badge className="bg-bullish/15 text-bullish border-bullish/30 ml-auto font-mono text-2xs px-2 py-0.5">
                  {fng.classification}
                </Badge>
              )}
            </div>
            <div className="w-full bg-muted/40 rounded-full h-1.5 mt-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-warn via-bullish to-info h-1.5 rounded-full"
                style={{ width: `${fng ? Math.min(fng.value, 100) : 0}%` }}
              />
            </div>
            <p className="text-2xs text-muted-foreground mt-2 font-mono">
              Alternative.me F&amp;G Telemetry
            </p>
          </CardContent>
        </Card>

        {/* AI Catalyst Score */}
        <Card className="border-border bg-gradient-to-b from-card/90 to-card/40 backdrop-blur-md shadow-sm hover:border-info/30 transition-all">
          <CardHeader className="p-5 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Headline Sentiment</span>
              <div className="h-8 w-8 rounded-lg bg-info/10 border border-info/20 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-info" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-1">
            <div className="flex items-baseline gap-2">
              <span
                className={`text-3xl font-mono font-black ${
                  catalystBias === null
                    ? 'text-muted-foreground'
                    : catalystBias.startsWith('-')
                      ? 'text-bearish'
                      : 'text-info'
                }`}
                title={intel?.catalystBiasBasis ?? undefined}
              >
                {catalystBias ?? '—'}
              </span>
              <span className="text-xs font-mono text-muted-foreground">net bias</span>
            </div>
            <div className="w-full bg-muted/40 rounded-full h-1.5 mt-3 overflow-hidden">
              <div className="bg-info h-1.5 rounded-full" style={{ width: `${bullShare ?? 0}%` }} />
            </div>
            <p className="text-2xs text-muted-foreground mt-2 font-mono">
              {bullishCount} bullish / {bearishCount} bearish headlines (keyword tagging)
            </p>
          </CardContent>
        </Card>

        {/* Live News Items Count */}
        <Card className="border-border bg-gradient-to-b from-card/90 to-card/40 backdrop-blur-md shadow-sm hover:border-bullish/30 transition-all">
          <CardHeader className="p-5 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Live Breaking Feed</span>
              <div className="h-8 w-8 rounded-lg bg-bullish/10 border border-bullish/20 flex items-center justify-center">
                <Zap className="h-4 w-4 text-bullish" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-mono font-black text-foreground">{newsList.length}</span>
              <span className="text-xs font-mono text-muted-foreground">Articles</span>
            </div>
            <p className="text-2xs text-muted-foreground mt-2 font-mono">
              CoinTelegraph RSS
            </p>
          </CardContent>
        </Card>

        {/* Terminal Latency */}
        <Card className="border-border bg-gradient-to-b from-card/90 to-card/40 backdrop-blur-md shadow-sm hover:border-lab/30 transition-all">
          <CardHeader className="p-5 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Data Snapshot</span>
              <div className="h-8 w-8 rounded-lg bg-lab/10 border border-lab/20 flex items-center justify-center">
                <Globe2 className="h-4 w-4 text-lab" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-1">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-mono font-black text-lab">{snapshotTime ?? '—'}</span>
            </div>
            <p className="text-2xs text-muted-foreground mt-2 font-mono">
              Backend cache refreshes at most every 60s
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-card/70 p-4 rounded-xl border border-border backdrop-blur-md shadow-sm">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search breaking news, tickers, catalysts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs bg-background/60 border-border h-9 focus-visible:ring-1"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 justify-between md:justify-end">
          {/* Category Pills */}
          <div className="flex flex-wrap items-center gap-1.5 border border-border rounded-lg p-1 bg-background/50">
            {['ALL', 'Macro', 'Catalyst', 'Regulatory'].map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
                className={`h-7 text-xs font-medium px-3 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-bullish/20 text-bullish border border-bullish/40 hover:bg-bullish/30'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {cat}
              </Button>
            ))}
          </div>

          {/* Sentiment Filter */}
          <div className="flex items-center gap-1.5 border border-border rounded-lg p-1 bg-background/50">
            {['ALL', 'BULLISH', 'BEARISH'].map((snt) => (
              <Button
                key={snt}
                variant={selectedSentiment === snt ? 'outline' : 'ghost'}
                size="sm"
                onClick={() => setSelectedSentiment(snt)}
                className={`h-7 text-xs font-medium px-3 cursor-pointer ${
                  selectedSentiment === snt
                    ? snt === 'BULLISH'
                      ? 'border-bullish text-bullish bg-bullish/10'
                      : snt === 'BEARISH'
                      ? 'border-bearish text-bearish bg-bearish/10'
                      : 'border-border text-foreground bg-accent'
                    : 'text-muted-foreground'
                }`}
              >
                {snt}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* News Stream Feed */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredNews.map((item) => (
          <Card
            key={item.id}
            className="border-border bg-card/70 hover:border-bullish/40 hover:bg-card/90 transition-all duration-200 flex flex-col justify-between shadow-sm rounded-xl overflow-hidden"
          >
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-3xs font-semibold tracking-wider uppercase bg-muted/60 border-border px-2 py-0.5">
                    {item.category}
                  </Badge>
                  {item.timestamp && (
                    <time
                      dateTime={item.publishedAt ?? undefined}
                      title={item.publishedAt ? new Date(item.publishedAt).toLocaleString() : undefined}
                      className="text-2xs text-muted-foreground flex items-center gap-1 font-mono"
                    >
                      <CalendarClock className="h-3 w-3" />
                      {item.timestamp}
                    </time>
                  )}
                </div>

                <div>
                  {item.sentiment === 'BULLISH' ? (
                    <Badge className="bg-bullish/15 text-bullish border border-bullish/30 gap-1 text-2xs font-mono px-2 py-0.5">
                      <TrendingUp className="h-3 w-3" />
                      BULLISH
                    </Badge>
                  ) : item.sentiment === 'BEARISH' ? (
                    <Badge className="bg-bearish/15 text-bearish border border-bearish/30 gap-1 text-2xs font-mono px-2 py-0.5">
                      <TrendingDown className="h-3 w-3" />
                      BEARISH
                    </Badge>
                  ) : (
                    <Badge className="bg-muted/30 text-muted-foreground border border-border gap-1 text-2xs font-mono px-2 py-0.5">
                      NEUTRAL
                    </Badge>
                  )}
                </div>
              </div>

              <CardTitle className="text-base font-bold leading-snug tracking-tight text-foreground hover:text-bullish transition-colors">
                {item.title}
              </CardTitle>
            </CardHeader>

            <CardContent className="p-5 pt-0 space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {item.summary}
              </p>

              <div className="flex flex-wrap items-center justify-between pt-3 border-t border-border gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xs font-mono font-medium text-bullish/95 bg-bullish/10 px-2.5 py-1 rounded-md border border-bullish/20">
                    {item.source}
                  </span>
                  <div className="flex items-center gap-1">
                    {item.affectedSymbols.map((sym) => (
                      <span
                        key={sym}
                        className="text-3xs font-mono font-bold px-2 py-0.5 rounded bg-muted/70 text-foreground border border-border"
                      >
                        {sym}
                      </span>
                    ))}
                  </div>
                </div>

                {safeExternalUrl(item.linkUrl) && (
                  <a
                    href={safeExternalUrl(item.linkUrl)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-bullish hover:text-bullish transition-colors"
                  >
                    Read article
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredNews.length === 0 && (
          <div className="col-span-full py-16 text-center text-muted-foreground border border-dashed border-border rounded-xl bg-card">
            <p className="text-sm">
              {newsList.length === 0
                ? 'No live headlines available right now.'
                : 'No live news matching your filter criteria.'}
            </p>
          </div>
        )}
      </div>
      </>
      )}
    </PageContainer>
  )
}
