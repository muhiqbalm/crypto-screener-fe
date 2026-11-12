'use client'

import { HubTabs } from '@/components/shell/HubTabs'
import { MarketRibbon } from '@/components/shell/MarketRibbon'
import { OutlookView } from '@/components/lab/outlook/OutlookView'
import { FactorTable } from '@/components/screener/FactorTable'
import { StrengthTable } from '@/components/market/StrengthTable'
import type { KoinView } from '@/lib/lab/outlook'

/** /koin: market ribbon first, then the 3 views (Outlook default · Terkuat · Tabel faktor). */
export function KoinHub({ view }: { view: KoinView }) {
  return (
    <div className="space-y-4">
      <MarketRibbon />
      <HubTabs hub="koin" value={view} label="Tampilan Peluang koin" />
      {view === 'outlook' && <OutlookView />}
      {view === 'terkuat' && <StrengthTable />}
      {view === 'faktor' && <FactorTable />}
    </div>
  )
}
