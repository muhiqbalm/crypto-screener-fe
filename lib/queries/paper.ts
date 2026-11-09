'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import type {
  JournalFilters,
  JournalPatchRequest,
  PaperAccountCreateRequest,
  PaperOrderRequest,
} from '@/lib/api/types/lab'
import { labLiveKeys } from '@/lib/queries/lab-live'

export const paperKeys = {
  all: ['lab', 'paper'] as const,
  accounts: () => [...paperKeys.all, 'accounts'] as const,
  journal: (f: JournalFilters) => [...paperKeys.all, 'journal', f] as const,
  stats: (accountId?: string) => [...paperKeys.all, 'stats', accountId ?? 'all'] as const,
  compare: (watchId: string) => [...paperKeys.all, 'compare', watchId] as const,
}

export function usePaperAccounts(enabled = true) {
  return useQuery({
    queryKey: paperKeys.accounts(),
    queryFn: ({ signal }) => api.getPaperAccounts(signal),
    enabled,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  })
}

export function useCreatePaperAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: PaperAccountCreateRequest) => api.createPaperAccount(body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: paperKeys.accounts() }),
  })
}

export function useJournal(filters: JournalFilters, opts?: { enabled?: boolean; poll?: number }) {
  return useQuery({
    queryKey: paperKeys.journal(filters),
    queryFn: ({ signal }) => api.getJournal(filters, signal),
    enabled: opts?.enabled ?? true,
    refetchInterval: opts?.poll ?? false,
    refetchIntervalInBackground: false,
  })
}

export function useJournalStats(accountId?: string) {
  return useQuery({
    queryKey: paperKeys.stats(accountId),
    queryFn: ({ signal }) => api.getJournalStats(accountId, signal),
  })
}

export function useWatchCompare(watchId: string | null) {
  return useQuery({
    queryKey: paperKeys.compare(watchId ?? ''),
    queryFn: ({ signal }) => api.getWatchCompare(watchId!, signal),
    enabled: Boolean(watchId),
  })
}

export function usePatchJournal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: JournalPatchRequest }) => api.patchJournalEntry(id, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: [...paperKeys.all, 'journal'] }),
  })
}

export function useCreatePaperOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: PaperOrderRequest) => api.createPaperOrder(body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: paperKeys.all }),
  })
}

export function useClosePaperPosition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.closePaperPosition(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: paperKeys.all }),
  })
}

export function useSetAutopaper() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ watchId, accountId, enabled }: { watchId: string; accountId: string; enabled: boolean }) =>
      api.setWatchAutopaper(watchId, { account_id: accountId, enabled }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: labLiveKeys.watches() }),
  })
}
