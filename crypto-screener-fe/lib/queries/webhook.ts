'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
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
      if (nextEnabled && !hasExisting) {
        return api.createWebhookConfig({ passphrase: generatePassphrase() })
      }
      if (nextEnabled && hasExisting) {
        // no-op — already enabled
        return Promise.resolve(undefined)
      }
      // nextEnabled = false → delete
      return api.deleteWebhookConfig()
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: webhookKeys.config() })
    },
  })
}
