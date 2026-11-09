import { JournalView } from '@/components/journal/JournalView'

export const metadata = {
  title: 'Jurnal Trading | BMTM MoonTrade',
  description: 'Jurnal trade paper (manual & auto-follow strategi) dengan statistik R-multiple.',
}

export default function JournalPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 pb-12 sm:px-6 lg:px-8">
      <JournalView />
    </main>
  )
}
