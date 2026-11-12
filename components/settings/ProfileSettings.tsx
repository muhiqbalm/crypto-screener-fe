'use client'

import { useState } from 'react'
import { Eye, EyeOff, KeyRound, Loader2, User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { describeError } from '@/components/shell/error-copy'
import { useMe, useUpdateProfile } from '@/lib/queries/auth'
import { notify } from '@/lib/utils/toast'

export function ProfileSettings() {
  const { data: user, isPending } = useMe()

  if (isPending) {
    return (
      <Card className="rounded-3xl">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-5 w-32" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[0, 1, 2].map((i) => (
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

  return <ProfileForm key={user.id} user={user} />
}

/**
 * Profile + Telegram and the password change, each with its own save button. Both use the
 * same useUpdateProfile mutation as before and send only the fields that changed.
 */
function ProfileForm({ user }: { user: NonNullable<ReturnType<typeof useMe>['data']> }) {
  const update = useUpdateProfile()

  const [name, setName] = useState(user.name ?? '')
  const [telegramChatId, setTelegramChatId] = useState(user.telegram_chat_id ?? '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [nameError, setNameError] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const profileDirty = name.trim() !== user.name || telegramChatId.trim() !== (user.telegram_chat_id ?? '')

  function saveProfile() {
    setNameError('')
    if (!name.trim()) {
      setNameError('Nama wajib diisi')
      return
    }
    const patch: Parameters<typeof update.mutate>[0] = {}
    if (name.trim() !== user.name) patch.name = name.trim()
    if (telegramChatId.trim() !== (user.telegram_chat_id ?? '')) patch.telegram_chat_id = telegramChatId.trim() || null
    if (Object.keys(patch).length === 0) {
      notify.info('Tidak ada perubahan untuk disimpan')
      return
    }
    update.mutate(patch, {
      onSuccess: () => notify.success('Profil disimpan'),
      onError: (err) => notify.error(describeError(err).message),
    })
  }

  function savePassword() {
    setPasswordError('')
    if (password.length < 8) {
      setPasswordError('Password minimal 8 karakter')
      return
    }
    if (password !== confirmPassword) {
      setPasswordError('Kedua password tidak sama')
      return
    }
    update.mutate(
      { password },
      {
        onSuccess: () => {
          notify.success('Password diganti')
          setPassword('')
          setConfirmPassword('')
        },
        onError: (err) => notify.error(describeError(err).message),
      },
    )
  }

  return (
    <div className="space-y-4">
      <Card className="rounded-3xl">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <CardTitle className="text-[17px]">Profil & Telegram</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="profile-email" className="text-[14px]">
              Email
            </Label>
            <Input
              id="profile-email"
              type="email"
              value={user.email}
              readOnly
              disabled
              className="cursor-not-allowed bg-muted/40 text-muted-foreground"
              aria-describedby="profile-email-hint"
            />
            <p id="profile-email-hint" className="text-[13px] text-muted-foreground">
              Email tidak bisa diubah.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profile-name" className="text-[14px]">
              Nama tampilan
            </Label>
            <Input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setNameError('')
              }}
              placeholder="Namamu"
              disabled={update.isPending}
              aria-invalid={!!nameError}
              aria-describedby={nameError ? 'profile-name-error' : undefined}
            />
            {nameError && (
              <p id="profile-name-error" className="text-[13px] text-bearish" role="alert">
                {nameError}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profile-telegram" className="text-[14px]">
              Chat ID Telegram (pribadi atau grup)
              <span className="ml-1.5 font-normal text-muted-foreground">(opsional)</span>
            </Label>
            <Input
              id="profile-telegram"
              type="text"
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
              placeholder="mis. -5231848624 (grup) atau 123456789"
              disabled={update.isPending}
              className="font-mono"
              aria-describedby="profile-telegram-hint"
            />
            <div id="profile-telegram-hint" className="space-y-1 text-[13px] text-muted-foreground">
              <p>Notifikasi eksekusi bot live (order, gagal, untung/rugi) dikirim ke chat ini. Kosongkan untuk memakai grup bawaan tim.</p>
              <ul className="list-disc space-y-0.5 pl-4">
                <li>ID grup diawali tanda minus, mis. <span className="font-mono font-semibold text-foreground">-5231848624</span>.</li>
                <li>Bot notifikasi harus sudah ada di grup itu, atau sudah pernah kamu kirimi pesan, supaya bisa mengirim.</li>
              </ul>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button onClick={saveProfile} disabled={update.isPending || !profileDirty} size="sm" className="gap-1.5">
              {update.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
              Simpan profil
            </Button>
            {profileDirty && !update.isPending && (
              <button
                type="button"
                onClick={() => {
                  setName(user.name ?? '')
                  setTelegramChatId(user.telegram_chat_id ?? '')
                  setNameError('')
                }}
                className="cursor-pointer text-[14px] text-muted-foreground transition-colors hover:text-foreground"
              >
                Batalkan perubahan
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <CardTitle className="text-[17px]">Ganti password login</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="profile-password" className="text-[14px]">
              Password baru
            </Label>
            <div className="relative">
              <Input
                id="profile-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setPasswordError('')
                }}
                placeholder="Minimal 8 karakter"
                disabled={update.isPending}
                autoComplete="new-password"
                className="pr-10"
                aria-invalid={!!passwordError}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
                aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-confirm-password" className="text-[14px]">
              Ulangi password baru
            </Label>
            <Input
              id="profile-confirm-password"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value)
                setPasswordError('')
              }}
              placeholder="Ketik ulang password baru"
              disabled={update.isPending}
              autoComplete="new-password"
              aria-invalid={!!passwordError}
              aria-describedby={passwordError ? 'profile-password-error' : undefined}
            />
            {passwordError && (
              <p id="profile-password-error" className="text-[13px] text-bearish" role="alert">
                {passwordError}
              </p>
            )}
          </div>
          <Button onClick={savePassword} disabled={update.isPending || password.length === 0} size="sm" className="gap-1.5">
            {update.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
            Ganti password
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
