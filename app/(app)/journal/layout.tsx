import { LabGate } from '@/components/lab/LabGate'

// Journal is admin-only like the Lab (same GET /lab/me gate).
export default function JournalLayout({ children }: { children: React.ReactNode }) {
  return <LabGate>{children}</LabGate>
}
