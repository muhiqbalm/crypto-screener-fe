import { RunDetailView } from '@/components/lab/RunDetailView'

export const metadata = {
  title: 'Detail Run | Strategy Lab',
}

export default async function LabRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <main className="mx-auto max-w-7xl px-4 py-6 pb-12 sm:px-6 sm:py-8 lg:px-8">
      <RunDetailView id={decodeURIComponent(id)} />
    </main>
  )
}
