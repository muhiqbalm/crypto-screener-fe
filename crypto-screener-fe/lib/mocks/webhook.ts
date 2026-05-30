import type { WebhookConfigResponse } from '@/lib/api/types/webhook'

export const MOCK_WEBHOOK_CONFIG: WebhookConfigResponse = {
  id: 'wh_mock_001',
  passphrase: 'xK9mP2nQ4rT7vW3z', // exactly 16 characters
  is_active: true,
  created_at: '2025-01-10T08:30:00Z',
}
