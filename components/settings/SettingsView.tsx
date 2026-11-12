'use client'

import { UserCog } from 'lucide-react'
import { useCredentials } from '@/lib/queries/credentials'
import { PageContainer, PageHeader, SectionHeading } from '@/components/shell/page'
import { ErrorState } from '@/components/shell/states'
import { ExchangeCredentialCard } from '@/components/settings/ExchangeCredentialCard'
import { WebhookConfigSettings } from '@/components/settings/WebhookConfigSettings'
import { ProfileSettings } from '@/components/settings/ProfileSettings'
import { Card, CardFooter, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusPill } from '@/components/ui/status-pill'
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
        <Skeleton className="mt-1 h-3 w-48" />
      </CardHeader>
      <CardFooter className="pt-0">
        <Skeleton className="h-8 w-32 rounded-md" />
      </CardFooter>
    </Card>
  )
}

/** /settings "Akun & koneksi" (User Hub): API keys, webhook, profile & Telegram. */
export function SettingsView() {
  const { data: credentials, isPending, error, refetch } = useCredentials()

  return (
    <PageContainer width="narrow">
      <PageHeader
        eyebrow="Akun"
        eyebrowIcon={UserCog}
        title="Akun & koneksi"
        description="API key exchange, webhook TradingView, profil dan notifikasi Telegram untuk akunmu."
        help={{
          apaIni:
            'Koneksi akunmu ke exchange dan ke TradingView. API key dan kata sandi webhook dipakai bot live untuk order sungguhan, jadi setiap perubahan di sini meminta konfirmasi.',
          caraPakai: [
            'Isi API key exchange dengan izin futures; secret tidak pernah ditampilkan lagi setelah disimpan.',
            'Kata sandi webhook berbeda dengan passphrase API OKX.',
            'Isi Chat ID Telegram kalau ingin notifikasi eksekusi dikirim ke chat tertentu.',
          ],
          istilah: ['webhook_passphrase', 'okx_passphrase', 'automation'],
        }}
      />

      <section className="space-y-4">
        <SectionHeading
          title={
            <span className="inline-flex items-center gap-2">
              API key exchange <StatusPill kind="live" size="xs" />
            </span>
          }
          description="Dienkripsi sebelum disimpan. Secret tidak pernah ditampilkan lagi."
        />
        {error ? (
          // Never show "belum ada" when the list simply failed to load: that invites overwriting a live key.
          <ErrorState
            compact
            error={error}
            onRetry={() => refetch()}
            message="Daftar API key belum bisa dimuat, jadi statusnya belum diketahui. Jangan menyimpan ulang key sebelum daftar ini tampil."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {isPending
              ? EXCHANGES.map((exchange) => <ExchangeCredentialSkeleton key={exchange} />)
              : EXCHANGES.map((exchange) => (
                  <ExchangeCredentialCard key={exchange} exchange={exchange} existing={credentials?.find((c) => c.exchange === exchange)} />
                ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <SectionHeading
          title={
            <span className="inline-flex items-center gap-2">
              Webhook TradingView <StatusPill kind="live" size="xs" />
            </span>
          }
          description="Alert TradingView ke alamat ini menjadi order sungguhan di exchange (Binance atau OKX)."
        />
        <WebhookConfigSettings />
      </section>

      <section className="space-y-4">
        <SectionHeading title="Profil, password & Telegram" description="Nama tampilan, password login, dan chat Telegram untuk notifikasi eksekusi." />
        <ProfileSettings />
      </section>
    </PageContainer>
  )
}
