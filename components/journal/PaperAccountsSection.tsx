'use client'

import { useState } from 'react'
import { Loader2, Plus, Wallet } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorPanel } from '@/components/shell/ErrorPanel'
import { signClass } from '@/components/lab/LabBadges'
import { ApiError } from '@/lib/api/errors'
import { formatUsd, formatUsdSigned, formatTimestamp } from '@/lib/utils/format'
import { notify } from '@/lib/utils/toast'
import { cn } from '@/lib/utils/cn'
import { openPositionCount } from '@/lib/lab/paper'
import { useCreatePaperAccount, usePaperAccounts } from '@/lib/queries/paper'


interface FormState {
  name: string
  starting_balance: string
  risk_pct: string
  leverage_max: string
}

const INITIAL: FormState = { name: '', starting_balance: '10000', risk_pct: '1', leverage_max: '5' }

function validateAccountForm(f: FormState): Record<string, string> {
  const e: Record<string, string> = {}
  if (!f.name.trim()) e.name = 'Nama wajib diisi'
  const bal = Number(f.starting_balance)
  if (!Number.isFinite(bal) || bal <= 0) e.starting_balance = 'Saldo awal harus > 0'
  const risk = Number(f.risk_pct)
  if (!Number.isFinite(risk) || risk <= 0 || risk > 10) e.risk_pct = 'Risk 0–10%'
  const lev = Number(f.leverage_max)
  if (!Number.isFinite(lev) || lev < 1 || lev > 125) e.leverage_max = 'Leverage 1–125'
  return e
}

export function PaperAccountsSection() {
  const q = usePaperAccounts()
  const create = useCreatePaperAccount()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(INITIAL)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const submit = () => {
    const e = validateAccountForm(form)
    setErrors(e)
    if (Object.keys(e).length) return
    create.mutate(
      {
        name: form.name.trim(),
        starting_balance: Number(form.starting_balance),
        risk_pct: Number(form.risk_pct),
        leverage_max: Number(form.leverage_max),
      },
      {
        onSuccess: () => {
          notify.success('Akun paper dibuat')
          setForm(INITIAL)
          setOpen(false)
        },
        onError: () => notify.error('Gagal membuat akun paper'),
      },
    )
  }

  const accounts = q.data ?? []

  return (
    <Card className="border-border">
      <CardHeader className="flex-row items-center justify-between gap-2 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <Wallet className="h-4 w-4 text-warn" />
          Akun paper
        </CardTitle>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setOpen((o) => !o)}>
          <Plus className="h-3.5 w-3.5" /> Akun baru
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {open && (
          <div className="grid grid-cols-1 gap-3 rounded-lg border border-border p-3 sm:grid-cols-5">
            {(
              [
                ['name', 'Nama', 'text'],
                ['starting_balance', 'Saldo awal (USDT)', 'number'],
                ['risk_pct', 'Risk per trade (%)', 'number'],
                ['leverage_max', 'Leverage maks', 'number'],
              ] as const
            ).map(([key, label, type]) => (
              <div key={key} className="space-y-1">
                <label htmlFor={`acc-${key}`} className="text-xs font-medium">{label}</label>
                <Input
                  id={`acc-${key}`}
                  type={type}
                  step="any"
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  aria-invalid={Boolean(errors[key])}
                  className={cn('h-8 text-xs', type === 'number' && 'font-mono', errors[key] && 'border-bearish')}
                />
                {errors[key] && <p className="text-2xs text-bearish">{errors[key]}</p>}
              </div>
            ))}
            <div className="flex items-end">
              <Button size="sm" className="w-full" onClick={submit} disabled={create.isPending}>
                {create.isPending && <Loader2 className="animate-spin" />}
                Buat akun
              </Button>
            </div>
          </div>
        )}

        {q.isPending ? (
          <Skeleton className="h-20 w-full" />
        ) : q.error ? (
          <ErrorPanel kind={q.error instanceof ApiError ? q.error.kind : 'server'} onRetry={() => q.refetch()} messageOverride="Gagal memuat akun paper." />
        ) : accounts.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Belum ada akun paper. Klik &quot;Akun baru&quot; untuk mulai.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((a) => (
              <div key={a.id} className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{a.name}</span>
                  <span className="font-mono text-3xs text-muted-foreground">{formatTimestamp(a.created_at)}</span>
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-1 font-mono text-xs">
                  <dt className="text-muted-foreground">Balance</dt>
                  <dd className="text-right">{formatUsd(a.balance)}</dd>
                  <dt className="text-muted-foreground">Equity</dt>
                  <dd className="text-right font-bold">{formatUsd(a.equity)}</dd>
                  <dt className="text-muted-foreground">Realized P&amp;L</dt>
                  <dd className={cn('text-right', signClass(a.realized_pnl))}>{formatUsdSigned(a.realized_pnl)}</dd>
                  <dt className="text-muted-foreground">Posisi terbuka</dt>
                  <dd className="text-right">{openPositionCount(a)}</dd>
                </dl>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
