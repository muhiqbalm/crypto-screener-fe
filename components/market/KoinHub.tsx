'use client'

import { OutlookView } from '@/components/lab/outlook/OutlookView'
import { FactorTable } from '@/components/screener/FactorTable'
import { StrengthTable } from '@/components/market/StrengthTable'
import { KoinTabs, RibbonSlot } from '@/components/market/shared'
import type { KoinView } from '@/lib/lab/outlook'

/** /koin: market ribbon first, then the 3 views (Outlook default · Terkuat · Tabel faktor). */
export function KoinHub({ view }: { view: KoinView }) {
  return (
    <div className="space-y-4">
      <RibbonSlot />
      <KoinTabs view={view} />
      {view === 'outlook' && <OutlookView />}
      {view === 'terkuat' && <StrengthTable />}
      {view === 'faktor' && <FactorTable />}
    </div>
  )
}
