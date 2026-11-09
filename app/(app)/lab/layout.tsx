import { LabGate } from '@/components/lab/LabGate'

export default function LabLayout({ children }: { children: React.ReactNode }) {
  return <LabGate>{children}</LabGate>
}
