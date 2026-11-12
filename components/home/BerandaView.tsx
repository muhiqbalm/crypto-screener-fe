'use client'

import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { Loader2, RefreshCw } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/shell/page'
import { MarketRibbon } from '@/components/shell/MarketRibbon'
import { AssistantSlot } from '@/components/shell/AssistantSlot'
import { useAdminCheck } from '@/components/shell/AppShell'
import { Button } from '@/components/ui/button'
import { Freshness } from '@/components/ui/freshness'
import { useNow } from '@/components/ui/use-now'
import { StartHereCard } from '@/components/home/StartHereCard'
import { AttentionList } from '@/components/home/AttentionList'
import { WatchCoinsCard } from '@/components/home/WatchCoinsCard'
import { BotLiveCard, type BotVerdictView } from '@/components/home/BotLiveCard'
import { PaperReportCard } from '@/components/home/PaperReportCard'
import { BestCoinCard } from '@/components/home/BestCoinCard'
import {
  assistantSummary,
  attentionItems,
  bestCoin,
  liveDonut,
  lastSnapshotWeek,
  paperSummary,
  pickWatchCoins,
  reportLines,
  topScreenerCoins,
  unreadNotifications,
  weekRange,
} from '@/components/home/logic'
import {
  isNoAccess,
  useHomeArena,
  useHomeBotStatus,
  useHomeLiveCheck,
  useHomeNotifications,
  useHomeOutlook,
  useHomeReportWeeks,
  useHomeScreener,
  useHomeTrackRecord,
  useHomeWebhookState,
  useHomeWeeklyReport,
} from '@/lib/queries/home'
import { useRibbonNews, useRibbonRegime, useRibbonWhales } from '@/lib/queries/market-ribbon'
import { fearGreed, largeFlow, regimeWord, ribbonSentence, traderStance } from '@/components/shell/market-ribbon-logic'
import { compositeKey, findTrack, TRACK_VERDICT } from '@/lib/screener/track-record'
import { WEEKDAYS_ID, formatDate, wibParts } from '@/lib/utils/time'
import { BOT_STATUS_KIND, botVerdict } from '@/lib/bot/status'

const HELP = {
  apaIni:
    'Ringkasan harian: kondisi pasar, koin yang layak dilihat, keadaan bot live, dan hasil paper. Data dimuat ulang tiap 5 menit dan saat kamu kembali ke tab ini.',
  caraPakai: [
    'Baca pita Kondisi pasar dulu.',
    'Cek "Perlu perhatian". Kalau kosong, tidak ada yang mendesak.',
    'Klik koin untuk melihat rencana lengkapnya.',
    'Setiap kotak punya tautan ke halaman detailnya.',
  ],
  istilah: ['fear_greed', 'keyakinan', 'fresh_signal', 'sl', 'rr', 'live', 'paper'] as const,
}

/** Beranda "Hari ini" (audit §3.5): answers "apa yang perlu dilihat hari ini?" in one screen. */
export function BerandaView() {
  const qc = useQueryClient()
  const fetching = useIsFetching()
  const now = useNow(60_000)
  const { isAdmin, adminCheck } = useAdminCheck()
  const known = adminCheck !== 'loading'
  const member = known && !isAdmin

  // Every account
  const outlook = useHomeOutlook(known)
  const outlookNoAccess = isNoAccess(outlook.error)
  const screener = useHomeScreener()
  const track = useHomeTrackRecord(outlookNoAccess)
  const weeks = useHomeReportWeeks(known)
  const week = lastSnapshotWeek(weeks.data?.weeks)
  const weekly = useHomeWeeklyReport(week?.week ?? null, known)
  const ownWebhook = useHomeWebhookState(member)
  // Admin only
  const live = useHomeLiveCheck(isAdmin)
  const botStatus = useHomeBotStatus(isAdmin)
  const arena = useHomeArena(isAdmin)
  const notifs = useHomeNotifications(isAdmin)
  // Ribbon data (shared cache) for the assistant's market sentence
  const regime = useRibbonRegime()
  const news = useRibbonNews()
  const whales = useRibbonWhales()

  const watch = outlook.data ? pickWatchCoins(outlook.data, { now: now ?? undefined }) : null
  // One "bot aman?" answer for Beranda and /bot (W2b's lib/bot/status.ts).
  const bot = isAdmin
    ? botVerdict({
        live: live.data ?? null,
        liveError: live.isError,
        bot: botStatus.data ?? null,
        botError: botStatus.isError,
        now,
      })
    : null
  const paper = paperSummary(arena.data)
  const attention = attentionItems({ bot, arena: arena.data, outlook: outlook.data }, { now: now ?? undefined })
  const market = ribbonSentence({
    btc: regimeWord(regime.data?.btc),
    eth: regimeWord(regime.data?.eth),
    fg: fearGreed(news.data),
    stance: traderStance(whales.data),
    flow: largeFlow(whales.data),
  })

  const fallback = outlookNoAccess
    ? {
        loading: screener.isPending,
        coins: topScreenerCoins(screener.data).map((c, i) => {
          const asset = screener.data?.summary?.top_3_assets?.[i]
          const t = asset ? findTrack(track.data, compositeKey(asset)) : null
          return { ...c, track: t ? TRACK_VERDICT[t.verdict]?.label ?? null : null }
        }),
      }
    : null

  const verdict: BotVerdictView | null = bot
    ? {
        tone: BOT_STATUS_KIND[bot.tone],
        sentence: bot.sentence,
        facts: bot.facts.map((f) => ({ label: f.label, value: f.value, hint: f.hint })),
      }
    : null

  const reportUnavailable =
    isNoAccess(weeks.error) || isNoAccess(weekly.error) || weeks.isError || weekly.isError || (!weeks.isPending && !week)

  const updatedAt = Math.max(outlook.dataUpdatedAt, screener.dataUpdatedAt, live.dataUpdatedAt, arena.dataUpdatedAt) || undefined
  const today = now !== null ? `${WEEKDAYS_ID[wibParts(new Date(now)).weekday]}, ${formatDate(now)}` : null

  const best = bestCoin(watch)
  const screenerTop = fallback ? (fallback.coins[0] ?? null) : undefined

  return (
    <PageContainer width="wide">
      <PageHeader
        title="Hari ini"
        description={today ?? 'Ringkasan pasar, bot, dan paper.'}
        help={{ ...HELP, istilah: [...HELP.istilah] }}
        helpId="beranda"
        actions={
          <div className="flex flex-col items-start gap-1.5 md:items-end">
            <Button variant="outline" onClick={() => void qc.refetchQueries({ type: 'active' })} disabled={fetching > 0}>
              {fetching > 0 ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RefreshCw aria-hidden="true" />}
              Muat ulang
            </Button>
            <Freshness updatedAt={updatedAt} />
          </div>
        }
      />

      <StartHereCard isAdmin={isAdmin} />

      <MarketRibbon />

      {/* Bento: Bot live · Peluang terbaik (hero, 2 columns) · Paper.
          Phones: one column in the same order. */}
      <div className="grid grid-cols-1 gap-5 md:grid-flow-dense md:grid-cols-2 lg:gap-6 xl:grid-cols-7">
        <BotLiveCard
          admin={isAdmin}
          verdict={verdict}
          donut={isAdmin ? liveDonut(live.data) : null}
          loading={isAdmin && live.isPending && botStatus.isPending}
          error={null}
          onRetry={() => {
            void live.refetch()
            void botStatus.refetch()
          }}
          webhooks={ownWebhook.data ? [{ label: 'Webhook kamu', state: ownWebhook.data.state }] : []}
          webhookLoading={member && ownWebhook.isPending}
          webhookError={member && ownWebhook.isError}
        />
        <BestCoinCard
          best={best}
          loading={!known || outlook.isPending || (Boolean(fallback) && screener.isPending)}
          error={outlook.isError && !outlookNoAccess ? outlook.error : null}
          onRetry={() => void outlook.refetch()}
          screenerTop={screenerTop}
        />
        <PaperReportCard
          admin={isAdmin}
          paper={paper}
          paperLoading={isAdmin && arena.isPending}
          paperError={arena.isError}
          report={weekly.data ? { range: weekRange(week), lines: reportLines(weekly.data) } : null}
          reportLoading={known && (weeks.isPending || (Boolean(week) && weekly.isPending))}
          reportUnavailable={reportUnavailable}
          notifications={unreadNotifications(notifs.data?.items)}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5 lg:gap-6">
        {isAdmin && (
          <div className="lg:col-span-2">
            <AttentionList items={attention} loading={(live.isPending && botStatus.isPending) || arena.isPending || outlook.isPending} />
          </div>
        )}
        <div className={isAdmin ? 'lg:col-span-3' : 'lg:col-span-5'}>
          <WatchCoinsCard
            watch={watch}
            loading={!known || outlook.isPending}
            error={outlook.isError && !outlookNoAccess ? outlook.error : null}
            onRetry={() => void outlook.refetch()}
            fallback={fallback}
          />
        </div>
      </div>

      {isAdmin && (
        <AssistantSlot
          context={{ kind: 'beranda', label: 'ringkasan hari ini' }}
          items={assistantSummary({ market, watch, bot, paper })}
          loading={outlook.isPending && live.isPending}
          emptyText="Belum ada data untuk diringkas."
        />
      )}
    </PageContainer>
  )
}
