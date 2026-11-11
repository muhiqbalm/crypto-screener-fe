'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { ScanBuilder } from '@/components/lab/scan/ScanBuilder'
import { ScanResults } from '@/components/lab/scan/ScanResults'
import { RecentScans } from '@/components/lab/scan/RecentScans'

export { pfBucket, sortScanTable } from '@/components/lab/scan/ScanResults'

export function ScanView() {
  const router = useRouter()
  const search = useSearchParams()
  const scanId = search.get('id')

  return (
    <div className="space-y-6">
      <ScanBuilder onCreated={(id) => router.push(`/lab/scan?id=${encodeURIComponent(String(id))}`)} />
      {scanId && <ScanResults id={scanId} />}
      <RecentScans activeId={scanId} />
    </div>
  )
}
