import { RunDetailView } from '@/components/lab/RunDetailView'
import { PageContainer } from '@/components/shell/page'

export const metadata = {
  title: 'Detail uji',
}

export default async function LabRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <PageContainer>
      <RunDetailView id={decodeURIComponent(id)} />
    </PageContainer>
  )
}
