'use client'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, request } from '@/lib/api/client'
import { labInsightsApi } from '@/lib/api/lab-insights'
import type {
  LabId,
  JournalEntry,
  JournalFilters,
  JournalPatchRequest,
  JournalStats,
  PaperAccountCreateRequest,
  PaperOrderRequest,
} from '@/lib/api/types/lab'
import { labLiveKeys } from '@/lib/queries/lab-live'
import {
  PAPER_START_BALANCE,
  journalListQuery,
  journalStatsQuery,
  paperAccountName,
  reusablePaperAccount,
  type JournalQuery,
} from '@/lib/lab/paper'

const paperKeys = {
  all: ['lab', 'paper'] as const,
  accounts: () => [...paperKeys.all, 'accounts'] as const,
  journal: (f: JournalFilters) => [...paperKeys.all, 'journal', f] as const,
  stats: (accountId?: string) => [...paperKeys.all, 'stats', accountId ?? 'all'] as const,
  compare: (watchId: LabId) => [...paperKeys.all, 'compare', String(watchId)] as const,
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

export function useWatchCompare(watchId: LabId | null) {
  return useQuery({
    queryKey: paperKeys.compare(String(watchId ?? '')),
    queryFn: ({ signal }) => api.getWatchCompare(watchId!, signal),
    enabled: Boolean(watchId),
  })
}

export function usePatchJournal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: LabId; body: JournalPatchRequest }) => api.patchJournalEntry(id, body),
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
    mutationFn: (id: LabId) => api.closePaperPosition(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: paperKeys.all }),
  })
}

export function useSetAutopaper() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ watchId, accountId, enabled }: { watchId: LabId; accountId: LabId; enabled: boolean }) =>
      api.setWatchAutopaper(watchId, { account_id: accountId, enabled }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: labLiveKeys.watches() }),
  })
}

// ── Jurnal (Paper berjalan → Jurnal): newest first, paper only by default ─────

function qs(q: JournalQuery): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== null && v !== '') p.set(k, String(v))
  const s = p.toString()
  return s ? `?${s}` : ''
}

/**
 * GET /lab/journal with limit / order / exclude_source (backend feat/ux-lab-paper).
 * `includeLive` adds the imported live-bot trades; they are never in paper statistics.
 * `useJournal` above stays for the Chart panel.
 */
export function useJournalList(filters: JournalFilters, opts: { includeLive: boolean; limit: number }) {
  const q = journalListQuery(filters, opts)
  return useQuery({
    queryKey: [...paperKeys.all, 'journal', 'list', q] as const,
    queryFn: ({ signal }) => request<JournalEntry[]>('GET', `/api/v1/lab/journal${qs(q)}`, undefined, signal),
    placeholderData: keepPreviousData,
  })
}

/** GET /lab/journal/stats with the same filters as the list (one kind of money: paper, or live when picked). */
export function useJournalStatsFor(filters: JournalFilters) {
  const q = journalStatsQuery(filters)
  return useQuery({
    queryKey: [...paperKeys.all, 'stats', 'filtered', q] as const,
    queryFn: ({ signal }) => request<JournalStats>('GET', `/api/v1/lab/journal/stats${qs(q)}`, undefined, signal),
    placeholderData: keepPreviousData,
  })
}

// ── Mulai paper (Preset page; also usable from run detail) ───────────────────

export interface StartPaperArgs {
  preset: { id: LabId; name: string }
  /** Use this existing paper account instead of creating one. */
  accountId?: LabId
  /** New account only: sizing that mirrors the preset's backtest (lib/lab/paper mirrorSizing). */
  sizing?: { risk_pct: number; leverage_max: number }
  startingBalance?: number
}

export interface StartPaperResult {
  presetId: LabId
  watchId: LabId
  accountId: LabId
  accountCreated: boolean
}

/**
 * Starts PAPER for a preset: picks or creates the simulated account, then
 * POST /lab/presets/{id}/watch with auto-paper on. No real order is ever sent.
 * A never-used account with the same name is reused, so a retry after an error
 * does not leave empty accounts behind. Then navigate to arenaHref(presetId).
 */
export function useStartPaper() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (a: StartPaperArgs): Promise<StartPaperResult> => {
      let accountId = a.accountId
      let accountCreated = false
      if (accountId === undefined) {
        if (!a.sizing) throw new Error('sizing is required to create a paper account')
        const name = paperAccountName(a.preset.name)
        const reuse = reusablePaperAccount(await api.getPaperAccounts(), name)
        if (reuse) {
          accountId = reuse.id
        } else {
          const created = await api.createPaperAccount({
            name,
            starting_balance: a.startingBalance ?? PAPER_START_BALANCE,
            risk_pct: a.sizing.risk_pct,
            leverage_max: a.sizing.leverage_max,
          })
          accountId = created.id
          accountCreated = true
        }
      }
      const w = await labInsightsApi.watchFromPreset(a.preset.id, { autopaper_account_id: accountId })
      return { presetId: a.preset.id, watchId: w.watch_id, accountId, accountCreated }
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: paperKeys.accounts() })
      void qc.invalidateQueries({ queryKey: ['lab', 'presets'] })
      void qc.invalidateQueries({ queryKey: ['lab', 'arena'] })
      void qc.invalidateQueries({ queryKey: labLiveKeys.watches() })
    },
  })
}
