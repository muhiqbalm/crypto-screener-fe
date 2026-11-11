'use client'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ledgerApi } from '@/lib/api/ledger'
import type { LedgerFilters } from '@/lib/api/types/ledger'

const keys = {
  all: ['lab', 'ledger'] as const,
  meta: () => [...keys.all, 'meta'] as const,
  summary: (f: LedgerFilters, split: string) => [...keys.all, 'summary', f, split] as const,
  signals: (f: LedgerFilters & { direction?: number }, limit: number, offset: number) =>
    [...keys.all, 'signals', f, limit, offset] as const,
}

export function useLedgerMeta() {
  return useQuery({
    queryKey: keys.meta(),
    queryFn: ({ signal }) => ledgerApi.getMeta(signal),
    // poll faster while the one-off backfill runs
    refetchInterval: (q) => {
      const s = q.state.data?.backfill?.status
      return s === 'queued' || s === 'running' ? 10_000 : 120_000
    },
    refetchIntervalInBackground: false,
  })
}

export function useLedgerSummary(f: LedgerFilters, split: 'none' | 'direction') {
  return useQuery({
    queryKey: keys.summary(f, split),
    queryFn: ({ signal }) => ledgerApi.getSummary(f, split, signal),
    placeholderData: keepPreviousData,
    refetchInterval: 300_000,
    refetchIntervalInBackground: false,
  })
}

export function useLedgerSignals(f: LedgerFilters & { direction?: number }, limit: number, offset: number) {
  return useQuery({
    queryKey: keys.signals(f, limit, offset),
    queryFn: ({ signal }) => ledgerApi.getSignals(f, limit, offset, signal),
    placeholderData: keepPreviousData,
    refetchInterval: 300_000,
    refetchIntervalInBackground: false,
  })
}
