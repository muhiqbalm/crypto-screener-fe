'use client'

import { Settings } from 'lucide-react'
import { useCredentials } from '@/lib/queries/credentials'
import { PageContainer, PageHeader, SectionHeading } from '@/components/shell/page'
import { ExchangeCredentialCard } from '@/components/settings/ExchangeCredentialCard'
import { WebhookConfigSettings } from '@/components/settings/WebhookConfigSettings'
import { ProfileSettings } from '@/components/settings/ProfileSettings'
import { Card, CardHeader, CardFooter } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { Exchange } from '@/lib/api/types/credentials'

const EXCHANGES: Exchange[] = ['binance', 'okx']

function ExchangeCredentialSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-3 w-48 mt-1" />
      </CardHeader>
      <CardFooter className="pt-0">
        <Skeleton className="h-8 w-32 rounded-md" />
      </CardFooter>
    </Card>
  )
}

export function SettingsView() {
  const { data: credentials, isPending } = useCredentials()

  return (
    <PageContainer width="narrow">
      <PageHeader
        eyebrow="Akun"
        eyebrowIcon={Settings}
        title="Pengaturan"
        description="Kelola API key exchange, webhook TradingView otomatis, dan notifikasi Telegram."
      />

      {/* 1. Exchange Credentials */}
      <section className="space-y-4">
        <SectionHeading
          title="API key exchange"
          description="API key dienkripsi AES-256 sebelum disimpan. Secret tidak pernah ditampilkan ulang."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {isPending
            ? EXCHANGES.map((exchange) => <ExchangeCredentialSkeleton key={exchange} />)
            : EXCHANGES.map((exchange) => (
                <ExchangeCredentialCard
                  key={exchange}
                  exchange={exchange}
                  existing={credentials?.find((c) => c.exchange === exchange)}
                />
              ))
          }
        </div>
      </section>

      {/* 2. TradingView Webhook Configuration */}
      <section className="space-y-4">
        <SectionHeading
          title="Integrasi webhook TradingView"
          description="Hubungkan alert Pine Script TradingView untuk eksekusi trade otomatis di Binance."
        />
        <WebhookConfigSettings />
      </section>

      {/* 3. Account / Profile & Telegram */}
      <section className="space-y-4">
        <SectionHeading
          title="Akun & notifikasi Telegram"
          description="Ubah profil dan Chat ID Telegram untuk notifikasi eksekusi trade."
        />
        <ProfileSettings />
      </section>
    </PageContainer>
  )
}
