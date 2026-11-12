'use client'

import { useEffect, useRef, useState } from 'react'
import { Activity, RefreshCw } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/shell/page'
import { Button } from '@/components/ui/button'
import { StatusPill } from '@/components/ui/status-pill'
import { useNow } from '@/components/ui/use-now'
import { LiveCheckView, LIVECHECK_RANGES } from '@/components/lab/livecheck/LiveCheckView'
import { ExecutionQuality } from '@/components/lab/shadow/ExecutionQuality'
import { LIVECHECK_STALE_MS, VERDICT_BARS, botVerdict } from '@/lib/bot/status'
import type { StatusFilter } from '@/lib/lab/livecheck'
import { useLiveCheck } from '@/lib/queries/livecheck'
import { useBotStatus } from '@/lib/queries/bot'
import { useShadowReport } from '@/lib/queries/shadow'
import { cn } from '@/lib/utils/cn'
import { BalanceLinkCard } from './BalanceLinkCard'
import { BotHero, splitSignals } from './BotHero'
import { WebhookStatusCard } from './WebhookStatusCard'

/**
 * Sections load at different speeds, so the browser's own jump to #cek / #eksekusi lands too
 * high. Scroll once more after everything above the target has rendered.
 */
function useHashScroll(ready: boolean) {
  const done = useRef(false)
  useEffect(() => {
    if (!ready || done.current) return
    done.current = true
    const id = window.location.hash.slice(1)
    if (!id) return
    const t = window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }), 50)
    return () => window.clearTimeout(t)
  }, [ready])
}

/**
 * /bot "Status bot": answers "Bot live aman?" in one sentence, then the evidence:
 * webhook state per bot account, a link to Saldo & posisi, Cek bot live and Kualitas eksekusi.
 * Everything here only reads; nothing sends an order, touches the webhook or polls the exchange.
 */
export function BotStatusView() {
  const now = useNow(60_000)
  const live7 = useLiveCheck(VERDICT_BARS)
  const bot = useBotStatus()
  const shadow = useShadowReport()
  const [bars, setBars] = useState(LIVECHECK_RANGES[0].value)
  const [filter, setFilter] = useState<StatusFilter | null>(null)

  const v = botVerdict({
    live: live7.data,
    liveError: live7.isError,
    bot: bot.data,
    botError: bot.isError,
    now,
  })
  // Problems first until the user picks a filter.
  const shownFilter: StatusFilter = filter ?? (v.focus === 'masalah' ? 'masalah' : 'semua')
  const lc = live7.data?.last_cycle
  const finished = lc?.finished ?? lc?.started
  const stale = Boolean(finished && now !== null && now - Date.parse(finished) > LIVECHECK_STALE_MS)
  useHashScroll(!live7.isPending && !bot.isPending && !shadow.isPending)

  const refetchAll = () => {
    void live7.refetch()
    void bot.refetch()
    void shadow.refetch()
  }
  const busy = live7.isFetching || bot.isFetching || shadow.isFetching

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Bot live · uang asli"
        eyebrowIcon={Activity}
        title="Status bot"
        status={<StatusPill kind="live" />}
        description="Apakah bot live mengikuti strategi, dan apakah jalur alert sehat."
        help={{
          apaIni:
            'Satu tempat untuk mengecek bot live (strategi 4H-ETH-Basic di akun Rosyade): sinyal strategi dibanding yang benar-benar dieksekusi, status webhook, dan kualitas eksekusi. Halaman ini hanya membaca; tidak ada order yang dikirim.',
          caraPakai: [
            'Baca kalimat di kartu paling atas: itu jawabannya untuk 7 hari terakhir.',
            'Kalau ada yang perlu dicek, buka baris yang ditandai di Cek bot live untuk melihat alasannya.',
            'Saldo dan posisi sebenarnya ada di halaman Saldo & posisi.',
          ],
          istilah: ['livecheck_status', 'webhook', 'automation', 'alert_latency', 'slippage_bps', 'limit_sim'],
        }}
        actions={
          <Button variant="outline" size="sm" onClick={refetchAll} disabled={busy}>
            <RefreshCw className={cn(busy && 'animate-spin')} aria-hidden="true" />
            Muat ulang
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <BotHero v={v} split={splitSignals(live7.data)} updatedAt={finished ?? undefined} stale={stale} className="lg:col-span-2" />
        <WebhookStatusCard q={bot} />
      </div>
      <BalanceLinkCard />

      <LiveCheckView
        id="cek"
        bars={bars}
        onBarsChange={setBars}
        filter={shownFilter}
        onFilterChange={setFilter}
      />

      <ExecutionQuality id="eksekusi" />
    </PageContainer>
  )
}
