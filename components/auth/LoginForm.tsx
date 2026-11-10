'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { useLogin } from '@/lib/queries/auth'
import { ApiError } from '@/lib/api/errors'
import { safeNextPath } from '@/lib/utils/safe-url'
import { getSession } from '@/lib/utils/auth-store'

export function LoginForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const next = safeNextPath(searchParams.get('next'))
  const login = useLogin(next)

  // Already signed in (e.g. opened /login from a bookmark) → go straight in.
  useEffect(() => {
    if (getSession()?.accessToken) router.replace(next)
  }, [router, next])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})

  function validate(): boolean {
    const next: typeof fieldErrors = {}
    if (!email.trim()) next.email = 'Email wajib diisi'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Format email tidak valid'
    if (!password) next.password = 'Password wajib diisi'
    setFieldErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    login.mutate({ email: email.trim(), password })
  }

  // Map API error to a human-readable message
  const apiError = login.error
    ? login.error instanceof ApiError && login.error.kind === 'auth'
      ? 'Email atau password salah.'
      : 'Terjadi kesalahan. Coba lagi.'
    : null

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} noValidate className="space-y-4">

          {/* API-level error banner */}
          {apiError && (
            <p className="rounded-md border border-bearish/30 bg-bearish/10 px-3 py-2 text-sm text-bearish" role="alert">
              {apiError}
            </p>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }))
              }}
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? 'email-error' : undefined}
              disabled={login.isPending}
            />
            {fieldErrors.email && (
              <p id="email-error" className="text-xs text-bearish" role="alert">
                {fieldErrors.email}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }))
                }}
                aria-invalid={!!fieldErrors.password}
                aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                disabled={login.isPending}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
                aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                tabIndex={-1}
              >
                {showPassword
                  ? <EyeOff className="h-4 w-4" aria-hidden="true" />
                  : <Eye className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
            {fieldErrors.password && (
              <p id="password-error" className="text-xs text-bearish" role="alert">
                {fieldErrors.password}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full cursor-pointer" disabled={login.isPending}>
            {login.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Masuk…
              </>
            ) : (
              'Masuk'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
