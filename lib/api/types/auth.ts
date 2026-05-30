/**
 * TypeScript mirrors of the backend Pydantic models in
 * src/trading/user_models.py — auth and profile shapes.
 */

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export interface RegisterRequest {
  email: string
  name: string
  password: string
  telegram_chat_id?: string | null
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

export interface LoginRequest {
  email: string
  password: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: 'bearer'
  expires_in: number // seconds, default 1800
}

export interface AccessTokenResponse {
  access_token: string
  token_type: 'bearer'
  expires_in: number
}

export interface RefreshRequest {
  refresh_token: string
}

// ---------------------------------------------------------------------------
// User profile
// ---------------------------------------------------------------------------

export interface UserProfileResponse {
  id: string
  email: string
  name: string
  telegram_chat_id: string | null
  is_active: boolean
  created_at: string // ISO 8601
}
