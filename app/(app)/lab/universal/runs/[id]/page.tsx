import { PageContainer } from '@/components/shell/page'
import { UniversalRunView } from '@/components/lab/universal/UniversalRunView'

export const metadata = {
  title: 'Run Universal',
}

export default async function UniversalRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <PageContainer>
      <UniversalRunView id={decodeURIComponent(id)} />
    </PageContainer>
  )
}
