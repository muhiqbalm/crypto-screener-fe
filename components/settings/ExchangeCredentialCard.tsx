'use client'

import { useState } from 'react'
import { Eye, EyeOff, Loader2, Trash2, CheckCircle2, PlusCircle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useUpsertCredential, useDeleteCredential } from '@/lib/queries/credentials'
import { notify } from '@/lib/utils/toast'
import { ApiError } from '@/lib/api/errors'
import type { CredentialSummaryResponse, Exchange } from '@/lib/api/types/credentials'

interface ExchangeCredentialCardProps {
  exchange: Exchange
  existing: CredentialSummaryResponse | undefined
}

// Exchange display metadata
const EXCHANGE_META: Record<Exchange, { label: string; color: string }> = {
  binance: { label: 'Binance', color: 'text-yellow-500' },
  okx: { label: 'OKX', color: 'text-blue-400' },
}

export function ExchangeCredentialCard({ exchange, existing }: ExchangeCredentialCardProps) {
  const meta = EXCHANGE_META[exchange]
  const upsert = useUpsertCredential()
  const remove = useDeleteCredential()

  const [isEditing, setIsEditing] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [showPassphrase, setShowPassphrase] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const [form, setForm] = useState({ api_key: '', secret: '', api_passphrase: '' })
  const [errors, setErrors] = useState<Partial<typeof form>>({})

  function setField(field: keyof typeof form, value: string) {
    setForm((p) => ({ ...p, [field]: value }))
    if (errors[field]) setErrors((p) => ({ ...p, [field]: undefined }))
  }

  function validate(): boolean {
    const next: Partial<typeof form> = {}
    if (!form.api_key.trim()) next.api_key = 'API Key is required'
    if (!form.secret.trim()) next.secret = 'Secret is required'
    if (exchange === 'okx' && !form.api_passphrase.trim()) {
      next.api_passphrase = 'Passphrase is required for OKX'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSave() {
    if (!validate()) return
    upsert.mutate(
      {
        exchange,
        api_key: form.api_key.trim(),
        secret: form.secret.trim(),
        api_passphrase: exchange === 'okx' ? form.api_passphrase.trim() : null,
      },
      {
        onSuccess: () => {
          notify.success(`${meta.label} credentials saved`)
          setIsEditing(false)
          setForm({ api_key: '', secret: '', api_passphrase: '' })
        },
        onError: (err) => {
          notify.error(err instanceof ApiError ? err.message : 'Failed to save credentials')
        },
      }
    )
  }

  function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    remove.mutate(exchange, {
      onSuccess: () => {
        notify.success(`${meta.label} credentials removed`)
        setConfirmDelete(false)
      },
      onError: (err) => {
        notify.error(err instanceof ApiError ? err.message : 'Failed to remove credentials')
        setConfirmDelete(false)
      },
    })
  }

  function handleCancel() {
    setIsEditing(false)
    setConfirmDelete(false)
    setForm({ api_key: '', secret: '', api_passphrase: '' })
    setErrors({})
  }

  const isPending = upsert.isPending || remove.isPending

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className={`text-base ${meta.color}`}>{meta.label}</CardTitle>
            {existing ? (
              <Badge variant="outline" className="border-bullish/40 bg-bullish/10 text-bullish text-xs">
                <CheckCircle2 className="mr-1 h-3 w-3" aria-hidden="true" />
                Configured
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                Not configured
              </Badge>
            )}
          </div>
          {existing && !isEditing && (
            <span className="text-xs text-muted-foreground">
              Added {new Date(existing.created_at).toLocaleDateString()}
            </span>
          )}
        </div>
        <CardDescription className="text-xs">
          {exchange === 'okx'
            ? 'Requires API Key, Secret, and API Passphrase'
            : 'Requires API Key and Secret'}
        </CardDescription>
      </CardHeader>

      {isEditing ? (
        <CardContent className="space-y-3">
          {/* API Key */}
          <div className="space-y-1.5">
            <Label htmlFor={`${exchange}-api-key`} className="text-xs">API Key</Label>
            <Input
              id={`${exchange}-api-key`}
              type="text"
              placeholder="Enter API key"
              value={form.api_key}
              onChange={(e) => setField('api_key', e.target.value)}
              aria-invalid={!!errors.api_key}
              disabled={isPending}
              className="font-mono text-sm"
            />
            {errors.api_key && (
              <p className="text-xs text-bearish" role="alert">{errors.api_key}</p>
            )}
          </div>

          {/* Secret */}
          <div className="space-y-1.5">
            <Label htmlFor={`${exchange}-secret`} className="text-xs">Secret</Label>
            <div className="relative">
              <Input
                id={`${exchange}-secret`}
                type={showSecret ? 'text' : 'password'}
                placeholder="Enter secret"
                value={form.secret}
                onChange={(e) => setField('secret', e.target.value)}
                aria-invalid={!!errors.secret}
                disabled={isPending}
                className="pr-10 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowSecret((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                aria-label={showSecret ? 'Hide secret' : 'Show secret'}
                tabIndex={-1}
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.secret && (
              <p className="text-xs text-bearish" role="alert">{errors.secret}</p>
            )}
          </div>

          {/* API Passphrase — OKX only */}
          {exchange === 'okx' && (
            <div className="space-y-1.5">
              <Label htmlFor="okx-api-passphrase" className="text-xs">
                API Passphrase
                <span className="ml-1 text-muted-foreground">(OKX only)</span>
              </Label>
              <div className="relative">
                <Input
                  id="okx-api-passphrase"
                  type={showPassphrase ? 'text' : 'password'}
                  placeholder="Enter API passphrase"
                  value={form.api_passphrase}
                  onChange={(e) => setField('api_passphrase', e.target.value)}
                  aria-invalid={!!errors.api_passphrase}
                  disabled={isPending}
                  className="pr-10 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassphrase((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                  aria-label={showPassphrase ? 'Hide passphrase' : 'Show passphrase'}
                  tabIndex={-1}
                >
                  {showPassphrase ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.api_passphrase && (
                <p className="text-xs text-bearish" role="alert">{errors.api_passphrase}</p>
              )}
            </div>
          )}
        </CardContent>
      ) : null}

      <CardFooter className={`gap-2 ${isEditing ? 'pt-2' : 'pt-0'}`}>
        {isEditing ? (
          <>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isPending}
              className="cursor-pointer"
            >
              {upsert.isPending ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : null}
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancel}
              disabled={isPending}
              className="cursor-pointer"
            >
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button
              size="sm"
              variant={existing ? 'outline' : 'default'}
              onClick={() => setIsEditing(true)}
              className="cursor-pointer gap-1.5"
            >
              <PlusCircle className="h-3.5 w-3.5" aria-hidden="true" />
              {existing ? 'Update' : 'Add credentials'}
            </Button>
            {existing && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDelete}
                disabled={remove.isPending}
                className={`cursor-pointer gap-1.5 transition-colors duration-200 ${
                  confirmDelete
                    ? 'border border-bearish/40 bg-bearish/10 text-bearish hover:bg-bearish/20'
                    : 'text-muted-foreground hover:text-bearish'
                }`}
              >
                {remove.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {confirmDelete ? 'Confirm remove' : 'Remove'}
              </Button>
            )}
            {confirmDelete && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirmDelete(false)}
                className="cursor-pointer text-muted-foreground"
              >
                Cancel
              </Button>
            )}
          </>
        )}
      </CardFooter>
    </Card>
  )
}
