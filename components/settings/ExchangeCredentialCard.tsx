'use client'

import { useState } from 'react'
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, PlusCircle, Trash2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ConfirmLive } from '@/components/ui/confirm-live'
import { Term } from '@/components/ui/term'
import { describeError } from '@/components/shell/error-copy'
import { useDeleteCredential, useUpsertCredential } from '@/lib/queries/credentials'
import { notify } from '@/lib/utils/toast'
import { formatTime } from '@/lib/utils/time'
import type { CredentialSummaryResponse, Exchange } from '@/lib/api/types/credentials'

interface ExchangeCredentialCardProps {
  exchange: Exchange
  existing: CredentialSummaryResponse | undefined
}

const EXCHANGE_LABEL: Record<Exchange, string> = { binance: 'Binance', okx: 'OKX' }

/**
 * API key per exchange. Same hooks and request bodies as before; saving or removing a key
 * now goes through ConfirmLive (the key is what the live bot trades with).
 */
export function ExchangeCredentialCard({ exchange, existing }: ExchangeCredentialCardProps) {
  const label = EXCHANGE_LABEL[exchange]
  const upsert = useUpsertCredential()
  const remove = useDeleteCredential()

  const [isEditing, setIsEditing] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [showPassphrase, setShowPassphrase] = useState(false)
  const [confirmSave, setConfirmSave] = useState(false)

  const [form, setForm] = useState({ api_key: '', secret: '', api_passphrase: '' })
  const [errors, setErrors] = useState<Partial<typeof form>>({})

  function setField(field: keyof typeof form, value: string) {
    setForm((p) => ({ ...p, [field]: value }))
    if (errors[field]) setErrors((p) => ({ ...p, [field]: undefined }))
  }

  function validate(): boolean {
    const next: Partial<typeof form> = {}
    if (!form.api_key.trim()) next.api_key = 'API key wajib diisi'
    if (!form.secret.trim()) next.secret = 'Secret wajib diisi'
    if (exchange === 'okx' && !form.api_passphrase.trim()) {
      next.api_passphrase = 'Passphrase API OKX wajib diisi'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  /** Step 1: check the form, then ask. */
  function handleSave() {
    if (validate()) setConfirmSave(true)
  }

  /** Step 2 (after "Ya"): the same upsert call and body as before. */
  function save() {
    return upsert
      .mutateAsync({
        exchange,
        api_key: form.api_key.trim(),
        secret: form.secret.trim(),
        api_passphrase: exchange === 'okx' ? form.api_passphrase.trim() : null,
      })
      .then(
        () => {
          notify.success(`API key ${label} disimpan`)
          setIsEditing(false)
          setForm({ api_key: '', secret: '', api_passphrase: '' })
        },
        (err) => {
          notify.error(describeError(err).message)
          throw err
        },
      )
  }

  function removeKey() {
    return remove.mutateAsync(exchange).then(
      () => notify.success(`API key ${label} dihapus`),
      (err) => {
        notify.error(describeError(err).message)
        throw err
      },
    )
  }

  function handleCancel() {
    setIsEditing(false)
    setForm({ api_key: '', secret: '', api_passphrase: '' })
    setErrors({})
  }

  const isPending = upsert.isPending || remove.isPending

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <CardTitle className="text-base">{label}</CardTitle>
            {existing ? (
              <Badge variant="bullish" size="sm">
                <CheckCircle2 aria-hidden="true" />
                Tersimpan
              </Badge>
            ) : (
              <Badge variant="muted" size="sm">
                Belum ada
              </Badge>
            )}
          </div>
          {existing && !isEditing && <span className="text-2xs text-muted-foreground">Disimpan {formatTime(existing.created_at, { time: false })}</span>}
        </div>
        <CardDescription className="text-xs">
          {exchange === 'okx' ? 'Butuh API key, secret, dan passphrase API OKX.' : 'Butuh API key dan secret dengan izin futures.'}
        </CardDescription>
      </CardHeader>

      {isEditing ? (
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={`${exchange}-api-key`} className="text-xs">
              API key
            </Label>
            <Input
              id={`${exchange}-api-key`}
              type="text"
              placeholder="Tempel API key"
              value={form.api_key}
              onChange={(e) => setField('api_key', e.target.value)}
              aria-invalid={!!errors.api_key}
              disabled={isPending}
              autoComplete="off"
              className="font-mono text-sm"
            />
            {errors.api_key && (
              <p className="text-xs text-bearish" role="alert">
                {errors.api_key}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${exchange}-secret`} className="text-xs">
              Secret
            </Label>
            <div className="relative">
              <Input
                id={`${exchange}-secret`}
                type={showSecret ? 'text' : 'password'}
                placeholder="Tempel secret"
                value={form.secret}
                onChange={(e) => setField('secret', e.target.value)}
                aria-invalid={!!errors.secret}
                disabled={isPending}
                autoComplete="off"
                className="pr-10 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowSecret((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
                aria-label={showSecret ? 'Sembunyikan secret' : 'Tampilkan secret'}
                tabIndex={-1}
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.secret && (
              <p className="text-xs text-bearish" role="alert">
                {errors.secret}
              </p>
            )}
          </div>

          {exchange === 'okx' && (
            <div className="space-y-1.5">
              <Label htmlFor="okx-api-passphrase" className="text-xs">
                <Term k="okx_passphrase" />
              </Label>
              <div className="relative">
                <Input
                  id="okx-api-passphrase"
                  type={showPassphrase ? 'text' : 'password'}
                  placeholder="Passphrase yang kamu buat di OKX"
                  value={form.api_passphrase}
                  onChange={(e) => setField('api_passphrase', e.target.value)}
                  aria-invalid={!!errors.api_passphrase}
                  disabled={isPending}
                  autoComplete="off"
                  className="pr-10 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassphrase((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showPassphrase ? 'Sembunyikan passphrase API OKX' : 'Tampilkan passphrase API OKX'}
                  tabIndex={-1}
                >
                  {showPassphrase ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.api_passphrase && (
                <p className="text-xs text-bearish" role="alert">
                  {errors.api_passphrase}
                </p>
              )}
            </div>
          )}
        </CardContent>
      ) : null}

      <CardFooter className={`flex-wrap gap-2 ${isEditing ? 'pt-2' : 'pt-0'}`}>
        {isEditing ? (
          <>
            <Button size="sm" onClick={handleSave} disabled={isPending}>
              {upsert.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
              Simpan
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancel} disabled={isPending}>
              Batal
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" variant={existing ? 'outline' : 'default'} onClick={() => setIsEditing(true)} className="gap-1.5">
              <PlusCircle className="h-3.5 w-3.5" aria-hidden="true" />
              {existing ? 'Ganti API key' : 'Tambah API key'}
            </Button>
            {existing && (
              <ConfirmLive
                title={`Hapus API key ${label}?`}
                description={`Bot tidak bisa lagi membuka atau menutup posisi di ${label} untuk akun ini, termasuk menutup posisi yang sedang terbuka. Saldo dan posisi di halaman Saldo & posisi juga tidak bisa dibaca sampai key baru disimpan.`}
                confirmLabel="Ya, hapus API key"
                typeToConfirm
                pending={remove.isPending}
                onConfirm={removeKey}
                trigger={
                  <Button size="sm" variant="ghost" disabled={remove.isPending} className="gap-1.5 text-muted-foreground hover:text-bearish">
                    {remove.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
                    Hapus
                  </Button>
                }
              />
            )}
          </>
        )}
      </CardFooter>

      <ConfirmLive
        open={confirmSave}
        onOpenChange={setConfirmSave}
        title={existing ? `Ganti API key ${label}?` : `Simpan API key ${label}?`}
        description={
          existing
            ? `Key lama diganti. Order bot berikutnya di ${label} memakai key baru ini; kalau key salah atau izinnya kurang, order live akan gagal.`
            : `Bot memakai key ini untuk order sungguhan di ${label} setiap kali alert TradingView ke akunmu masuk dan webhook aktif.`
        }
        confirmLabel={existing ? 'Ya, ganti key' : 'Ya, simpan key'}
        destructive={Boolean(existing)}
        pending={upsert.isPending}
        onConfirm={save}
      >
        <p className="text-xs text-muted-foreground">Key disimpan terenkripsi; secret tidak pernah ditampilkan lagi.</p>
      </ConfirmLive>
    </Card>
  )
}
