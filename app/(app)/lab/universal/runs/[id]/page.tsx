import { PageContainer } from '@/components/shell/page'
import { UniversalArchiveBanner } from '@/components/lab/universal/ArchiveBanner'
import { UniversalRunView } from '@/components/lab/universal/UniversalRunView'

export const metadata = {
  title: 'Uji Universal (arsip)',
}

export default async function UniversalRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <PageContainer>
      <UniversalArchiveBanner />
      <UniversalRunView id={decodeURIComponent(id)} />
    </PageContainer>
  )
}
