import { LabGate } from '@/components/lab/LabGate'

/** Status bot is admin-only (the backend enforces it too); LabGate shows a clear message otherwise. */
export default function BotLayout({ children }: { children: React.ReactNode }) {
  return <LabGate>{children}</LabGate>
}
