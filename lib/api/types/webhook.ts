export interface WebhookConfigResponse {
  id: string
  passphrase: string
  is_active: boolean
  created_at: string
}

export interface WebhookConfigCreateRequest {
  passphrase: string
}

export interface WebhookConfigUpdateRequest {
  passphrase: string
}
