'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { ScanBuilder } from '@/components/lab/scan/ScanBuilder'
import { ScanResults } from '@/components/lab/scan/ScanResults'
import { RecentScans } from '@/components/lab/scan/RecentScans'

export { scanCellTone, sortScanTable } from '@/components/lab/scan/ScanResults'

/** Banyak koin: a result link (?id=, e.g. from a notification) shows the answer first, then the form. */
export function ScanView() {
  const router = useRouter()
  const search = useSearchParams()
  const scanId = search.get('id')

  return (
    <div className="space-y-6">
      {scanId && <ScanResults id={scanId} />}
      <ScanBuilder onCreated={(id) => router.push(`/lab/scan?id=${encodeURIComponent(String(id))}`)} />
      <RecentScans activeId={scanId} />
    </div>
  )
}
