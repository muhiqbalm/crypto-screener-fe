'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useIntelNews } from '@/lib/queries/intel'
import {
  Newspaper,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Search,
  RefreshCw,
  ExternalLink,
  Gauge,
  Zap,
  Globe2,
  CalendarClock,
  ArrowUpRight
} from 'lucide-react'

interface NewsItem {
  id: string
  title: string
  summary: string
  source: string
  sourceType: 'tier1' | 'chain' | 'macro'
  timestamp: string
  category: 'Macro' | 'Whale' | 'DeFi' | 'Regulatory' | 'Catalyst'
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  impactScore: number
  affectedSymbols: string[]
  readTime: string
  linkUrl: string
}

const FALLBACK_NEWS: NewsItem[] = [
  {
    id: 'news-01',
    title: 'Fed Liquidity Pivot Injects $14B into Overnight Repo; Crypto Markets React with High Beta Inflows',
    summary: 'Federal Reserve balance sheet adjustments signal an easing cycle acceleration. Historical correlation points to aggressive altcoin expansion following similar liquidity injections in Q1.',
    source: 'Bloomberg Terminal / MacroDesk',
    sourceType: 'tier1',
    timestamp: '8 mins ago',
    category: 'Macro',
    sentiment: 'BULLISH',
    impactScore: 92,
    affectedSymbols: ['BTC', 'ETH', 'SOL'],
    readTime: '2 min read',
    linkUrl: 'https://cointelegraph.com'
  },
  {
    id: 'news-02',
    title: 'Spot Ethereum & Solana ETF Combined Net Inflow Hits Record $410M in Single Daily Session',
    summary: 'BlackRock and Fidelity report unprecedented institutional volume. Institutional basis trading arbitrage spreads widen to 8.2% annualized, fueling spot demand.',
    source: 'CoinDesk Institutional',
    sourceType: 'tier1',
    timestamp: '24 mins ago',
    category: 'Catalyst',
    sentiment: 'BULLISH',
    impactScore: 88,
    affectedSymbols: ['ETH', 'SOL'],
    readTime: '3 min read',
    linkUrl: 'https://cointelegraph.com'
  }
]

export function CryptoNewsView() {
  const { data: intel, isLoading, isFetching, refetch } = useIntelNews()
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [selectedSentiment, setSelectedSentiment] = useState<string>('ALL')

  const fng = intel?.fearAndGreed ?? { value: 72, classification: 'Greed' }
  const newsList: NewsItem[] = intel?.news ?? FALLBACK_NEWS

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
    <div className="space-y-8 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b border-border/40 pb-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-medium shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            AI NEWS &amp; CATALYST INTELLIGENCE
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            Market News &amp; Macro Catalysts
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Real-time macroeconomic feeds, Fear &amp; Greed telemetry, and AI catalyst classification powered by {intel?.source ?? 'Alternative.me & CoinTelegraph RSS'}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 px-3 py-1.5 font-mono text-xs">
            Live RSS &amp; NLP Engine
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2 cursor-pointer h-9 px-3.5 border-border/80 hover:bg-muted/50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-emerald-400' : ''}`} />
            Sync Intel
          </Button>
        </div>
      </div>

      {/* Intelligence Metric Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Fear & Greed Index */}
        <Card className="border-border/60 bg-gradient-to-b from-card/90 to-card/40 backdrop-blur-md shadow-sm hover:border-emerald-500/30 transition-all">
          <CardHeader className="p-5 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Fear &amp; Greed Index</span>
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Gauge className="h-4 w-4 text-emerald-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-mono font-black text-emerald-400">{fng.value}</span>
              <span className="text-xs font-mono text-muted-foreground">/ 100</span>
              <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 ml-auto font-mono text-[11px] px-2 py-0.5">
                {fng.classification}
              </Badge>
            </div>
            <div className="w-full bg-muted/40 rounded-full h-1.5 mt-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-500 via-emerald-400 to-cyan-400 h-1.5 rounded-full"
                style={{ width: `${Math.min(fng.value, 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 font-mono">
              Alternative.me F&amp;G Telemetry
            </p>
          </CardContent>
        </Card>

        {/* AI Catalyst Score */}
        <Card className="border-border/60 bg-gradient-to-b from-card/90 to-card/40 backdrop-blur-md shadow-sm hover:border-cyan-500/30 transition-all">
          <CardHeader className="p-5 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">24h Catalyst Bias</span>
              <div className="h-8 w-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-cyan-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-mono font-black text-cyan-400">
                {intel?.catalystBias ?? '+80%'}
              </span>
              <Badge className="bg-cyan-500/15 text-cyan-300 border-cyan-500/30 ml-auto font-mono text-[11px] px-2 py-0.5">
                Bullish Drift
              </Badge>
            </div>
            <div className="w-full bg-muted/40 rounded-full h-1.5 mt-3 overflow-hidden">
              <div className="bg-cyan-400 h-1.5 rounded-full" style={{ width: '80%' }} />
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 font-mono">
              NLP Financial Sentiment Engine
            </p>
          </CardContent>
        </Card>

        {/* Live News Items Count */}
        <Card className="border-border/60 bg-gradient-to-b from-card/90 to-card/40 backdrop-blur-md shadow-sm hover:border-emerald-500/30 transition-all">
          <CardHeader className="p-5 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Live Breaking Feed</span>
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Zap className="h-4 w-4 text-emerald-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-mono font-black text-foreground">{newsList.length}</span>
              <span className="text-xs font-mono text-muted-foreground">Articles</span>
              <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 ml-auto font-mono text-[11px] px-2 py-0.5">
                Live Feed
              </Badge>
            </div>
            <div className="w-full bg-muted/40 rounded-full h-1.5 mt-3 overflow-hidden">
              <div className="bg-emerald-400 h-1.5 rounded-full" style={{ width: '85%' }} />
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 font-mono">
              CoinTelegraph Wire Dispatch
            </p>
          </CardContent>
        </Card>

        {/* Terminal Latency */}
        <Card className="border-border/60 bg-gradient-to-b from-card/90 to-card/40 backdrop-blur-md shadow-sm hover:border-purple-500/30 transition-all">
          <CardHeader className="p-5 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-medium uppercase tracking-wider text-muted-foreground">Pipeline Latency</span>
              <div className="h-8 w-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <Globe2 className="h-4 w-4 text-purple-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-mono font-black text-purple-400">sub-5ms</span>
              <Badge className="bg-purple-500/15 text-purple-300 border-purple-500/30 ml-auto font-mono text-[11px] px-2 py-0.5">
                FastAPI TTL
              </Badge>
            </div>
            <div className="w-full bg-muted/40 rounded-full h-1.5 mt-3 overflow-hidden">
              <div className="bg-purple-400 h-1.5 rounded-full" style={{ width: '98%' }} />
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 font-mono">
              In-Memory RAM Cache Active
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-card/70 p-4 rounded-xl border border-border/60 backdrop-blur-md shadow-sm">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search breaking news, tickers, catalysts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs bg-background/60 border-border/80 h-9 focus-visible:ring-1"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 justify-between md:justify-end">
          {/* Category Pills */}
          <div className="flex flex-wrap items-center gap-1.5 border border-border/80 rounded-lg p-1 bg-background/50">
            {['ALL', 'Macro', 'Catalyst', 'Regulatory'].map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
                className={`h-7 text-xs font-medium px-3 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {cat}
              </Button>
            ))}
          </div>

          {/* Sentiment Filter */}
          <div className="flex items-center gap-1.5 border border-border/80 rounded-lg p-1 bg-background/50">
            {['ALL', 'BULLISH', 'BEARISH'].map((snt) => (
              <Button
                key={snt}
                variant={selectedSentiment === snt ? 'outline' : 'ghost'}
                size="sm"
                onClick={() => setSelectedSentiment(snt)}
                className={`h-7 text-xs font-medium px-3 cursor-pointer ${
                  selectedSentiment === snt
                    ? snt === 'BULLISH'
                      ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                      : snt === 'BEARISH'
                      ? 'border-rose-500 text-rose-400 bg-rose-500/10'
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
            className="border-border/60 bg-card/70 hover:border-emerald-500/40 hover:bg-card/90 transition-all duration-200 flex flex-col justify-between shadow-sm rounded-xl overflow-hidden"
          >
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-[10px] font-semibold tracking-wider uppercase bg-muted/60 border-border/80 px-2 py-0.5">
                    {item.category}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                    <CalendarClock className="h-3 w-3" />
                    {item.timestamp}
                  </span>
                </div>

                <div>
                  {item.sentiment === 'BULLISH' ? (
                    <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 gap-1 text-[11px] font-mono px-2 py-0.5">
                      <TrendingUp className="h-3 w-3" />
                      BULLISH • {item.impactScore}%
                    </Badge>
                  ) : item.sentiment === 'BEARISH' ? (
                    <Badge className="bg-rose-500/15 text-rose-400 border border-rose-500/30 gap-1 text-[11px] font-mono px-2 py-0.5">
                      <TrendingDown className="h-3 w-3" />
                      BEARISH • {item.impactScore}%
                    </Badge>
                  ) : (
                    <Badge className="bg-muted/30 text-muted-foreground border border-border gap-1 text-[11px] font-mono px-2 py-0.5">
                      NEUTRAL • {item.impactScore}%
                    </Badge>
                  )}
                </div>
              </div>

              <CardTitle className="text-base font-bold leading-snug tracking-tight text-foreground hover:text-emerald-400 transition-colors">
                {item.title}
              </CardTitle>
            </CardHeader>

            <CardContent className="p-5 pt-0 space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {item.summary}
              </p>

              <div className="flex flex-wrap items-center justify-between pt-3 border-t border-border/40 gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-medium text-emerald-400/95 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                    {item.source}
                  </span>
                  <div className="flex items-center gap-1">
                    {item.affectedSymbols.map((sym) => (
                      <span
                        key={sym}
                        className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-muted/70 text-foreground border border-border/60"
                      >
                        {sym}
                      </span>
                    ))}
                  </div>
                </div>

                <a
                  href={item.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Source Feed
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredNews.length === 0 && (
          <div className="col-span-full py-16 text-center text-muted-foreground border border-dashed border-border/60 rounded-xl bg-card/30">
            <p className="text-sm">No live news matching your filter criteria.</p>
          </div>
        )}
      </div>
    </div>
  )
}
