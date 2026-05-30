'use client'
import { Loader2 } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useWebhookConfig, useAutomationToggle } from '@/lib/queries/webhook'
import { notify } from '@/lib/utils/toast'
import { ApiError } from '@/lib/api/errors'

export function AutomationToggle() {
  const { data, error } = useWebhookConfig()
  const mutation = useAutomationToggle()

  // No config exists (404) → toggle is off and disabled until user creates one
  const noConfig = error instanceof ApiError && error.kind === 'not_found'
  const isChecked = data?.is_active ?? false
  const isDisabled = mutation.isPending

  function handleChange(nextEnabled: boolean) {
    const hasExisting = !!data && data.is_active

    // Turning ON when no config exists → will create new config with new passphrase
    // Warn the user so they know to update their TradingView alert
    if (nextEnabled && !hasExisting) {
      notify.info('A new passphrase will be generated. Update your TradingView alert after enabling.')
    }

    mutation.mutate(
      { nextEnabled, hasExisting },
      {
        onSuccess: () => {
          notify.success(nextEnabled ? 'Automation enabled' : 'Automation paused')
        },
        onError: (err) => {
          const message = err instanceof ApiError ? err.message : 'An error occurred'
          notify.error(message)
        },
      }
    )
  }

  return (
    <div className="flex items-center gap-3">
      {mutation.isPending && (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
      )}
      <Switch
        id="automation-toggle"
        checked={isChecked}
        onCheckedChange={handleChange}
        disabled={isDisabled || noConfig}
        aria-label="Toggle automation"
      />
      <div className="flex flex-col gap-0.5">
        <Label
          htmlFor="automation-toggle"
          className="cursor-pointer select-none"
        >
          Automation enabled
        </Label>
        {noConfig && (
          <span className="text-xs text-muted-foreground">
            Create a webhook config first
          </span>
        )}
        {data && !data.is_active && (
          <span className="text-xs text-muted-foreground">
            Enabling will generate a new passphrase
          </span>
        )}
      </div>
    </div>
  )
}
