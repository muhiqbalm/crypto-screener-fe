import { Suspense } from 'react'
import { LoadingState } from '@/components/shell/states'
import { JournalView } from '@/components/journal/JournalView'

export const metadata = {
  title: 'Jurnal Trading',
  description: 'Jurnal trade paper (manual & auto-follow strategi) dengan statistik R-multiple.',
}

export default function JournalPage() {
  // useSearchParams (?account_id= deep link) needs a Suspense boundary
  return (
    <Suspense fallback={<LoadingState rows={6} />}>
      <JournalView />
    </Suspense>
  )
}
