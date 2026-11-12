import { request } from './client'
import type { BotStatus } from './types/bot'

/**
 * "Status bot" summary, admin-only, same Bearer JWT as the rest of the Lab (the path sits
 * under /api/v1/lab/ on purpose). Read-only: webhook on/off per account and the last alert
 * the bot processed. Never returns the webhook passphrase.
 */
export const botApi = {
  getStatus(signal?: AbortSignal): Promise<BotStatus> {
    return request<BotStatus>('GET', '/api/v1/lab/bot/status', undefined, signal)
  },
}
