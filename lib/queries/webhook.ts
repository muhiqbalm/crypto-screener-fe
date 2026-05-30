'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { ApiError } from '@/lib/api/errors'
import { generatePassphrase } from '@/lib/utils/random'

export const webhookKeys = {
  all: ['webhook'] as const,
  config: () => [...webhookKeys.all, 'config'] as const,
  trades: () => [...webhookKeys.all, 'trades'] as const,
}

export function useWebhookConfig() {
  return useQuery({
    queryKey: webhookKeys.config(),
    queryFn: ({ signal }) => api.getWebhookConfig(signal),
  })
}

export function useTradeLog() {
  return useQuery({
    queryKey: webhookKeys.trades(),
    queryFn: ({ signal }) => api.getTradeLog(signal),
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  })
}

interface ToggleArgs {
  nextEnabled: boolean
  hasExisting: boolean
}

export function useAutomationToggle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ nextEnabled, hasExisting }: ToggleArgs) => {
      if (!nextEnabled) {
        // Turn OFF → deactivate via DELETE (sets is_active=false, preserves passphrase)
        return api.deleteWebhookConfig()
      }
      if (nextEnabled && !hasExisting) {
        // Turn ON, no active config → try reactivate existing inactive record first.
        // Falls back to creating a new one only if no inactive record exists (404).
        try {
          return await api.reactivateWebhookConfig()
        } catch (err) {
          if (err instanceof ApiError && err.kind === 'not_found') {
            return api.createWebhookConfig({ passphrase: generatePassphrase() })
          }
          throw err
        }
      }
      // Turn ON but config already active → no-op (should not happen in normal flow)
      return Promise.resolve(undefined)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: webhookKeys.config() })
    },
  })
}
