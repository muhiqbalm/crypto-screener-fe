import { UniversalRunView } from '@/components/lab/universal/UniversalRunView'

export const metadata = {
  title: 'Run Universal | Strategy Lab',
}

export default async function UniversalRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <main className="mx-auto max-w-7xl px-4 py-6 pb-12 sm:px-6 sm:py-8 lg:px-8">
      <UniversalRunView id={decodeURIComponent(id)} />
    </main>
  )
}
