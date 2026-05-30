import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import type { CredentialUpsertRequest } from '@/lib/api/types/credentials'

export const credentialKeys = {
  all: ['credentials'] as const,
  list: () => [...credentialKeys.all, 'list'] as const,
  balance: () => [...credentialKeys.all, 'balance'] as const,
}

export function useCredentials() {
  return useQuery({
    queryKey: credentialKeys.list(),
    queryFn: ({ signal }) => api.listCredentials(signal),
  })
}

export function useBalance() {
  return useQuery({
    queryKey: credentialKeys.balance(),
    queryFn: ({ signal }) => api.getBalance(signal),
    // Only refetch when window is focused — balance is not real-time critical
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  })
}

export function useUpsertCredential() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CredentialUpsertRequest) => api.upsertCredential(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: credentialKeys.list() })
      queryClient.invalidateQueries({ queryKey: credentialKeys.balance() })
    },
  })
}

export function useDeleteCredential() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (exchange: string) => api.deleteCredential(exchange),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: credentialKeys.list() })
      queryClient.invalidateQueries({ queryKey: credentialKeys.balance() })
    },
  })
}
