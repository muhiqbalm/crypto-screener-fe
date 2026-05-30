import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api/client'
import { ApiError } from '@/lib/api/errors'
import {
  setSession,
  setUser,
  clearSession,
  getToken,
  getSession,
  isLoggedIn,
} from '@/lib/utils/auth-store'
import type { LoginRequest, ProfileUpdateRequest, RegisterRequest } from '@/lib/api/types/auth'

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const authKeys = {
  me: ['auth', 'me'] as const,
}

// ---------------------------------------------------------------------------
// useMe — fetch the current user profile (only when logged in)
// ---------------------------------------------------------------------------

export function useMe() {
  return useQuery({
    queryKey: authKeys.me,
    queryFn: ({ signal }) => api.getMe(signal),
    // Only run when a token exists
    enabled: isLoggedIn(),
    staleTime: 5 * 60 * 1000, // 5 min
    retry: (failureCount, error) => {
      // Don't retry auth errors — token is invalid, clear session
      if (error instanceof ApiError && error.kind === 'auth') return false
      return failureCount < 1
    },
  })
}

// ---------------------------------------------------------------------------
// useLogin
// ---------------------------------------------------------------------------

export function useLogin() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async (body: LoginRequest) => {
      const tokens = await api.login(body)
      // Temporarily set session so getMe() can use the new token
      setSession({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: Date.now() + tokens.expires_in * 1000,
        // Placeholder — will be replaced by getMe() below
        user: { id: '', email: body.email, name: '', telegram_chat_id: null, is_active: true, created_at: '' },
      })
      const user = await api.getMe()
      setSession({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: Date.now() + tokens.expires_in * 1000,
        user,
      })
      return user
    },
    onSuccess: (user) => {
      // Seed the query cache so useMe() resolves immediately
      queryClient.setQueryData(authKeys.me, user)
      router.push('/screener')
    },
    onError: () => {
      clearSession()
    },
  })
}

// ---------------------------------------------------------------------------
// useRegister
// ---------------------------------------------------------------------------

export function useRegister() {
  const router = useRouter()

  return useMutation({
    mutationFn: (body: RegisterRequest) => api.register(body),
    onSuccess: () => {
      router.push('/login')
    },
  })
}

// ---------------------------------------------------------------------------
// useUpdateProfile
// ---------------------------------------------------------------------------

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: ProfileUpdateRequest) => api.patchMe(body),
    onSuccess: (updatedUser) => {
      // Keep query cache and auth-store in sync
      queryClient.setQueryData(authKeys.me, updatedUser)
      const session = getSession()
      if (session) setUser(updatedUser)
    },
  })
}

// ---------------------------------------------------------------------------
// useLogout
// ---------------------------------------------------------------------------

export function useLogout() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async () => {
      // Best-effort server-side logout (revokes refresh tokens)
      if (getToken()) {
        try {
          await api.logout()
        } catch {
          // Ignore — we clear the local session regardless
        }
      }
    },
    onSettled: () => {
      clearSession()
      queryClient.clear()
      router.push('/login')
    },
  })
}
