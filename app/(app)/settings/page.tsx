'use client'

import { useCredentials } from '@/lib/queries/credentials'
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

export default function SettingsPage() {
  const { data: credentials, isPending } = useCredentials()

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your exchange credentials, TradingView automated webhooks, and Telegram alerts.
        </p>
      </div>

      {/* 1. Exchange Credentials */}
      <section className="mb-8">
        <div className="mb-4">
          <h2 className="text-base font-semibold">Exchange Credentials</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            API keys are encrypted using AES-256 before storage. Secrets are never exposed.
          </p>
        </div>
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
      <section className="mb-8">
        <div className="mb-4">
          <h2 className="text-base font-semibold">TradingView Webhook Integration</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Connect your TradingView Pine Script alerts to execute auto-trades on Binance.
          </p>
        </div>
        <WebhookConfigSettings />
      </section>

      {/* 3. Account / Profile & Telegram */}
      <section>
        <div className="mb-4">
          <h2 className="text-base font-semibold">Account & Telegram Notifications</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Update your profile and Telegram Chat ID for instant trade execution alerts.
          </p>
        </div>
        <ProfileSettings />
      </section>
    </main>
  )
}
