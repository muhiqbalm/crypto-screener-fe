'use client'

import { useEffect, useState } from 'react'
import { Loader2, User, Eye, EyeOff } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useMe, useUpdateProfile } from '@/lib/queries/auth'
import { notify } from '@/lib/utils/toast'
import { ApiError } from '@/lib/api/errors'

export function ProfileSettings() {
  const { data: user, isPending } = useMe()
  const update = useUpdateProfile()

  // Form state — synced from user data on load
  const [name, setName] = useState('')
  const [telegramChatId, setTelegramChatId] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Errors
  const [nameError, setNameError] = useState('')
  const [passwordError, setPasswordError] = useState('')

  // Sync form when user data arrives
  useEffect(() => {
    if (!user) return
    setName(user.name ?? '')
    setTelegramChatId(user.telegram_chat_id ?? '')
  }, [user])

  // ── Pending ──────────────────────────────────────────────────────────────
  if (isPending) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-5 w-32" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
          ))}
          <Skeleton className="h-9 w-24 rounded-md" />
        </CardContent>
      </Card>
    )
  }

  if (!user) return null

  function validate(): boolean {
    let valid = true
    if (!name.trim()) {
      setNameError('Name is required')
      valid = false
    }
    if (password && password.length < 8) {
      setPasswordError('Password must be at least 8 characters')
      valid = false
    }
    if (password && password !== confirmPassword) {
      setPasswordError('Passwords do not match')
      valid = false
    }
    return valid
  }

  function handleSave() {
    setNameError('')
    setPasswordError('')
    if (!validate()) return

    // Only send fields that actually changed
    const patch: Parameters<typeof update.mutate>[0] = {}
    if (name.trim() !== user.name) patch.name = name.trim()
    if (telegramChatId.trim() !== (user.telegram_chat_id ?? '')) {
      patch.telegram_chat_id = telegramChatId.trim() || null
    }
    if (password) patch.password = password

    if (Object.keys(patch).length === 0) {
      notify.info('No changes to save')
      return
    }

    update.mutate(patch, {
      onSuccess: () => {
        notify.success('Profile updated')
        setPassword('')
        setConfirmPassword('')
      },
      onError: (err) => {
        notify.error(err instanceof ApiError ? err.message : 'Failed to update profile')
      },
    })
  }

  const isDirty =
    name.trim() !== user.name ||
    telegramChatId.trim() !== (user.telegram_chat_id ?? '') ||
    password.length > 0

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <CardTitle className="text-base">Account</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Email — read-only */}
        <div className="space-y-1.5">
          <Label htmlFor="profile-email" className="text-xs">Email</Label>
          <Input
            id="profile-email"
            type="email"
            value={user.email}
            readOnly
            disabled
            className="bg-muted/40 text-muted-foreground cursor-not-allowed"
            aria-describedby="profile-email-hint"
          />
          <p id="profile-email-hint" className="text-[11px] text-muted-foreground">
            Email cannot be changed.
          </p>
        </div>

        {/* Name */}
        <div className="space-y-1.5">
          <Label htmlFor="profile-name" className="text-xs">Display name</Label>
          <Input
            id="profile-name"
            type="text"
            value={name}
            onChange={e => { setName(e.target.value); setNameError('') }}
            placeholder="Your name"
            disabled={update.isPending}
            aria-invalid={!!nameError}
            aria-describedby={nameError ? 'profile-name-error' : undefined}
          />
          {nameError && (
            <p id="profile-name-error" className="text-[11px] text-bearish" role="alert">
              {nameError}
            </p>
          )}
        </div>

        {/* Telegram Chat ID */}
        <div className="space-y-1.5">
          <Label htmlFor="profile-telegram" className="text-xs">
            Telegram Chat ID
            <span className="ml-1.5 text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input
            id="profile-telegram"
            type="text"
            value={telegramChatId}
            onChange={e => setTelegramChatId(e.target.value)}
            placeholder="e.g. 123456789"
            disabled={update.isPending}
            className="font-mono"
          />
          <p className="text-[11px] text-muted-foreground">
            Used to receive trade notifications via Telegram bot.
          </p>
        </div>

        {/* Divider */}
        <div className="border-t border-border pt-2">
          <p className="mb-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Change password
          </p>

          {/* New password */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="profile-password" className="text-xs">New password</Label>
              <div className="relative">
                <Input
                  id="profile-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setPasswordError('') }}
                  placeholder="Min. 8 characters"
                  disabled={update.isPending}
                  className="pr-10"
                  aria-invalid={!!passwordError}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword
                    ? <EyeOff className="h-4 w-4" />
                    : <Eye className="h-4 w-4" />
                  }
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div className="space-y-1.5">
              <Label htmlFor="profile-confirm-password" className="text-xs">Confirm new password</Label>
              <Input
                id="profile-confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); setPasswordError('') }}
                placeholder="Repeat new password"
                disabled={update.isPending}
                aria-invalid={!!passwordError}
                aria-describedby={passwordError ? 'profile-password-error' : undefined}
              />
              {passwordError && (
                <p id="profile-password-error" className="text-[11px] text-bearish" role="alert">
                  {passwordError}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center gap-3 pt-1">
          <Button
            onClick={handleSave}
            disabled={update.isPending || !isDirty}
            size="sm"
            className="gap-1.5 transition-colors duration-200"
          >
            {update.isPending && (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            )}
            Save changes
          </Button>
          {isDirty && !update.isPending && (
            <button
              type="button"
              onClick={() => {
                setName(user.name ?? '')
                setTelegramChatId(user.telegram_chat_id ?? '')
                setPassword('')
                setConfirmPassword('')
                setNameError('')
                setPasswordError('')
              }}
              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            >
              Discard
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
