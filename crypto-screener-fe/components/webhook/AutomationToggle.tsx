'use client'
import { Loader2 } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useWebhookConfig, useAutomationToggle } from '@/lib/queries/webhook'
import { notify } from '@/lib/utils/toast'
import { ApiError } from '@/lib/api/errors'

export function AutomationToggle() {
  const { data } = useWebhookConfig()
  const mutation = useAutomationToggle()

  const isChecked = data?.is_active ?? false

  function handleChange(nextEnabled: boolean) {
    mutation.mutate(
      { nextEnabled, hasExisting: !!data },
      {
        onSuccess: () => {
          notify.success(nextEnabled ? 'Automation enabled' : 'Automation paused')
        },
        onError: (error) => {
          const message = error instanceof ApiError ? error.message : 'An error occurred'
          notify.error(message)
        },
      }
    )
  }

  return (
    <div className="flex items-center gap-3">
      {mutation.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
      ) : null}
      <Switch
        id="automation-toggle"
        checked={isChecked}
        onCheckedChange={handleChange}
        disabled={mutation.isPending}
        aria-label="Toggle automation"
      />
      <Label
        htmlFor="automation-toggle"
        className="cursor-pointer select-none"
      >
        Automation enabled
      </Label>
    </div>
  )
}
