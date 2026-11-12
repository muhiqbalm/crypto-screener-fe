'use client'

import { House } from 'lucide-react'
import { PageContainer, PageHeader } from '@/components/shell/page'
import { MarketRibbon } from '@/components/shell/MarketRibbon'

/** Beranda "Hari ini" (audit §3.5). First version: market ribbon; the rest follows. */
export function BerandaView() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Beranda"
        eyebrowIcon={House}
        title="Hari ini"
        description="Apa yang perlu kamu lihat hari ini: pasar, koin, bot, dan paper."
      />
      <MarketRibbon />
    </PageContainer>
  )
}
